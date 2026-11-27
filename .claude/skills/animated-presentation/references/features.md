# Presentation: editor features as markup

Catalogue of every editor capability and the exact markup it writes into the saved HTML, so the same result can be produced by editing the file. Grouped like the editor (Slide tab, Element tab, Style, Animations, Insert, Arrange, Presentation tab, Code tab). Verified against `src/js/17-editor.js`, `18-editor-canvas.js`, `19-editor-tools.js`, `20-editor-*.js` (writers) and `src/js/02–16`, `src/css/03–07` (readers). **(unverified)** marks what was not confirmed in code. File layout, blocks and save behaviour: see file-format.md.

Conventions: `style="…"` means inline CSS on that element; "boolean" = attribute present or absent (the editor writes `attr` / `attr=""`); "absent" = the default. Empty `style=""` is always removed by the editor; do the same.

## Contents

1. [Slide settings (Slide tab)](#1-slide-settings-slide-tab)
2. [Element tab: general, links, kind-specific fields](#2-element-tab-general-links-kind-specific-fields)
3. [Text formatting and Style](#3-text-formatting-and-style)
4. [How it appears, click effects, animations, keyframes, motion paths, morph](#4-how-it-appears-click-effects-animations-keyframes-motion-paths-morph)
5. [Insert: layout blocks](#5-insert-layout-blocks)
6. [Insert: freely placed elements (text box, label, note, icon, shapes)](#6-insert-freely-placed-elements-text-box-label-note-icon-shapes)
7. [Free placement, size, rotation, flip, layers, lock/hide, groups, arrange](#7-free-placement-size-rotation-flip-layers-lockhide-groups-arrange)
8. [Presentation tab (all slides)](#8-presentation-tab-all-slides)
9. [Code tab](#9-code-tab)
10. [Slide operations and other tools](#10-slide-operations-and-other-tools)
11. [Quick reference: every attribute, class and custom property](#11-quick-reference-every-attribute-class-and-custom-property)

---

## 1. Slide settings (Slide tab)

All on `<section class="scene" …>`.

| Field | Markup | Values / rules | Read by |
|---|---|---|---|
| Title | `data-title="…"` | any text; chapter bar, presenter view, slide list. Typing over the slide's `h1/h2` also updates it when the title was still the layout's or the old heading | js/03 `titleOf` |
| Name | `data-name="…"` | required, unique, `^[a-z0-9][a-z0-9-]*$`; URL `#name`; renaming updates every `data-goto` / `data-until` that pointed to it. Locked on scripted slides | everywhere |
| Time | `data-estimate="50"` | integer seconds (field accepts `m:ss`); a time set in Settings wins in that browser | js/10 `timePlan` |
| Transition | `data-transition="fade"` | absent (slides in from the side), `fade`, `zoom`, `rise`, `blur`, `flip`, `push`, `cover`, `uncover`, `wipe`, `circle`, `split`, `cube`, `none`. How *this* slide comes on | js/08, css/04 |
| Transition speed | `data-transition-speed="fast"` | `fast`, `slow` (absent = normal) | js/08, css/04 |
| Use on every slide (transition) | copies `data-transition` + `data-transition-speed` to all slides (or to the slides picked in the list) | | |
| Moves on by itself after … s | `data-advance="8"` | 1–600 s; takes the next click (or next slide) after N s, again after each click; with `data-loop` on `#deck` restarts after the last slide. "Same on every slide" copies it | js/08 `selfRunning` |
| Skip this slide | `data-skip` (boolean) | Next/Back pass over it; still reachable via Slides drawer / chapter list; not in the time plan | js/10 `nextSlideIndex` |
| Backup slide | `data-backup` (boolean) | moved after all slides; Next never enters it; not in the time plan | js/02 |
| No footer here | `data-no-footer` (boolean) | | js/07 `slideFooter` |
| No logo on this slide | `data-hide-logo` (boolean) | | css/03 |
| Speaker notes | `<aside class="speaker-notes"><p>…</p><p data-note-step="2">…</p></aside>` direct child, at the end | editor field: one line per `<p>`; `2: text` → `data-note-step="2"`; empty → aside removed | js/10b presenter, print |
| Background colour | `style="background-color: #203040"` | any colour; "×" removes | css |
| Background gradient | `style="--background-gradient: <value>"` | one of the presets below (any CSS image works by hand) | css/05 |
| Gradient moves slowly | `data-background-drift` (boolean) | only with `--background-gradient` and without a background image | css/05 |
| Background image | `data-asset-background="img/start-background.jpg"` + ASSETS entry | | js/02, css/05 |
| Darken image | `style="--background-dim: 0.40"` | 0–0.90 (slider 0–90 %) | css/05 |
| Use on every slide (background) | copies `background-color`, `--background-dim`, `--background-gradient`, `data-asset-background`, `data-background-drift` | | |
| Pace of this slide (Animations tab) | `style="--reveal-stagger: 70ms"` on the section | 0–2000 ms; presets Calm 240, Brisk 70, All at once 0; absent = deck value | css/04 `.reveal` delay |
| Steps for a slide script | `data-steps="3"` | extra Next clicks handled by a JS behaviour (not set by the editor UI) | js/03 `stepsOf` |
| End state | `data-end-state` (boolean) | Back shows `.is-finished` at once (not set by the editor UI) | js/08 |

Background gradient presets (exact values written):

```
radial-gradient(ellipse at 15% 10%, color-mix(in srgb, var(--color-accent) 26%, transparent), transparent 60%)        Warm
radial-gradient(ellipse at 85% 90%, color-mix(in srgb, var(--color-teal) 24%, transparent), transparent 60%)          Teal
linear-gradient(135deg, color-mix(in srgb, var(--color-violet) 22%, transparent), transparent 55%, color-mix(in srgb, var(--color-accent) 18%, transparent))   Diagonal
radial-gradient(ellipse at center, transparent 45%, rgb(0 0 0 / .55))                                                  Vignette
repeating-linear-gradient(0deg, color-mix(in srgb, var(--color-text) 7%, transparent) 0 1px, transparent 1px 56px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--color-text) 7%, transparent) 0 1px, transparent 1px 56px)   Grid
repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-text) 4%, transparent) 0 18px, transparent 18px 36px)   Stripes
```

Example:

```html
<section class="scene" data-name="results" data-title="Results" data-estimate="45" data-transition="zoom" data-transition-speed="slow"
         data-asset-background="img/results-background.jpg" style="--background-dim: 0.35; --reveal-stagger: 70ms">
```

## 2. Element tab: general, links, kind-specific fields

### 2.1 General

| Feature | Markup |
|---|---|
| ↑ / ↓ (move among siblings) | DOM order changes (skips `.speaker-notes`, `svg`, `style`, `script`) |
| Duplicate (Ctrl+D) | clone placed right after; ids removed; `data-morph`, `data-editor-locked`, `data-editor-hidden`, `data-anchor`, `data-connect` removed on the copy; a free copy is offset or repeats the last move step |
| Delete | element removed (a table cell only loses its text; a row = − Row) |
| Name (More) | `data-editor-name="Logo box"` (≤ 60 chars; editor only) |
| Comment / note for the editor (More) | `data-editor-note="Check this number"` (≤ 1000 chars; editor only, listed by "Check the presentation"; removed in exports without editor) |
| Celebrate (🎉) | `data-confetti=""` (paper), `"stars"`, `"hearts"`, `"emoji"`; absent = none. Bursts when the element's click shows it, or after it rises in with the slide |

### 2.2 On a click while presenting (links)

| Feature | Markup | Rules |
|---|---|---|
| Go to slide | `data-goto="slide-name"` | click jumps there (not while the element is still hidden before its click) |
| Next on that slide comes back here | `data-goto-back` (boolean, with `data-goto`) | behaves like an agenda chapter |
| Web address | `data-href="https://example.com"` | only `http:`, `https:`, `mailto:`; bare `example.com` → `https://example.com`; other schemes refused; `#name` → becomes `data-goto="name"` |

`data-goto` and `data-href` exclude each other. A text link inside a text (text bar 🔗) is `<a href="https://…" target="_blank" rel="noopener">` or `<a href="#slide-name">`.

```html
<div class="card reveal" style="--order:2" data-goto="backup-costs" data-goto-back><b>Costs</b><span>details</span></div>
```

### 2.3 Kind-specific sections

| Kind (detected) | Field | Markup |
|---|---|---|
| Image (`img`, or a block whose only child is `img`) | Replace image | new ASSETS entry `img/<slide>-<file>.<ext>`; `data-asset` changed; `poster` refs dropped |
| | Description | `alt="…"` on the `img` |
| | Fit in its box | `style="object-fit: contain|cover|fill"` on the `img` |
| | Zoom | `style="object-view-box: inset(T% R% B% L%)"` on the `img`; zoom Z % shows 100/Z of width and height, placed by the focus; presets 125/150/200/300/400 |
| | Crop… | `object-view-box: inset(…)` + `data-crop` (boolean) on the `img`; "Whole picture" removes both |
| | Focus | `style="object-position: 50% 0%"` (presets: `50% 0%` top, `50% 100%` bottom, `0% 50%` left, `100% 50%` right, `0% 0%`, `100% 0%`, `0% 100%`, `100% 100%`; absent = middle) |
| | Circle | `style="border-radius: 50%"` (same as Corners › Circle) |
| | Look | `style="--image-look: <filter>"` on the `img`: `grayscale(1)`, `sepia(.8)`, `brightness(.55)`, `saturate(1.5) contrast(1.08)`, `blur(4px)`, teal tint `grayscale(1) sepia(.7) hue-rotate(130deg) saturate(1.7) brightness(.95)`, amber tint `grayscale(1) sepia(.9) saturate(1.8) brightness(1.02)`, duotone `url(#duotone-teal)` / `url(#duotone-amber)` / `url(#duotone-violet)` |
| | Brightness / Contrast / Colour sliders | appended to `--image-look`: `… brightness(1.1) contrast(1) saturate(1.3)` (all three together; 0.3–1.7, 0.3–1.7, 0–2) |
| | Slow zoom (Ken Burns; only in a frame that clips, `overflow:hidden`) | `data-ken-burns=""` (closer), `"out"`, `"left"`, `"right"` on the `img`; absent = off |
| | Frame (image or video inside `.image-frame` / `.video-frame`) | `data-frame="browser|phone|polaroid"` on the frame (any own `border` removed) |
| | Polaroid caption | `data-caption="Summer 2026"` (≤ 60) + `style="--caption: url(&quot;data:image/svg+xml,…&quot;)"` on the frame (an SVG of the text; generated, do not hand-write without the SVG; **(unverified: the text alone does nothing)**) |
| Video (`video`, or a block with only a `video`) | Replace | ASSETS + `data-asset` on `video` |
| | Plays | `data-play-step="N"` on the `video` (1–4 in the field; any N by hand); absent = with the slide. Counts as a click step |
| | Sound | `muted` attribute present = no sound (checked = attribute removed) |
| Sound (`.sound-badge`) | Plays | `data-play-step` on the `audio` |
| | Again and again | `loop` on the `audio` |
| | Hide the speaker | `data-badge-hidden` on `.sound-badge` (visibility hidden while presenting) |
| Number (`.count-up` or block with exactly one) | Value | `data-to="0.47"` + `data-decimals="2"` + text = formatted end value |
| | Counts from | `data-from="100"` (absent = 0) |
| | Counting time | `data-duration="3000"` ms (100–20000; absent = 1400) |
| | Thousands | `data-separator=","`, `" "`, `"."` (absent = none); a decimal comma is `data-decimal=","` |
| | How it counts | `data-count-style="roll"` (odometer); absent = count |
| | Count up (on a text) | wraps the first number of a text: `<span class="count-up" data-to="1200" data-separator=",">1,200</span>` |
| | Stop counting | span replaced by its text |
| Progress bar `.progress` / ring `.progress-ring` | Filled (%) | bar `style="--value: 70%"`; ring `style="--value: 70"` + `stroke-dasharray="70 100"` on `circle.ring-fill` (`visibility="hidden"` at 0); label `.progress-value` text `70 %` |
| Chart `.chart` | Type | `data-chart="bar|line|pie"` |
| | Unit | `data-unit="%"` (appended to values unless already there) |
| | Rows | `<table>` rewritten: one `<tr><th>label</th><td>value</td></tr>` per line `label: value`; `*label: value` → `<tr class="is-highlight">` (accent) |
| QR code `.qr-code` | Link | `data-qr="https://…"` (≤ 213 chars; also `data-edit-attr="data-qr"`) |
| Break timer `.break-timer` | Minutes | `data-minutes="10"` on `time.break-time` (1–240) + text `10:00` |
| Agenda item `.agenda-item` | Goes to | `data-goto="name"` |
| | Chapter ends at | `data-until="name"` (absent = one slide) |
| Table `table.data-table` (or a cell) | + Row / + Column / − Row / − Column | DOM rows/cells (`…` placeholders); a new row copies its neighbour's click and shifts later clicks |
| | Highlight row | `class="is-highlight"` on `tbody tr` |
| | Header row in colour | `data-table-header` (boolean) on the table |
| | Table style | `data-table-style="striped|grid"` (absent = lines) |
| | Rows appear | one after another / one per click / with the table (see §4.1 group appear) |
| Cards / numbers / agenda container (`.cards`, `.stats`, `.agenda`) | Per row | `style="--per-row: 4"` (1–6; absent = design default 3) |
| List (`.big-list` or its `li`) | Bullets | `data-bullets="number|check|box|arrow|dash|none"` on the `ul/ol` (absent = accent squares) |
| Image placeholder `.image-placeholder` | Choose a picture | replaced by `.image-frame` with an `img` |

## 3. Text formatting and Style

### 3.1 Words inside a text (text bar, Ctrl+B/I/U)

Typing happens in elements whose content is text + inline tags (`span b i em strong small br sup sub mark code a s u`). Formats wrap the selected words:

| Button | Markup |
|---|---|
| Bold | `<b>…</b>` |
| Italic | `<em>…</em>` |
| Struck through | `<s>…</s>` |
| Underline / raised / lowered | `<u>`, `<sup>`, `<sub>` |
| Accent (highlight) | `<span class="highlight">…</span>` (accent colour) |
| Marker | `<span class="marker">…</span>` (highlighter stroke, drawn in after the slide) |
| A− / A+ | `<span class="text-format" style="font-size: 1.2em">…</span>` (×1.2 per click, 0.4–4 em) |
| 🎨 colour | `<span class="text-format" style="color: var(--color-teal)">…</span>` |
| Link | `<a href="https://…" target="_blank" rel="noopener">…</a>` or `<a href="#slide-name">…</a>` |
| Plain | removes the wrapper the words sit in |

No words selected: Bold toggles `style="font-weight: 700"` (or `400`) on the whole element; Accent toggles `style="color: var(--color-accent)"`; Plain removes the element's own `color` and `font-weight`. Pasted text arrives as plain text, one line. Enter ends typing; Shift+Enter inserts `<br>`.

### 3.2 Style section (inline CSS on the selected element; several selected: all of them)

| Field | CSS written | Values |
|---|---|---|
| Text size | `font-size: 150%` (+ `data-text-size="150% 112.5%"` when the % was recalculated against the parent: "chosen written") | `75% 90% 110% 125% 150% 200% 300%`; % is of the element's own designed size; A+/A− (Ctrl+Shift+. / ,) step through these. A shape's text: set on the `.shape` |
| Colour | `color: var(--color-accent)` | `var(--color-accent|teal|rose|violet|text-muted|text)`, or any colour (picker/eyedropper; stored by CSSOM, often as `rgb(r, g, b)`) |
| Alignment | `text-align: left|center|right` | |
| Rotation | `rotate: -4deg` | −360…360; 0 removes |
| Font | `font-family: var(--font-display|--font-body|--font-mono)` | |
| Weight | `font-weight: 400|700` | |
| Italic | `font-style: italic|normal` | |
| Line height | `line-height: 1|1.15|1.3|1.5|1.8` | |
| Capitals | `text-transform: uppercase|none` | |
| Letter spacing | `letter-spacing: -0.02em|0.05em|0.15em` | |
| Text columns | `column-count: 2|3` | not on grid/flex blocks (lists are switched to block) |
| Up/down in its box | `align-content: start|center|end` | for a box with its own height |
| Edge | `border: 2px solid var(--color-accent)` / `5px solid var(--color-accent)` / `2px dashed var(--color-accent)` / `2px solid color-mix(in srgb, currentColor 35%, transparent)` / `0px none` | |
| Room inside | `padding: 0px|0.5em|1em|1.6em` | |
| Box (background) | `background-color: color-mix(in srgb, var(--color-accent) 16%, transparent)` / teal 16 % / `var(--color-surface)` / `var(--color-accent)` (also sets `color: var(--color-background)` if no own colour) / `transparent`; Frosted: `background-color: color-mix(in srgb, var(--color-surface) 45%, transparent); backdrop-filter: blur(14px)` | |
| Corners | `border-radius: 0|8px|18px|32px|50%` | |
| Shadow | `--element-shadow: drop-shadow(0 6px 14px rgb(0 0 0 / .35))` / `drop-shadow(0 14px 30px rgb(0 0 0 / .6))` / glow `drop-shadow(0 0 18px color-mix(in srgb, var(--color-accent) 65%, transparent))` | rendered by css/05 as a `filter` |
| Opacity | `--element-opacity: .8|.6|.4|.2` | all appear effects respect it |
| Text fill | `--text-gradient: linear-gradient(90deg, var(--color-accent), var(--color-rose))` (or accent→teal, teal→violet); Outline: `--text-outline: 1` | not with Box, nor with highlight/strike/underline effects |
| ★ Make it stand out | `data-stand-out` + `border: 3px solid var(--color-accent); background-color: color-mix(in srgb, var(--color-accent) 14%, transparent); --element-shadow: drop-shadow(0 0 18px color-mix(in srgb, var(--color-accent) 65%, transparent))` | toggle |
| Fit text to its box (free element with `--h`) | `font-size: NN%` (largest that fits, 20–800 %) | |
| Keep fitting | `data-fit-text` (boolean) | refits after typing/resizing |
| Used colours | `color: #hex` | |
| Copy / Paste style (Ctrl+Alt+C / V) | copies inline `font-size color text-align font-family font-weight font-style line-height text-transform letter-spacing border-radius --element-shadow --element-opacity --text-gradient --text-outline`, plus `align-content padding background-color backdrop-filter border column-count` (not to shapes/icons/framed media), plus shape `--shape-fill --shape-stroke data-draw` shape→shape | |

Text styles (chips; one click writes all 7 properties; `''` = removed):

| Style | font-family | font-size | font-weight | font-style | line-height | text-transform | color |
|---|---|---|---|---|---|---|---|
| Title | var(--font-display) | 200% | 700 | – | 1.1 | – | – |
| Heading | var(--font-display) | 150% | 700 | – | 1.15 | – | – |
| Body | var(--font-body) | – | 400 | – | 1.5 | – | – |
| Caption | var(--font-body) | 75% | 400 | – | 1.3 | – | var(--color-text-muted) |
| Label | var(--font-mono) | 75% | 400 | – | 1.3 | uppercase | var(--color-accent) |
| Quote | var(--font-display) | 125% | 400 | italic | 1.3 | – | var(--color-accent) |
| Plain | – | – | – | – | – | – | – |

"+ Save as style" stores the selected element's 7 values in `deckTextStyles` (file-format.md §7.4).

### 3.3 Shape-specific style

| Field | Markup |
|---|---|
| Fill | `--shape-fill: .5|1|0` (absent = light, the SVG's `.16`) |
| Outline / line thickness | `--shape-stroke: 1.5px|6px|0px` (no `0px` on line shapes) |
| Shape kind | `data-shape="<kind>"` + SVG content replaced (`viewBox="0 0 100 100"`) |
| Draws itself in | `data-draw` (boolean) |
| Text in the shape | `<span class="shape-text">Text</span>` as last child |
| Icon (`.icon-badge`) | text content = one symbol (`💡 🚀 🎯 📈 ⚡ ✓ ★ 🔒 ⏱ 👥 ⚙ 💬 📦 🧭 🛠 ❤`, or any) |

## 4. How it appears, click effects, animations, keyframes, motion paths, morph

### 4.1 Appears

| Choice | Markup |
|---|---|
| Always | no `reveal` class, no `data-reveal-step` |
| With the slide | `class="… reveal" style="--order:N"` (N 0–40, next free number by default). Delay = `--order` × `--reveal-stagger` + `--scene-enter-delay` |
| On a click | `data-reveal-step="N"` (1–20 in the field; slide gets as many clicks as its highest step) + optional `data-reveal-effect` |

Never combine `reveal` with `data-reveal-step` on the same element. Several elements may share a step. Step `0`/empty/invalid = always shown. Click numbers are renumbered 1, 2, 3 … without gaps by the editor (`closeClickGaps`, together with `data-note-step` and `data-play-step`), except on slides with `data-steps`.

| Field (when it appears) | Markup |
|---|---|
| Speed | with the slide: `animation-duration: 0.3s|1.2s|2s`; on a click: `transition-duration: …` |
| Easing | with the slide: `animation-timing-function: var(--ease-in-out)|var(--ease-elastic)|linear`; on a click: `transition-timing-function: …` |
| Dim the rest on this click | `data-focus` (boolean; click items only) |
| Zoom in on this click | `data-zoom-in="1.6"` (`1.3|1.6|2|2.5`, by hand 1.1–4; click items only) |
| Text appears (texts only, not with own animation or on-screen effects) | `data-split="word|letter|line"`; `style="--split-stagger: 60ms"` (defaults word 60, letter 25, line 180; 0–2000) |
| … each part | `data-split-effect="fade|pop|drop|blur|flip|scatter|type|typewriter"` (absent = rises) |
| … which part first | `data-split-order="reverse|middle|edges|random"` (absent = from the start) |
| Items of a block (list, cards, steps …; 2+ children of the same tag) | One after another: each item `reveal` + consecutive `--order`; Each on a click: consecutive `data-reveal-step`; Together on one click: same `data-reveal-step`; With the block: both removed |
| Stagger (several selected) | own animation: `delay` in its definition; click item: `style="transition-delay: 120ms"` per extra item of the same click; with the slide: consecutive `--order` |
| Copy / Paste appearance | copies way, step, effect, speed, easing |
| ⏭ After the one before | sets the own animation's `delay` (ms) to when the previous slide-items end |

```html
<ul class="big-list" data-bullets="check">
  <li data-reveal-step="1" data-reveal-effect="pop" data-confetti="stars">First</li>
  <li data-reveal-step="2" data-reveal-effect="highlight" data-focus>Key point</li>
  <li data-reveal-step="3" data-zoom-in="1.6" style="transition-duration: 1.2s">Detail</li>
</ul>
<h2 class="reveal" style="--order:1; --split-stagger: 25ms" data-split="letter" data-split-effect="typewriter">Typed in</h2>
```

### 4.2 Click effects (`data-reveal-effect`, needs `data-reveal-step`)

| Value | Hidden before the click? | Effect |
|---|---|---|
| (absent) | yes | rises in |
| `grow`, `from-left`, `from-right`, `rise`, `drop`, `zoom`, `wipe`, `wipe-down`, `iris`, `spin`, `pop`, `blur`, `flip` | yes | appears that way |
| `highlight` | no | turns accent with a tint |
| `strike` | no | crossed out (rose), text muted |
| `underline` | no | accent line drawn under it |
| `circled` | no | accent ring drawn around it (not on img/video/quote/frames/QR, nor where `overflow` is not visible or `::after` is used) |
| `tick` | no | `.big-list > li` only: box gets ✓ (use `data-bullets="box"` for empty boxes on the others) |
| `shake`, `pulse`, `jump`, `glow` | no | emphasis once (not with `data-animation`) |
| `fade-out` | no | fades to 12 % |
| `leave` | no | rises away to 0 |

Not allowed: `fade-out`/`leave` with a click-triggered `data-animation`; `shake|pulse|jump|glow` with any `data-animation`; `blur`/`glow` on an image with a duotone look.

### 4.3 Own animation (`data-animation`)

| Feature | Markup |
|---|---|
| Choose animation | `data-animation="<key>"`; the key must exist in `deckAnimations`. Choosing a preset copies `ANIMATION_PRESETS[name]` into the block under that name. Sets: removes `reveal`, `--order`, `data-split*`, `--split-stagger`, own speed/ease |
| When (with slide / on click) | definition `"trigger": "slide"|"click"`; click adds `data-reveal-step="1"` + `data-editor-step-added` if the element had no step (removed again when switching back). If the definition is shared, a copy `<name>-2` is made |
| New | key `animation` (`animation-2` …) with a copy of `rise` |
| Copy animation | duplicate key `<name>-copy` and switch the element to it |
| ★ To my animations / Mine | browser library (localStorage `presentation-editor.myAnimations`); applying copies the definition into `deckAnimations` |
| Quick animations (Animations tab) | same as choosing a preset; "none" removes `data-animation` and restores `reveal` |
| ⇄ Reverse | own copy `reversed-<label>`: keyframes mirrored (`at` → 100 − at), segment eases reversed, `easing` reversed |

Presets (key: trigger, duration ms, delay, easing, repeat, keyframes):

- In (slide): `fade-in`, `rise`, `pop-in`, `zoom-in`, `slide-from-left`, `slide-from-right`, `blur-in`, `bounce-in`, `drop-in`, `roll-in`, `stretch-in`, `land-in`, `grow-right` (origin `left center`), `unfold` (origin `center top`), `swing-in` (origin `center top`).
- Emphasis: slide + infinite: `pulse`, `float`, `orbit`, `rock`, `blink`, `heartbeat`, `glow`, `spin-forever`; slide once: `jelly`, `swing` (origin `center top`), `flash`; click once: `wobble`, `shake`, `tada`, `nod`, `spin`, `bounce`.
- Out (click): `fade-out`, `sink-out`, `zoom-out`, `slide-out-left`, `slide-out-right`, `blur-out`, `shrink-out`, `rise-out`, `spin-out`, `fall-out`, `pop-out`.

Full definitions: `ANIMATION_PRESETS` at the top of `src/js/18-editor-canvas.js`.

### 4.4 Animation definition fields (`deckAnimations`)

| Field | Type / values | Default |
|---|---|---|
| `trigger` | `"slide"` (when the slide comes on) or `"click"` (at the element's `data-reveal-step`) | slide |
| `duration` | ms ≥ 0 (field 0–20000) | 800 |
| `delay` | ms ≥ 0 | 0 |
| `easing` | `linear`, `ease`, `ease-in`, `ease-out` (= `var(--ease-out)`), `ease-in-out`, `elastic` (= `var(--ease-elastic)`); anything else → ease-out | ease-out |
| `repeat` | integer ≥ 1 or `"infinite"` | 1 |
| `alternate` | boolean (every other round backwards) | false |
| `origin` | `"left top"`, `"center top"`, `"right top"`, `"left center"`, `"right center"`, `"left bottom"`, `"center bottom"`, `"right bottom"`; absent = middle | middle |
| `keyframes` | array, sorted by `at`; a 0 % and 100 % frame are added if missing | |

Keyframe keys (each optional; omitted = default, and a property used in no frame is not animated at all):

| Key | Unit | Default |
|---|---|---|
| `at` | 0–100 (%) | required |
| `opacity` | 0–1 (multiplied by `--element-opacity`) | 1 |
| `x`, `y` | px (in the element's own turned axes) | 0 |
| `scale` | factor | 1 |
| `rotate` | deg | 0 |
| `blur` | px | 0 |
| `scaleX`, `scaleY` | factor (stretch) | 1 |
| `skew` | deg | 0 |
| `brightness` | factor | 1 |
| `hue` | deg | 0 |
| `ease` | easing from this frame to the next: `smooth`, `ease-out`, `ease-in`, `linear`, `back-out`, `back-in`, `back-in-out`, `spring-soft`, `spring-bouncy`, `spring-wobbly`, `hold`, `hold-start`, `steps-N`, `steps-N-start` (N 1–99), `cubic-bezier(x1, y1, x2, y2)` (x in 0–1); unknown → the animation's `easing` | – |

Behaviour: click animations show the first keyframe until the click; still copies show the last keyframe (an Out ending below 0.12 opacity is shown at 0.12).

### 4.5 Timeline, keyframes, Record, motion paths

All of these only change `deckAnimations`, `--order`, `data-reveal-step`/`data-play-step`, or speed (`animation-duration`/`transition-duration`):

| Tool | Result |
|---|---|
| Drag a bar (with the slide, no own animation) | `--order` |
| Drag a bar / its ends (own animation) | `delay`, `duration` |
| Drag a ◆ / double-click a track / + property / × property / Graph | keyframe `at` and values; "+ property" adds the key with its default to every frame |
| Easing window (between two ◆) | `ease` on the earlier keyframe |
| ● Record (move/turn a free element at the playhead) | keyframe at that moment in its own animation; with none (or a shared one) a new key `motion-<label>` (`-2` …) is made: `{ "trigger": "slide", "duration": <ms>, "delay": 0, "easing": "ease-in-out", "repeat": 1, "alternate": false }`. Refused for click-triggered or repeating animations |
| Motion path dots (drag) | keyframe `x`, `y` |
| ✎ Draw a path | own animation `path-<label>` (or the existing own one): keyframes `{at, x, y[, rotate]}` (≤ 24), `easing: "linear"`; "⏱ Your speed" sets `duration` (and `delay` from the playhead); "Turn along" adds `rotate` |
| Ready ways ◯ ⌒ ∿ ∞ (`circle`, `arc`, `wave`, `eight`) | same as a drawn path, 160 px, 24 steps |
| Follow a shape (element + shape selected) | element moved to the outline's start, path along the outline |

There is no separate "motion path" attribute: a path is just `x`/`y` keyframes.

### 4.6 Morph (glide between slides)

| Feature | Markup |
|---|---|
| Morph name | `data-morph="title"` (normalised `[a-z0-9-]`) on one element per slide; the element with the same name on the next/previous slide glides |
| Pair with the next slide | both elements get the same name (existing name kept, else from its text) |
| ⧉ Duplicate to glide | every layout block and free element of the slide without one gets `data-morph="glide-N"`, then the slide is duplicated (excluding click items and blocks that contain one) |

```html
<!-- slide A --> <h2 class="reveal" style="--order:0" data-morph="morph-title">Our results</h2>
<!-- slide B --> <h2 data-morph="morph-title" style="font-size: 75%">Our results</h2>
```

Each name at most once per slide; a duplicate copy loses its `data-morph`.

## 5. Insert: layout blocks

Inserted after the selected block (a list point → after its list; inside a free element → at the slide's end), else at the end of `.content`, on its own indented line. `N` = next free `--order`.

| Block | Markup |
|---|---|
| heading | `<h2 class="reveal" style="--order:N">New heading</h2>` |
| text | `<p class="subtitle reveal" style="--order:N">…</p>` |
| eyebrow (small label) | `<div class="eyebrow reveal" style="--order:N">…</div>` |
| list | `<ul class="big-list"><li class="reveal" style="--order:N">Point 1</li>…×3</ul>` |
| columns | `<div class="columns"><div class="column reveal" style="--order:N"><h3>…</h3><p>…</p></div>×2</div>` |
| cards | `<div class="cards"><div class="card reveal" style="--order:N"><b>Title</b><span>Text</span></div>×3</div>` (`cards cols-4` / `cols-5` or `--per-row` for more) |
| numbers | `<div class="stats"><div class="stat key-figure reveal" style="--order:N"><div class="stat-value"><span class="count-up" data-to="42">42</span></div><div class="stat-label">…</div></div>…</div>` (first one `key-figure`) |
| progress | `<div class="progress reveal" style="--order:N; --value: 70%"><span class="progress-label">…</span><span class="progress-track"><span class="progress-fill"></span></span><span class="progress-value" data-no-edit>70 %</span></div>` |
| ring | `<div class="progress-ring reveal" style="--order:N; --value: 70"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="52" pathLength="100"/><circle class="ring-fill" cx="60" cy="60" r="52" pathLength="100" stroke-dasharray="70 100"/></svg><span class="progress-value" data-no-edit>70 %</span><span class="progress-label">…</span></div>` |
| table | `<table class="data-table reveal" style="--order:N"><thead><tr><th>Column 1</th>…</tr></thead><tbody><tr><td>…</td>…</tr></tbody></table>` |
| steps | `<ol class="process-steps"><li class="reveal" style="--order:N"><b>Step 1</b><span>…</span></li>×4</ol>` (numbered by CSS) |
| roadmap | `<ol class="roadmap"><li class="reveal" style="--order:N"><time>Q1</time><b>Milestone 1</b><span>…</span></li>×4</ol>` |
| chart | copy of `template-chart`'s `figure.chart` without `data-unit` (see below) |
| image | `<div class="image-frame reveal" style="--order:N; width: 50%"><img data-asset="img/placeholder.svg" alt="…"></div>` (+ ASSETS `img/placeholder.svg` as a URL-encoded SVG data URL; file chooser opens) |
| video | `<div class="video-frame reveal" style="--order:N"><video class="slide-video" data-asset="img/<slide>-video.webm" muted playsinline preload="auto"></video></div>` |
| sound | `<div class="sound-badge reveal" style="--order:N"><span class="sound-icon" aria-hidden="true">🔊</span><span class="sound-name">file name</span><audio class="slide-audio" data-asset="img/<slide>-sound.mp3" preload="auto"></audio></div>` |
| quote | `<blockquote class="quote reveal" style="--order:N">…</blockquote>` (+ optional `<div class="quote-source">`) |
| qr | copy of `template-qr`'s `.qr-block` |
| break | copy of `template-break`'s `.break-timer` |
| agenda | `<div class="agenda"><button class="agenda-item reveal" style="--order:N" data-goto="<slide>"><span class="agenda-number">01</span><b>Title</b><small>…</small></button>…</div>` (up to 3 other slides) |
| Today's date | typed at the cursor, or a new text box with the date |
| Paste text from outside | 2–30 bullet-like lines → `ul.big-list` with `reveal` items; tab-separated rows → `table.data-table` (≤ 30 rows, 10 columns); else plain text **(unverified: single-line fallback details)** |

Chart, QR, break, video markup in full:

```html
<figure class="chart reveal" style="--order:2" data-chart="bar" data-unit="%">
  <figcaption>What the numbers show</figcaption>
  <table>
    <tr><th>2025</th><td>68</td></tr>
    <tr class="is-highlight"><th>2026</th><td>92</td></tr>
  </table>
</figure>

<div class="qr-block">
  <div class="qr-code reveal" style="--order:1" data-qr="https://example.com/feedback" data-edit-attr="data-qr"></div>
  <div class="reveal" style="--order:2"><h2>Scan for the <span class="highlight">slides</span></h2>
    <p class="subtitle">Or type the link: <span class="qr-link">example.com/feedback</span></p></div>
</div>

<div class="break-timer">
  <div class="eyebrow reveal" style="--order:0">Short break</div>
  <div class="break-until reveal" style="--order:1">Back at <time class="break-time" data-minutes="10" data-edit-attr="data-minutes">--:--</time></div>
  <div class="break-countdown reveal" style="--order:2" data-no-edit>10:00</div>
</div>

<div class="video-frame reveal" style="--order:2"><video class="slide-video" data-asset="img/sample-video.webm" muted playsinline preload="auto" data-play-step="1"></video></div>
```

Other reusable classes from the templates: `two-columns`, `image-placeholder`, `section-number`, `template-title`, `compare-columns` > `compare-column before|after`, `quote-source`, `card-icon` (svg with `pathLength="1"` paths, animated by `cards draw-icons`), `highlight`, `subtitle`, `source-note`, `key-figure`. Texts with `data-no-edit` are skipped by the Texts drawer and are not editable on the canvas; `data-edit-attr="attr"` makes the Texts drawer edit that attribute instead of the text (`aria-label`, `data-qr`, `data-minutes`).

## 6. Insert: freely placed elements (text box, label, note, icon, shapes)

Inserted as direct children of the section (before the speaker notes), centred or at the clicked point, always `is-free` with `--x/--y` in slide px:

| Kind | Markup |
|---|---|
| textbox (double-click on an empty spot too) | `<p class="text-box is-free" style="--x:520px; --y:426px; --w:560px">New text</p>` (no `--h`: grows with its text) |
| label | `<p class="text-box label-box is-free" style="--x:755px; --y:426px">LABEL</p>` (no `--w`) |
| note (sticky note) | `<p class="text-box note-box is-free" style="--x:640px; --y:335px; --w:320px; --h:230px; rotate: -2deg">…</p>` |
| icon | `<div class="icon-badge is-free" style="--x:730px; --y:380px; --w:140px; --h:140px">💡</div>` (always round; size = min(--w, --h)) |
| shape | `<div class="shape is-free" data-shape="star" style="--x:690px; --y:340px; --w:220px; --h:220px; color: var(--color-accent)"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">…</svg></div>` |

The SVG body is required (CSS does not draw it); copy it from `SHAPES` in `src/js/19-editor-tools.js`. Shape kinds and default sizes (w × h px; others 280 × 200): `rect`, `circle`, `line` 360×40, `arrow` 360×40, `triangle` 260×220, `star` 220×220, `callout` 340×220, `diamond` 220×220, `hexagon` 240×210, `heart` 220×200, `chevron` 260×160, `check` 180×160, `plus` 200×200, `pentagon` 230×220, `octagon` 220×220, `cloud` 300×200, `curve` 240×240, `twoway` 360×40, `cross` 160×160. Line shapes (no fill): `line`, `arrow`, `check`, `cross`, `curve`, `twoway`. The shape's colour is its CSS `color`.

Example (rect):

```html
<div class="shape is-free" data-shape="rect" style="--x:660px; --y:350px; --w:280px; --h:200px; color: var(--color-teal); --shape-fill: .5"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="96" rx="6" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/></svg></div>
```

Connect with an arrow (two elements selected): an `arrow` shape with `data-connect="a1 a2"`; the two elements get `data-anchor="a1"` / `"a2"` (names `a` + number, never reused); the arrow's SVG uses a px `viewBox="0 0 <length> 40"` and `rotate: <angle>deg`; the editor re-aims it on every write. Moving the arrow by hand or unticking "Follows" removes `data-connect`.

## 7. Free placement, size, rotation, flip, layers, lock/hide, groups, arrange

| Feature | Markup |
|---|---|
| Place freely | `class="… is-free" style="--x:100px; --y:200px; --w:600px"` (`--x/--y` from the padding box of the parent; a child of the section counts from the slide corner). CSS: `position:absolute; left:var(--x); top:var(--y); width:var(--w)` with `!important`, `z-index:1` |
| Own height | `--h: 300px` (≥ 4); absent = as high as content ("Height from its text" removes it). Images/videos inside a free element with `--h` get `height:100%` |
| Keep proportions | `data-keep-ratio` (boolean) |
| Unplace | `is-free`, `--x --y --w --h` removed |
| Drag, resize handles, arrow keys (1 px, Shift 10 px), number labels | `--x --y --w --h` (`--w` ≥ 40 in the field) |
| Drag a layout block out of its box / corner-drag a picture in the layout | becomes `is-free` where it is |
| Drag to reorder within the layout | DOM order changes; every sibling gets `data-editor-home="<original index>"` (used by Reset the layout) |
| Reset the layout (Slide menu) | layout items (not direct children of the slide, not groups, not locked) lose `is-free`, `--x/--y/--w/--h`, `rotate`, `z-index`; `data-editor-home` order restored and removed |
| Rotate (round handle, field) | `rotate: 15deg` |
| Flip across / up-down (`.shape`, `.image-frame`, `.video-frame`; a framed img/video flips via its frame) | `--flip-x: -1` / `--flip-y: -1` (CSS mirrors the inner svg/img/video) |
| To the front / back (free elements) | `z-index: <highest+1>` / `z-index: -1` (behind the slide's content, above its background) |
| One layer forward / back | renumbers `z-index` of the free siblings on the same side of the content |
| Line up (left … bottom of the slide or parent card) / Align / Spread / Same width/height / Arrange in a grid/row/column / Repeat in a row/column / Swap places / Fill (slide, left, right, top, bottom) | `--x --y --w --h` (copies for Repeat) |
| Copy to other slides (free elements) | copies inserted into the ticked slides before their notes; `data-element-css` rules copied with new ids |
| Hide while editing (Layers 👁) | `data-editor-hidden` (boolean; editor canvas only, presenting ignores it) |
| Lock (Layers 🔒) | `data-editor-locked` (boolean; editor refuses to move/change/delete it or what is inside; presenting ignores it) |
| Group (Ctrl+G; free elements with the same parent) | `<div class="group is-free" data-group data-editor-name="Group" style="--x:…px; --y:…px; --w:…px; --h:…px">` around the members; members' `--x/--y` become relative to the group corner. The group itself can rotate, animate, appear |
| Ungroup (Ctrl+Shift+G) | members back to the parent, positions/rotation recomputed; the group's appear way/step/effect/speed/ease and z-index pushed to members; its own animation, morph and `data-css` rules are lost |
| Guides (┃ ━ under the canvas) | `data-editor-guides="x800 y450"` on `#deck` |
| Grid / Snap / Zoom / Pan | nothing in the file |

```html
<div class="group is-free" data-group data-editor-name="Group" style="--x:200px; --y:300px; --w:500px; --h:220px; rotate: 6deg" data-animation="float">
  <div class="shape is-free" data-shape="circle" style="--x:0px; --y:0px; --w:220px; --h:220px; color: var(--color-teal)"><svg …>…</svg></div>
  <p class="text-box is-free" style="--x:260px; --y:80px; --w:240px">Inside</p>
</div>
```

## 8. Presentation tab (all slides)

| Field | Markup |
|---|---|
| Title of the presentation | `<title>…</title>` |
| Theme gallery / Theme and colours… | THEMES block `active` (written on Save from the browser's choice; see file-format.md §7.1). By hand: set `"active"` |
| Fonts: all headings | `#deck data-font-headings="body|mono|serif|system"` |
| Fonts: all text | `#deck data-font-text="display|mono|serif|system"` |
| Text size | `#deck data-text-scale="bigger|biggest"` |
| Animation pace | `#deck style="--reveal-stagger: 130ms"` (0–3000) |
| Wait before the items | `#deck style="--scene-enter-delay: 300ms"` (0–3000) |
| Progress line | `#deck data-progress-line="top|bottom"` |
| Start again after the last slide | `#deck data-loop` |
| Footer | `#deck data-footer="number|text|both"` + `data-footer-text="…"` (slide number: main slides 1, 2 …, backup slides "B1" …) |
| Logo: replace / show / corner / size / large on first and last slide | `.logo img data-asset`, `.logo[hidden]`, `data-corner`, `style="--logo-scale: .5"` (field 10–100 %, 37 = absent), `data-large="off"` |
| Find and replace (texts, optionally notes, match case) | replaces in text nodes of all slides (not in `script/style/svg/.count-up/.break-timer time/.qr-code/[data-no-edit]`), in `data-title`, `alt`, `aria-label` of `[data-edit-attr="aria-label"]` and `[role="img"]`; `h1/h2[aria-label]` follow their text |
| ✓ Check the presentation | read-only findings: overflow, no title, `data-editor-note`s, `data-goto` to missing slides, missing/placeholder `alt`, example texts left |
| Spotlight defaults | `#deck data-spotlight='{"sizePercent":20,"dimPercent":78,"followEnabled":false}'` (from Settings, on Save) |

The deck title is `<title>`; `<html lang="en">` is used for dates. There is no deck-level default transition attribute: "Use on every slide" copies the slide's `data-transition` to every section.

## 9. Code tab

| Place | Stored as | Notes |
|---|---|---|
| This element | its `style` attribute | lines the browser does not understand are dropped (`--x`, `--order` etc. are kept) |
| Rules of this element | element `data-css="cxxxxx"` + `<style data-element-css="cxxxxx">@scope {\n  [data-css="cxxxxx"] {\n    &:hover { … }\n  }\n}</style>` as a direct child of the section | rules must stay inside the element's rule (balanced braces) |
| This slide | `<style data-slide-css>@scope {\n  h2 {\n    color: var(--color-accent);\n  }\n}</style>` direct child of the section (`:scope` = the slide) | one block; empty text removes it |
| Whole presentation | `<style id="deckCustomCss">` | global, after the main CSS |
| JavaScript: this slide | `<script type="text/plain" data-slide-js>` direct child of the section | `show` hooks; see file-format.md §7.6 |
| JavaScript: whole presentation | `<script type="text/plain" id="deckCustomJs">` | |
| ▸ HTML (element or slide) | the element / the `section.scene` replaced by the typed HTML | must be one element (a slide: one `section.scene` with a valid unique name); removed: `script` (except a valid slide `script[data-slide-js]`, forced to `type="text/plain"`), `iframe frame object embed meta base link noscript`, `style` other than the slide's own `data-slide-css` / `data-element-css` blocks, `on*` attributes, `srcdoc`, `formaction`, `action`, `javascript:`/`vbscript:` values |

Snippets (examples of valid content): element glow `filter: drop-shadow(0 0 18px color-mix(in srgb, var(--color-accent) 70%, transparent));`; slide `:scope { background: radial-gradient(…) }`; JS clock / countdown / confetti / step logger using `show.onEnter`, `show.every`, `show.add`, `show.find`. Full list: `CODE_SNIPPETS`, `JS_SNIPPETS` in `src/js/20-editor-code.js`.

## 10. Slide operations and other tools

| Operation | Result in the file |
|---|---|
| + Slide (layout) | copy of a template inserted after the selected slide with banner `<!-- ==================== SLIDE <name> ==================== -->` (renumbered on Save); see file-format.md §6 for name/id rules |
| Blank slide | `<section class="scene" data-name="slide" data-title="…" data-estimate="40"><div class="content"><div class="eyebrow reveal" style="--order:0">…</div><h2 class="reveal" style="--order:1">…</h2></div></section>` (name made unique) |
| Duplicate slide (Ctrl+Shift+D) | copy right after, new name `<name>-2`, ids removed (not for scripted slides) |
| Delete slide | section + its banner + preceding blank lines removed (not the last slide) |
| Reorder (drag in list) | section and banner moved together |
| Change layout | new slide from the chosen template replaces the old one: same `data-name`, all old attributes and non-`is-*` classes, notes; heading/eyebrow/texts poured into the new places; extra texts → list points or notes |
| Save as template | copy appended to `<template id="slideTemplates">` (not an undo step) |
| Insert slides from another presentation | slides inserted after the selected one; their assets copied (renamed if the name is taken with other data); animations merged (`<name>-2` on conflict); links among them renamed, links to slides not imported removed. Slide-name-specific CSS/JS of the other file does not come along |
| New presentation | separate file: same CSS/JS/themes/templates, one slide `data-name="title"` from `template-title`, empty ANIMATIONS, new deck id |
| Save as new file | whole file with a new deck id |
| Export as PDF / Print a handout | temporary copy with `data-preview-copy`, opened at `#print-pdf` / `#print-handout` (nothing saved) |
| Play from here | temporary copy with `data-preview-copy` |
| Texts drawer, image swap, Settings times (presenter side) | browser storage; written into slides (`data-estimate`, texts, new assets + `data-asset`) when the editor opens or on "Save a copy with these settings" |
| Undo / redo / history / draft | nothing in the file |

## 11. Quick reference: every attribute, class and custom property

Slide (`section.scene`): `data-name`, `data-title`, `data-estimate`, `data-steps`, `data-end-state`, `data-backup`, `data-skip`, `data-advance`, `data-transition`, `data-transition-speed`, `data-hide-logo`, `data-no-footer`, `data-asset-background`, `data-background-drift`; style `background-color`, `--background-gradient`, `--background-dim`, `--reveal-stagger`.

Deck (`#deck`): `data-deck-id`, `data-footer`, `data-footer-text`, `data-progress-line`, `data-loop`, `data-font-headings`, `data-font-text`, `data-text-scale`, `data-spotlight`, `data-editor-guides`, `data-saved-at`, `data-preview-copy`, `data-no-editor`, `data-no-presenter`; style `--reveal-stagger`, `--scene-enter-delay`.

Logo (`#stage > .logo`): `data-corner`, `data-large="off"`, `hidden`, style `--logo-scale`.

Elements — appearance and motion: class `reveal` + `--order`; `data-reveal-step`, `data-reveal-effect`, `data-focus`, `data-zoom-in`, `data-confetti`, `data-split`, `data-split-effect`, `data-split-order`, `--split-stagger`, `data-animation`, `data-editor-step-added`, `data-morph`; style `animation-duration`, `animation-timing-function`, `transition-duration`, `transition-timing-function`, `transition-delay`.

Elements — links: `data-goto`, `data-goto-back`, `data-until` (agenda), `data-href`, `<a href target rel>`.

Elements — layout: class `is-free`, `--x`, `--y`, `--w`, `--h`, `rotate`, `z-index`, `--flip-x`, `--flip-y`, `data-keep-ratio`, `data-group` (+ class `group`), `data-anchor`, `data-connect`, `data-editor-home`.

Elements — style: `font-size` (+ `data-text-size`), `color`, `text-align`, `font-family`, `font-weight`, `font-style`, `line-height`, `text-transform`, `letter-spacing`, `column-count`, `align-content`, `border`, `padding`, `background-color`, `backdrop-filter`, `border-radius`, `--element-shadow`, `--element-opacity`, `--text-gradient`, `--text-outline`, `data-stand-out`, `data-fit-text`; inline `span.highlight`, `span.marker`, `span.text-format`, `b`, `em`, `s`, `u`, `sup`, `sub`, `a`.

Media: `data-asset`, `data-asset-poster`, `alt`, `object-fit`, `object-position`, `object-view-box`, `data-crop`, `--image-look`, `data-ken-burns`, `data-frame`, `data-caption`, `--caption`, `data-play-step`, `muted`, `loop`, `data-badge-hidden`.

Components: `.count-up` with `data-to`, `data-from`, `data-decimals`, `data-decimal`, `data-separator`, `data-duration`, `data-count-style`; `.chart` with `data-chart`, `data-unit`, `tr.is-highlight`; `.qr-code` `data-qr`; `time.break-time` `data-minutes`; `.progress` / `.progress-ring` `--value`; `table.data-table` `data-table-header`, `data-table-style`; `.big-list` `data-bullets`; `.cards/.stats/.agenda` `--per-row`; `.shape` `data-shape`, `--shape-fill`, `--shape-stroke`, `data-draw`, `.shape-text`; `.icon-badge`; `.sound-badge`.

Texts drawer / editability: `data-edit-attr`, `data-no-edit`. Notes: `aside.speaker-notes`, `data-note-step`. Code: `data-css`, `style[data-element-css]`, `style[data-slide-css]`, `script[data-slide-js]`, `style[data-carried-css]` (transient).

Editor-only (ignored while presenting): `data-editor-name`, `data-editor-note`, `data-editor-hidden`, `data-editor-locked`, `data-editor-home`, `data-editor-step-added`, `data-editor-guides`.

### Not verified

- Exact HTML normalisation of the DOM serializer on Save (boolean attributes, entity escaping) — inferred from standard `outerHTML` behaviour.
- Values Record (●) writes into the new keyframe (the writer after `addKey`'s set-up was not traced); timeline Speed handle on non-animated bars (stated in the file comment, writer not traced).
- Paste of plain text from outside: only the list/table branches were read.
- Polaroid `--caption` SVG must be regenerated when the caption changes; `data-caption` alone does not render.
- Visual results of CSS-only effects (transitions, Ken Burns directions, frames) were read from CSS, not seen.
