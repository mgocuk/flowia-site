Add-Type -AssemblyName System.Drawing

$inputDir = "C:\Users\MustafaGOCUK\Desktop\1"
$targetW = 1080
$targetH = 1920
$destW = 900
$destH = 1580

# Harmonious Flowia Color Palettes for the 8 Screenshots (Creates a stunning color progression wave in Play Store!)
$palettes = @(
    @{ C1 = "#20092B"; C2 = "#5B194E"; C3 = "#E8789A"; Glow1 = "#FF6B9D"; Glow2 = "#9B72CF" }, # 1: Deep Rose & Violet
    @{ C1 = "#2A0D38"; C2 = "#6C1D57"; C3 = "#F08BA9"; Glow1 = "#FF8DA1"; Glow2 = "#AB7CE6" }, # 2: Radiant Magenta
    @{ C1 = "#1D0B2E"; C2 = "#4A1A6B"; C3 = "#9B72CF"; Glow1 = "#7C4DFF"; Glow2 = "#E8789A" }, # 3: Lavender Violet
    @{ C1 = "#2D0A27"; C2 = "#7A1C52"; C3 = "#FF6B9D"; Glow1 = "#FF4081"; Glow2 = "#B388FF" }, # 4: Berry Pink Glow
    @{ C1 = "#1A0F2B"; C2 = "#4E1D5B"; C3 = "#E8789A"; Glow1 = "#E8789A"; Glow2 = "#7C4DFF" }, # 5: Royal Purple & Pink
    @{ C1 = "#2E0D2F"; C2 = "#701A58"; C3 = "#F497B5"; Glow1 = "#FF80AB"; Glow2 = "#9C27B0" }, # 6: Soft Orchid Rose
    @{ C1 = "#160C26"; C2 = "#421852"; C3 = "#8E24AA"; Glow1 = "#AB47BC"; Glow2 = "#FF4081" }, # 7: Midnight Violet
    @{ C1 = "#260A29"; C2 = "#63184E"; C3 = "#E8789A"; Glow1 = "#FF6B9D"; Glow2 = "#7C4DFF" }  # 8: Flowia Signature Gradient
)

# Clean up existing PlayStore_ files
Get-ChildItem -Path $inputDir -Filter "PlayStore_*.png" | Remove-Item -Force -ErrorAction SilentlyContinue

for ($i = 1; $i -le 8; $i++) {
    $srcName = "Screenshot$i.png"
    $outName = "PlayStore_Screenshot$i.png"
    $srcPath = Join-Path $inputDir $srcName
    $outPath = Join-Path $inputDir $outName

    if (-not (Test-Path $srcPath)) {
        Write-Host "⚠️ Warning: $srcName not found, skipping."
        continue
    }

    $pal = $palettes[$i - 1]
    $srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)

    # 1. Create 1080x1920 Canvas
    $canvas = New-Object System.Drawing.Bitmap([int]$targetW, [int]$targetH)
    $g = [System.Drawing.Graphics]::FromImage($canvas)

    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # 2. Rich Harmonious Linear Gradient Background
    $rect = New-Object System.Drawing.Rectangle(0, 0, [int]$targetW, [int]$targetH)
    $colorTop = [System.Drawing.ColorTranslator]::FromHtml($pal.C1)
    $colorBot = [System.Drawing.ColorTranslator]::FromHtml($pal.C2)
    
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $colorTop, $colorBot, [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    $g.FillRectangle($bgBrush, $rect)
    $bgBrush.Dispose()

    # Ambient Glowing Orbs
    $glowCol1 = [System.Drawing.ColorTranslator]::FromHtml($pal.Glow1)
    $glowCol2 = [System.Drawing.ColorTranslator]::FromHtml($pal.Glow2)
    
    $glowBrush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(55, $glowCol1.R, $glowCol1.G, $glowCol1.B))
    $glowBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(55, $glowCol2.R, $glowCol2.G, $glowCol2.B))

    $g.FillEllipse($glowBrush1, -160, -160, 720, 720)
    $g.FillEllipse($glowBrush2, 500, 1300, 740, 740)
    $glowBrush1.Dispose()
    $glowBrush2.Dispose()

    # 3. Position Phone Frame Exactly Centered
    $posX = [int](($targetW - $destW) / 2)
    $posY = [int](($targetH - $destH) / 2)

    # 4. Multi-layer Ambient Shadow for Phone Card
    $shadowBrush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 0, 0, 0))
    $shadowBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(85, 0, 0, 0))
    
    $sX = [int]($posX - 10)
    $sY = [int]($posY + 14)
    $sW = [int]($destW + 20)
    $sH = [int]($destH + 20)
    $r = 38

    $pathShadow = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pathShadow.AddArc($sX, $sY, $r, $r, 180, 90)
    $pathShadow.AddArc(($sX + $sW - $r), $sY, $r, $r, 270, 90)
    $pathShadow.AddArc(($sX + $sW - $r), ($sY + $sH - $r), $r, $r, 0, 90)
    $pathShadow.AddArc($sX, ($sY + $sH - $r), $r, $r, 90, 90)
    $pathShadow.CloseFigure()
    $g.FillPath($shadowBrush2, $pathShadow)
    $shadowBrush1.Dispose()
    $shadowBrush2.Dispose()
    $pathShadow.Dispose()

    # 5. Crisp White Device Frame Border
    $fX = [int]($posX - 5)
    $fY = [int]($posY - 5)
    $fW = [int]($destW + 10)
    $fH = [int]($destH + 10)

    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(240, 255, 255, 255), 5)
    $pathFrame = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pathFrame.AddArc($fX, $fY, $r, $r, 180, 90)
    $pathFrame.AddArc(($fX + $fW - $r), $fY, $r, $r, 270, 90)
    $pathFrame.AddArc(($fX + $fW - $r), ($fY + $fH - $r), $r, $r, 0, 90)
    $pathFrame.AddArc($fX, ($fY + $fH - $r), $r, $r, 90, 90)
    $pathFrame.CloseFigure()
    $g.DrawPath($borderPen, $pathFrame)
    $borderPen.Dispose()

    # 6. Inner Clip & Scaled Image Drawing
    $pathClip = New-Object System.Drawing.Drawing2D.GraphicsPath
    $iX = [int]$posX
    $iY = [int]$posY
    $iW = [int]$destW
    $iH = [int]$destH
    $rInner = 30

    $pathClip.AddArc($iX, $iY, $rInner, $rInner, 180, 90)
    $pathClip.AddArc(($iX + $iW - $rInner), $iY, $rInner, $rInner, 270, 90)
    $pathClip.AddArc(($iX + $iW - $rInner), ($iY + $iH - $rInner), $rInner, $rInner, 0, 90)
    $pathClip.AddArc($iX, ($iY + $iH - $rInner), $rInner, $rInner, 90, 90)
    $pathClip.CloseFigure()

    $oldClip = $g.Clip
    $g.SetClip($pathClip)

    # Scale screenshot to fit filled frame
    $srcRatio = [double]$srcBmp.Width / [double]$srcBmp.Height
    $targetRatio = [double]$destW / [double]$destH

    if ($srcRatio > $targetRatio) {
        $drawH = $destH
        $drawW = [int]($destH * $srcRatio)
        $drawX = [int]($posX - (($drawW - $destW) / 2))
        $drawY = [int]$posY
    } else {
        $drawW = $destW
        $drawH = [int]($destW / $srcRatio)
        $drawX = [int]$posX
        $drawY = [int]($posY - (($drawH - $destH) / 2))
    }

    $imgRect = New-Object System.Drawing.Rectangle($drawX, $drawY, $drawW, $drawH)
    $g.DrawImage($srcBmp, $imgRect)
    $g.Clip = $oldClip

    $pathClip.Dispose()
    $pathFrame.Dispose()

    # Save output PNG
    $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $srcBmp.Dispose()
    $canvas.Dispose()
    $g.Dispose()

    Write-Host "✨ Harmonious Theme Generated ($i/8): $srcName -> $outName (Colors: $($pal.C1) -> $($pal.C2))"
}

Write-Host "`nSUCCESS: All 8 Play Store screenshots rendered with theme-matching background gradients!"
