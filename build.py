#!/usr/bin/env python3
"""Bundle app.html + css + js into one self-contained file: labscale-standalone.html"""
import re, pathlib
root = pathlib.Path(__file__).parent
html = (root / 'app.html').read_text()
css = (root / 'css/app.css').read_text()
html = re.sub(r'<link rel="stylesheet" href="css/app.css">', lambda m: '<style>' + css + '</style>', html)
def inline(m):
    js = (root / m.group(1)).read_text().replace('</script', '<\\/script')
    return '<script>' + js + '</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline, html)
import base64
svg = base64.b64encode((root / 'favicon.svg').read_bytes()).decode()
uri = 'data:image/svg+xml;base64,' + svg
html = html.replace('src="favicon.svg"', 'src="' + uri + '"').replace('href="favicon.svg"', 'href="' + uri + '"')
html = re.sub(r'<link rel="(icon|apple-touch-icon)" href="(favicon-32|apple-touch-icon)\.png"[^>]*>\n?', '', html)
(root / 'labscale-standalone.html').write_text(html)
print('wrote labscale-standalone.html', len(html), 'bytes')
