/* UBGrade by gelounique — Scopes: waveform, RGB parade, vectorscope, histogram */
(function (UB) {
  'use strict';
  const off = document.createElement('canvas');
  UB.drawScope = function (cv, mode, s) {
    const W = cv.width, H = cv.height, ctx = cv.getContext('2d');
    const px = s.px, sw = s.w, sh = s.h, n = sw * sh;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const dpr = W / (cv.clientWidth || W);
    if (mode === 'hist') {
      const hr = new Float32Array(256), hg = new Float32Array(256), hb = new Float32Array(256);
      for (let i = 0; i < n; i++) { hr[px[i * 4]]++; hg[px[i * 4 + 1]]++; hb[px[i * 4 + 2]]++; }
      let mx = 1; for (let i = 2; i < 254; i++) mx = Math.max(mx, hr[i], hg[i], hb[i]);
      ctx.globalCompositeOperation = 'lighter';
      [[hr, 'rgba(255,80,100,0.7)'], [hg, 'rgba(80,255,130,0.6)'], [hb, 'rgba(90,140,255,0.75)']].forEach(([h, c]) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, H);
        for (let i = 0; i < 256; i++) { const sm = (h[Math.max(0, i - 1)] + h[i] * 2 + h[Math.min(255, i + 1)]) / 4; ctx.lineTo((i / 255) * W, H - Math.min(1, sm / mx) * (H - 8 * dpr)); }
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over'; return;
    }
    const vec = mode === 'vector';
    const GW = vec ? 220 : mode === 'parade' ? sw * 3 : sw, GH = vec ? 220 : 128;
    const acc = new Float32Array(GW * GH * 3);
    const add = (x, y, r, g, b) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= GW || y >= GH) return; const i = (y * GW + x) * 3; acc[i] += r; acc[i + 1] += g; acc[i + 2] += b; };
    for (let i = 0; i < n; i++) {
      const x = i % sw; const r = px[i * 4] / 255, g = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255;
      if (mode === 'wave') { const L = 0.2126 * r + 0.7152 * g + 0.0722 * b; add(x, (1 - L) * (GH - 1), 1, 0.86, 0.93); }
      else if (mode === 'parade') { add(x, (1 - r) * (GH - 1), 1, 0.3, 0.35); add(sw + x, (1 - g) * (GH - 1), 0.35, 1, 0.5); add(2 * sw + x, (1 - b) * (GH - 1), 0.4, 0.55, 1); }
      else { const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; const cb = (b - y) / 1.8556, cr = (r - y) / 1.5748; add(GW / 2 + cb * GW * 0.9, GH / 2 - cr * GH * 0.9, 0.5 + r * 0.7, 0.5 + g * 0.7, 0.5 + b * 0.7); }
    }
    const k = vec ? 0.9 : 1.15 * GH / sh;
    off.width = GW; off.height = GH; const o = off.getContext('2d'); const img = o.createImageData(GW, GH), d = img.data;
    for (let i = 0, j = 0; i < acc.length; i += 3, j += 4) {
      const t = (v) => 255 * (1 - Math.exp(-v * k * 0.35));
      d[j] = t(acc[i]); d[j + 1] = t(acc[i + 1]); d[j + 2] = t(acc[i + 2]); d[j + 3] = 255;
    }
    o.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (vec) { const S = Math.min(W, H); ctx.drawImage(off, (W - S) / 2, (H - S) / 2, S, S); }
    else ctx.drawImage(off, 0, 0, W, H);
    ctx.font = 9 * dpr + 'px JetBrains Mono, monospace'; ctx.lineWidth = 1;
    if (!vec) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.fillStyle = 'rgba(255,255,255,0.35)';
      [0, 25, 50, 75, 100].forEach((v) => { const y = Math.round((1 - v / 100) * (H - 1)) + 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.fillText(v, 3 * dpr, Math.max(9 * dpr, y - 2 * dpr)); });
      if (mode === 'parade') { ctx.strokeStyle = 'rgba(255,255,255,0.14)'; [1, 2].forEach((i) => { ctx.beginPath(); ctx.moveTo((W * i) / 3, 0); ctx.lineTo((W * i) / 3, H); ctx.stroke(); }); }
    } else {
      const S = Math.min(W, H), cx = W / 2, cy = H / 2, R = S * 0.45;
      ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,182,213,0.7)'; ctx.beginPath(); ctx.moveTo(cx, cy); const a = (-123 * Math.PI) / 180; ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      [['R', [0.75, 0, 0]], ['Yl', [0.75, 0.75, 0]], ['G', [0, 0.75, 0]], ['Cy', [0, 0.75, 0.75]], ['B', [0, 0, 0.75]], ['Mg', [0.75, 0, 0.75]]].forEach(([t, [r, g, b]]) => {
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; const x = cx + ((b - y) / 1.8556) * S * 0.9, yy = cy - ((r - y) / 1.5748) * S * 0.9;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.strokeRect(x - 4 * dpr, yy - 4 * dpr, 8 * dpr, 8 * dpr); ctx.fillText(t, x + 6 * dpr, yy + 3 * dpr);
      });
    }
  };
})(window.UB = window.UB || {});
