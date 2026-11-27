# HTML presentation creator

**One HTML file** that is a complete presentation: 38 animated template slides, a presenter view and a built-in
editor. No installation, no internet, no PowerPoint. Open it, replace the placeholder texts and pictures, present.

![The title slide](docs/slide-01-title.png)

## Use it

1. Download **[Presentation.html](Presentation.html)** (on GitHub: open it, then *Download raw file*).
2. Open it in **Chrome or Edge**.
3. Press **E** to edit, and **Ctrl+S** to save your changes into the same file.
4. Press **F** for full screen and present with the arrow keys or a clicker.

That one file is all you need: fonts, pictures and code are inside it. Make a copy for every new talk.

## What it can do

- **Editor (E):** type on the slides, add slides from 38 layouts, insert text, images, video, charts, shapes and
  QR codes, set animations on a timeline, change the theme. Undo, find and replace, keyboard shortcuts.
- **Presenter view (P):** current and next slide, notes, a timer with a time plan per slide, and the audience
  window on the second screen.
- **While presenting:** pen (D), highlighter (H), spotlight (L), zoom (Z), black screen (B).
- **Ten themes**, each with its own colours and fonts: Dark, Light, High contrast, Editorial, Swiss, Boardroom,
  Studio, Forest, Nocturne and Launch. Press **S** for settings.
- **Print or PDF:** slides, or a handout with notes.

![The presenter view](docs/presenter-view.png)

## Keys

| | |
|---|---|
| Next / back | → / ←, Space, PageDown / PageUp, or the clicker |
| Full screen | F |
| Editor | E |
| Presenter view | P |
| Settings | S |
| Pen, highlighter, spotlight, zoom | D, H, L, Z |
| Black screen | B |

## More

- **[The manual](docs/MANUAL.md)** explains every feature. Search it for what you need.
- **[Changes](docs/CHANGELOG.md)** lists what each version added.
- **AI assistants:** [`.claude/skills/animated-presentation`](.claude/skills/animated-presentation/SKILL.md) is a skill
  that lets Claude, Codex or GitHub Copilot change a presentation file for you (translate it, add slides, fix notes).
  Coding agents start at [AGENTS.md](AGENTS.md).
- **Changing the template itself** (developers): the source is in [`source/`](source/). `python source/build.py`
  builds `Presentation.html` again. See *Part 2* of the manual.
