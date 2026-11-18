param(
    [Parameter(Mandatory=$true)][string]$ClaveRecuperacion,
    [string]$DataRoot = (Join-Path $env:LOCALAPPDATA 'MINA-Local')
)
$ErrorActionPreference = 'Stop'
$Age = Join-Path $PSScriptRoot 'age.exe'
$Keygen = Join-Path $PSScriptRoot 'age-keygen.exe'
$RecipientFile = Join-Path $DataRoot 'destinatario-respaldo.txt'
if ((Test-Path $ClaveRecuperacion) -or (Test-Path $RecipientFile)) { throw 'Ya existe la clave o el destinatario; no se sobrescribiran.' }
[IO.Directory]::CreateDirectory($DataRoot) | Out-Null
Write-Host 'age pedira una frase de recuperacion dos veces. Guardala fuera de la PC; no se puede recuperar si se pierde.'
# Only the encrypted identity is written to disk. age handles the password on its terminal.
$Identity = & $Keygen 2>$null
if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar la clave.' }
try {
    $PublicLine = @($Identity | Where-Object { $_ -match '^# public key: age1' })
    if ($PublicLine.Count -ne 1) { throw 'Respuesta inesperada de age-keygen.' }
    $Recipient = $PublicLine[0].Substring(14).Trim()
    $Identity | & $Age --passphrase --output $ClaveRecuperacion
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo proteger la clave.' }
    $Recipient | Set-Content $RecipientFile -Encoding ASCII
} finally { $Identity = $null }
Write-Host 'Conserva la clave cifrada y su frase en custodia separada; comprueba una restauracion antes de datos reales.'
