# Compatible with Windows PowerShell 5.1. age provides authenticated encryption.
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Open-MinaMaintenanceLock([string]$DataRoot) {
    [IO.Directory]::CreateDirectory($DataRoot) | Out-Null
    try { return [IO.File]::Open((Join-Path $DataRoot 'mantenimiento.lock'), 'OpenOrCreate', 'ReadWrite', 'None') }
    catch { throw 'Hay otra operacion de inicio o mantenimiento en curso.' }
}

function Assert-MinaOutside([string]$Path, [string]$Root) {
    $Full = [IO.Path]::GetFullPath($Path)
    $Base = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar)
    if ($Full.Equals($Base, [StringComparison]::OrdinalIgnoreCase) -or $Full.StartsWith($Base + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'El destino debe estar fuera de los datos y de la carpeta de la aplicacion.'
    }
}

function New-MinaEncryptedBackup {
    param([string]$DataRoot, [string]$AppRoot, [string]$Age, [string]$Recipient, [string]$Output)
    if ($Recipient -notmatch '^age1[0-9a-z]{58}$') { throw 'Destinatario age no valido.' }
    Assert-MinaOutside $Output $DataRoot
    Assert-MinaOutside $Output $AppRoot
    if (Test-Path $Output) { throw 'El archivo de respaldo ya existe.' }
    $Data = Join-Path $DataRoot 'pb_data'
    if (!(Test-Path (Join-Path $Data 'data.db'))) { throw 'No se encontro la base de MINA.' }
    $Lock = Open-MinaMaintenanceLock $DataRoot
    $Work = Join-Path $DataRoot ('respaldo-temporal-' + [guid]::NewGuid().ToString('N'))
    $Partial = $Output + '.' + [guid]::NewGuid().ToString('N') + '.partial'
    $Handles = @{}
    try {
        # Holding exclusive database handles prevents taking a snapshot of a running server.
        foreach ($Db in Get-ChildItem $Data -File -Filter '*.db') {
            try { $Handles[$Db.FullName] = [IO.File]::Open($Db.FullName, 'Open', 'Read', 'None') }
            catch { throw 'Deten MINA antes de respaldar. La base esta en uso.' }
        }
        $Payload = Join-Path $Work 'contenido'
        [IO.Directory]::CreateDirectory($Payload) | Out-Null
        $Sources = @{ pb_data = $Data; pb_migrations = (Join-Path $AppRoot 'pb_migrations') }
        # Preserve the private HTTPS CA so restored phones can keep their established trust.
        if (Test-Path (Join-Path $DataRoot 'https-datos')) { $Sources['https-datos'] = Join-Path $DataRoot 'https-datos' }
        foreach ($Name in $Sources.Keys) {
            $Source = [IO.Path]::GetFullPath($Sources[$Name]).TrimEnd([IO.Path]::DirectorySeparatorChar)
            if (!(Test-Path $Source)) { throw "Falta $Name en la instalacion." }
            foreach ($Item in Get-ChildItem $Source -Recurse -Force) {
                if ($Item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'No se admiten enlaces en el respaldo.' }
                $Relative = $Item.FullName.Substring($Source.Length + 1)
                $Dest = Join-Path (Join-Path $Payload $Name) $Relative
                if ($Item.PSIsContainer) { [IO.Directory]::CreateDirectory($Dest) | Out-Null; continue }
                [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($Dest)) | Out-Null
                if ($Handles.ContainsKey($Item.FullName)) {
                    $Stream = [IO.File]::Create($Dest)
                    try { $Handles[$Item.FullName].CopyTo($Stream) } finally { $Stream.Dispose() }
                } else { [IO.File]::Copy($Item.FullName, $Dest) }
            }
        }
        if (Test-Path (Join-Path $AppRoot 'version.json')) { Copy-Item (Join-Path $AppRoot 'version.json') $Payload }
        foreach ($Name in @('celular.Caddyfile','destinatario-respaldo.txt')) {
            if (Test-Path (Join-Path $DataRoot $Name)) { Copy-Item (Join-Path $DataRoot $Name) $Payload }
        }
        $Files = @()
        foreach ($File in Get-ChildItem $Payload -File -Recurse -Force) {
            $Files += @{ path = $File.FullName.Substring($Payload.Length + 1).Replace('\','/'); sha256 = (Get-FileHash $File.FullName -Algorithm SHA256).Hash; bytes = $File.Length }
        }
        @{ format = 'MINA-Local-backup'; version = 1; created_utc = [DateTime]::UtcNow.ToString('o'); files = $Files } |
            ConvertTo-Json -Depth 5 | Set-Content (Join-Path $Payload 'manifest.json') -Encoding UTF8
        $Zip = Join-Path $Work 'contenido.zip'
        [IO.Compression.ZipFile]::CreateFromDirectory($Payload, $Zip)
        & $Age --encrypt --recipient $Recipient --output $Partial $Zip
        if ($LASTEXITCODE -ne 0) { throw 'age no pudo cifrar el respaldo.' }
        [IO.File]::Move($Partial, [IO.Path]::GetFullPath($Output))
        return (Get-FileHash $Output -Algorithm SHA256).Hash
    } finally {
        foreach ($Handle in $Handles.Values) { $Handle.Dispose() }
        if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
        if (Test-Path $Partial) { Remove-Item $Partial -Force }
        $Lock.Dispose()
    }
}

function Restore-MinaEncryptedBackup {
    param([string]$Backup, [string]$Identity, [string]$Destination, [string]$Age)
    $Destination = [IO.Path]::GetFullPath($Destination)
    # Always restore separately. Never replace an existing installation or database.
    if (Test-Path $Destination) { throw 'La carpeta de restauracion ya existe. Elige una carpeta nueva.' }
    $Parent = [IO.Path]::GetDirectoryName($Destination)
    if (!(Test-Path $Parent)) { throw 'Primero crea la carpeta padre del destino.' }
    $Work = Join-Path $Parent ('restauracion-temporal-' + [guid]::NewGuid().ToString('N'))
    [IO.Directory]::CreateDirectory($Work) | Out-Null
    try {
        $Zip = Join-Path $Work 'contenido.zip'
        & $Age --decrypt --identity $Identity --output $Zip $Backup
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo autenticar/descifrar el respaldo. No se restauro nada.' }
        $Payload = Join-Path $Work 'contenido'
        $Archive = [IO.Compression.ZipFile]::OpenRead($Zip)
        try {
            $Seen = @{}
            [long]$Total = 0
            foreach ($Entry in $Archive.Entries) {
                $Name = $Entry.FullName.Replace('\','/')
                $Total += $Entry.Length
                if ($Total -gt 20GB) { throw 'El respaldo supera el limite de 20 GB descomprimidos.' }
                if ($Seen.ContainsKey($Name) -or $Name -match '(^/|:|(^|/)\.\.(/|$))') { throw 'Ruta de respaldo no valida.' }
                $Seen[$Name] = $true
                $Target = [IO.Path]::GetFullPath((Join-Path $Payload $Name))
                if (!$Target.StartsWith($Payload + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Ruta fuera del respaldo.' }
            }
        } finally { $Archive.Dispose() }
        [IO.Compression.ZipFile]::ExtractToDirectory($Zip, $Payload)
        $Manifest = Get-Content (Join-Path $Payload 'manifest.json') -Raw | ConvertFrom-Json
        if ($Manifest.format -ne 'MINA-Local-backup' -or $Manifest.version -ne 1) { throw 'Formato de respaldo no compatible.' }
        $Expected = @{}
        foreach ($Entry in $Manifest.files) {
            if ($Expected.ContainsKey($Entry.path)) { throw 'Manifiesto duplicado.' }
            $Expected[$Entry.path] = $Entry
        }
        foreach ($File in Get-ChildItem $Payload -File -Recurse -Force) {
            $Name = $File.FullName.Substring($Payload.Length + 1).Replace('\','/')
            if ($Name -eq 'manifest.json') { continue }
            if (!$Expected.ContainsKey($Name)) { throw 'Archivo no previsto en el respaldo.' }
            $Entry = $Expected[$Name]
            if ($File.Length -ne $Entry.bytes -or (Get-FileHash $File.FullName -Algorithm SHA256).Hash -ne $Entry.sha256) { throw "Fallo de integridad: $Name" }
            $Expected.Remove($Name)
        }
        if ($Expected.Count -ne 0 -or !(Test-Path (Join-Path $Payload 'pb_data/data.db')) -or !(Test-Path (Join-Path $Payload 'pb_migrations'))) { throw 'El respaldo esta incompleto.' }
        # Publication is a directory rename only after authentication and all hashes pass.
        [IO.Directory]::Move($Payload, $Destination)
        return $Destination
    } finally {
        if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
    }
}
