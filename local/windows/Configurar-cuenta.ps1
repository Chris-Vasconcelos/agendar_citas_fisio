$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'Iniciar-MINA.ps1') -SinNavegador
Write-Host 'Primero crea el administrador en el panel local. El enlace inicial aparece en el registro servidor.log.'
Write-Host 'Despues introduce aqui esa cuenta de administrador para crear la cuenta de uso diario.'
$Admin = Get-Credential -Message 'Administrador local PocketBase'
$Body = @{identity=$Admin.UserName; password=$Admin.GetNetworkCredential().Password} | ConvertTo-Json
$Login = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8090/api/collections/_superusers/auth-with-password' -ContentType 'application/json' -Body $Body
$Operator = Get-Credential -Message 'Nueva cuenta diaria de MINA (correo y clave distinta de administrador)'
$Password = $Operator.GetNetworkCredential().Password
if ($Password.Length -lt 12) { throw 'Usa al menos 12 caracteres para la cuenta diaria.' }
$Payload = @{email=$Operator.UserName; password=$Password; passwordConfirm=$Password} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8090/api/collections/mina_operators/records' -Headers @{Authorization=$Login.token} -ContentType 'application/json' -Body $Payload | Out-Null
$Body=$null; $Payload=$null; $Password=$null; $Login=$null; $Admin=$null; $Operator=$null
Write-Host 'Cuenta diaria creada. Entra a http://127.0.0.1:8090 con esa cuenta.'
