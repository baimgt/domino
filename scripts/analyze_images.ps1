Add-Type -AssemblyName System.Drawing

function Analyze-Images {
    param (
        [string]$Path = "public"
    )

    $files = Get-ChildItem -Path $Path -Recurse -Include *.jpg, *.jpeg, *.png | Where-Object { $_.Length -gt 300KB }
    $results = @()

    foreach ($file in $files) {
        try {
            $img = [System.Drawing.Image]::FromFile($file.FullName)
            $results += [PSCustomObject]@{
                FullName = $file.FullName
                RelPath  = $file.FullName.Replace((Get-Location).Path + "\", "")
                SizeMB   = [math]::Round($file.Length / 1MB, 2)
                Width    = $img.Width
                Height   = $img.Height
                Format   = $img.RawFormat.ToString()
            }
            $img.Dispose()
        } catch {
            # Skip invalid images
        }
    }

    $results | Sort-Object -Property SizeMB -Descending | Format-Table RelPath, SizeMB, Width, Height
}

Analyze-Images
