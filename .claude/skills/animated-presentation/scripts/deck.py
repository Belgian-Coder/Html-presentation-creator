#!/usr/bin/env python3
"""deck.py: read, change and check an animated presentation file (one .html) without a browser.

Python 3.8+, no packages. Every change is a precise text splice: the rest of the file stays byte for byte as it was.
Before a write, the old file is kept as <file>.bak (last step) and, once, <file>.orig (before the first change).
The result is validated; a change that would add errors is not written (unless --force).

Usage:  python deck.py <command> <file.html> [arguments] [options]      e.g.  python deck.py show-slide deck.html numbers
Slides are named by their data-name (see `slides`), not by their title.

Read:
  info                         summary: slides, assets, blocks, size
  slides [--json]              the slides in order: number, name, title, time, steps, flags
  show-slide NAME              the slide's HTML (its <section>)
  notes NAME                   its speaker notes (HTML)
  texts [--slide NAME] [--json]  every visible text on the slides (and the texts in alt, aria-label, title
                               attributes and slide titles: [attr] rows), with its slide and place
  templates                    the ready-made slide layouts in the file
  assets [--json]              the embedded images/videos/sounds: name, type, size, used where
  block NAME                   a data block: themes, animations, text-styles, ui-texts, custom-css, custom-js
  validate [--json]            checks the file; exit code 1 when there are errors
Change (in place, <file>.bak kept; --out OTHER.html writes elsewhere; --dry-run shows what would change):
  set-slide NAME attr=value ... [--remove attr ...]   slide settings (data-title, data-estimate, data-skip, ...)
  set-deck attr=value ... [--remove attr ...]         deck settings on <div id="deck"> (data-footer, data-progress-line, ...)
  set-title "TEXT"                                    the browser-tab title (<title>)
  replace-slide NAME --file SECTION.html              the whole slide from a file (one <section class="scene">)
  add-slide (--template T | --file F) [--name N] [--title T] [--after S | --before S | --first]
  duplicate-slide NAME [--name N] [--title T]
  delete-slide NAME
  move-slide NAME (--after S | --before S | --first | --last)
  set-notes NAME (--text "..." | --file F)            speaker notes ("2: text" lights up at click 2)
  replace-text OLD NEW [--slide NAME] [--all]         text only (never tags or attributes)
  add-asset NAME PATH [--replace]                     embed a file (image, video, sound) under NAME
  remove-asset NAME [--force]                         (refused while a slide uses it, unless --force)
  extract-asset NAME OUT                              write an embedded file back to disk
  set-block NAME --file F                             replace a data block (JSON is checked and pretty-printed)
  set-theme-color VAR VALUE [--theme NAME]            one colour of a theme (default: the active one), e.g. color-accent "#e86a92"
  renumber                                            renumber the SLIDE banner comments (done after every change)
"""
import base64
import html
import json
import mimetypes
import os
import re
import shutil
import sys
from html.parser import HTMLParser

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
BLOCKS = {   # short name -> (selector attribute, id, kind)
    'themes': ('deckThemes', 'json'), 'animations': ('deckAnimations', 'json'), 'text-styles': ('deckTextStyles', 'json'),
    'ui-texts': ('deckUiTexts', 'json'), 'assets': ('deckAssets', 'json'), 'custom-css': ('deckCustomCss', 'text'),
    'custom-js': ('deckCustomJs', 'text'),
}
SCRIPTED = {'timeline', 'mindset', 'flow', 'docs', 'product', 'reuse'}   # slides run by their own code (js section 6): layout fixed
NAME_RE = re.compile(r'^[a-z0-9][a-z0-9-]*$')
ALLOWED_MEDIA = re.compile(r'^data:(image/(png|jpeg|gif|webp|svg\+xml|avif)|video/(mp4|webm|ogg)|audio/(mpeg|mp4|wav|ogg|webm|x-m4a|aac)|font/[a-z0-9-]+|application/(font-woff2?|x-font-[a-z]+));base64,')


# ---------------------------------------------------------------------------------------------- parsing
class Node:
    __slots__ = ('tag', 'attrs', 'start', 'open_end', 'close_start', 'end', 'parent', 'children', 'in_template')

    def __init__(self, tag, attrs, start, open_end, parent, in_template):
        self.tag, self.attrs, self.start, self.open_end = tag, dict(attrs), start, open_end
        self.close_start = self.end = open_end
        self.parent, self.children, self.in_template = parent, [], in_template

    def get(self, name, default=None):
        value = self.attrs.get(name, default)
        return '' if value is None and name in self.attrs else value

    def classes(self):
        return (self.attrs.get('class') or '').split()


class Locator(HTMLParser):
    """Builds an element tree with exact character offsets into the source text."""

    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text = text
        self.line_starts = [0]
        for match in re.finditer('\n', text):
            self.line_starts.append(match.end())
        self.root = Node('#root', {}, 0, 0, None, False)
        self.stack = [self.root]
        self.texts = []      # (start, end, node, text)
        self.comments = []   # (start, end, data)
        self.feed(text)
        self.close()
        for node in self.stack[1:]:   # never closed: ends at the end of the file
            node.close_start = node.end = len(text)

    def _at(self):
        line, column = self.getpos()
        return self.line_starts[line - 1] + column

    def handle_starttag(self, tag, attrs):
        start = self._at()
        raw = self.get_starttag_text() or ''
        parent = self.stack[-1]
        node = Node(tag, attrs, start, start + len(raw), parent, parent.in_template or parent.tag == 'template')
        parent.children.append(node)
        if tag not in VOID and not raw.endswith('/>'):
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack[-1].tag == tag and self.stack[-1].start == self._at():
            self.stack.pop()

    def handle_endtag(self, tag):
        start = self._at()
        end = self.text.index('>', start) + 1
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                for node in self.stack[index:]:
                    node.close_start, node.end = start, end
                del self.stack[index:]
                return

    def handle_data(self, data):
        if data.strip():
            start = self._at()
            self.texts.append((start, start + len(self.text[start:start + len(data)]), self.stack[-1], data))

    def handle_comment(self, data):
        start = self._at()
        self.comments.append((start, self.text.index('-->', start) + 3, data))


def walk(node):
    for child in node.children:
        yield child
        yield from walk(child)


class Deck:
    def __init__(self, path):
        self.path = path
        with open(path, encoding='utf-8', newline='') as handle:
            self.text = handle.read()
        self.parse()

    def parse(self):
        self.nl = '\r\n' if '\r\n' in self.text[:200000] else '\n'   # (the file's own line ends are kept)
        self.tree = Locator(self.text)
        self.nodes = list(walk(self.tree.root))
        self.stage = next((n for n in self.nodes if n.get('id') == 'stage' and not n.in_template), None)

    # -- finding
    def slides(self):
        if not self.stage:
            return []
        return [n for n in self.stage.children if n.tag == 'section' and 'scene' in n.classes()]

    def slide(self, name):
        found = [s for s in self.slides() if s.get('data-name') == name]
        if not found:
            raise SystemExit('No slide named "%s". Slides: %s' % (name, ', '.join(s.get('data-name') or '?' for s in self.slides())))
        return found[0]

    def templates(self):
        template = next((n for n in self.nodes if n.tag == 'template' and n.get('id') == 'slideTemplates'), None)
        return [n for n in walk(template) if n.tag == 'section' and 'scene' in n.classes()] if template else []

    def block(self, short):
        if short not in BLOCKS:
            raise SystemExit('Unknown block "%s". Blocks: %s' % (short, ', '.join(BLOCKS)))
        element_id = BLOCKS[short][0]
        node = next((n for n in self.nodes if n.get('id') == element_id and n.tag in ('script', 'style') and not n.in_template), None)
        if not node:
            raise SystemExit('The file has no %s block (id="%s").' % (short, element_id))
        return node

    def block_text(self, short):
        node = self.block(short)
        return self.text[node.open_end:node.close_start]

    def block_json(self, short):
        raw = self.block_text(short).strip() or '{}'
        return json.loads(raw)

    def outer(self, node):
        return self.text[node.start:node.end]

    def inner(self, node):
        return self.text[node.open_end:node.close_start]

    def banner_of(self, slide):
        """The SLIDE banner comment right before a slide (only whitespace between), as (start, end) or None."""
        before = self.text[:slide.start]
        stripped = before.rstrip()
        if not stripped.endswith('-->'):
            return None
        begin = stripped.rfind('<!--')
        if begin < 0 or 'SLIDE' not in stripped[begin:begin + 120]:
            return None
        return begin, len(stripped)

    def core_start(self, slide):
        """Where a slide begins with its SLIDE banner comment."""
        banner = self.banner_of(slide)
        return banner[0] if banner else slide.start

    def unit_span(self, slide):
        """The slide with its banner and all the blank space before them: what goes when it is taken out."""
        start = self.core_start(slide)
        while start > 0 and self.text[start - 1] in ' \t\r\n':
            start -= 1
        return start, slide.end

    # -- assets
    def assets(self):
        try:
            return self.block_json('assets')
        except SystemExit:
            return {}

    def asset_uses(self):
        """asset name -> list of slide names (or 'deck') that use it."""
        uses = {}
        for node in self.nodes:
            for name, value in node.attrs.items():
                if name == 'data-asset' or name.startswith('data-asset-'):
                    if value:
                        slide = None if node.in_template else self.slide_of(node)
                        uses.setdefault(value, []).append('template' if node.in_template else slide.get('data-name') if slide else 'deck')
        for match in re.finditer(r'asset:([A-Za-z0-9_./-]+)', self.text):   # in custom CSS: url(asset:name)
            uses.setdefault(match.group(1), []).append('css')
        return uses

    def slide_of(self, node):
        while node is not None and node is not self.tree.root:
            if node.tag == 'section' and 'scene' in node.classes() and node.parent is self.stage:
                return node
            node = node.parent
        return None


# ---------------------------------------------------------------------------------------------- writing
class Edit:
    """Collects splices, applies them from the end, renumbers the banners, validates, writes."""

    def __init__(self, deck, args):
        self.deck, self.args = deck, args
        self.splices = []

    def replace(self, start, end, new):
        self.splices.append((start, end, new))

    def result(self):
        text = self.deck.text
        for start, end, new in sorted(self.splices, key=lambda s: (s[0], s[1]), reverse=True):
            text = text[:start] + new + text[end:]
        return text

    def commit(self, message):
        text = renumber_banners(self.result())
        out = self.args.get('--out') or self.deck.path
        if self.args.get('--dry-run'):
            print('(dry run) ' + message + ' — nothing written.')
            return
        candidate = Deck.__new__(Deck)
        candidate.path, candidate.text = out, text
        candidate.parse()
        errors, warnings = validate(candidate)
        new_errors = [e for e in errors if e not in validate(self.deck)[0]]
        if new_errors and not self.args.get('--force'):
            print('Not written: the change would add these errors (use --force to write anyway):')
            for error in new_errors:
                print('  ERROR ' + error)
            sys.exit(1)
        if os.path.exists(out):
            if not os.path.exists(out + '.orig'):   # (the file as it was before the first change: kept once, never overwritten)
                shutil.copyfile(out, out + '.orig')
            shutil.copyfile(out, out + '.bak')
        with open(out, 'w', encoding='utf-8', newline='') as handle:
            handle.write(text)
        print(message + '  [written: ' + os.path.basename(out) + ', previous version: ' + os.path.basename(out) + '.bak]')
        for warning in warnings:
            if warning not in validate(self.deck)[1]:
                print('  warning: ' + warning)


def renumber_banners(text):
    deck = Deck.__new__(Deck)
    deck.path, deck.text = '', text
    deck.parse()
    edits = []
    for number, slide in enumerate(deck.slides(), 1):
        banner = deck.banner_of(slide)
        if not banner:
            continue
        old = text[banner[0]:banner[1]]
        lines = old[4:-3].split('\n')
        wanted = 'SLIDE %02d · %s' % (number, slide.get('data-name') or '?')
        if re.search(r'SLIDE \d+ · [^\s=]+', lines[0]):   # only the number and name change (a note after them stays)
            lines[0] = re.sub(r'SLIDE \d+ · [^\s=]+', wanted, lines[0], count=1)
        else:
            lines[0] = ' ==================== %s ====================%s' % (wanted, ' ' if len(lines) == 1 else '') + ('\r' if lines[0].endswith('\r') else '')
        new = '<!--' + '\n'.join(lines) + '-->'
        if new != old:
            edits.append((banner[0], banner[1], new))
    for start, end, new in reversed(edits):
        text = text[:start] + new + text[end:]
    return text


def start_tag_with(deck, node, changes, removals=()):
    """The node's start tag with attributes set (value None: a bare attribute) or removed, keeping the others in place."""
    raw = deck.text[node.start:node.open_end]
    for name in removals:
        raw = re.sub(r'\s' + re.escape(name) + r'(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?(?=[\s/>])', '', raw, count=1)
    for name, value in changes.items():
        piece = name if value is None else '%s="%s"' % (name, html.escape(value, quote=True))
        pattern = re.compile(r'(\s)' + re.escape(name) + r'(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?(?=[\s/>])')
        if pattern.search(raw):
            raw = pattern.sub(lambda m: m.group(1) + piece, raw, count=1)
        else:
            raw = re.sub(r'\s*(/?>)$', lambda m: ' ' + piece + m.group(1), raw, count=1)
    return raw


def unique_name(deck, wanted):
    names = {s.get('data-name') for s in deck.slides()}
    if wanted not in names:
        return wanted
    number = 2
    while '%s-%d' % (wanted, number) in names:
        number += 1
    return '%s-%d' % (wanted, number)


def slugify(text):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', text.lower())).strip('-') or 'slide'


def parse_section(fragment):
    """A fragment that must be exactly one <section class="scene">…</section>; returns its Node and text."""
    fragment = fragment.strip()
    tree = Locator(fragment)
    tops = [n for n in tree.root.children]
    if len(tops) != 1 or tops[0].tag != 'section' or 'scene' not in tops[0].classes():
        raise SystemExit('The file must hold exactly one <section class="scene" …>…</section>.')
    return tops[0], fragment


# ---------------------------------------------------------------------------------------------- validation
def validate(deck):
    errors, warnings = [], []
    if not deck.stage:
        return ['no <div id="stage">: this is not an animated presentation file'], warnings
    slides = deck.slides()
    if not slides:
        errors.append('no slides in #stage')
    names = [s.get('data-name') for s in slides]
    for index, slide in enumerate(slides, 1):
        name = slide.get('data-name')
        where = 'slide %d (%s)' % (index, name or 'no name')
        if not name:
            errors.append(where + ': no data-name')
        elif not NAME_RE.match(name):
            errors.append(where + ': data-name must be lower-case letters, digits and dashes')
        elif names.count(name) > 1:
            errors.append(where + ': data-name "%s" is used by %d slides' % (name, names.count(name)))
        if not slide.get('data-title'):
            warnings.append(where + ': no data-title (the chapter bar shows the name)')
        for attribute, kind in (('data-estimate', float), ('data-steps', int), ('data-advance', float)):
            value = slide.get(attribute)
            if value not in (None, ''):
                try:
                    if kind(value) < 0:
                        raise ValueError
                except ValueError:
                    errors.append(where + ': %s="%s" is not a number' % (attribute, value))
        if slide.end == len(deck.text) and not deck.text[slide.start:].rstrip().endswith('</section>'):
            errors.append(where + ': the <section> is never closed')
        for node in walk(slide):
            if node.tag == 'script' and node.get('type') != 'text/plain':
                errors.append(where + ': a <script> inside a slide runs at once; slide code goes in <script type="text/plain" data-slide-js>')
            if node.tag == 'section' and 'scene' in node.classes():
                errors.append(where + ': a slide inside a slide (a <section class="scene"> was not closed?)')
    # what only exists while the page runs (written by hand it doubles or breaks), and unsafe markup
    runtime_classes = {'slide-footer', 'deck-progress', 'split-part', 'split-word', 'is-editor-selected', 'is-sample-text', 'chart-drawing'}
    state_classes = {'is-active', 'is-visible', 'is-leaving', 'is-playing', 'is-finished', 'is-returning', 'is-revealed', 'is-dimmed'}
    for slide in slides:
        where = 'slide ' + (slide.get('data-name') or '?')
        if set(slide.classes()) & state_classes:
            warnings.append(where + ': has a state class (%s) that only the running page sets' % ', '.join(sorted(set(slide.classes()) & state_classes)))
        for node in walk(slide):
            found = set(node.classes()) & runtime_classes
            if found:
                warnings.append(where + ': <%s class="%s"> is made while the page runs; remove it (it would be there twice)' % (node.tag, ' '.join(sorted(found))))
            if 'contenteditable' in node.attrs or 'data-editor-wrap' in node.attrs:
                warnings.append(where + ': editor canvas markup (contenteditable / data-editor-wrap) left in the slide')
            for name, value in node.attrs.items():
                if name.startswith('on'):
                    errors.append(where + ': <%s %s=…>: event attributes are not allowed (the editor strips them)' % (node.tag, name))
                if value and isinstance(value, str) and value.strip().lower().startswith('javascript:'):
                    errors.append(where + ': <%s %s="javascript:…"> is not allowed' % (node.tag, name))
            if node.tag in ('iframe', 'object', 'embed', 'base', 'meta', 'link', 'noscript'):
                errors.append(where + ': <%s> is not allowed in a slide' % node.tag)
            if 'reveal' in node.classes() and node.get('data-reveal-step') is not None:
                warnings.append(where + ': an element with class "reveal" and data-reveal-step: its entrance fights the click reveal (use one)')
            if node.get('data-asset') and (node.get('src') or '').startswith('data:'):
                warnings.append(where + ': <%s data-asset> also has src="data:…" (overwritten at load; use the asset only)' % node.tag)
            if node.tag == 'aside' and 'speaker-notes' in node.classes() and node.parent is not slide:
                warnings.append(where + ': the speaker notes must be a direct child of the <section>')
    for kind in ('EDITOR', 'PRESENTER'):
        starts = len(re.findall(r'/\* ' + kind + r'-ONLY-START|<!-- ' + kind + r'-ONLY-START -->', deck.text))   # (the marks the exports cut)
        ends = len(re.findall(kind + r'-ONLY-END \*/|<!-- ' + kind + r'-ONLY-END -->', deck.text))
        if starts != ends:
            warnings.append('%s-ONLY marks: %d START and %d END (a pair was broken: the exports without %s cut the wrong part)' % (kind, starts, ends, kind.lower()))
    for element_id in ('deck', 'stage'):
        if not any(n.get('id') == element_id for n in deck.nodes):
            errors.append('no element with id="%s": the presentation cannot start' % element_id)
    # links between slides
    for node in deck.nodes:
        if node.in_template:
            continue
        for attribute in ('data-goto', 'data-until'):
            target = node.get(attribute)
            if target and target not in names:
                slide = deck.slide_of(node)
                errors.append('%s: %s="%s" points to no slide' % ((slide.get('data-name') if slide else 'deck'), attribute, target))
    # ids
    seen = {}
    for node in deck.nodes:
        element_id = node.get('id')
        if element_id and not node.in_template:
            seen[element_id] = seen.get(element_id, 0) + 1
    for element_id, count in seen.items():
        if count > 1:
            errors.append('id="%s" is used %d times (ids must be unique)' % (element_id, count))
    # data blocks
    for short, (element_id, kind) in BLOCKS.items():
        node = next((n for n in deck.nodes if n.get('id') == element_id and n.tag in ('script', 'style') and not n.in_template), None)
        if not node:
            (warnings if short in ('custom-css', 'custom-js', 'text-styles') else errors).append('no %s block (id="%s")' % (short, element_id))
            continue
        if kind == 'json':
            try:
                value = json.loads(deck.inner(node).strip() or '{}')
                if not isinstance(value, dict):
                    errors.append('%s block: must be a JSON object' % short)
                elif short == 'themes' and not isinstance(value.get('themes'), dict):
                    errors.append('themes block: needs "themes": { name: {...} }')
                elif short == 'themes' and value.get('active') and value['active'] not in value['themes']:
                    errors.append('themes block: "active" names a theme that is not in "themes"')
            except ValueError as error:
                errors.append('%s block: not valid JSON (%s)' % (short, error))
        if '</script' in deck.inner(node).lower() and node.tag == 'script':
            errors.append('%s block: contains "</script", which ends the block early' % short)
    # assets
    assets = deck.assets()
    for name, value in assets.items():
        if not isinstance(value, str) or not ALLOWED_MEDIA.match(value):
            errors.append('asset "%s": not a base64 data: URL of an image, video, sound or font' % name)
        elif len(value) * 3 / 4 > 8 * 1024 * 1024:
            warnings.append('asset "%s" is %.0f MB: the file opens and saves slowly (make it smaller)' % (name, len(value) * 3 / 4 / 1048576))
    uses = deck.asset_uses()
    for name, where in uses.items():
        if name not in assets and not name.startswith(('data:', 'blob:')):
            errors.append('asset "%s" is used (%s) but not in the assets block' % (name, ', '.join(sorted(set(where)))))
    for name in assets:
        if name not in uses and not name.startswith('font'):
            warnings.append('asset "%s" is not used by any slide (it only makes the file bigger)' % name)
    # offline: nothing loaded from the internet
    for node in deck.nodes:
        for attribute in ('src', 'href'):
            value = node.get(attribute) or ''
            if re.match(r'^(https?:)?//', value) and node.tag in ('script', 'link', 'img', 'video', 'audio', 'source', 'iframe'):
                errors.append('<%s %s="%s">: loaded from the internet; the file must work offline (embed it as an asset)' % (node.tag, attribute, value[:80]))
    for match in re.finditer(r'@import\s+url\(\s*[\'"]?https?:|url\(\s*[\'"]?https?:', deck.text):
        warnings.append('CSS loads something from the internet near character %d (it will be missing offline)' % match.start())
    size = len(deck.text.encode('utf-8'))
    if size > 60 * 1024 * 1024:
        warnings.append('the file is %.0f MB: large files open slowly and browsers may refuse to keep a draft' % (size / 1048576))
    return errors, warnings


# ---------------------------------------------------------------------------------------------- commands
def text_of(deck, node):
    parts = []
    for start, end, owner, data in deck.tree.texts:
        if node.start <= start < node.end:
            parts.append(data)
    return ' '.join(' '.join(parts).split())


def clicks_of(deck, slide):
    """How many clicks a slide takes: its data-steps, or its highest data-reveal-step if that is more (as the page counts)."""
    steps = [int(v) for v in re.findall(r'data-reveal-step="(\d+)"', deck.outer(slide))]
    declared = slide.get('data-steps')
    return max([int(declared) if declared and declared.isdigit() else 0] + steps)


def slide_row(deck, index, slide):
    flags = [flag for flag in ('data-skip', 'data-backup', 'data-hide-logo', 'data-end-state') if slide.get(flag) is not None]
    return {'number': index, 'name': slide.get('data-name'), 'title': slide.get('data-title'), 'estimate': slide.get('data-estimate'),
            'steps': str(clicks_of(deck, slide) or '') or None, 'transition': slide.get('data-transition'), 'flags': [f[5:] for f in flags],
            'own_script': any(n.tag == 'script' for n in walk(slide)), 'words': len(text_of(deck, slide).split())}


def option(args, name, default=None):
    return args.get(name, default)


def parse_args(argv):
    positional, options = [], {}
    index = 0
    while index < len(argv):
        item = argv[index]
        if item.startswith('--'):
            if item in ('--json', '--dry-run', '--force', '--all', '--replace', '--first', '--last'):
                options[item] = True
            elif item == '--remove':
                options.setdefault('--remove', [])
                while index + 1 < len(argv) and not argv[index + 1].startswith('--'):
                    index += 1
                    options['--remove'].append(argv[index])
            else:
                index += 1
                if index >= len(argv):
                    raise SystemExit(item + ' needs a value')
                options[item] = argv[index]
        else:
            positional.append(item)
        index += 1
    return positional, options


def read_input(options):
    if '--file' in options:
        with open(options['--file'], encoding='utf-8') as handle:
            return handle.read()
    if '--text' in options:
        return options['--text']
    raise SystemExit('Give --file F or --text "…".')


def insert_point(deck, options):
    """Where a slide goes: (offset, 'after' or 'before'): after a slide (default: the last) or before one (or the first)."""
    slides = deck.slides()
    if '--after' in options:
        return deck.slide(options['--after']).end, 'after'
    if '--before' in options:
        return deck.core_start(deck.slide(options['--before'])), 'before'
    if options.get('--first') and slides:
        return deck.core_start(slides[0]), 'before'
    return (slides[-1].end, 'after') if slides else (deck.stage.open_end, 'after')


def placed(core, side, nl='\n'):
    """A slide (banner + section) laid out like the others: a blank line between slides, two spaces in."""
    return nl + nl + '  ' + core if side == 'after' else core + nl + nl + '  '


def new_unit(section_text, name, nl='\n'):
    section_text = re.sub(r'\r?\n', nl, section_text.strip())
    return '<!-- ==================== SLIDE 00 · %s ==================== -->%s  %s' % (name, nl, section_text)


def main(argv):
    for stream in (sys.stdout, sys.stderr):   # (Windows consoles: arrows, quotes and accents print too)
        try:
            stream.reconfigure(encoding='utf-8')
        except (AttributeError, ValueError):
            pass
    if not argv or argv[0] in ('help', '-h', '--help'):
        print(__doc__)
        return 0
    command = argv[0]
    positional, options = parse_args(argv[1:])
    if not positional:
        raise SystemExit('Give the presentation file: python deck.py %s <file.html> …' % command)
    deck = Deck(positional[0])
    rest = positional[1:]

    if command == 'info':
        slides = deck.slides()
        assets = deck.assets()
        print('%s: %.1f MB, %d slides, %d templates, %d assets' % (deck.path, len(deck.text.encode('utf-8')) / 1048576, len(slides), len(deck.templates()), len(assets)))
        themes = deck.block_json('themes')
        print('theme: %s (of %s)' % (themes.get('active'), ', '.join(themes.get('themes', {}))))
        for short in ('animations', 'text-styles'):
            try:
                print('%s: %s' % (short, ', '.join(deck.block_json(short)) or '(none)'))
            except SystemExit:
                pass
        for short in ('custom-css', 'custom-js'):
            try:
                print('%s: %d characters' % (short, len(deck.block_text(short).strip())))
            except SystemExit:
                pass
        deck_node = next((n for n in deck.nodes if n.get('id') == 'deck'), None)
        if deck_node:
            print('deck settings: ' + ' '.join('%s="%s"' % (k, v) for k, v in deck_node.attrs.items() if k.startswith('data-')))
        total = sum(float(s.get('data-estimate') or 0) for s in slides if s.get('data-backup') is None)
        print('planned time: %d:%02d' % (total // 60, total % 60))
        errors, warnings = validate(deck)
        print('validate: %d errors, %d warnings (python deck.py validate %s)' % (len(errors), len(warnings), deck.path))
        return 0

    if command == 'slides':
        rows = [slide_row(deck, i, s) for i, s in enumerate(deck.slides(), 1)]
        if options.get('--json'):
            print(json.dumps(rows, indent=1, ensure_ascii=False))
        else:
            for row in rows:
                print('%2d  %-14s %-36s %5ss %s%s%s' % (row['number'], row['name'], (row['title'] or '')[:36], row['estimate'] or '-',
                      ('clicks=' + row['steps'] + ' ') if row['steps'] else '', ' '.join(row['flags']), ' [own script]' if row['own_script'] else ''))
        return 0

    if command == 'show-slide':
        print(deck.outer(deck.slide(rest[0])))
        return 0

    if command == 'notes':
        aside = next((n for n in deck.slide(rest[0]).children if n.tag == 'aside' and 'speaker-notes' in n.classes()), None)
        print(deck.inner(aside).strip() or '(no speaker notes)' if aside else '(no speaker notes)')
        return 0

    if command == 'templates':
        for template in deck.templates():
            print('%-28s %s' % ((template.get('data-name') or '').replace('template-', ''), (template.get('data-title') or '').replace('Template: ', '')))
        return 0

    if command == 'texts':
        rows = []
        targets = [deck.slide(options['--slide'])] if '--slide' in options else deck.slides()
        for slide in targets:
            for start, end, owner, data in deck.tree.texts:
                if slide.start <= start < slide.end and owner.tag not in ('script', 'style'):
                    in_notes = any(p.tag == 'aside' and 'speaker-notes' in p.classes() for p in ancestors(owner))
                    rows.append({'slide': slide.get('data-name'), 'tag': owner.tag, 'class': owner.get('class') or '', 'notes': in_notes, 'text': ' '.join(html.unescape(data).split())})
            rows.append({'slide': slide.get('data-name'), 'tag': '[attr] data-title', 'class': '', 'notes': False, 'text': slide.get('data-title') or ''})
            for node in walk(slide):
                for attribute in ('alt', 'aria-label', 'title', 'data-caption'):
                    if node.get(attribute):
                        rows.append({'slide': slide.get('data-name'), 'tag': '[attr] %s on <%s>' % (attribute, node.tag), 'class': node.get('class') or '', 'notes': False, 'text': node.get(attribute)})
        if options.get('--json'):
            print(json.dumps(rows, indent=1, ensure_ascii=False))
        else:
            for row in rows:
                print('%-12s %-14s %s%s' % (row['slide'], row['tag'] + ('.' + row['class'].split()[0] if row['class'] else ''), '[notes] ' if row['notes'] else '', row['text']))
        return 0

    if command == 'assets':
        assets, uses = deck.assets(), deck.asset_uses()
        rows = [{'name': name, 'type': value.split(';')[0][5:] if isinstance(value, str) else '?', 'kb': round(len(value) * 3 / 4 / 1024), 'used_by': sorted(set(uses.get(name, [])))} for name, value in assets.items()]
        if options.get('--json'):
            print(json.dumps(rows, indent=1))
        else:
            for row in rows:
                print('%-28s %-16s %7d KB  %s' % (row['name'], row['type'], row['kb'], ', '.join(row['used_by']) or 'NOT USED'))
        return 0

    if command == 'block':
        short = rest[0]
        if BLOCKS.get(short, (None, None))[1] == 'json' and short != 'assets':
            print(json.dumps(deck.block_json(short), indent=2, ensure_ascii=False))
        elif short == 'assets':
            print(json.dumps({k: v[:60] + '…' for k, v in deck.assets().items()}, indent=1))
        else:
            print(deck.block_text(short))
        return 0

    if command == 'validate':
        errors, warnings = validate(deck)
        if options.get('--json'):
            print(json.dumps({'errors': errors, 'warnings': warnings}, indent=1, ensure_ascii=False))
        else:
            for error in errors:
                print('ERROR   ' + error)
            for warning in warnings:
                print('warning ' + warning)
            print('%s: %d errors, %d warnings' % (deck.path, len(errors), len(warnings)))
        return 1 if errors else 0

    if command == 'extract-asset':
        value = deck.assets().get(rest[0])
        if not value:
            raise SystemExit('No asset "%s".' % rest[0])
        with open(rest[1], 'wb') as handle:
            handle.write(base64.b64decode(value.split(',', 1)[1]))
        print('wrote ' + rest[1])
        return 0

    # ---- changes
    edit = Edit(deck, options)

    if command == 'set-slide':
        slide = deck.slide(rest[0])
        changes = {}
        for pair in rest[1:]:
            name, _, value = pair.partition('=')
            if name == 'data-name' and not NAME_RE.match(value):
                raise SystemExit('data-name: lower-case letters, digits and dashes only.')
            changes[name] = value if '=' in pair else None
        old_name = slide.get('data-name')
        edit.replace(slide.start, slide.open_end, start_tag_with(deck, slide, changes, options.get('--remove', [])))
        if 'data-name' in changes and old_name in SCRIPTED:
            raise SystemExit('"%s" is run by its own code, which finds it by this name: keep its data-name.' % old_name)
        if 'data-name' in changes and changes['data-name'] != old_name:   # links follow (as in the editor)
            for node in deck.nodes:
                for attribute in ('data-goto', 'data-until'):
                    if node.get(attribute) == old_name and node is not slide:
                        edit.replace(node.start, node.open_end, start_tag_with(deck, node, {attribute: changes['data-name']}))
        edit.commit('slide "%s": %s' % (rest[0], ', '.join(rest[1:] + ['-' + r for r in options.get('--remove', [])])))
        return 0

    if command == 'set-deck':
        node = next((n for n in deck.nodes if n.get('id') == 'deck' and not n.in_template), None)
        if not node:
            raise SystemExit('No <div id="deck">.')
        changes = {}
        for pair in rest:
            name, _, value = pair.partition('=')
            if name in ('id', 'class'):
                raise SystemExit('Keep id and class of #deck as they are.')
            changes[name] = value if '=' in pair else None
        edit.replace(node.start, node.open_end, start_tag_with(deck, node, changes, options.get('--remove', [])))
        edit.commit('deck: ' + ', '.join(rest + ['-' + r for r in options.get('--remove', [])]))
        return 0

    if command == 'set-title':
        node = next((n for n in deck.nodes if n.tag == 'title'), None)
        if not node:
            raise SystemExit('No <title>.')
        edit.replace(node.open_end, node.close_start, html.escape(rest[0], quote=False))
        edit.commit('title: ' + rest[0])
        return 0

    if command == 'replace-slide':
        slide = deck.slide(rest[0])
        node, fragment = parse_section(read_input(options))
        fragment = re.sub(r'\r?\n', deck.nl, fragment)   # (the file's own line ends, whatever the fragment had)
        edit.replace(slide.start, slide.end, fragment)
        edit.commit('slide "%s" replaced' % rest[0])
        return 0

    if command in ('add-slide', 'duplicate-slide'):
        if command == 'duplicate-slide':
            source = deck.slide(rest[0])
            if rest[0] in SCRIPTED:
                raise SystemExit('"%s" is run by its own code (its layout is fixed): it cannot be copied. Use a template instead (templates).' % rest[0])
            fragment = deck.outer(source)
            base = options.get('--name') or source.get('data-name')
        elif '--template' in options:
            wanted = options['--template']
            source = next((t for t in deck.templates() if t.get('data-name') in (wanted, 'template-' + wanted)), None)
            if not source:
                raise SystemExit('No template "%s". Templates: %s' % (wanted, ', '.join((t.get('data-name') or '').replace('template-', '') for t in deck.templates())))
            fragment = deck.outer(source)
            base = options.get('--name') or slugify(options.get('--title') or wanted)
        else:
            source, fragment = parse_section(read_input(options))
            base = options.get('--name') or source.get('data-name') or slugify(options.get('--title') or 'slide')
        node, fragment = parse_section(fragment)
        name = unique_name(deck, slugify(base))
        changes = {'data-name': name}
        title = options.get('--title') or (node.get('data-title') or '').replace('Template: ', '')
        if title:
            changes['data-title'] = title
        tag_end = node.open_end
        fragment = start_tag_with_text(fragment[:tag_end], changes) + fragment[tag_end:]
        fragment = re.sub(r'(<[a-zA-Z][^<>]*?)\sid="[^"]*"', r'\1', fragment)   # (ids must stay unique: a copy has none, as in the editor)
        fragment = re.sub(r'\sdata-category="[^"]*"', '', fragment)   # (only the layouts in + Slide have a category)
        fragment = re.sub(r'\sdata-morph="[^"]*"', '', fragment) if command == 'duplicate-slide' and '--keep-morph' not in options else fragment
        at, side = insert_point(deck, options) if (options.keys() & {'--after', '--before', '--first', '--last'}) or command == 'add-slide' else (deck.slide(rest[0]).end, 'after')
        edit.replace(at, at, placed(new_unit(fragment, name, deck.nl), side, deck.nl))
        edit.commit('slide "%s" added' % name)
        return 0

    if command == 'delete-slide':
        slide = deck.slide(rest[0])
        if len(deck.slides()) == 1:
            raise SystemExit('The last slide cannot go.')
        start, end = deck.unit_span(slide)
        edit.replace(start, end, '')
        edit.commit('slide "%s" deleted' % rest[0])
        return 0

    if command == 'move-slide':
        slide = deck.slide(rest[0])
        start, end = deck.unit_span(slide)
        core = deck.text[deck.core_start(slide):end]
        at, side = insert_point(deck, options)
        if start <= at <= end:
            print('Already there.')
            return 0
        edit.replace(start, end, '')
        edit.replace(at, at, placed(core, side, deck.nl))
        edit.commit('slide "%s" moved' % rest[0])
        return 0

    if command == 'set-notes':
        slide = deck.slide(rest[0])
        value = read_input(options)
        if '<' not in value:   # plain text: one paragraph per line; "2: text" lights up at click 2 (as the editor writes it)
            paragraphs = []
            for line in value.splitlines():
                line = line.strip()
                step = re.match(r'^(\d+):\s*(.*)$', line)
                if step:
                    paragraphs.append('<p data-note-step="%s">%s</p>' % (step.group(1), html.escape(step.group(2))))
                elif line:
                    paragraphs.append('<p>%s</p>' % html.escape(line))
            value = ''.join(paragraphs)
        aside = next((n for n in slide.children if n.tag == 'aside' and 'speaker-notes' in n.classes()), None)
        if aside and not value.strip():   # empty notes: no aside (as the editor does)
            start = aside.start
            while start > 0 and deck.text[start - 1] in ' \t':
                start -= 1
            edit.replace(start, aside.end, '')
        elif aside:
            edit.replace(aside.open_end, aside.close_start, value)
        else:
            edit.replace(slide.close_start, slide.close_start, '  <aside class="speaker-notes">%s</aside>\n  ' % value)
        edit.commit('speaker notes of "%s" set' % rest[0])
        return 0

    if command == 'replace-text':
        old, new = rest[0], rest[1]
        targets = [deck.slide(options['--slide'])] if '--slide' in options else deck.slides()
        count = 0
        for slide in targets:
            for start, end, owner, data in deck.tree.texts:
                if not (slide.start <= start < slide.end) or owner.tag in ('script', 'style'):
                    continue
                raw = deck.text[start:end]
                escaped_old = html.escape(old, quote=False)
                if escaped_old in raw:
                    times = raw.count(escaped_old) if options.get('--all') else 1
                    edit.replace(start, end, raw.replace(escaped_old, html.escape(new, quote=False), times))
                    count += times
                    if not options.get('--all'):
                        break
            if count and not options.get('--all'):
                break
        if not count:
            raise SystemExit('"%s" not found in the slides%s (a text split by tags, e.g. <span>, is not one text: change it with show-slide / replace-slide).' % (old, ' of ' + options['--slide'] if '--slide' in options else ''))
        edit.commit('%d× "%s" → "%s"' % (count, old, new))
        return 0

    if command in ('add-asset', 'remove-asset'):
        node = deck.block('assets')
        assets = deck.assets()
        name = rest[0]
        if command == 'add-asset':
            if name in assets and not options.get('--replace'):
                raise SystemExit('Asset "%s" exists: add --replace to replace it.' % name)
            mime = mimetypes.guess_type(rest[1])[0] or ''
            if rest[1].lower().endswith('.webm'):
                mime = 'video/webm'
            if rest[1].lower().endswith('.m4a'):
                mime = 'audio/mp4'
            with open(rest[1], 'rb') as handle:
                data = 'data:%s;base64,%s' % (mime, base64.b64encode(handle.read()).decode('ascii'))
            if not ALLOWED_MEDIA.match(data):
                raise SystemExit('"%s" (%s) is not an image, video, sound or font the presentation can show.' % (rest[1], mime or 'unknown type'))
            assets[name] = data
        else:
            if name not in assets:
                raise SystemExit('No asset "%s".' % name)
            if deck.asset_uses().get(name) and not options.get('--force'):
                raise SystemExit('Asset "%s" is used by %s: change those first, or add --force.' % (name, ', '.join(sorted(set(deck.asset_uses()[name])))))
            del assets[name]
        body = '{\n' + ',\n'.join('  %s: %s' % (json.dumps(k), json.dumps(v)) for k, v in assets.items()) + '\n}'
        edit.replace(node.open_end, node.close_start, '\n' + body + '\n')
        edit.commit('asset "%s" %s' % (name, 'added' if command == 'add-asset' else 'removed'))
        if command == 'add-asset':
            print('Use it with data-asset="%s" (an <img> or <video>), or data-asset-background="%s" on a slide.' % (name, name))
        return 0

    if command == 'set-block':
        short = rest[0]
        node = deck.block(short)
        value = read_input(options)
        if BLOCKS[short][1] == 'json':
            try:
                value = json.dumps(json.loads(value), indent=2, ensure_ascii=False)
            except ValueError as error:
                raise SystemExit('Not valid JSON: %s' % error)
        if '</script' in value.lower() or '</style' in value.lower():
            raise SystemExit('The block may not contain "</script" or "</style".')
        edit.replace(node.open_end, node.close_start, '\n' + value.strip('\n') + '\n')
        edit.commit('block "%s" replaced' % short)
        return 0

    if command == 'set-theme-color':
        node = deck.block('themes')
        themes = deck.block_json('themes')
        name = options.get('--theme') or themes.get('active')
        if name not in themes.get('themes', {}):
            raise SystemExit('No theme "%s". Themes: %s' % (name, ', '.join(themes.get('themes', {}))))
        known_options = {'--theme', '--out', '--dry-run', '--force'}
        dashed = [k for k in options if k not in known_options]   # (written as --color-accent VALUE: read as an option)
        variable, value = (dashed[0], options[dashed[0]]) if not rest and dashed else (rest[0], rest[1])
        if not variable.startswith('--'):
            variable = '--' + variable
        known = themes['themes'][name]
        if variable not in known:
            print('note: %s is new in theme "%s" (it has: %s)' % (variable, name, ', '.join(k for k in known if k.startswith('--'))))
        known[variable] = value
        edit.replace(node.open_end, node.close_start, '\n' + json.dumps(themes, indent=2, ensure_ascii=False) + '\n')
        edit.commit('theme "%s": %s = %s' % (name, variable, value))
        return 0

    if command == 'renumber':
        edit.commit('banners renumbered')
        return 0

    raise SystemExit('Unknown command "%s" (python deck.py help).' % command)


def ancestors(node):
    while node is not None:
        yield node
        node = node.parent


def start_tag_with_text(raw_tag, changes):
    fake = Node('x', {}, 0, len(raw_tag), None, False)
    holder = Deck.__new__(Deck)
    holder.text = raw_tag
    return start_tag_with(holder, fake, changes)


if __name__ == '__main__':
    try:
        sys.exit(main(sys.argv[1:]))
    except BrokenPipeError:
        pass
    except FileNotFoundError as error:
        sys.exit('File not found: %s (the order is: python deck.py <command> <file.html> …)' % error.filename)
    except IndexError:
        sys.exit('Missing an argument (python deck.py help shows each command with its arguments).')
