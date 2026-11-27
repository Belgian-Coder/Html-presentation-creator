"""Build the presentation from the parts in src/: one HTML file with every image, video and font inside (no network needed).

Optional: the presentation can also be changed in the HTML file itself, with its editor (press E) or by hand.
This script is for developers who keep the source as small files in src/.

Usage (works from any folder):
    python <folder>/build.py                  -> ../Presentation.html (the presentation, next to README.md) + index.html (for web publishing)
    python <folder>/build.py --preview        -> also _preview.html for local checks
    python <folder>/build.py --out <folder>   -> also copy Presentation.html into <folder>
    python <folder>/build.py --joined         -> also _joined.html: the parts joined, images not embedded (to read or diff)
    python <folder>/build.py --without editor            -> also Presentation-without-editor.html
    python <folder>/build.py --without presenter         -> also Presentation-without-presenter.html
    python <folder>/build.py --without editor,presenter  -> also Presentation-slides-only.html (slides only, one screen)

Leaving parts out:
    The editor and the presenter view sit between marks in src/deck.html:  /* EDITOR-ONLY-START ... EDITOR-ONLY-END */
    and /* PRESENTER-ONLY-START ... PRESENTER-ONLY-END */ (in CSS and script; <!-- ... --> in HTML). Everything between
    a pair can be cut out and the rest still works: the shared code asks hasEditor() / hasPresenterView() before it
    calls into them. --without does exactly that (as the editor's File > Export ... does in the browser).

How the parts come together:
    src/deck.html is the outline of the page. A line that only holds  <!-- include: css/01-fonts.css -->
    is replaced by that file from src/ (paths are relative to src/). The parts are not nested: an included
    file cannot include another one. Every file in src/css, src/js, src/slides and src/parts must be
    included once; the build stops when one is missing or included twice, so a new file is never forgotten.

Images and videos go in img/ and fonts in fonts/. In <img> and <video> tags, src="img/..." and poster="img/..."
become data-asset="img/..." and the file goes once into the ASSETS block near the end of the file (one file per
line), so the slides stay short and readable; the script puts the files in place when the page opens. Other
src=, href= and url(...) paths (the fonts, a <source> tag) are embedded where they are. File names may contain spaces. The build stops if any
other path into img/ or fonts/ is left (for example srcset or "/img/..."), so the result never needs those folders.
"""
import base64
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPOSITORY = HERE.parent   # Presentation.html is written here, next to README.md
SOURCE_FOLDER = HERE / "src"
OUTLINE_FILE = SOURCE_FOLDER / "deck.html"
PART_FOLDERS = ["css", "js", "slides", "parts"]   # every file in these must be included exactly once
STANDALONE_NAME = "Presentation.html"
MIME_TYPES = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif",
    ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2",
    ".webm": "video/webm", ".mp4": "video/mp4",   # videos are embedded too: keep them short and small
}

# a whole line with only an include comment (spaces in front are allowed)
INCLUDE_LINE = re.compile(r"^[ \t]*<!-- include: ([^\s>]+) -->[ \t]*\r?\n", re.MULTILINE)

# src="img/logo.png", href="./img/icon.png", poster="img/x.jpg", url(fonts/x.woff2), url("img/y.jpg")
ASSET_PATTERNS = [
    re.compile(r'''((?<![\w-])(?:src|href|poster)=|url\(\s*)(["'])(?:\./)?((?:img|fonts)/[^"']+)\2'''),   # quoted (not data-asset-poster=)
    re.compile(r'''(url\(\s*)()(?:\./)?((?:img|fonts)/[^"')\s]+)'''),                              # url(...) without quotes
]
# a file the page would still load from img/ or fonts/ after embedding (e.g. srcset, "../img/...", url(...),
# image-set(...)); checked outside comments and scripts, and without the data-asset attributes
LEFTOVER_PATTERN = re.compile(r'''(?:srcset|src|href|poster)\s*=\s*["']?[^"'>]*?(?:\.{1,2}/)*(?:img|fonts)/[^"'\s)>]+\.\w+|(?:url|image-set)\(\s*["']?(?:\.{1,2}/)*(?:img|fonts)/''', re.IGNORECASE)
DATA_ASSET_ATTRIBUTE = re.compile(r'''(?<![\w-])data-asset(?:-poster|-background)?=(["'])(img/[^"']+)\1''')
# comments and scripts are left alone: a path written in a comment or in the script is not a file to load
SKIPPED_PARTS = re.compile(r"<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?</script>", re.IGNORECASE)


def outside_comments_and_scripts(html: str, transform) -> str:
    """Applies transform to every part of the HTML that is not a comment or a <script>."""
    parts, last = [], 0
    for match in SKIPPED_PARTS.finditer(html):
        parts.append(transform(html[last:match.start()]))
        parts.append(match.group(0))
        last = match.end()
    parts.append(transform(html[last:]))
    return "".join(parts)


def join_parts() -> str:
    """src/deck.html with every include line replaced by the file it names."""
    outline = OUTLINE_FILE.read_text(encoding="utf-8-sig")
    included = []

    def replace(match: re.Match) -> str:
        relative_path = match.group(1).removeprefix("./")
        path = (SOURCE_FOLDER / relative_path).resolve()
        if SOURCE_FOLDER.resolve() not in path.parents or not path.is_file():
            sys.exit(f"build stopped: include not found in src/: {relative_path}")
        if relative_path in included:
            sys.exit(f"build stopped: {relative_path} is included twice")
        included.append(relative_path)
        text = path.read_text(encoding="utf-8-sig")   # -sig: a byte-order mark (some Windows editors add one) is dropped
        if INCLUDE_LINE.search(text):
            sys.exit(f"build stopped: {relative_path} has an include line; only src/deck.html may include files")
        if path.suffix == ".json":
            try:
                json.loads(text)
            except json.JSONDecodeError as error:
                sys.exit(f"build stopped: {relative_path} is not valid JSON (line {error.lineno}, column {error.colno}: {error.msg}). "
                         "Check for a missing comma, an extra comma after the last item, or a quote without a backslash.")
        if path.suffix in (".js", ".json") and re.search(r"</script", text, re.IGNORECASE):
            sys.exit(f"build stopped: {relative_path} contains </script, which would end the script block early")
        return text if text.endswith("\n") else text + "\n"

    html = INCLUDE_LINE.sub(replace, outline)
    if "<!-- include:" in html:
        sys.exit("build stopped: an include comment is not on a line of its own (write it as  <!-- include: folder/file -->)")
    for folder in PART_FOLDERS:
        for path in sorted((SOURCE_FOLDER / folder).glob("*")):
            if path.name.startswith("."):   # hidden files of the system (macOS: .DS_Store)
                continue
            relative_path = path.relative_to(SOURCE_FOLDER).as_posix()
            if path.is_file() and relative_path not in included:
                sys.exit(f"build stopped: src/{relative_path} is not included in src/deck.html")
    print(f"joined {len(included)} parts")
    return html


def data_uri(relative_path: str) -> str:
    """The file as a data: URI, so the HTML needs no separate files."""
    path = HERE / relative_path
    mime = MIME_TYPES.get(path.suffix.lower())
    if mime is None:
        sys.exit(f"build stopped: unsupported file type {path.suffix} ({relative_path})")
    if not path.is_file():
        sys.exit(f"build stopped: file not found: {relative_path}")
    encoded = base64.b64encode(path.read_bytes()).decode()
    return f"data:{mime};base64,{encoded}"


# <img src="img/x.png"> and <video src=... poster=...> in the HTML: the file goes into the ASSETS block once
# and the element points to it with data-asset="img/x.png" (data-asset-poster for a poster). The script
# puts the real src in place when the page opens (JS section 2). The slides then stay short and readable.
MEDIA_TAG = re.compile(r"""<(?:img|video|section)\b(?:[^>"']|"[^"]*"|'[^']*')*>""", re.IGNORECASE)   # a > inside alt="..." does not end the tag; section: data-asset-background
HTML_FILE_ATTRIBUTE = re.compile(r"""(?<![\w-])(src|poster)=(["'])(?:\./)?(img/[^"']+)\2""")
ASSETS_PLACEHOLDER = "<!-- build.py puts the assets here -->"


def move_assets_to_block(html: str, embed: bool) -> str:
    """Points slide images and videos to the ASSETS block and fills it (with embed=False the block stays {})."""
    assets = {}

    def replace(match: re.Match) -> str:
        attribute, quote, relative_path = match.groups()
        if embed and relative_path not in assets:
            assets[relative_path] = data_uri(relative_path)
        suffix = "" if attribute == "src" else "-poster"
        return f"data-asset{suffix}={quote}{relative_path}{quote}"

    def collect_existing(tag: str) -> str:   # data-asset="img/..." written by hand: the file must exist and goes in too
        for match in DATA_ASSET_ATTRIBUTE.finditer(tag):
            path = match.group(2)
            if embed and path not in assets:
                assets[path] = data_uri(path)
        return tag

    html = outside_comments_and_scripts(html, lambda part: MEDIA_TAG.sub(
        lambda tag: collect_existing(HTML_FILE_ATTRIBUTE.sub(replace, tag.group(0))), part))
    if ASSETS_PLACEHOLDER not in html:
        sys.exit('build stopped: the ASSETS block (<script id="deckAssets">) is missing in src/deck.html')
    lines = [f'  {json.dumps(path)}: "{data}"' for path, data in assets.items()]   # one file per line
    block = "{\n" + ",\n".join(lines) + "\n}" if lines else "{}"
    if embed:
        print(f"{len(assets)} images and videos in the ASSETS block")
    return html.replace(ASSETS_PLACEHOLDER, block)


def embed_assets(html: str) -> str:
    def replace(match: re.Match) -> str:
        prefix, quote, relative_path = match.groups()
        return f"{prefix}{quote}{data_uri(relative_path)}{quote}"

    html = move_assets_to_block(html, embed=True)
    counter = [0]

    def embed_part(part: str) -> str:
        for pattern in ASSET_PATTERNS:   # what is left: url(...) in the CSS (the fonts), other src= / href=
            part, found = pattern.subn(replace, part)
            counter[0] += found
        return part

    html = outside_comments_and_scripts(html, embed_part)
    count = counter[0]
    checked = DATA_ASSET_ATTRIBUTE.sub("", SKIPPED_PARTS.sub("", html))
    leftover = LEFTOVER_PATTERN.search(checked)
    if leftover:
        sys.exit(f"build stopped: not embedded: {checked[leftover.start():leftover.start() + 80]}")
    if "fonts.googleapis" in html:
        sys.exit("build stopped: fonts must be embedded, not loaded from Google")
    print(f"embedded {count} fonts")
    return html


def wrap_as_document(body: str) -> str:
    """A complete HTML document around the deck (the artifact host adds this itself)."""
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'
            + body + "</body></html>")


MARKS = {kind: re.compile(r"/\* " + kind + r"-ONLY-START[\s\S]*?" + kind + r"-ONLY-END \*/|<!-- " + kind + r"-ONLY-START -->[\s\S]*?<!-- " + kind + r"-ONLY-END -->")
         for kind in ("EDITOR", "PRESENTER")}
VARIANT_NAMES = {("editor",): "without-editor", ("presenter",): "without-presenter", ("editor", "presenter"): "slides-only"}


def without_parts(html: str, parts: tuple) -> str:
    """The file without the editor and/or the presenter view: their marked parts cut out, the deck told so (its buttons
    hide), the editor's interface texts left out too."""
    for part in parts:
        html, count = MARKS[part.upper()].subn("", html)
        if not count:
            sys.exit(f"--without {part}: no {part.upper()}-ONLY marks found in src/deck.html")
        html = html.replace('id="deck" ', f'id="deck" data-no-{part} ', 1)
    if "editor" in parts:
        html = re.sub(r'\s+data-editor-(?:note|guides)="[^"]*"', "", html)   # notes and guides for the editor stay in the editor's file
        def drop_editor_texts(match: re.Match) -> str:
            table = json.loads(match.group(2))
            kept = {key: value for key, value in table.items() if not re.match(r"(editor|cmd)\.", key)}
            return match.group(1) + "\n" + json.dumps(kept, ensure_ascii=False, indent=2) + "\n" + match.group(3)
        html = re.sub(r'(<script type="application/json" id="deckUiTexts">)([\s\S]*?)(</script>)', drop_editor_texts, html, count=1)
    return html


def main() -> None:
    joined = join_parts()
    if "--joined" in sys.argv:
        # images are not embedded here: they load from img/ next to the file
        (HERE / "_joined.html").write_text(move_assets_to_block(joined, embed=False), encoding="utf-8", newline="\n")
    deck = embed_assets(joined)
    (HERE / "index.html").write_text(deck, encoding="utf-8")
    print(f"index.html: {len(deck) // 1024} KB")

    standalone = wrap_as_document(deck)
    (REPOSITORY / STANDALONE_NAME).write_text(standalone, encoding="utf-8")
    if "--preview" in sys.argv:
        (HERE / "_preview.html").write_text(standalone, encoding="utf-8")
    if "--out" in sys.argv:
        position = sys.argv.index("--out") + 1
        if position >= len(sys.argv):
            sys.exit("--out needs a folder, for example: --out D:/Presentations")
        destination = Path(sys.argv[position]) / STANDALONE_NAME
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(standalone, encoding="utf-8")
        print(f"standalone copy: {destination}")
    if "--without" in sys.argv:
        position = sys.argv.index("--without") + 1
        parts = tuple(sorted(set(sys.argv[position].split(",")))) if position < len(sys.argv) else ()
        if parts not in VARIANT_NAMES:
            sys.exit("--without needs editor, presenter or editor,presenter")
        variant = without_parts(standalone, parts)
        name = STANDALONE_NAME.replace(".html", "-" + VARIANT_NAMES[parts] + ".html")
        folder = Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else HERE   # (with --out: only there)
        (folder / name).write_text(variant, encoding="utf-8")
        print(f"{name}: {len(variant) // 1024} KB")


if __name__ == "__main__":
    main()
