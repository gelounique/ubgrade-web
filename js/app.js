/* UBGrade 3 by gelounique — look builder
 * Entwickelt von Gelo Santino Mares · Instagram @gelounique · uniquebaby.de
 */
(function (UB) {
  'use strict';
  const VERSION = '4.1.0';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const N = window.ubNative || null;
  if (N && N.platform === 'darwin') { const macify = () => { document.body.classList.add('mac'); document.querySelectorAll('[title*="Strg"]').forEach((el) => { el.title = el.title.replace(/Strg\+/g, '⌘'); }); };
    if (document.body) macify(); else document.addEventListener('DOMContentLoaded', macify); }
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  const safe = (s) => String(s || 'UBGrade').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 80);
  const HOSTS = { premiere: 'Premiere Pro', aftereffects: 'After Effects', resolve: 'DaVinci Resolve', photoshop: 'Photoshop' };
  const IC = (k) => UB.icon(k);
  const ICO = { check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m4 12 5 5L20 6"/></svg>', x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    chev: '<svg viewBox="0 0 10 10"><path d="M1 3h8L5 8z" fill="currentColor"/></svg>', play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>', pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>' };

  UB.lutStore = new Map(); UB.lutText = new Map();
  let E = null;
  const blank = (mode) => ({ name: 'Unbenannt', mode: mode || 'photo', strength: 1, input: { profile: 'none', display: 0, exposure: 0 }, chain: [] });
  const A = { st: blank(), preview: null, sel: null, host: null, args: {}, media: null, video: null, fps: 25, view: { before: false, split: null, mode: 0 },
    scopes: false, scope: 'wave', lib: [], cat: 'all', q: '', libSel: null, undo: [], redo: [], dirty: true, srcVer: 0, closedCats: {}, tabs: {} };

  // ============================================================ boot
  async function boot() {
    // splash: the colour wheel charges smoothly towards the real loading progress
    const sp = $('#splash'), pc = $('#splash .pc'); let target = 0, shown = 0, t0 = performance.now();
    const step = (p) => { target = Math.max(target, p); };
    const minMs = () => (A.host ? 450 : 1500);   // full ring never faster than this
    await new Promise((r) => requestAnimationFrame(r));
    (function tick(now) { const cap = ((now - t0) / minMs()) * 100; shown = Math.min(target, cap, shown + 2.6); sp.style.setProperty('--p', shown.toFixed(2)); pc.textContent = Math.round(shown) + ' %'; if (shown < 100) requestAnimationFrame(tick); })(t0);
    const charged = () => new Promise((r) => { (function w() { shown >= 100 ? r() : requestAnimationFrame(w); })(); });
    A.args = N ? await N.args() : Object.fromEntries(new URLSearchParams(location.search)); A.host = A.args.host || null;
    // Video-Edition = opened by the Premiere Pro / After Effects / DaVinci effect (Magic-Bullet-Looks workflow)
    // Foto-Edition  = standalone app and Photoshop filter
    A.edition = A.host && A.host !== 'photoshop' ? 'video' : 'photo'; setupEdition();
    step(25); try { E = new UB.Engine($('#cv')); } catch (e) { document.body.innerHTML = '<p style="padding:40px">WebGL2 nicht verfügbar.</p>'; return; }
    for (const t of Object.keys(UB.TOOLS)) E.toolProg(t); step(70);
    await loadLib(); wire(); renderCats(); renderLooks(); renderTools(); renderLane(); setMode(); updateStatus(); pushUndo(true);
    if (A.host) await hostSession();
    step(100); await charged(); sp.classList.add('done'); await sleep(A.host ? 150 : 520); sp.classList.add('out');
    requestAnimationFrame(loop);
    if (N) { N.onOpenFile((p) => openPath(p)); (await N.pendingFiles()).forEach(openPath); }
  }

  // ============================================================ editions
  function setupEdition() {
    const v = A.edition === 'video', b = document.body; b.classList.add('ed-' + A.edition); if (A.host) b.classList.add('hosted');
    const d = $('.drop .c');
    if (v) d.innerHTML = `<img src="assets/logo-un.png" alt=""><h3>Kein Frame erhalten</h3><p>${esc(HOSTS[A.host] || 'Der Host')} hat kein Bild übergeben. Playhead auf den Clip setzen und im Effekt erneut auf <b>„UBGrade öffnen…“</b> klicken.</p>`;
    else if (A.host) d.innerHTML = `<img src="assets/logo-un.png" alt=""><h3>Kein Bild erhalten</h3><p>Photoshop hat kein Bild übergeben. Bitte Filter › UNIQUEBABY › UBGrade… erneut starten.</p>`;
    else d.innerHTML = `<img src="assets/logo-un.png" alt=""><h3>Bild reinziehen</h3><p>JPG, PNG, WebP, HEIC, TIFF … – gegradet wird in voller Auflösung, Export als JPEG oder PNG.<br>Videos gradest du direkt in <b>Premiere Pro</b>, <b>After Effects</b> oder <b>DaVinci Resolve</b> mit dem Effekt „UBGrade“.</p><button class="bt pri" id="bOpen2">Bild öffnen</button>`;
    $('#fileIn').accept = A.host ? '.ubgrade,.cube' : 'image/*,.ubgrade,.cube';
    // web test version (ubgrade.uniquebaby.de): badge + download of the full Windows/Mac release
    if (!N) {
      b.classList.add('web'); const dl = window.UBGRADE_DOWNLOAD || 'https://ubgrade.uniquebaby.de/';
      const tb = $('.tb'), redo = $('#bRedo');
      const badge = el('span', 'beta nd', 'TESTVERSION'); badge.title = 'Browser-Version zum Testen – Foto-Edition';
      const a = el('a', 'dlb nd'); a.href = dl; a.target = '_blank'; a.rel = 'noopener';
      a.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg><span>Download <em>Windows &amp; Mac</em></span>`;
      a.title = 'UBGrade 4.1.0 – Setup für Windows + Installer für macOS, mit Plugins für Premiere Pro, After Effects, Photoshop & DaVinci Resolve';
      tb.insertBefore(badge, $('#bOpen')); redo.after(a);
      const p = $('.drop .c p'); if (p) p.insertAdjacentHTML('beforeend', `<br><a class="dll" href="${dl}" target="_blank" rel="noopener">UBGrade 4.1.0 für Windows &amp; Mac herunterladen →</a>`);
    }
    if (A.host) $('#bOpen').remove();
  }

  // ============================================================ host protocol
  async function hostSession() {
    const a = A.args;
    if (a.grade) { try { const d = JSON.parse(await N.readText(a.grade)); if (d && d.chain) { registerLuts(d); A.st = docState(d); } } catch (e) {} }
    A.st.mode = A.edition;
    if (a.frame) { try { const b = await N.readFile(a.frame); setImage(await createImageBitmap(new Blob([b]), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }), a.clip || HOSTS[A.host]); } catch (e) { toast('<b>Frame nicht lesbar</b>', true); } }
    setMode(A.st.mode); renderLane(); updateStatus(); pushUndo(true);
    const bits = [a.clip ? `<b>${esc(a.clip)}</b>` : '', a.tc ? 'Frame ' + esc(a.tc) : 'aktueller Frame', A.edition === 'video' ? 'OK übernimmt den Grade auf den Clip' : 'OK übernimmt den Grade in Photoshop'].filter(Boolean);
    $('#src').innerHTML = bits.join(' · ');
  }
  async function hostOK() {
    busy(true, 'ÜBERNEHME');
    try {
      const out = A.args.out, rs = UB.renderChain(A.st);
      await N.writeFile(out + '.json', JSON.stringify(makeDoc(A.st, A.st.name, thumbOf())));
      await N.writeFile(out + '.ubgr', blob(A.st, rs));
      await N.writeFile(out + '.cube', UB.writeCube(E.bakeLUT(rs, 33), 33, 'UBGrade ' + A.st.name));
      if (A.host === 'photoshop' && E.hasSource()) { const c = E.renderToCanvas(rs, E.srcW, E.srcH); const b = await new Promise((r) => c.toBlob(r, 'image/png')); await N.writeFile(out + '.png', new Uint8Array(await b.arrayBuffer())); }
      await N.writeFile(out + '.done', 'ok'); N.quit(0);
    } catch (e) { busy(false); toast('<b>Fehler:</b> ' + esc(e.message), true); }
  }
  function blob(st, rs) {
    const n = 33, lut = E.bakeLUT(rs, n), u = new Uint8Array(lut.length * 2);
    for (let i = 0; i < lut.length; i++) { const v = Math.max(0, Math.min(65535, Math.round(lut[i] * 65535))); u[i * 2] = v & 255; u[i * 2 + 1] = v >> 8; }
    let bin = ''; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    const p = UB.nativeParams(st), L = ['UBGR 1', 'name ' + String(st.name).replace(/\n/g, ' '), 'mode ' + st.mode];
    for (const k in p) L.push(k + ' ' + (+p[k]).toFixed(4)); L.push('lut ' + n + ' ' + btoa(bin)); L.push('end');
    return L.join('\n') + '\n';
  }

  // ============================================================ docs & library
  const LS = 'ubgrade3.lib';
  function makeDoc(st, name, thumb) {
    const luts = {}; st.chain.forEach((t) => { if (t.type === 'lut' && t.params.lut && UB.lutText.has(t.params.lut.id)) luts[t.params.lut.id] = { name: t.params.lut.name, cube: UB.lutText.get(t.params.lut.id) }; });
    return { format: 'ubgrade', version: 3, id: 'g' + Date.now().toString(36), name, mode: st.mode, created: new Date().toISOString(), app: 'UBGrade ' + VERSION + ' by gelounique',
      strength: st.strength, input: clone(st.input), chain: st.chain.map((t) => ({ type: t.type, on: t.on !== false, strength: t.strength, params: clone(t.params) })), luts, thumb: thumb || '' };
  }
  function docState(d) {
    return { name: d.name || 'UBGrade', mode: A.st.mode, strength: d.strength ?? 1, input: Object.assign({ profile: 'none', display: 0, exposure: 0 }, d.input || {}),
      chain: (d.chain || []).filter((t) => UB.TOOLS[t.type] && t.type !== 'input').map((t) => Object.assign(UB.makeTool(t.type, t.params, t.strength), { on: t.on !== false })) };
  }
  function registerLuts(d) { for (const id in d.luts || {}) { try { if (!UB.lutStore.has(id)) { UB.lutStore.set(id, UB.parseCube(d.luts[id].cube)); UB.lutText.set(id, d.luts[id].cube); } } catch (e) {} } }
  async function loadLib() {
    A.lib = [];
    if (N) { const dir = N.join(N.docsDir(), 'Grades'); await N.mkdir(dir);
      for (const f of await N.listDir(dir)) { if (!/\.ubgrade$/i.test(f)) continue; try { const d = JSON.parse(await N.readText(N.join(dir, f))); if (d.chain) { d._file = N.join(dir, f); A.lib.push(d); registerLuts(d); } } catch (e) {} } }
    else { try { A.lib = JSON.parse(localStorage.getItem(LS) || '[]'); A.lib.forEach(registerLuts); } catch (e) {} }
    A.lib.sort((a, b) => (b.created || '').localeCompare(a.created || ''));
  }
  async function storeDoc(d) {
    if (N) { await N.writeFile(N.join(N.docsDir(), 'Grades', safe(d.name) + '.ubgrade'), JSON.stringify(d, null, 1)); return; }
    const all = A.lib.filter((x) => x.name !== d.name); all.unshift(d); try { localStorage.setItem(LS, JSON.stringify(all)); } catch (e) { toast('<b>Speicher voll</b>', true); }
  }
  async function removeDoc(d) { if (N && d._file) await N.remove(d._file); else localStorage.setItem(LS, JSON.stringify(A.lib.filter((x) => x.id !== d.id))); await loadLib(); renderCats(); renderLooks(); }

  // ============================================================ looks panel
  function renderCats() {
    const c = $('#cats'); c.innerHTML = '';
    const cats = [['all', 'Alle', A.lib.length], ['photo', 'Foto', A.lib.filter((d) => d.mode !== 'video').length], ['video', 'Video', A.lib.filter((d) => d.mode === 'video').length]];
    const h = el('div', 'cat', '<span style="color:var(--tx)">Meine UBGrades</span><button class="add" title="Aktuellen Look speichern">+</button>'); h.querySelector('.add').onclick = saveDialog; c.appendChild(h);
    for (const [id, l, n] of cats) { const b = el('div', 'cat' + (A.cat === id ? ' on' : ''), `<span>${l}</span><span class="n">${n}</span>`); b.style.paddingLeft = '18px'; b.onclick = () => { A.cat = id; renderCats(); renderLooks(); }; c.appendChild(b); }
  }
  const thumbs = new Map();
  function renderLooks() {
    const g = $('#lgrid'); g.innerHTML = ''; const q = A.q.toLowerCase();
    const list = A.lib.filter((d) => (A.cat === 'all' || (A.cat === 'video') === (d.mode === 'video')) && (!q || d.name.toLowerCase().includes(q)));
    if (!A.lib.length) { g.innerHTML = '<div class="empty"><b>Noch keine UBGrades.</b><br>Tools rechts in die Chain ziehen, Look bauen, dann unten auf <b>Speichern</b> – oder eine .ubgrade importieren.</div>'; return; }
    for (const d of list) {
      const t = thumbs.get(d.id + ':' + A.srcVer) || d.thumb; const b = el('div', 'lk' + (A.libSel === d.id ? ' on' : ''));
      b.innerHTML = `<div class="th" style="${t ? `background-image:url(${t})` : ''}"></div><div class="nm">${esc(d.name)}</div><button class="x" title="Mehr">${IC('more') || '⋯'}</button>`;
      b.querySelector('.x').innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
      b.onclick = (e) => { if (e.target.closest('.x')) return; applyDoc(d); };
      b.querySelector('.x').onclick = (e) => pop(e.currentTarget, [{ t: 'Anwenden', f: () => applyDoc(d) }, { t: 'Als .ubgrade exportieren', f: () => exportDoc(d) }, { t: 'Umbenennen', f: () => renameDoc(d) }, { t: 'Löschen', f: () => removeDoc(d) }]);
      b.onpointerenter = (e) => { if (e.pointerType === 'mouse' && E.hasSource()) { A.preview = Object.assign(docState(d), { mode: A.st.mode }); A.dirty = true; } };
      b.onpointerleave = () => { if (A.preview) { A.preview = null; A.dirty = true; } };
      g.appendChild(b);
    }
    queueThumbs();
  }
  function applyDoc(d) { registerLuts(d); A.preview = null; A.libSel = d.id; A.st = docState(d); A.sel = null; commit(); renderLane(); renderTools(); renderLooks(); updateStatus(); toast('<b>' + esc(d.name) + '</b> angewendet'); }
  let thT = 0;
  function queueThumbs() {
    clearTimeout(thT); thT = setTimeout(async () => {
      if (!E || !E.hasSource()) return; const ver = A.srcVer;
      for (const d of A.lib) { if (thumbs.has(d.id + ':' + ver)) continue; if (ver !== A.srcVer) return;
        try { const u = E.renderToCanvas(UB.renderChain(docState(d)), 192, 120).toDataURL('image/jpeg', 0.8); thumbs.set(d.id + ':' + ver, u); const i = $$('#lgrid .lk')[A.lib.filter((x) => A.cat === 'all' || (A.cat === 'video') === (x.mode === 'video')).indexOf(d)]; if (i) i.querySelector('.th').style.backgroundImage = `url(${u})`; } catch (e) {}
        await frame(); }
    }, 200);
  }
  function thumbOf() { return E.hasSource() ? E.renderToCanvas(UB.renderChain(A.st), 192, 120).toDataURL('image/jpeg', 0.8) : ''; }

  // ============================================================ tools panel (library ↔ controls)
  const tiles = new Map();
  function renderTools() {
    const H = $('#toolsH'), B = $('#toolsBody'); B.innerHTML = '';
    if (A.sel) return renderControls();
    H.innerHTML = '<h2>Tools</h2>';
    for (const c of UB.CATS) {
      const box = el('div', 'tcat' + (A.closedCats[c.id] ? ' closed' : '')); box.innerHTML = `<div class="tcat-h">${ICO.chev}${c.title}</div><div class="tiles"></div>`;
      box.querySelector('.tcat-h').onclick = () => { A.closedCats[c.id] = !A.closedCats[c.id]; box.classList.toggle('closed'); };
      const g = box.querySelector('.tiles');
      for (const type of c.tools) {
        const t = el('div', 'tile'); t.dataset.type = type; t.draggable = true; t.title = UB.TOOLS[type].desc;
        t.innerHTML = `<div class="art c-${c.id}">${IC(UB.TOOLS[type].icon)}</div><div class="nm">${UB.NAMES[type]}</div><span class="plus">+</span>`;
        t.onclick = () => addTool(type);
        t.ondragstart = (e) => { e.dataTransfer.setData('ub/tool', type); e.dataTransfer.effectAllowed = 'copy'; t.classList.add('dragging'); };
        t.ondragend = () => t.classList.remove('dragging');
        g.appendChild(t);
      }
      B.appendChild(box);
    }
    queueTiles();
  }
  let tlT = 0;
  function queueTiles() {} // tool tiles show their icon only – a preview of the effect would hide which tool it is
  function addTool(type, at) {
    const t = UB.makeTool(type); if (at == null || at < 0) A.st.chain.push(t); else A.st.chain.splice(at, 0, t);
    A.sel = t.uid; commit(); renderLane(); renderTools();
  }
  function selTool() { return A.st.chain.find((t) => t.uid === A.sel); }

  // ============================================================ controls
  function renderControls() {
    const H = $('#toolsH'), B = $('#toolsBody');
    const back = '<button class="back" id="back">‹ TOOLS</button>';
    if (A.sel === 'in' || A.sel === 'out') {
      H.innerHTML = `${back}<h2>${A.sel === 'in' ? 'Input' : 'Output'}</h2>`; $('#back').onclick = () => { A.sel = null; renderLane(); renderTools(); };
      const c = el('div', 'ctrls'); B.appendChild(c);
      if (A.sel === 'out') { c.innerHTML = '<p class="desc">Ausgabe in Rec.709 / sRGB (Gamma 2.4, Display-referred) – passt für Premiere, After Effects, DaVinci (Rec.709-Timeline) und Photoshop.</p>'; return; }
      c.appendChild(el('p', 'desc', 'Was kommt rein? Bei Log-Material das Kamera-Profil wählen – UBGrade wandelt es vor allen Tools in Rec.709.'));
      UB.TOOLS.input.params.forEach((pd) => control(c, pd, A.st.input, () => { renderLane(); }));
      return;
    }
    const t = selTool(); if (!t) { A.sel = null; return renderTools(); }
    const d = UB.TOOLS[t.type];
    H.innerHTML = `${back}<h2>${UB.NAMES[t.type]}</h2>`; $('#back').onclick = () => { A.sel = null; renderLane(); renderTools(); };
    const c = el('div', 'ctrls'); B.appendChild(c);
    c.appendChild(el('p', 'desc', esc(d.desc) + (d.kind !== 'color' ? ' <span style="color:var(--tx2)">· räumlich</span>' : '')));
    const r = el('div', 'row2');
    const on = el('button', 'bt' + (t.on !== false ? ' on' : ''), t.on !== false ? 'Aktiv' : 'Aus'); on.onclick = () => { t.on = t.on === false; commit(); renderLane(); renderControls(); };
    const rs = el('button', 'bt', 'Zurücksetzen'); rs.onclick = () => { t.params = UB.defaults(t.type); t.strength = 1; commit(); renderLane(); renderControls(); };
    const du = el('button', 'bt', 'Duplizieren'); du.onclick = () => { const n = Object.assign(clone(t), { uid: UB.uid() }); A.st.chain.splice(A.st.chain.indexOf(t) + 1, 0, n); A.sel = n.uid; commit(); renderLane(); renderControls(); };
    const rm = el('button', 'bt', 'Entfernen'); rm.onclick = () => removeTool(t.uid);
    r.append(on, rs, du, rm); (d.actions || []).forEach((a) => { const b = el('button', 'bt pri', esc(a.label === 'Auto' ? 'Auto' : a.label)); b.onclick = () => action(a.id, t); r.appendChild(b); });
    c.appendChild(r);
    control(c, { id: 'strength', label: 'Tool-Stärke', min: 0, max: 100, step: 1, def: 100 }, { get strength() { return Math.round((t.strength ?? 1) * 100); }, set strength(v) { t.strength = v / 100; } }, () => renderLane());
    if (t.type === 'hsl') return hslUI(c, t);
    let grp = null;
    for (const pd of d.params) {
      if (pd.group && pd.group !== grp && t.type === 'grading') { grp = pd.group; c.appendChild(el('div', 'grp', esc(grp))); }
      if (pd.type === 'wheels') wheelsUI(c, t.params.w);
      else if (pd.type === 'curves') curveUI(c, t.params.c, [['m', 'RGB', '#fff'], ['r', 'Rot', '#ff6b7a'], ['g', 'Grün', '#6be08a'], ['b', 'Blau', '#6b98ff']], false);
      else if (pd.type === 'huecurves') curveUI(c, t.params.h, [['hs', 'Ton/Sätt.', '#ffb6d5'], ['hh', 'Ton/Ton', '#ffb6d5'], ['hl', 'Ton/Luma', '#ffb6d5'], ['ls', 'Luma/Sätt.', '#fff']], true);
      else if (pd.type === 'lut') { const L = t.params.lut; c.appendChild(el('div', 'refth', L ? `${esc(L.name)} · ${L.size || ''}³` : 'Keine LUT geladen')); }
      else if (pd.type === 'match') { const m = t.params.m; c.appendChild(el('div', 'refth', m && m.thumb ? '' : 'Kein Referenzbild')); if (m && m.thumb) c.lastChild.style.backgroundImage = `url(${m.thumb})`; }
      else control(c, pd, t.params, () => renderLane());
    }
  }
  function control(parent, pd, obj, after) {
    if (pd.type === 'select') {
      const c = el('div', 'ctl', `<div class="r1"><label>${esc(pd.label)}</label></div>`); const s = el('select', 'sel');
      s.innerHTML = pd.options.map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(obj[pd.id]) ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
      s.onchange = () => { obj[pd.id] = pd.options.find((o) => String(o.value) === s.value).value; commit(); after && after(); }; c.appendChild(s); parent.appendChild(c); return;
    }
    if (pd.type === 'toggle') { const c = el('div', 'tgl', `<label>${esc(pd.label)}</label><span class="sw${obj[pd.id] ? ' on' : ''}"></span>`); c.querySelector('.sw').onclick = (e) => { obj[pd.id] = !obj[pd.id]; e.target.classList.toggle('on', !!obj[pd.id]); commit(); }; parent.appendChild(c); return; }
    const c = el('div', 'ctl', `<div class="r1"><label>${esc(pd.label)}</label><span class="v" contenteditable="true" spellcheck="false"></span></div><div class="rr"></div>`);
    const v = c.querySelector('.v'); const fmt = (x) => (pd.step < 1 ? (+x).toFixed(2) : String(Math.round(x)));
    const upd = () => { v.textContent = fmt(obj[pd.id]); c.classList.toggle('ch', obj[pd.id] !== pd.def); };
    const r = rng(c.querySelector('.rr'), { min: pd.min, max: pd.max, step: pd.step, def: pd.def, track: pd.track, center: pd.track === 'hue' ? pd.min : undefined, get: () => obj[pd.id], set: (x) => { obj[pd.id] = x; upd(); }, commit: () => { commit(); after && after(); } });
    v.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); v.blur(); } };
    v.onblur = () => { const n = parseFloat(v.textContent.replace(',', '.')); if (!isNaN(n)) { obj[pd.id] = Math.max(pd.min, Math.min(pd.max, n)); r.draw(); commit(); after && after(); } upd(); };
    c.querySelector('label').ondblclick = () => { obj[pd.id] = pd.def; upd(); r.draw(); commit(); after && after(); };
    upd(); parent.appendChild(c);
  }
  function rng(host, o) {
    host.classList.add('rng'); if (o.track) host.classList.add(o.track); host.innerHTML = '<div class="tr"></div><div class="fl"></div><div class="kn"></div>';
    const fl = host.querySelector('.fl'), kn = host.querySelector('.kn'); const center = o.center ?? (o.min < 0 ? 0 : o.min); const pos = (v) => (v - o.min) / (o.max - o.min);
    const draw = () => { const p = pos(o.get()), c = pos(center); kn.style.left = p * 100 + '%'; fl.style.left = Math.min(p, c) * 100 + '%'; fl.style.width = Math.abs(p - c) * 100 + '%'; };
    const q = (v) => { const st = o.step || 1; return +(Math.round(Math.max(o.min, Math.min(o.max, v)) / st) * st).toFixed(4); };
    let d = false, sx = 0, sv = 0;
    host.addEventListener('pointerdown', (e) => { d = true; host.setPointerCapture(e.pointerId); sx = e.clientX; if (!e.target.classList.contains('kn')) { const r = host.getBoundingClientRect(); o.set(q(o.min + ((e.clientX - r.left) / r.width) * (o.max - o.min))); draw(); A.dirty = true; } sv = o.get(); });
    host.addEventListener('pointermove', (e) => { if (!d) return; const r = host.getBoundingClientRect(); o.set(q(sv + ((e.clientX - sx) / r.width) * (o.max - o.min) * (e.shiftKey ? 0.15 : 1))); draw(); A.dirty = true; });
    host.addEventListener('pointerup', () => { if (d) { d = false; o.commit && o.commit(); } });
    host.addEventListener('dblclick', () => { o.set(o.def); draw(); A.dirty = true; o.commit && o.commit(); });
    draw(); return { draw };
  }
  function hslUI(c, t) {
    const tabs = el('div', 'tabs'), body = el('div'); A.tabs.hsl = A.tabs.hsl || 'Farbton';
    const draw = () => { tabs.innerHTML = ''; ['Farbton', 'Sättigung', 'Luminanz'].forEach((g) => { const b = el('button', A.tabs.hsl === g ? 'on' : '', g); b.onclick = () => { A.tabs.hsl = g; draw(); }; tabs.appendChild(b); });
      body.innerHTML = ''; UB.TOOLS.hsl.params.filter((pd) => pd.group === A.tabs.hsl).forEach((pd) => { control(body, pd, t.params); const last = body.lastChild; last.querySelector('label').style.color = pd.band.col; last.querySelector('.fl').style.background = pd.band.col; }); };
    draw(); c.append(tabs, body);
  }
  function wheelsUI(c, w) {
    const g = el('div', 'wheels');
    [['lift', 'LIFT · TIEFEN'], ['gamma', 'GAMMA · MITTEN'], ['gain', 'GAIN · LICHTER'], ['offset', 'OFFSET']].forEach(([k, lab]) => {
      const box = el('div', 'wheel', `<span>${lab}</span><div class="wh"><i></i></div><div class="lr"></div>`); const wh = box.querySelector('.wh'), pk = wh.querySelector('i');
      const pos = () => { pk.style.left = 50 + w[k].x * 50 + '%'; pk.style.top = 50 - w[k].y * 50 + '%'; };
      let d = false, sx, sy, ox, oy;
      wh.addEventListener('pointerdown', (e) => { d = true; wh.setPointerCapture(e.pointerId); sx = e.clientX; sy = e.clientY; ox = w[k].x; oy = w[k].y; });
      wh.addEventListener('pointermove', (e) => { if (!d) return; const r = wh.getBoundingClientRect(), f = e.shiftKey ? 0.2 : 0.6; let x = ox + (e.clientX - sx) / (r.width / 2) * f, y = oy - (e.clientY - sy) / (r.height / 2) * f; const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } w[k].x = x; w[k].y = y; pos(); A.dirty = true; });
      wh.addEventListener('pointerup', () => { if (d) { d = false; commit(); } });
      wh.ondblclick = () => { w[k].x = 0; w[k].y = 0; pos(); commit(); };
      rng(box.querySelector('.lr'), { min: -1, max: 1, step: 0.01, def: 0, get: () => w[k].l, set: (v) => (w[k].l = v), commit });
      pos(); g.appendChild(box);
    });
    c.appendChild(g); c.appendChild(el('div', 'hint', 'Ziehen = Farbe · Shift = fein · Doppelklick = Reset · Regler = Helligkeit'));
  }
  function curveUI(c, data, tabsDef, neutral) {
    const key = neutral ? 'hue' : 'rgb'; A.tabs[key] = A.tabs[key] || tabsDef[0][0];
    const tabs = el('div', 'tabs'), wrap = el('div', 'curve'), cv = el('canvas'); wrap.appendChild(cv);
    const isHue = () => neutral && A.tabs[key] !== 'ls';
    const pts = () => { const k = A.tabs[key]; if (!data[k] || (neutral && k === 'ls' && !data[k].length)) data[k] = neutral ? (k === 'ls' ? [[0, 0.5], [1, 0.5]] : []) : [[0, 0], [1, 1]]; return data[k]; };
    const col = () => tabsDef.find((x) => x[0] === A.tabs[key])[2];
    const drawTabs = () => { tabs.innerHTML = ''; tabsDef.forEach(([k, l]) => { const b = el('button', A.tabs[key] === k ? 'on' : '', l); b.onclick = () => { A.tabs[key] = k; drawTabs(); draw(); }; tabs.appendChild(b); }); };
    const draw = () => {
      const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round((cv.clientWidth || 300) * dpr); cv.width = cv.height = W; const x = cv.getContext('2d');
      x.fillStyle = '#0a0a0c'; x.fillRect(0, 0, W, W);
      if (isHue()) { const gr = x.createLinearGradient(0, 0, W, 0); for (let i = 0; i <= 12; i++) { const h = UB.hsv(i / 12, 0.8, 0.9); gr.addColorStop(i / 12, `rgb(${h.map((v) => (v * 255) | 0)})`); } x.globalAlpha = 0.18; x.fillStyle = gr; x.fillRect(0, 0, W, W); x.globalAlpha = 1; x.fillRect(0, W - 5 * dpr, W, 5 * dpr); }
      x.strokeStyle = 'rgba(255,255,255,.06)'; for (let i = 1; i < 4; i++) { const p = Math.round(i * W / 4) + 0.5; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, W); x.moveTo(0, p); x.lineTo(W, p); x.stroke(); }
      x.strokeStyle = 'rgba(255,255,255,.15)'; x.beginPath(); if (neutral) { x.moveTo(0, W / 2); x.lineTo(W, W / 2); } else { x.moveTo(0, W); x.lineTo(W, 0); } x.stroke();
      const P = pts(); const f = isHue() ? UB.spline.periodic(P) : UB.spline.monotone([...P].sort((a, b) => a[0] - b[0]));
      x.strokeStyle = col(); x.lineWidth = 1.6 * dpr; x.beginPath();
      for (let i = 0; i <= 160; i++) { const u = i / 160, y = isHue() && !P.length ? 0.5 : f(u); const py = (1 - Math.max(0, Math.min(1, y))) * W; i ? x.lineTo(u * W, py) : x.moveTo(u * W, py); } x.stroke();
      P.forEach(([u, y]) => { x.fillStyle = '#0a0a0c'; x.strokeStyle = '#fff'; x.lineWidth = 1.5 * dpr; x.beginPath(); x.arc(u * W, (1 - y) * W, 4 * dpr, 0, 7); x.fill(); x.stroke(); });
    };
    let di = -1; const nrm = (e) => { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height))]; };
    cv.addEventListener('pointerdown', (e) => { const P = pts(), [u, y] = nrm(e), tol = 10 / cv.getBoundingClientRect().width; di = P.findIndex(([a, b]) => Math.abs(a - u) < tol && Math.abs(b - y) < tol); if (di < 0) { P.push([u, y]); P.sort((a, b) => a[0] - b[0]); di = P.findIndex((q) => q[0] === u); } cv.setPointerCapture(e.pointerId); draw(); A.dirty = true; });
    cv.addEventListener('pointermove', (e) => { if (di < 0) return; const P = pts(); let [u, y] = nrm(e); if (!neutral && (di === 0 || di === P.length - 1)) u = P[di][0]; else if (!isHue() && di > 0 && di < P.length - 1) u = Math.max(P[di - 1][0] + 0.01, Math.min(P[di + 1][0] - 0.01, u)); P[di] = [u, y]; if (isHue()) { const k = P[di]; P.sort((a, b) => a[0] - b[0]); di = P.indexOf(k); } draw(); A.dirty = true; });
    cv.addEventListener('pointerup', () => { if (di >= 0) { di = -1; commit(); } });
    cv.addEventListener('dblclick', (e) => { const P = pts(), [u, y] = nrm(e), tol = 12 / cv.getBoundingClientRect().width; const i = P.findIndex(([a, b]) => Math.abs(a - u) < tol && Math.abs(b - y) < tol); if (i >= 0 && (neutral || (i > 0 && i < P.length - 1))) { P.splice(i, 1); draw(); commit(); } });
    drawTabs(); c.append(tabs, wrap, el('div', 'hint', 'Klicken = Punkt · Ziehen = formen · Doppelklick = Punkt löschen')); requestAnimationFrame(draw);
  }
  async function action(id, t) {
    if (id === 'loadLut') { const f = await pick('.cube'); if (f) setLut(f.name, await f.text(), t); return; }
    if (!E.hasSource()) return toast('Erst ein Bild oder Video öffnen', true);
    const idx = A.st.chain.indexOf(t), sub = { strength: 1, input: A.st.input, chain: A.st.chain.slice(0, idx) }; const w = 160, h = Math.max(8, Math.round(160 * E.srcH / E.srcW));
    const px = E.renderPixels(UB.renderChain(sub), w, h, { colorOnly: true, strength: 1 });
    if (id === 'autoWB') { let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < px.length; i += 4) { const R = (px[i] / 255) ** 2.4, G = (px[i + 1] / 255) ** 2.4, B = (px[i + 2] / 255) ** 2.4, L = 0.2126 * R + 0.7152 * G + 0.0722 * B; if (L > 0.02 && L < 0.8) { r += R; g += G; b += B; n++; } }
      if (n) { t.params.temp = Math.round(Math.max(-100, Math.min(100, ((b - r) / (0.32 * (r + b))) * 100))); t.params.tint = Math.round(Math.max(-100, Math.min(100, ((1 - (r + b) / 2 / g) / 0.22) * 100))); } }
    if (id === 'autoTone') { const Ls = []; for (let i = 0; i < px.length; i += 4) Ls.push((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255); Ls.sort((a, b) => a - b); const q = (k) => Ls[Math.min(Ls.length - 1, Math.floor(k * Ls.length))], mean = Ls.reduce((a, b) => a + b, 0) / Ls.length, p = t.params;
      p.exposure = +Math.max(-2, Math.min(2, 2.4 * Math.log2(0.43 / Math.max(0.03, mean)))).toFixed(2); p.whites = Math.round(Math.max(-50, Math.min(50, (0.97 - q(0.995)) * 240))); p.blacks = Math.round(Math.max(-50, Math.min(30, (q(0.005) - 0.025) * -450))); p.contrast = q(0.95) - q(0.05) < 0.6 ? 15 : 5; p.highlights = q(0.98) > 0.95 ? -25 : 0; p.shadows = q(0.12) < 0.07 ? 18 : 0; p.vibrance = 10; }
    if (id === 'loadRef' || id === 'remeasure') {
      const ss = UB.statsYCC(px); let m = Object.assign({}, t.params.m, { sm: ss.mean, ss: ss.std });
      if (id === 'loadRef') { const f = await pick('image/*'); if (!f) return; const bmp = await createImageBitmap(f); const cc = el('canvas'); cc.width = 200; cc.height = Math.round(200 * bmp.height / bmp.width); const x = cc.getContext('2d'); x.drawImage(bmp, 0, 0, cc.width, cc.height); const rs = UB.statsYCC(x.getImageData(0, 0, cc.width, cc.height).data); m = { sm: ss.mean, ss: ss.std, rm: rs.mean, rs: rs.std, thumb: cc.toDataURL('image/jpeg', 0.7) }; }
      t.params.m = m;
    }
    commit(); renderLane(); renderControls();
  }
  function setLut(name, text, tool) {
    try { const cube = UB.parseCube(text); let h = 2166136261; for (let i = 0; i < text.length; i += 5) h = Math.imul(h ^ text.charCodeAt(i), 16777619); const id = 'lut_' + (h >>> 0).toString(36);
      UB.lutStore.set(id, cube); UB.lutText.set(id, text); let t = tool; if (!t) { t = UB.makeTool('lut'); A.st.chain.push(t); }
      t.params.lut = { id, name: (cube.title || name).replace(/\.cube$/i, ''), size: cube.size }; A.sel = t.uid; commit(); renderLane(); renderTools(); toast('<b>LUT geladen</b> ' + esc(name));
    } catch (e) { toast('<b>LUT-Fehler:</b> ' + esc(e.message), true); }
  }

  // ============================================================ chain lane
  function renderLane() {
    const L = $('#lane'); L.innerHTML = ''; const inner = el('div', 'lane-in'); L.appendChild(inner);
    const link = () => inner.appendChild(el('div', 'link'));
    const io = (id, name, sub, icon) => { const c = el('div', 'chip io' + (A.sel === id ? ' sel' : ''), `<div class="art">${IC(icon)}</div><div class="nm">${name}</div><div class="sm">${sub}</div>`); c.onclick = () => { A.sel = A.sel === id ? null : id; renderLane(); renderTools(); }; inner.appendChild(c); };
    const prof = UB.Color.PROFILES.find((p) => p.id === A.st.input.profile) || UB.Color.PROFILES[0];
    io('in', 'Input', prof.id === 'none' ? 'Rec.709 / sRGB' : prof.label.split(' · ')[0], 'input'); link();
    A.st.chain.forEach((t, i) => {
      const cat = (UB.CATS.find((k) => k.tools.includes(t.type)) || {}).id || 'light';
      const c = el('div', 'chip' + (A.sel === t.uid ? ' sel' : '') + (t.on === false ? ' off' : '')); c.dataset.type = t.type; c.dataset.uid = t.uid; c.draggable = true;
      c.innerHTML = `<button class="pw" title="An/Aus">${IC('power')}</button><button class="x" title="Entfernen">${IC('x')}</button><div class="art c-${cat}">${IC(UB.TOOLS[t.type].icon)}</div><div class="nm">${UB.NAMES[t.type]}</div><div class="sm">${esc(UB.summary(t))}</div>`;
      c.onclick = (e) => { if (e.target.closest('.pw')) { t.on = t.on === false; commit(); renderLane(); if (A.sel === t.uid) renderControls(); return; } if (e.target.closest('.x')) { removeTool(t.uid); return; } A.sel = t.uid; renderLane(); renderTools(); };
      c.ondragstart = (e) => { e.dataTransfer.setData('ub/move', t.uid); e.dataTransfer.effectAllowed = 'move'; };
      c.ondragover = (e) => { e.preventDefault(); const r = c.getBoundingClientRect(); const left = e.clientX < r.left + r.width / 2; c.classList.toggle('dropL', left); c.classList.toggle('dropR', !left); };
      c.ondragleave = () => c.classList.remove('dropL', 'dropR');
      c.ondrop = (e) => { e.preventDefault(); e.stopPropagation(); const left = c.classList.contains('dropL'); c.classList.remove('dropL', 'dropR'); dropAt(e, i + (left ? 0 : 1)); };
      inner.appendChild(c); link();
    });
    const add = el('div', 'chip add', '+'); add.title = 'Tool hinzufügen'; add.onclick = () => pop(add, UB.CATS.flatMap((c) => [{ g: c.title }, ...c.tools.map((tp) => ({ t: UB.NAMES[tp], i: UB.TOOLS[tp].icon, f: () => addTool(tp) }))]));
    add.ondragover = (e) => e.preventDefault(); add.ondrop = (e) => { e.preventDefault(); e.stopPropagation(); dropAt(e, A.st.chain.length); };
    inner.appendChild(add); link(); io('out', 'Output', 'Rec.709', 'output');
    L.ondragover = (e) => e.preventDefault(); L.ondrop = (e) => { e.preventDefault(); dropAt(e, A.st.chain.length); };
  }
  function dropAt(e, idx) {
    const type = e.dataTransfer.getData('ub/tool'), uid = e.dataTransfer.getData('ub/move');
    if (type) return addTool(type, idx);
    if (uid) { const from = A.st.chain.findIndex((t) => t.uid === uid); if (from < 0) return; const [t] = A.st.chain.splice(from, 1); A.st.chain.splice(from < idx ? idx - 1 : idx, 0, t); commit(); renderLane(); }
  }
  function removeTool(uid) { A.st.chain = A.st.chain.filter((t) => t.uid !== uid); if (A.sel === uid) A.sel = null; commit(); renderLane(); renderTools(); }

  // ============================================================ media
  function setImage(bmp, name) { stopVideo(); E.setSource(bmp); A.media = { type: 'image', name }; $('#view').classList.add('has'); A.srcVer++; A.dirty = true; queueThumbs(); queueTiles(); updateSrc(); }
  function stopVideo() { if (A.video) { A.video.pause(); A.video.src = ''; A.video = null; } $('#view').classList.remove('video'); }
  function loadVideo(url, name) {
    stopVideo(); const v = el('video'); v.src = url; v.muted = true; v.playsInline = true; v.preload = 'auto'; A.video = v;
    v.addEventListener('loadeddata', () => { E.setSource(v); A.media = { type: 'video', name }; $('#view').classList.add('has', 'video'); A.srcVer++; A.dirty = true; setMode('video'); updateSrc(); updateTl(); queueThumbs(); queueTiles(); }, { once: true });
    v.addEventListener('error', () => toast('<b>Codec nicht unterstützt.</b> H.264/HEVC/VP9 gehen – ProRes, R3D & BRAW direkt aus Premiere/AE/DaVinci öffnen.', true, 6000));
    v.addEventListener('seeked', () => { E.setSource(v); A.dirty = true; updateTl(); A.srcVer++; queueThumbs(); queueTiles(); });
    v.addEventListener('ended', () => ($('#tPlay').innerHTML = ICO.play));
    if ('requestVideoFrameCallback' in v) { const cb = () => { if (A.video !== v) return; E.setSource(v); A.dirty = true; updateTl(); v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb); }
  }
  const VIDEO_RX = /\.(mp4|mov|m4v|webm|mkv|avi|mxf|r3d|braw|mts)$/i;
  function mediaBlocked(name, isVideo) {
    if (A.host) { toast(`<b>${esc(name)}</b>: hier wird der Frame aus ${esc(HOSTS[A.host])} gegradet – nur .ubgrade &amp; .cube importierbar`, true, 4200); return true; }
    if (isVideo) { toast('<b>UBGrade App = Foto-Edition.</b> Videos gradest du direkt in Premiere Pro, After Effects oder DaVinci Resolve mit dem Effekt „UBGrade“.', true, 6000); return true; }
    return false;
  }
  async function openFile(f) {
    const n = f.name.toLowerCase();
    try {
      if (n.endsWith('.ubgrade')) return importDoc(JSON.parse(await f.text()));
      if (n.endsWith('.cube')) return setLut(f.name, await f.text());
      if (mediaBlocked(f.name, f.type.startsWith('video/') || VIDEO_RX.test(n))) return;
      setImage(await createImageBitmap(f, { imageOrientation: 'from-image', premultiplyAlpha: 'none' }), f.name);
    } catch (e) { toast('<b>Datei nicht lesbar:</b> ' + esc(f.name), true); }
  }
  async function openPath(p) {
    const n = p.toLowerCase(), name = p.split(/[\\/]/).pop();
    if (n.endsWith('.ubgrade')) return importDoc(JSON.parse(await N.readText(p)));
    if (n.endsWith('.cube')) return setLut(name, await N.readText(p));
    if (mediaBlocked(name, VIDEO_RX.test(n))) return;
    try { setImage(await createImageBitmap(new Blob([await N.readFile(p)]), { imageOrientation: 'from-image', premultiplyAlpha: 'none' }), name); } catch (e) { toast('<b>Datei nicht lesbar</b>', true); }
  }
  async function importDoc(d) {
    if (!d || d.format !== 'ubgrade' || !Array.isArray(d.chain)) return toast('<b>Keine gültige .ubgrade Datei</b>', true);
    registerLuts(d); d.id = d.id || 'g' + Date.now().toString(36); delete d._file; await storeDoc(d); await loadLib(); renderCats(); renderLooks();
    applyDoc(A.lib.find((x) => x.name === d.name) || d);
  }
  function updateSrc() { if (A.host || !A.media) return; $('#src').innerHTML = `<b>${esc(A.media.name)}</b> · ${E.srcW}×${E.srcH}`; }
  function setMode() { A.st.mode = A.edition; $('#mode span').textContent = A.edition === 'video' ? 'VIDEO · ' + (HOSTS[A.host] || '').toUpperCase() : A.host ? 'FOTO · PHOTOSHOP' : 'FOTO'; buildActions(); A.dirty = true; }

  // ============================================================ history
  function pushUndo(init) { const s = JSON.stringify(A.st); if (A.undo[A.undo.length - 1] === s) return; A.undo.push(s); if (A.undo.length > 150) A.undo.shift(); if (!init) A.redo = []; $('#bUndo').disabled = A.undo.length < 2; $('#bRedo').disabled = !A.redo.length; }
  function restore(s) { const m = A.st.mode; A.st = JSON.parse(s); A.st.mode = m; if (A.sel && A.sel !== 'in' && A.sel !== 'out' && !selTool()) A.sel = null; renderLane(); renderTools(); updateStatus(); A.dirty = true; $('#bUndo').disabled = A.undo.length < 2; $('#bRedo').disabled = !A.redo.length; }
  function undo() { if (A.undo.length < 2) return; A.redo.push(A.undo.pop()); restore(A.undo[A.undo.length - 1]); }
  function redo() { if (!A.redo.length) return; const s = A.redo.pop(); A.undo.push(s); restore(s); }
  function commit() { pushUndo(); A.dirty = true; }

  // ============================================================ status bar
  function updateStatus() { $('#gname').textContent = A.st.name; $('#gStrV').textContent = ((A.st.strength ?? 1) * 100).toFixed(1) + ' %'; }
  function buildActions() {
    const a = $('#actions'); a.innerHTML = '';
    if (A.host) {
      const x = el('button', 'ok', ICO.x); x.title = 'Abbrechen (Esc)'; x.onclick = () => N.quit(1);
      const y = el('button', 'ok y', ICO.check); y.title = 'OK – Grade übernehmen (Enter)'; y.onclick = hostOK; a.append(x, y); return;
    }
    const e = el('button', 'bt pri exp', 'Exportieren'); e.onclick = exportDialog; a.append(e);
  }

  // ============================================================ dialogs
  function dialog(title, body, btns) {
    const bg = el('div', 'dlg-bg'), d = el('div', 'dlg', `<div class="dh">${title}</div><div class="db">${body}</div><div class="df"></div>`); const close = () => bg.remove();
    btns.forEach(([t, cls, f]) => { const b = el('button', 'bt ' + (cls || ''), t); b.onclick = () => { if (f && f(d) === false) return; close(); }; d.querySelector('.df').appendChild(b); });
    bg.appendChild(d); bg.onpointerdown = (e) => e.target === bg && close(); document.body.appendChild(bg); return d;
  }
  function saveDialog() {
    const d = dialog('UBGrade speichern', `<p>Speichert die komplette Chain inkl. LUTs in „Meine UBGrades“.</p><div class="fld"><label>NAME</label><input id="sn" maxlength="48" value="${esc(A.st.name === 'Unbenannt' ? '' : A.st.name)}" placeholder="z. B. Pink Haze"></div>`, [['Abbrechen'], ['Speichern', 'pri', (x) => save(x.querySelector('#sn').value.trim() || 'Mein UBGrade')]]);
    const i = d.querySelector('#sn'); setTimeout(() => i.focus(), 30); i.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { save(i.value.trim() || 'Mein UBGrade'); d.parentElement.remove(); } };
  }
  async function save(name) { A.st.name = name; const doc = makeDoc(A.st, name, thumbOf()); const ex = A.lib.find((x) => x.name === name); if (ex) doc.id = ex.id; await storeDoc(doc); await loadLib(); A.libSel = doc.id; renderCats(); renderLooks(); updateStatus(); toast('<b>' + esc(name) + '</b> gespeichert'); }
  function renameDoc(d) { const x = dialog('Umbenennen', `<div class="fld"><label>NAME</label><input id="rn" value="${esc(d.name)}"></div>`, [['Abbrechen'], ['OK', 'pri', async (dd) => { const n = dd.querySelector('#rn').value.trim(); if (!n) return; await removeDoc(d); d.name = n; delete d._file; await storeDoc(d); await loadLib(); renderCats(); renderLooks(); }]]); setTimeout(() => x.querySelector('#rn').select(), 30); }
  async function exportDoc(d) { const c = clone(d); delete c._file; await saveFile(safe(d.name) + '.ubgrade', JSON.stringify(c, null, 1)); }
  function exportDialog() {
    if (!A.media) return toast('Erst ein Bild öffnen', true); let fmt = 'jpg', size = 'orig';
    const d = dialog('Exportieren', `<div class="fld"><label>FORMAT</label><div class="radios" id="xf"><button data-v="jpg" class="on">JPEG · 95</button><button data-v="png">PNG</button></div></div><div class="fld"><label>GRÖSSE</label><div class="radios" id="xs"><button data-v="orig" class="on">Original</button><button data-v="4096">4096 px</button><button data-v="2048">2048 px</button></div></div>`, [['Abbrechen'], ['Exportieren', 'pri', () => { exportImage(fmt, size); }]]);
    const radio = (id, f) => $$('#' + id + ' button', d).forEach((b) => (b.onclick = () => { $$('#' + id + ' button', d).forEach((x) => x.classList.toggle('on', x === b)); f(b.dataset.v); }));
    radio('xf', (v) => (fmt = v)); radio('xs', (v) => (size = v));
  }
  async function exportImage(fmt, size) {
    if (!E.hasSource()) return; busy(true, 'EXPORT');
    try { let w = E.srcW, h = E.srcH; const s = Math.min(1, (size === 'orig' ? E.maxTex : +size) / Math.max(w, h)); w = Math.round(w * s); h = Math.round(h * s);
      const c = E.renderToCanvas(UB.renderChain(A.st), w, h), b = await new Promise((r) => c.toBlob(r, fmt === 'png' ? 'image/png' : 'image/jpeg', 0.95));
      const p = await saveFile(safe((A.media.name || 'bild').replace(/\.[^.]+$/, '') + '_UBGrade') + (fmt === 'png' ? '.png' : '.jpg'), b); if (p) toast('<b>Exportiert</b> ' + w + '×' + h);
    } finally { busy(false); }
  }
  async function exportLut() { const p = await saveFile(safe('UBGrade_' + A.st.name) + '.cube', UB.writeCube(E.bakeLUT(UB.renderChain(A.st), 33), 33, 'UBGrade ' + A.st.name)); if (p) toast('<b>LUT exportiert</b> – räumliche Tools (Optik, Korn …) sind in LUTs nicht enthalten'); }
  async function saveFile(name, data) {
    if (N) { const p = await N.saveDialog(name); if (!p) return null; await N.writeFile(p, typeof data === 'string' ? data : new Uint8Array(await data.arrayBuffer())); return p; }
    const a = el('a'); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data])); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000); return name;
  }
  function about() {
    dialog('Über UBGrade', `<div class="about"><div class="lg"><img src="assets/logo-ub.png" alt="UB"><img src="assets/logo-un.png" alt="UN" style="height:34px"></div><h3>UBGrade</h3><div class="by">BY GELOUNIQUE</div><p>Entwickelt von <b style="color:var(--tx)">Gelo Santino Mares</b><br>Color Grading für Premiere Pro, After Effects, DaVinci Resolve & Photoshop.</p><div class="links"><a class="bt pri" href="https://uniquebaby.de" target="_blank">uniquebaby.de</a><a class="bt" href="https://instagram.com/gelounique" target="_blank">@gelounique</a></div><div class="ver">VERSION ${VERSION} · © ${new Date().getFullYear()} GELO SANTINO MARES</div></div>`, [['Schließen']]);
    if (!N) $('.about').insertAdjacentHTML('beforeend', `<p class="legal"><a href="https://uniquebaby.de/#impressum" target="_blank" rel="noopener">Impressum</a> · <a href="https://uniquebaby.de/#datenschutz" target="_blank" rel="noopener">Datenschutz</a> · Bilder bleiben auf deinem Gerät – nichts wird hochgeladen.</p>`);
    $$('.about a').forEach((a) => a.addEventListener('click', (e) => { if (N) { e.preventDefault(); N.openExternal(a.href); } }));
  }
  function pop(anchor, items) {
    $$('.pop').forEach((p) => p.remove()); const p = el('div', 'pop');
    items.forEach((it) => { if (it.g) { p.appendChild(el('div', 'g', esc(it.g).toUpperCase())); return; } const b = el('button', '', (it.i ? IC(it.i) : '') + '<span>' + esc(it.t) + '</span>'); b.onclick = () => { p.remove(); it.f(); }; p.appendChild(b); });
    document.body.appendChild(p); const r = anchor.getBoundingClientRect(); p.style.left = Math.max(6, Math.min(innerWidth - p.offsetWidth - 6, r.left)) + 'px'; p.style.top = Math.max(6, Math.min(innerHeight - p.offsetHeight - 6, r.top - p.offsetHeight - 6 > 0 && r.top > innerHeight / 2 ? r.top - p.offsetHeight - 6 : r.bottom + 4)) + 'px';
    setTimeout(() => addEventListener('pointerdown', function h(e) { if (!p.contains(e.target)) { p.remove(); removeEventListener('pointerdown', h); } }), 0);
  }
  function toast(h, err, ms = 2800) { const t = el('div', 'tst' + (err ? ' err' : ''), h); $('#toast').appendChild(t); setTimeout(() => t.remove(), ms); }
  function busy(on, t) { let b = $('.busy'); if (on) { if (!b) { b = el('div', 'busy'); document.body.appendChild(b); } b.textContent = t || ''; } else if (b) b.remove(); }
  function pick(accept) { return new Promise((r) => { const i = el('input'); i.type = 'file'; i.accept = accept; i.onchange = () => r(i.files[0] || null); i.click(); }); }

  // ============================================================ viewer loop
  function tcode(t) { const f = Math.round(A.fps) || 25, n = Math.floor(t * f + 1e-6); return [Math.floor(n / f / 3600), Math.floor(n / f / 60) % 60, Math.floor(n / f) % 60, n % f].map((v) => String(v).padStart(2, '0')).join(':'); }
  function updateTl() { const v = A.video; if (!v) return; const p = v.duration ? v.currentTime / v.duration : 0; $('#sFill').style.width = p * 100 + '%'; $('#sKnob').style.left = p * 100 + '%'; $('#tc').textContent = tcode(v.currentTime); }
  let lastScope = 0;
  function loop() {
    requestAnimationFrame(loop); if (!E || !E.hasSource() || !A.dirty) return; A.dirty = false;
    const st = $('#stage').getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), pad = 18;
    const s = Math.min((st.width - pad * 2) / E.srcW, (st.height - pad * 2) / E.srcH); const cw = Math.max(16, Math.round(E.srcW * s)), ch = Math.max(16, Math.round(E.srcH * s));
    const cv = $('#cv'); cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    E.time = A.video ? A.video.currentTime : 0;
    const now = performance.now(), want = A.scopes && now - lastScope > 80;
    const sc = E.render(UB.renderChain(A.preview || A.st), Math.min(E.srcW, Math.round(cw * dpr)), Math.min(E.srcH, Math.round(ch * dpr)), { split: A.view.split, before: A.view.before, mode: A.view.mode, scopeW: want ? 260 : 0 });
    if (sc) { lastScope = now; UB.drawScope($('#scv'), A.scope, sc); } else if (A.scopes) A.dirty = true;
    if (A.view.split != null) { const c = cv.getBoundingClientRect(), sp = $('#split'); sp.style.left = c.left - st.left + c.width * A.view.split + 'px'; sp.style.top = c.top - st.top + 'px'; sp.style.height = c.height + 'px'; }
  }

  // ============================================================ wiring
  function wire() {
    $('#about').onclick = about; if ($('#bOpen')) $('#bOpen').onclick = () => $('#fileIn').click(); if ($('#bOpen2')) $('#bOpen2').onclick = () => $('#fileIn').click();
    $('#fileIn').onchange = (e) => { [...e.target.files].forEach(openFile); e.target.value = ''; };
    $('#bImport').onclick = async () => { const f = await pick('.ubgrade,.cube'); if (f) openFile(f); };
    $('#q').oninput = (e) => { A.q = e.target.value; renderLooks(); }; $('#q').onkeydown = (e) => e.stopPropagation();
    $('#bUndo').onclick = undo; $('#bRedo').onclick = redo; $('#bSave').onclick = saveDialog;
    $('#bReset').onclick = () => { const m = A.st.mode; A.st = blank(m); A.sel = null; A.libSel = null; commit(); renderLane(); renderTools(); renderLooks(); updateStatus(); };
    $('#tabLooks').onclick = () => { const on = !$('#app').classList.toggle('nolooks'); $('#tabLooks').classList.toggle('on', on); A.dirty = true; };
    $('#tabTools').onclick = () => { const on = !$('#app').classList.toggle('notools'); $('#tabTools').classList.toggle('on', on); A.dirty = true; };
    const bp = $('#bBypass'); bp.onclick = () => { A.view.before = !A.view.before; bp.classList.toggle('on', A.view.before); A.dirty = true; };
    $('#bSplit').onclick = () => { A.view.split = A.view.split == null ? 0.5 : null; $('#stage').classList.toggle('splitting', A.view.split != null); $('#bSplit').classList.toggle('on', A.view.split != null); A.dirty = true; };
    $('#bFalse').onclick = () => { A.view.mode = A.view.mode ? 0 : 1; $('#bFalse').classList.toggle('on', !!A.view.mode); A.dirty = true; };
    $('#notch').onclick = () => { A.scopes = !A.scopes; $('#scopes').classList.toggle('on', A.scopes); A.dirty = true; };
    $$('#scopeTabs button').forEach((b) => (b.onclick = () => { A.scope = b.dataset.m; $$('#scopeTabs button').forEach((x) => x.classList.toggle('on', x === b)); A.dirty = true; }));
    // strength scrub (drag left/right on the status cell)
    const gs = $('#gStr'); let sd = false, sx = 0, sv = 0;
    gs.onpointerdown = (e) => { sd = true; gs.setPointerCapture(e.pointerId); sx = e.clientX; sv = A.st.strength ?? 1; };
    gs.onpointermove = (e) => { if (!sd) return; A.st.strength = Math.max(0, Math.min(1, sv + (e.clientX - sx) / 300)); updateStatus(); A.dirty = true; };
    gs.onpointerup = () => { if (sd) { sd = false; commit(); } }; gs.ondblclick = () => { A.st.strength = 1; updateStatus(); commit(); };
    // split drag
    const sp = $('#split'); let spd = false; sp.onpointerdown = (e) => { spd = true; sp.setPointerCapture(e.pointerId); };
    sp.onpointermove = (e) => { if (!spd) return; const r = $('#cv').getBoundingClientRect(); A.view.split = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); A.dirty = true; }; sp.onpointerup = () => (spd = false);
    // RGB readout under the cursor
    $('#cv').addEventListener('pointermove', (e) => {
      const cv = $('#cv'), r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * cv.width), y = Math.floor((e.clientY - r.top) / r.height * cv.height);
      const gl = E.gl; const px = new Uint8Array(4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(x, cv.height - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      $('#rR').textContent = (px[0] / 255).toFixed(3); $('#rG').textContent = (px[1] / 255).toFixed(3); $('#rB').textContent = (px[2] / 255).toFixed(3);
    });
    new ResizeObserver(() => (A.dirty = true)).observe($('#stage'));
    // timeline
    $('#tPlay').onclick = () => { const v = A.video; if (!v) return; if (v.paused) { v.play(); $('#tPlay').innerHTML = ICO.pause; } else { v.pause(); $('#tPlay').innerHTML = ICO.play; A.srcVer++; queueThumbs(); queueTiles(); } };
    const sc = $('#scrub'); let sg = false; const seek = (e) => { const v = A.video; if (!v || !v.duration) return; const r = sc.getBoundingClientRect(); v.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * v.duration; };
    sc.onpointerdown = (e) => { sg = true; sc.setPointerCapture(e.pointerId); seek(e); }; sc.onpointermove = (e) => sg && seek(e); sc.onpointerup = () => (sg = false);
    // file drag & drop
    const vw = $('#view'); let n = 0;
    addEventListener('dragenter', (e) => { if (e.dataTransfer.types.includes('Files')) { n++; vw.classList.add('dragover'); } });
    addEventListener('dragleave', (e) => { if (e.dataTransfer.types.includes('Files')) { n = Math.max(0, n - 1); if (!n) vw.classList.remove('dragover'); } });
    addEventListener('dragover', (e) => e.preventDefault());
    addEventListener('drop', (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); n = 0; vw.classList.remove('dragover'); [...e.dataTransfer.files].forEach(openFile); });
    // keys
    addEventListener('keydown', (e) => {
      if (e.target.isContentEditable || /INPUT|SELECT/.test(e.target.tagName) || $('.dlg-bg')) return;
      const m = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (m && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (m && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      else if (m && k === 's') { e.preventDefault(); saveDialog(); } else if (m && k === 'o' && !A.host) { e.preventDefault(); $('#fileIn').click(); }
      else if (e.key === 'Enter' && A.host) { e.preventDefault(); hostOK(); } else if (e.key === 'Escape' && A.host) N.quit(1);
      else if (e.key === 'Escape' && A.sel) { A.sel = null; renderLane(); renderTools(); }
      else if (e.key === '\\') $('#bBypass').click(); else if (k === 's') $('#bSplit').click(); else if (k === 'f') $('#bFalse').click();
      else if ((e.key === 'Delete' || e.key === 'Backspace') && A.sel && A.sel !== 'in' && A.sel !== 'out') removeTool(A.sel);
      else if (e.key === ' ' && A.video) { e.preventDefault(); $('#tPlay').click(); }
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && A.video) { A.video.pause(); A.video.currentTime += (e.key === 'ArrowLeft' ? -1 : 1) / A.fps; }
    });
  }

  UB.app = { A, get engine() { return E; }, setImage, addTool, save, blob: () => blob(A.st, UB.renderChain(A.st)) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.UB = window.UB || {});
