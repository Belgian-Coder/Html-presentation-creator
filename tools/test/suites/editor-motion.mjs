// The motion tools (v49): easing per segment (in the saved CSS too), the easing window (presets, curve handles, text,
// copy / paste), the ruler and playhead (the slide paused at a moment), keyframe diamonds (drag to another moment),
// Record (a drag on the slide becomes a keyframe at the playhead; one undo step) and the motion path (drag a dot).
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

export const covers = ['js/07-', 'js/17-', 'js/18-', 'js/19-', 'js/20-', 'css/06-', 'css/13-'];
export const timeoutMs = 420000;   // (it grew with every version, and the deck has 38 slides: under load it needs more than 5 minutes)

export default async function (t) {
  const e = t.editor;
  const sel = e.selected;
  await e.open('numbers');
  const k = await e.scale();

  // a free shape with a preset animation, then an easing on its first segment
  await e.insert('rect');
  await e.tab('element');
  await e.panelSet('[data-element-field="animation"]', 'preset:bounce-in');
  await t.waitFor(`!!document.querySelector('.editor-panel-body .keyframe-ease')`, { label: 'Easing column in the keyframe table' });
  t.check('the keyframe table has an Easing button per segment', (await t.eval(`document.querySelectorAll('.editor-panel-body .keyframe-ease').length`)) === 3);
  await t.click('.editor-panel-body .keyframe-ease[data-index="0"]');
  await t.waitFor(`!!document.querySelector('.editor-ease')`, { label: 'easing window' });
  t.check('the easing window shows presets with their curves', (await t.eval(`document.querySelectorAll('.editor-ease [data-ease] svg').length`)) >= 12);
  await t.click('.editor-ease [data-ease="spring-bouncy"]');
  await t.waitFor(`document.querySelector('.editor-ease [data-ease="spring-bouncy"]').classList.contains('is-current')`);
  const animName = await t.eval(`${sel}.getAttribute('data-animation')`);
  t.check('the shape has its own animation', !!animName, animName);
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-ease')`, { label: 'Esc closes the easing window' });
  t.check('Esc closes the easing window', true);
  // the curve handles: a cubic-bezier of your own
  await e.tab('element');
  await t.click('.editor-panel-body .keyframe-ease[data-index="1"]');
  await t.waitFor(`!!document.querySelector('.editor-ease .ease-handle[data-handle="1"]')`);
  await t.click('.editor-ease [data-ease="smooth"]');
  await t.waitFor(`getComputedStyle(document.querySelector('.editor-ease .ease-handle[data-handle="1"]')).display !== 'none'`);
  const handle = await t.centre('.editor-ease .ease-handle[data-handle="1"]');
  await t.drag(handle, 0, -60);
  const curve = await t.waitFor(`(() => { const v = document.querySelector('.editor-ease .ease-css').value; const m = v.match(/^cubic-bezier\\(([^,]+), ([^,]+),/); return m && Number(m[2]) > 0.2 ? v : null; })()`, { label: 'the curve changed' });
  t.check('dragging a curve handle up makes a cubic-bezier of your own', true, curve);
  await t.click('.editor-ease [data-ease-action="copy"]');
  await t.key('Escape', 'Escape', 27);
  await t.click('.editor-panel-body .keyframe-ease[data-index="2"]');
  await t.waitFor(`!!document.querySelector('.editor-ease')`);
  await t.click('.editor-ease [data-ease-action="paste"]');
  await t.waitFor(`document.querySelector('.editor-ease .ease-css').value === ${JSON.stringify(curve)}`, { label: 'pasted easing' });
  t.check('Copy / Paste easing', true);
  await t.key('Escape', 'Escape', 27);
  await e.undo();
  await t.waitFor(`!(document.querySelector('.editor-panel-body .keyframe-ease[data-index="2"]')?.textContent || '').startsWith('cubic')`, { label: 'undo the paste' });
  t.check('Undo takes the pasted easing back (one step)', true);

  // the timeline: the ruler pauses the slide at a moment; keyframe diamonds
  await e.tab('animations');
  await t.waitFor(`!!document.querySelector('.anim-ruler')`, { label: 'ruler' });
  // a click on a segment opens the easing window next to it, and the slide stays paused
  const ruler0 = await t.eval(`(() => { const el = document.querySelector('.anim-ruler'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width * .3, y: r.y + r.height / 2 }; })()`);
  await t.clickAt(ruler0);
  await t.waitFor(`!!document.querySelector('.anim-playhead')`);
  await t.click('.anim-row.is-selected .anim-segment[data-index="1"]');
  await t.waitFor(`!!document.querySelector('.editor-ease')`);
  t.check('the easing window opens next to its segment, the slide stays paused', await t.eval(`(() => { const box = document.querySelector('.editor-ease').getBoundingClientRect(), seg = document.querySelector('.anim-row.is-selected .anim-segment[data-index="1"]').getBoundingClientRect(); return box.right <= seg.left && box.top <= seg.bottom && box.bottom >= seg.top; })()`) && await t.eval(`!!document.querySelector('.anim-playhead')`));
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-ease')`);
  t.check('the shape shows its 4 keyframes on its bar', (await t.eval(`document.querySelectorAll('.anim-row.is-selected .anim-key').length`)) === 4);
  const ruler = await t.eval(`(() => { const el = document.querySelector('.anim-ruler'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, width: r.width, total: Number(el.dataset.total) }; })()`);
  await t.clickAt({ x: ruler.x + ruler.width * 0.3, y: ruler.y });
  await t.waitFor(`!!document.querySelector('.anim-playhead')`, { label: 'playhead' });
  const paused = await t.eval(`document.querySelector('.editor-stage .scene').getAnimations({ subtree: true }).filter(a => a.playState === 'paused').length`);
  t.check('a click on the ruler shows the slide paused at that moment', paused > 0, String(paused));
  const keyLeft = () => t.eval(`parseFloat(document.querySelector('.anim-row.is-selected .anim-key[data-index="1"]').style.left)`);
  const before = await keyLeft();
  const key = await t.centre('.anim-row.is-selected .anim-key[data-index="1"]');
  await t.drag(key, 12, 0);
  await t.waitFor(`parseFloat(document.querySelector('.anim-row.is-selected .anim-key[data-index="1"]').style.left) > ${before + 0.3}`, { label: 'key moved' });
  t.check('dragging a keyframe diamond moves it to a later moment', true);

  // Record: move the shape on the paused slide = a keyframe at the playhead
  await e.goSlide('numbers');
  await e.insert('circle');
  const circleX = await e.value('--x');
  await e.tab('animations');
  await t.waitFor(`!!document.querySelector('.anim-ruler')`);
  const ruler2 = await t.eval(`(() => { const el = document.querySelector('.anim-ruler'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, width: r.width }; })()`);
  await t.clickAt({ x: ruler2.x + ruler2.width * 0.5, y: ruler2.y });
  await t.waitFor(`!!document.querySelector('.anim-playhead')`);
  await t.click('.anim-record');
  await t.waitFor(`document.querySelector('.editor').classList.contains('is-recording')`, { label: 'recording' });
  t.check('Record shows a red frame', true);
  t.check('in Record the playhead stays and the handles show', await t.eval(`!!document.querySelector('.anim-playhead')`) && true);
  await e.pick('.editor-stage .scene > .shape[data-shape="circle"]');
  t.check('in Record the selection and its handles show on the paused slide', await t.eval(`getComputedStyle(document.querySelector('.editor-selection')).display !== 'none'`));
  await t.drag(await t.centre('.editor-stage .is-editor-selected'), 120 * k, 0);
  await t.waitFor(`!!document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation')`, { label: 'an animation was made' });
  t.check('the drag made an animation, the circle keeps its own place', (await e.value('--x')) === circleX, String(await e.value('--x')));
  const keys = await t.eval(`document.querySelectorAll('.anim-row.is-selected .anim-key').length`);
  t.check('two keyframes: where it was and where it went', keys === 2, String(keys));
  t.check('the motion path shows on the slide (a dot for the keyframe away from the element)', await t.eval(`document.querySelector('.editor-motion-path polyline')?.getAttribute('points').split(' ').length === 2 && document.querySelectorAll('.editor-motion-path .motion-dot').length === 1`));
  const dot = await t.centre('.editor-motion-path .motion-dot');
  await t.drag(dot, 0, 60 * k);
  await t.waitFor(`(() => { const d = document.querySelector('.editor-motion-path .motion-dot'); return !!d && Math.abs(d.getBoundingClientRect().top + d.getBoundingClientRect().height / 2 - ${dot.y} - ${60 * k}) < 8; })()`, { timeout: 10000, label: 'dragging a path dot moves that keyframe' });
  t.check('dragging a path dot moves that keyframe', true);
  await e.undo();
  await t.waitFor(`(() => { const d = document.querySelector('.editor-motion-path .motion-dot'); return !!d && Math.abs(d.getBoundingClientRect().top + d.getBoundingClientRect().height / 2 - ${dot.y}) < 8; })()`, { label: 'undo the dot drag' });
  await e.undo();
  await t.waitFor(`!document.querySelector('.editor-stage .scene > .shape[data-shape="circle"]')?.getAttribute('data-animation')`, { label: 'undo the recording' });
  t.check('one Undo takes the recorded keyframe back', true);
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor').classList.contains('is-recording')`, { label: 'Esc ends Record' });
  t.check('Esc ends Record and the paused slide', true);
  // Save: the file keeps the easing; the page opens again and its own CSS (the presentation's) has the spring
  await e.blur();
  await t.eval(`window.__beforeSave = 1; sessionStorage.removeItem('test-written'); true`);
  t.check('a message never covers the Save button', await t.eval(`(() => { const r = document.querySelector('.editor-bar [data-action="save"]').getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2).closest('[data-action="save"]') !== null; })()`));
  await t.click('.editor-bar [data-action="save"]');
  await t.waitFor(`JSON.parse(sessionStorage.getItem('test-written') || '[]').length >= 1`, { timeout: 10000, label: 'file written' }).catch(async error => { throw new Error(error.message + ' · toast: ' + await e.toast() + ' · dialog: ' + await t.eval(`document.querySelector('.editor-dialog:not([hidden])')?.textContent?.slice(0, 120) || ''`)); });
  const saved = await t.eval(`JSON.parse(sessionStorage.getItem('test-written')).at(-1).text`);
  t.check('the saved file keeps the easing ("ease": "spring-bouncy")', /"ease":\s*"spring-bouncy"/.test(saved));
  // the saved file as a page of its own: its CSS (made when it opens) has the spring
  const file = join(mkdtempSync(join(tmpdir(), 'deck-motion-')), 'saved.html');
  writeFileSync(file, saved);
  await t.send('Page.navigate', { url: pathToFileURL(file).href + '#numbers' });
  await t.waitFor(`document.readyState === 'complete' && !!document.getElementById('deckAnimationStyles')`, { timeout: 25000, label: 'saved file opened' });
  t.check('presenting uses it: a linear() spring inside the keyframes', await t.eval(`document.getElementById('deckAnimationStyles').textContent.includes('animation-timing-function: linear(')`));


  // review fixes: the ruler is as wide as the bars; Record keeps what the slide shows at the playhead (with the easing);
  // a turned element records along its own sides; Record works on one element; Esc closes a dialog before the pause
  await e.open('numbers');   // (the tab shows the saved file now)
  await e.tab('animations');
  await t.waitFor(`!!document.querySelector('.anim-ruler')`);
  t.check('the ruler is exactly as wide as the bars', await t.eval(`(() => { const r = document.querySelector('.anim-ruler').getBoundingClientRect(), b = document.querySelector('.anim-track').getBoundingClientRect(); return Math.abs(r.left - b.left) < 1 && Math.abs(r.width - b.width) < 1; })()`));
  await e.insert('rect');
  const rx = await e.value('--x');
  await e.tab('animations');
  const rulerAt = async share => { const r = await t.eval(`(() => { const el = document.querySelector('.anim-ruler'); el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.x + b.width * ${share}, y: b.y + b.height / 2 }; })()`); await t.clickAt(r); await t.waitFor(`!!document.querySelector('.anim-playhead')`); };
  await rulerAt(0.8);
  await t.click('.anim-record');
  await t.waitFor(`document.querySelector('.editor').classList.contains('is-recording')`);
  await e.pick('.editor-stage .scene > .shape[data-shape="rect"]');
  t.check('in Record, picking an element keeps the timeline', (await t.eval(`document.querySelector('.editor-tabs .is-selected')?.dataset.tab`)) === 'animations');
  await t.drag(await t.centre('.editor-stage .is-editor-selected'), 200 * k, 0);
  await t.waitFor(`!!document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation') && !!document.querySelector('.anim-playhead')`, { label: 'first keyframe recorded, still paused' });
  await rulerAt(0.4);   // the eased middle: the slide shows some x between 0 and 200
  const shownX = await t.eval(`new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.editor-stage .is-editor-selected')).transform).e`);
  await t.drag(await t.centre('.editor-selection .editor-move'), 0, 80 * k, { modifiers: 8 });   // the grip with Shift: straight down
  await t.waitFor(`document.querySelectorAll('.anim-row.is-selected .anim-key').length === 3`, { label: 'a third keyframe', timeout: 15000 });   // (a loaded machine: the drag's frames come late)
  await t.waitFor(`document.querySelector('.editor-stage').classList.contains('is-playing-preview') && Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.editor-stage .is-editor-selected')).transform).e - ${shownX}) <= 2`, { timeout: 8000, label: 'paused again at the playhead' }).catch(() => {});
  const afterX = await t.eval(`new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.editor-stage .is-editor-selected')).transform).e`);
  t.check('Record keeps what the slide showed at the playhead (no sideways jump)', Math.abs(afterX - shownX) <= 2, shownX + ' -> ' + afterX);
  t.check('the element keeps its own place', (await e.value('--x')) === rx);
  await t.key('?', 'Slash', 191, 8);
  await t.waitFor(`!document.querySelector('.editor-dialog').hidden`);
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`document.querySelector('.editor-dialog').hidden`);
  t.check('Esc closes the keys dialog first; Record stays', await t.eval(`document.querySelector('.editor').classList.contains('is-recording')`));
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor').classList.contains('is-recording')`);
  t.check('the next Esc ends Record', true);
  // v51: quick animations (hover plays, click gives it) and text word by word
  await e.open('numbers');
  await e.pick('.editor-stage .scene .content > h2');
  await e.blur();
  await e.tab('animations');
  await t.waitFor(`document.querySelectorAll('.anim-quick [data-preset]').length >= 15`, { label: 'quick animations' });
  t.check('quick animations show for the selected element (In, Emphasis, Out)', true);
  const pop = await t.centre('.anim-quick [data-preset="pop-in"]');
  await t.mouse('mouseMoved', pop.x, pop.y);
  await t.waitFor(`document.querySelector('.editor-stage .scene .content > h2').getAnimations().length > 0`, { label: 'hover plays it' });
  t.check('the pointer over one plays it on the element', true);
  // v216: it repeats while the pointer stays on it (the calmer panel kept this), and stops when the pointer leaves
  const H2 = `document.querySelector('.editor-stage .scene .content > h2')`;
  t.check('v216: …again and again while the pointer stays on it', await t.eval(`${H2}.getAnimations().some(a => a.effect.getTiming().iterations === Infinity)`));
  await new Promise(resolve => setTimeout(resolve, 2200));
  t.check('v216: …still playing after 2 s (longer than one round)', await t.eval(`${H2}.getAnimations().some(a => a.playState === 'running')`));
  const away = await t.centre('.editor-tabs [data-tab="animations"]');
  await t.mouse('mouseMoved', away.x, away.y);
  await t.waitFor(`${H2}.getAnimations().length === 0`, { label: 'hover loop stops' }).catch(() => {});
  t.check('v216: the pointer away: it stops, the element is as it was', await t.eval(`${H2}.getAnimations().length === 0 && !${H2}.classList.contains('is-previewing')`));
  await t.mouse('mouseMoved', pop.x, pop.y);
  await t.waitFor(`${H2}.getAnimations().length > 0`, { label: 'hover plays it again' });
  await t.clickAt(pop);
  await t.waitFor(`document.querySelector('.editor-stage .scene .content > h2')?.getAttribute('data-animation') === 'pop-in'`, { label: 'click gives it' });
  t.check('a click gives the element that animation (in the file)', /data-animation="pop-in"/.test(await e.modelHtml()));
  await e.undo();
  await t.waitFor(`!document.querySelector('.editor-stage .scene .content > h2')?.hasAttribute('data-animation')`, { label: 'undo' });
  t.check('one Undo takes it back', true);
  await e.pick('.editor-stage .scene .content > h2');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-tool-field="split"]', 'word');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene .content > h2 .split-part').length === 2`, { label: 'word by word plays at once' });
  t.check('word by word: the playing slide shows each word on its own (2 words)', true);
  t.check('the file keeps the plain text with data-split', /<h2[^>]*data-split="word"[^>]*>The numbers<\/h2>/.test(await e.modelHtml()), (await e.modelHtml()).match(/<h2[^>]*>[^<]*/)?.[0]);
  // v72: line by line (the words of one line share a number, 180 ms apart), how each part comes in (Pops in)
  await e.panelSet('[data-tool-field="split"]', 'line');
  await t.waitFor(`document.querySelector('.editor-stage .scene .content > h2')?.getAttribute('data-split') === 'line' && document.querySelectorAll('.editor-stage .scene .content > h2 .split-part').length === 2`, { label: 'line by line' }).catch(() => {});
  t.check('line by line: both words of the one line rise in together (the same --i), 180 ms apart per line', await t.eval(`(() => { const parts = [...document.querySelectorAll('.editor-stage .scene .content > h2 .split-part')]; return parts.length === 2 && parts.every(p => p.style.getPropertyValue('--i') === '0'); })()`) && (await t.eval(`document.querySelector('.editor-panel-body [data-tool-field="splitStagger"]')?.value`)) === '180');
  await e.panelSet('[data-tool-field="splitEffect"]', 'pop');
  await t.waitFor(`document.querySelector('.editor-stage .scene .content > h2')?.getAttribute('data-split-effect') === 'pop'`, { label: 'pop' }).catch(() => {});
  await t.waitFor(`document.querySelector('.editor-stage .scene .content > h2 .split-part') && getComputedStyle(document.querySelector('.editor-stage .scene .content > h2 .split-part')).animationName === 'split-pop'`, { label: 'pop plays' }).catch(() => {});
  t.check('Each part: Pops in (data-split-effect, played with split-pop)', (await t.eval(`getComputedStyle(document.querySelector('.editor-stage .scene .content > h2 .split-part')).animationName`)) === 'split-pop');
  await e.panelSet('[data-tool-field="splitEffect"]', '');
  await e.panelSet('[data-tool-field="split"]', 'word');
  await t.waitFor(`document.querySelector('.editor-stage .scene .content > h2')?.getAttribute('data-split') === 'word'`).catch(() => {});
  t.check('back to word by word: its own time apart again (none in the file), no effect', /<h2[^>]*data-split="word"[^>]*>The numbers<\/h2>/.test(await e.modelHtml()) && !/split-stagger|data-split-effect/.test((await e.modelHtml()).match(/<h2[^>]*>/)?.[0] || ''), (await e.modelHtml()).match(/<h2[^>]*>/)?.[0]);
  // review fixes: the playing (split) slide never reaches the file; letters keep accents and emoji together;
  // a quick button keeps an animation that is already there; None takes the click step it added away again
  await t.waitFor(`document.querySelector('.editor-stage').classList.contains('is-playing-preview')`).catch(() => {});
  await t.eval(`document.querySelector('.editor-stage .scene .content > .eyebrow').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); true`);   // the first click stops the playing slide
  await t.waitFor(`!document.querySelector('.editor-stage').classList.contains('is-playing-preview')`);
  await e.pick('.editor-stage .scene .content > .eyebrow');
  await e.blur();
  await e.tab('animations');
  await t.waitFor(`!!document.querySelector('.anim-quick [data-preset="fade-out"]')`);
  await t.click('.anim-quick [data-preset="fade-out"]');
  await t.waitFor(`document.querySelector('.editor-stage .scene .content > .eyebrow')?.getAttribute('data-animation') === 'fade-out'`, { label: 'fade out on the eyebrow' });
  t.check('a change while the slide shows split words saves plain text (no split parts in the file)', !/split-part/.test(await e.modelHtml()));
  await t.click('.anim-quick-none');
  await t.waitFor(`!document.querySelector('.editor-stage .scene .content > .eyebrow')?.hasAttribute('data-animation')`, { label: 'none' });
  t.check('No animation of its own: the click step it added is gone, it rises in with the slide again', await t.eval(`(() => { const el = document.querySelector('.editor-stage .scene .content > .eyebrow'); return !el.hasAttribute('data-reveal-step') && el.classList.contains('reveal'); })()`));
  await e.tab('animations');
  await t.click('.anim-quick [data-preset="rise"]');
  await t.waitFor(`document.querySelector('.editor-stage .scene .content > .eyebrow')?.getAttribute('data-animation') === 'rise'`);
  await e.tab('element');
  await e.panelSet('[data-anim-field="duration"]', '2000');
  await t.waitFor(`document.querySelector('.editor-panel-body [data-anim-field="duration"]')?.value === '2000'`);
  await e.pick('.editor-stage .scene .content > h2');
  await e.blur();
  await e.tab('animations');
  await t.click('.anim-quick [data-preset="rise"]');
  await t.waitFor(`document.querySelector('.editor-stage .scene .content > h2')?.getAttribute('data-animation') === 'rise'`);
  await e.tab('element');
  t.check('a quick button keeps an animation already in the file (its 2000 ms stay)', (await t.eval(`document.querySelector('.editor-panel-body [data-anim-field="duration"]')?.value`)) === '2000');
  await e.undo(); await e.undo();
  await t.waitFor(`!document.querySelector('.editor-stage .scene .content > h2')?.hasAttribute('data-animation')`).catch(() => {});
  // the saved file: the words rise in one after another when the slide comes on
  await e.blur();
  await t.eval(`window.__beforeSave = 1; sessionStorage.removeItem('test-written'); true`);
  await t.click('.editor-bar [data-action="save"]');
  await t.waitFor(`JSON.parse(sessionStorage.getItem('test-written') || '[]').length >= 1`, { timeout: 10000, label: 'saved' });
  const saved2 = await t.eval(`JSON.parse(sessionStorage.getItem('test-written')).at(-1).text`);
  const file2 = join(mkdtempSync(join(tmpdir(), 'deck-split-')), 'saved.html');
  writeFileSync(file2, saved2);
  await t.eval(`new Promise(r => setTimeout(r, 800))`).catch(() => {});   // (the save reloads the page: let that finish before going elsewhere, also under load)
  await t.waitFor(`document.readyState === 'complete'`, { timeout: 15000 }).catch(() => {});
  await t.send('Page.navigate', { url: pathToFileURL(file2).href + '#numbers' });
  await t.waitFor(`document.readyState === 'complete' && document.querySelectorAll('#stage .scene[data-name="numbers"] h2 .split-part').length === 2`, { timeout: 25000, label: 'split when the file opens' });
  t.check('presenting: the words rise in one after another (later delay for the second)', await t.eval(`(() => { const parts = document.querySelectorAll('#stage .scene[data-name="numbers"] h2 .split-part'); return parseFloat(getComputedStyle(parts[1]).animationDelay) > parseFloat(getComputedStyle(parts[0]).animationDelay); })()`));
  t.check('screen readers still read the whole text', (await t.eval(`document.querySelector('#stage .scene[data-name="numbers"] h2').getAttribute('aria-label')`)) === 'The numbers');

  // My animations: ★ keeps one in this browser; Mine applies it to another element (a hover plays it); × removes; Import adds
  await e.open('numbers');
  await e.insert('rect');
  await e.tab('element');
  await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-element-field="animation"]'); f.value = [...f.options].some(o => o.value === 'bounce-in') ? 'bounce-in' : 'preset:bounce-in'; f.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);   // (the file may already hold it)
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="motion-mine-save"]')`);
  await t.click('.editor-panel-body [data-action="motion-mine-save"]');
  t.check('★ To my animations keeps it in this browser', !!(await t.eval(`JSON.parse(localStorage.getItem('presentation-editor.myAnimations') || '{}')['bounce-in']?.keyframes?.length`)));
  await e.insert('circle');
  await e.tab('animations');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="motion-mine"][data-mine="bounce-in"]')`, { label: 'Mine row' });
  await t.click('.editor-panel-body [data-action="motion-mine"][data-mine="bounce-in"]');
  await t.waitFor(`${sel}?.getAttribute('data-animation')?.startsWith('bounce-in')`, { label: 'applied' }).catch(() => {});
  t.check('a click on one of Mine gives the element that animation (one undo step)', /^bounce-in/.test(await t.eval(`${sel}?.getAttribute('data-animation') || ''`)));
  await e.undo();
  await t.waitFor(`!${sel}?.hasAttribute('data-animation')`).catch(() => {});
  t.check('…undo takes it off again', !(await t.eval(`${sel}?.hasAttribute('data-animation')`)));
  await t.eval(`window.__nextFile = new File([JSON.stringify({ format: 'presentation-animations', animations: { 'soft-drop': { duration: 900, keyframes: [{ at: 0, y: -40, opacity: 0 }, { at: 100, y: 0, opacity: 1 }] }, broken: { keyframes: 'no' } } })], 'my-animations.json', { type: 'application/json' }); true`);
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-mine-import"]');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-mine="soft-drop"]')`, { label: 'imported' }).catch(() => {});
  t.check('Import adds the animations of a file (and leaves out what is no animation)', await t.eval(`(() => { const list = JSON.parse(localStorage.getItem('presentation-editor.myAnimations') || '{}'); return !!list['soft-drop'] && !list.broken; })()`));
  await t.click('.editor-panel-body [data-action="motion-mine-remove"][data-mine="soft-drop"]');
  await t.waitFor(`!document.querySelector('.editor-panel-body [data-mine="soft-drop"]')`).catch(() => {});
  t.check('× removes one from your animations', !(await t.eval(`!!JSON.parse(localStorage.getItem('presentation-editor.myAnimations') || '{}')['soft-drop']`)));

  // v70: ready ways (◯ Circle: back where it started) and ⇄ Reverse (a rise-in plays backwards: in ↔ out)
  const keyRows = () => t.eval(`[...document.querySelectorAll('.editor-keyframe-table tbody tr')].map(r => ({ at: Number(r.querySelector('[data-key="at"]').value), x: Number(r.querySelector('[data-key="x"]').value || 0), y: Number(r.querySelector('[data-key="y"]').value || 0), opacity: r.querySelector('[data-key="opacity"]').value, ease: r.querySelector('select')?.value || '' }))`);
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-shape"][data-shape="circle"]');
  await t.waitFor(`${sel}?.getAttribute('data-animation')?.startsWith('path-')`, { label: 'circle' }).catch(() => {});
  await e.tab('element');
  await t.waitFor(`document.querySelectorAll('.editor-keyframe-table tbody tr').length > 10`, { label: 'circle keys' }).catch(() => {});
  const circle = await keyRows();
  const far = circle.reduce((best, row) => Math.max(best, Math.hypot(row.x, row.y)), 0);
  t.check('◯ Circle: a way of its own that goes round (320 px across) and ends where it started', circle.length === 25 && circle[24].at === 100 && Math.abs(circle[24].x) <= 1 && Math.abs(circle[24].y) <= 1 && Math.abs(far - 320) <= 2, JSON.stringify([circle.length, circle[24], far]));
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-quick"][data-preset="rise"]');
  await t.waitFor(`${sel}?.getAttribute('data-animation') === 'rise'`, { label: 'rise' }).catch(() => {});
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="motion-reverse"]')`, { label: 'reverse button' }).catch(() => {});
  await t.click('.editor-panel-body [data-action="motion-reverse"]');
  await t.waitFor(`${sel}?.getAttribute('data-animation')?.startsWith('reversed-')`, { label: 'reversed' }).catch(() => {});
  await e.tab('element');
  await t.waitFor(`document.querySelectorAll('.editor-keyframe-table tbody tr').length >= 2`).catch(() => {});
  const reversed = await keyRows();
  t.check('⇄ Reverse: a copy of the ready-made rise that sinks away (keyframes the other way round)', /^reversed-/.test(await t.eval(`${sel}?.getAttribute('data-animation') || ''`)) && reversed[0].at === 0 && reversed[0].opacity === '1' && reversed[reversed.length - 1].opacity === '0' && reversed[reversed.length - 1].y === 40, JSON.stringify(reversed));
  await e.undo();
  await t.waitFor(`${sel}?.getAttribute('data-animation') === 'rise'`).catch(() => {});
  t.check('…one undo step back to the rise', (await t.eval(`${sel}?.getAttribute('data-animation')`)) === 'rise');

  // v71: Jelly (stretch: Width × / Height ×), + property Slant, smart duplicate (Ctrl+D goes as far again as you moved the copy)
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-quick"][data-preset="jelly"]');
  await t.waitFor(`${sel}?.getAttribute('data-animation') === 'jelly'`, { label: 'jelly' }).catch(() => {});
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-keyframe-table [data-key="scaleX"]')`, { label: 'stretch columns' }).catch(() => {});
  t.check('Jelly: squash and stretch (Width × and Height × in the keyframe table)', await t.eval(`!!document.querySelector('.editor-keyframe-table [data-key="scaleX"]') && !!document.querySelector('.editor-keyframe-table [data-key="scaleY"]') && !document.querySelector('.editor-keyframe-table [data-key="skew"]')`));
  await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-anim-add-property]'); f.value = 'skew'; f.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await t.waitFor(`!!document.querySelector('.editor-keyframe-table [data-key="skew"]')`, { label: 'slant' }).catch(() => {});
  t.check('+ property Slant: a column of its own (0 in every keyframe)', await t.eval(`[...document.querySelectorAll('.editor-keyframe-table [data-key="skew"]')].every(f => f.value === '0') && document.querySelectorAll('.editor-keyframe-table [data-key="skew"]').length === 6`));
  await e.undo(); await e.undo();
  const pos = () => t.eval(`(() => { const el = ${sel}; return { x: parseFloat(el.style.getPropertyValue('--x')), y: parseFloat(el.style.getPropertyValue('--y')) }; })()`);
  const original = await pos();
  await t.key('d', 'KeyD', 68, 2);
  await t.waitFor(`(() => { const el = ${sel}; return parseFloat(el.style.getPropertyValue('--x')) !== ${original.x}; })()`, { label: 'duplicated' }).catch(() => {});
  const box = await t.eval(`(() => { const r = ${sel}.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await t.drag(box, 120, 40, { steps: 6 });
  const moved = await pos();
  await t.key('d', 'KeyD', 68, 2);
  await t.waitFor(`(() => { const el = ${sel}; return Math.abs(parseFloat(el.style.getPropertyValue('--x')) - ${moved.x}) > 1; })()`, { label: 'smart duplicate' }).catch(() => {});
  const third = await pos();
  t.check('smart duplicate: the next Ctrl+D goes as far again as the copy was moved', Math.abs((third.x - moved.x) - (moved.x - original.x)) <= 1 && Math.abs((third.y - moved.y) - (moved.y - original.y)) <= 1 && moved.x - original.x > 60, JSON.stringify([original, moved, third]));

  // v73: Style: shadow, corners, letter spacing; one element lined up on the slide (centre, then middle; Right at the margin)
  await e.tab('element');
  await e.panelSet('[data-tool-field="shadow"]', 'drop-shadow(0 6px 14px rgb(0 0 0 / .35))');
  await t.waitFor(`(${sel}?.getAttribute('style') || '').includes('--element-shadow')`, { label: 'shadow' }).catch(() => {});
  t.check('Shadow Soft: a drop shadow that follows the shape (--element-shadow, its filter)', await t.eval(`(() => { const el = ${sel}; return /drop-shadow/.test(el.style.getPropertyValue('--element-shadow')) && /drop-shadow/.test(getComputedStyle(el).filter); })()`));
  // (v165: a shape without words has no text choices, such as letter spacing, and, as it draws itself, no Corners)
  t.check('A shape without words: no letter spacing, no Corners', await t.eval(`!document.querySelector('.editor-panel-body [data-tool-field="letterSpacing"]') && !document.querySelector('.editor-panel-body [data-tool-field="borderRadius"]')`));
  await e.panelSet('[data-tool-field="shadow"]', '');
  await t.waitFor(`!(${sel}?.getAttribute('style') || '').includes('filter')`).catch(() => {});
  t.check('Shadow None: the shadow and its filter are gone', await t.eval(`!(${sel}?.getAttribute('style') || '').includes('shadow') && getComputedStyle(${sel}).filter === 'none'`));
  const centreOf = () => t.eval(`(() => { const s = document.querySelector('.editor-stage .scene').getBoundingClientRect(), r = ${sel}.getBoundingClientRect(), k = s.width / 1600; return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k, right: (r.right - s.left) / k }; })()`);
  await t.click('.editor-panel-body .editor-align-slide [data-action="align-centre"]');
  await t.click('.editor-panel-body .editor-align-slide [data-action="align-middle"]');
  await t.waitFor(`(() => { const s = document.querySelector('.editor-stage .scene').getBoundingClientRect(), r = ${sel}.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - s.left - s.width / 2) < 3 && Math.abs(r.top + r.height / 2 - s.top - s.height / 2) < 3; })()`, { label: 'centred' }).catch(() => {});
  const centred = await centreOf();
  t.check('one element: ↔ Centre and ↕ Middle put it in the middle of the slide', Math.abs(centred.x - 800) <= 2 && Math.abs(centred.y - 450) <= 2, JSON.stringify(centred));
  await t.click('.editor-panel-body .editor-align-slide [data-action="align-right"]');
  await t.waitFor(`(() => { const s = document.querySelector('.editor-stage .scene').getBoundingClientRect(), r = ${sel}.getBoundingClientRect(); return Math.abs((r.right - s.left) / (s.width / 1600) - 1536) < 3; })()`, { label: 'right' }).catch(() => {});
  t.check('⇥ Right: at the slide\'s right margin (64 px in)', Math.abs((await centreOf()).right - 1536) <= 2, JSON.stringify(await centreOf()));

  // v74: the motion path: a double-click on its line adds a keyframe, one on a dot removes it; 〰 Smooth makes a curve
  await t.click('.editor-panel-body .editor-align-slide [data-action="align-bottom"]');   // (its way over an empty part of the slide)
  await t.eval(`new Promise(r => setTimeout(r, 300))`);
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-quick"][data-preset="slide-from-left"]');
  await t.waitFor(`${sel}?.getAttribute('data-animation') === 'slide-from-left' && !!document.querySelector('.editor-motion-path polyline')`, { label: 'path shown' }).catch(() => {});
  const quickDiag = await t.eval(`(${sel}?.getAttribute('data-animation') || '-') + ' | toast: ' + (document.querySelector('.toast')?.textContent || '') + ' | buttons: ' + document.querySelectorAll('.editor-panel-body [data-action="motion-quick"][data-preset="slide-from-left"]').length + ' | sel: ' + !!${sel} + ' | tab: ' + document.querySelector('.editor-tabs [aria-selected="true"]')?.dataset.tab`);
  if (!quickDiag.startsWith('slide-from-left')) t.check('DIAG quick animation applied', false, quickDiag);
  const lineAt = share => t.eval(`(() => { const pts = document.querySelector('.editor-motion-path polyline').getAttribute('points').split(' ').map(p => p.split(',').map(Number)); const s = document.querySelector('.editor-stage .scene').getBoundingClientRect(), k = s.width / 1600; const [a, b] = [pts[0], pts[pts.length - 1]]; return { x: s.left + (a[0] + (b[0] - a[0]) * ${share}) * k, y: s.top + (a[1] + (b[1] - a[1]) * ${share}) * k }; })()`);
  const doubleClick = async point => { await t.mouse('mousePressed', point.x, point.y); await t.mouse('mouseReleased', point.x, point.y); await t.mouse('mousePressed', point.x, point.y, { clickCount: 2 }); await t.mouse('mouseReleased', point.x, point.y, { clickCount: 2 }); };
  const keyCount = () => t.eval(`document.querySelectorAll('.editor-motion-path .motion-dot').length`);
  const dots0 = await keyCount();
  // (under load the quick animation's preview may still be moving it: the point on the line is taken once it is still)
  await t.waitFor(`!(${sel}?.getAnimations() || []).some(a => a.playState === 'running')`, { label: 'preview done', timeout: 5000 }).catch(() => {});
  await t.eval('new Promise(r => setTimeout(r, 400))');   // (the path settles on the canvas first: a double-click right away raced it under load)
  // (a spot of the line outside the element and its handles, 14 px around it; the size of the slide on screen depends on
  // the window. Another element under that spot would take a real double-click, by design: then the double-click is
  // sent to the path itself)
  const spotCheck = (spot, free) => t.eval(`(() => { const r = ${sel}.getBoundingClientRect(), x = ${spot.x}, y = ${spot.y}; if (x > r.left - 14 && x < r.right + 14 && y > r.top - 14 && y < r.bottom + 14) return false; if (!${free}) return true; const top = document.elementFromPoint(x, y); return !!top && !top.closest('.editor-handle, .editor-move, .editor-rotate') && (!!top.closest('.editor-motion-path') || top === document.querySelector('.editor-stage .scene') || !top.closest('.editor-stage .scene')); })()`);
  let share = null, clear = false;
  for (const candidate of [0.2, 0.12, 0.06, 0.3, 0.4]) if (await spotCheck(await lineAt(candidate), true)) { share = candidate; clear = true; break; }
  if (share === null) for (const candidate of [0.2, 0.12, 0.06, 0.3, 0.4]) if (await spotCheck(await lineAt(candidate), false)) { share = candidate; break; }
  if (share === null) share = 0.1;
  let point = await lineAt(share);
  for (let i = 0; i < 20; i++) { await t.eval('new Promise(r => setTimeout(r, 100))'); const again = await lineAt(share); if (Math.abs(again.x - point.x) < 0.5 && Math.abs(again.y - point.y) < 0.5) break; point = again; }
  const pathDoubleClick = async spot => {
    if (clear) await doubleClick(spot);
    else await t.eval(`document.querySelector('.editor-motion-path').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: ${spot.x}, clientY: ${spot.y}, detail: 2 }))`);
  };
  await pathDoubleClick(point);
  await t.waitFor(`document.querySelectorAll('.editor-motion-path .motion-dot').length === ${dots0 + 1}`, { label: 'point added' }).catch(() => {});
  t.check('a double-click on the motion path adds a keyframe there (the element stays selected)', (await keyCount()) === dots0 + 1 && (await t.eval(`!!${sel}`)), JSON.stringify([dots0, await keyCount(), point, await t.eval(`(() => { const p = ${JSON.stringify(point)}; const top = document.elementFromPoint(p.x, p.y); const r = ${sel}?.getBoundingClientRect(); return { top: top && (top.tagName + '.' + top.className.baseVal !== undefined ? top.tagName + ' ' + (top.getAttribute('class') || '') : top.className), active: document.activeElement?.tagName + ' ' + (document.activeElement?.className || ''), box: r && [r.left, r.top, r.width, r.height].map(Math.round), path: document.querySelector('.editor-motion-path polyline')?.getAttribute('points'), anim: ${sel}?.getAttribute('data-animation') }; })()`)]));
  await e.tab('animations');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="motion-smooth"]')`, { label: 'smooth button' }).catch(() => {});
  await t.click('.editor-panel-body [data-action="motion-smooth"]');
  await t.waitFor(`document.querySelectorAll('.editor-motion-path .motion-dot').length > ${dots0 + 2}`, { label: 'smoothed' }).catch(() => {});
  const smoothed = await keyCount();
  t.check('〰 Smooth: more keyframes along a curve', smoothed > dots0 + 2, String(smoothed));
  await e.undo();
  await t.waitFor(`document.querySelectorAll('.editor-motion-path .motion-dot').length === ${dots0 + 1}`).catch(() => {});
  const pathDot = await t.eval(`(() => { const d = document.querySelector('.editor-motion-path .motion-dot[data-index="1"]').getBoundingClientRect(); return { x: d.left + d.width / 2, y: d.top + d.height / 2 }; })()`);
  await doubleClick(pathDot);
  await t.waitFor(`document.querySelectorAll('.editor-motion-path .motion-dot').length === ${dots0}`, { label: 'point removed' }).catch(() => {});
  t.check('a double-click on a dot removes that keyframe', (await keyCount()) === dots0, String(await keyCount()));

  // v75: an animation's turning point ("origin"): Swing hangs from its top; the field changes it; the element's own rotation is left alone
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-quick"][data-preset="swing"]');
  await t.waitFor(`${sel}?.getAttribute('data-animation') === 'swing'`, { label: 'swing' }).catch(() => {});
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-anim-field="origin"]')`, { label: 'origin field' }).catch(() => {});
  t.check('Swing turns around its top (the animation\'s origin), the element keeps its own turning point', (await t.eval(`document.querySelector('.editor-panel-body [data-anim-field="origin"]').value`)) === 'center top' && !(await t.eval(`${sel}?.style.transformOrigin`)));
  await t.click('.editor-panel-body [data-action="preview-animation"]');
  const swingKeys = await t.eval(`(${sel}?.getAnimations() || []).map(a => a.effect.getKeyframes().map(k => k.transform).join('|')).join('||')`);
  t.check('…it turns there: translate(0%, -50%) before the turn, back after', /translate\(0%, -50%\).*rotate\(14deg\) translate\(0%, 50%\)/.test(swingKeys), swingKeys);
  await e.panelSet('[data-anim-field="origin"]', 'left bottom');
  await t.waitFor(`document.querySelector('.editor-panel-body [data-anim-field="origin"]')?.value === 'left bottom'`, { label: 'origin changed' }).catch(() => {});
  t.check('Turns and grows from: another corner for the animation', (await t.eval(`document.querySelector('.editor-panel-body [data-anim-field="origin"]').value`)) === 'left bottom');

  // v76: Opacity (Style): --element-opacity, shown on the slide; 100 % again: gone
  await e.panelSet('[data-tool-field="opacity"]', '.4');
  await t.waitFor(`Math.abs(parseFloat(getComputedStyle(${sel}).opacity) - .4) < .01`, { label: 'opacity' }).catch(() => {});
  t.check('Opacity 40 %: --element-opacity in its style, shown on the slide', (await t.eval(`${sel}?.style.getPropertyValue('--element-opacity')`)) === '.4' && Math.abs((await t.eval(`parseFloat(getComputedStyle(${sel}).opacity)`)) - .4) < .01);
  await e.panelSet('[data-tool-field="opacity"]', '');
  await t.waitFor(`!(${sel}?.getAttribute('style') || '').includes('--element-opacity')`).catch(() => {});
  t.check('…100 %: gone again', !(await t.eval(`(${sel}?.getAttribute('style') || '').includes('--element-opacity')`)) && (await t.eval(`getComputedStyle(${sel}).opacity`)) === '1');

  // v77: Ctrl+A selects every element placed freely on the slide; Esc ends it
  await e.blur();
  await t.key('a', 'KeyA', 65, 2);
  await t.waitFor(`document.querySelectorAll('.editor-group-box').length >= 2`, { label: 'select all' }).catch(() => {});
  const freeCount = await t.eval(`[...document.querySelectorAll('.editor-stage .scene .is-free')].filter(el => !el.parentElement.closest('.is-free') && el.getClientRects().length).length`);
  t.check('Ctrl+A: every freely placed element on the slide is selected', freeCount >= 2 && (await t.eval(`document.querySelectorAll('.editor-group-box').length`)) === freeCount, JSON.stringify([freeCount, await t.eval(`document.querySelectorAll('.editor-group-box').length`)]));
  await t.click('.editor-panel-body [data-action="same-width"]');
  await t.waitFor(`(() => { const w = [...document.querySelectorAll('.editor-stage .scene .is-free')].filter(el => !el.parentElement.closest('.is-free') && !el.hasAttribute('data-group') && el.getClientRects().length).map(el => el.offsetWidth); return w.every(x => Math.abs(x - w[0]) <= 1); })()`, { label: 'same width' }).catch(() => {});
  t.check('↔ Same width: they all get the width of the first one', await t.eval(`(() => { const first = document.querySelector('.editor-stage .is-editor-selected'); return [...document.querySelectorAll('.editor-stage .scene .is-free')].filter(el => !el.parentElement.closest('.is-free') && !el.hasAttribute('data-group') && el.getClientRects().length).every(el => Math.abs(el.offsetWidth - first.offsetWidth) <= 1); })()`));
  await e.undo();
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`document.querySelectorAll('.editor-group-box').length === 0`).catch(() => {});
  t.check('…Esc: none selected any more', (await t.eval(`document.querySelectorAll('.editor-group-box').length`)) === 0);

  // v78: Brightness and Hue as keyframe properties (in the filter, with blur); Flash lights the element up
  await e.pick('.editor-stage .scene .shape[data-shape="rect"]');
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-quick"][data-preset="flash"]');
  await t.waitFor(`${sel}?.getAttribute('data-animation') === 'flash'`, { label: 'flash' }).catch(() => {});
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-keyframe-table [data-key="brightness"]')`, { label: 'brightness column' }).catch(() => {});
  t.check('Flash: a Brightness × column in the keyframe table', await t.eval(`!!document.querySelector('.editor-keyframe-table [data-key="brightness"]') && !document.querySelector('.editor-keyframe-table [data-key="hue"]')`));
  await t.click('.editor-panel-body [data-action="preview-animation"]');
  const flashKeys = await t.eval(`(${sel}?.getAnimations() || []).map(a => a.effect.getKeyframes().map(k => k.filter).join('|')).join('||')`);
  t.check('…it plays as filter: brightness(2.2) (no blur part)', /brightness\(2\.2\)/.test(flashKeys) && !/(^|[ |])blur\(/.test(flashKeys), flashKeys);
  await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-anim-add-property]'); f.value = 'hue'; f.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await t.waitFor(`!!document.querySelector('.editor-keyframe-table [data-key="hue"]')`, { label: 'hue' }).catch(() => {});
  t.check('+ property Hue: a colour shift column (0 in every keyframe)', await t.eval(`[...document.querySelectorAll('.editor-keyframe-table [data-key="hue"]')].length === 5`));
  await e.undo(); await e.undo();

  // v79: more shapes in Insert; check and cross are lines (a thickness, no fill)
  for (const kind of ['diamond', 'hexagon', 'heart', 'chevron', 'check', 'cross']) {
    await e.insert(kind);
    t.check(`Insert ${kind}: a shape that draws itself`, await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return el?.dataset.shape === '${kind}' && el.querySelector('svg').getBoundingClientRect().width > 20; })()`));
  }
  await e.tab('element');
  t.check('a check mark has a thickness, no fill', await t.eval(`!document.querySelector('.editor-panel-body [data-tool-field="shapeFill"]') && !!document.querySelector('.editor-panel-body [data-tool-field="shapeStroke"]')`));
  for (let i = 0; i < 6; i++) await e.undo();

  // v79: a progress bar block: Filled (%) sets the bar and the number next to it
  await e.insert('progress');
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="progress"]')`, { label: 'progress field' }).catch(() => {});
  await e.panelSet('[data-element-field="progress"]', '40');
  await t.waitFor(`document.querySelector('.editor-stage .scene .progress')?.style.getPropertyValue('--value') === '40%'`, { label: 'progress 40' }).catch(() => {});
  t.check('Progress bar: Filled 40 % sets the bar (--value) and its number', await t.eval(`(() => { const p = document.querySelector('.editor-stage .scene .progress'); return p.style.getPropertyValue('--value') === '40%' && p.querySelector('.progress-value').textContent === '40 %' && Math.abs(p.querySelector('.progress-fill').offsetWidth / p.querySelector('.progress-track').offsetWidth - .4) < .02; })()`));
  await e.undo(); await e.undo();

  // v80: 🖍 Marker from the text bar; Text fill: a gradient through the letters
  await e.pick('.editor-stage .scene .content > h2');
  await t.eval(`(() => { const h = document.querySelector('.editor-stage .scene .content > h2'); h.focus(); const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) { const at = node.nodeValue.indexOf('numbers'); if (at >= 0) { const r = document.createRange(); r.setStart(node, at); r.setEnd(node, at + 7); getSelection().removeAllRanges(); getSelection().addRange(r); return true; } } return false; })()`);
  await t.waitFor(`document.querySelector('.editor-textbar') && !document.querySelector('.editor-textbar').hidden`, { label: 'text bar' }).catch(() => {});
  await t.click('.editor-textbar [data-action="text-marker"]');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene .content > h2 .marker')`, { label: 'marker' }).catch(() => {});
  t.check('🖍 Marker: a highlighter stroke behind the selected words', /<span class="marker">numbers<\/span>/.test(await e.modelHtml()));
  await e.undo();
  await e.pick('.editor-stage .scene .content > h2');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-tool-field="textGradient"]', 'linear-gradient(90deg, var(--color-accent), var(--color-teal))');
  await t.waitFor(`/--text-gradient/.test(document.querySelector('.editor-stage .scene .content > h2').getAttribute('style') || '')`, { label: 'text fill' }).catch(() => {});
  t.check('Text fill: a gradient through the letters', await t.eval(`(() => { const h = document.querySelector('.editor-stage .scene .content > h2'), cs = getComputedStyle(h); return /gradient/.test(cs.backgroundImage) && cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)'; })()`));
  await e.undo();

  // v81: a list's Bullets (numbers); a label (a text in a badge)
  await e.insert('list');
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="bullets"]')`, { label: 'bullets field' }).catch(() => {});
  await e.panelSet('[data-element-field="bullets"]', 'number');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene .big-list[data-bullets="number"]')`, { label: 'numbers' }).catch(() => {});
  t.check('Bullets: Numbers (1 2 3 before the points)', await t.eval(`(() => { const li = document.querySelector('.editor-stage .scene .big-list[data-bullets="number"] li:nth-child(2)'); return !!li && getComputedStyle(li, '::before').content.includes('counter') || /^"?2"?$/.test(getComputedStyle(li, '::before').content); })()`));
  await e.undo(); await e.undo();
  await e.insert('label');
  t.check('Insert a label: a text in a badge, ready to type in', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return !!el && el.matches('.label-box') && getComputedStyle(el).borderRadius !== '0px' && document.activeElement === el; })()`));
  await e.blur();
  await e.undo();

  // v82: a table: + Row and + Column at the selected cell, − Row
  await e.insert('table');
  await e.pick('.editor-stage .scene table.data-table tbody tr:first-child td:nth-child(2)');
  await e.blur();
  await e.tab('element');
  const tableSize = () => t.eval(`(() => { const tb = document.querySelector('.editor-stage .scene table.data-table'); return tb ? [tb.rows.length, tb.rows[0].cells.length] : null; })()`);
  await t.click('.editor-panel-body [data-action="table-add-row"]');
  await t.waitFor(`document.querySelector('.editor-stage .scene table.data-table').rows.length === 4`, { label: 'row added' }).catch(() => {});
  await t.click('.editor-panel-body [data-action="table-add-column"]');
  await t.waitFor(`document.querySelector('.editor-stage .scene table.data-table').rows[0].cells.length === 4`, { label: 'column added' }).catch(() => {});
  t.check('Table: + Row and + Column (4 rows, 4 columns, the cells typeable)', JSON.stringify(await tableSize()) === '[4,4]' && await t.eval(`[...document.querySelectorAll('.editor-stage .scene table.data-table td')].every(td => td.isContentEditable)`), JSON.stringify(await tableSize()));
  await t.click('.editor-panel-body [data-action="table-remove-row"]');
  await t.waitFor(`document.querySelector('.editor-stage .scene table.data-table').rows.length === 3`).catch(() => {});
  t.check('− Row: one row less', JSON.stringify(await tableSize()) === '[3,4]', JSON.stringify(await tableSize()));
  // v83: the rows one per click; ★ highlight a row
  await e.pick('.editor-stage .scene table.data-table tbody tr:first-child td:first-child');
  await e.blur();
  await e.tab('element');
  await t.click('.editor-panel-body [data-action="table-rows-clicks"]');
  await t.waitFor(`[...document.querySelectorAll('.editor-stage .scene table.data-table tbody tr')].every(r => r.hasAttribute('data-reveal-step'))`, { label: 'rows on clicks' }).catch(() => {});
  t.check('the rows appear one per click (each its own click, in order)', await t.eval(`(() => { const steps = [...document.querySelectorAll('.editor-stage .scene table.data-table tbody tr')].map(r => Number(r.getAttribute('data-reveal-step'))); return steps.length >= 2 && steps.every((s, i) => i === 0 || s === steps[i - 1] + 1); })()`));
  await e.pick('.editor-stage .scene table.data-table tbody tr:last-child td:first-child');
  await e.blur();
  await e.tab('element');
  await t.click('.editor-panel-body [data-action="table-add-row"]');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene table.data-table tbody tr').length === 3`, { label: 'row after clicks' }).catch(() => {});
  t.check('+ Row after rows on clicks: the new row gets the next click', await t.eval(`(() => { const steps = [...document.querySelectorAll('.editor-stage .scene table.data-table tbody tr')].map(r => Number(r.getAttribute('data-reveal-step'))); return steps.length === 3 && steps.every((s, i) => s > 0 && (i === 0 || s === steps[i - 1] + 1)); })()`));
  await e.pick('.editor-stage .scene table.data-table tbody tr:first-child td:first-child');
  await e.blur();
  await e.tab('element');
  await t.click('.editor-panel-body [data-action="table-highlight-row"]');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene table.data-table tbody tr.is-highlight')`, { label: 'highlight' }).catch(() => {});
  t.check('★ Highlight this row', await t.eval(`!!document.querySelector('.editor-stage .scene table.data-table tbody tr:first-child.is-highlight')`));
  for (let i = 0; i < 8; i++) await e.undo();

  // v84: an image's Look (black and white) and the slow zoom (Ken Burns)
  await e.insert('image');
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-tool-field="imageLook"]')`, { label: 'look field' }).catch(() => {});
  await e.panelSet('[data-tool-field="imageLook"]', 'grayscale(1)');
  await t.waitFor(`/grayscale/.test(getComputedStyle(document.querySelector('.editor-stage .is-editor-selected img, .editor-stage img.is-editor-selected')).filter)`, { label: 'gray' }).catch(() => {});
  t.check('Look: black and white (a filter on the picture)', await t.eval(`/grayscale\\(1\\)/.test(getComputedStyle(document.querySelector('.editor-stage .is-editor-selected img, .editor-stage img.is-editor-selected')).filter)`));
  await e.panelSet('[data-tool-field="kenBurns"]', '');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene img[data-ken-burns]')`, { label: 'ken burns' }).catch(() => {});
  t.check('Slow zoom (Ken Burns) on the picture in its frame', await t.eval(`!!document.querySelector('.editor-stage .scene .image-frame > img[data-ken-burns]')`));
  // v123: its way: gliding to the left
  await e.panelSet('[data-tool-field="kenBurns"]', 'left');
  await t.waitFor(`document.querySelector('.editor-stage .scene .image-frame > img[data-ken-burns]')?.getAttribute('data-ken-burns') === 'left'`, { label: 'ken burns left' }).catch(() => {});
  t.check('Ken Burns: Gliding to the left (data-ken-burns="left"; its own keyframes)', await t.eval(`document.querySelector('.editor-stage .scene .image-frame > img[data-ken-burns]')?.getAttribute('data-ken-burns') === 'left' && [...document.styleSheets].some(sheet => { try { return [...sheet.cssRules].some(rule => rule.name === 'ken-burns-left'); } catch (e) { return false; } })`));
  for (let i = 0; i < 4; i++) await e.undo();

  // v85: a slide background gradient (Slide tab)
  await e.blur();
  await t.key('Escape', 'Escape', 27);
  await e.tab('slide');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-tool-field="backgroundGradient"]')`, { label: 'gradient field' }).catch(() => {});
  await e.panelSet('[data-tool-field="backgroundGradient"]', 'radial-gradient(ellipse at center, transparent 45%, rgb(0 0 0 / .55))');
  await t.waitFor(`/radial-gradient/.test(getComputedStyle(document.querySelector('.editor-stage .scene')).backgroundImage)`, { label: 'gradient shown' }).catch(() => {});
  t.check('Slide › Transition offers rise, blur and flip', await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-slide-field="transition"]'); return !!f && ['rise', 'blur', 'flip'].every(v => [...f.options].some(o => o.value === v)); })()`));
  t.check('Slide › Gradient: a vignette over the background', /radial-gradient/.test(await t.eval(`getComputedStyle(document.querySelector('.editor-stage .scene')).backgroundImage`)));
  await e.undo();

  // v86: a footer on every slide (a text and the slide number); never in the file's slides
  await e.tab('deck');
  await e.panelSet('[data-deck-field="footer"]', 'both');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-deck-field="footerText"]')`, { label: 'footer text field' }).catch(() => {});
  await e.panelSet('[data-deck-field="footerText"]', 'Q1 2026');
  await t.waitFor(`/Q1 2026/.test(document.querySelector('.editor-stage .scene > .slide-footer')?.textContent || '')`, { label: 'footer shown' }).catch(() => {});
  t.check('Footer: "Q1 2026 · 4" at the bottom of the slide (canvas)', /^Q1 2026\s+·\s+\d+$/.test(await t.eval(`document.querySelector('.editor-stage .scene > .slide-footer')?.textContent || ''`)), await t.eval(`document.querySelector('.editor-stage .scene > .slide-footer')?.textContent || ''`));
  t.check('…the file keeps only the setting (data-footer on the deck), no footer in its slides', !/slide-footer/.test(await e.modelHtml()));
  await e.undo(); await e.undo();
  await t.waitFor(`!document.querySelector('.editor-stage .scene > .slide-footer')`, { label: 'footer undone' }).catch(() => {});
  t.check('…two Undo steps take the footer away again', await t.eval(`!document.querySelector('.editor-stage .scene > .slide-footer')`));

  // v87: a count-up with a thousands separator
  await e.insert('numbers');
  await e.pick('.editor-stage .scene .stats .stat .count-up');
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="countSeparator"]')`, { label: 'separator field' }).catch(() => {});
  await e.panelSet('[data-element-field="countUp"]', '12500');
  await e.panelSet('[data-element-field="countSeparator"]', ',');
  await t.waitFor(`[...document.querySelectorAll('.editor-stage .scene .stats .count-up')].some(n => n.textContent === '12,500')`, { label: '12,500' }).catch(() => {});
  t.check('Count-up: 12500 with the thousands separator shows 12,500 (data-separator)', await t.eval(`[...document.querySelectorAll('.editor-stage .scene .stats .count-up')].some(n => n.textContent === '12,500' && n.dataset.separator === ',')`));
  for (let i = 0; i < 3; i++) await e.undo();

  // v88: a progress ring: Filled (%) sets the circle and the number
  await e.insert('ring');
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="progress"]')`, { label: 'ring field' }).catch(() => {});
  await e.panelSet('[data-element-field="progress"]', '35');
  await t.waitFor(`document.querySelector('.editor-stage .scene .progress-ring .ring-fill')?.getAttribute('stroke-dasharray') === '35 100'`, { label: 'ring 35' }).catch(() => {});
  t.check('Progress ring: Filled 35 % sets the circle (35 of 100) and the number', await t.eval(`(() => { const r = document.querySelector('.editor-stage .scene .progress-ring'); return r.querySelector('.ring-fill').getAttribute('stroke-dasharray') === '35 100' && r.querySelector('.progress-value').textContent === '35 %' && r.style.getPropertyValue('--value') === '35'; })()`));
  await e.undo(); await e.undo();

  // v88: two columns, side by side
  await e.insert('columns');
  t.check('Two columns: side by side, each with a heading and a text', await t.eval(`(() => { const c = [...document.querySelectorAll('.editor-stage .scene .columns .column')]; return c.length === 2 && c[0].getBoundingClientRect().right <= c[1].getBoundingClientRect().left && !!c[0].querySelector('h3') && c[1].querySelector('p').isContentEditable; })()`));
  await e.undo();

  // v89: process steps and a roadmap
  await e.insert('roadmap');
  t.check('Roadmap: four milestones side by side, each with a date and a title (typeable)', await t.eval(`(() => { const items = [...document.querySelectorAll('.editor-stage .scene .roadmap li')]; return items.length === 4 && items.every(li => li.querySelector('time') && li.querySelector('b').isContentEditable) && items[0].getBoundingClientRect().right <= items[1].getBoundingClientRect().left + 1; })()`));
  await e.undo();
  await e.insert('steps');
  t.check('Process steps: four numbered cards', (await t.eval(`document.querySelectorAll('.editor-stage .scene .process-steps li').length`)) === 4);
  await e.undo();

  // v90: a shape that draws itself in
  await e.insert('star');
  await e.tab('element');
  await t.click('.editor-panel-body [data-tool-field="shapeDraw"]');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene .shape[data-draw]')`, { label: 'draw' }).catch(() => {});
  t.check('Draws itself in: data-draw on the shape; at rest its outline is whole (no dashes)', await t.eval(`(() => { const p = document.querySelector('.editor-stage .scene .shape[data-shape="star"][data-draw] polygon'); return !!p && getComputedStyle(p).strokeDasharray === 'none'; })()`));
  await e.tab('animations');
  await t.eval(`document.querySelector('[data-action="play-slide"]').click(); true`);
  await t.waitFor(`+getComputedStyle(document.querySelector('.editor-stage .scene .shape[data-draw] polygon')).getPropertyValue('--draw-length') > 100`, { label: 'measured' }).catch(() => {});
  t.check('…▶ Play measures each line on the slide (--draw-length in slide px, well over 100)', (await t.eval(`+getComputedStyle(document.querySelector('.editor-stage .scene .shape[data-draw] polygon')).getPropertyValue('--draw-length')`)) > 300);
  await t.key('Escape', 'Escape', 27);
  await e.undo(); await e.undo();

  // v91: two shapes: Swap places, Arrange in a grid
  await e.insert('rect');
  await e.insert('diamond');
  await e.pick('.editor-stage .scene .shape[data-shape="rect"]');
  await e.pick('.editor-stage .scene .shape[data-shape="diamond"]', { shift: true });
  await e.tab('element');
  const middles = () => t.eval(`['rect', 'diamond'].map(k => { const r = document.querySelector('.editor-stage .scene .shape[data-shape="' + k + '"]').getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; })`);
  const swapBefore = await middles();
  await t.click('.editor-panel-body [data-action="swap-places"]');
  await t.waitFor(`(() => { const r = document.querySelector('.editor-stage .scene .shape[data-shape="rect"]').getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - ${swapBefore[1][0]}) < 3; })()`, { label: 'swapped' }).catch(() => {});
  const swapAfter = await middles();
  t.check('⇄ Swap places: their middles trade places', Math.abs(swapAfter[0][0] - swapBefore[1][0]) <= 2 && Math.abs(swapAfter[0][1] - swapBefore[1][1]) <= 2 && Math.abs(swapAfter[1][0] - swapBefore[0][0]) <= 2, JSON.stringify([swapBefore, swapAfter]));
  await e.tab('element');   // (both still selected after the swap)
  await t.click('.editor-panel-body [data-action="arrange-grid"]');
  await t.eval(`new Promise(r => setTimeout(r, 300))`);
  t.check('▦ Arrange in a grid: side by side in one row (two), the same middle height', await t.eval(`(() => { const a = document.querySelector('.editor-stage .scene .shape[data-shape="rect"]').getBoundingClientRect(), b = document.querySelector('.editor-stage .scene .shape[data-shape="diamond"]').getBoundingClientRect(); const [l, r] = a.left < b.left ? [a, b] : [b, a]; return l.right <= r.left && Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)) < 3; })()`));
  for (let i = 0; i < 4; i++) await e.undo();

  // v92: more click effects (wipe: drawn open; whole in a still copy)
  await e.insert('rect');
  await e.tab('element');
  await e.panelSet('[data-element-field="appear"]', 'click');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="effect"]')`, { label: 'effect field' }).catch(() => {});
  t.check('Click effects include rise, drop, zoom, wipe and spin', await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-element-field="effect"]'); return ['rise', 'drop', 'zoom', 'wipe', 'spin'].every(v => [...f.options].some(o => o.value === v)); })()`));
  await e.panelSet('[data-element-field="effect"]', 'wipe');
  await t.waitFor(`document.querySelector('.editor-stage .scene .shape[data-reveal-effect="wipe"]') !== null`, { label: 'wipe' }).catch(() => {});
  await t.waitFor(`getComputedStyle(document.querySelector('.editor-stage .scene .shape[data-reveal-effect="wipe"]')).clipPath === 'none'`, { timeout: 6000, label: 'preview done' }).catch(() => {});   // (the effect's preview plays first)
  t.check('…Wipes in: whole on the still canvas (no clip)', await t.eval(`getComputedStyle(document.querySelector('.editor-stage .scene .shape[data-reveal-effect="wipe"]')).clipPath === 'none'`));
  for (let i = 0; i < 3; i++) await e.undo();

  // v93: more quick animations (each a ready-made one; Unfold opens from its top)
  await e.insert('rect');
  await e.tab('animations');
  t.check('Quick animations: Unfold, Swing in, Heartbeat, Tada, Glow, To the left/right, Blur away, Shrink away', await t.eval(`['unfold', 'swing-in', 'heartbeat', 'tada', 'glow', 'slide-out-left', 'slide-out-right', 'blur-out', 'shrink-out'].every(name => !!document.querySelector('.editor-panel-body [data-action="motion-quick"][data-preset="' + name + '"]'))`));
  await t.click('.editor-panel-body [data-action="motion-quick"][data-preset="unfold"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation') === 'unfold'`, { label: 'unfold' }).catch(() => {});
  t.check('…Unfold: given to the element', (await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation')`)) === 'unfold');
  await e.undo(); await e.undo();

  // v94: Follow a shape: a label goes to the circle's outline and gets a path around it
  await e.insert('circle');
  await e.insert('label');
  await e.blur();
  await e.pick('.editor-stage .scene .label-box');
  await e.pick('.editor-stage .scene .shape[data-shape="circle"]', { shift: true });
  await e.tab('element');
  await t.click('.editor-panel-body [data-action="follow-shape"]');
  await t.waitFor(`document.querySelector('.editor-stage .scene .label-box')?.getAttribute('data-animation')?.startsWith('path-')`, { label: 'follows' }).catch(() => {});
  t.check('⟳ Follow the shape\'s outline: the label gets a path of its own around the circle, starting on the outline', await t.waitFor(`(() => { const l = document.querySelector('.editor-stage .scene .label-box'), c = document.querySelector('.editor-stage .scene .shape[data-shape="circle"]').getBoundingClientRect(), r = l.getBoundingClientRect(); const mx = r.left + r.width / 2, my = r.top + r.height / 2; return /^path-/.test(l.getAttribute('data-animation') || '') && mx > c.left + c.width * .9 && Math.abs(my - (c.top + c.height / 2)) < c.height * .1; })()`, { timeout: 12000 }).then(() => true, () => false));   // (the moment it is there: under load the redraw lags)
  for (let i = 0; i < 3; i++) await e.undo();

  // v95: a link to a slide on any element (data-goto, and coming back with Next: data-goto-back)
  await e.insert('rect');
  await e.tab('element');
  await e.panelSet('[data-element-field="linkSlide"]', 'thanks');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="linkBack"]')`, { label: 'link back field' }).catch(() => {});
  await t.click('.editor-panel-body [data-element-field="linkBack"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.hasAttribute('data-goto-back')`).catch(() => {});
  t.check('On a click while presenting: go to "thanks", and Next comes back (data-goto, data-goto-back)', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return el.getAttribute('data-goto') === 'thanks' && el.hasAttribute('data-goto-back'); })()`));
  for (let i = 0; i < 3; i++) await e.undo();

  // v96: a note for the editor on an element: outlined on the canvas, listed in the Slide tab
  await e.insert('rect');
  await e.tab('element');
  await e.panelSet('[data-element-field="authorNote"]', 'check this with the team');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-editor-note') === 'check this with the team'`, { label: 'note' }).catch(() => {});
  t.check('Note for the editor: on the element, a dashed outline on the canvas', await t.eval(`(() => { const el = document.querySelector('.editor-stage [data-editor-note]'); return !!el && getComputedStyle(el).outlineStyle === 'dashed'; })()`));
  await t.key('Escape', 'Escape', 27);
  await e.tab('slide');
  await t.waitFor(`!!document.querySelector('.editor-panel-body .editor-author-notes [data-action="select-note"]')`, { label: 'notes list' }).catch(() => {});
  t.check('…listed in the Slide tab', /check this with the team/.test(await t.eval(`document.querySelector('.editor-panel-body .editor-author-notes')?.textContent || ''`)));
  for (let i = 0; i < 2; i++) await e.undo();

  // v97: ✓ Check the presentation: a new heading still says "New heading"; Go selects it
  await e.insert('heading');
  await e.insert('table');
  await e.insert('progress');
  await e.blur();
  await e.tab('deck');
  await t.click('.editor-panel-body [data-action="check-deck"]');
  await t.waitFor(`!!document.querySelector('.editor-panel-body .editor-check-list')`, { label: 'check list' }).catch(() => {});
  const checkText = await t.eval(`document.querySelector('.editor-panel-body .editor-check-list')?.textContent || ''`);
  t.check('✓ Check the presentation: lists the placeholder text that was never replaced', /New heading/.test(checkText));
  t.check('…numbered ones with any number, a table\'s empty cells, the progress label', /Row 2/.test(checkText) && /"…"/.test(checkText) && /"Done"/.test(checkText));
  await t.eval(`[...document.querySelectorAll('.editor-panel-body [data-action="check-go"]')].find(b => /New heading/.test(b.textContent))?.setAttribute('data-test-go', ''); document.querySelector('[data-test-go]')?.scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-test-go]');
  await t.waitFor(`/New heading/.test(document.querySelector('.editor-stage .is-editor-selected')?.textContent || '')`, { label: 'go' }).catch(() => {});
  t.check('…Go selects it on the canvas (and no check mark is left in the file)', await t.eval(`/New heading/.test(document.querySelector('.editor-stage .is-editor-selected')?.textContent || '') && !document.querySelector('[data-check-target]')`));
  for (let i = 0; i < 3; i++) await e.undo();

  // v98: which part of a split text first: from the end, from the middle out, at random (the same every time)
  await e.insert('text');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-tool-field="split"]', 'word');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-tool-field="splitOrder"]')`, { label: 'split order field' }).catch(() => {});
  // the text "A line of text." (4 words), played on the canvas after each choice
  const numbersOf = async how => {
    await e.panelSet('[data-tool-field="splitOrder"]', how);
    await t.waitFor(`document.querySelector('.editor-stage .scene [data-split-order="${how}"] .split-part')`, { label: 'split ' + how }).catch(() => {});
    return t.eval(`[...document.querySelectorAll('.editor-stage .scene [data-split-order="${how}"] .split-part')].map(p => p.style.getPropertyValue('--i')).join(',')`);
  };
  const reverse = await numbersOf('reverse'), middle = await numbersOf('middle'), edges = await numbersOf('edges'), shuffled = await numbersOf('random');
  t.check('Which first: from the end 3..0, from the middle out 1,0,0,1, from both ends in 0,1,1,0 (data-split-order)', reverse === '3,2,1,0' && middle === '1,0,0,1' && edges === '0,1,1,0');
  await e.panelSet('[data-tool-field="splitOrder"]', '');
  const again = await numbersOf('random');
  t.check('…at random: each number once, shuffled the same way every time', shuffled.split(',').sort().join(',') === '0,1,2,3' && shuffled === again);
  for (let i = 0; i < 8; i++) await e.undo();

  // v99: typed with a cursor; the colours this presentation already uses
  await e.insert('text');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-tool-field="split"]', 'letter');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-tool-field="splitEffect"]')`, { label: 'split effect field' }).catch(() => {});
  await e.panelSet('[data-tool-field="splitEffect"]', 'typewriter');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene [data-split-effect="typewriter"] .split-part')`, { label: 'typewriter' }).catch(() => {});
  t.check('Typed, with a cursor: each letter appears at once and has the cursor while it is the newest (only then)', await t.eval(`(() => { const part = document.querySelector('.editor-stage .scene [data-split-effect="typewriter"] .split-part'); const cs = getComputedStyle(part); return /split-fade, split-caret/.test(cs.animationName) && /both, none/.test(cs.animationFillMode); })()`));
  await e.panelSet('[data-tool-field="split"]', 'line');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene [data-split="line"][data-split-effect="typewriter"] .split-part')`, { label: 'line typewriter' }).catch(() => {});
  t.check('…by line: one cursor per line (on its last word), not one on every word', await t.eval(`(() => { const parts = [...document.querySelectorAll('.editor-stage .scene [data-split="line"] .split-part')]; const lines = new Set(parts.map(p => p.style.getPropertyValue('--i'))); const carets = parts.filter(p => p.classList.contains('split-caret-part')); return parts.length > 1 && carets.length === lines.size && getComputedStyle(parts[0]).animationName === (carets.includes(parts[0]) ? 'split-fade, split-caret' : 'split-fade'); })()`));
  await e.panelSet('[data-tool-field="color"]', 'custom');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-tool-field="colorCustom"]')`, { label: 'own colour' }).catch(() => {});
  await e.panelSet('[data-tool-field="colorCustom"]', '#12ab34');
  await e.insert('heading');
  await e.blur();
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="use-colour"][data-colour="#12ab34"]')`, { label: 'swatch' }).catch(() => {});
  t.check('Colours in this presentation: the own colour used on the text is offered as a swatch', await t.eval(`!!document.querySelector('.editor-panel-body [data-action="use-colour"][data-colour="#12ab34"]')`));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="use-colour"][data-colour="#12ab34"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="use-colour"][data-colour="#12ab34"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.style.color === 'rgb(18, 171, 52)'`, { label: 'used colour' }).catch(() => {});
  t.check('…one click puts it on the selected heading', (await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.style.color`)) === 'rgb(18, 171, 52)');

  // v100: Dim the rest on this click: on its click the other things on the slide darken, the next click brightens them
  await e.insert('cards');
  await e.insert('heading');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-element-field="appear"]', 'click');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="focus"]')`, { label: 'focus field' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-panel-body [data-element-field="focus"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-element-field="focus"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.hasAttribute('data-focus')`, { label: 'data-focus' }).catch(() => {});
  t.check('Dim the rest on this click: data-focus on the click item', await t.eval(`!!document.querySelector('.editor-stage .is-editor-selected[data-focus][data-reveal-step]')`));
  await e.panelSet('[data-element-field="zoomIn"]', '1.6');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-zoom-in') === '1.6'`, { label: 'zoom-in' }).catch(() => {});
  t.check('Zoom in on it on this click: data-zoom-in="1.6" on the click item', (await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-zoom-in')`)) === '1.6');
  const focusStep = Number(await t.eval(`document.querySelector('.editor-stage [data-focus]').getAttribute('data-reveal-step')`));
  await t.key('Escape', 'Escape', 27);
  await e.tab('animations');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="play-slide"]').click()`);
  for (let i = 0; i < focusStep; i++) await t.eval(`document.querySelector('.editor-panel-body [data-action="play-click"]').click()`);
  await t.waitFor(`document.querySelector('.editor-stage .scene')?.classList.contains('has-focus')`, { label: 'has-focus' }).catch(() => {});
  await t.waitFor(`getComputedStyle(document.querySelector('.editor-stage > .scene')).scale === '1.6'`, { label: 'canvas zoom (after its glide)' }).catch(() => {});
  t.check('▶ Play: Zoom in on this click shows on the canvas too (the slide magnified 1.6 ×)', await t.eval(`(() => { const holder = document.querySelector('.editor-stage'); return holder.style.getPropertyValue('--step-zoom') === '1.6' && getComputedStyle(holder.querySelector(':scope > .scene')).scale === '1.6'; })()`));
  t.check('…played to its click: the slide has focus, the other things are dimmed, the item itself is not', await t.eval(`(() => { const scene = document.querySelector('.editor-stage .scene'), item = scene.querySelector('[data-focus]'); return scene.classList.contains('has-focus') && scene.querySelectorAll('.is-dimmed').length > 0 && !item.closest('.is-dimmed') && /brightness/.test(getComputedStyle(scene.querySelector('.is-dimmed')).filter); })()`));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="play-stop"]').click()`);
  await t.waitFor(`!document.querySelector('.editor-stage .scene.has-focus')`, { label: 'focus gone' }).catch(() => {});
  t.check('…not saved: the file has data-focus but no dimmed state', await t.eval(`(() => { const html = document.querySelector('.editor-stage .scene')?.outerHTML || ''; return !/has-focus|is-dimmed/.test(html); })()`));

  // v101: guides of your own: ┃ adds one across the middle, dragging moves it on the grid; undo
  const guidesNow = () => t.eval(`document.querySelectorAll('.editor-stage .editor-user-guide').length`);
  const before101 = await guidesNow();
  await t.click('.editor [data-action="guide-add-x"]');
  await t.waitFor(`document.querySelectorAll('.editor-stage .editor-user-guide.is-x').length > ${before101}`, { label: 'guide' }).catch(() => {});
  t.check('┃ adds a guide from top to bottom in the middle of the slide (data-editor-guides)', await t.eval(`[...document.querySelectorAll('.editor-stage .editor-user-guide.is-x')].some(g => g.style.left === '800px')`));
  const guideBox = await t.eval(`(() => { const r = [...document.querySelectorAll('.editor-stage .editor-user-guide.is-x')].find(g => g.style.left === '800px').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 3 }; })()`);
  await t.mouse('mouseMoved', guideBox.x, guideBox.y);
  await t.mouse('mousePressed', guideBox.x, guideBox.y, { button: 'left', buttons: 1, clickCount: 1 });
  await t.mouse('mouseMoved', guideBox.x - 60, guideBox.y, { buttons: 1 });
  await t.mouse('mouseMoved', guideBox.x - 120, guideBox.y, { buttons: 1 });
  await t.mouse('mouseReleased', guideBox.x - 120, guideBox.y, { button: 'left', buttons: 0, clickCount: 1 });
  await t.waitFor(`!![...document.querySelectorAll('.editor-stage .editor-user-guide.is-x')].find(g => parseFloat(g.style.left) < 800)`, { label: 'guide moved' }).catch(() => {});
  const guideMoved = await t.eval(`(() => { const g = [...document.querySelectorAll('.editor-stage .editor-user-guide.is-x')].find(g => parseFloat(g.style.left) < 800); return g ? parseFloat(g.style.left) : null; })()`);
  t.check('…dragged: it moves (on the grid)', guideMoved !== null && guideMoved % 8 === 0);
  await e.undo();
  await e.undo();
  t.check('…undo takes it away again', (await guidesNow()) === before101);

  // v101: several selected items in the layout move together (placed freely where they are first, one undo step)
  const timelineWasOpen = await t.eval(`document.querySelector('.editor [data-action="view-timeline"]')?.getAttribute('aria-pressed') === 'true'`);
  if (timelineWasOpen) await t.eval(`document.querySelector('.editor [data-action="view-timeline"]').click()`);
  await t.waitFor(`true`);
  // the slide's own first two blocks in its layout (high on the slide, in view)
  const mark101 = () => t.eval(`(() => { document.querySelectorAll('[data-test-a]').forEach(x => x.removeAttribute('data-test-a')); document.querySelectorAll('[data-test-b]').forEach(x => x.removeAttribute('data-test-b'));
    const blocks = [...document.querySelectorAll('.editor-stage .scene .content > *')].filter(x => !x.classList.contains('is-free') && x.getBoundingClientRect().height > 10 && x.getBoundingClientRect().bottom < innerHeight - 40);
    if (blocks.length < 2) return false; blocks[0].setAttribute('data-test-a', ''); blocks[1].setAttribute('data-test-b', ''); return true; })()`);
  t.check('(two blocks in the layout to try it on)', await mark101());
  const boxesOf = () => t.eval(`['[data-test-a]', '[data-test-b]'].map(s => { const el = document.querySelector('.editor-stage ' + s); const r = el && el.getBoundingClientRect(); return r ? { x: r.left, y: r.top, free: el.classList.contains('is-free') } : null; })`);
  await e.pick('.editor-stage [data-test-a]');
  await e.pick('.editor-stage [data-test-b]', { shift: true });
  const before101b = await boxesOf();
  const from101 = await t.eval(`(() => { const r = document.querySelector('.editor-stage [data-test-a]').getBoundingClientRect(); return { x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2 }; })()`);
  await t.drag(from101, 60, 30);
  await t.waitFor(`document.querySelector('.editor-stage [data-test-a]')?.classList.contains('is-free')`, { label: 'group moved' }).catch(() => {});
  const after101b = await boxesOf();
  const dA = after101b[0] && before101b[0] ? [after101b[0].x - before101b[0].x, after101b[0].y - before101b[0].y] : [0, 0], dB = after101b[1] && before101b[1] ? [after101b[1].x - before101b[1].x, after101b[1].y - before101b[1].y] : [0, 0];
  t.check('Several selected in the layout: dragging one moves both, the same way (placed freely where they were)', after101b.every(box => box && box.free) && dA[0] > 10 && Math.abs(dA[0] - dB[0]) < 2 && Math.abs(dA[1] - dB[1]) < 2);
  await e.undo();
  await t.waitFor(`!document.querySelector('.editor-stage .scene .content > .is-free:not([data-group])')`, { label: 'undo group move' }).catch(() => {});
  t.check('…one undo puts both back in the layout', await mark101() && (await boxesOf()).every(box => box && !box.free));
  await e.pick('.editor-stage [data-test-a]');
  await e.pick('.editor-stage [data-test-b]', { shift: true });
  const beforeKey = await boxesOf();
  await t.key('ArrowRight', 'ArrowRight', 39, 8);
  await t.waitFor(`document.querySelector('.editor-stage [data-test-b]')?.classList.contains('is-free')`, { label: 'arrow group' }).catch(() => {});
  const afterKey = await boxesOf();
  t.check('…and Shift+→ moves both too', afterKey.every(box => box && box.free) && afterKey.every((box, i) => Math.abs(box.y - beforeKey[i].y) < 1.5 && box.x > beforeKey[i].x));
  await e.undo();

  // v102: a box drawn from around the slide selects what lies wholly inside it
  await t.key('Escape', 'Escape', 27);
  await mark101();
  const marquee = await t.eval(`(() => { const stage = document.querySelector('.editor-stage').getBoundingClientRect(); const a = document.querySelector('.editor-stage [data-test-a]').getBoundingClientRect(), b = document.querySelector('.editor-stage [data-test-b]').getBoundingClientRect();
    return { from: { x: stage.left - 6, y: stage.top - 6 }, to: { x: Math.max(a.right, b.right) + 4, y: Math.max(a.bottom, b.bottom) + 4 } }; })()`);
  await t.drag(marquee.from, marquee.to.x - marquee.from.x, marquee.to.y - marquee.from.y);
  await t.waitFor(`document.querySelectorAll('.editor-stage .editor-group-box').length >= 2`, { label: 'marquee' }).catch(() => {});
  t.check('Drag a box from around the slide: what lies inside it is selected (both blocks), the box is gone', await t.eval(`(() => { const boxes = document.querySelectorAll('.editor-stage .editor-group-box').length; return boxes >= 2 && !document.querySelector('.editor-marquee') && /selected/.test(document.querySelector('.editor-panel-body')?.textContent || ''); })()`));
  await t.key('Escape', 'Escape', 27);
  if (timelineWasOpen) await t.eval(`document.querySelector('.editor [data-action="view-timeline"]').click()`);

  // v103: a shape becomes another kind (same box and colours); flip across, again to undo it
  await e.insert('rect');
  await e.tab('element');
  const rectStyle = await t.eval(`document.querySelector('.editor-stage .is-editor-selected').getAttribute('style')`);
  await e.panelSet('[data-tool-field="shapeKind"]', 'star');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-shape') === 'star'`, { label: 'star' }).catch(() => {});
  t.check('Shape: the rectangle becomes a star, in the same box with the same colours', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return el.getAttribute('data-shape') === 'star' && !!el.querySelector('svg polygon') && el.getAttribute('style') === ${JSON.stringify(rectStyle)}; })()`));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="flip-x"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="flip-x"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.style.getPropertyValue('--flip-x') === '-1'`, { label: 'flip' }).catch(() => {});
  t.check('⇋ Flip across: its drawing is mirrored (--flip-x: -1), the element itself is not', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return el.style.getPropertyValue('--flip-x') === '-1' && /matrix\\(-1/.test(getComputedStyle(el.querySelector('svg')).transform) && getComputedStyle(el).scale === 'none'; })()`));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="flip-x"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="flip-x"]');
  await t.waitFor(`!document.querySelector('.editor-stage .is-editor-selected')?.style.getPropertyValue('--flip-x')`, { label: 'unflip' }).catch(() => {});
  t.check('…again: back as it was', !(await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.style.getPropertyValue('--flip-x')`)));

  // v104: one layer forward / back among the free elements next to it (Ctrl+] / Ctrl+[)
  await e.insert('circle');
  await e.insert('star');
  await e.blur();
  await t.eval(`(() => { const all = [...document.querySelectorAll('.editor-stage .scene .shape.is-free')]; all.forEach(x => x.removeAttribute('data-test-z')); all[all.length - 1].setAttribute('data-test-z', 'top'); all[all.length - 2].setAttribute('data-test-z', 'under'); })()`);
  const stackOf = () => t.eval(`['top', 'under'].map(name => getComputedStyle(document.querySelector('.editor-stage [data-test-z="' + name + '"]')).zIndex)`);
  await e.pick('.editor-stage [data-test-z="top"]');
  await t.key('[', 'BracketLeft', 219, 2);
  await t.waitFor(`Number(getComputedStyle(document.querySelector('.editor-stage [data-test-z="top"]')).zIndex) < Number(getComputedStyle(document.querySelector('.editor-stage [data-test-z="under"]')).zIndex)`, { label: 'one back' }).catch(() => {});
  const [topZ, underZ] = (await stackOf()).map(Number);
  t.check('Ctrl+[: one layer back, now under the shape that was below it', topZ < underZ && topZ > 0);
  await t.key(']', 'BracketRight', 221, 2);
  await t.waitFor(`Number(getComputedStyle(document.querySelector('.editor-stage [data-test-z="top"]')).zIndex) > Number(getComputedStyle(document.querySelector('.editor-stage [data-test-z="under"]')).zIndex)`, { label: 'one forward' }).catch(() => {});
  const [topZ2, underZ2] = (await stackOf()).map(Number);
  t.check('…Ctrl+]: one forward again', topZ2 > underZ2);

  // v104: Shift+2 zooms in on the selection, Shift+1 shows the whole slide again
  const fitLevel = await t.eval(`document.querySelector('.editor-zoom-level').textContent`);
  const levelNow = `Number(document.querySelector('.editor-zoom-level').textContent.replace(/[^0-9]/g, ''))`;
  await t.key('@', 'Digit2', 50, 8);
  await t.waitFor(`${levelNow} > ${parseInt(fitLevel, 10)}`, { label: 'zoomed' }).catch(() => {});
  t.check('Shift+2: zoomed in on the selected shape, which is in view', await t.eval(`(() => { const el = document.querySelector('.editor-stage [data-test-z="top"]').getBoundingClientRect(), area = document.querySelector('.editor-canvas-scroll').getBoundingClientRect(); return ${levelNow} > ${parseInt(fitLevel, 10)} && el.left >= area.left - 1 && el.right <= area.right + 1 && el.top >= area.top - 1 && el.bottom <= area.bottom + 1; })()`));
  await t.key('!', 'Digit1', 49, 8);
  await t.waitFor(`document.querySelector('.editor-zoom-level').textContent === ${JSON.stringify(fitLevel)}`, { label: 'fit' }).catch(() => {});
  t.check('…Shift+1: the whole slide again', (await t.eval(`document.querySelector('.editor-zoom-level').textContent`)) === fitLevel);

  // v105: ⧉ Copy to other slides: a free shape onto a slide you tick, in the same place
  await e.insert('heart');
  await e.tab('element');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="copy-to-open"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="copy-to-open"]');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-copy-slide]')`, { label: 'copy list' }).catch(() => {});
  const target105 = await t.eval(`document.querySelector('.editor-panel-body [data-copy-slide]').getAttribute('data-copy-slide')`);
  const heartsIn = () => t.eval(`[...document.querySelectorAll('.editor-slide-list > li')].find(li => li.querySelector('.scene')?.dataset.name === ${JSON.stringify(target105)})?.querySelectorAll('.shape[data-shape="heart"]').length ?? -1`);
  const heartsBefore = await heartsIn();
  const placeOf = await t.eval(`(() => { const s = document.querySelector('.editor-stage .is-editor-selected').style; return s.getPropertyValue('--x') + ' ' + s.getPropertyValue('--y'); })()`);
  await t.eval(`document.querySelector('.editor-panel-body [data-copy-slide]').click()`);
  await t.eval(`document.querySelector('.editor-panel-body [data-action="copy-to-run"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="copy-to-run"]');
  await t.waitFor(`/Copied to 1/.test(document.querySelector('.toast')?.textContent || '')`, { label: 'copied' }).catch(() => {});
  t.check('⧉ Copy to other slides: the ticked slide gets the heart', (await heartsIn()) === heartsBefore + 1);
  t.check('…in the same place', await t.eval(`(() => { const li = [...document.querySelectorAll('.editor-slide-list > li')].find(li => li.querySelector('.scene')?.dataset.name === ${JSON.stringify(target105)}); const hearts = li.querySelectorAll('.shape[data-shape="heart"]'); const s = hearts[hearts.length - 1].style; return s.getPropertyValue('--x') + ' ' + s.getPropertyValue('--y'); })()`) === placeOf);
  await e.undo();
  t.check('…one undo takes it away again', (await heartsIn()) === heartsBefore);

  // v106: click effects Gets underlined and Shakes: there before the click; the click draws the line / shakes it
  await e.insert('heading');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-element-field="appear"]', 'click');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="effect"] option[value="underline"]')`, { label: 'effects' }).catch(() => {});
  t.check('Click effects: Gets underlined and Shakes are offered', await t.eval(`['underline', 'shake'].every(v => !!document.querySelector('.editor-panel-body [data-element-field="effect"] option[value="' + v + '"]'))`));
  await e.panelSet('[data-element-field="effect"]', 'underline');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-reveal-effect') === 'underline'`, { label: 'underline' }).catch(() => {});
  await t.key('Escape', 'Escape', 27);
  await e.tab('animations');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="play-slide"]').click()`);
  const underlined = `[...document.querySelectorAll('.editor-stage .scene [data-reveal-effect="underline"]')].pop()`;
  await t.waitFor(`/^0%/.test(getComputedStyle(${underlined}).backgroundSize)`, { label: 'no line yet' }).catch(() => {});
  t.check('…underline: on screen before its click, no line yet', await t.eval(`(() => { const el = ${underlined}; const cs = getComputedStyle(el); return Number(cs.opacity) > .9 && /^0%/.test(cs.backgroundSize); })()`));
  const step106 = Number(await t.eval(`${underlined}.getAttribute('data-reveal-step')`));
  for (let i = 0; i < step106; i++) await t.eval(`document.querySelector('.editor-panel-body [data-action="play-click"]').click()`);
  await t.waitFor(`/^100%/.test(getComputedStyle(${underlined}).backgroundSize)`, { label: 'line drawn' }).catch(() => {});
  t.check('…its click draws the line under it', await t.eval(`/^100%/.test(getComputedStyle(${underlined}).backgroundSize)`));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="play-stop"]').click()`);
  for (let i = 0; i < 3; i++) await e.undo();

  // v107: rows pasted from a spreadsheet become a table; bullet lines a list
  await t.key('Escape', 'Escape', 27);
  const pasteText = text => t.eval(`(() => { const data = new DataTransfer(); data.setData('text/plain', ${JSON.stringify('X')}.replace('X', ${'`'}${'${'}text${'}'}${'`'})); document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true })); return true; })()`.replace('${text}', text.replace(/\\/g, '\\\\').replace(/`/g, '\\`')));
  const tables107 = await t.eval(`document.querySelectorAll('.editor-stage .scene table.data-table').length`);
  await pasteText('Name\tScore\nAnna\t12\nBen\t9');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene table.data-table').length > ${tables107}`, { label: 'pasted table' }).catch(() => {});
  t.check('Pasted spreadsheet rows: a table, the first row its headings', await t.eval(`(() => { const table = [...document.querySelectorAll('.editor-stage .scene table.data-table')].pop(); return [...table.querySelectorAll('th')].map(c => c.textContent).join('|') === 'Name|Score' && table.querySelectorAll('tbody tr').length === 2 && table.querySelector('tbody td').textContent === 'Anna'; })()`));
  const lists107 = await t.eval(`document.querySelectorAll('.editor-stage .scene ul.big-list').length`);
  await pasteText('- First point\n- Second point\n- Third point');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene ul.big-list').length > ${lists107}`, { label: 'pasted list' }).catch(() => {});
  t.check('Pasted bullet lines: a list, one point per line without the bullets', await t.eval(`(() => { const list = [...document.querySelectorAll('.editor-stage .scene ul.big-list')].pop(); return [...list.querySelectorAll('li')].map(li => li.textContent).join('|') === 'First point|Second point|Third point'; })()`));
  await e.undo(); await e.undo();

  // v108: a block with items: its items each on a click, in one click (a list)
  await e.insert('list');
  await e.blur();
  await t.eval(`(() => { const lists = [...document.querySelectorAll('.editor-stage .scene ul.big-list')]; lists.forEach(l => l.removeAttribute('data-test-list')); lists.pop().setAttribute('data-test-list', ''); })()`);
  await e.pick('.editor-stage [data-test-list]');
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="items-clicks"]')`, { label: 'items buttons' }).catch(() => {});
  t.check('A block with items: Its 3 items appear: One after another / One per click / Together / With the block', await t.eval(`['items-sequence', 'items-clicks', 'items-together', 'items-plain'].every(a => !!document.querySelector('.editor-panel-body [data-action="' + a + '"]')) && /3/.test(document.querySelector('.editor-panel-body').textContent)`));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="items-clicks"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="items-clicks"]');
  await t.waitFor(`[...document.querySelectorAll('.editor-stage [data-test-list] > li')].every(li => li.hasAttribute('data-reveal-step'))`, { label: 'items on clicks' }).catch(() => {});
  t.check('…One per click: each point on a click of its own, one after another', await t.eval(`(() => { const steps = [...document.querySelectorAll('.editor-stage [data-test-list] > li')].map(li => Number(li.getAttribute('data-reveal-step'))); return steps.length === 3 && steps[1] === steps[0] + 1 && steps[2] === steps[1] + 1; })()`));
  await e.undo(); await e.undo();

  // v109: Per row for cards; a web address on an element (data-href)
  await e.insert('cards');
  await e.blur();
  await t.eval(`(() => { document.querySelectorAll('[data-test-cards]').forEach(x => x.removeAttribute('data-test-cards')); [...document.querySelectorAll('.editor-stage .scene .cards')].pop().setAttribute('data-test-cards', ''); })()`);
  await e.pick('.editor-stage [data-test-cards]');
  await e.tab('element');
  await e.panelSet('[data-element-field="perRow"]', '2');
  await t.waitFor(`document.querySelector('.editor-stage [data-test-cards]')?.style.getPropertyValue('--per-row') === '2'`, { label: 'per row' }).catch(() => {});
  t.check('Per row: 2 cards next to each other (--per-row: 2)', await t.eval(`(() => { const el = document.querySelector('.editor-stage [data-test-cards]'); return el.style.getPropertyValue('--per-row') === '2' && getComputedStyle(el).gridTemplateColumns.split(' ').length === 2; })()`));
  await e.panelSet('[data-element-field="linkUrl"]', 'example.com');
  await t.waitFor(`!!document.querySelector('.editor-stage [data-test-cards]')?.getAttribute('data-href')`, { label: 'href' }).catch(() => {});
  t.check('Or a web address: example.com becomes data-href="https://example.com"', (await t.eval(`document.querySelector('.editor-stage [data-test-cards]').getAttribute('data-href')`)) === 'https://example.com');
  await e.panelSet('[data-element-field="linkUrl"]', 'javascript:alert(1)');
  t.check('…javascript: and the like are refused', (await t.eval(`document.querySelector('.editor-stage [data-test-cards]').getAttribute('data-href')`)) === 'https://example.com');
  for (let i = 0; i < 3; i++) await e.undo();

  // v110: Fill: a free shape over the right half of the slide, edge to edge
  await e.insert('rect');
  await e.tab('element');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="fill-right"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="fill-right"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.style.getPropertyValue('--h') === '900px' || true`).catch(() => {});
  const fillBox = await t.eval(`(() => { const stage = document.querySelector('.editor-stage').getBoundingClientRect(), r = document.querySelector('.editor-stage .is-editor-selected').getBoundingClientRect(), k = stage.width / 1600; return [(r.left - stage.left) / k, (r.top - stage.top) / k, r.width / k, r.height / k].map(Math.round); })()`);
  t.check('◨ Right half: the shape covers the right half of the slide, edge to edge', Math.abs(fillBox[0] - 800) <= 1 && Math.abs(fillBox[1]) <= 1 && Math.abs(fillBox[2] - 800) <= 1 && Math.abs(fillBox[3] - 900) <= 1, JSON.stringify(fillBox));
  await e.undo(); await e.undo();

  // v111: a background gradient that moves slowly
  await e.tab('slide');
  const firstGradient = await t.eval(`[...document.querySelectorAll('.editor-panel-body [data-tool-field="backgroundGradient"] option')].map(o => o.value).find(Boolean)`);
  await e.panelSet('[data-tool-field="backgroundGradient"]', firstGradient);
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-tool-field="backgroundDrift"]')`, { label: 'drift box' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-panel-body [data-tool-field="backgroundDrift"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-tool-field="backgroundDrift"]');
  await t.waitFor(`document.querySelector('.editor-slide-list li.is-selected .scene')?.hasAttribute('data-background-drift')`, { label: 'drift' }).catch(() => {});
  t.check('Moves slowly: data-background-drift on the slide (with a gradient)', await t.eval(`document.querySelector('.editor-slide-list li.is-selected .scene').hasAttribute('data-background-drift')`));
  await e.undo(); await e.undo();

  // v114: 123 Count up its number: "Over 1,200 users" → <span class="count-up" data-to="1200" data-separator=",">
  await e.insert('text');
  await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); el.focus(); el.textContent = 'Over 1,200 users'; el.dispatchEvent(new InputEvent('input', { bubbles: true })); return true; })()`);
  await e.blur();
  await t.waitFor(`/Over 1,200 users/.test(document.querySelector('.editor-slide-list li.is-selected .scene')?.textContent || '')`, { label: 'typed' }).catch(() => {});
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="count-up-on"]')`, { label: 'count button' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-panel-body [data-action="count-up-on"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="count-up-on"]');
  await t.waitFor(`!!document.querySelector('.editor-stage .is-editor-selected .count-up')`, { label: 'count-up span' }).catch(() => {});
  t.check('123 Count up its number: the number in the text counts up (1200, its comma kept)', await t.eval(`(() => { const span = document.querySelector('.editor-stage .is-editor-selected .count-up'); return !!span && span.getAttribute('data-to') === '1200' && span.getAttribute('data-separator') === ',' && span.textContent === '1,200' && span.parentElement.textContent === 'Over 1,200 users'; })()`));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="count-up-off"]')?.scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="count-up-off"]');
  await t.waitFor(`!document.querySelector('.editor-stage .is-editor-selected .count-up')`, { label: 'stop counting' }).catch(() => {});
  t.check('…Stop counting: plain text again', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return !el.querySelector('.count-up') && el.textContent === 'Over 1,200 users'; })()`));
  for (let i = 0; i < 4; i++) await e.undo();

  // v115: → Connect with an arrow: from the edge of one to the other, pointing at it
  await e.insert('circle');
  await e.tab('element');
  await e.panelSet('[data-element-field="--x"]', '200'); await e.panelSet('[data-element-field="--y"]', '300');
  await t.eval(`document.querySelector('.editor-stage .is-editor-selected').setAttribute('data-test-from', '')`);
  await e.insert('circle');
  await e.tab('element');
  await e.panelSet('[data-element-field="--x"]', '1100'); await e.panelSet('[data-element-field="--y"]', '300');
  await t.eval(`document.querySelector('.editor-stage .is-editor-selected').setAttribute('data-test-to', '')`);
  await e.pick('.editor-stage [data-test-from]');
  await e.pick('.editor-stage [data-test-to]', { shift: true });
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="connect-arrow"]')`, { label: 'connect button' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-panel-body [data-action="connect-arrow"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="connect-arrow"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-shape') === 'arrow'`, { label: 'arrow' }).catch(() => {});
  t.check('→ Connect with an arrow: an arrow between the two circles, from the first one\'s edge to the second\'s', await t.eval(`(() => { const k = document.querySelector('.editor-stage').getBoundingClientRect().width / 1600; const box = el => { const r = el.getBoundingClientRect(); return { l: r.left / k, r: r.right / k }; }; const arrow = document.querySelector('.editor-stage .is-editor-selected'), a = box(document.querySelector('.editor-stage [data-test-from]')), b = box(document.querySelector('.editor-stage [data-test-to]')), c = box(arrow); return arrow.getAttribute('data-shape') === 'arrow' && c.l > a.r && c.r < b.l && (b.l - c.r) < 40 && (c.l - a.r) < 40; })()`));
  // v116: it stays connected: the second circle moves down, the arrow follows (it turns towards it)
  await e.pick('.editor-stage [data-test-to]');
  await e.tab('element');
  await e.panelSet('[data-element-field="--y"]', '600');
  await t.waitFor(`parseFloat(document.querySelector('.editor-stage .shape[data-connect]')?.style.rotate || '0') > 5`, { label: 'arrow follows' }).catch(() => {});
  t.check('…it stays connected: the second circle moved down, the arrow turned towards it (data-connect, data-anchor)', await t.eval(`(() => { const arrow = document.querySelector('.editor-stage .shape[data-connect]'); return !!arrow && parseFloat(arrow.style.rotate) > 5 && !!document.querySelector('.editor-stage [data-test-to][data-anchor]'); })()`));
  for (let i = 0; i < 8; i++) await e.undo();

  // v117: ⧉ Glide: a copy right after the slide whose blocks share glide names with it
  const slidesBefore = await t.eval(`document.querySelectorAll('.editor-slide-list > li').length`);
  await t.click('.editor [data-action="duplicate-glide"]');
  await t.waitFor(`document.querySelectorAll('.editor-slide-list > li').length === ${slidesBefore} + 1`, { label: 'glide copy' }).catch(() => {});
  t.check('⧉ Glide: a copy right after the slide, its blocks with the same glide names (data-morph)', await t.eval(`(() => { const items = [...document.querySelectorAll('.editor-slide-list > li')]; const index = items.findIndex(li => li.classList.contains('is-selected')); const copy = items[index]?.querySelector('.scene'), source = items[index - 1]?.querySelector('.scene'); if (!copy || !source) return false; const names = scene => [...scene.querySelectorAll('[data-morph]')].map(e => e.getAttribute('data-morph')).join(','); return names(copy).length > 0 && names(copy) === names(source) && /glide-1/.test(names(copy)); })()`));
  await e.undo();

  // v118: Icon: a symbol in a round badge; another picked in the Element tab
  await e.insert('icon');
  t.check('Icon: a round badge with a symbol, placed freely', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return !!el && el.matches('.icon-badge.is-free') && el.textContent.trim() === '💡' && getComputedStyle(el).borderTopLeftRadius === '50%'; })()`));
  await e.blur();
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="set-icon"][data-icon="🚀"]')`, { label: 'icon picker' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-panel-body [data-action="set-icon"][data-icon="🚀"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="set-icon"][data-icon="🚀"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.textContent.trim() === '🚀'`, { label: 'rocket' }).catch(() => {});
  t.check('…pick another: 🚀', (await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.textContent.trim()`)) === '🚀');
  await e.undo(); await e.undo();

  // v119: a text box: its text in the middle of its box, room inside, a tinted box
  await e.insert('textbox');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-element-field="--h"]', '300');
  await e.panelSet('[data-tool-field="alignContent"]', 'center');
  await e.panelSet('[data-tool-field="padding"]', '1em');
  await e.panelSet('[data-tool-field="boxFill"]', 'color-mix(in srgb, var(--color-accent) 16%, transparent)');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.style.backgroundColor !== ''`, { label: 'box' }).catch(() => {});
  t.check('Text in its box: in the middle; room inside; a tinted box', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); const cs = getComputedStyle(el); const range = document.createRange(); range.selectNodeContents(el); const text = range.getBoundingClientRect(), box = el.getBoundingClientRect(); return cs.alignContent === 'center' && parseFloat(cs.paddingTop) > 10 && !/rgba\\(0, 0, 0, 0\\)/.test(cs.backgroundColor) && text.top - box.top > box.height * .3; })()`));
  for (let i = 0; i < 5; i++) await e.undo();

  // v120: Edge and Text columns on a list
  await e.insert('list');
  await e.blur();
  await t.eval(`(() => { document.querySelectorAll('[data-test-list120]').forEach(x => x.removeAttribute('data-test-list120')); [...document.querySelectorAll('.editor-stage .scene ul.big-list')].pop().setAttribute('data-test-list120', ''); })()`);
  await e.pick('.editor-stage [data-test-list120]');
  await e.tab('element');
  await e.panelSet('[data-tool-field="columnCount"]', '2');
  await e.panelSet('[data-tool-field="border"]', '2px solid var(--color-accent)');
  await t.waitFor(`getComputedStyle(document.querySelector('.editor-stage [data-test-list120]')).columnCount === '2'`, { label: 'columns' }).catch(() => {});
  t.check('Text columns 2 and a thin accent Edge on a list', await t.eval(`(() => { const cs = getComputedStyle(document.querySelector('.editor-stage [data-test-list120]')); return cs.columnCount === '2' && cs.borderTopWidth === '2px' && cs.borderTopStyle === 'solid'; })()`));
  for (let i = 0; i < 3; i++) await e.undo();

  // v122: Progress line (Presentation tab) on the deck
  await e.tab('deck');
  await e.panelSet('[data-deck-field="progressLine"]', 'bottom');
  await t.waitFor(`document.querySelector('.editor-panel-body [data-deck-field="progressLine"]')?.value === 'bottom'`, { label: 'progress line' }).catch(() => {});
  t.check('Progress line: at the bottom (data-progress-line on the deck, kept after the panel redraws)', (await t.eval(`document.querySelector('.editor-panel-body [data-deck-field="progressLine"]').value`)) === 'bottom');
  await e.blur();
  await e.undo();
  await e.tab('deck');   // (undo brings back the selection of that moment, and its tab)
  await t.waitFor(`document.querySelector('.editor-panel-body [data-deck-field="progressLine"]')?.value === ''`, { label: 'undo progress line' }).catch(() => {});
  t.check('…undo takes it away', (await t.eval(`document.querySelector('.editor-panel-body [data-deck-field="progressLine"]')?.value`)) === '');

  // v124: a text in a shape: in its middle, editable on the slide
  await e.insert('rect');
  await e.tab('element');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="shape-text-add"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="shape-text-add"]');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene .shape > .shape-text')`, { label: 'shape text' }).catch(() => {});
  t.check('T Add a text in it: a text in the middle of the rectangle, editable on the slide', await t.eval(`(() => { const text = [...document.querySelectorAll('.editor-stage .scene .shape > .shape-text')].pop(); if (!text) return false; const shape = text.parentElement.getBoundingClientRect(), r = document.createRange(); r.selectNodeContents(text); const box = r.getBoundingClientRect(); return text.isContentEditable && Math.abs((box.left + box.right) / 2 - (shape.left + shape.right) / 2) < 4 && Math.abs((box.top + box.bottom) / 2 - (shape.top + shape.bottom) / 2) < 6; })()`));
  for (let i = 0; i < 2; i++) await e.undo();

  // v127: In a row, 40 px apart, lined up on their middles
  for (const kind of ['rect', 'circle', 'star']) {
    await e.insert(kind);
    await t.eval(`document.querySelector('.editor-stage .is-editor-selected').setAttribute('data-test-row', '${kind}')`);
  }
  await e.pick('.editor-stage [data-test-row="rect"]');
  await e.pick('.editor-stage [data-test-row="circle"]', { shift: true });
  await e.pick('.editor-stage [data-test-row="star"]', { shift: true });
  await e.tab('element');
  await e.panelSet('[data-tool-field="arrangeGap"]', '40');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="arrange-row"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="arrange-row"]');
  await t.waitFor(`true`);
  t.check('⇥ In a row: side by side, 40 px apart, on one middle line', await t.eval(`(() => { const k = document.querySelector('.editor-stage').getBoundingClientRect().width / 1600; const boxes = ['rect', 'circle', 'star'].map(n => document.querySelector('.editor-stage [data-test-row="' + n + '"]').getBoundingClientRect()).sort((a, b) => a.left - b.left); const gaps = [boxes[1].left - boxes[0].right, boxes[2].left - boxes[1].right].map(g => g / k); const middles = boxes.map(b => (b.top + b.bottom) / 2 / k); return gaps.every(g => Math.abs(g - 40) < 2) && Math.max(...middles) - Math.min(...middles) < 2; })()`));
  for (let i = 0; i < 4; i++) await e.undo();

  // v128: Repeat in a row × 3: two copies side by side, all three selected
  await e.insert('heart');
  await e.tab('element');
  await e.panelSet('[data-element-field="--x"]', '100');
  const hearts128 = await t.eval(`document.querySelectorAll('.editor-stage .scene .shape[data-shape="heart"]').length`);
  await t.eval(`document.querySelector('.editor-panel-body [data-action="repeat-row"][data-count="3"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="repeat-row"][data-count="3"]');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene .shape[data-shape="heart"]').length === ${hearts128} + 2`, { label: 'repeat' }).catch(() => {});
  t.check('Repeat in a row × 3: two copies side by side, the three selected together', await t.eval(`document.querySelectorAll('.editor-stage .scene .shape[data-shape="heart"]').length === ${hearts128} + 2 && document.querySelectorAll('.editor-stage .editor-group-box').length === 3`));
  for (let i = 0; i < 3; i++) await e.undo();

  // v131: Repeat in a column ↓ × 2: a copy under it
  await e.insert('circle');
  await e.tab('element');
  await e.panelSet('[data-element-field="--y"]', '100');
  await t.eval(`document.querySelector('.editor-stage .is-editor-selected').setAttribute('data-test-col', '')`);
  const circles131 = await t.eval(`document.querySelectorAll('.editor-stage .scene .shape[data-shape="circle"]').length`);
  await t.eval(`document.querySelector('.editor-panel-body [data-action="repeat-column"][data-count="2"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="repeat-column"][data-count="2"]');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene .shape[data-shape="circle"]').length === ${circles131} + 1`, { label: 'column' }).catch(() => {});
  t.check('Repeat ↓ × 2: a copy right under it, the same left edge', await t.eval(`(() => { const all = [...document.querySelectorAll('.editor-stage .scene .shape[data-shape="circle"][data-test-col]')]; if (all.length !== 2) return false; const [a, b] = all.map(e => e.getBoundingClientRect()).sort((p, q) => p.top - q.top); return Math.abs(a.left - b.left) < 1 && b.top > a.bottom; })()`));
  for (let i = 0; i < 3; i++) await e.undo();

  // v132: Keeps its proportions: a new width takes the height along
  await e.insert('rect');
  await e.tab('element');
  await t.eval(`document.querySelector('.editor-panel-body [data-element-field="keepRatio"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-element-field="keepRatio"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.hasAttribute('data-keep-ratio')`, { label: 'keep ratio' }).catch(() => {});
  const ratioBefore = await t.eval(`(() => { const s = document.querySelector('.editor-stage .is-editor-selected').style; return parseFloat(s.getPropertyValue('--h')) / parseFloat(s.getPropertyValue('--w')); })()`);
  await e.panelSet('[data-element-field="--w"]', '560');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.style.getPropertyValue('--w') === '560px'`, { label: 'width' }).catch(() => {});
  t.check('Keeps its proportions: Width 560, the height follows (same ratio)', await t.eval(`(() => { const s = document.querySelector('.editor-stage .is-editor-selected').style; return s.getPropertyValue('--w') === '560px' && Math.abs(parseFloat(s.getPropertyValue('--h')) / 560 - ${ratioBefore}) < .01; })()`));
  for (let i = 0; i < 3; i++) await e.undo();

  // v133: more quick animations: Drop in, Roll in, Stretch in, Nod, Spin round, Rise away, Spin away
  await e.insert('rect');
  await e.tab('animations');
  t.check('Quick animations: Drop in, Roll in, Stretch in, Nod, Spin round, Rise away, Spin away offered', await t.eval(`['drop-in', 'roll-in', 'stretch-in', 'nod', 'spin', 'rise-out', 'spin-out'].every(name => !!document.querySelector('.editor-panel-body [data-action="motion-quick"][data-preset="' + name + '"]'))`));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="motion-quick"][data-preset="roll-in"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="motion-quick"][data-preset="roll-in"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation') === 'roll-in'`, { label: 'roll in' }).catch(() => {});
  t.check('…Roll in given to the element', (await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation')`)) === 'roll-in');
  for (let i = 0; i < 2; i++) await e.undo();

  // v134: Text fill › Outline (only the letters' edges) and Box › Frosted glass
  await e.insert('text');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-tool-field="textGradient"]', 'outline');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.style.getPropertyValue('--text-outline') === '1'`, { label: 'outline' }).catch(() => {});
  t.check('Text fill › Outline: only the edges of the letters', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'), cs = getComputedStyle(el); return el.style.getPropertyValue('--text-outline') === '1' && parseFloat(cs.webkitTextStrokeWidth) > 0 && /rgba\\(0, 0, 0, 0\\)|transparent/.test(cs.webkitTextFillColor); })()`));
  await e.panelSet('[data-tool-field="textGradient"]', '');
  await e.panelSet('[data-tool-field="boxFill"]', 'frosted');
  await t.waitFor(`!!document.querySelector('.editor-stage .is-editor-selected')?.style.backdropFilter`, { label: 'frosted' }).catch(() => {});
  t.check('Box › Frosted glass: a see-through background that blurs what is behind it', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return /blur/.test(getComputedStyle(el).backdropFilter) && document.querySelector('.editor-panel-body [data-tool-field="boxFill"]').value === 'frosted'; })()`));
  for (let i = 0; i < 4; i++) await e.undo();

  // v134: click effects Wipes down and Opens in a circle: offered, clipped before the click, whole after it and on the still canvas
  await e.insert('rect');
  await e.tab('element');
  await e.panelSet('[data-element-field="appear"]', 'click');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="effect"]')`, { label: 'effect field' }).catch(() => {});
  t.check('Click effects include Wipes down and Opens in a circle', await t.eval(`['wipe-down', 'iris'].every(v => [...document.querySelector('.editor-panel-body [data-element-field="effect"]').options].some(o => o.value === v))`));
  await e.panelSet('[data-element-field="effect"]', 'iris');
  await t.waitFor(`document.querySelector('.editor-stage .scene .shape[data-reveal-effect="iris"]') !== null`, { label: 'iris' }).catch(() => {});
  await t.waitFor(`getComputedStyle(document.querySelector('.editor-stage .scene .shape[data-reveal-effect="iris"]')).clipPath === 'none'`, { timeout: 6000, label: 'preview done' }).catch(() => {});
  t.check('…Opens in a circle: whole on the still canvas', await t.eval(`getComputedStyle(document.querySelector('.editor-stage .scene .shape[data-reveal-effect="iris"]')).clipPath === 'none'`));
  const clips134 = await t.eval(`(() => {
    const scene = document.createElement('div'); scene.className = 'scene'; scene.style.cssText = 'position: fixed; left: -2000px';
    scene.innerHTML = '<div data-reveal-step="1" data-reveal-effect="iris">x</div><div data-reveal-step="1" data-reveal-effect="wipe-down">y</div>'; document.body.appendChild(scene);
    const [iris, down] = scene.children, before = getComputedStyle(iris).clipPath, downBefore = getComputedStyle(down).clipPath;
    iris.style.transition = 'none'; iris.classList.add('is-revealed'); const after = getComputedStyle(iris).clipPath; scene.remove();
    return [before, after, downBefore];
  })()`);
  t.check('…presenting: a closed circle before its click, open after it; Wipes down closed from below', /^circle\(0/.test(clips134[0]) && /^circle\(calc/.test(clips134[1]) && /100%/.test(clips134[2]), JSON.stringify(clips134));
  for (let i = 0; i < 3; i++) await e.undo();

  // v135: Fit the text to its box: a text with a height of its own gets the largest size that still fits
  await e.insert('textbox');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-element-field="--h"]', '300');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="fit-text"]')`, { label: 'fit button' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-panel-body [data-action="fit-text"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="fit-text"]');
  await t.waitFor(`/%$/.test(document.querySelector('.editor-stage .is-editor-selected')?.style.fontSize || '')`, { label: 'fitted' }).catch(() => {});
  t.check('Fit the text to its box: bigger, and all of it still inside its box', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return parseFloat(el.style.fontSize) > 100 && el.scrollHeight <= el.clientHeight + 1 && document.querySelector('.editor-panel-body [data-tool-field="fontSize"]').value === ((el.getAttribute('data-text-size') || '').split(' ')[0] || el.style.fontSize); })()`));   // (v183: the list shows it as a % of its own size)
  for (let i = 0; i < 3; i++) await e.undo();

  // v136: Moves on by itself after … s (Slide tab) and Self-running (Deck tab)
  await e.tab('slide');
  await e.panelSet('[data-slide-field="advance"]', '7');
  await t.waitFor(`document.querySelector('.editor-panel-body [data-slide-field="advance"]')?.value === '7'`, { label: 'advance' }).catch(() => {});
  t.check('Slide tab: Moves on by itself after 7 s (data-advance on the slide)', await t.eval(`document.querySelector('.editor-panel-body [data-slide-field="advance"]').value === '7' && !!document.querySelector('.editor-stage .scene[data-advance="7"], .editor-slide-list .scene[data-advance="7"]')`));
  await e.undo();
  await e.tab('deck');
  await t.eval(`document.querySelector('.editor-panel-body [data-deck-field="loop"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-deck-field="loop"]');
  await t.waitFor(`document.querySelector('.editor-panel-body [data-deck-field="loop"]')?.checked`, { label: 'loop' }).catch(() => {});
  t.check('Deck tab: Self-running (start again after the last slide) can be ticked', await t.eval(`document.querySelector('.editor-panel-body [data-deck-field="loop"]').checked`));
  await e.undo();

  // v137: click effects Pulses and Jumps: offered; on screen before their click; the click plays their move once
  await e.insert('rect');
  await e.tab('element');
  await e.panelSet('[data-element-field="appear"]', 'click');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="effect"]')`, { label: 'effect field' }).catch(() => {});
  t.check('Click effects include Pulses and Jumps', await t.eval(`['pulse', 'jump'].every(v => [...document.querySelector('.editor-panel-body [data-element-field="effect"]').options].some(o => o.value === v))`));
  const fx137 = await t.eval(`(() => {
    const scene = document.createElement('div'); scene.className = 'scene is-visible'; scene.style.cssText = 'position: fixed; left: -2000px';
    scene.innerHTML = '<div data-reveal-step="1" data-reveal-effect="pulse">x</div><div data-reveal-step="1" data-reveal-effect="jump">y</div>'; document.body.appendChild(scene);
    const [pulse, jump] = scene.children; const before = [getComputedStyle(pulse).opacity, getComputedStyle(jump).opacity];
    pulse.classList.add('is-revealed'); jump.classList.add('is-revealed');
    const after = [getComputedStyle(pulse).animationName, getComputedStyle(jump).animationName]; scene.remove();
    return before.concat(after);
  })()`);
  t.check('…on screen before the click, then reveal-pulse / reveal-jump', fx137[0] === '1' && fx137[1] === '1' && fx137[2] === 'reveal-pulse' && fx137[3] === 'reveal-jump', JSON.stringify(fx137));
  for (let i = 0; i < 2; i++) await e.undo();

  // v137: Skip this slide (Slide tab): faint with a badge in the slide list
  await e.tab('slide');
  await t.eval(`document.querySelector('.editor-panel-body [data-slide-field="skip"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-slide-field="skip"]');
  await t.waitFor(`!!document.querySelector('.editor-slide-list .is-skipped')`, { label: 'skipped' }).catch(() => {});
  t.check('Skip this slide: the slide is marked skipped in the slide list', await t.eval(`!!document.querySelector('.editor-slide-list .is-selected.is-skipped [data-ui="editor.badgeSkipped"]') && document.querySelector('.editor-panel-body [data-slide-field="skip"]').checked`));
  await e.undo();

  // v138: click effect Gets circled: a ring around it, drawn on its click (closed before, whole after; whole on the still canvas)
  await e.insert('textbox');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-element-field="appear"]', 'click');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="effect"] option[value="circled"]')`, { label: 'circled offered' }).catch(() => {});
  await e.panelSet('[data-element-field="effect"]', 'circled');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene [data-reveal-effect="circled"]')`, { label: 'circled' }).catch(() => {});
  const ring138 = await t.eval(`(() => {
    const scene = document.createElement('div'); scene.className = 'scene is-visible'; scene.style.cssText = 'position: fixed; left: -2000px';
    scene.innerHTML = '<style>.scene .test-ring::after { transition: none !important; }</style><p class="test-ring" data-reveal-step="1" data-reveal-effect="circled">x</p>'; document.body.appendChild(scene);
    const item = scene.querySelector('p'); const ring = () => getComputedStyle(item, '::after');
    const before = [getComputedStyle(item).opacity, ring().getPropertyValue('--circle-drawn').trim(), ring().borderTopStyle];
    item.classList.add('is-revealed'); const after = ring().getPropertyValue('--circle-drawn').trim(); scene.remove();
    return before.concat(after);
  })()`);
  t.check('Gets circled: on screen before its click, its ring closed, then drawn whole', ring138[0] === '1' && ring138[1] === '0%' && ring138[2] === 'solid' && ring138[3] === '100%', JSON.stringify(ring138));
  await t.waitFor(`getComputedStyle(document.querySelector('.editor-stage .scene [data-reveal-effect="circled"]'), '::after').getPropertyValue('--circle-drawn').trim() === '100%'`, { timeout: 4000, label: 'ring whole' }).catch(() => {});
  const ringInfo138 = await t.eval(`(() => { const el = document.querySelector('.editor-stage .scene [data-reveal-effect="circled"]'); return JSON.stringify({ drawn: getComputedStyle(el, '::after').getPropertyValue('--circle-drawn'), cls: el.className, still: !!el.closest('.still-slide'), anims: el.getAnimations({ subtree: true }).length }); })()`);
  t.check('…its ring is whole on the editor canvas (a still copy)', ringInfo138.includes('"drawn":"100%"'), ringInfo138);
  for (let i = 0; i < 4; i++) await e.undo();

  // v138: Insert › Sticky note: a tilted note in the accent colour, placed freely
  await e.insert('note');
  t.check('Sticky note: inserted, placed freely, tilted, in the accent colour', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); if (!el || !el.matches('.note-box.is-free')) return false; const cs = getComputedStyle(el); return cs.rotate === '-2deg' && cs.backgroundColor !== 'rgba(0, 0, 0, 0)'; })()`));
  await e.blur();
  await e.undo();

  // v139: click effect Glows (on screen before its click, the click plays reveal-glow) and the background patterns
  const glow139 = await t.eval(`(() => {
    const scene = document.createElement('div'); scene.className = 'scene is-visible'; scene.style.cssText = 'position: fixed; left: -2000px';
    scene.innerHTML = '<p data-reveal-step="1" data-reveal-effect="glow">x</p>'; document.body.appendChild(scene);
    const item = scene.firstChild; const before = getComputedStyle(item).opacity; item.classList.add('is-revealed'); const after = getComputedStyle(item).animationName; scene.remove();
    return [before, after];
  })()`);
  t.check('Glows: on screen before its click, then reveal-glow', glow139[0] === '1' && glow139[1] === 'reveal-glow', JSON.stringify(glow139));
  await e.tab('slide');
  t.check('Background patterns offered: a fine grid, diagonal stripes', await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-tool-field="backgroundGradient"]'); return !!f && [...f.options].filter(o => /repeating-linear-gradient/.test(o.value)).length === 2; })()`));

  // v140: text parts: Into focus, Flips down, Flies in from all sides (each from its own direction)
  const split140 = await t.eval(`(() => {
    const scene = document.createElement('div'); scene.className = 'scene is-visible'; scene.style.cssText = 'position: fixed; left: -2000px';
    scene.innerHTML = ['blur', 'flip', 'scatter'].map(kind => '<p class="reveal" data-split="word" data-split-effect="' + kind + '"><span class="split-part" style="--i: 0">a</span> <span class="split-part" style="--i: 1">b</span></p>').join('');
    document.body.appendChild(scene);
    const names = [...scene.querySelectorAll('p')].map(p => getComputedStyle(p.querySelector('.split-part')).animationName);
    const parts = scene.querySelectorAll('p:last-child .split-part'); parts.forEach(part => { part.style.animationPlayState = 'paused'; part.style.animationDelay = '0s'; });
    const starts = [...parts].map(part => getComputedStyle(part).transform); scene.remove();
    return names.concat(starts[0] !== starts[1] ? 'apart' : 'same');
  })()`);
  t.check('Text parts: Into focus, Flips down and Flies in from all sides (each its own way)', JSON.stringify(split140) === JSON.stringify(['split-blur', 'split-flip', 'split-scatter', 'apart']), JSON.stringify(split140));

  // v140: quick animations Lands, Bounces, Falls away, Pops away
  await e.insert('rect');
  await e.tab('animations');
  t.check('Quick animations: Lands, Bounces, Falls away, Pops away offered', await t.eval(`['land-in', 'bounce', 'fall-out', 'pop-out'].every(name => !!document.querySelector('.editor-panel-body [data-action="motion-quick"][data-preset="' + name + '"]'))`));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="motion-quick"][data-preset="fall-out"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="motion-quick"][data-preset="fall-out"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation') === 'fall-out'`, { label: 'fall out' }).catch(() => {});
  t.check('…Falls away given to the element', (await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation')`)) === 'fall-out');
  for (let i = 0; i < 2; i++) await e.undo();

  // v141: Image › Frame: a browser window (a bar of 34px above it) or a polaroid
  await e.insert('image');
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-tool-field="imageFrame"]')`, { label: 'frame field' }).catch(() => {});
  await e.panelSet('[data-tool-field="imageFrame"]', 'browser');
  await t.waitFor(`!!document.querySelector('.editor-stage .image-frame[data-frame="browser"]')`, { label: 'browser' }).catch(() => {});
  t.check('Image › Frame: a browser window (its bar above the picture)', await t.eval(`(() => { const f = document.querySelector('.editor-stage .image-frame[data-frame="browser"]'); return !!f && getComputedStyle(f).borderTopWidth === '34px'; })()`));
  await e.panelSet('[data-tool-field="imageFrame"]', 'polaroid');
  await t.waitFor(`!!document.querySelector('.editor-stage .image-frame[data-frame="polaroid"]')`, { label: 'polaroid' }).catch(() => {});
  t.check('…or a polaroid (a wide bottom edge)', await t.eval(`(() => { const f = document.querySelector('.editor-stage .image-frame[data-frame="polaroid"]'); return !!f && getComputedStyle(f).borderBottomWidth === '62px'; })()`));
  for (let i = 0; i < 3; i++) await e.undo();

  // v142: Frame › A phone; frames for a video too
  await e.insert('image');
  await e.tab('element');
  await e.panelSet('[data-tool-field="imageFrame"]', 'phone');
  await t.waitFor(`!!document.querySelector('.editor-stage .image-frame[data-frame="phone"]')`, { label: 'phone' }).catch(() => {});
  t.check('Frame › A phone: round corners, a dark body around the picture', await t.eval(`(() => { const f = document.querySelector('.editor-stage .image-frame[data-frame="phone"]'); return !!f && getComputedStyle(f).borderTopWidth === '30px' && parseFloat(getComputedStyle(f).borderTopLeftRadius) === 44; })()`));
  await e.undo(); await e.undo();
  t.check('…a video can have a frame too (the same frames)', await t.eval(`(() => { const f = document.createElement('div'); f.className = 'video-frame'; f.setAttribute('data-frame', 'browser'); document.body.appendChild(f); const top = getComputedStyle(f).borderTopWidth; f.remove(); return top === '34px'; })()`));

  // v143: more shapes: plus, pentagon, octagon, cloud, curved arrow, two-way arrow (the arrows are lines)
  await e.insert('cloud');
  t.check('More shapes: a cloud inserted, placed freely', await t.eval(`!!document.querySelector('.editor-stage .is-editor-selected.shape[data-shape="cloud"]')`));
  await e.undo();
  await e.insert('curve');
  t.check('…a curved arrow is a line (Thickness, no Fill)', await t.eval(`!!document.querySelector('.editor-stage .is-editor-selected.shape[data-shape="curve"]') && !document.querySelector('.editor-panel-body [data-tool-field="shapeFill"]') || document.querySelector('.editor-panel-body') === null`));
  await e.undo();

  // v144: quick animations Orbit, Rock, Blink; the Recent row (the last ones given, newest first)
  await e.insert('rect');
  await e.tab('animations');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="motion-quick"][data-preset="orbit"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-action="motion-quick"][data-preset="orbit"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation') === 'orbit'`, { label: 'orbit' }).catch(() => {});
  t.check('Quick animation Orbit given; Rock and Blink offered', await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation') === 'orbit' && ['rock', 'blink'].every(name => !!document.querySelector('.editor-panel-body [data-action="motion-quick"][data-preset="' + name + '"]'))`));
  t.check('…Recent row: Orbit first', await t.eval(`(() => { const row = document.querySelector('.editor-panel-body .anim-quick:not(.anim-timing) .anim-quick-group:not(.anim-quick-when)'); return !!row && row.querySelector('[data-preset]')?.dataset.preset === 'orbit'; })()`));
  for (let i = 0; i < 2; i++) await e.undo();

  // v145: Gets ticked: a point of a list shows an empty box, its click fills it with a ✓
  const tick145 = await t.eval(`(() => {
    const scene = document.createElement('div'); scene.className = 'scene is-visible'; scene.style.cssText = 'position: fixed; left: -2000px';
    scene.innerHTML = '<ul class="big-list"><li data-reveal-step="1" data-reveal-effect="tick">Point</li></ul>'; document.body.appendChild(scene);
    const item = scene.querySelector('li'); const before = [getComputedStyle(item).opacity, getComputedStyle(item, '::before').content, getComputedStyle(item, '::before').borderTopStyle];
    item.classList.add('is-revealed'); const after = getComputedStyle(item, '::before').content; scene.remove();
    return before.concat(after);
  })()`);
  t.check('Gets ticked: on screen with an empty box, then a ✓ in it', tick145[0] === '1' && tick145[1] === '""' && tick145[2] === 'solid' && tick145[3] === '"✓"', JSON.stringify(tick145));

  // v147: Celebrate on its click (Element tab, a click item): hearts
  await e.insert('rect');
  await e.tab('element');
  await e.panelSet('[data-element-field="appear"]', 'click');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="confetti"]')`, { label: 'celebrate field' }).catch(() => {});
  await e.panelSet('[data-element-field="confetti"]', 'hearts');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-confetti') === 'hearts'`, { label: 'hearts' }).catch(() => {});
  t.check('Celebrate on its click: hearts', (await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-confetti')`)) === 'hearts');
  for (let i = 0; i < 3; i++) await e.undo();

  // v155: no draft for no real change: a change undone again leaves the file as it was, so no draft and nothing unsaved
  await t.open('numbers', { clear: true });   // (no draft left by the steps above)
  await e.open('numbers');
  await e.tab('slide');
  await e.panelSet('[data-slide-field="estimate"]', '1:11');
  await e.undo();
  await new Promise(r => setTimeout(r, 2500));   // (past the draft's short wait)
  const draft155 = await t.eval(`new Promise(resolve => { const id = ((document.getElementById('deck').dataset.deckId || 'deck').replace(/[^\\w-]/g, '') || 'deck'); const request = indexedDB.open(id + '-deck-editor', 1); request.onsuccess = () => { try { const get = request.result.transaction('drafts').objectStore('drafts').get('draft'); get.onsuccess = () => resolve(get.result ? 'draft' : 'none'); get.onerror = () => resolve('error'); } catch (e) { resolve('none'); } }; request.onerror = () => resolve('error'); })`);
  t.check('A change undone again keeps no draft (nothing unsaved)', draft155 === 'none', draft155);

  // v156: image looks Teal tint and Amber tint
  await e.insert('image');
  await e.tab('element');
  await e.panelSet('[data-tool-field="imageLook"]', 'grayscale(1) sepia(.7) hue-rotate(130deg) saturate(1.7) brightness(.95)');
  await t.waitFor(`/hue-rotate/.test(document.querySelector('.editor-stage .image-frame img, .editor-stage .is-editor-selected img')?.style.getPropertyValue('--image-look') || '')`, { label: 'teal' }).catch(() => {});
  t.check('Image look: Teal tint', await t.eval(`/hue-rotate/.test(document.querySelector('.editor-stage .is-editor-selected img')?.style.getPropertyValue('--image-look') || '') && [...document.querySelector('.editor-panel-body [data-tool-field="imageLook"]').options].some(o => o.value.startsWith('grayscale(1) sepia(.9)'))`));
  for (let i = 0; i < 3; i++) await e.undo();

  // v157: Keep fitting: ticked, the text gets its best size; after a new height it fits again
  await e.insert('textbox');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-element-field="--h"]', '300');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-tool-field="keepFitting"]')`, { label: 'keep fitting' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-panel-body [data-tool-field="keepFitting"]').scrollIntoView({ block: 'center' })`);
  await t.click('.editor-panel-body [data-tool-field="keepFitting"]');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.hasAttribute('data-fit-text') && /%$/.test(document.querySelector('.editor-stage .is-editor-selected').style.fontSize)`, { label: 'fitted' }).catch(() => {});
  const size157 = await t.eval(`parseFloat(document.querySelector('.editor-stage .is-editor-selected').style.fontSize)`);
  t.check('Keep fitting: ticked, the text fills its box', size157 > 100, String(size157));
  await e.panelSet('[data-element-field="--h"]', '120');
  await t.waitFor(`parseFloat(document.querySelector('.editor-stage .is-editor-selected').style.fontSize) < ${size157}`, { label: 'refit' }).catch(() => {});
  t.check('…a lower Height in the panel: it fits again (smaller)', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return parseFloat(el.style.fontSize) < ${size157} && el.scrollHeight <= el.clientHeight + 1; })()`));
  for (let i = 0; i < 4; i++) await e.undo();

  // v158: a corner of a text box scales its text with it (Alt: only the box)
  await e.insert('textbox');
  await e.blur();
  await e.tab('element');
  const before158 = await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return [parseFloat(getComputedStyle(el).fontSize), el.offsetWidth]; })()`);
  const se158 = await t.centre('.editor-selection .editor-handle[data-dir="se"]');
  await t.mouse('mouseMoved', se158.x, se158.y);
  await t.mouse('mousePressed', se158.x, se158.y);
  for (let i = 1; i <= 6; i++) await t.mouse('mouseMoved', se158.x + i * 25, se158.y + i * 6, { buttons: 1 });
  await t.mouse('mouseReleased', se158.x + 150, se158.y + 36, { buttons: 0 });
  const after158 = await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return [parseFloat(getComputedStyle(el).fontSize), el.offsetWidth, el.style.fontSize]; })()`);
  t.check('A corner of a text box scales its letters with the box', after158[0] > before158[0] * 1.1 && Math.abs(after158[0] / before158[0] - after158[1] / before158[1]) < .08 && /%$/.test(after158[2]), JSON.stringify([before158, after158]));
  for (let i = 0; i < 3; i++) await e.undo();

  // v159: the transition picker: a click on a tile chooses that transition (one undo step)
  await e.tab('slide');
  await t.waitFor(`document.querySelectorAll('.editor-panel-body .transition-tile').length === 14`, { label: 'tiles' }).catch(() => {});
  await t.click('.editor-panel-body .transition-tile[data-pick-transition="wipe"]');
  await t.waitFor(`document.querySelector('.editor-panel-body [data-slide-field="transition"]')?.value === 'wipe'`, { label: 'wipe chosen' }).catch(() => {});
  t.check('Transition picker: 14 tiles, a click chooses Wipe', await t.eval(`(() => document.querySelectorAll('.editor-panel-body .transition-tile').length === 14 && /data-transition="wipe"/.test(document.querySelector('.editor-slide-list li.is-selected .scene').outerHTML.split('>')[0]) && document.querySelector('.editor-panel-body .transition-tile[data-pick-transition="wipe"]').getAttribute('aria-pressed') === 'true')()`));
  await e.undo();

  // v159: How it counts › Rolls like a counter
  await e.pick('.editor-stage .stat .count-up');
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="countStyle"]')`, { label: 'count style' }).catch(() => {});
  await e.panelSet('[data-element-field="countStyle"]', 'roll');
  await t.waitFor(`!!document.querySelector('.editor-stage .count-up[data-count-style="roll"]')`, { label: 'roll' }).catch(() => {});
  t.check('Number: Rolls like a counter (data-count-style="roll")', await t.eval(`!!document.querySelector('.editor-stage .count-up[data-count-style="roll"]')`));
  await e.undo();

  // v159: a polaroid's caption
  await e.insert('image');
  await e.tab('element');
  await e.panelSet('[data-tool-field="imageFrame"]', 'polaroid');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-tool-field="frameCaption"]')`, { label: 'caption field' }).catch(() => {});
  await e.panelSet('[data-tool-field="frameCaption"]', 'Team day <3');
  await t.waitFor(`!!document.querySelector('.editor-stage [data-frame="polaroid"][data-caption]')`, { label: 'caption' }).catch(() => {});
  t.check('Polaroid caption: kept as text and drawn on the edge', await t.eval(`(() => { const f = document.querySelector('.editor-stage [data-frame="polaroid"][data-caption]'); return !!f && f.getAttribute('data-caption') === 'Team day <3' && /^url\\("data:image\\/svg\\+xml,/.test(f.style.getPropertyValue('--caption').trim()) && getComputedStyle(f).backgroundImage.startsWith('url('); })()`));
  await e.panelSet('[data-tool-field="imageFrame"]', '');
  t.check('…no frame: the caption goes too', await t.eval(`!document.querySelector('.editor-stage [data-caption]')`));
  for (let i = 0; i < 4; i++) await e.undo();

  // v159 (review): a corner dragged straight down scales a text too
  await e.insert('textbox');
  await e.blur();
  const before159 = await t.eval(`parseFloat(getComputedStyle(document.querySelector('.editor-stage .is-editor-selected')).fontSize)`);
  const se159 = await t.centre('.editor-selection .editor-handle[data-dir="se"]');
  await t.mouse('mouseMoved', se159.x, se159.y);
  await t.mouse('mousePressed', se159.x, se159.y);
  for (let i = 1; i <= 5; i++) await t.mouse('mouseMoved', se159.x, se159.y + i * 20, { buttons: 1 });
  await t.mouse('mouseReleased', se159.x, se159.y + 100, { buttons: 0 });
  const after159 = await t.eval(`parseFloat(getComputedStyle(document.querySelector('.editor-stage .is-editor-selected')).fontSize)`);
  t.check('A corner dragged straight down scales the text', after159 > before159 * 1.05, JSON.stringify([before159, after159]));
  for (let i = 0; i < 3; i++) await e.undo();

  // v160: Image › Look › Duotone: an SVG filter on the page, in the theme's colours
  await e.insert('image');
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-tool-field="imageLook"] option[value="url(#duotone-teal)"]')`, { label: 'duotone option' }).catch(() => {});
  await e.panelSet('[data-tool-field="imageLook"]', 'url(#duotone-teal)');
  await t.waitFor(`!!document.querySelector('.editor-stage img[style*="--image-look"]')`, { label: 'duotone' }).catch(() => {});
  t.check('Duotone look: the image uses the teal duotone filter, whose light end is the theme teal', await t.eval(`(() => {
    const img = document.querySelector('.editor-stage img[style*="--image-look"]');
    if (!img || img.style.getPropertyValue('--image-look').trim() !== 'url(#duotone-teal)' || !/url\\(/.test(getComputedStyle(img).filter)) return false;
    const teal = getComputedStyle(document.documentElement).getPropertyValue('--color-teal').trim().replace('#', '');
    const red = document.querySelector('#duotoneFilters #duotone-teal feFuncR');
    return !!red && Math.abs(parseFloat(red.getAttribute('tableValues').split(' ')[1]) - parseInt(teal.slice(0, 2), 16) / 255) < .01 && !/duotone/.test(document.querySelector('.editor-stage').innerHTML.replace(/url\\(#duotone-teal\\)/g, ''));
  })()`));
  for (let i = 0; i < 2; i++) await e.undo();

  // v164: Image › Brightness, Contrast, Colour sliders: kept after the look; the look can change and they stay; one button puts them back
  await e.insert('image');
  await e.tab('element');
  await e.panelSet('[data-tool-field="adjust-brightness"]', '120');
  await t.waitFor(`/brightness\\(1\\.2\\)/.test(document.querySelector('.editor-stage .is-editor-selected img, .editor-stage img.is-editor-selected')?.style.getPropertyValue('--image-look') || '')`, { label: 'brightness' }).catch(() => {});
  await e.panelSet('[data-tool-field="imageLook"]', 'sepia(.8)');
  const look164 = await t.eval(`(document.querySelector('.editor-stage .is-editor-selected img, .editor-stage img.is-editor-selected')?.style.getPropertyValue('--image-look') || '').trim()`);
  t.check('Image sliders: Brightness 120 % stays after the look (sepia(.8) brightness(1.2) contrast(1) saturate(1))', look164 === 'sepia(.8) brightness(1.2) contrast(1) saturate(1)', look164);
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="adjust-reset"]')`, { label: 'reset button' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-panel-body [data-action="adjust-reset"]').click(); true`);
  t.check('…the reset button puts them back and keeps the look', await t.eval(`(document.querySelector('.editor-stage .is-editor-selected img, .editor-stage img.is-editor-selected')?.style.getPropertyValue('--image-look') || '').trim() === 'sepia(.8)'`));
  await e.panelSet('[data-tool-field="adjust-saturate"]', '0');
  t.check('…Colour at 0 % is kept (black and white)', await t.eval(`/saturate\\(0\\)$/.test((document.querySelector('.editor-stage .is-editor-selected img, .editor-stage img.is-editor-selected')?.style.getPropertyValue('--image-look') || '').trim())`));
  for (let i = 0; i < 5; i++) await e.undo();

  // v168: ✂ Crop…: a frame over the picture; a corner dragged in makes it smaller; Crop writes object-view-box (one undo step)
  await e.insert('image');
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="crop-image"]') && (document.querySelector('.editor-stage .is-editor-selected img, .editor-stage img.is-editor-selected')?.naturalWidth || 0) > 0`, { label: 'crop button, image loaded' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-panel-body [data-action="crop-image"]').click(); true`);
  await t.waitFor(`!!document.querySelector('.editor-dialog:not([hidden]) .crop-box')`, { label: 'crop window' }).catch(() => {});
  await t.eval(`(() => { const corner = document.querySelector('.crop-box [data-corner="se"]').getBoundingClientRect(), area = document.querySelector('.crop-area').getBoundingClientRect(); const x = corner.left + 8, y = corner.top + 8; document.querySelector('.crop-box [data-corner="se"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y })); window.dispatchEvent(new PointerEvent('pointermove', { clientX: x - area.width * .4, clientY: y - area.height * .4 })); window.dispatchEvent(new PointerEvent('pointerup', {})); return true; })()`);
  await t.eval(`document.querySelector('.crop-tool [data-crop="apply"]').click(); true`);
  const crop168 = await t.eval(`(document.querySelector('.editor-stage .is-editor-selected img, .editor-stage img.is-editor-selected')?.style.getPropertyValue('object-view-box') || '').trim()`);
  t.check('✂ Crop: a smaller frame becomes object-view-box: inset(…), the window closes', crop168.startsWith('inset(') && await t.eval(`!!document.querySelector('.editor-dialog[hidden]')`), crop168);
  for (let i = 0; i < 2; i++) await e.undo();
}
