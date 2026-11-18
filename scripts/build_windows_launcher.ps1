param(
    [Parameter(Mandatory=$true)][string]$Output,
    [string]$Payload
)
$ErrorActionPreference = 'Stop'
$Compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (!(Test-Path $Compiler)) { throw 'El entorno de compilacion Windows requiere .NET Framework 4.8.' }
Add-Type -AssemblyName System.Drawing
$IconPath = Join-Path ([IO.Path]::GetTempPath()) ('MINA-icon-' + [guid]::NewGuid().ToString('N') + '.ico')
$Bitmap = New-Object Drawing.Bitmap 64,64
$Graphics = [Drawing.Graphics]::FromImage($Bitmap)
$Font = New-Object Drawing.Font 'Segoe UI',34,([Drawing.FontStyle]::Bold)
$Brush = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(247,244,237))
$Stream = $null
try {
    $Graphics.Clear([Drawing.Color]::FromArgb(0,64,112))
    $Graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $Graphics.DrawString('M',$Font,$Brush,8,1)
    $Icon = [Drawing.Icon]::FromHandle($Bitmap.GetHicon())
    $Stream = [IO.File]::Create($IconPath); $Icon.Save($Stream); $Stream.Dispose(); $Stream=$null
    $Source = Join-Path $PSScriptRoot '../local/desktop/MinaDesktop.cs'
    $Arguments = @('/nologo','/target:winexe','/platform:x64','/codepage:65001',('/out:'+[IO.Path]::GetFullPath($Output)),('/win32icon:'+$IconPath),'/reference:System.dll','/reference:System.Core.dll','/reference:System.Drawing.dll','/reference:System.Windows.Forms.dll','/reference:System.Web.Extensions.dll','/reference:System.Management.dll','/reference:System.IO.Compression.dll','/reference:System.IO.Compression.FileSystem.dll','/reference:Microsoft.CSharp.dll')
    if ($Payload) { $Arguments += ('/resource:'+[IO.Path]::GetFullPath($Payload)+',MINA.Payload.zip') }
    & $Compiler @Arguments $Source
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el iniciador Windows de MINA.' }
} finally {
    if ($Stream) { $Stream.Dispose() }
    $Graphics.Dispose(); $Font.Dispose(); $Brush.Dispose(); $Bitmap.Dispose()
    Remove-Item $IconPath -ErrorAction SilentlyContinue
}
