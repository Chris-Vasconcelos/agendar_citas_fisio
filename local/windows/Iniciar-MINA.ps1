param([switch]$SinNavegador, [string]$DataRoot = (Join-Path $env:LOCALAPPDATA 'MINA-Local'))
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
. (Join-Path $PSScriptRoot 'Respaldo-Comun.ps1')
$MaintenanceLock = Open-MinaMaintenanceLock $DataRoot
try {
$Exe = Join-Path $Root 'pocketbase.exe'
if (!(Test-Path $Exe)) { throw 'Falta pocketbase.exe. Extrae el paquete completo.' }
New-Item -ItemType Directory -Force -Path $DataRoot | Out-Null
$PidFile = Join-Path $DataRoot 'servidor.pid'
$Running = $null
if (Test-Path $PidFile) {
    $ServerProcessId = [int](Get-Content $PidFile)
    $Running = Get-Process -Id $ServerProcessId -ErrorAction SilentlyContinue
    if ($Running -and $Running.Path -ne $Exe) { throw 'El identificador guardado corresponde a otro proceso. Revisa servidor.pid.' }
}
if (!$Running) {
    $Arguments = @('serve','--http','127.0.0.1:8090','--dev=false','--dir',('"'+(Join-Path $DataRoot 'pb_data')+'"'),'--migrationsDir',('"'+(Join-Path $Root 'pb_migrations')+'"'),'--publicDir',('"'+(Join-Path $Root 'web')+'"'))
    $Process = Start-Process -FilePath $Exe -ArgumentList $Arguments -WorkingDirectory $Root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $DataRoot 'servidor.log') -RedirectStandardError (Join-Path $DataRoot 'servidor-error.log')
    $Process.Id | Set-Content $PidFile
    $Ready = $false
    for ($i=0; $i -lt 50; $i++) {
        Start-Sleep -Milliseconds 200
        if ($Process.HasExited) { throw 'MINA no pudo iniciar. Revisa servidor-error.log.' }
        try { Invoke-RestMethod 'http://127.0.0.1:8090/api/health' | Out-Null; $Ready=$true; break } catch {}
    }
    if (!$Ready) { throw 'No se pudo comprobar el inicio del servidor.' }
}
& (Join-Path $Root 'Iniciar-Celular.ps1') -DataRoot $DataRoot
if (!$SinNavegador) { Start-Process 'http://127.0.0.1:8090' }
} finally { $MaintenanceLock.Dispose() }
