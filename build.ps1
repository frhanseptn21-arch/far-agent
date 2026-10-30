$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

$src = Join-Path $root "src"
$css = [System.IO.File]::ReadAllText((Join-Path $src "styles.css"), [System.Text.Encoding]::UTF8)
$shell = [System.IO.File]::ReadAllText((Join-Path $src "shell.html"), [System.Text.Encoding]::UTF8)
$data = [System.IO.File]::ReadAllText((Join-Path $src "data.js"), [System.Text.Encoding]::UTF8)
$app = [System.IO.File]::ReadAllText((Join-Path $src "app.js"), [System.Text.Encoding]::UTF8)

$head = @'
<title>far-agent — Ruang Kerja AI Coding Agent</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Ruang kerja ngoding pakai AI: dari ide jadi PRD, chat multi-model, desain UI, dan template codebase.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap">
'@

$libs = @'
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
'@

$body = $shell + "`n" + $libs + "<script>`n" + $data + "`n" + $app + "`n</script>`n"

# Artifact: app.html
$appHtml = $head + "<style>`n" + $css + "`n</style>`n" + $body
[System.IO.File]::WriteAllText((Join-Path $root "app.html"), $appHtml, [System.Text.Encoding]::UTF8)

# Situs mandiri dist/index.html
$dist = Join-Path $root "dist"
if (!(Test-Path $dist)) {
    New-Item -ItemType Directory -Path $dist | Out-Null
}

$prefix = @'
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#090e0c">
'@

$distHtml = $prefix + "`n" + $head + "<style>`n:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}`n" + $css + "`n</style>`n</head>`n<body>`n" + $body + "</body>`n</html>`n"

[System.IO.File]::WriteAllText((Join-Path $dist "index.html"), $distHtml, [System.Text.Encoding]::UTF8)

$size = (Get-Item (Join-Path $dist "index.html")).Length
Write-Host "Build selesai! dist/index.html ($([math]::Round($size/1024)) KB)"
