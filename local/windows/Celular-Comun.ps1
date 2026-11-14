function New-MinaCaddyConfig {
    param([string]$Address, [int]$Port = 443, [switch]$LoopbackTest)
    $Ip = $null
    if (![Net.IPAddress]::TryParse($Address, [ref]$Ip) -or $Ip.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) { throw 'Se requiere una direccion IPv4 privada.' }
    $Bytes = $Ip.GetAddressBytes()
    $Private = $Bytes[0] -eq 10 -or ($Bytes[0] -eq 172 -and $Bytes[1] -ge 16 -and $Bytes[1] -le 31) -or ($Bytes[0] -eq 192 -and $Bytes[1] -eq 168)
    if (!$Private -and !($LoopbackTest -and [Net.IPAddress]::IsLoopback($Ip))) { throw 'No se permiten direcciones publicas ni escuchar en todas las interfaces.' }
    if ($Port -lt 1 -or $Port -gt 65535) { throw 'Puerto no valido.' }
    $Address = $Ip.ToString()
    return @"
{
    admin off
    auto_https disable_redirects
    skip_install_trust
    servers {
        protocols h1 h2
    }
}
https://${Address}:$Port {
    bind $Address
    tls internal
    @management path /_* /api/collections/_superusers* /api/backups* /api/settings* /api/logs* /api/crons*
    respond @management 404
    @unknownApi {
        path /api/*
        not path /api/health /api/collections/mina_operators/auth-with-password /api/collections/mina_operators/auth-refresh /api/collections/mina_patients/records* /api/collections/mina_appointments/records* /api/collections/mina_availability/records* /api/collections/mina_patient_documents/records* /api/collections/mina_appointment_reminders/records* /api/files/token /api/files/mina_patient_documents/*
    }
    respond @unknownApi 404
    header {
        X-Content-Type-Options nosniff
        Referrer-Policy no-referrer
        Cache-Control no-store
    }
    reverse_proxy 127.0.0.1:8090
}
"@
}
