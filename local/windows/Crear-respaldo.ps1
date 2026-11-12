param(
    [Parameter(Mandatory=$true)][string]$Destino,
    [string]$DataRoot = (Join-Path $env:LOCALAPPDATA 'MINA-Local')
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Respaldo-Comun.ps1')
$RecipientFile = Join-Path $DataRoot 'destinatario-respaldo.txt'
if (!(Test-Path $RecipientFile)) { throw 'Primero configura la clave de recuperacion con Preparar-respaldos.ps1.' }
if (!(Test-Path $Destino -PathType Container)) { throw 'Conecta el disco externo y elige una carpeta existente.' }
# Offline snapshot: pause the server, including access from phones. Restart only after success.
& (Join-Path $PSScriptRoot 'Detener-MINA.ps1') -DataRoot $DataRoot
$Output = Join-Path $Destino ('MINA-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.zip.age')
$Hash = New-MinaEncryptedBackup -DataRoot $DataRoot -AppRoot $PSScriptRoot -Age (Join-Path $PSScriptRoot 'age.exe') -Recipient ((Get-Content $RecipientFile -Raw).Trim()) -Output $Output
Write-Host "Respaldo cifrado creado: $Output"
Write-Host "SHA256: $Hash"
& (Join-Path $PSScriptRoot 'Iniciar-MINA.ps1') -DataRoot $DataRoot -SinNavegador
Write-Host 'Verifica regularmente la restauracion en otra carpeta/equipo. Conserva otra copia desconectada.'
