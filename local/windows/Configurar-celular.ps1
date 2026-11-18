param(
    [Parameter(Mandatory=$true)][string]$DireccionPrivada,
    [switch]$AbrirFirewall,
    [switch]$ConfiarEnEstaPC,
    [string]$DataRoot = (Join-Path $env:LOCALAPPDATA 'MINA-Local')
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Celular-Comun.ps1')
. (Join-Path $PSScriptRoot 'Respaldo-Comun.ps1')
$Config = New-MinaCaddyConfig -Address $DireccionPrivada
$Interface = Get-NetIPAddress -IPAddress $DireccionPrivada -AddressFamily IPv4 -ErrorAction Stop
$Profile = Get-NetConnectionProfile -InterfaceIndex $Interface.InterfaceIndex
if ($Profile.NetworkCategory -ne 'Private') { throw 'La interfaz debe ser la red privada del consultorio.' }
$Lock = Open-MinaMaintenanceLock $DataRoot
try {
    $File = Join-Path $DataRoot 'celular.Caddyfile'
    if ((Test-Path $File) -and (Get-Content $File -Raw).Trim() -ne $Config.Trim()) { throw 'Ya existe otra configuracion HTTPS. Deten MINA y revisala antes de cambiar la IP.' }
    $Config | Set-Content $File -Encoding ASCII
    $PreviousData = $env:XDG_DATA_HOME
    $PreviousConfig = $env:XDG_CONFIG_HOME
    try {
        $env:XDG_DATA_HOME = Join-Path $DataRoot 'https-datos'
        $env:XDG_CONFIG_HOME = Join-Path $DataRoot 'https-config'
        & (Join-Path $PSScriptRoot 'caddy.exe') validate --config $File --adapter caddyfile
        if ($LASTEXITCODE -ne 0) { Remove-Item $File; throw 'Configuracion HTTPS no valida.' }
    } finally {
        $env:XDG_DATA_HOME = $PreviousData
        $env:XDG_CONFIG_HOME = $PreviousConfig
    }
} finally { $Lock.Dispose() }
& (Join-Path $PSScriptRoot 'Iniciar-MINA.ps1') -DataRoot $DataRoot -SinNavegador
$Roots = @(Get-ChildItem (Join-Path $DataRoot 'https-datos') -Recurse -Filter 'root.crt')
if ($Roots.Count -ne 1) { throw 'No se encontro el certificado publico de la CA. Revisa el inicio HTTPS.' }
$Public = Join-Path $DataRoot 'Certificado-publico-MINA.crt'
Copy-Item $Roots[0].FullName $Public
$Cert = New-Object Security.Cryptography.X509Certificates.X509Certificate2($Public)
Write-Host "Certificado publico (solo este se transfiere al telefono): $Public"
$Sha = [Security.Cryptography.SHA256]::Create()
try { Write-Host ('Huella SHA256 del certificado: ' + [BitConverter]::ToString($Sha.ComputeHash($Cert.RawData)).Replace('-','')) }
finally { $Sha.Dispose() }
if ($ConfiarEnEstaPC) { Import-Certificate -FilePath $Public -CertStoreLocation Cert:\CurrentUser\Root | Out-Null }
if ($AbrirFirewall) {
    # Requires an elevated PowerShell, but does not change data-account ownership.
    $RuleName = 'MINA-Local-HTTPS-Privado'
    if (Get-NetFirewallRule -Name $RuleName -ErrorAction SilentlyContinue) { throw 'Ya existe una regla MINA; revisala antes de sustituirla.' }
    New-NetFirewallRule -Name $RuleName -DisplayName 'MINA HTTPS solo red privada' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443 -LocalAddress $DireccionPrivada -RemoteAddress LocalSubnet -Profile Private -Program (Join-Path $PSScriptRoot 'caddy.exe') | Out-Null
}
Write-Host "Direccion del celular: https://$DireccionPrivada"
Write-Host 'Instala y verifica el certificado publico en el telefono antes de iniciar sesion. No aceptes advertencias TLS ni compartas archivos .key.'
