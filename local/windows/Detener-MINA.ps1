param([string]$DataRoot = (Join-Path $env:LOCALAPPDATA 'MINA-Local'))
$ErrorActionPreference = 'Stop'
$PidFile = Join-Path $DataRoot 'servidor.pid'
if (!(Test-Path $PidFile)) { return }
$ServerProcessId = [int](Get-Content $PidFile)
$Process = Get-Process -Id $ServerProcessId -ErrorAction SilentlyContinue
if ($Process) {
    if ($Process.Path -ne (Join-Path $PSScriptRoot 'pocketbase.exe')) { throw 'El proceso no corresponde a esta instalacion.' }
    Stop-Process -Id $ServerProcessId
    $Process.WaitForExit()
}
Remove-Item $PidFile -ErrorAction SilentlyContinue
