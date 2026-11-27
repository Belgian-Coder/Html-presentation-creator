// The Code tab (v59): this element's CSS (its style attribute, two-way with the fields), this slide's CSS (@scope in the
// slide), the whole presentation's CSS (the CUSTOM CSS block); live while typing, one undo step, saved in the file.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sleep } from '../harness.mjs';

export const covers = ['js/08-', 'js/16-', 'js/17-', 'js/18-', 'js/19-', 'js/20-', 'js/23-', 'css/13-', 'deck.html', 'interface-texts.json'];

export default async function (t) {
  const e = t.editor;
  const SEL = e.selected;
  await e.open('numbers');
  const typeInto = async (place, text) => {
    await t.eval(`(() => { const f = document.querySelector('.editor-panel-body textarea[data-code="${place}"]'); f.focus(); f.select(); return true; })()`);
    await t.type(text);
  };
  const commit = () => t.key('Enter', 'Enter', 13, 2);   // Ctrl+Enter

  // this element: the Style fields write what the Code tab shows, and the other way round
  await e.pick('.editor-stage .scene h2');
  await e.tab('element');
  await e.panelSet('[data-tool-field="fontSize"]', '150%');
  await t.waitFor(`(((${SEL}).getAttribute('data-text-size') || '').split(' ')[0] || (${SEL}).style.fontSize) === '150%'`);
  await e.tab('code');
  t.check('the element’s CSS shows what the Style field wrote', /font-size: [\d.]+%;/.test(await t.eval(`document.querySelector('.editor-panel-body textarea[data-code="element"]').value`)));
  await typeInto('element', 'font-size: 200%;\ncolor: var(--color-rose);\nnonsense here;');
  t.check('typing shows on the slide at once', await t.eval(`${SEL}.style.color === 'var(--color-rose)'`));
  await commit();
  await t.waitFor(`/color: var\\(--color-rose\\)/.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').getAttribute('style') || '')`, { label: 'element CSS written' }).catch(() => {});
  const h2Style = await t.eval(`document.querySelector('.editor-slide-list li.is-selected .scene h2').getAttribute('style') || ''`);
  t.check('Ctrl+Enter writes it in the file (a line the browser does not know is left out)', /font-size: 200%/.test(h2Style) && /color: var\(--color-rose\)/.test(h2Style) && !/nonsense/.test(h2Style), h2Style);
  await e.tab('element');
  // (v183: the Code tab writes CSS %, of the text around it; the Style list shows how big that is in % of the heading's own size)
  t.check('…and the Style fields follow (the text size typed in the Code tab)', /^\d+%$/.test(await t.eval(`document.querySelector('.editor-panel-body [data-tool-field="fontSize"]').value`)));
  await e.undo();
  await t.waitFor(`(((${SEL}).getAttribute('data-text-size') || '').split(' ')[0] || (${SEL}).style.fontSize) === '150%'`).catch(() => {});
  t.check('one undo step takes it back', (await t.eval(`(((${SEL}).getAttribute('data-text-size') || '').split(' ')[0] || (${SEL}).style.fontSize)`)) === '150%');

  // rules of this element: :hover; written in the slide; a real pointer over it shows them
  await e.pick('.editor-stage .scene .stat');
  await e.tab('code');
  await typeInto('rules', '&:hover { outline: 3px solid rgb(7, 8, 9); }');
  await commit();
  await t.waitFor(`!!document.querySelector('.editor-slide-list li.is-selected .scene style[data-element-css]')`, { label: 'rules written' }).catch(() => {});
  t.check('the element’s rules are written in the slide, for that element (data-css)', await t.eval(`(() => { const s = document.querySelector('.editor-slide-list li.is-selected .scene'); const block = s.querySelector('style[data-element-css]'); return !!block && !!s.querySelector('.stat[data-css="' + block.getAttribute('data-element-css') + '"]') && /&:hover/.test(block.textContent); })()`));
  const stat = await t.centre('.editor-stage .scene .stat');
  await t.mouse('mouseMoved', stat.x, stat.y);
  await t.waitFor(`getComputedStyle(document.querySelector('.editor-stage .scene .stat')).outlineColor === 'rgb(7, 8, 9)'`, { label: 'hover' }).catch(() => {});
  t.check('the pointer over it shows the :hover rule', (await t.eval(`getComputedStyle(document.querySelector('.editor-stage .scene .stat')).outlineColor`)) === 'rgb(7, 8, 9)');
  await t.mouse('mouseMoved', 5, 5);
  // copy it to another slide: its rules go along, under a name of their own
  const clip = type => t.eval(`(() => { const dt = new DataTransfer(); const ev = new ClipboardEvent('${type}', { clipboardData: dt, bubbles: true, cancelable: true }); (document.activeElement || document.body).dispatchEvent(ev); return true; })()`);
  await e.blur();
  await clip('copy');
  await e.goSlide('big-letters');
  await e.blur();
  await clip('paste');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene [data-css]')`, { label: 'pasted with rules' }).catch(() => {});
  t.check('a copy on another slide keeps its rules (its own block, its own name)', await t.eval(`(() => { const s = document.querySelector('.editor-stage .scene'); const el = s.querySelector('[data-css]'); return !!el && !!s.querySelector(':scope > style[data-element-css="' + el.dataset.css + '"]') && !s.querySelector('style[data-carried-css]'); })()`));
  await e.undo();
  await e.goSlide('numbers');
  await e.pick('.editor-stage .scene h2');
  await t.mouse('mouseMoved', 5, 5);
  // autocomplete: a property, then a value
  await e.pick('.editor-stage .scene h2');
  await e.tab('code');
  await t.eval(`(() => { const f = document.querySelector('.editor-panel-body textarea[data-code="element"]'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); return true; })()`);
  await t.key('Enter', 'Enter', 13);
  await t.type('font-wei');
  await t.eval(`document.querySelector('.editor-panel-body textarea[data-code="element"]').dispatchEvent(new Event('input', { bubbles: true })); true`);
  await t.waitFor(`!!document.querySelector('.editor-code-hints:not([hidden]) .is-current')`, { label: 'hints' }).catch(() => {});
  t.check('typing a property: the list offers it', (await t.eval(`document.querySelector('.editor-code-hints:not([hidden]) .is-current')?.textContent`)) === 'font-weight');
  await t.key('Enter', 'Enter', 13);
  await t.type('7');
  await t.eval(`document.querySelector('.editor-panel-body textarea[data-code="element"]').dispatchEvent(new Event('input', { bubbles: true })); true`);
  await t.waitFor(`/700/.test(document.querySelector('.editor-code-hints:not([hidden])')?.textContent || '')`).catch(() => {});
  await t.key('Tab', 'Tab', 9);
  t.check('Enter takes the property (with ": "), Tab takes a value (700)', /font-weight: 700$/.test(await t.eval(`document.querySelector('.editor-panel-body textarea[data-code="element"]').value`)), await t.eval(`document.querySelector('.editor-panel-body textarea[data-code="element"]').value.slice(-30)`));
  await commit();
  await e.undo();

  // this slide: scoped to this slide only
  await e.tab('code');
  await typeInto('slide', 'h2 { color: rgb(1, 2, 3); }');
  t.check('the slide’s CSS shows at once on the canvas', (await t.eval(`getComputedStyle(document.querySelector('.editor-stage .scene h2')).color`)) === 'rgb(1, 2, 3)');
  await commit();
  await t.waitFor(`!!document.querySelector('.editor-slide-list li.is-selected .scene style[data-slide-css]')`, { label: 'slide CSS written' }).catch(() => {});
  t.check('it is written in the slide as <style data-slide-css>@scope { … }', /^@scope \{\s*h2 \{ color: rgb\(1, 2, 3\); \}\s*\}$/.test(await t.eval(`document.querySelector('.editor-slide-list li.is-selected .scene style[data-slide-css]')?.textContent.trim() || ''`)));
  t.check('…and reaches only this slide (another slide’s heading keeps its colour)', await t.eval(`[...document.querySelectorAll('.editor-slide-list li:not(.is-selected) .scene h2')].every(h => getComputedStyle(h).color !== 'rgb(1, 2, 3)')`));
  t.check('the slide’s CSS is no text to type in or edit (Texts, canvas)', await t.eval(`!document.querySelector('.editor-stage .scene style[contenteditable]')`));

  // a } too many is not kept (it would reach every slide); the Code tab stays open when you pick an element
  await typeInto('slide', 'h2 { color: rgb(1, 2, 3); } } .scene h2 { color: rgb(9, 9, 9); }');
  await commit();
  t.check('a } too many in the slide’s CSS is refused (other slides keep their look)', await t.eval(`[...document.querySelectorAll('.editor-slide-list .scene h2')].every(h => getComputedStyle(h).color !== 'rgb(9, 9, 9)') && !/rgb\\(9, 9, 9\\)/.test(document.querySelector('.editor-slide-list li.is-selected .scene style[data-slide-css]')?.textContent || '')`));
  await e.pick('.editor-stage .scene .eyebrow');
  t.check('picking an element keeps the Code tab (with that element’s CSS)', await t.eval(`document.querySelector('.editor-tabs [data-tab="code"]').classList.contains('is-selected') && !!document.querySelector('.editor-panel-body textarea[data-code="element"]')`));
  // the whole presentation
  await typeInto('deck', '.scene .stat { outline: 3px solid rgb(4, 5, 6); }');
  await commit();
  await t.waitFor(`getComputedStyle(document.querySelector('.editor-stage .scene .stat')).outlineColor === 'rgb(4, 5, 6)'`, { label: 'deck CSS' }).catch(() => {});
  t.check('the presentation’s CSS reaches every slide', (await t.eval(`getComputedStyle(document.querySelector('.editor-stage .scene .stat')).outlineColor`)) === 'rgb(4, 5, 6)');
  // a snippet
  await e.pick('.editor-stage .scene .stat');
  await e.tab('code');
  await t.eval(`(() => { const s = document.querySelector('.editor-panel-body select[data-code-snippet="element"]'); s.value = '4'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await t.waitFor(`/box-shadow/.test(${SEL}?.getAttribute('style') || '')`, { label: 'snippet' }).catch(() => {});
  t.check('a snippet adds a ready-made rule (Deep shadow)', /box-shadow/.test(await t.eval(`${SEL}?.getAttribute('style') || ''`)));

  // HTML: the element and the slide as the file holds them
  await e.pick('.editor-stage .scene h2');
  await e.tab('code');
  await t.eval(`document.querySelector('details[data-html-open="element"]').open = true; true`);
  const h2Html = await t.eval(`document.querySelector('.editor-panel-body textarea[data-html="element"]').value`);
  t.check('▸ HTML shows the element as the file holds it (no editor helpers)', /^<h2[\s>]/.test(h2Html) && !/contenteditable|is-editor-selected/.test(h2Html), h2Html.slice(0, 120));
  const typeHtml = async (place, text) => {
    await t.eval(`(() => { const f = document.querySelector('.editor-panel-body textarea[data-html="${place}"]'); f.focus(); f.select(); return true; })()`);
    await t.type(text);
  };
  await typeHtml('element', '<h2 class="reveal" style="--order:1">New <b>words</b></h2><p>two</p>');
  t.check('two elements: it says it cannot be used', /one element/.test(await t.eval(`document.querySelector('[data-html-status="element"]').textContent`)));
  await commit();
  t.check('…and nothing changes on the slide', (await t.eval(`document.querySelector('.editor-stage .scene h2').textContent`)) !== 'New words');
  await typeHtml('element', '<h2 class="reveal big-title" style="--order:1" onclick="alert(1)">New <b>words</b><script>alert(2)</script></h2>');
  await commit();
  await t.waitFor(`document.querySelector('.editor-slide-list li.is-selected .scene h2')?.textContent === 'New words'`, { label: 'element HTML' }).catch(() => {});
  const newH2 = await t.eval(`document.querySelector('.editor-slide-list li.is-selected .scene h2').outerHTML`);
  t.check('Ctrl+Enter puts the new HTML in place (scripts and onclick left out)', /class="reveal big-title"/.test(newH2) && /<b>words<\/b>/.test(newH2) && !/onclick|script/.test(newH2), newH2);
  t.check('…the element stays selected and can be typed in on the canvas', await t.eval(`${SEL}?.matches('h2.big-title') && ${SEL}.isContentEditable`));
  await e.undo();
  await t.waitFor(`document.querySelector('.editor-slide-list li.is-selected .scene h2')?.textContent !== 'New words'`).catch(() => {});
  t.check('one undo step takes the HTML back', (await t.eval(`document.querySelector('.editor-slide-list li.is-selected .scene h2').textContent`)) !== 'New words');
  await e.tab('code');
  await t.eval(`document.querySelector('details[data-html-open="element"]').open = true; true`);
  // typed on the slide, then the HTML field: the field shows the typed text first (nothing typed is lost)
  await t.eval(`(() => { const h = document.querySelector('.editor-stage .scene h2'); h.focus(); const r = document.createRange(); r.selectNodeContents(h); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true; })()`);
  await t.type(' TYPED');
  await t.eval(`(() => { const f = document.querySelector('.editor-panel-body textarea[data-html="element"]'); f.focus(); return true; })()`);
  t.check('going into the HTML field after typing on the slide: it shows the typed text', /TYPED/.test(await t.eval(`document.querySelector('.editor-panel-body textarea[data-html="element"]').value`)));
  await typeHtml('element', '<h2 class="reveal big-title">Safe<meta http-equiv="refresh" content="1;url=about:blank"><iframe srcdoc="<script>parent.__pwn=1</script>"></iframe><a href="java&#9;script:alert(1)">x</a></h2>');
  await commit();
  await t.waitFor(`document.querySelector('.editor-slide-list li.is-selected .scene h2')?.textContent.startsWith('Safe')`).catch(() => {});
  const safe = await t.eval(`document.querySelector('.editor-slide-list li.is-selected .scene h2').outerHTML`);
  t.check('meta, frames and hidden javascript: links are left out', !/meta|iframe|srcdoc|script/i.test(safe) && (await t.eval(`!window.__pwn && location.href.startsWith('file:')`)), safe);
  // the whole slide
  await e.tab('code');
  await t.eval(`document.querySelector('details[data-html-open="slide"]').open = true; true`);
  const slideHtml = await t.eval(`document.querySelector('.editor-panel-body textarea[data-html="slide"]').value`);
  await typeHtml('slide', slideHtml.replace('Period · source', 'Spring 2026').replace('data-name="numbers"', 'data-name="title"'));
  await commit();
  t.check('a slide renamed to a name that is taken is refused', (await t.eval(`document.querySelector('.editor-stage .scene')?.dataset.name`)) === 'numbers' && !/Spring 2026/.test(await t.eval(`document.querySelector('.editor-stage .scene .eyebrow').textContent`)));
  await typeHtml('slide', slideHtml.replace('Period · source', 'Spring 2026'));
  await commit();
  await t.waitFor(`/Spring 2026/.test(document.querySelector('.editor-stage .scene .eyebrow')?.textContent || '')`, { label: 'slide HTML' }).catch(() => {});
  t.check('the slide’s HTML puts the whole slide in place (the canvas and the list follow)', /Spring 2026/.test(await t.eval(`document.querySelector('.editor-stage .scene .eyebrow').textContent`)) && /Spring 2026/.test(await t.eval(`document.querySelector('.editor-slide-list li.is-selected .scene .eyebrow').textContent`)));

  // JavaScript of this slide: hooks; ▶ runs it on a playing copy; a script that does not parse is not kept
  await e.tab('code');
  const typeJs = async (place, text) => {
    await t.eval(`(() => { const d = document.querySelector('details[data-html-open="js-${place}"]'); d.open = true; const f = document.querySelector('.editor-panel-body textarea[data-js="${place}"]'); f.focus(); f.select(); return true; })()`);
    await t.type(text);
  };
  await typeJs('slide', 'show.onEnter(slide => { show.add(Object.assign(document.createElement("b"), { className: "js-made", textContent: "made by a script " + show.window })); });\nshow.onEnter(() => { throw new Error("oops"); });');
  await commit();
  await t.waitFor(`!!document.querySelector('.editor-stage .scene script[data-slide-js]')`, { label: 'slide JS written' }).catch(() => {});
  t.check('the slide’s JavaScript is written in the slide (type="text/plain": not run by itself)', await t.eval(`(() => { const s = document.querySelector('.editor-stage .scene script[data-slide-js]'); return !!s && s.type === 'text/plain' && /show\.onEnter/.test(s.textContent); })()`) && !(await t.eval(`!!document.querySelector('.editor-stage .scene .js-made')`)));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="code-run"]').click(); true`);
  await t.waitFor(`!!document.querySelector('.editor-stage .scene .js-made')`, { label: 'ran on the canvas' }).catch(() => {});
  t.check('▶ Play with scripts runs it on the canvas (show.window: editor); an error in one hook is caught and shown', /editor/.test(await t.eval(`document.querySelector('.editor-stage .scene .js-made')?.textContent || ''`)) && /oops/.test(await t.eval(`document.querySelector('.editor-js-errors')?.textContent || ''`)));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="code-stop"]').click(); true`);
  await t.waitFor(`!document.querySelector('.editor-stage .scene .js-made')`).catch(() => {});
  t.check('■ Stop: what it made is gone and never saved', !(await t.eval(`!!document.querySelector('.editor-stage .scene .js-made') || !!document.querySelector('.editor-slide-list .scene .js-made')`)));
  await typeJs('deck', 'const tag = "<script>";');
  await commit();
  t.check('a script with <script or <!-- in it is refused (it would break the file)', /x3C/.test(await t.eval(`document.querySelector('.toast')?.textContent || ''`)));
  // the slide's HTML keeps the slide's own script
  await t.eval(`document.querySelector('details[data-html-open="slide"]').open = true; true`);
  const withScript = await t.eval(`document.querySelector('.editor-panel-body textarea[data-html="slide"]').value`);
  await t.eval(`(() => { const f = document.querySelector('.editor-panel-body textarea[data-html="slide"]'); f.focus(); f.select(); return true; })()`);
  await t.type(withScript.replace('Spring 2026', 'Spring 2027'));
  await commit();
  await t.waitFor(`/Spring 2027/.test(document.querySelector('.editor-stage .scene .eyebrow')?.textContent || '')`).catch(() => {});
  t.check('changing the slide’s HTML keeps its own script', /Spring 2027/.test(await t.eval(`document.querySelector('.editor-stage .scene .eyebrow').textContent`)) && (await t.eval(`!!document.querySelector('.editor-stage .scene > script[data-slide-js]')`)));
  await e.tab('code');
  await typeJs('deck', 'show.onEnter((slide, info) => { document.body.dataset.lastSlide = info.name; ');
  await commit();
  t.check('a script that does not parse is not kept (it says why)', !(await t.eval(`(document.querySelector('.editor-panel-body textarea[data-js="deck"]').defaultValue || '').includes('lastSlide')`)) && /Not kept/.test(await t.eval(`document.querySelector('.toast')?.textContent || ''`)));
  await typeJs('deck', 'show.onEnter((slide, info) => { document.body.dataset.lastSlide = info.name + "@" + show.window; });');
  await commit();
  await t.waitFor(`/lastSlide/.test(document.querySelector('.editor-panel-body textarea[data-js="deck"]')?.defaultValue || '')`).catch(() => {});

  // saved in the file; the page shows its own CSS again when the editor closes
  await t.eval(`window.__beforeSave = 1; sessionStorage.removeItem('test-written'); true`);
  await e.blur();
  await t.key('s', 'KeyS', 83, 2);
  await t.waitFor(`JSON.parse(sessionStorage.getItem('test-written') || '[]').length >= 1`, { timeout: 10000, label: 'saved' });
  const saved = await t.eval(`JSON.parse(sessionStorage.getItem('test-written')).pop().text`);
  t.check('the file has the CUSTOM CSS block and the slide’s own CSS', /<style id="deckCustomCss">\s*\.scene \.stat \{ outline: 3px solid rgb\(4, 5, 6\); \}/.test(saved) && /<style data-slide-css="">@scope \{/.test(saved));

  // the saved file runs them when presented; ?safe=1 does not
  const file = join(tmpdir(), `deck-test-code-${process.pid}.html`);
  writeFileSync(file, saved);
  await t.eval(`sessionStorage.clear(); true`);   // (the save's own note would open the editor again in that file)
  for (const safe of [false, true]) {
    await t.send('Page.navigate', { url: 'about:blank' });
    await t.waitFor(`location.href === 'about:blank'`);
    await t.send('Page.navigate', { url: pathToFileURL(file).href + (safe ? '?safe=1' : '') + '#numbers' });
    await t.waitFor(`document.readyState === 'complete' && !!document.querySelector('#stage .scene.is-active')`, { timeout: 15000, label: 'saved file opens' });
    await sleep(300);
    if (!safe) {
      t.check('presented: the slide’s script runs when the slide comes on (show.window: single), the presentation’s on every slide', /single/.test(await t.eval(`document.querySelector('#stage .scene.is-active .js-made')?.textContent || ''`)) && (await t.eval(`document.body.dataset.lastSlide`)) === 'numbers@single');
      await t.key('ArrowRight', 'ArrowRight', 39);
      for (let i = 0; i < 12 && (await t.eval(`document.querySelector('#stage .scene.is-active').dataset.name`)) === 'numbers'; i++) { await t.key('ArrowRight', 'ArrowRight', 39); await sleep(150); }
      t.check('…and what it made goes when the slide goes (an error in a hook stopped nothing)', !(await t.eval(`!!document.querySelector('#stage .js-made')`)) && (await t.eval(`document.body.dataset.lastSlide`)) !== 'numbers@single', JSON.stringify([await t.eval(`document.querySelector('#stage .scene.is-active').dataset.name`), await t.eval(`document.body.dataset.lastSlide`), await t.eval(`document.querySelectorAll('#stage .js-made').length`)]));
    } else {
      t.check('?safe=1: none of the scripts run (and it says so)', !(await t.eval(`!!document.querySelector('#stage .js-made') || !!document.body.dataset.lastSlide`)) && /Safe mode/.test(await t.eval(`document.querySelector('.toast')?.textContent || ''`)));
    }
  }
}
