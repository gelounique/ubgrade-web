/* UBGrade by gelounique – Präsentationsseite: Loader, Navigation, Vorher/Nachher (echte UBGrade-Engine), Download, Bug-Formular
 * © Gelo Santino Mares · uniquebaby.de
 */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- loader (min. 1,5 s, Ring lädt sich auf)
  const ld = $('#ld'), t0 = performance.now(), MIN = reduce ? 300 : 1500;
  let ready = false, shown = 0;
  const go = () => (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => (ready = true));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  setTimeout(() => (ready = true), 3000);
  (function tick(now) {
    const cap = ((now - t0) / MIN) * 100, target = ready ? 100 : 88;
    shown = Math.min(target, cap, shown + 2.4);
    ld.style.setProperty('--p', shown.toFixed(2)); $('.ld-pc', ld).textContent = Math.round(shown) + ' %';
    if (shown < 100) requestAnimationFrame(tick); else setTimeout(() => { ld.classList.add('out'); document.body.classList.add('loaded'); }, 220);
  })(t0);

  // ---------------------------------------------------------------- nav + reveal
  const nav = $('#nav');
  addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = (el.closest('.steps,.bento') ? (i % 3) * 80 : 0) + 'ms'; io.observe(el); });

  // ---------------------------------------------------------------- download: eigenes System hervorheben
  const ua = navigator.userAgent, plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  const mac = /mac/i.test(plat) || /Mac OS X/.test(ua), win = /win/i.test(plat) || /Windows/.test(ua);
  const mine = mac ? $('#dlMac') : win ? $('#dlWin') : null;
  if (mine && !/iPhone|iPad|Android/.test(ua)) { mine.classList.add('mine'); mine.insertAdjacentHTML('afterbegin', '<span class="me">DEIN SYSTEM</span>'); }

  // ---------------------------------------------------------------- Vorher / Nachher mit der UBGrade-Engine
  const SCENES = [
    { id: 'drohne', name: 'Drohne', log: 'dlog' },
    { id: 'speedboot', name: 'Speedboot', log: 'log3g10' },
    { id: 'bootstag', name: 'Bootstag', log: 'log3g10' },
  ];
  const B = (p) => ({ type: 'basic', params: p });
  const LOOKS = [
    { name: 'Golden Hour', sw: 'linear-gradient(135deg,#f6b25a,#ff7f5c)', chain: [B({ contrast: 16, highlights: -26, shadows: 14, vibrance: 16 }), { type: 'grading', params: { sh_h: 205, sh_s: 18, hi_h: 36, hi_s: 22, balance: -8 } }, { type: 'film', params: { stock: 'ub250d', warmth: 20 }, strength: 0.75 }, { type: 'halation', params: { amount: 34, radius: 28, threshold: 62 } }, { type: 'diffusion', params: { amount: 18 } }, { type: 'vignette', params: { amount: -24, size: 52, feather: 65 } }, { type: 'grain', params: { amount: 14 } }] },
    { name: 'Teal & Orange', sw: 'linear-gradient(135deg,#1f8a94,#f2a25a)', chain: [B({ contrast: 24, highlights: -32, shadows: 10, blacks: -14, saturation: 104, vibrance: 14 }), { type: 'grading', params: { sh_h: 192, sh_s: 42, hi_h: 30, hi_s: 34, md_h: 28, md_s: 8, balance: 6 } }, { type: 'film', params: { stock: 'ub250d', warmth: 4 }, strength: 0.7 }, { type: 'vignette', params: { amount: -22, size: 52, feather: 65 } }, { type: 'grain', params: { amount: 14 } }] },
    { name: 'Moody Film', sw: 'linear-gradient(135deg,#1e2833,#6d665b)', chain: [B({ exposure: -0.2, contrast: 12, highlights: -35, shadows: 4, saturation: 78 }), { type: 'fade', params: { amount: 24, roll: 25, tint_h: 220, tint_s: 12 } }, { type: 'grading', params: { sh_h: 212, sh_s: 24, hi_h: 42, hi_s: 10 } }, { type: 'film', params: { stock: 'ub500t', warmth: -12 }, strength: 0.6 }, { type: 'vignette', params: { amount: -32, size: 50, feather: 65 } }, { type: 'grain', params: { amount: 22 } }] },
    { name: 'Clean Natural', sw: 'linear-gradient(135deg,#e9edf0,#b9c6cf)', chain: [{ type: 'wb', params: { temp: -22, tint: 6 } }, B({ contrast: 10, highlights: -28, shadows: 14, whites: 6, blacks: -6, saturation: 94, vibrance: 10 })] },
    { name: 'Night 800T', sw: 'linear-gradient(135deg,#1b2a4a,#c4523f)', chain: [B({ exposure: -0.25, contrast: 14, highlights: -30, saturation: 92 }), { type: 'film', params: { stock: 'night800', warmth: -6 }, strength: 0.85 }, { type: 'halation', params: { amount: 40, radius: 30, threshold: 58 } }, { type: 'grain', params: { amount: 24 } }] },
    { name: 'Bleach Bypass', sw: 'linear-gradient(135deg,#59646a,#c9c2b4)', chain: [{ type: 'bleach', params: { contrast: 55, desat: 52 } }, B({ highlights: -18, shadows: 8 }), { type: 'vignette', params: { amount: -20, size: 54, feather: 65 } }] },
    { name: 'Noir', sw: 'linear-gradient(135deg,#111,#ddd)', chain: [{ type: 'bw', params: {} }, B({ contrast: 26, highlights: -18, shadows: 6, blacks: -14 }), { type: 'vignette', params: { amount: -34, size: 50, feather: 60 } }, { type: 'grain', params: { amount: 26, size: 120 } }] },
  ];

  window.__LOOKS = LOOKS;
  const cmp = $('#cmp'), view = $('#cmpView'), cv = $('#cmpCv'), vid = $('#cmpVid'), splitEl = $('#cmpSplit');
  let E = null, split = 0.5, scene = 0, look = 0, playing = true, inView = false, dirty = true, states = [];
  function initEngine() {
    try {
      if (!window.UB || !UB.Engine) throw new Error('engine');
      UB.lutStore = UB.lutStore || new Map(); UB.lutText = UB.lutText || new Map();
      E = new UB.Engine(cv);
      E.toolProg('input'); LOOKS.forEach((l) => l.chain.forEach((t) => E.toolProg(t.type)));
    } catch (e) { E = null; cmp.classList.add('nogl'); vid.controls = false; }
  }
  function chips() {
    const sc = $('#cmpScenes'), lk = $('#cmpLooks');
    sc.innerHTML = '<span class="chip-lbl">SZENE</span>'; lk.innerHTML = '<span class="chip-lbl">LOOK</span>';
    SCENES.forEach((s, i) => { const b = document.createElement('button'); b.className = 'chip' + (i === scene ? ' on' : ''); b.textContent = s.name; b.setAttribute('role', 'tab'); b.onclick = () => setScene(i); sc.appendChild(b); });
    LOOKS.forEach((l, i) => { const b = document.createElement('button'); b.className = 'chip' + (i === look ? ' on' : ''); b.innerHTML = `<i class="sw" style="background:${l.sw}"></i>${l.name}`; b.setAttribute('role', 'tab'); b.onclick = () => setLook(i); lk.appendChild(b); });
  }
  // jeder Look = Kamera-Input (LOG → Rec.709) + Tools – wie im Plugin
  function buildStates() {
    if (!E) return; const log = SCENES[scene].log;
    states = LOOKS.map((l) => UB.renderChain({ strength: 1, input: { profile: log, display: 2, exposure: 0 }, chain: l.chain.map((t) => UB.makeTool(t.type, t.params, t.strength)) }));
    dirty = true;
  }
  function setScene(i) {
    scene = i; buildStates(); $$('#cmpScenes .chip').forEach((b, k) => b.classList.toggle('on', k === i));
    const s = SCENES[i]; vid.poster = `media/${s.id}.jpg`; vid.src = `media/${s.id}.mp4`; vid.load();
    if (playing && inView) vid.play().catch(() => {});
  }
  function setLook(i) {
    look = i; $$('#cmpLooks .chip').forEach((b, k) => b.classList.toggle('on', k === i));
    $('#cmpLook').textContent = 'UBGRADE · ' + LOOKS[i].name.toUpperCase(); dirty = true;
  }
  function setSplit(x) { split = Math.max(0, Math.min(1, x)); splitEl.style.left = split * 100 + '%'; dirty = true; }
  function frame() {
    requestAnimationFrame(frame);
    if (!E || !inView || vid.readyState < 2) return;
    if (!vid.paused) dirty = true;
    if (!dirty) return; dirty = false;
    if (!E.setSource(vid)) return;
    const r = view.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.min(E.srcW, Math.round(r.width * dpr)), h = Math.round(w * E.srcH / E.srcW);
    E.time = vid.currentTime;
    E.render(states[look], w, h, { split });
  }
  function initCompare() {
    initEngine(); chips(); setLook(0); setSplit(0.5);
    let drag = false;
    const pos = (e) => { const r = view.getBoundingClientRect(); setSplit((e.clientX - r.left) / r.width); };
    view.addEventListener('pointerdown', (e) => { if (e.target.closest('.cmp-play')) return; drag = true; view.setPointerCapture(e.pointerId); pos(e); });
    view.addEventListener('pointermove', (e) => drag && pos(e));
    view.addEventListener('pointerup', () => (drag = false)); view.addEventListener('pointercancel', () => (drag = false));
    view.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') setSplit(split - 0.05); if (e.key === 'ArrowRight') setSplit(split + 0.05); });
    view.tabIndex = 0;
    const pb = $('#cmpPlay'), ICON_P = '<svg viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/></svg>', ICON_PL = '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
    pb.onclick = () => { playing = !playing; if (playing) vid.play().catch(() => {}); else vid.pause(); pb.innerHTML = playing ? ICON_P : ICON_PL; pb.setAttribute('aria-label', playing ? 'Pause' : 'Abspielen'); };
    if (reduce) { playing = false; pb.innerHTML = ICON_PL; }
    vid.addEventListener('loadeddata', () => (dirty = true)); vid.addEventListener('seeked', () => (dirty = true));
    new IntersectionObserver((es) => es.forEach((e) => { inView = e.isIntersecting; if (inView && playing) vid.play().catch(() => {}); else vid.pause(); dirty = true; }), { threshold: 0.15 }).observe(view);
    addEventListener('resize', () => (dirty = true));
    setScene(0); requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCompare); else initCompare();

  // ---------------------------------------------------------------- Bug melden → support@uniquebaby.de
  const TO = 'support@uniquebaby.de';
  const form = $('#bugForm'), msg = $('#bugMsg'), send = $('#bugSend');
  const show = (html, err) => { msg.innerHTML = html; msg.className = 'form-msg show' + (err ? ' err' : ''); };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form); if (f.get('_honey')) return;
    let ok = true; $$('[required]', form).forEach((el) => { const bad = !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value)); el.classList.toggle('bad', bad); if (bad) ok = false; });
    if (!ok) return show('Bitte Name, E-Mail, Bereich und Beschreibung ausfüllen.', true);
    const d = { name: f.get('name').trim(), email: f.get('email').trim(), bereich: f.get('bereich'), system: (f.get('system') || '').trim() || '–', message: f.get('message').trim() };
    const payload = { _subject: `UBGrade Bug: ${d.bereich} – ${d.name}`, _template: 'table', _captcha: 'false', Name: d.name, email: d.email, Bereich: d.bereich, System: d.system, Meldung: d.message, Browser: navigator.userAgent, Seite: location.href, Version: 'UBGrade 4.1.0 Beta' };
    const mailto = 'mailto:' + TO + '?subject=' + encodeURIComponent(payload._subject) + '&body=' + encodeURIComponent(`${d.message}\n\nBereich: ${d.bereich}\nSystem: ${d.system}\n\n– ${d.name} (${d.email})`);
    send.disabled = true; send.textContent = 'Wird gesendet …';
    try {
      const r = await fetch('https://formsubmit.co/ajax/' + TO, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || String(j.success) !== 'true') throw new Error(j.message || r.status);
      form.classList.add('sent');
      show(`<b>Danke, ${d.name.split(' ')[0].replace(/[<>&]/g, '')}!</b> Deine Meldung ist bei uns angekommen. Wir melden uns per E-Mail, falls wir Rückfragen haben.`);
    } catch (err) {
      show(`Senden hat gerade nicht geklappt. <a class="tl" href="${mailto}">Meldung per E-Mail-Programm schicken</a> – der Text ist schon drin.`, true);
    } finally { send.disabled = false; send.textContent = 'Meldung senden'; }
  });
})();
