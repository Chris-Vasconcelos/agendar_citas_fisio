param(
    [Parameter(Mandatory=$true)][string]$Respaldo,
    [Parameter(Mandatory=$true)][string]$ClaveRecuperacion,
    [Parameter(Mandatory=$true)][string]$CarpetaNueva
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Respaldo-Comun.ps1')
$Restored = Restore-MinaEncryptedBackup -Backup $Respaldo -Identity $ClaveRecuperacion -Destination $CarpetaNueva -Age (Join-Path $PSScriptRoot 'age.exe')
Write-Host "Integridad comprobada. Restaurado por separado en: $Restored"
Write-Host 'No se reemplazo la base activa. Usa el paquete de la misma version y valida pacientes, citas y fotografias antes de cambiar la instalacion.'
Write-Host 'Para probar: deten la instalacion actual y ejecuta Iniciar-MINA.ps1 -DataRoot con esta carpeta nueva.'
