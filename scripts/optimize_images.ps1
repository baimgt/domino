Add-Type -AssemblyName System.Drawing

function Get-Encoder {
    param ([string]$mimeType)
    $encoders = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()
    foreach ($encoder in $encoders) {
        if ($encoder.MimeType -eq $mimeType) {
            return $encoder
        }
    }
    return $null
}

$jpegEncoder = Get-Encoder "image/jpeg"
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)

function Resize-And-Compress {
    param (
        [string]$FilePath,
        [int]$MaxDim,
        [bool]$IsJpeg = $false
    )

    if (-not (Test-Path $FilePath)) { return }

    $origFileInfo = Get-Item $FilePath
    $origBytes = $origFileInfo.Length

    try {
        # Read file into memory stream to prevent file lock
        $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
        $ms = New-Object System.IO.MemoryStream($fileBytes, 0, $fileBytes.Length)
        $srcImg = [System.Drawing.Image]::FromStream($ms)

        $w = $srcImg.Width
        $h = $srcImg.Height

        $scale = 1.0
        if ($w -gt $MaxDim -or $h -gt $MaxDim) {
            if ($w -ge $h) {
                $scale = $MaxDim / $w
            } else {
                $scale = $MaxDim / $h
            }
        }

        $newW = [math]::Max(1, [int][math]::Round($w * $scale))
        $newH = [math]::Max(1, [int][math]::Round($h * $scale))

        # Only process if scaling down or if JPEG can be recompressed
        if ($scale -lt 0.98 -or ($IsJpeg -and $origBytes -gt 250KB)) {
            $destBmp = New-Object System.Drawing.Bitmap($newW, $newH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

            if ($IsJpeg) {
                # Fill white background for JPEG in case of transparent alpha
                $graphics.Clear([System.Drawing.Color]::Black)
            } else {
                $graphics.Clear([System.Drawing.Color]::Transparent)
            }

            $graphics.DrawImage($srcImg, 0, 0, $newW, $newH)
            $graphics.Dispose()
            $srcImg.Dispose()
            $ms.Dispose()

            # Save to temporary memory stream first
            $outMs = New-Object System.IO.MemoryStream
            if ($IsJpeg) {
                $destBmp.Save($outMs, $jpegEncoder, $encoderParams)
            } else {
                $destBmp.Save($outMs, [System.Drawing.Imaging.ImageFormat]::Png)
            }
            $destBmp.Dispose()

            $newBytes = $outMs.Length
            # Only overwrite if new size is smaller than original
            if ($newBytes -lt $origBytes) {
                [System.IO.File]::WriteAllBytes($FilePath, $outMs.ToArray())
                $savedPct = [math]::Round((1 - ($newBytes / $origBytes)) * 100, 1)
                $oldKb = [math]::Round($origBytes / 1KB)
                $newKb = [math]::Round($newBytes / 1KB)
                Write-Output ("OPTIMIZED: {0} ({1}x{2} -> {3}x{4}) | {5}KB -> {6}KB (-{7}%)" -f $origFileInfo.Name, $w, $h, $newW, $newH, $oldKb, $newKb, $savedPct)
            } else {
                Write-Output ("SKIPPED (Already optimal): {0}" -f $origFileInfo.Name)
            }
            $outMs.Dispose()
        } else {
            $srcImg.Dispose()
            $ms.Dispose()
        }
    } catch {
        Write-Warning ("Error optimizing {0}: {1}" -f $FilePath, $_.Exception.Message)
    }
}

Write-Output "=== Starting Mobile Ultra-Lightweight Asset Optimization ==="

# 1. SLOT SYMBOLS (max 256px) - previously 1024x1024!
Get-ChildItem -Path "public/assets/sym_*.png" | ForEach-Object {
    Resize-And-Compress -FilePath $_.FullName -MaxDim 256 -IsJpeg $false
}
Get-ChildItem -Path "public/assets/mahjong2/sym_*.png" | ForEach-Object {
    Resize-And-Compress -FilePath $_.FullName -MaxDim 256 -IsJpeg $false
}
Get-ChildItem -Path "public/assets/fivelions/sym_*.png" | ForEach-Object {
    Resize-And-Compress -FilePath $_.FullName -MaxDim 256 -IsJpeg $false
}
Get-ChildItem -Path "public/assets/gatokaca/sym_*.jpg" | ForEach-Object {
    Resize-And-Compress -FilePath $_.FullName -MaxDim 256 -IsJpeg $true
}
Get-ChildItem -Path "public/assets/gatokaca/sym_*.png" | ForEach-Object {
    Resize-And-Compress -FilePath $_.FullName -MaxDim 256 -IsJpeg $false
}

# 2. AVATARS (max 256px) - previously 1024x1024!
Get-ChildItem -Path "public/assets/avatars/*.jpg" | ForEach-Object {
    Resize-And-Compress -FilePath $_.FullName -MaxDim 256 -IsJpeg $true
}
Get-ChildItem -Path "public/assets/avatars/*.png" | ForEach-Object {
    Resize-And-Compress -FilePath $_.FullName -MaxDim 256 -IsJpeg $false
}

# 3. HOME CARDS (max 640px)
Get-ChildItem -Path "public/assets/home/card_*.jpg" | ForEach-Object {
    Resize-And-Compress -FilePath $_.FullName -MaxDim 640 -IsJpeg $true
}

# 4. OVERSIZED PNGs
Resize-And-Compress -FilePath "public/assets/jinji/coin_PNG36943.png" -MaxDim 400 -IsJpeg $false
Resize-And-Compress -FilePath "public/assets/fafafa2/reels_frame_full.png" -MaxDim 1280 -IsJpeg $false
Resize-And-Compress -FilePath "public/assets/gatokaca/bg-gato-new.png" -MaxDim 1280 -IsJpeg $false
Resize-And-Compress -FilePath "public/assets/loby/loby.png" -MaxDim 1024 -IsJpeg $false
Resize-And-Compress -FilePath "public/assets/gatokaca/test_keyed.png" -MaxDim 1280 -IsJpeg $false
Resize-And-Compress -FilePath "public/home_bg.png" -MaxDim 1024 -IsJpeg $false
Resize-And-Compress -FilePath "public/slot_lobby_bg.png" -MaxDim 1024 -IsJpeg $false
Resize-And-Compress -FilePath "public/duofuduocai_bg.png" -MaxDim 1024 -IsJpeg $false
Resize-And-Compress -FilePath "public/domino.png" -MaxDim 640 -IsJpeg $false
Resize-And-Compress -FilePath "public/bg.png" -MaxDim 1024 -IsJpeg $false
Resize-And-Compress -FilePath "public/premium_lobby_bg.png" -MaxDim 1024 -IsJpeg $false
Resize-And-Compress -FilePath "public/gardu_bg.png" -MaxDim 1024 -IsJpeg $false
Resize-And-Compress -FilePath "public/assets/zeus_real.png" -MaxDim 640 -IsJpeg $false

# 5. ALL BACKGROUND JPEGs (max 1280px, 82% quality)
$bgFiles = @(
    "public/assets/zeus/bg_olympus_hd.jpg",
    "public/assets/zeus/bg_olympus_new.jpg",
    "public/assets/slot_loading_bg.jpg",
    "public/assets/jinji/loading.jpg",
    "public/assets/jinji/bg_temple.jpg",
    "public/assets/fafafa2/loading.jpg",
    "public/assets/fafafa2/bg_fafafa2.jpg",
    "public/assets/fafafa2/bg_temple_clean.jpg",
    "public/assets/fafafa2/bg_clean.jpg",
    "public/assets/fafafa2/bg_temple.jpg",
    "public/duofu_loading_art.jpg",
    "public/assets/duofuduocai/loading_art.jpg",
    "public/assets/mahjong2/bg_mahjong.jpg",
    "public/assets/mahjong2/loading.jpg",
    "public/assets/fivelions/loading.jpg",
    "public/assets/fivelions/bg_temple.jpg",
    "public/assets/wildwest/loading.jpg",
    "public/assets/wildwest/bg_town.jpg",
    "public/assets/wildwest/cowgirl.jpg",
    "public/assets/wildwest/sheriff.jpg",
    "public/assets/wildwest/outlaw.jpg",
    "public/assets/candyrush/loading.jpg",
    "public/assets/byone_banner.jpg",
    "public/assets/loby/lobby_bg.jpg",
    "public/assets/loby/chest_bonus.jpg",
    "public/assets/loby/gift_boxes.jpg",
    "public/assets/loby/golden_trophy.jpg",
    "public/assets/loby/room_2k.jpg",
    "public/assets/loby/room_5k.jpg",
    "public/assets/loby/room_pemula_decor.jpg",
    "public/assets/loby/room_menengah_decor.jpg",
    "public/assets/billiard_lounge_bg.jpg",
    "public/assets/kings_billiard_loading.jpg",
    "public/kings_billiard_loading.jpg",
    "public/assets/royal_x_loading_bg.jpg",
    "public/royal_x_loading_bg.jpg",
    "public/assets/gatokaca/loading_art.jpg"
)

foreach ($bg in $bgFiles) {
    Resize-And-Compress -FilePath $bg -MaxDim 1280 -IsJpeg $true
}

Write-Output "=== Optimization Complete ==="
