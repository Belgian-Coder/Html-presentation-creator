# The presentation file: anatomy

How the single HTML file is built, so you can edit it directly. Slide markup is in `features.md`.
**(unverified)** marks facts that were inferred, not tested.

## 1. Big picture

- One HTML file: CSS, slides, JSON data blocks, base64 fonts and media, one big JS function. No network.
- Slides use a fixed **1600 x 900 px** stage, scaled to the window.
- The script keeps a copy of the page as loaded. The editor edits that copy and Save writes it back. Whatever the script
  adds at run time is never saved (section 10).
- About 3 MB, almost all in `deckFonts` and `deckAssets` (very long lines). Grep by key; never print them whole.
- The comment at the top of the file is short. Use this guide and the repo's `AGENTS.md`.

## 2. Map of the file

In this order: short comment and `<title>` (it sits in `<body>`, fine) - main `<style>` (find `DESIGN TOKENS`) -
`deckCustomCss` and `deckCustomJs` - `<div class="deck" id="deck" data-deck-id="...">` - `<div class="stage" id="stage">`
(logo, spotlight, slides with banners, `END OF THE SLIDES`) - `<template id="slideTemplates">` (EDITOR-ONLY) - controls bar
and settings panel, then `</div>` closing `#deck` - JSON scripts `deckThemes`, `deckUiTexts` (about 2000 keys),
`deckAnimations`, `deckTextStyles` - `deckFonts` and `deckAssets` (`BINARY DATA`) - main `<script>` (`MAIN SCRIPT`).

Orientation: `grep -n 'id="deck\|SLIDE [0-9]\|END OF THE SLIDES\|id="slideTemplates"' file`.

## 3. The deck element

Deck settings are attributes on `<div class="deck" id="deck">`. `deck.py set-deck` writes them.

| Attribute | Values | Effect |
|---|---|---|
| `data-deck-id` | `[A-Za-z0-9_-]+` | Prefix of the browser storage keys. Give each separate presentation its own. Save as, exports and New presentation make a new one. |
| `data-footer` | `number`, `text`, `both` | Footer on every slide (made at run time) |
| `data-footer-text` | text | Footer text for `text` and `both` |
| `data-progress-line` | `top`, `bottom` | Thin bar that grows per slide (not on backup slides) |
| `data-loop` | boolean | With `data-advance` slides: start again after the last |
| `data-font-headings` | `body`, `mono`, `serif`, `system` (absent = display font) | Font of headings |
| `data-font-text` | `display`, `mono`, `serif`, `system` (absent = body font) | Font of text |
| `data-text-scale` | `bigger` (zoom 1.12), `biggest` (1.25) | Text size |
| `style="--reveal-stagger: 130ms; --scene-enter-delay: 300ms"` | ms, 0-3000 | Time between `.reveal` items; wait before the first |
| `data-spotlight` | `{"sizePercent":20,"dimPercent":78,"followEnabled":false}` | Spotlight defaults (L key). Size 8-50, dim 0-95. |
| `data-editor-guides`, `data-saved-at`, `data-preview-copy` | `x800 y450`; ISO time; boolean | Editor guide lines; set by editor Save; marks a temporary copy (Play from here, PDF) that the editor will not open |
| `data-no-editor`, `data-no-presenter` | boolean | Hide the E or P button in a stripped copy |

Not on `#deck`: theme (themes block), interface language (interface texts), time per slide (`data-estimate` on the slide).
URL flags, not stored: `#slide-name` opens a slide, `?templates=1` appends the templates as slides, `?safe=1` turns custom
JS off, `?booth=20` starts booth mode.

## 4. The stage: logo, slides, banners

Stage layout: `<div class="stage no-transitions" id="stage">` holds `<div class="logo"><img ...></div>`, then
`<div class="spotlight" aria-hidden="true"></div>`, then each slide as
`<!-- ==================== SLIDE 01 · title ==================== -->` + `<section class="scene" data-name="title" ...>`,
and last `<!-- ==================== END OF THE SLIDES: paste new slides above this line ==================== -->`.

- Slides are the direct children `#stage > section.scene`. File order is slide order, except `data-backup` slides, which come last.
- **Logo:** exactly one `#stage > .logo`, with its `<img>`. Per slide: `data-hide-logo` on the section. New image: add an asset, change `data-asset` on the `<img>`.

| On `.logo` | Values | Meaning |
|---|---|---|
| `data-corner` | `top-left`, `bottom-right`, `bottom-left` (absent = top right) | Corner |
| `style="--logo-scale: .5"` | 0.10-1 (absent = .37) | Size |
| `data-large="off"` | `off` | No large logo on slides named `title` and `thanks` |
| `hidden` | boolean | No logo anywhere |

- **Banners:** `<!-- ==================== SLIDE 03 · timeline ==================== -->` before each slide. The runtime ignores
  them; the editor moves them with the slide and renumbers them. Add one when you add a slide by hand (a wrong number is fine).
- Keep `END OF THE SLIDES` as the last child of `#stage`. The editor inserts new slides before it.

## 5. A slide

Shape (children in order): `<section class="scene" data-name="numbers" data-title="The numbers" data-estimate="50">`
with `<div class="content">` (eyebrow, `h2` ... each `class="reveal" style="--order:N"`), free elements, `<aside class="speaker-notes">`,
`<style data-slide-css>`, `<script type="text/plain" data-slide-js>`, then `</section>`.

Slide attributes: `features.md` section 1. Direct children the code looks for:

| Child | Purpose | Rules |
|---|---|---|
| `div.content` | Layout column | The editor adds blocks at its end |
| `.is-free` elements | Freely placed elements | `--x`, `--y` count from the parent's padding box; a child of the section counts from the slide corner |
| `aside.speaker-notes` | Notes (presenter view, handout) | Only `<p>`, `<ul>`, `<li>`, `<b>`, `<i>`. `data-note-step="N"` lights the line at click N (0 = before any click). |
| `style[data-slide-css]` | CSS for the slide | Content is `@scope { ... }`. At most one. |
| `style[data-element-css="ID"]` | Rules for one element (`&:hover`...) | Content `@scope {\n  [data-css="ID"] {\n    ...\n  }\n}`. The element has `data-css="ID"` (`c` + 5 base36 characters, unique in the file). Removed on save when unused. |
| `script[type="text/plain"][data-slide-js]` | JS for the slide (7.6) | `type="text/plain"` mandatory. At most one. |
Notes, slide CSS, element CSS and slide JS must be direct children of the section. `style[data-carried-css]` is a temporary editor-clipboard leftover; it should not stay in a saved file.

**Ids:** slides have no `id`. The editor strips ids inside slides it copies. Scripted slides use some ids (`gallery`,
`tab-0`...`tab-3`, `spectrum`, `modeDescription`, `swimlanes`, `flowLinks`, `typedText`). Do not rename or duplicate them.

**Scripted slides:** `timeline`, `mindset`, `flow`, `docs`, `product`, `reuse`. Code picks their behaviour by `data-name`.
Texts, numbers and images may change. Never rename them. The editor locks their layout and will not duplicate them.

## 6. Slide templates

`<template id="slideTemplates">` is inside `#deck` after `#stage`, within EDITOR-ONLY marks, and never shown. Each template
is a `section.scene` with `data-name="template-..."` and `data-title="Template: ..."`, after `<!-- TEMPLATE · ... -->`.
70 templates; `deck.py templates F` lists them. `data-category` (basics, text, numbers, diagrams, compare, media, audience,
special; none or `mine` = saved by the user) picks the tab in + Slide. 50 of them use an effect (`.fx-<name>`, section 7.8).

Inserted as a slide, a template loses `data-category` and gets a unique `data-name` (prefix removed; `-2`, `-3` if taken), `data-title` without
`Template: `, no `id`s, empty notes, `data-goto="template-..."` re-pointed to the following slides (or removed),
`data-until="template-..."` removed.

## 7. Data blocks

JSON blocks must be **strict JSON** (double quotes, no trailing comma, no comments). A block that does not parse becomes
empty (themes: a warning and fallback colours).

### 7.1 `deckThemes`

Shape: `{ "active": "Dark", "themes": { "Dark": { "--color-background": "#0b1a20", ... } } }`. The 10 colour tokens:
`--color-background`, `--color-surface`, `--color-line`, `--color-text`, `--color-text-muted`, `--color-accent`,
`--color-teal`, `--color-rose`, `--color-violet`, `--color-presenter-background`.

- `active` is the theme at start. Each theme has 10 colours as `#rrggbb`. Missing ones fall back to the main CSS.
- Save rewrites the block (all themes the browser knows; `active` = the theme on screen; Settings colours become a new theme `Custom`).
- By hand: change `active`, or add a key with all 10 colours. `set-theme-color` changes one colour.
- Optional look keys: `--font-display`, `--font-body`, `--font-mono` (font lists), `--radius-scale` (0 = square),
  `--title-tracking` (`-.02em`), `--display-stretch` (`112%`, fonts with a width axis only). A font named here needs an
  `@font-face` in the file, else the next one in the list is used.
- Built-in themes: Dark, Light, High contrast, Editorial, Swiss, Boardroom, Studio, Forest, Nocturne, Launch.

### 7.2 `deckUiTexts`

`{ "controls.previous": "Previous", "toast.themeSaved": "Theme \"{name}\" saved in this browser.", ... }`. Keys are fixed;
keep `{placeholders}`. HTML uses `data-ui="key"` (also `data-ui-title`, `data-ui-aria-label`, `data-ui-placeholder`). Save merges
browser overrides in. Keys starting `editor.` or `cmd.` are dropped in a copy without the editor. Never translate keys.

### 7.3 `deckAnimations`

Shape: `{ "rise": { "trigger": "slide", "duration": 800, "keyframes": [ { "at": 0, "opacity": 0, "y": 40 }, { "at": 100, "opacity": 1, "y": 0 } ] } }`.

- An element uses one with `data-animation="<key>"`; several may share it. The script turns the block into `@keyframes`
  in a run-time style. Key names: lower-case `[a-z0-9-]`, at most 40 characters. Fields: `features.md` section 4.4.
- `"trigger": "click"` needs `data-reveal-step` on the element (the editor adds `data-reveal-step="1"` and `data-editor-step-added`). Unused definitions are not pruned.

### 7.4 `deckTextStyles` (editor only)

Example: `{ "big-quote": { "name": "Big quote", "values": { "font-size": "150%", "font-style": "italic", "color": "var(--color-accent)" } } }`.
Only the editor's Style chips use it; applying one writes plain inline CSS. Allowed properties: `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, `text-transform`,
`color` (`""` = as designed). Values with `; { } \ < >`, `url(` or `@`, or that `CSS.supports` rejects, are ignored.

### 7.5 `deckCustomCss`

`<style id="deckCustomCss">` comes after the main `<style>`, so it wins. Global CSS; use `.scene ...` selectors for slides only.

### 7.6 `deckCustomJs` and `script[data-slide-js]`

Example: `<script type="text/plain" id="deckCustomJs">show.onEnter((slide, info) => show.log(info.name));</script>`.

- `type="text/plain"` is mandatory. The text is compiled once with `new Function('show', text)`: the deck script at start,
  a slide script the first time the slide appears.
- `show` API: `onEnter(fn(slide, {name}))`, `onStep(fn(step, slide))`, `onLeave(fn(slide))`, `after(ms, fn)`,
  `every(ms, fn)` (min 16 ms), `on(target, type, fn, options)`, `add(element[, parent])`, `find(sel)`, `findAll(sel)`,
  `log(...)`, `slide` (the slide's section; null in the deck script), `window` (`'single'`, `'presenter'`, `'audience'`, `'editor'`).
- Timers, listeners and added elements are cleaned up when the slide leaves. Deck hooks run for every slide, slide hooks
  for their own. Both windows run them. Errors are caught and shown. `?safe=1` turns all custom JS off.
- Forbidden in the text: `</script`, `<script`, `<!--`. In a file write `</script` as `<\/script` and `</style` as `<\/style`.

### 7.7 Fonts, assets, required ids

- `<style id="deckFonts">` holds the base64 `@font-face` rules. The editor never touches it. Do not edit it; never use a Google Fonts URL.
- `deckAssets`: section 8.
- Ids that must exist: `deck`, `stage`, `chapterBar`, `slideCounter`, `settingsPanel` and the control buttons (`btnPrevious`,
  `btnNext`, `btnPen`, `btnPresenter`, `btnEditor`, `btnSettings`, `btnFullscreen`...). Do not touch the controls bar or settings panel.

### 7.8 Effects (`.fx-*`)

Components with their own script, e.g. `.fx-gauge`, `.fx-wheel`, `.fx-chat`. CSS in section 5b, JS in section 7 between
`EFFECTS START` and `EFFECTS END`, each registered with `effects.push({ name, selector, build, enter, step, leave, still, adjust })`.

- The markup as written is the end state (editor, thumbnails, print). At run time the element gets class `fx-live` and
  child parts with `data-fx-runtime`; neither is ever saved (the editor strips them).
- Change content by editing the template's texts, list items or `data-*` attributes (the slide's notes say which).
- Clicks come from `data-reveal-step` on parts or on empty markers, like any slide. Some effects add markers at run time.
- `adjust`: a number the presenter changes on the slide (− value +); not saved, sent to the other window as `fx-value`.

## 8. Assets

`deckAssets` maps a name to a data URL, one entry per line: `"img/logo.png": "data:image/png;base64,iVBOR..."`.

| Attribute | On | Becomes at load |
|---|---|---|
| `data-asset="img/x.jpg"` | `img`, `video`, `audio` | `src` |
| `data-asset-poster="img/x.jpg"` | `video` | `poster` |
| `data-asset-background="img/x.jpg"` | `section.scene` (or any element) | inline `--asset-background: url("...")` |

- In a saved file `[data-asset]` elements have **no** `src`. Write only the `data-asset*` attribute.
- Add assets with `deck.py add-asset`. By hand: a line `"img/<name>.<ext>": "data:<mime>;base64,<data>"` (mind the commas).
  The editor names assets `img/` + slug + extension (`jpeg` becomes `jpg`, `svg+xml` becomes `svg`), with `-2`, `-3` on a clash.
- `deck.py` accepts png, jpeg, gif, webp, svg, avif, mp4, webm, ogg and common audio; the editor any `image/*`, `video/mp4`, `video/webm`, `audio/*`.
- **Pruning:** each editor Save, export and New presentation deletes entries that no `data-asset`, `data-asset-poster` or
  `data-asset-background` uses (slides and templates). Keep files small (the editor asks above 8 MB); videos a few MB.

## 9. Variants without editor or presenter view

Marks: editor parts (CSS, JS, templates) sit between `/* EDITOR-ONLY-START ...` and `EDITOR-ONLY-END */` (CSS, JS) or
`<!-- EDITOR-ONLY-START -->` and `<!-- EDITOR-ONLY-END -->` (HTML). Presenter-view parts (CSS, JS) use
`/* PRESENTER-ONLY-START ...` and `PRESENTER-ONLY-END */`. Every pair is cut on its own (non-greedy). Never nest marks,
never write `KIND-ONLY-END */` inside marked content. Code outside the marks must not use code inside them (it checks
`hasEditor()` or `hasPresenterView()` first).

Easiest: File menu > Export without editor / Export without presenter view / Export slides only. Each gives a new `data-deck-id`.
By hand: delete every marked block of that kind and add `data-no-editor` or `data-no-presenter` on `#deck`. Without the
editor also drop the `editor.*` and `cmd.*` interface texts and the `data-editor-note`, `data-editor-home`,
`data-editor-guides` attributes. Other `data-editor-*` attributes, `data-css`, `data-anchor`, `data-connect` are harmless.

## 10. Run-time markup (never write it)

The script creates these after load; the editor strips those that could leak. Written by hand they duplicate or break.
`src`/`poster` on `[data-asset]`, `--asset-background`, `#deckAnimationStyles`, `.slide-footer`, `.deck-progress`, split-text
spans and `aria-label` on `[data-split]`, SVG inside `.qr-code` and `.chart`, `--draw-length`, state classes (`is-active`,
`is-visible`, `is-finished`, `has-focus`, `is-morphed`...), `data-transition*`, `data-direction`, `data-slide`,
`data-step-zoomed` on `#stage`/`#deck`, `.confetti-layer`, `.toast`, `#duotoneFilters`, the `.editor` UI and editor canvas
marks (`contenteditable`, `spellcheck`, `data-editor-wrap`, `.is-sample-text`, `.is-editor-selected`, `data-code-target`).
A count-up number is saved as its end value, a `[data-split]` text as plain text, `.qr-code` and `.flow-links` empty.

## 11. What the editor rewrites on save

Save (Ctrl+S in Chrome or Edge; elsewhere a download) rewrites the themes and interface-texts blocks and `data-spotlight`,
pulls browser-local settings into the file once (`data-estimate` from Settings times, Texts-drawer texts, swapped images
as assets), sets `data-saved-at`, renumbers banners, prunes unused assets, and writes `<!doctype html>` + the page HTML.
Then it reloads and clears the browser copies. Save as, exports and New presentation set a new `data-deck-id`.

- The browser's serializer rewrites the file. Comments, whitespace and `<style>`/`<script>` text stay (except Code-tab and
  JSON blocks). HTML may be normalised: `data-end-state` becomes `data-end-state=""`, inline colours may change form.
  **(unverified: exact normalisation)**
- Never rewritten: main `<style>` and `<script>`, `deckFonts`, controls and settings HTML, the top comment. The other
  blocks change only when edited in the editor.
- Unsaved editor work is kept in the browser with a fingerprint of the opened file. After a hand edit it is not offered again.

## 12. Browser settings that hide your edit

The browser stores theme, colours, times, Texts-drawer texts, spotlight and swapped images per `data-deck-id`, and they
win over the file there (texts only while the original text is still in the file). Fix: Settings (S) > Reset colours /
Reset times / Reset texts, or give the file a new `data-deck-id`.

## 13. Safe editing and what breaks the file

Do:

- Edit inside `#stage`, the JSON blocks, the custom CSS and JS blocks, `#deck` attributes and `<title>`. Leave the main
  CSS and JS, fonts and controls alone.
- Keep `data-name` unique and matching `^[a-z0-9][a-z0-9-]*$`. When renaming, update every `data-goto` and `data-until`
  that points to it, CSS like `[data-name=...]`, and slide JS. Never rename the six scripted slides.
- Keep blocks well-formed: one `</section>` per slide; balanced braces inside `@scope { ... }` (a stray `}` leaks the rules to every slide).
- No `</script` in a script block, no `</style` in a style block, no `<!--` in custom JS.
- Stay offline: no `<link>`, `https://` images, CDN scripts, `@import url(...)` or web fonts. Links the audience clicks
  (`data-href`, `<a href>`) are fine. Do not use `<iframe>`, `<object>`, `<embed>`, `<meta>`, `<base>`, `<noscript>`,
  `on...=` attributes or `javascript:` URLs (the editor strips them).

What breaks the file:

- Invalid JSON in `deckAnimations`, `deckAssets` or `deckTextStyles`: the block silently becomes `{}` (all animations or images gone). In `deckThemes`: a message and fallback colours.
- `</script` inside a script block: the rest of the page is read as HTML and the main script may not run.
- Removing `id="deck"`, `id="stage"`, a control id or the main script: the presentation does not start.
- A duplicate `data-name`: links, navigation and saved settings hit the wrong slide.
- A `data-asset` name not in the assets block: broken image. `src="data:..."` next to `data-asset`: overwritten at load.
- A lost or doubled EDITOR-ONLY or PRESENTER-ONLY mark: exports cut the wrong part.
- `data-reveal-step` together with class `reveal`: the entrance fights the click reveal.
