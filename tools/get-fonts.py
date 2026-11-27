"""Downloads the theme fonts from Google Fonts (all under the SIL Open Font License) into fonts/ and writes
src/css/01-fonts.css: two variable .woff2 files per family and style (latin, latin-ext). build.py embeds them.
Run it once when you add a font: add the family to FAMILIES, then:
    python tools/get-fonts.py
The existing files are kept (only missing ones are downloaded)."""
import os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, '..', 'fonts')
CSS_OUT = os.path.join(HERE, '..', 'src', 'css', '01-fonts.css')
# Google Fonts css2 family specs: name, axes. Italic where a theme uses it (em in titles).
FAMILIES = [
    'Bricolage Grotesque:wght@500..800', 'Instrument Sans:wght@400..600', 'JetBrains Mono:wght@500..700',   # Dark, Light, High contrast
    'Fraunces:ital,opsz,wght@0,9..144,400..800;1,9..144,400..800', 'Hanken Grotesk:wght@400..700', 'Spline Sans Mono:wght@500..700',   # Editorial
    'Archivo:wdth,wght@62..125,400..900', 'IBM Plex Mono:wght@500;600',   # Swiss
    'Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700', 'Schibsted Grotesk:wght@400..700', 'Red Hat Mono:wght@500..700',   # Boardroom
    'Epilogue:wght@500..900', 'Literata:opsz,wght@7..72,400..700', 'DM Mono:wght@500',   # Studio
    'Big Shoulders Display:wght@500..900', 'Commissioner:wght@400..700',   # Forest (+ Spline Sans Mono)
    'Red Hat Display:wght@500..900', 'Red Hat Text:wght@400..700',   # Nocturne (+ Red Hat Mono)
]
AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'   # (woff2)


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': AGENT})
    with urllib.request.urlopen(request, timeout=30) as reply:
        return reply.read()


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


faces = ['/* ===========================================================================\n   1. FONTS\n'
         '   Latin and latin-ext variable fonts (SIL Open Font License), one set per theme (themes.json sets\n'
         '   --font-display, --font-body and --font-mono). Written by tools/get-fonts.py; build.py embeds the .woff2 files.\n'
         '   =========================================================================== */']
for family in FAMILIES:
    css = fetch('https://fonts.googleapis.com/css2?family=' + family.replace(' ', '+') + '&display=block').decode('utf-8')
    for subset, block in re.findall(r'/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{[^}]*\})', css):
        if subset not in ('latin', 'latin-ext'):
            continue
        name = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        style = re.search(r'font-style:\s*(\w+)', block).group(1)
        weight = re.search(r'font-weight:\s*([\d ]+);', block).group(1).strip()
        stretch = re.search(r'font-stretch:\s*([\d% ]+);', block)
        url = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
        ranges = re.search(r'unicode-range:\s*([^;]+);', block).group(1).strip()
        file = slug(name) + ('-italic' if style == 'italic' else '') + '-' + subset + '.woff2'
        path = os.path.join(FONTS, file)
        if not os.path.exists(path):
            data = fetch(url)
            if data[:4] != b'wOF2':
                sys.exit('not a woff2 file: ' + url)
            open(path, 'wb').write(data)
            print('downloaded', file, len(data) // 1024, 'KB')
        faces.append("@font-face { font-family: '%s'; font-style: %s; font-weight: %s;%s font-display: block; src: url(fonts/%s) format('woff2'); unicode-range: %s; }"
                     % (name, style, weight, (' font-stretch: %s;' % stretch.group(1).strip()) if stretch else '', file, ranges))
open(CSS_OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(faces) + '\n')
print(len(faces) - 1, 'font faces in', os.path.normpath(CSS_OUT))
