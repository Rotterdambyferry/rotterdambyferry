# Maakt van elke grote foto in assets/img een mobiele variant van 800px breed
# (naam-mobiel.jpg). Bestaande mobiele varianten worden overgeslagen, dus je
# kunt dit script gerust opnieuw draaien na het toevoegen van nieuwe foto's.
#
# Gebruik (in PowerShell, vanuit de projectmap):
#   .\maak-mobiele-fotos.ps1

Add-Type -AssemblyName System.Drawing

$imgMap = Join-Path $PSScriptRoot "assets\img"
$doelBreedte = 800
$kwaliteit = 80

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [long]$kwaliteit)

$gemaakt = 0
foreach ($bestand in Get-ChildItem (Join-Path $imgMap "*.jpg")) {
  # Sla varianten die we zelf maken en de kleine homepagethumbnails over.
  if ($bestand.BaseName -like "*-mobiel" -or $bestand.BaseName -like "*-kaart") { continue }

  $bron = [System.Drawing.Image]::FromFile($bestand.FullName)
  try {
    # Alleen foto's die echt groter zijn dan het mobiele formaat verkleinen.
    if ($bron.Width -le 900) { continue }

    $doelPad = Join-Path $imgMap ($bestand.BaseName + "-mobiel.jpg")
    if (Test-Path $doelPad) { continue }

    $nieuweHoogte = [int][math]::Round($bron.Height * ($doelBreedte / $bron.Width))
    $klein = New-Object System.Drawing.Bitmap($doelBreedte, $nieuweHoogte)
    $tekenaar = [System.Drawing.Graphics]::FromImage($klein)
    $tekenaar.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $tekenaar.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $tekenaar.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $tekenaar.DrawImage($bron, 0, 0, $doelBreedte, $nieuweHoogte)
    $tekenaar.Dispose()

    $klein.Save($doelPad, $jpegCodec, $encoderParams)
    $klein.Dispose()

    $kb = [math]::Round((Get-Item $doelPad).Length / 1KB)
    Write-Host ("OK  {0}  ({1}x{2}, {3} KB)" -f (Split-Path $doelPad -Leaf), $doelBreedte, $nieuweHoogte, $kb)
    $gemaakt++
  }
  finally {
    $bron.Dispose()
  }
}

Write-Host ""
Write-Host "Klaar: $gemaakt mobiele varianten gemaakt."
