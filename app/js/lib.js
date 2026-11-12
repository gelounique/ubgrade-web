/* UBGrade 3 by gelounique — tool library layout, tile demos, render ordering, native export
 * © Gelo Santino Mares · uniquebaby.de
 */
(function (UB) {
  'use strict';
  // Tool categories shown as tile grid on the right
  UB.CATS = [
    { id: 'light', title: 'Licht', tools: ['basic', 'curves', 'gradient', 'vignette', 'bw'] },
    { id: 'optics', title: 'Optik', tools: ['diffusion', 'halation', 'ca', 'lens'] },
    { id: 'color', title: 'Farbe', tools: ['wheels', 'grading', 'hsl', 'huecurves', 'wb', 'match'] },
    { id: 'film', title: 'Film', tools: ['film', 'lut', 'fade', 'bleach', 'grain'] },
    { id: 'finish', title: 'Finish', tools: ['sharpen', 'clarity', 'letterbox'] },
  ];
  // German display names (tools.js keeps the technical names)
  UB.NAMES = {
    basic: 'Basis-Ton', curves: 'Kurven', gradient: 'Verlaufsfilter', vignette: 'Vignette', bw: 'Schwarzweiß',
    diffusion: 'Diffusion', halation: 'Halation', ca: 'Farbsaum', lens: 'Linse',
    wheels: 'Farbräder', grading: 'Split-Toning', hsl: 'HSL', huecurves: 'Farbton-Kurven', wb: 'Weißabgleich', match: 'Shot Match',
    film: 'Film-Charakter', lut: 'LUT', fade: 'Matte', bleach: 'Bleach Bypass', grain: 'Korn',
    sharpen: 'Schärfe', clarity: 'Klarheit', letterbox: 'Letterbox', input: 'Input',
  };
  // Demo parameters per tool (tool tiles themselves show only their icon)
  UB.TILE = {
    basic: { contrast: 55, vibrance: 45, highlights: -30 }, curves: { c: { m: [[0, 0], [0.25, 0.15], [0.75, 0.88], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] } },
    gradient: { exposure: -1.6, sat: 55, hue: 215, position: 0 }, vignette: { amount: -75, size: 30 }, bw: {},
    diffusion: { amount: 80, size: 50 }, halation: { amount: 90, threshold: 50 }, ca: { amount: 100, falloff: 30 }, lens: { amount: 70 },
    wheels: { w: { lift: { x: -0.35, y: -0.2, l: 0 }, gamma: { x: 0, y: 0, l: 0 }, gain: { x: 0.3, y: 0.35, l: 0 }, offset: { x: 0, y: 0, l: 0 } } },
    grading: { sh_h: 195, sh_s: 70, hi_h: 35, hi_s: 55 }, hsl: { s_red: 60, s_orange: 50, s_yellow: 50, s_green: 60, s_aqua: 60, s_blue: 70, s_purple: 60, s_magenta: 60 },
    huecurves: { h: { hs: [], hh: [[0.33, 0.75], [0.6, 0.5]], hl: [], ls: [] } }, wb: { temp: 60 }, match: null,
    film: { stock: 'chrome64' }, lut: null, fade: { amount: 80 }, bleach: { contrast: 80, desat: 70 }, grain: { amount: 90, size: 220 },
    sharpen: { amount: 100, radius: 2 }, clarity: { clarity: 100 }, letterbox: { ratio: 2.39 },
  };
  // canonical order of spatial passes (identical in the native DaVinci/AE renderer)
  UB.SPATIAL_ORDER = ['lens', 'ca', 'diffusion', 'halation', 'gradient', 'vignette', 'clarity', 'sharpen', 'grain', 'letterbox'];

  // Chain the user built → render chain: input, colour tools in user order, spatial tools in canonical order
  UB.renderChain = function (st) {
    const live = st.chain.filter((t) => t.on !== false && UB.TOOLS[t.type]);
    const input = st.input && st.input.profile !== 'none' || (st.input && st.input.exposure) ? [{ uid: 'in', type: 'input', on: true, strength: 1, params: Object.assign(UB.defaults('input'), st.input) }] : [];
    const color = live.filter((t) => UB.TOOLS[t.type].kind === 'color');
    const spat = live.filter((t) => UB.TOOLS[t.type].kind !== 'color').sort((a, b) => UB.SPATIAL_ORDER.indexOf(a.type) - UB.SPATIAL_ORDER.indexOf(b.type));
    return { strength: st.strength ?? 1, chain: [...input, ...color, ...spat] };
  };

  // Spatial parameters for native host renderers (first active instance of each, scaled by tool + global strength)
  UB.nativeParams = function (st) {
    const s = st.strength ?? 1; const o = { strength: s }; const seen = {};
    for (const t of st.chain) {
      if (t.on === false || seen[t.type] || !UB.TOOLS[t.type] || UB.TOOLS[t.type].kind === 'color') continue; seen[t.type] = 1;
      const k = (t.strength ?? 1) * s, p = t.params;
      if (t.type === 'diffusion') Object.assign(o, { diff_amount: p.amount * k, diff_size: p.size, diff_high: p.highlights, diff_warm: p.warmth, diff_soft: p.softness });
      if (t.type === 'halation') Object.assign(o, { hal_amount: p.amount * k, hal_radius: p.radius, hal_thr: p.threshold, hal_hue: p.hue });
      if (t.type === 'vignette') Object.assign(o, { vig_amount: p.amount * k, vig_size: p.size, vig_feather: p.feather, vig_round: p.roundness, vig_cx: p.cx, vig_cy: p.cy });
      if (t.type === 'clarity') Object.assign(o, { clarity: p.clarity * k, dehaze: p.dehaze * k });
      if (t.type === 'sharpen') Object.assign(o, { sharpen: p.amount * k, sharp_radius: p.radius });
      if (t.type === 'grain') Object.assign(o, { grain_amount: p.amount * k, grain_size: p.size, grain_color: p.color, grain_resp: p.response, grain_anim: p.animate ? 1 : 0 });
      if (t.type === 'ca') Object.assign(o, { ca_amount: p.amount * k, ca_falloff: p.falloff });
      if (t.type === 'lens') Object.assign(o, { lens_amount: p.amount * k, lens_zoom: p.zoom });
      if (t.type === 'gradient') Object.assign(o, { grad_exposure: p.exposure * k, grad_hue: p.hue, grad_sat: p.sat * k, grad_angle: p.angle, grad_position: p.position, grad_soft: p.softness });
      if (t.type === 'letterbox') Object.assign(o, { lb_ratio: +p.ratio, lb_opacity: p.opacity * k });
    }
    return o;
  };

  // Short summary under a chain chip
  UB.summary = function (t) {
    const p = t.params, f = (v) => (v > 0 ? '+' : '') + Math.round(v);
    switch (t.type) {
      case 'basic': return ['contrast', 'exposure', 'highlights', 'shadows'].filter((k) => p[k]).slice(0, 2).map((k) => ({ contrast: 'Kontr ', exposure: 'Bel ', highlights: 'Licht ', shadows: 'Tief ' }[k] + (k === 'exposure' ? (+p[k]).toFixed(1) : f(p[k])))).join(' · ') || 'neutral';
      case 'wb': return `Temp ${f(p.temp)} · Tön ${f(p.tint)}`;
      case 'film': return (UB.FILM_STOCKS.find((s) => s.value === p.stock) || {}).label || '';
      case 'lut': return p.lut ? p.lut.name : 'keine LUT';
      case 'vignette': return f(p.amount);
      case 'grain': return 'Stärke ' + Math.round(p.amount);
      case 'diffusion': case 'halation': case 'sharpen': return 'Stärke ' + Math.round(p.amount);
      case 'letterbox': return (+p.ratio).toFixed(2) + ' : 1';
      default: return Math.round((t.strength ?? 1) * 100) + ' %';
    }
  };
})(window.UB = window.UB || {});
