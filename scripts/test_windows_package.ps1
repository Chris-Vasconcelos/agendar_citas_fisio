# Runs under Windows PowerShell 5.1 in CI, not on the consultorio installation.
$ErrorActionPreference = 'Stop'
$Work = Join-Path $env:TEMP ('MINA paquete prueba ' + [guid]::NewGuid().ToString('N'))
$DataRoot = Join-Path $Work 'Datos prueba'
$App = Join-Path $Work 'MINA-Local'
New-Item -ItemType Directory -Path $Work | Out-Null
try {
    Expand-Archive (Join-Path $PSScriptRoot '../local-release/MINA-Local-Windows-x64.zip') -DestinationPath $Work
    foreach ($Script in Get-ChildItem $App -Filter '*.ps1') {
        $Tokens=$null; $Errors=$null
        [void][System.Management.Automation.Language.Parser]::ParseFile($Script.FullName,[ref]$Tokens,[ref]$Errors)
        if ($Errors.Count) { throw ($Errors | Out-String) }
    }
    & (Join-Path $App 'Iniciar-MINA.ps1') -DataRoot $DataRoot -SinNavegador
    $FirstId = Get-Content (Join-Path $DataRoot 'servidor.pid')
    & (Join-Path $App 'Iniciar-MINA.ps1') -DataRoot $DataRoot -SinNavegador
    if ((Get-Content (Join-Path $DataRoot 'servidor.pid')) -ne $FirstId) { throw 'Se inicio un segundo servidor.' }
    $Page = Invoke-WebRequest 'http://127.0.0.1:8090' -UseBasicParsing
    if ($Page.StatusCode -ne 200 -or $Page.Content -notmatch '<div id="root">') { throw 'No sirve la interfaz original.' }
    & (Join-Path $App 'Detener-MINA.ps1') -DataRoot $DataRoot
    if (Get-Process -Id ([int]$FirstId) -ErrorAction SilentlyContinue) { throw 'El servidor sigue activo.' }
    & (Join-Path $PSScriptRoot 'test_backup.ps1') -Age (Join-Path $App 'age.exe') -Keygen (Join-Path $App 'age-keygen.exe') -SourceData (Join-Path $DataRoot 'pb_data')
    Write-Host 'Windows PowerShell 5.1 PASS: package with spaces, startup, repeated startup, original UI, shutdown and encrypted backup/restore.'
} finally {
    if (Test-Path (Join-Path $App 'Detener-MINA.ps1')) { & (Join-Path $App 'Detener-MINA.ps1') -DataRoot $DataRoot }
    Remove-Item $Work -Recurse -Force
}
