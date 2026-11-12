# Runs under Windows PowerShell 5.1 in CI, not on the consultorio installation.
$ErrorActionPreference = 'Stop'
$Work = Join-Path $env:TEMP ('MINA paquete prueba ' + [guid]::NewGuid().ToString('N'))
$DataRoot = Join-Path $Work 'Datos prueba'
$App = Join-Path $Work 'MINA-Local'
$CreatedTask = $false
New-Item -ItemType Directory -Path $Work | Out-Null
try {
    Expand-Archive (Join-Path $PSScriptRoot '../local-release/MINA-Local-Windows-x64.zip') -DestinationPath $Work
    foreach ($Script in Get-ChildItem $App -Filter '*.ps1') {
        $Tokens=$null; $Errors=$null
        [void][System.Management.Automation.Language.Parser]::ParseFile($Script.FullName,[ref]$Tokens,[ref]$Errors)
        if ($Errors.Count) { throw ($Errors | Out-String) }
    }
    New-Item -ItemType Directory -Path $DataRoot | Out-Null
    . (Join-Path $App 'Celular-Comun.ps1')
    New-MinaCaddyConfig -Address 127.0.0.1 -Port 19443 -LoopbackTest | Set-Content (Join-Path $DataRoot 'celular.Caddyfile') -Encoding ASCII
    & (Join-Path $App 'Iniciar-MINA.ps1') -DataRoot $DataRoot -SinNavegador
    $FirstId = Get-Content (Join-Path $DataRoot 'servidor.pid')
    $HttpsId = Get-Content (Join-Path $DataRoot 'celular.pid')
    if (!(Get-Process -Id ([int]$HttpsId) -ErrorAction SilentlyContinue)) { throw 'No inicio el proxy HTTPS.' }
    & (Join-Path $App 'Iniciar-MINA.ps1') -DataRoot $DataRoot -SinNavegador
    if ((Get-Content (Join-Path $DataRoot 'servidor.pid')) -ne $FirstId) { throw 'Se inicio un segundo servidor.' }
    $Page = Invoke-WebRequest 'http://127.0.0.1:8090' -UseBasicParsing
    if ($Page.StatusCode -ne 200 -or $Page.Content -notmatch '<div id="root">') { throw 'No sirve la interfaz original.' }
    & (Join-Path $App 'Detener-MINA.ps1') -DataRoot $DataRoot
    if (Get-Process -Id ([int]$FirstId) -ErrorAction SilentlyContinue) { throw 'El servidor sigue activo.' }
    if (Get-Process -Id ([int]$HttpsId) -ErrorAction SilentlyContinue) { throw 'El proxy HTTPS sigue activo.' }
    & (Join-Path $PSScriptRoot 'test_backup.ps1') -Age (Join-Path $App 'age.exe') -Keygen (Join-Path $App 'age-keygen.exe') -SourceData (Join-Path $DataRoot 'pb_data')
    # Registration is tested only in an isolated GitHub runner; never replace a real user's task.
    if ($env:GITHUB_ACTIONS -eq 'true') {
        if (Get-ScheduledTask -TaskName 'MINA Local - inicio del consultorio' -ErrorAction SilentlyContinue) { throw 'Ya hay una tarea MINA; no sustituirla en una prueba.' }
        & (Join-Path $App 'Inicio-automatico.ps1')
        $CreatedTask = $true
        $Task = Get-ScheduledTask -TaskName 'MINA Local - inicio del consultorio'
        if ($Task.Actions.Arguments -notmatch 'Iniciar-MINA.ps1.*-SinNavegador' -or $Task.Principal.RunLevel -ne 'Limited') { throw 'Tarea de inicio no valida.' }
        Write-Host 'Windows task PASS: registered for interactive logon with limited privileges; reboot still requires the real PC.'
    }
    Write-Host 'Windows PowerShell 5.1 PASS: package with spaces, startup, repeated startup, HTTPS proxy, original UI, shutdown and encrypted backup/restore.'
} finally {
    if ($CreatedTask) { & (Join-Path $App 'Inicio-automatico.ps1') -Quitar }
    if (Test-Path (Join-Path $App 'Detener-MINA.ps1')) { & (Join-Path $App 'Detener-MINA.ps1') -DataRoot $DataRoot }
    Remove-Item $Work -Recurse -Force
}
