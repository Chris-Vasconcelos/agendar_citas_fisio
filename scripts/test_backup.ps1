param([Parameter(Mandatory=$true)][string]$Age, [Parameter(Mandatory=$true)][string]$Keygen, [string]$SourceData)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../local/windows/Respaldo-Comun.ps1')
$Work = Join-Path ([IO.Path]::GetTempPath()) ('mina-backup-test-' + [guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($Work) | Out-Null
function Must-Fail([scriptblock]$Action) {
    $Failed = $false
    try { & $Action | Out-Null } catch { $Failed = $true }
    if (!$Failed) { throw 'La operacion debio fallar.' }
}
try {
    $Root = Join-Path $Work 'origen'
    $App = Join-Path $Work 'app'
    [IO.Directory]::CreateDirectory($Root) | Out-Null
    [IO.Directory]::CreateDirectory((Join-Path $Root 'https-datos/pki')) | Out-Null
    'CA privada ficticia' | Set-Content (Join-Path $Root 'https-datos/pki/root.key')
    'Configuracion HTTPS ficticia' | Set-Content (Join-Path $Root 'celular.Caddyfile')
    if ($SourceData) { Copy-Item $SourceData (Join-Path $Root 'pb_data') -Recurse }
    else {
        [IO.Directory]::CreateDirectory((Join-Path $Root 'pb_data/storage/expediente')) | Out-Null
        [IO.File]::WriteAllBytes((Join-Path $Root 'pb_data/data.db'), [Text.Encoding]::UTF8.GetBytes('Base ficticia'))
        [IO.File]::WriteAllBytes((Join-Path $Root 'pb_data/storage/expediente/fotografia.png'), (New-Object byte[] 1048577))
    }
    [IO.Directory]::CreateDirectory($App) | Out-Null
    Copy-Item (Join-Path $PSScriptRoot '../local/pocketbase/pb_migrations') (Join-Path $App 'pb_migrations') -Recurse
    $Identity = Join-Path $Work 'test-identity.txt'
    & $Keygen --output $Identity
    if ($LASTEXITCODE -ne 0) { throw 'keygen fallo' }
    $Recipient = (& $Keygen -y $Identity).Trim()
    $Backup = Join-Path $Work 'test.zip.age'
    $Hash = New-MinaEncryptedBackup -DataRoot $Root -AppRoot $App -Age $Age -Recipient $Recipient -Output $Backup
    if ($Hash.Length -ne 64) { throw 'Falta hash' }
    $Restored = Join-Path $Work 'restaurado'
    Restore-MinaEncryptedBackup -Backup $Backup -Identity $Identity -Destination $Restored -Age $Age | Out-Null
    foreach ($File in Get-ChildItem $Root -File -Recurse | Where-Object { $_.Name -ne 'mantenimiento.lock' }) {
        $Relative = $File.FullName.Substring($Root.Length + 1)
        if ((Get-FileHash $File.FullName).Hash -ne (Get-FileHash (Join-Path $Restored $Relative)).Hash) { throw "No coincide: $Relative" }
    }
    Must-Fail { Restore-MinaEncryptedBackup -Backup $Backup -Identity $Identity -Destination $Restored -Age $Age }
    $Other = Join-Path $Work 'other.txt'
    & $Keygen --output $Other
    $BadDest = Join-Path $Work 'no-debe-existir'
    Must-Fail { Restore-MinaEncryptedBackup -Backup $Backup -Identity $Other -Destination $BadDest -Age $Age }
    if (Test-Path $BadDest) { throw 'Una clave incorrecta publico datos' }
    $Damaged = Join-Path $Work 'alterado.zip.age'
    $Bytes = [IO.File]::ReadAllBytes($Backup)
    $Bytes[$Bytes.Length - 1] = $Bytes[$Bytes.Length - 1] -bxor 1
    [IO.File]::WriteAllBytes($Damaged, $Bytes)
    Must-Fail { Restore-MinaEncryptedBackup -Backup $Damaged -Identity $Identity -Destination $BadDest -Age $Age }
    if (Test-Path $BadDest) { throw 'Un respaldo alterado publico datos' }
    Must-Fail { New-MinaEncryptedBackup -DataRoot $Root -AppRoot $App -Age $Age -Recipient $Recipient -Output (Join-Path $Root 'no.age') }
    $Held = [IO.File]::Open((Join-Path $Root 'pb_data/data.db'), 'Open', 'ReadWrite', 'None')
    try { Must-Fail { New-MinaEncryptedBackup -DataRoot $Root -AppRoot $App -Age $Age -Recipient $Recipient -Output (Join-Path $Work 'ocupado.age') } }
    finally { $Held.Dispose() }
    if (@(Get-ChildItem $Work -Recurse -Filter '*.partial').Count -ne 0) { throw 'Se conservaron archivos parciales' }
    # Optional external destination used to boot and query a restored real PocketBase in check_local.py.
    if ($env:MINA_TEST_RESTORED) { Copy-Item $Restored $env:MINA_TEST_RESTORED -Recurse }
    Write-Host 'Backup PASS: full round trip, all file hashes, photograph, wrong key, tampering, existing destination, nested output and running-database rejection.'
    # Expected native age failures above must not become the CI script's exit code.
    $global:LASTEXITCODE = 0
} finally { Remove-Item $Work -Recurse -Force }
