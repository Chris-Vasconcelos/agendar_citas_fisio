# Integration with the actual Windows binary and a fresh, isolated user-data directory.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$Work = Join-Path $env:TEMP ('MINA escritorio prueba ' + [guid]::NewGuid().ToString('N'))
$Source = Join-Path $Work 'paquete'
$DataRoot = Join-Path $Work 'datos'
$Desktop = Join-Path $Work 'escritorio'
$Startup = Join-Path $Work 'inicio'
$CreatedTask = $false
$Runtime = $null
New-Item -ItemType Directory -Path $Work | Out-Null
function Must-Fail([scriptblock]$Action) { $Failed=$false; try { & $Action | Out-Null } catch { $Failed=$true }; if (!$Failed) { throw 'Debio rechazarse la operacion.' } }
try {
    Expand-Archive (Join-Path $PSScriptRoot '../local-release/MINA-Local-Windows-x64.zip') $Source
    $Source = Join-Path $Source 'MINA-Local'
    $Assembly = [Reflection.Assembly]::Load([IO.File]::ReadAllBytes((Join-Path $Source 'MINA.exe')))
    $Type = $Assembly.GetType('MinaDesktop.Runtime', $true)
    $Runtime = $Type.GetConstructor([type[]]@([string])).Invoke([object[]]@([string]$DataRoot))
    $Setup = [Reflection.Assembly]::Load([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot '../local-release/Instalar-MINA.exe')))
    $Payload = $Setup.GetManifestResourceStream('MINA.Payload.zip')
    if (!$Payload) { throw 'Falta el paquete incrustado en el instalador.' }
    $EmbeddedZip = Join-Path $Work 'incrustado.zip'
    $File = [IO.File]::Create($EmbeddedZip)
    try { $Payload.CopyTo($File) } finally { $File.Dispose(); $Payload.Dispose() }
    $Extracted = Join-Path $Work 'incrustado'
    [IO.Compression.ZipFile]::ExtractToDirectory($EmbeddedZip, $Extracted)
    $null = $Type.GetMethod('Verify').Invoke($null, [object[]]@([string]$Extracted))
    Write-Host 'Native check: install verified payload'
    $Runtime.Install($Source,$true,$Desktop,$Startup)
    foreach ($Path in @((Join-Path $Desktop 'MINA.lnk'),(Join-Path $Desktop 'Comprobar MINA.lnk'),(Join-Path $Startup 'MINA.lnk'))) {
        $Shell = New-Object -ComObject WScript.Shell
        $Link = $Shell.CreateShortcut($Path)
        if (!$Type.GetMethod('Same').Invoke($null,[object[]]@([string]$Link.TargetPath,[string](Join-Path $DataRoot 'app/MINA.exe')))) { throw 'Acceso directo fuera de la instalacion estable.' }
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Link)
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Shell)
    }
    $FormType = $Assembly.GetType('MinaDesktop.WelcomeForm',$true)
    $Form = $FormType.GetConstructor([type[]]@($Type,[string],[bool])).Invoke([object[]]@($Runtime,[string]$Source,$false))
    try {
        $Consent = $Form.Controls.Find('closedConsent',$true)[0]
        $Button = $Form.Controls.Find('installButton',$true)[0]
        if ($Button.Enabled) { throw 'La instalacion no debe ignorar el aviso de guardar capturas.' }
        $Consent.Checked = $true
        if (!$Button.Enabled) { throw 'No se habilita la instalacion despues de confirmar.' }
    } finally { $Form.Dispose() }
    $AccountForm = $Assembly.GetType('MinaDesktop.AccountForm',$true).GetConstructor([type[]]@($Type)).Invoke([object[]]@($Runtime))
    try {
        if (!$AccountForm.Controls.Find('account1',$true)[0].UseSystemPasswordChar -or !$AccountForm.Controls.Find('account4',$true)[0].UseSystemPasswordChar) { throw 'Contrasenas visibles en el asistente.' }
    } finally { $AccountForm.Dispose() }
    Write-Host 'Native check: start backend'
    $Runtime.Start()
    $FirstId = [int](Get-Content (Join-Path $DataRoot 'servidor.pid'))
    $Runtime.Start()
    if ([int](Get-Content (Join-Path $DataRoot 'servidor.pid')) -ne $FirstId) { throw 'Segundo servidor al abrir MINA otra vez.' }
    Write-Host 'Native check: configure accounts'
    $Runtime.ConfigureAccounts('native-admin@example.invalid','NativeAdmin_123456!','native-daily@example.invalid','NativeDaily_123456!')
    # Repeating the wizard must not overwrite or duplicate valid accounts.
    $Runtime.ConfigureAccounts('native-admin@example.invalid','NativeAdmin_123456!','native-daily@example.invalid','NativeDaily_123456!')
    $LoginBody = @{identity='native-daily@example.invalid';password='NativeDaily_123456!'} | ConvertTo-Json
    $Login = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8090/api/collections/mina_operators/auth-with-password' -ContentType 'application/json' -Body $LoginBody
    $PayloadText = $Login.token.Split('.')[1].Replace('-','+').Replace('_','/')
    while ($PayloadText.Length % 4) { $PayloadText += '=' }
    $Claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($PayloadText)) | ConvertFrom-Json
    if (($Claims.exp - [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) -gt 28805) { throw 'Token del operador superior a ocho horas.' }
    $PatientBody = @{owner=$Login.record.id;full_name='Paciente instalador ficticio';age=25;phone='7225550100';consultation_reason='Prueba de actualizacion';privacy_consent=$true} | ConvertTo-Json
    $Headers = @{Authorization=$Login.token}
    $Patient = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8090/api/collections/mina_patients/records' -ContentType 'application/json' -Headers $Headers -Body $PatientBody
    [IO.File]::WriteAllText((Join-Path $DataRoot 'no-borrar.txt'),'Datos del usuario')
    New-Item -ItemType Directory -Force (Join-Path $DataRoot 'pb_data/storage/prueba') | Out-Null
    [IO.File]::WriteAllText((Join-Path $DataRoot 'pb_data/storage/prueba/conservar.txt'),'Fotografia ficticia')
    $Diagnosis = $Type.GetMethod('Serialize').Invoke($null,@($Runtime.Diagnose()))
    foreach ($Secret in @('NativeAdmin_123456!','NativeDaily_123456!',$Login.token,'Paciente instalador ficticio','pbinstall')) {
        if ($Diagnosis.Contains($Secret)) { throw 'El diagnostico incluye informacion privada.' }
    }
    # Test the actual app-window launch, using only this test's isolated browser profile.
    $Runtime.OpenWindow()
    $Profile = Join-Path $DataRoot 'perfil-navegador'
    $Browser = $null
    for ($i=0;$i -lt 100;$i++) {
        $Browser = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(msedge|chrome).exe$' -and $_.CommandLine -like "*$Profile*" -and $_.CommandLine -like '*--app=http://127.0.0.1:8090/*' })
        if ($Browser.Count) { break }
        Start-Sleep -Milliseconds 250
    }
    if (!$Browser.Count) {
        Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(msedge|chrome).exe$' } | ForEach-Object { Write-Host ('Browser test process: '+$_.Name+' '+$_.CommandLine) }
        throw 'No se abrio una ventana app con perfil MINA separado.'
    }
    if ($env:GITHUB_ACTIONS -eq 'true') {
        if (Get-ScheduledTask -TaskName 'MINA Local - inicio del consultorio' -ErrorAction SilentlyContinue) { throw 'Existe una tarea ajena a esta prueba.' }
        & (Join-Path $Source 'Inicio-automatico.ps1')
        $CreatedTask = $true
    }
    $Runtime.Install($Source,$true,$Desktop,$Startup)
    if ($CreatedTask -and (Get-ScheduledTask -TaskName 'MINA Local - inicio del consultorio' -ErrorAction SilentlyContinue)) { throw 'No se retiro el inicio antiguo de PowerShell.' }
    $CreatedTask = $false
    $Runtime.Start()
    $Recovered = Invoke-RestMethod -Uri ('http://127.0.0.1:8090/api/collections/mina_patients/records/'+$Patient.id) -Headers $Headers
    if ($Recovered.full_name -ne $Patient.full_name) { throw 'Expediente perdido en la actualizacion.' }
    if ((Get-Content (Join-Path $DataRoot 'no-borrar.txt')) -ne 'Datos del usuario') { throw 'Se alteraron datos fuera del programa.' }
    if ((Get-Content (Join-Path $DataRoot 'pb_data/storage/prueba/conservar.txt')) -ne 'Fotografia ficticia') { throw 'Se perdio el archivo en la actualizacion.' }
    if (@(Get-ChildItem (Join-Path $DataRoot 'recuperacion-previa') -Filter '*.zip').Count -lt 1) { throw 'Falta la copia local previa.' }
    $CurrentId = Get-Content (Join-Path $DataRoot 'servidor.pid')
    [IO.File]::WriteAllText((Join-Path $DataRoot 'servidor.pid'),([Diagnostics.Process]::GetCurrentProcess().Id).ToString())
    try { Must-Fail { $Runtime.Stop() } } finally { [IO.File]::WriteAllText((Join-Path $DataRoot 'servidor.pid'),$CurrentId) }
    $Page = Join-Path $Runtime.AppRoot 'web/index.html'
    $Original = [IO.File]::ReadAllBytes($Page)
    [IO.File]::AppendAllText($Page,'alterado')
    try { Must-Fail { $Runtime.Start() } } finally { [IO.File]::WriteAllBytes($Page,$Original) }
    Write-Host 'Native Windows PASS: embedded verified installer, wizard controls, masked credentials, stable shortcuts, first accounts without dashboard, repeated launch, private app window, data-preserving update, snapshot, retired legacy startup, sanitized diagnostics and rejection of unrelated processes/corruption.'
    $global:LASTEXITCODE = 0
} catch {
    Write-Host ('Native check failure: ' + $_.Exception.ToString())
    throw
} finally {
    if ($CreatedTask) { Unregister-ScheduledTask -TaskName 'MINA Local - inicio del consultorio' -Confirm:$false -ErrorAction SilentlyContinue }
    # Only terminate browser processes using this isolated test profile.
    $Profile = Join-Path $DataRoot 'perfil-navegador'
    for ($cleanup=0;$cleanup -lt 10;$cleanup++) {
        Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(msedge|chrome).exe$' -and $_.CommandLine -like "*$Profile*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
        Start-Sleep -Milliseconds 200
    }
    if ($Runtime -and (Test-Path (Join-Path $Runtime.AppRoot 'payload-manifest.json'))) { $Runtime.Stop() }
    Remove-Item $Work -Recurse -Force
}
