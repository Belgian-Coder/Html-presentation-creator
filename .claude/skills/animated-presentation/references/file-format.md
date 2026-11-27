# Presentation: anatomy of the saved HTML file

Reference for editing the single-file presentation (`Presentation.html` or a copy saved by its editor) directly, without the editor UI. Verified against `src/` (deck.html, build.py, js/01–23, css/01–13, parts/). Where something was not verified it says **(unverified)**.

## Contents

1. [Big picture](#1-big-picture)
2. [Top-to-bottom map](#2-top-to-bottom-map)
3. [The deck element and deck-level settings](#3-the-deck-element-and-deck-level-settings)
4. [The stage: logo, spotlight, slides, banners](#4-the-stage-logo-spotlight-slides-banners)
5. [A slide (`section.scene`) and what may sit inside it](#5-a-slide-sectionscene-and-what-may-sit-inside-it)
6. [Slide templates (`<template id="slideTemplates">`)](#6-slide-templates-template-idslidetemplates)
7. [Special blocks by id](#7-special-blocks-by-id)
8. [Assets: how images, video, sound and backgrounds are referenced](#8-assets-how-images-video-sound-and-backgrounds-are-referenced)
9. [Runtime-only markup (never write it into the file)](#9-runtime-only-markup-never-write-it-into-the-file)
10. [What the editor rewrites on Save](#10-what-the-editor-rewrites-on-save)
11. [Variants without editor / presenter view](#11-variants-without-editor--presenter-view)
12. [Browser-side state that can hide your edit](#12-browser-side-state-that-can-hide-your-edit)
13. [Source project (`src/` + `build.py`)](#13-source-project-src--buildpy)
14. [Safe-editing rules and what breaks the file](#14-safe-editing-rules-and-what-breaks-the-file)

---

## 1. Big picture

- One HTML file: CSS, slides, JSON data blocks, base64 fonts/images/videos and one big JS IIFE. No network, no CDN.
- Slides are designed on a fixed **1600 × 900 px** stage (`CONFIG.stage`), scaled to the window. Use px as if the screen were always 1600 × 900.
- The script captures `ORIGINAL_HTML = document.documentElement.outerHTML` **before it changes anything** (js/01-config.js line 3). The editor edits a DOM parsed from that string ("the model") and Save serialises the model back (`'<!doctype html>\n' + documentElement.outerHTML`). Anything the script adds at run time is therefore never saved (see §9).
- Typical size: ~3 MB, ~23 700 lines. Almost all bytes are in two lines-groups: `<style id="deckFonts">` and `<script id="deckAssets">` (one asset per line, lines of 50 KB–300 KB). Never read those lines whole; grep by key.

## 2. Top-to-bottom map

Order as produced by `build.py` from `src/deck.html` (line numbers from a real 23 713-line build):

| # | Part | Marker / how to find it | Approx. line |
|---|---|---|---|
| 1 | `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" …></head><body>` | first line (build: all on line 1; editor save: `<!doctype html>` then a newline) | 1 |
| 2 | READ ME FIRST comment (guide for humans and AI tools, file map, recipes) | `READ ME FIRST` | 1–330 |
| 3 | `<title>…</title>` (the deck title; sits in `<body>`, that is fine) | `<title>` | ~331 |
| 4 | Main `<style>`: CSS sections 2–13 | `/* ===… 2. DESIGN TOKENS` … ; contains `/* PRESENTER-ONLY-START … */ … /* PRESENTER-ONLY-END */` (CSS 9) and `/* EDITOR-ONLY-START … */ … /* EDITOR-ONLY-END */` (CSS 13) | ~333–2427 |
| 5 | CUSTOM CSS comment + `<style id="deckCustomCss">` | `CUSTOM CSS (yours)` | ~2428 |
| 6 | CUSTOM JAVASCRIPT comment + `<script type="text/plain" id="deckCustomJs">` | `CUSTOM JAVASCRIPT (yours)` | ~2434 |
| 7 | `<div class="deck" id="deck" data-deck-id="presentation">` + 3 `.glow` divs | `id="deck"` | ~2441 |
| 8 | `<div class="stage no-transitions" id="stage">`: `.logo`, `.spotlight`, then every slide with its banner comment, then `END OF THE SLIDES` comment, `</div>` | `SLIDE 01 ·`, `END OF THE SLIDES` | ~2443–2760 |
| 9 | `<!-- EDITOR-ONLY-START -->` SLIDE TEMPLATES comment + `<template id="slideTemplates">` `<!-- EDITOR-ONLY-END -->` | `SLIDE TEMPLATES` | ~2762–3040 |
| 10 | CONTROLS BAR `<nav class="controls">` and SETTINGS PANEL `<div class="settings-panel" id="settingsPanel" hidden>` (interface; texts come from `data-ui` keys) | `CONTROLS BAR`, `SETTINGS PANEL` | ~3040–3150 |
| 11 | `</div>` closing `#deck` | | |
| 12 | THEMES `<script type="application/json" id="deckThemes">` | `==== THEMES` | ~3157 |
| 13 | INTERFACE TEXTS `<script type="application/json" id="deckUiTexts">` (~2 050 keys) | `INTERFACE TEXTS` | ~3187–5250 |
| 14 | ANIMATIONS `<script type="application/json" id="deckAnimations">` | `==== ANIMATIONS` | ~5257 |
| 15 | TEXT STYLES `<script type="application/json" id="deckTextStyles">` | `TEXT STYLES` | ~5266 |
| 16 | BINARY DATA comment, `<style id="deckFonts">` (CSS section 1, `@font-face` with base64 woff2), `<script type="application/json" id="deckAssets">` | `BINARY DATA` | ~5269–5301 |
| 17 | MAIN SCRIPT `<script>(function () { 'use strict'; … })();</script>` (JS 1–23; `/* PRESENTER-ONLY-START … */` around 10b–12, `/* EDITOR-ONLY-START … */` around 17–20e) | `==== MAIN SCRIPT` | ~5303–end |
| 18 | `</body></html>` | | last |

Grep targets for orientation: `grep -n 'id="deck\|SLIDE [0-9]\|END OF THE SLIDES\|id="slideTemplates"' file`.

## 3. The deck element and deck-level settings

Everything deck-wide lives as attributes on `<div class="deck" id="deck">` (not on `<html>`/`<body>`), plus `<title>`, the `.logo` div (§4) and the JSON blocks (§7).

| Attribute on `#deck` | Values | Effect / reader | Written by |
|---|---|---|---|
| `data-deck-id` | `[A-Za-z0-9_-]+` (e.g. `presentation`) | Prefix of every localStorage key (`presentation-deck.theme` …) and the IndexedDB name. Give every separate presentation its own id. | build; editor Save keeps it; Save as / exports / New presentation set `<base>-copy-<base36 time>` |
| `data-footer` | `number`, `text`, `both` | Footer on every slide (js/07 `slideFooter`), not written into slides | Presentation tab, Footer |
| `data-footer-text` | any text | Footer text for `text`/`both` | Presentation tab |
| `data-progress-line` | `top`, `bottom` | Thin accent bar that grows per slide (not on backup slides) | Presentation tab |
| `data-loop` | boolean (present/absent) | With `data-advance` slides: after the last slide start again | Presentation tab, "Start again after the last slide" |
| `data-font-headings` | `body`, `mono`, `serif`, `system` (absent = display font) | Redefines `--font-display` on `.scene` | All slides › Fonts |
| `data-font-text` | `display`, `mono`, `serif`, `system` (absent = body font) | Redefines `--font-body` on `.scene` | All slides › Fonts |
| `data-text-scale` | `bigger` (zoom 1.12), `biggest` (zoom 1.25) | `.scene > .content { zoom }` | Presentation tab, Text size |
| `style="--reveal-stagger: 130ms; --scene-enter-delay: 300ms"` | ms, 0–3000 | Default time between `.reveal` items; delay before a slide's items start | Presentation tab, Animation pace / Wait before items |
| `data-spotlight` | JSON `{"sizePercent":20,"dimPercent":78,"followEnabled":false}` (size 8–50, dim 0–95) | Spotlight defaults (L key) | Save / Save a copy (from the browser's settings) |
| `data-editor-guides` | space list `x800 y450` (axis + px) | Editor-only guide lines | Editor guides; stripped by "without editor" |
| `data-saved-at` | ISO time | Editor checks the reload is the saved file | Editor Save only |
| `data-preview-copy` | boolean | "Play from here"/PDF tab: editor refuses to open | Editor (temporary copies only) |
| `data-no-editor`, `data-no-presenter` | boolean | Hide the E / P buttons in a stripped copy | Exports, `build.py --without` |

Not on `#deck`: theme (THEMES JSON `active`), interface language (INTERFACE TEXTS), time per slide (`data-estimate` per slide), booth mode (URL `?booth=20` or Settings, browser only), captions (browser only).

URL flags (not stored in the file): `#slide-name` opens that slide; `?templates=1` appends the templates as slides; `?safe=1` disables custom JS; `?booth=20` starts booth mode.

## 4. The stage: logo, spotlight, slides, banners

```html
<div class="stage no-transitions" id="stage">
  <div class="logo"><img src="img/logo-placeholder.svg" alt="Logo"></div>
  <div class="spotlight" aria-hidden="true"></div><!-- spotlight (L key), drawn over the slides -->

  <!-- ==================== SLIDE 01 · title ==================== -->
  <section class="scene" data-name="title" data-title="Title" data-estimate="30" data-end-state>
    …
  </section>

  <!-- ==================== END OF THE SLIDES: paste new slides above this line ==================== -->
</div>
```

- Slides = direct children `#stage > section.scene` (editor: `:scope > section.scene`). Order in the file = slide order, except `data-backup` slides, which always come after all others.
- **Logo** (`#stage > .logo`, exactly one, keep the `<img>` inside it):

| On `<div class="logo">` | Values | Meaning |
|---|---|---|
| `data-corner` | `top-left`, `bottom-right`, `bottom-left` (absent = top right) | corner |
| `style="--logo-scale: .5"` | 0.10–1 (absent = .37) | size in the corner |
| `data-large="off"` | literal `off` | no large logo on slides named `title` / `thanks` (large is the default there, CSS `[data-slide="title"|"thanks"]`) |
| `hidden` | boolean | no logo anywhere |

  Per slide: `data-hide-logo` on the `<section>`. Replace the logo image = new ASSETS entry + change `data-asset` on the `<img>` (§8).
- **Banner comments**: `<!-- ==================== SLIDE 03 · timeline ==================== -->` right before each slide. Optional for the runtime, but the editor keeps/moves them with the slide and on Save renumbers the first line of every existing banner (`SLIDE NN · data-name`; extra comment lines after the first are kept). A new slide inserted by the editor first gets `SLIDE <name>`. When adding a slide by hand, add a banner in the same format; the number need not be right (Save fixes it).
- `END OF THE SLIDES` comment: the editor inserts new slides before it (when no slide is selected) and *New presentation* looks for it. Keep it as the last child of `#stage`.

## 5. A slide (`section.scene`) and what may sit inside it

```html
<section class="scene" data-name="numbers" data-title="The numbers" data-estimate="50">
  <div class="content">
    <div class="eyebrow reveal" style="--order:0">Delivery</div>
    <h2 class="reveal" style="--order:1">The <span class="highlight">numbers</span></h2>
    …
  </div>
  <p class="text-box is-free" style="--x:120px; --y:700px; --w:560px">Placed freely</p>
  <aside class="speaker-notes">
    <p>Said on the slide.</p>
    <p data-note-step="1">Said while click 1 is on screen.</p>
  </aside>
  <style data-slide-css>@scope {
  h2 {
    color: var(--color-accent);
  }
}</style>
  <script type="text/plain" data-slide-js>
show.onEnter(() => show.log('hello'));
</script>
</section>
```

All slide attributes (`data-name`, `data-title`, `data-estimate`, `data-steps`, `data-end-state`, `data-backup`, `data-skip`, `data-advance`, `data-transition`, `data-transition-speed`, `data-hide-logo`, `data-no-footer`, `data-asset-background`, `data-background-drift`, slide `style`) are catalogued in features.md §1.

Direct children the code looks for (`:scope >`):

| Child | Purpose | Rules |
|---|---|---|
| `div.content` | the slide's layout column (most blocks) | Editor inserts layout blocks at its end; "Change layout" reads it |
| `.is-free` elements | freely placed elements (text box, shape, icon, group …) | `--x/--y` count from the parent's padding box; a direct child of the section counts from the slide's corner |
| `aside.speaker-notes` | speaker notes (presenter view and handout only) | Only `<p>`, `<ul>/<li>`, `<b>`, `<i>`; `data-note-step="N"` on a line highlights it during click N (0 = before any click). Editor writes one `<p>` per line. Must be a direct child. |
| `style[data-slide-css]` | this slide's own CSS (Code tab › This slide) | Content is `@scope { … }` (an `@scope` without prelude in a `<style>` scopes to its parent = the slide). Must be a direct child. At most one. |
| `style[data-element-css="ID"]` | rules for one element (Code tab › Rules of this element, e.g. `&:hover`) | Content `@scope {\n  [data-css="ID"] {\n    …\n  }\n}`; the element carries `data-css="ID"` (`c` + 5 base36 chars, unique in the file). Direct child of the section. Removed on save when no element has that `data-css`. |
| `script[type="text/plain"][data-slide-js]` | this slide's own JS, run through hooks (§7 `deckCustomJs`) | `type="text/plain"` is mandatory (the browser must not run it). At most one. |
| `style[data-carried-css="ID"]` | transient: rules carried inside an element on the editor clipboard | Converted to `data-element-css` on paste; should not remain in a saved file. If you see one, it is scoped to its parent element. |

IDs: slides have no `id`. The editor strips every `id` inside a slide it copies/inserts/duplicates (ids must stay unique in the page). Existing ids inside scripted slides (`gallery`, `tab-0`…`tab-3`, `spectrum`, `modeDescription`, `swimlanes`, `flowLinks`, `typedText`) are used by slide behaviours in JS section 6: do not rename or duplicate them.

Scripted slides: `data-name` in `slideBehaviours` = `timeline`, `mindset`, `flow`, `docs`, `product`, `reuse`. The editor locks their layout (texts, numbers, images may change) and refuses to duplicate them or save them as template. Never rename their `data-name`; keep their structure.

## 6. Slide templates (`<template id="slideTemplates">`)

Inside `#deck`, after `#stage`, wrapped in `<!-- EDITOR-ONLY-START -->`/`<!-- EDITOR-ONLY-END -->`. Never shown (a `<template>`); `?templates=1` appends clones after the last slide; the editor's "+ Slide" / "Change layout" dialogs list them. Each is a full `section.scene` with `data-name="template-…"`, `data-title="Template: …"`, indented 2 spaces deeper than slides, preceded by `<!-- TEMPLATE · … -->`.

Built-in names (src/parts/slide-templates.html): `template-title`, `template-section`, `template-title-bullets`, `template-bullets`, `template-cards`, `template-stats`, `template-image`, `template-quote`, `template-compare`, `template-question` (answer on a click; not in the README table), `template-process`, `template-agenda`, `template-effects`, `template-chart`, `template-morph-a`, `template-morph-b`, `template-video`, `template-qr`, `template-break`, `template-backup`.

When the editor inserts one as a slide (`insertSlide`): new unique `data-name` (template name without `template-`, `-2`, `-3` … if taken; pattern `^[a-z0-9][a-z0-9-]*$`), `data-title` without `Template: ` and capitalised, all `id`s removed, notes of a `template-*` source emptied, `data-goto="template-…"` re-pointed to the following slides (or removed), `data-until="template-…"` removed, re-indented. "Save as template" (Slide tab) appends a copy named `template-<name>[-n]`, `data-title="Template: <title>"`, without `data-backup`, with comment `<!-- TEMPLATE · template-x (saved in the editor) -->`. Asset references inside templates count as "used" (not pruned).

## 7. Special blocks by id

All JSON blocks must stay **strict JSON** (double quotes, no trailing comma, no comments). A JSON block that does not parse falls back to `{}`/defaults silently (themes: a console warning and fallback colours).

### 7.1 `deckThemes` (THEMES)

```html
<script type="application/json" id="deckThemes">
{
  "active": "Dark",
  "themes": {
    "Dark": {
      "--color-background": "#0b1a20", "--color-surface": "#12272f", "--color-line": "#24424b",
      "--color-text": "#ecf3f1", "--color-text-muted": "#9bb5b8", "--color-accent": "#f4b63f",
      "--color-teal": "#45c1b6", "--color-rose": "#ef7d6d", "--color-violet": "#a99cf4",
      "--color-presenter-background": "#071216"
    },
    "Light": { … }, "High contrast": { … },
    "Swiss": { …10 colours…, "--font-display": "\"Archivo\", \"Arial Black\", \"Segoe UI\", system-ui, sans-serif",
               "--font-body": "…", "--font-mono": "…", "--radius-scale": "0", "--title-tracking": "-.03em", "--display-stretch": "112%" }
  }
}
</script>
```

- Reader: js/13 `themeLibrary` / `colorSettings`. `active` = theme at start. Each theme lists the 10 tokens as `#rrggbb` (pickers and some script animations read only that form). Missing tokens fall back to CSS section 2.
- Editor/Save rewrites the whole block (`JSON.stringify(…, null, 2)`, `<` escaped as `<`): all themes known to the browser (built-in + saved), `active` = the theme on screen; if colours were changed in Settings, a new theme `Custom` (`Custom 2` …) is added and made active.
- To switch theme by hand: change `active` to an existing key. To add one: add a key with all 10 tokens.
- Optional look keys (THEME_STYLE_TOKENS, js/01): `--font-display` (titles, big numbers), `--font-body` (text), `--font-mono` (labels) — a font list in plain words and quotes only; `--radius-scale` (corner factor, 0 = square), `--title-tracking` (e.g. `-.02em`), `--display-stretch` (e.g. `112%`, only for a font with a width axis). A font named here must have an `@font-face` in the file (built-in families: Bricolage Grotesque, Instrument Sans, JetBrains Mono, Fraunces, Hanken Grotesk, Spline Sans Mono, Archivo, IBM Plex Mono, Newsreader, Schibsted Grotesk, Red Hat Display/Text/Mono, Epilogue, Literata, DM Mono, Big Shoulders Display, Commissioner); any other name falls back to the next font in the list. Built-in themes: Dark, Light, High contrast, Editorial, Swiss, Boardroom, Studio, Forest, Nocturne, Launch.

### 7.2 `deckUiTexts` (INTERFACE TEXTS)

`{ "controls.previous": "Previous", "toast.themeSaved": "Theme \"{name}\" saved in this browser.", … }`. Keys are fixed; `{placeholders}` must be kept. HTML uses `data-ui="key"`, `data-ui-title`, `data-ui-aria-label`, `data-ui-placeholder`. Save rewrites it with the browser's overrides merged (Texts drawer › Interface). Keys starting `editor.` / `cmd.` are removed in a copy without the editor. Never translate keys; never put `</script` in a value.

### 7.3 `deckAnimations` (ANIMATIONS)

```json
{
  "rise": { "trigger": "slide", "duration": 800, "delay": 300, "easing": "ease-out", "repeat": 1, "alternate": false,
            "keyframes": [ { "at": 0, "opacity": 0, "y": 40 }, { "at": 100, "opacity": 1, "y": 0 } ] },
  "path-logo": { "trigger": "click", "duration": 1600, "delay": 0, "easing": "linear", "repeat": 1, "alternate": false,
                 "origin": "left top",
                 "keyframes": [ { "at": 0, "x": 0, "y": 0 }, { "at": 50, "x": 120, "y": -40, "ease": "spring-bouncy" }, { "at": 100, "x": 300, "y": 0 } ] }
}
```

- Used by elements with `data-animation="<key>"` (several elements may share one). Reader: js/07 `animationCss` turns the block into CSS `@keyframes deck-<name>-<index>` in a runtime `<style id="deckAnimationStyles">` (never saved).
- Field reference (types, ranges, easings, origin, per-keyframe `ease`) is in features.md §4.4. Key names: lower-case `[a-z0-9-]`, ≤ 40 chars (`animationName()`).
- `trigger: "click"` requires the element to have `data-reveal-step` (the editor adds `data-reveal-step="1"` plus `data-editor-step-added` when it had none).
- Editor writes it with `JSON.stringify(…, null, 2)`; unused definitions are **not** pruned.

### 7.4 `deckTextStyles` (TEXT STYLES, editor only)

```json
{ "big-quote": { "name": "Big quote", "values": { "font-family": "var(--font-display)", "font-size": "150%", "font-weight": "700",
  "font-style": "italic", "line-height": "1.2", "text-transform": "", "color": "var(--color-accent)" } } }
```

Only the editor's Style chips use it; applying a style writes plain inline CSS on the element. Allowed properties: exactly the 7 above (`""` = as the design has it). Values containing `; { } \ < >`, `url(` or `@`, or not accepted by `CSS.supports`, are ignored.

### 7.5 `deckCustomCss` (CUSTOM CSS)

`<style id="deckCustomCss">` placed after the main `<style>` (so it wins). Plain global CSS; the editor's Code tab › Whole presentation writes it (`\n<rules>\n`, `</style` escaped as `<\/style`). Use `.scene …` selectors to target slides only.

### 7.6 `deckCustomJs` (CUSTOM JAVASCRIPT) and `script[data-slide-js]`

```html
<script type="text/plain" id="deckCustomJs">
show.onEnter((slide, info) => { show.log('slide', info.name, 'in the', show.window, 'window'); });
</script>
```

- `type="text/plain"` mandatory. js/16-custom-code.js compiles the text once with `new Function('show', text)`; deck script at start-up, a slide's script the first time that slide comes on.
- `show` API: `onEnter(fn(slide, {name}))`, `onStep(fn(step, slide))`, `onLeave(fn(slide))`, `after(ms, fn)`, `every(ms, fn)` (min 16 ms), `on(target, type, fn, options)`, `add(element[, parent])`, `find(sel)`, `findAll(sel)`, `log(...)`, `slide` (slide script: its section; deck script: null), `window` (`'single' | 'presenter' | 'audience' | 'editor'`). Timers, listeners and added elements are cleaned up when the slide leaves. Deck hooks run for every slide; a slide's hooks only for that slide; both windows run them.
- Errors are caught and reported; `?safe=1` disables all custom JS.
- Forbidden in the text: `</script`, `<script`, `<!--` (the editor refuses such text; it would break the block). The editor stores `</script` as `<\/script`.

### 7.7 `deckFonts` and `deckAssets` (BINARY DATA)

- `<style id="deckFonts">`: CSS section 1, six `@font-face` rules (Bricolage Grotesque 500–800, Instrument Sans 400–600, JetBrains Mono 500–700; latin + latin-ext) with `src: url(data:font/woff2;base64,…)`. Editor never touches it. Do not edit by hand; never replace with a Google Fonts URL (the build refuses `fonts.googleapis`).
- `<script type="application/json" id="deckAssets">`: see §8.

### 7.8 Other ids that must exist

`deck`, `stage`, `chapterBar`, `slideCounter`, `settingsPanel` and the control buttons (`btnPrevious`, `btnNext`, `btnPen`, `btnPresenter`, `btnEditor`, `btnSettings`, `btnFullscreen`, …). Do not remove or rename anything in the CONTROLS BAR / SETTINGS PANEL parts. `deckThemes`, `deckUiTexts` and `#deck` are required by Save (`error.copyBlocksMissing` otherwise).

## 8. Assets: how images, video, sound and backgrounds are referenced

The ASSETS block maps a path-like name to a data URL, one entry per line:

```html
<script type="application/json" id="deckAssets">
{
  "img/logo.png": "data:image/png;base64,iVBORw0KGgo…",
  "img/numbers-chart.jpg": "data:image/jpeg;base64,/9j/4AAQ…",
  "img/placeholder.svg": "data:image/svg+xml,%3Csvg%20xmlns…",
  "img/sample-video.webm": "data:video/webm;base64,GkXfo59…"
}
</script>
```

Elements name an asset instead of carrying `src`:

| Attribute | On | Resolved at load to |
|---|---|---|
| `data-asset="img/x.jpg"` | `img`, `video`, `audio` | `src` |
| `data-asset-poster="img/x.jpg"` | `video` | `poster` |
| `data-asset-background="img/x.jpg"` | `section.scene` (or any element) | inline `--asset-background: url("…")`, painted by CSS for `.scene[data-asset-background]` |

- Resolver: js/02 `resolveAssets()` runs at load (and on every editor/still copy). A name missing from the block is used as a literal URL (only useful for `_joined.html` next to an `img/` folder).
- In the saved file, `[data-asset]` elements have **no** `src` (the editor strips `src`/`poster`/`--asset-background` before writing). Write only the `data-asset*` attribute.
- Adding an asset by hand: add a line `"img/<name>.<ext>": "data:<mime>;base64,<data>"` (comma rules!), then reference it. Name convention of the editor (`addAsset`): `img/` + lower-case slug + extension from the MIME (`jpeg`→`jpg`, `svg+xml`→`svg`), `-2`, `-3` … if the name exists with different data. Any `data:` URL works (base64 or URL-encoded SVG).
- Supported types in the build: `.jpg .jpeg .png .gif .svg .webp .webm .mp4` (+ `.woff2` fonts). The editor accepts any `image/*`, `video/mp4`, `video/webm`, `audio/*` file.
- Pruning: on every editor Save / export / New presentation, entries not referenced by any `data-asset`, `data-asset-poster` or `data-asset-background` (slides **and** templates) are deleted. Do not rely on unreferenced assets surviving.
- Editor asks before embedding a file > 8 MB (`CONFIG.editor.largeFileBytes`). Keep videos short (a few MB).
- Builder: in `src/`, write `src="img/x.jpg"` / `poster="img/x.jpg"` on `img`/`video`; `build.py` converts them to `data-asset*` and embeds the file from `img/`. `data-asset*="img/…"` written in `src/` is embedded too. Missing file or unknown type stops the build.

## 9. Runtime-only markup (never write it into the file)

Created by the script after load; the editor strips the ones that could leak (`cleanCopy`). Writing them by hand duplicates or breaks them.

| Runtime artefact | Made by |
|---|---|
| `src`/`poster` on `[data-asset]`, `--asset-background` on `[data-asset-background]` | js/02 `resolveAssets` |
| `<style id="deckAnimationStyles">` (appended to body) | js/07 `customAnimations.apply` |
| `div.slide-footer` in each slide | js/07 `slideFooter` (from `data-footer`) |
| `div.deck-progress` in `#stage` | js/07 `progressLine` |
| `span.split-part`, `span.split-word`, `aria-label` on `[data-split]` | js/07 `splitText` |
| SVG inside `.qr-code`; `svg.chart-drawing` inside `.chart` | js/07 `drawQrCode`, `drawChart` |
| `--draw-length` on shape SVG parts | js/07 `measureShapeDraw` |
| classes `is-active is-visible is-leaving is-playing is-finished is-returning is-fast-forward has-focus is-revealed is-dimmed is-morphed is-morph-target is-morph-source is-visited is-over` | navigation / components |
| `data-transition`, `data-transition-speed`, `data-direction`, `data-slide`, `data-step-zoomed`, `--step-zoom*` on `#stage`; `data-slide` on `#deck` | js/08, js/06 |
| `.confetti-layer`, `.toast`, `#duotoneFilters` SVG, the whole `.editor` UI | various |
| Editor canvas marks: `contenteditable`, `spellcheck`, `span[data-editor-wrap]`, `.is-sample-text`, `data-editor-sample`, `.is-editor-selected`, `data-code-target`, `data-check-target` | js/18–20 (removed by `cleanCopy`) |

A count-up number is saved as its end value text (`countUpText`), a `[data-split]` text as plain text, `.qr-code` empty, `.flow-links` SVG empty.

## 10. What the editor rewrites on Save

Save (Ctrl+S, Chrome/Edge File System Access; elsewhere a download) = `serialize()`:

1. Clone the model (= `ORIGINAL_HTML` + every edit, or a restored draft).
2. `applyGlobalSettingsTo`: rewrite **THEMES** (all themes, active one, maybe `Custom`), **INTERFACE TEXTS** (merged browser overrides), `data-spotlight` on `#deck`.
3. When opening the editor (and on Save) browser-local settings are pulled into the model once: `data-estimate` from Settings times, Texts-drawer texts, swapped images (→ new assets).
4. `data-saved-at` on `#deck` (plain Save only).
5. Renumber slide banners.
6. Rewrite **ASSETS**: prune unused, one entry per line, `<` → `<`.
7. Save as / exports / New presentation: new `data-deck-id`.
8. Output `'<!doctype html>\n' + <html>.outerHTML`; then the page reloads the saved file and clears the browser copies of settings and the draft (only if `data-saved-at` matches).

Consequences for hand edits:

- The whole file is re-serialised by the browser's DOM serializer: comments and whitespace are kept, CSS/JS text inside `<style>`/`<script>` is kept byte for byte (except Code-tab blocks and the JSON blocks above), but HTML may be normalised: boolean attributes become `attr=""` (e.g. `data-end-state=""`), `&`, `<`, `>`, non-breaking spaces are entity-escaped in text, attribute values get double quotes. **(unverified: exact normalisation; inferred from standard `outerHTML` behaviour)**.
- Inline styles changed through the editor are re-serialised by CSSOM (e.g. `color: #ff0000` may come back as `color: rgb(255, 0, 0)`; values keep their order).
- Blocks the editor never rewrites: main `<style>`, main `<script>`, `deckFonts`, controls/settings HTML, README comment. `deckAnimations`, `deckTextStyles`, `deckCustomCss`, `deckCustomJs` are rewritten only when edited in the editor (with `JSON.stringify(…, null, 2)` / trimmed text).
- `deckTextStyles` / `deckCustomCss` / `deckCustomJs` are created by the editor if missing (files from before v55/v59/v61).
- Draft: unsaved editor work is kept in IndexedDB `<deckid>-deck-editor` with a fingerprint of the opened file; after a hand edit the fingerprint differs and the old draft is silently not offered.

## 11. Variants without editor / presenter view

Marks (keep them intact when editing):

| Part | CSS / JS mark | HTML mark |
|---|---|---|
| Editor (CSS 13, JS 17–20e, slide templates) | `/* EDITOR-ONLY-START …` … `EDITOR-ONLY-END */` | `<!-- EDITOR-ONLY-START -->` … `<!-- EDITOR-ONLY-END -->` |
| Presenter view (CSS 9, JS 10b–12) | `/* PRESENTER-ONLY-START …` … `PRESENTER-ONLY-END */` | (none in HTML) |

Exact regex (build.py `MARKS`, js/03 `markedPart`): `/\* KIND-ONLY-START[\s\S]*?KIND-ONLY-END \*/|<!-- KIND-ONLY-START -->[\s\S]*?<!-- KIND-ONLY-END -->` (non-greedy: every pair is cut separately). Never nest marks or put `KIND-ONLY-END */` inside content.

| Variant | Editor menu | build.py | What changes |
|---|---|---|---|
| without editor | File › Export without editor → `<name>-presentation.html` | `--without editor` → `Presentation-without-editor.html` | EDITOR marks cut; `data-no-editor` on `#deck`; `editor.*`/`cmd.*` UI texts dropped; `data-editor-note` removed; editor export also removes `data-editor-home` and `data-editor-guides` (build removes `data-editor-note` and `data-editor-guides`, not `data-editor-home`) |
| without presenter | File › Export without presenter view → `<name>-without-presenter.html` | `--without presenter` → `…-without-presenter.html` | PRESENTER marks cut; `data-no-presenter` |
| slides only | File › Export slides only → `<name>-slides.html` | `--without editor,presenter` → `…-slides-only.html` | both |

Editor exports also get a new `data-deck-id`; build variants keep their deck id. Other editor-only attributes (`data-editor-name`, `data-editor-hidden`, `data-editor-locked`, `data-editor-step-added`, `data-css`, `data-anchor`, `data-connect`) stay and are harmless. Code outside the marks must never reference code inside them (it uses `hasEditor()` / `hasPresenterView()`).

## 12. Browser-side state that can hide your edit

Stored per `data-deck-id` in localStorage (`<id>-deck.<key>`): `theme`, `colors`, `themes`, `estimates`, `slideTexts`, `interfaceTexts`, `spotlight`, `notesScale`, `booth`, `captions`; swapped images in IndexedDB. They override the file in that browser:

- A theme picked/colours changed in Settings win over THEMES `active`.
- Times set in Settings win over `data-estimate`.
- Texts changed in the Texts drawer win, but only while the original text they replaced is still in the file (changing that text in the file makes the old override inert).
- A built-in theme beats a browser-saved theme of the same name.

If a hand edit "has no effect", tell the user: Settings (S) › Reset colours / Reset times / Reset texts, or open the file with a new `data-deck-id`.

## 13. Source project (`src/` + `build.py`)

- `src/deck.html` = README comment + include lines `<!-- include: folder/file -->` (whole line). Each file in `src/css`, `src/js`, `src/slides`, `src/parts` must be included exactly once (build stops otherwise); included files may not include. JSON files are validated; `.js`/`.json` containing `</script` stop the build.
- Slides: one file per slide `src/slides/NN-name.html` with its banner; the order of the include lines (above `END OF THE SLIDES`) is the slide order.
- Themes: `src/themes.json`; interface texts: `src/interface-texts.json`. The ANIMATIONS, TEXT STYLES, CUSTOM CSS/JS blocks are inline in `src/deck.html` (empty `{}` / empty).
- `python build.py` → `index.html` (no `<html>` wrapper, web publishing) + `Presentation.html`; `--preview` → `_preview.html`; `--joined` → `_joined.html` (assets not embedded, `{}` ASSETS); `--out <folder>`; `--without editor|presenter|editor,presenter`.
- Build stops on: missing/duplicate/unincluded part, invalid JSON, `</script` in js/json, missing asset file, unsupported asset type, any remaining `src|href|poster|srcset=…img/…|fonts/…` or `url(img/…)` outside comments/scripts, `fonts.googleapis`.
- After the editor has saved, the HTML file is the master: `src/` does not see editor changes. Do not rebuild over an editor-edited file unless the same changes were made in `src/`.

## 14. Safe-editing rules and what breaks the file

Do:

- Edit inside `#stage` (slides), the JSON blocks, the custom CSS/JS blocks, `#deck` attributes, `<title>`. Leave the main CSS/JS, fonts and controls alone unless the task is a code change.
- Keep `data-name` unique per file and matching `^[a-z0-9][a-z0-9-]*$`. Renaming: also update every `data-goto` / `data-until` that points to it (the editor's `renameLinks` does this), CSS rules `[data-name=…]`, slide-specific JS. Never rename the 6 scripted slides.
- Keep every block well-formed: one `</section>` per slide, `aside.speaker-notes` / `style[data-slide-css]` / `script[data-slide-js]` as direct children of the section.
- Escape: no `</script` (any case) inside any `<script>` block (JSON: write `</script`; JS: `<\/script`); no `</style` inside a `<style>` block (`<\/style`). No `<!--` inside custom JS.
- Inside `@scope { … }` blocks, braces must balance; a stray `}` would make the rules leak to every slide (the editor refuses it).
- Use theme tokens (`var(--color-accent)` …) instead of fixed colours where possible so theme switches follow.
- Keep the offline rule: no `http(s)://` resource loads (no `<link>`, `<img src="https://…">`, CDN `<script>`, `@import url(…)`, web fonts). Links the audience clicks (`data-href`, `<a href>`) are fine. `<iframe>`, `<object>`, `<embed>`, `<meta>`, `<base>`, `<link>`, `<noscript>`, `on…=` attributes and `javascript:` URLs are stripped by the editor's HTML field and must not be used.

What breaks the file:

| Mistake | Result |
|---|---|
| Invalid JSON in `deckAnimations` / `deckAssets` / `deckTextStyles` | silently `{}`: all animations gone / all images missing |
| Invalid JSON in `deckThemes` | message + fallback colours |
| `</script` inside a script/JSON block | rest of the page is parsed as HTML; the main script may not run at all |
| Removing `id="deck"`, `id="stage"`, the controls bar ids, or the MAIN SCRIPT | presentation does not start |
| Duplicate `data-name` | navigation, links and saved settings hit the wrong slide |
| `data-asset` name not in ASSETS | broken image (path used as URL) |
| Writing `src="data:…"` on an element that also has `data-asset` | `src` is overwritten at load and stripped on the next Save |
| Editing inside EDITOR-ONLY/PRESENTER-ONLY marks so that a mark is lost or doubled | export/build variants cut the wrong range |
| Very large assets | slow open/save; > 8 MB per file is discouraged |
| A `data-reveal-step` element that also has class `reveal` | entrance animation fights the click reveal |
