# Draws the placeholder Cartner app icon (a simple cat face) with GDI+.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/make-icon.ps1
Add-Type -AssemblyName System.Drawing

$outPath = Join-Path $PSScriptRoot "..\assets\cat.png"

$size = 512
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

function New-Color([int]$a, [int]$r, [int]$gg, [int]$b) {
    [System.Drawing.Color]::FromArgb($a, $r, $gg, $b)
}
function New-Brush($c) { New-Object System.Drawing.SolidBrush($c) }
function New-Pen($c, [single]$w) { New-Object System.Drawing.Pen($c, $w) }

$cream    = New-Color 255 255 244 226
$fur      = New-Color 255 248 180  95
$furLine  = New-Color 255 217 142  59
$ink      = New-Color 255  61  49  41
$pink     = New-Color 255 231 126 126
$blush    = New-Color 200 249 167 167
$innerEar = New-Color 255 249 207 209

# round cream badge
$g.FillEllipse((New-Brush $cream), 16, 16, 480, 480)

# ears (outer + inner)
$leftEar  = @([System.Drawing.PointF]::new(165, 175), [System.Drawing.PointF]::new(170, 88), [System.Drawing.PointF]::new(240, 138))
$rightEar = @([System.Drawing.PointF]::new(347, 175), [System.Drawing.PointF]::new(342, 88), [System.Drawing.PointF]::new(272, 138))
$leftEarInner  = @([System.Drawing.PointF]::new(185, 145), [System.Drawing.PointF]::new(188, 112), [System.Drawing.PointF]::new(216, 133))
$rightEarInner = @([System.Drawing.PointF]::new(327, 145), [System.Drawing.PointF]::new(324, 112), [System.Drawing.PointF]::new(296, 133))
$g.FillPolygon((New-Brush $fur), $leftEar)
$g.DrawPolygon((New-Pen $furLine 5), $leftEar)
$g.FillPolygon((New-Brush $fur), $rightEar)
$g.DrawPolygon((New-Pen $furLine 5), $rightEar)
$g.FillPolygon((New-Brush $innerEar), $leftEarInner)
$g.FillPolygon((New-Brush $innerEar), $rightEarInner)

# body + head
$g.FillEllipse((New-Brush $fur), 154, 300, 204, 150)
$g.DrawEllipse((New-Pen $furLine 6), 154, 300, 204, 150)
$g.FillEllipse((New-Brush $fur), 169, 127, 174, 162)
$g.DrawEllipse((New-Pen $furLine 6), 169, 127, 174, 162)

# eyes
$g.FillEllipse((New-Brush $ink), 207, 186, 23, 28)
$g.FillEllipse((New-Brush $ink), 282, 186, 23, 28)

# nose + smile
$nose = @([System.Drawing.PointF]::new(238, 243), [System.Drawing.PointF]::new(262, 243), [System.Drawing.PointF]::new(250, 258))
$g.FillPolygon((New-Brush $pink), $nose)
$smilePen = New-Pen $ink 8
$smilePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$smilePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawArc($smilePen, 216, 232, 68, 46, 15, 150)

# whiskers
$whiskerPen = New-Pen $ink 5
$whiskerPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$whiskerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($whiskerPen, 165, 220, 100, 212)
$g.DrawLine($whiskerPen, 165, 234, 98, 234)
$g.DrawLine($whiskerPen, 165, 248, 102, 256)
$g.DrawLine($whiskerPen, 347, 220, 412, 212)
$g.DrawLine($whiskerPen, 347, 234, 414, 234)
$g.DrawLine($whiskerPen, 347, 248, 410, 256)

# blush
$g.FillEllipse((New-Brush $blush), 178, 244, 34, 20)
$g.FillEllipse((New-Brush $blush), 300, 244, 34, 20)

$g.Dispose()
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outPath) | Out-Null
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "icon written to $outPath"

