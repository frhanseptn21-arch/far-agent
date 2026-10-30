"""Gabungkan src/ menjadi artifact (app.html) dan situs siap deploy (dist/index.html)."""
import pathlib

root = pathlib.Path(__file__).parent
src = root / "src"
css = (src / "styles.css").read_text(encoding="utf-8")
shell = (src / "shell.html").read_text(encoding="utf-8")
data = (src / "data.js").read_text(encoding="utf-8")
app = (src / "app.js").read_text(encoding="utf-8")

head = """<title>far-agent — Ruang Kerja AI Coding Agent</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Ruang kerja ngoding pakai AI: dari ide jadi PRD, chat multi-model, desain UI, dan template codebase.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap">
"""
libs = """<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
"""
body = f"{shell}\n{libs}<script>\n{data}\n{app}\n</script>\n"

# Artifact: tanpa doctype/html/head/body (dibungkus otomatis saat publish)
(root / "app.html").write_text(f"{head}<style>\n{css}\n</style>\n{body}", encoding="utf-8")

# Situs mandiri
dist = root / "dist"
dist.mkdir(exist_ok=True)
(dist / "index.html").write_text(
    "<!doctype html>\n<html lang=\"id\">\n<head>\n<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
    "<meta name=\"theme-color\" content=\"#090e0c\">\n"
    f"{head}<style>\n:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}\n{css}\n</style>\n</head>\n<body>\n{body}</body>\n</html>\n",
    encoding="utf-8"
)
print("ok", len((root / "app.html").read_text(encoding="utf-8")) // 1024, "KB")
