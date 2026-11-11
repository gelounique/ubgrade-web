/* UBGrade by gelounique — Anfänger-Tutorial (?)
 * Step cards with a spotlight on the matching part of the UI. Works in every edition
 * (Web-Testversion, Foto-App, Photoshop, Video-Edition in Premiere / After Effects / DaVinci).
 * © Gelo Santino Mares · uniquebaby.de
 */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const GUIDE = 'https://ubgrade.uniquebaby.de/anleitung.html';
  const ed = () => ({ hosted: document.body.classList.contains('hosted'), video: document.body.classList.contains('ed-video') || document.body.classList.contains('vtest'), web: document.body.classList.contains('web') });
  const tile = (type) => $(`.tile[data-type="${type}"]`);
  const chip = (type) => $(`.chip[data-type="${type}"]`);
  const addTool = (type) => { const c = chip(type); if (c) { if (!c.classList.contains('sel')) c.click(); return; } if (window.UB && UB.app) UB.app.addTool(type); };
  const hasSource = () => $('#view') && $('#view').classList.contains('has');

  async function loadDemo() {
    const img = new Image(); img.src = 'assets/demo.jpg'; await img.decode();
    UB.app.setImage(await createImageBitmap(img), 'Beispielbild.jpg');
  }

  const STEPS = [
    { t: 'Willkommen bei UBGrade', b: (e) => `In <b>6 kurzen Schritten</b> zu deinem ersten richtig guten Look – ohne Vorwissen.<br>Du kannst jederzeit weiterklicken, nichts geht kaputt: <b>Strg+Z</b> macht alles rückgängig.${e.hosted ? '' : '<br><br>Kein Bild zur Hand? Nimm unser Beispielbild.'}`,
      act: (e) => (e.hosted || hasSource() ? [] : [['Beispielbild laden', loadDemo]]) },
    { t: (e) => (e.hosted ? 'Dein Frame' : 'Bild rein'), sel: '#view',
      b: (e) => (e.hosted ? `Das ist der Frame unter deinem Playhead. Alles, was du hier baust, landet beim <b>OK</b> auf dem <b>ganzen Clip</b>.<br><br>Tipp: Wähle einen Frame mit Gesicht oder wichtigem Motiv – daran richtest du den Look aus.`
        : e.video ? `Zieh ein Video (MP4, MOV, WebM) oder ein Bild in die Mitte. In der Testversion siehst du die ersten 30 Sekunden live gegradet.`
        : `Zieh dein Foto in die Mitte oder klick auf <b>Bild öffnen</b>.<br><br>Tipp: Starte mit einem normal belichteten Bild – ein Look kann kein verwackeltes oder stark überbelichtetes Foto retten.`),
      act: (e) => (e.hosted || hasSource() ? [] : [['Beispielbild laden', loadDemo]]) },
    { t: '1 · Licht zuerst', sel: () => chip('basic') || tile('basic'), tool: 'basic',
      b: `Immer zuerst die Helligkeit, dann die Farbe. Öffne <b>Basis-Ton</b> und geh von oben nach unten:<ol><li><b>Belichtung</b>, bis dein Motiv gut zu sehen ist</li><li><b>Lichter</b> −20 bis −40 holt hellen Himmel zurück</li><li><b>Tiefen</b> +10 bis +25 öffnet dunkle Stellen</li><li><b>Kontrast</b> +10 bis +20 für mehr Punch</li></ol>`,
      act: () => [['Basis-Ton öffnen', () => addTool('basic')]] },
    { t: '2 · Weiß soll weiß sein', sel: () => chip('wb') || tile('wb'), tool: 'wb',
      b: `Mit <b>Weißabgleich</b> entfernst du Farbstiche. <b>Temperatur</b> links = kühler (blau), rechts = wärmer (orange). <b>Tönung</b> korrigiert Grün/Magenta.<br><br>Faustregel: Wenn Haut natürlich aussieht, passt's. Bei Sonnenuntergang darf's ruhig etwas wärmer sein.`,
      act: () => [['Weißabgleich öffnen', () => addTool('wb')]] },
    { t: '3 · Dein Look', sel: () => chip('grading') || tile('grading'), tool: 'grading',
      b: `Jetzt kommt die Stimmung. <b>Split-Toning</b> färbt dunkle und helle Bereiche getrennt – der Kino-Klassiker:<ul><li><b>Tiefen Farbton</b> ≈ 200 (Blau-Grün), <b>Sättigung</b> 15–25</li><li><b>Lichter Farbton</b> ≈ 35 (Orange), <b>Sättigung</b> 15–25</li></ul>Kleine Werte wirken hochwertiger als große.`,
      act: (e) => [['Split-Toning öffnen', () => addTool('grading')]].concat(e.web && location.protocol.startsWith('http') && UB.app.importDoc ? [['Fertigen Starter-Look testen', async () => UB.app.importDoc(await (await fetch('rezepte/02-Teal-Orange-Kino.ubgrade')).json())]] : []) },
    { t: '4 · Filmgefühl', sel: () => chip('film') || chip('grain') || tile('film'),
      b: `Der Feinschliff, der aus „gefiltert“ „gefilmt“ macht:<ul><li><b>Film-Charakter</b> für Farben &amp; Tonalität echter Filme</li><li><b>Korn</b> 10–20 für Textur</li><li><b>Vignette</b> −15 bis −30 lenkt den Blick zur Mitte</li></ul>`,
      act: () => [['Film-Charakter', () => addTool('film')], ['Korn', () => addTool('grain')], ['Vignette', () => addTool('vignette')]] },
    { t: '5 · Vergleichen & dosieren', sel: '#gStr', alt: '#bBypass',
      b: `Klick auf <b>⊘</b> (oder Taste <b>\\</b>) für Vorher/Nachher, <b>S</b> für die Split-Ansicht.<br><br>Wirkt's zu viel? Zieh die <b>Stärke</b> unten auf <b>60–80 %</b>. Das ist der häufigste Profi-Trick – ein Look sollte das Bild verbessern, nicht übertönen.` },
    { t: (e) => (e.hosted && e.video ? '6 · Speichern & übernehmen' : '6 · Speichern & exportieren'), sel: '#bSave',
      b: (e) => `Mit <b>Speichern</b> wird dein Look ein <b>UBGrade</b>: Er erscheint links in deiner Bibliothek und funktioniert in Premiere Pro, After Effects, DaVinci Resolve und Photoshop – und lässt sich als <b>.ubgrade</b>-Datei teilen.<br><br>${e.hosted && e.video ? 'Zum Schluss <b>OK ✓</b> unten rechts – der Grade sitzt auf deinem Clip.' : e.hosted ? 'Zum Schluss <b>OK ✓</b> – Photoshop übernimmt den Grade.' : e.video ? 'In der Testversion exportierst du einzelne Frames. Für ganze Videos: UBGrade für Windows &amp; Mac.' : 'Zum Schluss <b>Exportieren</b> unten rechts – in voller Auflösung.'}`,
      act: () => [['Ausführliche Anleitung', () => openGuide()]] },
  ];

  function openGuide() {
    if (window.ubNative && window.ubNative.openExternal) window.ubNative.openExternal(GUIDE);
    else window.open(location.protocol.startsWith('http') ? 'anleitung.html' : GUIDE, '_blank', 'noopener');
  }

  let i = 0, root = null;
  function build() {
    root = document.createElement('div'); root.id = 'tut';
    root.innerHTML = `<div class="spot"></div><div class="card" role="dialog" aria-label="Tutorial"><div class="hd"><span class="eb">TUTORIAL</span><span class="ct"></span><button class="x" aria-label="Schließen">✕</button></div><h3></h3><div class="bd"></div><div class="ac"></div><div class="ft"><div class="dots"></div><div class="nv"><button class="bt back">Zurück</button><button class="bt pri next">Weiter</button></div></div></div>`;
    document.body.appendChild(root);
    root.querySelector('.x').onclick = close; root.querySelector('.back').onclick = () => go(i - 1); root.querySelector('.next').onclick = () => (i >= STEPS.length - 1 ? close() : go(i + 1));
    addEventListener('resize', place); addEventListener('keydown', (e) => { if (!root.classList.contains('on')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight' && e.target.tagName !== 'INPUT') go(i + 1); if (e.key === 'ArrowLeft' && e.target.tagName !== 'INPUT') go(i - 1); });
  }
  const val = (v, e) => (typeof v === 'function' ? v(e) : v);
  function target() { const s = STEPS[i]; let t = typeof s.sel === 'function' ? s.sel() : s.sel ? $(s.sel) : null; if ((!t || !t.offsetParent) && s.alt) t = $(s.alt); return t && t.offsetParent ? t : null; }
  function go(n) {
    if (n < 0 || n >= STEPS.length) return; i = n; const s = STEPS[i], e = ed();
    root.querySelector('h3').innerHTML = val(s.t, e); root.querySelector('.bd').innerHTML = val(s.b, e); root.querySelector('.ct').textContent = `${i + 1} / ${STEPS.length}`;
    const ac = root.querySelector('.ac'); ac.innerHTML = '';
    (s.act ? s.act(e) : []).forEach(([label, fn]) => { const b = document.createElement('button'); b.className = 'bt'; b.textContent = label; b.onclick = async () => { b.disabled = true; try { await fn(); } finally { b.disabled = false; setTimeout(place, 350); } }; ac.appendChild(b); });
    root.querySelector('.dots').innerHTML = STEPS.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'done' : ''}"></i>`).join('');
    root.querySelector('.back').style.visibility = i ? 'visible' : 'hidden'; root.querySelector('.next').textContent = i >= STEPS.length - 1 ? 'Fertig ✓' : i === 0 ? 'Los geht’s' : 'Weiter';
    const t = target(); if (t) t.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setTimeout(place, t ? 260 : 0);
  }
  function place() {
    if (!root || !root.classList.contains('on')) return;
    const spot = root.querySelector('.spot'), card = root.querySelector('.card'), t = target(), W = innerWidth, H = innerHeight, cw = card.offsetWidth, ch = card.offsetHeight, m = 16;
    root.classList.toggle('dim', !t);
    if (!t) { spot.style.cssText = 'left:50%;top:50%;width:0;height:0'; card.style.left = (W - cw) / 2 + 'px'; card.style.top = Math.max(m, (H - ch) / 2) + 'px'; return; }
    const r = t.getBoundingClientRect(), p = 6; spot.style.cssText = `left:${r.left - p}px;top:${r.top - p}px;width:${r.width + 2 * p}px;height:${r.height + 2 * p}px`;
    // dock the card in the (mostly empty) left column so the picture stays visible while you move sliders
    let x = r.left > cw + 48 ? m + 8 : r.right + 24, y = r.top + r.height / 2 - ch / 2;
    if (x + cw > W - m) { x = (W - cw) / 2; y = r.top > H / 2 ? r.top - ch - 24 : r.bottom + 24; }
    card.style.left = Math.max(m, Math.min(W - cw - m, x)) + 'px'; card.style.top = Math.max(m + 44, Math.min(H - ch - m, y)) + 'px';
  }
  function open(at = 0) { if (!root) build(); root.classList.add('on'); try { localStorage.setItem('ubg-tut-seen', '1'); } catch (e) {} const h = $('#bHelp'); if (h) h.classList.remove('new'); go(at); }
  function close() { if (root) root.classList.remove('on'); }
  window.UBTutorial = { open, close };

  function init() {
    const h = $('#bHelp'); if (!h) return; h.onclick = () => open(0);
    let seen = false; try { seen = !!localStorage.getItem('ubg-tut-seen'); } catch (e) {}
    // wait until the app has booted (edition classes are set) – then badge the button / auto-start via ?tutorial=1
    const t0 = Date.now();
    (function w() {
      const sp = $('#splash'); if (!(sp && sp.classList.contains('out')) && Date.now() - t0 < 8000) return setTimeout(w, 120);
      if (!seen && !document.body.classList.contains('hosted')) h.classList.add('new');
      if (/[?&]tutorial=1/.test(location.search)) setTimeout(() => open(0), 300);
    })();
    addEventListener('keydown', (e) => { if (e.key === 'F1' || (e.key === '?' && !/INPUT|TEXTAREA/.test(e.target.tagName))) { e.preventDefault(); open(0); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
