param([string]$DataRoot = (Join-Path $env:LOCALAPPDATA 'MINA-Local'))
$ErrorActionPreference = 'Stop'
foreach ($Entry in @(@{pid='celular.pid'; exe='caddy.exe'}, @{pid='servidor.pid'; exe='pocketbase.exe'})) {
$PidFile = Join-Path $DataRoot $Entry.pid
if (!(Test-Path $PidFile)) { continue }
$ServerProcessId = [int](Get-Content $PidFile)
$Process = Get-Process -Id $ServerProcessId -ErrorAction SilentlyContinue
if ($Process) {
    if ($Process.Path -ne (Join-Path $PSScriptRoot $Entry.exe)) { throw 'El proceso no corresponde a esta instalacion.' }
    Stop-Process -Id $ServerProcessId
    $Process.WaitForExit()
}
Remove-Item $PidFile -ErrorAction SilentlyContinue
}
