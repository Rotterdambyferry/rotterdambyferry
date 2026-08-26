# Maakt van elke grote foto in assets/img een mobiele variant van 800px breed
# (naam-mobiel.jpg). Bestaande mobiele varianten worden overgeslagen, dus je
# kunt dit script gerust opnieuw draaien na het toevoegen van nieuwe foto's.
# De kwaliteit wordt adaptief gekozen (stapsgewijs omlaag) met een KB-doel
# specifiek voor mobiel — dezelfde aanpak als de blogfoto-pipeline, maar met
# een lager doel omdat dit bestand alleen op telefoons geladen wordt.
#
# Gebruik (in PowerShell, vanuit de projectmap):
#   .\maak-mobiele-fotos.ps1
#   .\maak-mobiele-fotos.ps1 -Herbouw    # ook bestaande -mobiel.jpg's opnieuw maken
#                                          # (bijv. na het verlagen van $kbDoel)

param(
  [switch]$Herbouw
)

Add-Type -AssemblyName System.Drawing

$imgMap = Join-Path $PSScriptRoot "assets\img"
$doelBreedte = 800
$kbDoel = 200
$kwaliteitStappen = @(80, 75, 70, 65, 60, 55)

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" }

function Sla-AdaptiefOp($bitmap, $doelPad) {
  $beste = $kwaliteitStappen[0]
  foreach ($q in $kwaliteitStappen) {
    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
      [System.Drawing.Imaging.Encoder]::Quality, [long]$q)
    $bitmap.Save($doelPad, $jpegCodec, $ep)
    $beste = $q
    if ((Get-Item $doelPad).Length / 1KB -le $kbDoel) { break }
  }
  return $beste
}

$gemaakt = 0
foreach ($bestand in Get-ChildItem (Join-Path $imgMap "*.jpg")) {
  # Sla varianten die we zelf maken en de kleine homepagethumbnails over.
  if ($bestand.BaseName -like "*-mobiel" -or $bestand.BaseName -like "*-kaart") { continue }

  $bron = [System.Drawing.Image]::FromFile($bestand.FullName)
  try {
    # Alleen foto's die echt groter zijn dan het mobiele formaat verkleinen.
    if ($bron.Width -le 900) { continue }

    $doelPad = Join-Path $imgMap ($bestand.BaseName + "-mobiel.jpg")
    if ((Test-Path $doelPad) -and -not $Herbouw) { continue }

    $nieuweHoogte = [int][math]::Round($bron.Height * ($doelBreedte / $bron.Width))
    $klein = New-Object System.Drawing.Bitmap($doelBreedte, $nieuweHoogte)
    $tekenaar = [System.Drawing.Graphics]::FromImage($klein)
    $tekenaar.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $tekenaar.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $tekenaar.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $tekenaar.DrawImage($bron, 0, 0, $doelBreedte, $nieuweHoogte)
    $tekenaar.Dispose()

    $gekozenKwaliteit = Sla-AdaptiefOp $klein $doelPad
    $klein.Dispose()

    $kb = [math]::Round((Get-Item $doelPad).Length / 1KB)
    Write-Host ("OK  {0}  ({1}x{2}, kwaliteit {3}, {4} KB)" -f (Split-Path $doelPad -Leaf), $doelBreedte, $nieuweHoogte, $gekozenKwaliteit, $kb)
    $gemaakt++
  }
  finally {
    $bron.Dispose()
  }
}

Write-Host ""
Write-Host "Klaar: $gemaakt mobiele varianten gemaakt."
