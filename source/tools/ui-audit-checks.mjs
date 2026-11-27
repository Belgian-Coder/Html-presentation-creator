// The automatic layout checks of the UI audits (tools/ui-audit.mjs, tools/ui-audit-actions.mjs): an expression run in the
// page that returns what looks wrong on screen now (text cut off or spilling out, controls off-screen, covered or on top of
// each other, tiny targets, small text, sideways scroll). Noisy by nature: a person looks at the screenshots too.
// the automatic checks, run in the page
export const CHECK = `(() => {
  const W = innerWidth, Hh = innerHeight, out = [];
  const vis = e => { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const name = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + ' "' + ((e.innerText || e.value || e.getAttribute('aria-label') || e.title || '') + '').trim().replace(/\\s+/g, ' ').slice(0, 40) + '"';
  // not looked at: slide content, pictures of slides, and what a folded <details> hides (Chrome still gives it a place)
  const skip = e => e.closest('.scene, svg, .editor-thumb-stage, .editor-timing-probe, .presenter-thumb, .presenter-main, [aria-hidden="true"]') || (e.closest('details:not([open])') && !e.closest('summary'));
  const all = [...document.querySelectorAll('body *')].filter(e => !skip(e) && vis(e));
  const scrollers = e => { const list = []; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll)/.test(s.overflowX + s.overflowY)) list.push(a); } return list; };
  const inScrolledOut = (e, r) => scrollers(e).some(a => { const b = a.getBoundingClientRect(); return r.bottom < b.top + 2 || r.top > b.bottom - 2 || r.right < b.left + 2 || r.left > b.right - 2; });
  // the part of an element that can be seen: its box cut by every ancestor that clips or scrolls (null: none of it)
  const seen = e => { let r = e.getBoundingClientRect(), x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const st = getComputedStyle(a); if (st.overflowX + st.overflowY !== 'visiblevisible') { const b = a.getBoundingClientRect(); x1 = Math.max(x1, b.left); y1 = Math.max(y1, b.top); x2 = Math.min(x2, b.right); y2 = Math.min(y2, b.bottom); } }
    x1 = Math.max(x1, 0); y1 = Math.max(y1, 0); x2 = Math.min(x2, W); y2 = Math.min(y2, Hh);
    return x2 - x1 > 2 && y2 - y1 > 2 ? { left: x1, top: y1, right: x2, bottom: y2 } : null; };
  const ownText = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  for (const e of all) {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    const interactive = e.matches('button, input, select, textarea, a[href], [role="button"], summary, [role="menuitem"], [role="tab"]');
    if (interactive && (r.right > W + 1 || r.left < -1 || r.bottom > Hh + 1 || r.top < -1) && !scrollers(e).length && s.position !== 'fixed') out.push('off-screen: ' + name(e) + ' at ' + [r.left, r.top, r.right, r.bottom].map(Math.round));
    if (ownText(e) || interactive) {
      if (parseFloat(s.fontSize) < 11 && ownText(e)) out.push('small text ' + s.fontSize + ': ' + name(e));
      if (!/INPUT|TEXTAREA|SELECT/.test(e.tagName) && e.scrollWidth > e.clientWidth + 2 && s.overflowX !== 'visible' && s.textOverflow !== 'ellipsis' && !/(auto|scroll)/.test(s.overflowX)) out.push('text cut off (own box): ' + name(e));
      if (!/INPUT|TEXTAREA|SELECT/.test(e.tagName) && s.whiteSpace === 'nowrap' && s.overflowX === 'visible' && e.scrollWidth > e.clientWidth + 3 && e.clientWidth > 0 && s.display !== 'inline') out.push('text spills out of its box: ' + name(e));
      // clipped by an ancestor that hides overflow
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const as = getComputedStyle(a);
        if (/(auto|scroll)/.test(as.overflowX + as.overflowY)) break;
        if (/(hidden|clip)/.test(as.overflowX + as.overflowY)) { const b = a.getBoundingClientRect(); if (r.right > b.right + 2 || r.left < b.left - 2 || r.bottom > b.bottom + 2 || r.top < b.top - 2) { if (!(r.right < b.left || r.left > b.right || r.bottom < b.top || r.top > b.bottom)) out.push('cut off by ' + name(a).slice(0, 50) + ': ' + name(e)); } break; }
      }
    }
    if (interactive && r.width >= 4 && r.height >= 4) {
      const v = seen(e), cx = v && (v.left + v.right) / 2, cy = v && (v.top + v.bottom) / 2;
      if (v && s.pointerEvents !== 'none') {   // (a control that lets clicks through on purpose, e.g. the faded bar, is not "covered")
        const top = document.elementFromPoint(cx, cy);
        if (top && top !== e && !e.contains(top) && !top.contains(e) && !(e.tagName === 'LABEL' && e.control === top) && !top.closest('label')?.contains(e)) out.push('covered by ' + name(top).slice(0, 60) + ': ' + name(e));
      }
      if (r.height < 18 && r.width < 18 && e.tagName !== 'INPUT') out.push('tiny target ' + Math.round(r.width) + 'x' + Math.round(r.height) + ': ' + name(e));
    }
  }
  // two controls on top of each other
  const ctrls = all.filter(e => e.matches('button, input, select, textarea, [role="button"]') && !all.some(o => o !== e && o.contains(e) && o.matches('button')) && seen(e));
  for (let i = 0; i < ctrls.length; i++) for (let j = i + 1; j < ctrls.length; j++) {
    const a = seen(ctrls[i]), b = seen(ctrls[j]);
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ox > 4 && oy > 4 && !ctrls[i].contains(ctrls[j]) && !ctrls[j].contains(ctrls[i])) out.push('overlap: ' + name(ctrls[i]) + ' / ' + name(ctrls[j]));
  }
  if (document.documentElement.scrollWidth > W + 1) out.push('page scrolls sideways: ' + document.documentElement.scrollWidth);
  return [...new Set(out)].slice(0, 60);
})()`;

