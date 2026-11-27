# Editor features as markup

Every editor feature and the markup it writes, so you can make the same result by editing the file. Layout, blocks and
save behaviour: `file-format.md`. "Boolean" = attribute present or absent. "Absent" = the default. Remove empty `style=""`.
**(unverified)** = inferred, not tested.

## 1. Slide settings

On `<section class="scene" ...>`. `deck.py set-slide` writes them.

| Setting | Markup | Values |
|---|---|---|
| Title | `data-title="..."` | Any text (chapter bar, presenter view, lists) |
| Name | `data-name="..."` | Required, unique, `^[a-z0-9][a-z0-9-]*$`. Renaming updates `data-goto` and `data-until`. Locked on scripted slides. |
| Time | `data-estimate="50"` | Seconds. A time set in Settings wins in that browser. |
| Transition | `data-transition="fade"` | Absent (slides in), `fade`, `zoom`, `rise`, `blur`, `flip`, `push`, `cover`, `uncover`, `wipe`, `circle`, `split`, `cube`, `none` |
| Speed | `data-transition-speed="fast"` | `fast`, `slow` (absent = normal) |
| Self-running | `data-advance="8"` | 1-600 s: takes the next click or slide after N s. With `data-loop` on `#deck` it restarts after the last slide. |
| Skip | `data-skip` | Next and Back pass over it; still in the slide and chapter lists; not in the time plan |
| Backup | `data-backup` | Placed after all slides; Next never enters it; not in the time plan |
| No footer, no logo | `data-no-footer`, `data-hide-logo` | Boolean |
| Notes | `<aside class="speaker-notes"><p>...</p><p data-note-step="2">...</p></aside>` | Direct child at the end. `set-notes` turns the line `2: text` into `data-note-step="2"`. |
| Background | `style="background-color: #203040"`; `data-asset-background="img/bg.jpg"` | Colour; image (needs an assets entry) |
| Gradient | `style="--background-gradient: <value>"`; `data-background-drift` (moves slowly) | Presets below; drift only without a background image |
| Darken image | `style="--background-dim: 0.40"` | 0-0.90 |
| Slide pace | `style="--reveal-stagger: 70ms"` | 0-2000 ms (calm 240, brisk 70, at once 0). Absent = deck value. |
| Script steps, end state | `data-steps="3"`, `data-end-state` | Extra Next clicks for slide JS; Back shows `.is-finished` at once. Not set by the editor UI. |

Gradient presets: Warm `radial-gradient(ellipse at 15% 10%, color-mix(in srgb, var(--color-accent) 26%, transparent), transparent 60%)`;
Teal the same at `85% 90%` with `--color-teal 24%`; Vignette `radial-gradient(ellipse at center, transparent 45%, rgb(0 0 0 / .55))`;
Stripes `repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-text) 4%, transparent) 0 18px, transparent 18px 36px)`;
Grid: two `repeating-linear-gradient` (0deg and 90deg) of `color-mix(in srgb, var(--color-text) 7%, transparent) 0 1px, transparent 1px 56px`.

## 2. Element settings and links

| Feature | Markup |
|---|---|
| Duplicate (Ctrl+D) | Clone after it; ids, `data-morph`, `data-editor-locked`, `data-editor-hidden`, `data-anchor`, `data-connect` removed on the copy |
| Editor name, note | `data-editor-name="Logo box"` (60 chars), `data-editor-note="Check this"` (1000 chars). Editor only; removed in exports without editor. |
| Celebrate | `data-confetti=""` (paper), `"stars"`, `"hearts"`, `"emoji"`: bursts when the click shows the element or it rises in |
| Go to slide | `data-goto="slide-name"` (not while the element is hidden before its click); with `data-goto-back` the next click on that slide returns here |
| Web address | `data-href="https://example.com"`: only `http:`, `https:`, `mailto:`; bare `example.com` becomes `https://`; `#name` becomes `data-goto="name"` |

`data-goto` and `data-href` exclude each other. Link inside text: `<a href="https://..." target="_blank" rel="noopener">` or `<a href="#slide-name">`.
Example: `<div class="card reveal" style="--order:2" data-goto="backup-costs" data-goto-back><b>Costs</b><span>details</span></div>`.

### Kind-specific settings

| Kind | Markup |
|---|---|
| Image | New file: assets entry, change `data-asset`. `alt="..."`. `style="object-fit: contain|cover|fill"`. Focus `object-position: 50% 0%` (top; `50% 100%`, `0% 50%`, `100% 50%`; absent = middle). Circle `border-radius: 50%`. |
| Image zoom, crop | `style="object-view-box: inset(T% R% B% L%)"`; crop also sets `data-crop` |
| Image look | `style="--image-look: <filter>"`: `grayscale(1)`, `sepia(.8)`, `brightness(.55)`, `saturate(1.5) contrast(1.08)`, `blur(4px)`, duotone `url(#duotone-teal|amber|violet)`; sliders append `brightness() contrast() saturate()` |
| Slow zoom, frame | `data-ken-burns=""` (closer), `"out"`, `"left"`, `"right"` on the `img` (only in a frame with `overflow:hidden`). Frame: `data-frame="browser|phone|polaroid"` on `.image-frame` or `.video-frame`. Polaroid caption: `data-caption="..."` plus a generated `--caption` SVG; the text alone does nothing **(unverified)**. |
| Video, sound | `data-play-step="N"` on the `video` or `audio` (absent = with the slide; counts as a click step). `muted` = no sound. `loop` on `audio`. `data-badge-hidden` on `.sound-badge` hides the speaker icon. |
| Number `.count-up` | `data-to="0.47" data-decimals="2"`, text = formatted end value. Optional `data-from="100"`, `data-duration="3000"` (100-20000 ms, default 1400), `data-separator=","` (`" "`, `"."`), `data-decimal=","`, `data-count-style="roll"`. In a text: `<span class="count-up" data-to="1200" data-separator=",">1,200</span>`. |
| Progress | bar `style="--value: 70%"`; ring `style="--value: 70"` plus `stroke-dasharray="70 100"` on `circle.ring-fill`; label `.progress-value` text `70 %` |
| Chart `.chart` | `data-chart="bar|line|pie"`, `data-unit="%"`; rows `<tr><th>label</th><td>value</td></tr>`; `<tr class="is-highlight">` = accent |
| Effect `.fx-*` | Template only (+ Slide). Edit its texts, list items and `data-*` attributes; never the run-time parts (`data-fx-runtime`). See `file-format.md` 7.8 |
| QR, break | `.qr-code` `data-qr="https://..."` (213 chars max) with `data-edit-attr="data-qr"`; `time.break-time` `data-minutes="10"` (1-240) with text `10:00` |
| Agenda item | `data-goto="name"`; `data-until="name"` (chapter end; absent = one slide) |
| Table `data-table` | `tbody tr.is-highlight`; `data-table-header` (coloured header); `data-table-style="striped|grid"` (absent = lines) |
| Cards, stats, agenda; list | `style="--per-row: 4"` (1-6, default 3); `.big-list` `data-bullets="number|check|box|arrow|dash|none"` on `ul` or `ol` (absent = accent squares) |

## 3. Text and style

**Words inside a text.** Editable text allows inline `span b i em strong small br sup sub mark code a s u`.

| Format | Markup |
|---|---|
| Bold, italic, struck, underline, raised, lowered | `<b>`, `<em>`, `<s>`, `<u>`, `<sup>`, `<sub>` |
| Accent, marker | `<span class="highlight">`; `<span class="marker">` (highlighter stroke drawn after the slide appears) |
| Size, colour | `<span class="text-format" style="font-size: 1.2em">` (0.4-4 em); `<span class="text-format" style="color: var(--color-teal)">` |

Without a selection, Bold sets `font-weight: 700` (or `400`) on the whole element and Accent sets `color: var(--color-accent)`.

**Style** (inline CSS on the element):

| Field | CSS |
|---|---|
| Text size | `font-size: 150%` (75, 90, 110, 125, 150, 200, 300 %; of the designed size; sometimes with `data-text-size="150% 112.5%"`). A shape's text: set it on the `.shape`. |
| Colour | `color: var(--color-accent)` (`teal`, `rose`, `violet`, `text-muted`, `text`) or any colour |
| Align, rotate | `text-align: left|center|right`; `rotate: -4deg` (-360..360) |
| Font | `font-family: var(--font-display|--font-body|--font-mono)`; `font-weight: 400|700`; `font-style: italic`; `text-transform: uppercase` |
| Spacing | `line-height: 1|1.15|1.3|1.5|1.8`; `letter-spacing: -0.02em|0.05em|0.15em`; `padding: 0px|0.5em|1em|1.6em` |
| Columns, vertical | `column-count: 2|3` (not on grid or flex blocks); `align-content: start|center|end` (box with its own height) |
| Edge, corners | `border: 2px solid var(--color-accent)` (`5px`, `2px dashed`, `0px none`); `border-radius: 0|8px|18px|32px|50%` |
| Box | `background-color: color-mix(in srgb, var(--color-accent) 16%, transparent)` (also teal, `var(--color-surface)`, `var(--color-accent)` with `color: var(--color-background)`, `transparent`); frosted: surface 45 % plus `backdrop-filter: blur(14px)` |
| Shadow, opacity | `--element-shadow: drop-shadow(0 6px 14px rgb(0 0 0 / .35))` (`0 14px 30px rgb(0 0 0 / .6)`; glow `0 0 18px color-mix(in srgb, var(--color-accent) 65%, transparent)`); `--element-opacity: .8|.6|.4|.2` |
| Text fill | `--text-gradient: linear-gradient(90deg, var(--color-accent), var(--color-rose))`; `--text-outline: 1`. Not with Box or highlight, strike, underline effects. |
| Stand out, fit | `data-stand-out` plus accent `border`, tinted `background-color`, glow `--element-shadow`. Fit: free element with `--h` gets `font-size: NN%` (20-800 %); `data-fit-text` keeps refitting. |

Text styles (chips) write font-family, font-size, font-weight, font-style, line-height, text-transform, color: Title display 200% 700;
Heading display 150% 700; Body body 400 line 1.5; Caption body 75% muted; Label mono 75% uppercase accent; Quote display 125% italic accent.

**Shapes and icons:** `--shape-fill: .5|1|0` (absent = light); `--shape-stroke: 1.5px|6px|0px` (no `0px` on line shapes);
`data-shape="<kind>"` with its SVG (`viewBox="0 0 100 100"`); `data-draw` (draws itself in); `<span class="shape-text">Text</span>`
as last child; `.icon-badge` text = one symbol (emoji or character).

## 4. Appear, effects, animations, morph

### 4.1 When an element appears

| Choice | Markup |
|---|---|
| Always | No `reveal` class, no `data-reveal-step` |
| With the slide | `class="... reveal" style="--order:N"` (0-40). Delay = `--order` x `--reveal-stagger` + `--scene-enter-delay`. |
| On a click | `data-reveal-step="N"` (1-20; the slide gets as many clicks as its highest step), optional `data-reveal-effect` |

**Never combine `reveal` with `data-reveal-step`.** Several elements may share a step. Step 0, empty or invalid = always
shown. The editor renumbers clicks 1, 2, 3 without gaps (also `data-note-step`, `data-play-step`), except on slides with `data-steps`.

| Setting | Markup |
|---|---|
| Speed, easing | with the slide: `animation-duration: 0.3s|1.2s|2s`, `animation-timing-function: var(--ease-in-out)|var(--ease-elastic)|linear`; on a click: `transition-duration`, `transition-timing-function` |
| Dim the rest, zoom | `data-focus`; `data-zoom-in="1.6"` (1.1-4). Click items only. |
| Text appears | `data-split="word|letter|line"`, `--split-stagger: 60ms` (defaults word 60, letter 25, line 180; 0-2000). Not with own animation. `data-split-effect="fade|pop|drop|blur|flip|scatter|type|typewriter"` (absent = rises), `data-split-order="reverse|middle|edges|random"`. |
| Items of a block | One after another: each item `reveal` + consecutive `--order`. One per click: consecutive `data-reveal-step`. Together: same step. With the block: neither. Stagger within one click: `style="transition-delay: 120ms"`. |

```html
<ul class="big-list" data-bullets="check">
  <li data-reveal-step="1" data-reveal-effect="pop" data-confetti="stars">First</li>
  <li data-reveal-step="2" data-reveal-effect="highlight" data-focus>Key point</li>
  <li data-reveal-step="3" data-zoom-in="1.6" style="transition-duration: 1.2s">Detail</li>
</ul>
<h2 class="reveal" style="--order:1; --split-stagger: 25ms" data-split="letter" data-split-effect="typewriter">Typed in</h2>
```

### 4.2 Click effects (`data-reveal-effect`, needs `data-reveal-step`)

- Hidden before the click: (absent) rises in; `grow`, `from-left`, `from-right`, `rise`, `drop`, `zoom`, `wipe`, `wipe-down`, `iris`, `spin`, `pop`, `blur`, `flip`.
- Visible before the click: `highlight` (accent tint), `strike` (crossed out, rose), `underline`, `circled` (accent ring; not on
  img, video, quote, frames, QR, or where `overflow` is not visible or `::after` is used), `tick` (`.big-list > li` only: check
  mark; use `data-bullets="box"` for empty boxes on others), `shake`, `pulse`, `jump`, `glow` (once), `fade-out` (to 12 %), `leave` (rises away).
- Not allowed: `fade-out` or `leave` with a click-triggered `data-animation`; `shake|pulse|jump|glow` with any `data-animation`;
  `blur` or `glow` on an image with a duotone look.

### 4.3 Own animation (`data-animation="<key>"`)

The key must exist in `deckAnimations`. Setting it removes `reveal`, `--order`, `data-split*`, `--split-stagger` and own
speed and easing. A click animation has `"trigger": "click"` and the element needs `data-reveal-step`. Presets (copy the definition under that name):

- In: `fade-in`, `rise`, `pop-in`, `zoom-in`, `slide-from-left`, `slide-from-right`, `blur-in`, `bounce-in`, `drop-in`, `roll-in`, `stretch-in`, `land-in`, `grow-right`, `unfold`, `swing-in`.
- Emphasis (slide, infinite): `pulse`, `float`, `orbit`, `rock`, `blink`, `heartbeat`, `glow`, `spin-forever`. Slide once: `jelly`, `swing`, `flash`. Click once: `wobble`, `shake`, `tada`, `nod`, `spin`, `bounce`.
- Out (click): `fade-out`, `sink-out`, `zoom-out`, `slide-out-left`, `slide-out-right`, `blur-out`, `shrink-out`, `rise-out`, `spin-out`, `fall-out`, `pop-out`.

### 4.4 Animation definition fields

| Field | Values (default) |
|---|---|
| `trigger` | `"slide"` (default) or `"click"` |
| `duration`, `delay` | ms (800, 0) |
| `easing` | `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `elastic`; anything else becomes `ease-out` |
| `repeat`, `alternate` | integer >= 1 or `"infinite"` (1); boolean, every other round backwards (false) |
| `origin` | `"left top"`, `"center top"`, `"right top"`, `"left center"`, `"right center"`, `"left bottom"`, `"center bottom"`, `"right bottom"` (middle) |
| `keyframes` | Array sorted by `at`; 0 % and 100 % frames are added if missing |

Keyframe keys, all optional except `at`: `at` (0-100 %), `opacity` (0-1, default 1), `x`, `y` (px), `scale` (1), `rotate`
(deg), `blur` (px), `scaleX`, `scaleY` (1), `skew` (deg), `brightness` (1), `hue` (deg), `ease` (from this frame to the next:
`smooth`, `ease-out`, `ease-in`, `linear`, `back-out`, `back-in`, `back-in-out`, `spring-soft`, `spring-bouncy`,
`spring-wobbly`, `hold`, `hold-start`, `steps-N`, `steps-N-start` (N 1-99), `cubic-bezier(x1, y1, x2, y2)`; unknown uses `easing`).
A property used in no frame is not animated. Click animations show the first keyframe until the click; still copies (PDF) show the last.

A **motion path** is just `x` and `y` keyframes (the editor draws at most 24 with `easing: "linear"`, key `path-<label>`).
The editor's timeline, Record and path tools only change `deckAnimations`, `--order`, `data-reveal-step`, `data-play-step` and speed.

### 4.5 Morph (glide between slides)

`data-morph="title"` (`[a-z0-9-]`) on one element per slide. The element with the same name on the next or previous slide
glides. Each name once per slide. A duplicated copy loses its `data-morph`.
Example: `<h2 data-morph="morph-title">` on slide A and slide B (B may have another size or place).

## 5. Layout blocks

Inside `div.content`, each on its own indented line. `N` = the next free `--order`. Every block below has `class="... reveal" style="--order:N"`.

| Block | Markup |
|---|---|
| heading, text, eyebrow, list | `<h2 ...>`; `<p class="subtitle ...">`; `<div class="eyebrow ...">`; `<ul class="big-list"><li class="reveal" style="--order:N">Point</li>...</ul>` |
| columns | `<div class="columns"><div class="column reveal" ...><h3>..</h3><p>..</p></div> x2</div>` |
| cards | `<div class="cards"><div class="card reveal" ...><b>Title</b><span>Text</span></div> x3</div>` (`cards cols-4`, `cols-5` or `--per-row`) |
| numbers | `<div class="stats"><div class="stat key-figure reveal" ...><div class="stat-value"><span class="count-up" data-to="42">42</span></div><div class="stat-label">..</div></div>...</div>` (`key-figure` on the first) |
| progress | `<div class="progress reveal" style="--order:N; --value: 70%"><span class="progress-label">..</span><span class="progress-track"><span class="progress-fill"></span></span><span class="progress-value" data-no-edit>70 %</span></div>` |
| ring | `<div class="progress-ring reveal" style="--order:N; --value: 70"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="52" pathLength="100"/><circle class="ring-fill" cx="60" cy="60" r="52" pathLength="100" stroke-dasharray="70 100"/></svg><span class="progress-value" data-no-edit>70 %</span><span class="progress-label">..</span></div>` |
| table | `<table class="data-table reveal" ...><thead><tr><th>..</th></tr></thead><tbody><tr><td>..</td></tr></tbody></table>` |
| steps, roadmap | `<ol class="process-steps"><li class="reveal" ...><b>Step 1</b><span>..</span></li> x4</ol>`; `<ol class="roadmap">` with `<li ...><time>Q1</time><b>..</b><span>..</span></li>` |
| image, video | `<div class="image-frame reveal" style="--order:N; width: 50%"><img data-asset="img/x.jpg" alt="..."></div>`; `<div class="video-frame reveal" ...><video class="slide-video" data-asset="img/x.webm" muted playsinline preload="auto" data-play-step="1"></video></div>` |
| sound | `<div class="sound-badge reveal" ...><span class="sound-icon" aria-hidden="true">🔊</span><span class="sound-name">file</span><audio class="slide-audio" data-asset="img/x.mp3" preload="auto"></audio></div>` |
| quote | `<blockquote class="quote reveal" ...>..</blockquote>` + optional `<div class="quote-source">` |
| agenda | `<div class="agenda"><button class="agenda-item reveal" ... data-goto="<slide>"><span class="agenda-number">01</span><b>Title</b><small>..</small></button>...</div>` |
| chart | `<figure class="chart reveal" ... data-chart="bar" data-unit="%"><figcaption>..</figcaption><table><tr><th>2025</th><td>68</td></tr><tr class="is-highlight"><th>2026</th><td>92</td></tr></table></figure>` |
| QR | `<div class="qr-block"><div class="qr-code reveal" ... data-qr="https://example.com" data-edit-attr="data-qr"></div><div class="reveal" ...><h2>Scan..</h2><p class="subtitle">Or type: <span class="qr-link">example.com</span></p></div></div>` |
| break | `<div class="break-timer"><div class="eyebrow reveal" ...>Short break</div><div class="break-until reveal" ...>Back at <time class="break-time" data-minutes="10" data-edit-attr="data-minutes">--:--</time></div><div class="break-countdown reveal" ... data-no-edit>10:00</div></div>` |

Other classes from the templates: `two-columns`, `image-placeholder`, `section-number`, `compare-columns` with `compare-column before|after`,
`card-icon` (svg, paths with `pathLength="1"`), `source-note`. `data-no-edit` text is skipped by the Texts drawer;
`data-edit-attr="attr"` makes it edit that attribute (`aria-label`, `data-qr`, `data-minutes`).

## 6. Free elements and placement

Free elements are direct children of the section (before the notes), `is-free`, with `--x` and `--y` in slide px:

| Kind | Markup |
|---|---|
| text box | `<p class="text-box is-free" style="--x:520px; --y:426px; --w:560px">New text</p>` (no `--h`: grows with its text) |
| label, sticky note | `<p class="text-box label-box is-free" style="--x:755px; --y:426px">LABEL</p>`; `<p class="text-box note-box is-free" style="--x:640px; --y:335px; --w:320px; --h:230px; rotate: -2deg">..</p>` |
| icon | `<div class="icon-badge is-free" style="--x:730px; --y:380px; --w:140px; --h:140px">💡</div>` (round; size = the smaller of `--w`, `--h`) |
| shape | `<div class="shape is-free" data-shape="rect" style="--x:660px; --y:350px; --w:280px; --h:200px; color: var(--color-teal); --shape-fill: .5"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="96" rx="6" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/></svg></div>` |

A shape needs its SVG body (CSS does not draw it): copy one of that kind from the file. Kinds (default w x h; others 280x200):
`rect`, `circle`, `line` 360x40, `arrow` 360x40, `triangle` 260x220, `star` 220x220, `callout` 340x220, `diamond` 220x220,
`hexagon` 240x210, `heart` 220x200, `chevron` 260x160, `check` 180x160, `plus` 200x200, `pentagon` 230x220, `octagon` 220x220,
`cloud` 300x200, `curve` 240x240, `twoway` 360x40, `cross` 160x160. No fill on `line`, `arrow`, `check`, `cross`, `curve`,
`twoway`. A shape's colour is its CSS `color`. Arrow between two elements: an `arrow` shape with `data-connect="a1 a2"`;
the elements get `data-anchor="a1"` and `"a2"`; its SVG uses `viewBox="0 0 <length> 40"` and `rotate: <angle>deg`.

| Placement | Markup |
|---|---|
| Place freely | `class="... is-free" style="--x:100px; --y:200px; --w:600px"`. `--x`, `--y` count from the parent's padding box (a child of the section: from the slide corner). CSS: `position:absolute`, `z-index:1`. |
| Height, ratio | `--h: 300px` (4 or more; absent = as high as the content; media inside get `height:100%`); `data-keep-ratio`. To unplace, remove `is-free` and `--x --y --w --h`. |
| Rotate, flip | `rotate: 15deg`; `--flip-x: -1`, `--flip-y: -1` on `.shape`, `.image-frame`, `.video-frame` |
| Layers | `z-index: <highest+1>` (front); `z-index: -1` (behind the content, above the background) |
| Hide, lock, order | `data-editor-hidden`, `data-editor-locked` (editor only); `data-editor-home="<index>"` on siblings after a drag (for "Reset the layout") |
| Group | `<div class="group is-free" data-group data-editor-name="Group" style="--x:..px; --y:..px; --w:..px; --h:..px">` around free elements, whose `--x`, `--y` become relative to the group. The group can rotate, animate and appear. Ungrouping loses the group's own animation, morph and `data-css` rules. |

Line up, align, spread, same size, grid, repeat, swap and fill only change `--x --y --w --h`.

## 7. Deck, code, slide operations

**Deck:** attributes are in `file-format.md` section 3 (`deck.py set-deck`). The title is `<title>` (`set-title`), the theme is
`active` in `deckThemes`, the logo is `.logo`. Slide numbers: main slides 1, 2..., backup slides B1... There is no deck-wide
default transition: copy `data-transition` to each slide. Find and replace (`deck.py replace-text`) touches visible text, `data-title`, `alt` and `aria-label`, never scripts, styles or SVG.

**Code:**

| Place | Stored as |
|---|---|
| This element | Its `style` attribute |
| Rules of this element | `data-css="cxxxxx"` on it plus `<style data-element-css="cxxxxx">@scope {\n  [data-css="cxxxxx"] {\n    &:hover { ... }\n  }\n}</style>`, direct child of the section |
| This slide | `<style data-slide-css>@scope {\n  h2 { color: var(--color-accent); }\n}</style>`, direct child (`:scope` = the slide), one block |
| Whole presentation | `<style id="deckCustomCss">`; JS: `<script type="text/plain" data-slide-js>` (slide) or `id="deckCustomJs"` (deck); API in `file-format.md` 7.6 |
| HTML field | The editor replaces the element or `section.scene` with typed HTML and strips `script` (except a valid slide script, forced to `text/plain`), `iframe frame object embed meta base link noscript`, other `style` blocks, `on*` attributes, `srcdoc`, `formaction`, `action`, `javascript:` and `vbscript:` |

**Slide operations:**

- + Slide or `add-slide`: a template copy after the selected slide with a banner comment. A blank slide is a `section.scene` with `data-name`, `data-title`, `data-estimate="40"` and a `div.content` with an eyebrow and an `h2`.
- Duplicate: copy after it, name `<name>-2`, ids removed (not for scripted slides). Delete or reorder: section and banner together.
- Change layout: a template copy replaces the slide, keeping `data-name`, attributes, notes and texts. Save as template appends a copy to `<template id="slideTemplates">`.
- Insert from another presentation: assets are copied (renamed on a clash), animations merged (`<name>-2`), links to slides not imported removed; slide-name CSS and JS do not come along.
- New presentation or Save as: a separate file with a new deck id (New: one `title` slide, empty animations).
- PDF, handout, Play from here: temporary copy with `data-preview-copy`, nothing saved. Texts drawer, image swap and Settings times live in the browser until the editor opens.
