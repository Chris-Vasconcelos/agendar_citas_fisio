param([switch]$Quitar)
$ErrorActionPreference = 'Stop'
$TaskName = 'MINA Local - inicio del consultorio'
if ($Quitar) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false; return }
$User = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -WindowStyle Hidden -File "'+(Join-Path $PSScriptRoot 'Iniciar-MINA.ps1')+'" -SinNavegador')
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $User
$Principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null
Write-Host 'MINA iniciara al entrar en esta cuenta de Windows. No inicia antes del inicio de sesion.'
