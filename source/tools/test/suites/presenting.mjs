// Presenting: settings panel (colours, time estimates, arrow keys), the presenter view with its audience window (schedule
// and pace, notes per step, countdown, click badge, 24-hour clock, chapter and keys drawers, blank, product tabs,
// spotlight and zoom synced to the audience, spotlight settings, follow mode), and print / PDF (handout with notes, slides only).
export const covers = ['js/0', 'js/10-', 'js/11-', 'js/12-', 'js/21-', 'js/22-', 'js/23-', 'css/0', 'css/10-', 'css/11-', 'css/12-', 'deck.html', 'slides/', 'parts/', 'interface-texts.json'];
export const timeoutMs = 180000;

const RIGHT = ['ArrowRight', 'ArrowRight', 39], LEFT = ['ArrowLeft', 'ArrowLeft', 37], ESC = ['Escape', 'Escape', 27];
const ACTIVE = `document.querySelector('#stage > .scene.is-active')?.dataset.name`;
const FAKE_CLOCK = `(() => { const real = Date.now.bind(Date); let offset = 0; window.__advance = ms => { offset += ms; }; Date.now = () => real() + offset; return true; })()`;
const DECK_HASH_RELOAD = `document.readyState === 'complete' && !!document.querySelector('#stage .scene.is-active')`;

import { makePage } from '../harness.mjs';

/** The three parts are independent: each runs in its own isolated tab, at the same time. */
export default async function (t) {
  const tabs = [t, await makePage(t.connection, 'presenting 2'), await makePage(t.connection, 'presenting 3')];
  try {
    await Promise.all([part1, part2, part3].map((part, i) => part(tabs[i]).catch(error => { throw new Error('part ' + (i + 1) + ' after "' + (tabs[i].results.at(-1)?.label || 'title') + '": ' + error.message); })));
  } finally {
    for (const tab of tabs.slice(1)) {
      t.results.push(...tab.results);
      t.errors.push(...tab.errors);
      await tab.close();
    }
  }
}

function tools(t) {
  const key = (...k) => t.key(...k);
  const active = () => t.eval(ACTIVE);
  const goto = async name => { await t.eval(`location.hash = '#${name}'`); await t.waitFor(`${ACTIVE} === '${name}'`); await t.settle(); };
  const chapter = async (index, name) => {   // a click on the chapter list of the presenter view
    await t.eval(`document.querySelectorAll('.presenter-chapters button')[${index}].click()`);
    await t.waitFor(`${ACTIVE} === '${name}'`);
  };
  const stageVar = (w, name) => w.eval(`document.getElementById('stage').style.getPropertyValue('${name}')`);
  const hasClass = (w, sel, cls) => w.eval(`document.querySelector('${sel}').classList.contains('${cls}')`);
  const spotlightOn = w => w.eval(`document.getElementById('stage').classList.contains('is-spotlight')`);
  const settingsHidden = () => t.eval(`document.getElementById('settingsPanel').hidden`);
  const openSettings = async () => { await key('s', 'KeyS', 83); await t.waitFor(`!document.getElementById('settingsPanel').hidden`, { label: 'settings open' }); };
  const setInput = (id, value) => t.eval(`(() => { const i = document.getElementById('${id}'); i.value = ${value}; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  const move = (x, y) => t.mouse('mouseMoved', x, y, { buttons: 0 });
  const drawerShown = sel => t.eval(`document.querySelector('${sel}').getBoundingClientRect().left < window.innerWidth - 100`);
  const waitDrawer = (sel, shown) => t.waitFor(`(document.querySelector('${sel}').getBoundingClientRect().left < window.innerWidth - 100) === ${shown}`, { label: sel + (shown ? ' open' : ' closed') });

  /** Presses P (a real key, so the pop-up is allowed) and returns the audience window. */
  /** P: the presenter view and the audience window; waits for the audience's hello (before it, the presenter ignores
      what the audience window sends). */
  async function openPresenter() {
    await t.eval(`window.__hello = false; if (!window.__helloListener) { window.__helloListener = true; window.addEventListener('message', e => { if (e.data && e.data.type === 'hello') window.__hello = true; }); } true`);
    await key('p', 'KeyP', 80);
    await t.waitFor(`!!document.querySelector('.presenter-view')`, { label: 'presenter view' });
    const audience = await t.waitForWindow('audience=1');
    await audience.waitFor(`document.readyState === 'complete' && !!document.querySelector('.scene.is-active')`, { label: 'audience loaded' });
    await t.waitFor(`window.__hello`, { timeout: 10000, label: 'audience hello' });
    return audience;
  }
  async function closeAudience(audience) {
    await t.connection.send('Target.closeTarget', { targetId: audience.targetId });
  }
  const audienceName = a => a.eval(`document.querySelector('.scene.is-active').dataset.name`);
  const mainBox = () => t.eval(`(() => { const r = document.querySelector('.presenter-main').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);

  return { key, active, goto, chapter, stageVar, hasClass, spotlightOn, settingsHidden, openSettings, setInput, move, drawerShown, waitDrawer, openPresenter, closeAudience, mainBox };
}

async function part1(t) {
  const { key, active, goto, chapter, stageVar, hasClass, spotlightOn, settingsHidden, openSettings, setInput, move, drawerShown, waitDrawer, openPresenter, closeAudience, mainBox } = tools(t);
  let a;
  // ======================================================================== settings panel
  await t.open('title', { clear: true });
  await t.eval(FAKE_CLOCK);
  await openSettings();
  t.check('colour pickers built', (await t.eval(`document.querySelectorAll('#colorPickers input').length`)) === 10);
  t.check('estimate fields built', (await t.eval(`document.querySelectorAll('#estimateInputs input').length`)) === 38);
  await t.eval(`document.querySelectorAll('#estimateInputs input')[0].focus()`);
  await key(...RIGHT);
  await t.sleep(250);   // nothing may happen: the arrow edits the time field
  t.check('arrow keys edit a focused time field, slides stay', (await t.eval(`location.hash`)) === '#title' && !(await settingsHidden()));
  await t.eval(`document.getElementById('btnCloseSettings').focus()`);
  await key(...RIGHT);
  await t.waitFor(`${ACTIVE} === 'big-letters'`);
  t.check('arrow clicker closes panel and advances', (await t.eval(`location.hash`)) === '#big-letters' && await settingsHidden());
  await goto('title');
  await openSettings();
  await t.eval(`(() => { const i = document.querySelectorAll('#colorPickers input')[5]; i.value = '#ff00ff'; i.dispatchEvent(new Event('input')); })()`);
  t.check('accent applied', (await t.eval(`getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()`)) === '#ff00ff');
  t.check('accent saved', (await t.eval(`localStorage.getItem('presentation-deck.colors')`)).includes('#ff00ff'));
  const estimateInput = value => t.eval(`(() => { const i = document.querySelectorAll('#estimateInputs input')[1]; i.value = '${value}'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); return true; })()`);
  await estimateInput('abc');
  t.check('invalid estimate flagged', await t.eval(`document.querySelectorAll('#estimateInputs input')[1].classList.contains('is-invalid')`));
  await estimateInput('1:15');
  t.check('estimate saved', (await t.eval(`localStorage.getItem('presentation-deck.estimates')`)) === '{"big-letters":75}');
  await key(...ESC);
  await t.waitFor(`document.getElementById('settingsPanel').hidden`);
  t.check('Esc closes settings', true);

  await t.send('Page.reload', {});
  await t.waitFor(DECK_HASH_RELOAD, { timeout: 15000, label: 'reloaded' });
  await t.eval(FAKE_CLOCK);
  t.check('colour persists after reload', (await t.eval(`getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()`)) === '#ff00ff');
  await t.eval(`document.getElementById('btnSettings').click()`);
  await t.eval(`document.getElementById('btnResetColors').click()`);
  t.check('reset colours', (await t.eval(`getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()`)) === '#f4b63f');
  await t.eval(`document.getElementById('btnCloseSettings').click()`);

  // ======================================================================== presenter view, schedule and pace
  a = await openPresenter();
  t.check('schedule waits on slide 1', (await t.eval(`document.querySelector('.presenter-pace').textContent`)).includes('first Next'));
  await key(...RIGHT);
  await a.waitFor(`document.querySelector('.scene.is-active').dataset.name === 'big-letters' && location.hash.startsWith('#big-letters')`);
  t.check('audience follows Next', true);
  t.check('timer runs after first Next', !(await hasClass(t, '.presenter-timer', 'is-paused')));
  t.check('on schedule at start', (await t.eval(`document.getElementById('deck').dataset.pace`)) === 'on-time');
  await t.eval(`__advance(120000)`);   // 2 minutes on slide 2 (estimate 1:15)
  await t.waitFor(`document.getElementById('deck').dataset.pace === 'behind'`, { label: 'behind after 2 min' });
  t.check('behind after 2 min on a 1:15 slide', true, await t.eval(`document.querySelector('.presenter-pace').textContent`));
  await t.eval(`__advance(60000)`);
  await t.waitFor(`document.getElementById('deck').dataset.pace === 'well-behind'`, { label: 'well behind' });
  t.check('well behind later', true);
  await key(...RIGHT);
  await a.waitFor(`document.querySelector('.scene.is-active').dataset.name === 'agenda'`, { label: 'audience on slide 3' });
  t.check('audience follows to slide 3', true);
  await t.waitFor(`document.querySelectorAll('.presenter-chapters button')[1].querySelector('.chapter-time').classList.contains('is-over-time')`);
  t.check('slide 2 marked over time', true);
  t.check('chapter bar segment over time', await t.eval(`document.querySelectorAll('#chapterBar button')[1].classList.contains('is-over-time')`));
  t.check('marker shown', await hasClass(t, '.pace-marker', 'is-shown'));
  // mindset steps sync
  await chapter(11, 'mindset');
  await t.settle();
  for (let i = 0; i < 2; i++) { const before = await t.eval(`document.getElementById('modeDescription').textContent`); await key(...RIGHT); await t.waitFor(`document.getElementById('modeDescription').textContent !== ${JSON.stringify(before)}`); }
  const modeP = await t.eval(`document.getElementById('modeDescription').textContent`);
  await a.waitFor(`document.getElementById('modeDescription').textContent === ${JSON.stringify(modeP)}`, { label: 'audience mode description' });
  t.check('mindset step syncs', modeP.length > 0, modeP);
  // jump to a slide far ahead in the plan
  await chapter(25, 'reuse');
  await a.waitFor(`document.querySelector('.scene.is-active').dataset.name === 'reuse'`);
  t.check('audience follows chapter click', true);
  // product tab click syncs
  await chapter(7, 'product');
  await t.settle();
  await t.eval(`document.getElementById('tab-1').click()`);
  await a.waitFor(`document.querySelectorAll('.screenshot img')[1].classList.contains('is-selected')`);
  t.check('product tab syncs', true);
  await key('b', 'KeyB', 66);
  await a.waitFor(`document.getElementById('deck').classList.contains('is-blank')`);
  t.check('blank syncs', true);
  await key(...RIGHT);
  await a.waitFor(`!document.getElementById('deck').classList.contains('is-blank')`);
  t.check('unblank syncs', true);
  // going Back does not change the pace (measured against the furthest slide)
  await chapter(14, 'flow');
  await key(...RIGHT);   // the first Next finishes the flow, the second goes on
  await key(...RIGHT);
  await t.waitFor(`${ACTIVE} === 'chart'`);
  const paceText = () => t.eval(`document.getElementById('deck').dataset.pace`);   // the status (ahead / on time / behind); its text holds minutes that follow the real clock
  const before = await paceText();
  await key(...LEFT);
  await t.waitFor(`${ACTIVE} !== 'chart'`);
  await t.settle();
  t.check('Back keeps pace status', (await paceText()) === before, before);
  // PageDown with settings open closes it and moves on
  t.check('Back landed on flow', (await active()) === 'flow');
  await openSettings();
  await key('PageDown', 'PageDown', 34);
  await t.waitFor(`document.getElementById('settingsPanel').hidden && ${ACTIVE} === 'chart'`, { label: 'PageDown closes settings and advances' });
  t.check('PageDown closes settings and advances', true);
  await key(...ESC);
  await t.waitFor(`!document.querySelector('.presenter-view')`);
  t.check('Esc closes presenter', true);
  t.check('schedule colours cleared', !(await t.eval(`'pace' in document.getElementById('deck').dataset`)));
  t.check('no page errors (audience, schedule)', a.errors.length === 0, a.errors.join(' | '));
  await closeAudience(a);
}

async function part2(t) {
  const { key, active, goto, chapter, stageVar, hasClass, spotlightOn, settingsHidden, openSettings, setInput, move, drawerShown, waitDrawer, openPresenter, closeAudience, mainBox } = tools(t);
  let a;
  // ======================================================================== notes, countdown, spotlight and zoom, print
  await t.open('title', { clear: true });
  await t.eval(FAKE_CLOCK);
  a = await openPresenter();
  await t.waitFor(`document.querySelector('.presenter-notes').textContent.startsWith('Welcome')`, { label: 'notes of slide 1' });
  t.check('notes of slide 1 shown', true);
  t.check('notes hidden on the slide itself', await t.eval(`getComputedStyle(document.querySelector('.scene.is-active .speaker-notes')).display === 'none'`));
  t.check('notes not in audience view', await a.eval(`!document.querySelector('.presenter-notes') && getComputedStyle(document.querySelector('.scene.is-active .speaker-notes')).display === 'none'`));
  const plan = await t.eval(`[...document.querySelectorAll('#stage > .scene')].slice(1).reduce((s, x) => s + +x.dataset.estimate, 0)`);
  const countdown0 = await t.eval(`document.querySelector('.presenter-countdown').textContent`);
  const expected = String(Math.floor(plan / 60)).padStart(2, '0') + ':' + String(plan % 60).padStart(2, '0') + 'left';
  t.check('countdown waits with plan from slide 2', countdown0 === expected, countdown0 + ' vs ' + expected);
  await key(...RIGHT);
  await t.waitFor(`${ACTIVE} === 'big-letters'`);
  await t.eval(`__advance(61000)`);
  const countdownNear = `(() => { const m = document.querySelector('.presenter-countdown').textContent.match(/(\\d+):(\\d+)left/); return !!m && Math.abs(+m[1] * 60 + +m[2] - ${plan - 61}) <= 3; })()`;
  await t.waitFor(countdownNear, { label: 'countdown runs down' });
  t.check('countdown runs down', true, await t.eval(`document.querySelector('.presenter-countdown').textContent`));
  t.check('notes follow slide 2', (await t.eval(`document.querySelector('.presenter-notes').textContent`)).startsWith('The letters drop in'));
  await t.eval(`__advance(${(plan + 40) * 1000})`);
  await t.waitFor(`/^\\+.*over$/.test(document.querySelector('.presenter-countdown').textContent)`, { label: 'countdown over' });
  t.check('countdown goes over in rose', await hasClass(t, '.presenter-countdown', 'is-over-time'));

  // notes per step (mindset: data-note-step 0..4)
  await chapter(11, 'mindset');
  const lit = `[...document.querySelectorAll('.presenter-notes .is-current-step')].map(e => e.dataset.noteStep).join(',')`;
  const badge = () => t.eval(`(() => { const b = document.querySelector('.presenter-clicks'); return (b.hidden ? 'hidden' : b.textContent) + (b.classList.contains('is-many') ? ' many' : ''); })()`);
  await t.waitFor(`${lit} === '0'`, { label: 'step 0 note lit' });
  t.check('step 0 note lit', true);
  t.check('no Now title any more', await t.eval(`!document.querySelector('.presenter-now')`));
  t.check('click badge shows 5 on mindset step 0', (await badge()) === '5 many', await badge());
  const clock = await t.eval(`document.querySelector('.presenter-clock').textContent`);
  t.check('clock is 24-hour HH:MM', /^([01]\d|2[0-3]):[0-5]\d$/.test(clock), clock);
  for (let step = 1; step <= 4; step++) {
    await key(...RIGHT);
    await t.waitFor(`${lit} === '${step}'`, { label: 'step ' + step + ' note lit' });
  }
  t.check('step 1 to 4 notes lit after Next', true);
  await t.waitFor(`(() => { const b = document.querySelector('.presenter-clicks'); return !b.hidden && b.textContent === '1'; })()`, { label: 'badge 1' });
  t.check('click badge shows 1 on the last step', (await badge()) === '1', await badge());
  const scaleBefore = await t.eval(`getComputedStyle(document.querySelector('.presenter-view')).getPropertyValue('--notes-scale').trim() || '1'`);
  await t.eval(`document.querySelector('.notes-bigger').click()`);
  await t.eval(`document.querySelector('.notes-bigger').click()`);
  const scaleAfter = await t.eval(`document.querySelector('.presenter-view').style.getPropertyValue('--notes-scale')`);
  t.check('A+ makes notes bigger and is saved', +scaleAfter > +scaleBefore && (await t.eval(`localStorage.getItem('presentation-deck.notesScale')`)) === scaleAfter, scaleBefore + ' -> ' + scaleAfter);

  // chapter drawer: hidden, opens on hover or with C
  await move(400, 400);
  await waitDrawer('.chapters-drawer', false);
  t.check('chapter drawer hidden at first', true);
  await move(1592, 250);
  await waitDrawer('.chapters-drawer', true);
  t.check('hovering the right edge opens the drawer', true);
  await move(400, 400);
  await waitDrawer('.chapters-drawer', false);
  t.check('moving away closes it', true);
  await key('c', 'KeyC', 67);
  await waitDrawer('.chapters-drawer', true);
  t.check('C keeps it open', true);
  await chapter(10, 'numbers');
  await waitDrawer('.chapters-drawer', false);
  t.check('choosing a chapter goes there and closes it', (await active()) === 'numbers');
  const notesHeight = await t.eval(`document.querySelector('.presenter-notes').getBoundingClientRect().height`);
  t.check('notes get most of the panel height', notesHeight > 250, Math.round(notesHeight) + ' px');

  // spotlight and zoom, synced to the audience window
  await chapter(17, 'quality');
  await a.waitFor(`document.querySelector('.scene.is-active').dataset.name === 'quality'`);
  await t.settle();
  const box = await mainBox();
  await key('l', 'KeyL', 76);
  await move(box.x + box.width * .75, box.y + box.height * .5);
  await t.waitFor(`document.getElementById('stage').classList.contains('is-spotlight')`);
  t.check('spotlight on in presenter', true);
  await a.waitFor(`document.getElementById('stage').classList.contains('is-spotlight')`);
  t.check('spotlight on in audience', true);
  await a.waitFor(`Math.abs(parseFloat(document.getElementById('stage').style.getPropertyValue('--pointer-x')) - 1200) < 40`, { label: 'audience spotlight follows the presenter mouse' });
  t.check('audience spotlight follows the presenter mouse', true);
  t.check('spotlight button lit', await hasClass(t, '.presenter-spotlight', 'is-on'));
  await t.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: box.x + box.width * .75, y: box.y + box.height * .5, deltaX: 0, deltaY: -100 });
  await a.waitFor(`parseFloat(document.getElementById('stage').style.getPropertyValue('--spotlight-radius')) > 180`);
  t.check('wheel makes the spotlight bigger', true);
  await key('z', 'KeyZ', 90);
  await a.waitFor(`document.getElementById('stage').style.getPropertyValue('--zoom-level') === '2'`);
  t.check('zoom on in audience', true);
  await a.waitFor(`getComputedStyle(document.getElementById('stage')).overflow === 'clip'`);
  t.check('zoomed stage clips the slide', true);
  await a.waitFor(`getComputedStyle(document.querySelector('.scene.is-active')).scale === '2'`);
  t.check('audience slide is scaled', true);
  await key(...ESC);
  await a.waitFor(`!document.getElementById('stage').classList.contains('is-spotlight') && document.getElementById('stage').style.getPropertyValue('--zoom-level') === '1'`);
  t.check('Esc ends spotlight and zoom in both windows', true);
  t.check('Esc kept the presenter view open', await t.eval(`!!document.querySelector('.presenter-view')`));
  await key('z', 'KeyZ', 90);
  await t.waitFor(`document.getElementById('stage').style.getPropertyValue('--zoom-level') === '2'`);
  await key(...RIGHT);
  await t.waitFor(`document.getElementById('stage').style.getPropertyValue('--zoom-level') === '1'`);
  await a.waitFor(`document.getElementById('stage').style.getPropertyValue('--zoom-level') === '1'`);
  t.check('a new slide ends the zoom', true);
  await t.sleep(1000);   // the presenter's last messages about the new slide have arrived (on a busy machine they come late, and a late one wins a tie)
  await a.key('l', 'KeyL', 76);
  await t.sleep(300);   // a person's next key comes later than this; within milliseconds the two windows' messages can cross in headless Chrome
  await t.waitFor(`document.getElementById('stage').classList.contains('is-spotlight')`, { timeout: 15000 });   // (a loaded machine: the message comes late)
  t.check('L in the audience window reaches the presenter', true);
  await a.waitFor(`document.getElementById('stage').classList.contains('is-spotlight')`);   // both windows show it (a person presses Esc after that)
  await a.key(...ESC);
  await t.waitFor(`!document.getElementById('stage').classList.contains('is-spotlight')`);
  t.check('no page errors (audience, notes and spotlight)', a.errors.length === 0, a.errors.join(' | '));

  // print: handout with notes, then slides only (window.print is replaced so the pages stay for printToPDF)
  await key(...ESC);
  await t.waitFor(`!document.querySelector('.presenter-view')`);
  await closeAudience(a);
  await goto('title');
  await t.eval(`window.print = () => { window.__printed = (window.__printed || 0) + 1; }`);
  await openSettings();
  await t.eval(`document.getElementById('btnPrintHandout').click()`);
  await t.waitFor(`window.__printed === 1`, { label: 'print called' });
  t.check('handout: print was called', true);
  const slideCount = await t.eval(`document.querySelectorAll('#stage > .scene').length`);
  t.check('handout: one page per slide', (await t.eval(`document.querySelectorAll('.print-pages .print-page').length`)) === slideCount && slideCount >= 16, slideCount);
  t.check('handout: notes included', (await t.eval(`document.querySelectorAll('.print-pages .print-notes').length`)) === slideCount && (await t.eval(`document.querySelector('.print-notes').textContent`)).startsWith('Welcome'));
  t.check('handout: no notes inside slide copies', (await t.eval(`document.querySelectorAll('.print-stage .speaker-notes').length`)) === 0);
  t.check('handout: no duplicate ids', await t.eval(`[...document.querySelectorAll('.print-pages [id]')].every(e => document.querySelectorAll('#' + CSS.escape(e.id)).length === 1)`));
  t.check('handout: count-ups at final value', (await t.eval(`document.querySelectorAll('.print-pages [data-to="0.5"]')[0].textContent`)) === '0.5');
  t.check('handout: portrait page size', (await t.eval(`document.querySelector('.print-page-size').textContent`)).includes('portrait'));
  await t.send('Emulation.clearDeviceMetricsOverride');
  let pdf = await t.send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
  t.check('handout PDF made', pdf.result.data.length > 10000, Math.round(pdf.result.data.length * .75 / 1024) + ' KB');
  await t.eval(`window.dispatchEvent(new Event('afterprint'))`);
  await t.waitFor(`document.querySelectorAll('.print-pages, .print-page-size').length === 0 && !document.documentElement.classList.contains('is-printing')`);
  t.check('print pages removed after printing', true);
  await openSettings();
  await t.eval(`document.getElementById('btnPrintSlides').click()`);
  await t.waitFor(`!!document.querySelector('.print-page-size')`);
  t.check('slides: landscape, no notes', (await t.eval(`document.querySelector('.print-page-size').textContent`)).includes('landscape') && (await t.eval(`document.querySelectorAll('.print-notes').length`)) === 0);
  pdf = await t.send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
  t.check('slides PDF made', pdf.result.data.length > 10000, Math.round(pdf.result.data.length * .75 / 1024) + ' KB');
  await t.eval(`window.dispatchEvent(new Event('afterprint'))`);
  await t.waitFor(`document.querySelectorAll('.print-pages').length === 0`);
  t.check('deck still works after printing', (await active()) === 'title');
  await t.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
}

async function part3(t) {
  const { key, active, goto, chapter, stageVar, hasClass, spotlightOn, settingsHidden, openSettings, setInput, move, drawerShown, waitDrawer, openPresenter, closeAudience, mainBox } = tools(t);
  let a;
  // ======================================================================== keys drawer, spotlight settings, follow mode
  await t.open('title', { clear: true });
  await key('l', 'KeyL', 76);   // spotlight on BEFORE the presenter view opens
  await t.waitFor(`document.getElementById('stage').classList.contains('is-spotlight')`);
  a = await openPresenter();
  t.check('spotlight turned on before P stays on (presenter)', await spotlightOn(t));
  await a.waitFor(`document.getElementById('stage').classList.contains('is-spotlight')`);
  t.check('spotlight turned on before P shows in audience', true);
  await key(...ESC);
  await t.waitFor(`!document.getElementById('stage').classList.contains('is-spotlight')`);
  t.check('clock is 24-hour', /^([01]\d|2[0-3]):[0-5]\d$/.test(await t.eval(`document.querySelector('.presenter-clock').textContent`)));
  t.check('no Now title or Now row', await t.eval(`!document.querySelector('.presenter-now') && !document.querySelector('.presenter-now-row')`));
  t.check('click badge on slide 1 shows 1', (await t.eval(`document.querySelector('.presenter-clicks').textContent`)) === '1');

  // keys drawer
  await move(400, 400);
  await waitDrawer('.chapters-drawer', false);
  await waitDrawer('.keys-drawer', false);
  t.check('both drawers hidden at first', true);
  await move(1592, 650);
  await waitDrawer('.keys-drawer', true);
  await waitDrawer('.chapters-drawer', false);
  t.check('hovering the lower edge opens Keys, not Chapters', true);
  const rows = await t.eval(`[...document.querySelectorAll('.presenter-keys > div')].map(r => r.textContent)`);
  t.check('key list mentions spotlight L and +', rows.some(r => r.startsWith('Spotlight') && r.endsWith('L')) && rows.some(r => r.includes('bigger') && r.includes('+')), rows.length + ' rows');
  const keyFont = await t.eval(`parseFloat(getComputedStyle(document.querySelector('.presenter-keys > div')).fontSize)`);
  t.check('key list text is large enough', keyFont >= 16, keyFont + ' px');
  await move(400, 400);
  await waitDrawer('.keys-drawer', false);
  await move(1592, 250);
  await waitDrawer('.chapters-drawer', true);
  await waitDrawer('.keys-drawer', false);
  t.check('hovering the upper edge opens Chapters, not Keys', true);
  await move(400, 400);
  await waitDrawer('.chapters-drawer', false);
  await key('k', 'KeyK', 75);
  await waitDrawer('.keys-drawer', true);
  t.check('K keeps Keys open', true);
  await key('PageUp', 'PageUp', 33);
  await t.waitFor(`document.querySelector('.presenter-last-key kbd').textContent === 'PageUp'`, { label: 'last key shown' });
  t.check('last key shows what was pressed', true);
  await key('c', 'KeyC', 67);
  await waitDrawer('.chapters-drawer', true);
  await waitDrawer('.keys-drawer', false);
  t.check('C switches to Chapters (one open at a time)', true);
  await key('c', 'KeyC', 67);
  await waitDrawer('.chapters-drawer', false);
  t.check('C closes it again', true);

  // spotlight settings
  t.check('default dim 78 %', (await stageVar(t, '--spotlight-dim')) === '0.78', await stageVar(t, '--spotlight-dim'));
  t.check('default radius 20 % of 900', (await stageVar(t, '--spotlight-radius')) === '180px', await stageVar(t, '--spotlight-radius'));
  await openSettings();
  await setInput('spotlightSize', 30);
  await setInput('spotlightDim', 50);
  await a.waitFor(`document.getElementById('stage').style.getPropertyValue('--spotlight-radius') === '270px'`, { label: 'radius 270px in audience' });
  t.check('size setting changes radius in audience', true);
  t.check('size shown as %', (await t.eval(`document.getElementById('spotlightSizeValue').textContent`)) === '30 %');
  await a.waitFor(`document.getElementById('stage').style.getPropertyValue('--spotlight-dim') === '0.5'`);
  t.check('dim setting reaches audience', true);
  await t.eval(`document.getElementById('spotlightFollow').focus()`);
  await key(...RIGHT);
  await t.waitFor(`document.getElementById('settingsPanel').hidden && document.getElementById('slideCounter').textContent.trim().startsWith('2')`, { label: 'checkbox focused: arrow closes the panel and advances' });
  t.check('focused checkbox: arrow closes the panel and advances', true);
  await key(...LEFT);
  await t.waitFor(`document.getElementById('slideCounter').textContent.trim().startsWith('1')`);
  await openSettings();
  t.check('spotlight settings saved', JSON.parse(await t.eval(`localStorage.getItem('presentation-deck.spotlight')`)).sizePercent === 30);
  await key(...ESC);
  await t.waitFor(`document.getElementById('settingsPanel').hidden`);

  // + and - resize, dim visible in the gradient
  const box4 = await mainBox();
  const centre = { x: box4.x + box4.width * .5, y: box4.y + box4.height * .5 };
  await key('l', 'KeyL', 76);
  await move(centre.x, centre.y);
  await t.waitFor(`document.getElementById('stage').classList.contains('is-spotlight')`);
  await key('+', 'Equal', 187);
  await a.waitFor(`parseFloat(document.getElementById('stage').style.getPropertyValue('--spotlight-radius')) > 270`, { label: '+ bigger' });
  const r1 = parseFloat(await stageVar(a, '--spotlight-radius'));
  t.check('+ makes the circle bigger', r1 > 270, r1);
  await key('-', 'Minus', 189); await key('-', 'Minus', 189);
  // both presses are done in the presenter; the audience window has the same size once both arrived
  const r2 = parseFloat(await stageVar(t, '--spotlight-radius'));
  await a.waitFor(`parseFloat(document.getElementById('stage').style.getPropertyValue('--spotlight-radius')) === ${r2}`, { label: '- smaller, in both windows' });
  t.check('- makes it smaller', r2 < r1, r2);
  await openSettings();
  await setInput('spotlightDim', 60);
  await key(...ESC);
  await t.waitFor(`document.getElementById('settingsPanel').hidden`);
  await a.waitFor(`document.getElementById('stage').style.getPropertyValue('--spotlight-dim') === '0.6'`);
  t.check('changing darkness keeps a resized circle', parseFloat(await stageVar(a, '--spotlight-radius')) === r2, await stageVar(a, '--spotlight-radius'));
  await openSettings();
  await setInput('spotlightDim', 50);
  await key(...ESC);
  await t.waitFor(`document.getElementById('settingsPanel').hidden`);
  await a.waitFor(`getComputedStyle(document.querySelector('.spotlight')).backgroundImage.includes('0.5')`, { label: 'dim in gradient' });
  t.check('dim used by the overlay', true);
  await key(...ESC);
  await t.waitFor(`!document.getElementById('stage').classList.contains('is-spotlight')`);
  t.check('Esc ends the spotlight', true);
  await key('+', 'Equal', 187);
  await t.sleep(150);   // nothing may happen
  t.check('+ does nothing when spotlight and zoom are off', parseFloat(await stageVar(t, '--spotlight-radius')) === r2);

  // follow mode: shows while the mouse moves, hides when it stops
  await openSettings();
  await t.eval(`(() => { const i = document.getElementById('spotlightFollow'); i.checked = true; i.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await key(...ESC);
  await t.waitFor(`document.getElementById('settingsPanel').hidden`);
  await move(box4.x + 300, box4.y + 200);
  await move(box4.x + 320, box4.y + 210);
  await t.waitFor(`document.getElementById('stage').classList.contains('is-spotlight')`);
  t.check('follow: shows while the mouse moves', true);
  await a.waitFor(`document.getElementById('stage').classList.contains('is-spotlight')`);
  t.check('follow: shows in audience too', true);
  t.check('follow: Spotlight button stays off', !(await hasClass(t, '.presenter-spotlight', 'is-on')));
  await t.waitFor(`!document.getElementById('stage').classList.contains('is-spotlight')`, { label: 'follow hides after the mouse stops' });
  await a.waitFor(`!document.getElementById('stage').classList.contains('is-spotlight')`);
  t.check('follow: hides after the mouse stops', true);
  await move(1450, 500);
  await t.sleep(250);   // nothing may happen over the side panel
  t.check('follow: not over the side panel', !(await spotlightOn(t)));
  await key('l', 'KeyL', 76);
  await t.sleep(1900);   // longer than the hide delay (1.5 s)
  t.check('follow + L: stays on after the mouse stops', await spotlightOn(t));
  await key(...ESC);
  await t.waitFor(`!document.getElementById('stage').classList.contains('is-spotlight')`);
  await key('z', 'KeyZ', 90);
  await t.waitFor(`document.getElementById('stage').style.getPropertyValue('--zoom-level') === '2'`);
  await move(box4.x + 330, box4.y + 220);
  await t.sleep(250);   // nothing may happen while zoomed
  t.check('follow: no spotlight while zoomed', !(await spotlightOn(t)));
  await key(...ESC);
  await t.waitFor(`document.getElementById('stage').style.getPropertyValue('--zoom-level') === '1'`);
  await move(box4.x + 300, box4.y + 200);
  await t.waitFor(`document.getElementById('stage').classList.contains('is-spotlight')`);
  await key('+', 'Equal', 187);
  for (let i = 0; i < 20 && !(await spotlightOn(a)); i++) await t.sleep(100);   // (the message to the audience window may take a moment under load)
  t.check('follow: audience does not latch the spotlight', await spotlightOn(a));
  await a.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }))`);
  await t.waitFor(`!document.getElementById('stage').classList.contains('is-spotlight')`, { label: 'hides after + in the audience window too' });
  t.check('follow: hides after + in the audience window too', !(await hasClass(t, '.presenter-spotlight', 'is-on')));
  await openSettings();
  await t.eval(`document.getElementById('btnResetSpotlight').click()`);
  await a.waitFor(`document.getElementById('stage').style.getPropertyValue('--spotlight-radius') === '180px'`);
  t.check('reset spotlight', (await t.eval(`localStorage.getItem('presentation-deck.spotlight')`)) === null && !(await t.eval(`document.getElementById('spotlightFollow').checked`)));
  await key(...ESC);
  await t.waitFor(`document.getElementById('settingsPanel').hidden`);
  await move(box4.x + 300, box4.y + 200);
  await t.sleep(250);   // nothing may happen
  t.check('after reset no follow', !(await spotlightOn(t)));
  await key('End', 'End', 35);
  await t.waitFor(`document.getElementById('slideCounter').textContent.trim().startsWith('38')`);
  await t.waitFor(`document.querySelector('.presenter-clicks').getBoundingClientRect().width === 0`);
  t.check('click badge hidden on the last slide', true);
  t.check('cue says Last slide', (await t.eval(`document.querySelector('.presenter-cue').textContent`)) === 'Last slide');
  t.check('no page errors (audience, keys and spotlight settings)', a.errors.length === 0, a.errors.join(' | '));


  // v112: Zoom in on this click: the slide zooms towards the item on its click, back out with Back
  await t.open('numbers');
  await t.eval(`(() => { const el = document.querySelector('.scene[data-name="numbers"] h2'); el.setAttribute('data-reveal-step', '1'); el.setAttribute('data-reveal-effect', 'highlight'); el.setAttribute('data-zoom-in', '1.6'); return true; })()`);
  await key('ArrowRight', 'ArrowRight', 39);
  await t.waitFor(`document.getElementById('stage').hasAttribute('data-step-zoomed')`, { label: 'zoomed in' }).catch(() => {});
  t.check('Zoom in on this click: on its click the stage zooms in (1.6) towards it', await t.eval(`(() => { const stage = document.getElementById('stage'); return stage.style.getPropertyValue('--step-zoom') === '1.6' && /px .*px/.test(stage.style.getPropertyValue('--step-zoom-shift')); })()`));
  await key('ArrowLeft', 'ArrowLeft', 37);
  await t.waitFor(`!document.getElementById('stage').hasAttribute('data-step-zoomed')`, { label: 'zoomed out', timeout: 4000 }).catch(() => {});
  t.check('…Back: zoomed out again (and then the Z zoom follows the mouse as before)', await t.eval(`(() => { const stage = document.getElementById('stage'), scene = document.querySelector('.scene.is-active'); return stage.style.getPropertyValue('--step-zoom') === '1' && !stage.hasAttribute('data-step-zoomed') && getComputedStyle(scene).transformOrigin === getComputedStyle(stage).getPropertyValue('--zoom-x').trim() + ' ' + getComputedStyle(stage).getPropertyValue('--zoom-y').trim(); })()`));

  // v121: a slide's transition speed: Slow makes its transition take .9 s
  await t.open('numbers');
  await t.eval(`document.querySelector('.scene[data-name="principles"]')?.setAttribute('data-transition-speed', 'slow') || true`);
  await t.eval(`(() => { location.hash = 'principles'; return true; })()`);
  await t.waitFor(`document.getElementById('stage').dataset.transitionSpeed === 'slow'`, { label: 'slow' }).catch(() => {});
  t.check('Transition speed Slow: the stage takes the slide\'s speed, its transition .9 s', await t.eval(`(() => { const stage = document.getElementById('stage'); const scene = document.querySelector('.scene.is-active'); return stage.dataset.transitionSpeed === 'slow' && getComputedStyle(scene).transitionDuration.split(',')[0].trim() === '0.9s'; })()`));


  // v125: transition Push: the new slide comes from the side (forward: from the right), whole, no fade
  await t.open('numbers');
  await t.eval(`document.querySelector('.scene[data-name="principles"]')?.setAttribute('data-transition', 'push') || true`);
  const pushIndex = await t.eval(`[...document.querySelectorAll('#stage > .scene')].findIndex(s => s.dataset.name === 'principles')`);
  const numbersIndex = await t.eval(`[...document.querySelectorAll('#stage > .scene')].findIndex(s => s.dataset.name === 'numbers')`);
  await t.eval(`(() => { location.hash = 'principles'; return true; })()`);
  await t.waitFor(`document.getElementById('stage').dataset.transition === 'push'`, { label: 'push' }).catch(() => {});
  t.check('Transition Push: the stage takes it, the slide glides its transform (no delay, no fade)', await t.eval(`(() => { const scene = document.querySelector('.scene[data-name="principles"]'); const cs = getComputedStyle(scene); return document.getElementById('stage').dataset.transition === 'push' && /transform/.test(cs.transitionProperty) && cs.opacity === '1'; })()`) && pushIndex > numbersIndex);

  // v126: transition Cover: the new slide comes over the old one, which stays where it was
  await t.open('numbers');
  await t.eval(`document.querySelector('.scene[data-name="principles"]')?.setAttribute('data-transition', 'cover') || true`);
  await t.eval(`(() => { location.hash = 'principles'; return true; })()`);
  await t.waitFor(`document.getElementById('stage').dataset.transition === 'cover'`, { label: 'cover' }).catch(() => {});
  t.check('Transition Cover: the new slide over the old one (z-index), the old one not moving', await t.eval(`(() => { const now = getComputedStyle(document.querySelector('.scene[data-name="principles"]')), old = document.querySelector('.scene[data-name="numbers"]'); return document.getElementById('stage').dataset.transition === 'cover' && now.zIndex === '2' && (!old.classList.contains('is-leaving') || getComputedStyle(old).transform === 'none'); })()`));

  // v130: transition Uncover: the old slide moves away over the new one, which opens in step
  await t.open('numbers');
  await t.eval(`document.querySelector('.scene[data-name="principles"]')?.setAttribute('data-transition', 'uncover') || true`);
  await t.eval(`(() => { location.hash = 'principles'; return true; })()`);
  await t.waitFor(`document.getElementById('stage').dataset.transition === 'uncover'`, { label: 'uncover' }).catch(() => {});
  t.check('Transition Uncover: the new slide under the old one (z-index 1), its clip opening', await t.eval(`(() => { const now = getComputedStyle(document.querySelector('.scene[data-name="principles"]')); return document.getElementById('stage').dataset.transition === 'uncover' && now.zIndex === '1' && /clip-path/.test(now.transitionProperty); })()`));

  // v135: transitions Wipe and Circle: the new slide over the old one (z-index 2), its clip opening; the old one still
  for (const kind of ['wipe', 'circle', 'split']) {
    await t.open('numbers');
    await t.eval(`document.querySelector('.scene[data-name="principles"]')?.setAttribute('data-transition', '${kind}') || true`);
    await t.eval(`(() => { location.hash = 'principles'; return true; })()`);
    await t.waitFor(`document.getElementById('stage').dataset.transition === '${kind}'`, { label: kind }).catch(() => {});
    t.check(`Transition ${kind}: the new slide over the old one, its clip opening, the old one not moving`, await t.eval(`(() => { const now = getComputedStyle(document.querySelector('.scene[data-name="principles"]')), old = document.querySelector('.scene[data-name="numbers"]'); return document.getElementById('stage').dataset.transition === '${kind}' && now.zIndex === '2' && /clip-path/.test(now.transitionProperty) && (!old.classList.contains('is-leaving') || getComputedStyle(old).transform === 'none'); })()`));
    t.check(`…${kind}: the old slide gives way in step (a clip or a hole, not shown through the new one)`, await t.eval(`(() => { const old = document.querySelector('.scene[data-name="numbers"]'); if (!old.classList.contains('is-leaving')) return true; const cs = getComputedStyle(old); return '${kind}' === 'split' ? /linear-gradient/.test(cs.maskImage) && /--scene-hole/.test(cs.transitionProperty) : '${kind}' === 'wipe' ? /inset/.test(cs.clipPath) && /clip-path/.test(cs.transitionProperty) : /radial-gradient/.test(cs.maskImage) && /--scene-hole/.test(cs.transitionProperty); })()`));
  }

  // v136: a slide that moves on by itself (data-advance) and the self-running loop (data-loop on the deck)
  await t.open('numbers');
  const index136 = name => `[...document.querySelectorAll('#stage > .scene')].findIndex(s => s.dataset.name === ${JSON.stringify(name)})`;
  const active136 = `[...document.querySelectorAll('#stage > .scene')].findIndex(s => s.classList.contains('is-active'))`;
  const target136 = await t.eval(`(() => { const all = [...document.querySelectorAll('#stage > .scene')]; const next = all[${index136('numbers')} + 1]; next.setAttribute('data-advance', '1'); return next.dataset.name; })()`);
  const targetIndex136 = await t.eval(index136(target136));
  await t.eval(`(() => { location.hash = '#' + ${JSON.stringify(target136)}; return true; })()`);
  await t.waitFor(`${active136} === ${targetIndex136}`, { label: 'on the slide' }).catch(() => {});
  const stepBefore136 = await t.eval(`document.querySelectorAll('#stage > .scene.is-active .is-revealed').length`);
  await t.waitFor(`${active136} !== ${targetIndex136} || document.querySelectorAll('#stage > .scene.is-active .is-revealed').length > ${stepBefore136}`, { timeout: 8000, label: 'moves on' }).catch(() => {});
  t.check('Moves on by itself: after its seconds the slide takes its next click or the next slide', await t.eval(`${active136} !== ${targetIndex136} || document.querySelectorAll('#stage > .scene.is-active .is-revealed').length > ${stepBefore136}`));
  await t.eval(`(() => { document.querySelectorAll('#stage > .scene[data-advance]').forEach(s => s.removeAttribute('data-advance')); return true; })()`);
  await t.open('numbers');
  const last136 = await t.eval(`(() => { const all = [...document.querySelectorAll('#stage > .scene')].filter(s => !s.hasAttribute('data-backup')); const last = all[all.length - 1]; last.setAttribute('data-advance', '1'); last.querySelectorAll('[data-reveal-step]').forEach(i => i.removeAttribute('data-reveal-step')); last.removeAttribute('data-steps'); document.getElementById('deck').setAttribute('data-loop', ''); return last.dataset.name; })()`);
  await t.eval(`(() => { location.hash = '#' + ${JSON.stringify(last136)}; return true; })()`);
  await t.waitFor(`${active136} === 0`, { timeout: 12000, label: 'loop' }).catch(() => {});
  t.check('Self-running: after the last slide the first comes again', (await t.eval(active136)) === 0);
  await t.eval(`(() => { document.getElementById('deck').removeAttribute('data-loop'); document.querySelectorAll('#stage > .scene[data-advance]').forEach(s => s.removeAttribute('data-advance')); return true; })()`);

  // v137: Skip this slide: Next and Back pass over it
  await t.open('numbers');
  const names137 = await t.eval(`(() => { const all = [...document.querySelectorAll('#stage > .scene')]; const i = all.findIndex(s => s.dataset.name === 'numbers'); all[i + 1].setAttribute('data-skip', ''); return [all[i + 1].dataset.name, all[i + 2].dataset.name]; })()`);
  await t.eval(`(() => { location.hash = '#' + ${JSON.stringify(names137[1])}; return true; })()`);
  await t.waitFor(`document.querySelector('#stage > .scene.is-active')?.dataset.name === ${JSON.stringify(names137[1])}`, { label: 'after' }).catch(() => {});
  await t.eval(`(() => { location.hash = '#numbers'; return true; })()`);
  await t.waitFor(`document.querySelector('#stage > .scene.is-active')?.dataset.name === 'numbers'`, { label: 'numbers' }).catch(() => {});
  for (let i = 0; i < 12 && (await t.eval(`document.querySelector('#stage > .scene.is-active').dataset.name`)) === 'numbers'; i++) { await t.key('ArrowRight', 'ArrowRight', 39); await new Promise(r => setTimeout(r, 250)); }
  t.check('Skip this slide: Next passes over it', (await t.eval(`document.querySelector('#stage > .scene.is-active').dataset.name`)) === names137[1]);
  await t.key('ArrowLeft', 'ArrowLeft', 37);
  await t.waitFor(`document.querySelector('#stage > .scene.is-active')?.dataset.name !== ${JSON.stringify(names137[1])}`, { label: 'back' }).catch(() => {});
  t.check('…and Back passes over it too', (await t.eval(`document.querySelector('#stage > .scene.is-active').dataset.name`)) === 'numbers');
  await t.eval(`(() => { document.querySelectorAll('#stage > .scene[data-skip]').forEach(s => s.removeAttribute('data-skip')); return true; })()`);

  // v142: transition Cube: the new slide turns in from the side (a 3D turn of its transform), the stage has perspective
  await t.open('numbers');
  await t.eval(`document.querySelector('.scene[data-name="principles"]')?.setAttribute('data-transition', 'cube') || true`);
  await t.eval(`(() => { location.hash = 'principles'; return true; })()`);
  await t.waitFor(`document.getElementById('stage').dataset.transition === 'cube'`, { label: 'cube' }).catch(() => {});
  t.check('Transition Cube: the stage has perspective, the slide turns its transform in', await t.eval(`(() => { const stage = document.getElementById('stage'), now = getComputedStyle(document.querySelector('.scene[data-name="principles"]')); return stage.dataset.transition === 'cube' && getComputedStyle(stage).perspective === '2600px' && /transform/.test(now.transitionProperty) && now.opacity === '1'; })()`));

  // v146: 🎉 Confetti on its click: pieces fly out of a click item when it appears (a layer beside the slide, gone after)
  await t.open('numbers');
  const confetti146 = await t.eval(`(() => { const scene = document.querySelector('#stage > .scene[data-name="numbers"]'); if (!scene) return null; const item = document.createElement('p'); item.textContent = 'Yes!'; item.setAttribute('data-reveal-step', '1'); item.setAttribute('data-confetti', ''); scene.appendChild(item); return true; })()`);
  if (confetti146) {
    await t.key('ArrowRight', 'ArrowRight', 39);
    await t.waitFor(`!!document.querySelector('#stage > .confetti-layer span')`, { timeout: 4000, label: 'confetti' }).catch(() => {});
    t.check('Confetti on its click: pieces fly out when it appears, beside the slide', await t.eval(`document.querySelectorAll('#stage > .confetti-layer span').length > 10 && !document.querySelector('#stage .scene .confetti-layer')`));
    await t.waitFor(`!document.querySelector('#stage > .confetti-layer')`, { timeout: 5000, label: 'gone' }).catch(() => {});
    t.check('…and they are gone afterwards', await t.eval(`!document.querySelector('.confetti-layer')`));
  } else t.check('Confetti: a click item on the numbers slide', false, 'no click item');

  // v147: Celebrate on its click with stars: characters fly instead of paper
  await t.open('numbers');
  await t.eval(`(() => { const scene = document.querySelector('#stage > .scene[data-name="numbers"]'); const item = document.createElement('p'); item.textContent = 'Stars!'; item.setAttribute('data-reveal-step', '1'); item.setAttribute('data-confetti', 'stars'); scene.appendChild(item); return true; })()`);
  await t.key('ArrowRight', 'ArrowRight', 39);
  await t.waitFor(`!!document.querySelector('#stage > .confetti-layer.is-glyphs span')`, { timeout: 4000, label: 'stars' }).catch(() => {});
  t.check('Celebrate with stars: stars fly out', await t.eval(`[...document.querySelectorAll('#stage > .confetti-layer.is-glyphs span')].some(span => /[★✦✧]/.test(span.textContent))`));

  // v156: Celebrate with the slide: an element that rises in with the slide bursts once it is in
  await t.open('numbers');
  await t.eval(`(() => { document.querySelector('#stage > .scene[data-name="mindset"] h2').setAttribute('data-confetti', 'stars'); location.hash = '#mindset'; return true; })()`);
  await t.waitFor(`!!document.querySelector('#stage > .confetti-layer.is-glyphs span')`, { timeout: 6000, label: 'celebrate with the slide' }).catch(() => {});
  t.check('Celebrate with the slide: stars when the title has come in', await t.eval(`!!document.querySelector('#stage > .confetti-layer.is-glyphs span')`));

  // v159: a number that rolls like an odometer: digit strips while it rolls, the plain number afterwards
  await t.open('title');
  await t.eval(`(() => { document.querySelectorAll('#stage > .scene[data-name="numbers"] .count-up').forEach(n => n.setAttribute('data-count-style', 'roll')); location.hash = '#numbers'; return true; })()`);
  await t.waitFor(`!!document.querySelector('#stage > .scene[data-name="numbers"] .count-roll-strip')`, { timeout: 3000, label: 'rolling' }).catch(() => {});
  t.check('Odometer: the digits roll on strips', await t.eval(`!!document.querySelector('#stage > .scene[data-name="numbers"] .count-roll-strip')`));
  await t.waitFor(`!document.querySelector('#stage > .scene[data-name="numbers"] .count-roll')`, { timeout: 8000, label: 'rolled' }).catch(() => {});
  t.check('…then the plain number is back', await t.eval(`(() => { const n = [...document.querySelectorAll('#stage > .scene[data-name="numbers"] .count-up')]; return n.length > 0 && n.every(x => x.children.length === 0 && x.textContent.trim() !== '') && !document.querySelector('.count-roll'); })()`));

  // v160: Celebrate on an element inside a click item (no click of its own): it bursts on that click
  await t.open('numbers');
  await t.eval(`(() => { const scene = document.querySelector('#stage > .scene[data-name="numbers"]'); const item = document.createElement('div'); item.setAttribute('data-reveal-step', '1'); const inner = document.createElement('p'); inner.textContent = 'Hearts!'; inner.setAttribute('data-confetti', 'hearts'); item.appendChild(inner); scene.appendChild(item); return true; })()`);
  await t.key('ArrowRight', 'ArrowRight', 39);
  await t.waitFor(`!!document.querySelector('#stage > .confetti-layer.is-glyphs span')`, { timeout: 4000, label: 'hearts' }).catch(() => {});
  t.check('Celebrate inside a click item: hearts fly out on that click', await t.eval(`[...document.querySelectorAll('#stage > .confetti-layer.is-glyphs span')].some(span => /[❤♥]/.test(span.textContent))`));
  // v191: the pen and the highlighter while presenting (D, H; X wipes; Esc stops), the lines kept per slide
  const lines = `document.querySelectorAll('#stage > .ink-layer polyline').length`;
  const stageMiddle = async () => t.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left + r.width * .4, y: r.top + r.height * .5 }; })()`);
  await t.key('Home', 'Home', 36);
  await t.key('d', 'KeyD', 68);
  t.check('D: the pen is on (the slide takes the mouse)', await t.eval(`document.getElementById('stage').classList.contains('is-inking') && getComputedStyle(document.querySelector('#stage > .ink-layer')).pointerEvents === 'auto'`));
  await t.drag(await stageMiddle(), 120, 40, { steps: 6 });
  t.check('…a drag draws a line on the slide', (await t.eval(lines)) === 1 && await t.eval(`!!document.querySelector('#stage > .ink-layer polyline.ink-pen') && document.querySelector('#stage > .ink-layer polyline').getAttribute('points').split(' ').length >= 3`));
  await t.key('h', 'KeyH', 72);
  await t.drag(await stageMiddle(), 0, 80, { steps: 4 });
  t.check('H: the highlighter draws a wide light line', await t.eval(`!!document.querySelector('#stage > .ink-layer polyline.ink-highlighter')`));
  await t.key('End', 'End', 35);
  await t.eval('new Promise(r => setTimeout(r, 300))');
  t.check('another slide: its own (no) lines', (await t.eval(lines)) === 0);
  await t.key('Home', 'Home', 36);
  await t.eval('new Promise(r => setTimeout(r, 300))');
  t.check('back on the slide: its lines are there again', (await t.eval(lines)) === 2);
  await t.key('x', 'KeyX', 88);
  t.check('X wipes the lines on this slide', (await t.eval(lines)) === 0);
  await t.key(...ESC);
  t.check('Esc stops drawing', await t.eval(`!document.getElementById('stage').classList.contains('is-inking')`));
  t.check('the ✎ button on the bar turns the pen on', await t.eval(`(() => { document.getElementById('btnPen').click(); const on = document.getElementById('stage').classList.contains('is-inking') && document.getElementById('btnPen').getAttribute('aria-pressed') === 'true'; document.getElementById('btnPen').click(); return on; })()`));
}
