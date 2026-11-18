param([string]$DataRoot = (Join-Path $env:LOCALAPPDATA 'MINA-Local'))
$ErrorActionPreference = 'Stop'
$Config = Join-Path $DataRoot 'celular.Caddyfile'
if (!(Test-Path $Config)) { return }
$Exe = Join-Path $PSScriptRoot 'caddy.exe'
$PidFile = Join-Path $DataRoot 'celular.pid'
$Running = $null
if (Test-Path $PidFile) {
    $Running = Get-Process -Id ([int](Get-Content $PidFile)) -ErrorAction SilentlyContinue
    if ($Running -and $Running.Path -ne $Exe) { throw 'El proceso HTTPS no corresponde a esta instalacion.' }
}
if (!$Running) {
    $PreviousData = $env:XDG_DATA_HOME
    $PreviousConfig = $env:XDG_CONFIG_HOME
    try {
        $env:XDG_DATA_HOME = Join-Path $DataRoot 'https-datos'
        $env:XDG_CONFIG_HOME = Join-Path $DataRoot 'https-config'
        $Arguments = @('run','--config',('"'+$Config+'"'),'--adapter','caddyfile')
        $Process = Start-Process -FilePath $Exe -ArgumentList $Arguments -WorkingDirectory $DataRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $DataRoot 'https.log') -RedirectStandardError (Join-Path $DataRoot 'https-error.log')
        $Process.Id | Set-Content $PidFile
        $Endpoint = [regex]::Match((Get-Content $Config -Raw), 'https://([0-9.]+):([0-9]+)')
        if (!$Endpoint.Success) { throw 'La configuracion HTTPS no contiene una IP y puerto validos.' }
        $Ready = $false
        for ($i=0; $i -lt 50; $i++) {
            Start-Sleep -Milliseconds 200
            if ($Process.HasExited) { throw 'HTTPS no pudo iniciar. Revisa https-error.log y la IP reservada.' }
            $Client = New-Object Net.Sockets.TcpClient
            try {
                $Connection = $Client.ConnectAsync($Endpoint.Groups[1].Value, [int]$Endpoint.Groups[2].Value)
                if ($Connection.Wait(500) -and $Client.Connected) { $Ready=$true; break }
            } catch {} finally { $Client.Dispose() }
        }
        if (!$Ready) { throw 'HTTPS no quedo listo. Revisa https-error.log.' }
    } finally {
        $env:XDG_DATA_HOME = $PreviousData
        $env:XDG_CONFIG_HOME = $PreviousConfig
    }
}
