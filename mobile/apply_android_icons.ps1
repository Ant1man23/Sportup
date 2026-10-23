Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\PC\.gemini\antigravity-ide\brain\47460fd8-3ce6-4e79-9f6a-3ed545e0f684\.user_uploaded\media_1792521543446.jpg"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

# 1. Crop Emblem: X=16, Y=130, Width=268, Height=178
$emblemRect = New-Object System.Drawing.Rectangle(16, 130, 268, 178)
$emblemCrop = New-Object System.Drawing.Bitmap(268, 178)
$g = [System.Drawing.Graphics]::FromImage($emblemCrop)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, 268, 178)), $emblemRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

# 2. Crop Text "SportUp.": X=310, Y=130, Width=704, Height=178
$textRect = New-Object System.Drawing.Rectangle(310, 130, 704, 178)
$textCrop = New-Object System.Drawing.Bitmap(704, 178)
$g = [System.Drawing.Graphics]::FromImage($textCrop)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, 704, 178)), $textRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

# 3. Create high-res master square icon (1024x1024)
$masterSize = 1024
$masterSquare = New-Object System.Drawing.Bitmap($masterSize, $masterSize)
$gMaster = [System.Drawing.Graphics]::FromImage($masterSquare)
$gMaster.Clear([System.Drawing.Color]::White)
$gMaster.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gMaster.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gMaster.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# In 1024x1024 canvas:
# Emblem width = 480
$embW = 480
$embH = [int]($embW * ($emblemCrop.Height / $emblemCrop.Width))
$embX = [int](($masterSize - $embW) / 2)
$embY = 220
$gMaster.DrawImage($emblemCrop, (New-Object System.Drawing.Rectangle($embX, $embY, $embW, $embH)))

# Text width = 760
$txtW = 760
$txtH = [int]($txtW * ($textCrop.Height / $textCrop.Width))
$txtX = [int](($masterSize - $txtW) / 2)
$txtY = $embY + $embH + 40
$gMaster.DrawImage($textCrop, (New-Object System.Drawing.Rectangle($txtX, $txtY, $txtW, $txtH)))
$gMaster.Dispose()

# 4. Create high-res master round icon (1024x1024)
$masterRound = New-Object System.Drawing.Bitmap($masterSize, $masterSize)
$gRound = [System.Drawing.Graphics]::FromImage($masterRound)
$gRound.Clear([System.Drawing.Color]::Transparent)
$gRound.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gRound.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gRound.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$clipPath.AddEllipse(0, 0, $masterSize, $masterSize)
$gRound.SetClip($clipPath)
$gRound.DrawImage($masterSquare, 0, 0, $masterSize, $masterSize)
$gRound.ResetClip()
$gRound.Dispose()

# 5. Output to Android res directories
$resRoot = "c:\Users\PC\.gemini\antigravity-ide\scratch\SportUp\mobile\android\app\src\main\res"

$densities = @(
    @{ Name = "mipmap-mdpi"; Size = 48 },
    @{ Name = "mipmap-hdpi"; Size = 72 },
    @{ Name = "mipmap-xhdpi"; Size = 96 },
    @{ Name = "mipmap-xxhdpi"; Size = 144 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192 }
)

foreach ($d in $densities) {
    $targetDir = Join-Path $resRoot $d.Name
    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force }
    $s = $d.Size

    # Square ic_launcher.png
    $bmpSquare = New-Object System.Drawing.Bitmap($s, $s)
    $gS = [System.Drawing.Graphics]::FromImage($bmpSquare)
    $gS.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gS.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gS.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gS.DrawImage($masterSquare, 0, 0, $s, $s)
    $gS.Dispose()
    $squarePath = Join-Path $targetDir "ic_launcher.png"
    $bmpSquare.Save($squarePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpSquare.Dispose()
    Write-Host "Wrote: $squarePath ($s x $s)"

    # Round ic_launcher_round.png
    $bmpRound = New-Object System.Drawing.Bitmap($s, $s)
    $gR = [System.Drawing.Graphics]::FromImage($bmpRound)
    $gR.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gR.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gR.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gR.DrawImage($masterRound, 0, 0, $s, $s)
    $gR.Dispose()
    $roundPath = Join-Path $targetDir "ic_launcher_round.png"
    $bmpRound.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpRound.Dispose()
    Write-Host "Wrote: $roundPath ($s x $s)"
}

$src.Dispose()
$emblemCrop.Dispose()
$textCrop.Dispose()
$masterSquare.Dispose()
$masterRound.Dispose()

Write-Host "All Android icons generated successfully!"
