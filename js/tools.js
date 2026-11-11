/* UBGrade by gelounique — Tool library
 * Every tool is an original UBGrade implementation.
 * kind 'color'   = pure per-pixel → can be baked into a .cube LUT
 * kind 'spatial' = uses position / neighbourhood (lens, grain, sharpen …)
 */
(function (UB) {
  'use strict';

  UB.STAGES = [
    { id: 'source', no: '01', label: 'SOURCE', de: 'Quelle' },
    { id: 'optics', no: '02', label: 'OPTICS', de: 'Optik' },
    { id: 'color',  no: '03', label: 'COLOR',  de: 'Farbe' },
    { id: 'film',   no: '04', label: 'FILM',   de: 'Film' },
    { id: 'finish', no: '05', label: 'FINISH', de: 'Finish' },
  ];

  // ---------- spline helpers ----------
  function monotone(pts) { // pts sorted [[x,y]] → f(x)
    const n = pts.length; if (n === 0) return (x) => x; if (n === 1) return () => pts[0][1];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  function periodic(pts) { // hue curves wrap around
    if (!pts.length) return () => 0.5;
    const s = [...pts].sort((a, b) => a[0] - b[0]);
    const ext = [...s.map((p) => [p[0] - 1, p[1]]), ...s, ...s.map((p) => [p[0] + 1, p[1]])];
    return monotone(ext);
  }
  UB.spline = { monotone, periodic };
  const sortPts = (p) => [...(p || [])].sort((a, b) => a[0] - b[0]);

  const P = (id, label, min, max, def, extra) => Object.assign({ id, label, min, max, def, step: (max - min) > 20 ? 1 : 0.01 }, extra || {});
  const HSL_BANDS = [
    { id: 'red', label: 'Rot', hue: 0, col: '#ff4d4d' }, { id: 'orange', label: 'Orange', hue: 30, col: '#ff9a3c' },
    { id: 'yellow', label: 'Gelb', hue: 60, col: '#ffe14d' }, { id: 'green', label: 'Grün', hue: 120, col: '#4dd96b' },
    { id: 'aqua', label: 'Aqua', hue: 180, col: '#4de0e0' }, { id: 'blue', label: 'Blau', hue: 225, col: '#4d7bff' },
    { id: 'purple', label: 'Lila', hue: 275, col: '#a64dff' }, { id: 'magenta', label: 'Magenta', hue: 315, col: '#ff4dc4' },
  ];
  UB.HSL_BANDS = HSL_BANDS;

  const FILM_STOCKS = [
    { value: 'ub250d',  label: 'UB Daylight 250',  g: [1.0, 1.0, 1.03], k: 1.15, toe: 0.02, sh: 0.02, sat: 1.05, st: [0.0, 0.006, 0.014], ht: [0.022, 0.012, -0.016] },
    { value: 'ub500t',  label: 'UB Tungsten 500',  g: [1.05, 1.0, 0.95], k: 1.12, toe: 0.03, sh: 0.02, sat: 0.95, st: [-0.012, 0.012, 0.034], ht: [0.034, 0.012, -0.024] },
    { value: 'chrome64',label: 'Slide Chrome 64',  g: [0.98, 1.0, 1.05], k: 1.38, toe: 0.0, sh: 0.03, sat: 1.28, st: [0.0, 0.0, 0.012], ht: [0.012, 0.01, 0.0] },
    { value: 'soft400', label: 'Portrait 400 Soft',g: [0.98, 1.0, 1.0], k: 0.94, toe: 0.035, sh: 0.03, sat: 0.9, st: [0.006, 0.0, 0.012], ht: [0.022, 0.014, 0.0] },
    { value: 'night800',label: 'Night Neg 800T',  g: [1.06, 1.0, 0.93], k: 1.22, toe: 0.02, sh: 0.02, sat: 1.0, st: [0.0, 0.012, 0.04], ht: [0.045, 0.0, -0.025] },
    { value: 'archive', label: 'Archive Flat',     g: [1.0, 1.0, 1.0], k: 0.84, toe: 0.055, sh: 0.06, sat: 0.8, st: [0.012, 0.012, 0.0], ht: [0.01, 0.008, -0.008] },
    { value: 'xpro',    label: 'Cross Process',    g: [0.92, 0.96, 1.14], k: 1.3, toe: 0.02, sh: 0.0, sat: 1.22, st: [0.0, 0.025, 0.06], ht: [0.055, 0.045, -0.07] },
    { value: 'super8',  label: 'Super 8 Memory',   g: [0.95, 1.0, 1.1], k: 1.16, toe: 0.065, sh: 0.05, sat: 0.86, st: [0.024, 0.012, 0.0], ht: [0.055, 0.03, -0.035] },
  ];
  const LETTERBOX = [
    { value: 2.39, label: '2.39 : 1 Scope' }, { value: 2.35, label: '2.35 : 1' }, { value: 2.0, label: '2.00 : 1 Univisium' },
    { value: 1.85, label: '1.85 : 1 Flat' }, { value: 1.6667, label: '5 : 3' }, { value: 1.3333, label: '4 : 3' },
    { value: 1.0, label: '1 : 1 Square' }, { value: 0.8, label: '4 : 5 Portrait' }, { value: 0.5625, label: '9 : 16 Reel' },
  ];

  function wheelVec(w) { // {x,y,l} → rgb offset (zero luma) + luma
    const x = w?.x || 0, y = w?.y || 0, l = w?.l || 0; const r = Math.min(1, Math.hypot(x, y));
    let hue = (Math.atan2(y, x) * 180) / Math.PI; if (hue < 0) hue += 360;
    const rgb = hsv(hue / 360, 1, 1); const L = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    return [(rgb[0] - L) * r + l, (rgb[1] - L) * r + l, (rgb[2] - L) * r + l];
  }
  function hsv(h, s, v) { const f = (n) => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1)]; }
  UB.hsv = hsv; UB.wheelVec = wheelVec;

  const T = {};

  // ================= 01 SOURCE =================
  T.input = {
    name: 'Camera Input', stage: 'source', kind: 'color', icon: 'cam', needsColor: true,
    desc: 'Log → Rec.709. Kamera-Profile nach Hersteller-Whitepapers (ARRI, RED, Sony, Canon, Panasonic, Fuji, BMD, Nikon, DJI, Apple, GoPro).',
    params: [
      { id: 'profile', label: 'Kamera-Profil', type: 'select', def: 'none', options: UB.Color.PROFILES.map((p) => ({ value: p.id, label: p.label })) },
      { id: 'display', label: 'Tone-Mapping', type: 'select', def: 0, options: [{ value: 0, label: 'UB Filmic' }, { value: 1, label: 'Rec.709 Kurve' }, { value: 2, label: 'Linear (ohne Mapping)' }] },
      P('exposure', 'Belichtung (Blenden)', -4, 4, 0, { step: 0.05 }),
    ],
    glsl: `uniform float u_curve; uniform mat3 u_mat; uniform float u_display; uniform float u_exposure;
vec3 tool(vec3 c, vec2 uv){
  int k = int(u_curve+0.5);
  if(k==0){ return pow(pow(max(c,0.0),vec3(2.4))*exp2(u_exposure), vec3(1.0/2.4)); }
  vec3 lin = u_mat * ub_decode3(c, k); lin *= exp2(u_exposure);
  return ub_tonemap(lin, int(u_display+0.5));
}`,
    uniforms(u, p) {
      const pr = UB.Color.PROFILES.find((x) => x.id === p.profile) || UB.Color.PROFILES[0];
      u.f('u_curve', pr.curve); u.m3('u_mat', UB.Color.toGL(UB.Color.gamutTo709(pr.gamut))); u.f('u_display', +p.display || 0);
    },
  };
  T.wb = {
    name: 'White Balance', stage: 'source', kind: 'color', icon: 'temp', desc: 'Farbtemperatur & Tönung im linearen Licht. „Auto“ misst Graubalance.',
    params: [P('temp', 'Temperatur', -100, 100, 0, { track: 'temp' }), P('tint', 'Tönung', -100, 100, 0, { track: 'tint' })],
    actions: [{ id: 'autoWB', label: 'Auto-Weißabgleich' }],
    glsl: `uniform float u_temp, u_tint;
vec3 tool(vec3 c, vec2 uv){
  vec3 l = pow(max(c,0.0), vec3(2.4)); float t=u_temp/100.0, n=u_tint/100.0;
  vec3 g = vec3(1.0+0.32*t, 1.0-0.22*n, 1.0-0.32*t); g /= dot(g, vec3(0.2126,0.7152,0.0722));
  return pow(l*g, vec3(1.0/2.4));
}`,
  };
  T.match = {
    name: 'Shot Match', stage: 'source', kind: 'color', icon: 'match', desc: 'Überträgt Farbstimmung & Kontrast eines Referenzbildes auf deine Aufnahme.',
    params: [{ id: 'm', type: 'match', def: { sm: [0.5, 0, 0], ss: [0.2, 0.05, 0.05], rm: [0.5, 0, 0], rs: [0.2, 0.05, 0.05], thumb: '' } }],
    actions: [{ id: 'loadRef', label: 'Referenzbild laden' }, { id: 'remeasure', label: 'Quelle neu messen' }],
    glsl: `uniform vec3 u_sm, u_ss, u_rm, u_rs;
vec3 tool(vec3 c, vec2 uv){
  float y=luma(c); vec3 v=vec3(y,(c.b-y)/1.8556,(c.r-y)/1.5748);
  vec3 k = clamp(u_rs/max(u_ss,vec3(1e-3)), vec3(0.4), vec3(2.5));
  v = (v-u_sm)*k + u_rm;
  float r=v.x+1.5748*v.z, b=v.x+1.8556*v.y, g=(v.x-0.2126*r-0.0722*b)/0.7152;
  return vec3(r,g,b);
}`,
    uniforms(u, p) { const m = p.m || T.match.params[0].def; u.v3('u_sm', m.sm); u.v3('u_ss', m.ss); u.v3('u_rm', m.rm); u.v3('u_rs', m.rs); },
  };

  // ================= 02 OPTICS =================
  T.diffusion = {
    name: 'Diffusion', stage: 'optics', kind: 'spatial', icon: 'mist', desc: 'Weichzeichner-Filter wie ein Mist-Glas vor dem Objektiv – Glow in den Lichtern.',
    params: [P('amount', 'Stärke', 0, 100, 35), P('size', 'Größe', 1, 100, 30), P('highlights', 'Nur Lichter', 0, 100, 60), P('warmth', 'Wärme', -100, 100, 10, { track: 'temp' }), P('softness', 'Kontrast-Weich', 0, 100, 25)],
    pre: (e, cur, p) => e.blur(cur, 0.004 + (p.size / 100) * 0.05),
    glsl: `uniform sampler2D u_blur; uniform float u_amount,u_highlights,u_warmth,u_softness;
vec3 tool(vec3 c, vec2 uv){
  vec3 b = texture(u_blur, uv).rgb; float Lb=luma(b);
  float hm = mix(1.0, smoothstep(0.2, 1.0, Lb), u_highlights/100.0);
  vec3 tint = vec3(1.0+u_warmth/100.0*0.18, 1.0, 1.0-u_warmth/100.0*0.18);
  vec3 g = clamp(b*tint*hm*(u_amount/100.0)*1.2, 0.0, 1.0);
  vec3 r = 1.0-(1.0-clamp(c,0.0,1.0))*(1.0-g) + max(c-1.0,0.0);
  return mix(r, mix(r,b,0.55), u_softness/100.0*u_amount/100.0);
}`,
    uniforms(u) { u.tex('u_blur', u.extra.tex); },
  };
  T.halation = {
    name: 'Halation', stage: 'optics', kind: 'spatial', icon: 'halo', desc: 'Roter Film-Glow um helle Kanten – wie Licht, das im Filmträger streut.',
    params: [P('amount', 'Stärke', 0, 100, 40), P('radius', 'Radius', 1, 100, 25), P('threshold', 'Schwelle', 0, 100, 65), P('hue', 'Farbton', 0, 60, 8, { track: 'hue', step: 1 })],
    pre: (e, cur, p) => e.blur(cur, 0.002 + (p.radius / 100) * 0.03, p.threshold / 100),
    glsl: `uniform sampler2D u_blur; uniform float u_amount,u_hue;
vec3 tool(vec3 c, vec2 uv){
  vec3 h = texture(u_blur, uv).rgb; vec3 tint = hsv2rgb(vec3(u_hue/360.0, 0.9, 1.0));
  return c + luma(h)*tint*(u_amount/100.0)*1.6*(1.0-clamp(luma(c),0.0,1.0)*0.5);
}`,
    uniforms(u) { u.tex('u_blur', u.extra.tex); },
  };
  T.vignette = {
    name: 'Vignette', stage: 'optics', kind: 'spatial', icon: 'vig', desc: 'Randabschattung oder -aufhellung, Form & Weichheit frei.',
    params: [P('amount', 'Stärke', -100, 100, -30), P('size', 'Größe', 0, 100, 50), P('roundness', 'Rundheit', -100, 100, 0), P('feather', 'Weiche', 0, 100, 60), P('cx', 'Mitte X', -50, 50, 0), P('cy', 'Mitte Y', -50, 50, 0)],
    glsl: `uniform float u_amount,u_size,u_roundness,u_feather,u_cx,u_cy;
vec3 tool(vec3 c, vec2 uv){
  vec2 p = uv-0.5-vec2(u_cx,u_cy)/100.0; float ar=uRes.x/uRes.y;
  float r01 = u_roundness/200.0+0.5; p.x *= mix(1.0, ar, r01); p.y *= 1.0;
  float d = length(p*2.0)/mix(1.4142, sqrt(ar*ar+1.0), r01)*1.4142;
  float mid = mix(0.45, 1.35, u_size/100.0); float fe = mix(0.05, 1.1, u_feather/100.0);
  float m = smoothstep(mid-fe*0.5, mid+fe*0.5, d); float a=u_amount/100.0;
  return a<0.0 ? c*(1.0+a*m) : c+(1.0-c)*a*m;
}`,
  };
  T.ca = {
    name: 'Chroma Aberration', stage: 'optics', kind: 'spatial', icon: 'ca', desc: 'Farbsäume zum Bildrand – Vintage-Objektiv-Charakter.',
    params: [P('amount', 'Stärke', 0, 100, 30), P('falloff', 'Zum Rand', 0, 100, 70)],
    glsl: `uniform float u_amount,u_falloff;
vec3 tool(vec3 c, vec2 uv){
  vec2 d=uv-0.5; float r=length(d*vec2(uRes.x/uRes.y,1.0)); float k=u_amount/100.0*0.008*mix(1.0, r*1.6, u_falloff/100.0);
  return vec3(texture(uSrc, 0.5+d*(1.0+k)).r, c.g, texture(uSrc, 0.5+d*(1.0-k)).b);
}`,
  };
  T.lens = {
    name: 'Lens Distortion', stage: 'optics', kind: 'spatial', icon: 'lens', desc: 'Tonnen- oder Kissenverzeichnung mit automatischem Zoom.',
    params: [P('amount', 'Verzeichnung', -100, 100, 15), P('zoom', 'Zoom-Ausgleich', 0, 100, 100)],
    glsl: `uniform float u_amount,u_zoom;
vec3 tool(vec3 c, vec2 uv){
  float ar=uRes.x/uRes.y; vec2 d=(uv-0.5)*vec2(ar,1.0); float k=u_amount/100.0*0.35; float r2=dot(d,d)/(0.25*(ar*ar+1.0));
  float z = 1.0+max(k,0.0)*u_zoom/100.0*0.9;
  vec2 q = d*(1.0+k*r2)/z; q.x/=ar; vec2 s=q+0.5;
  if(s.x<0.0||s.x>1.0||s.y<0.0||s.y>1.0) return vec3(0.0);
  return texture(uSrc, s).rgb;
}`,
  };
  T.gradient = {
    name: 'Gradient Filter', stage: 'optics', kind: 'spatial', icon: 'grad', desc: 'Verlaufsfilter wie ein Grauverlauf/Tint-Glas – z. B. Himmel abdunkeln.',
    params: [P('exposure', 'ND (Blenden)', -3, 3, -0.6, { step: 0.05 }), P('hue', 'Farbton', 0, 360, 210, { track: 'hue', step: 1 }), P('sat', 'Sättigung', 0, 100, 25), P('angle', 'Winkel', -180, 180, 90), P('position', 'Position', -100, 100, 10), P('softness', 'Weiche', 0, 100, 55)],
    glsl: `uniform float u_exposure,u_hue,u_sat,u_angle,u_position,u_softness;
vec3 tool(vec3 c, vec2 uv){
  float a=radians(u_angle); vec2 dir=vec2(cos(a),sin(a)); vec2 p=(uv-0.5)*vec2(uRes.x/uRes.y,1.0);
  float t=dot(p,dir)-u_position/100.0*0.5; float s=u_softness/100.0*0.6+0.01; float m=smoothstep(-s,s,t);
  vec3 tint=hsv2rgb(vec3(u_hue/360.0,u_sat/100.0,1.0)); tint/=max(luma(tint),0.05);
  vec3 l=pow(max(c,0.0),vec3(2.4)); l*=mix(vec3(1.0), tint*exp2(u_exposure), m);
  return pow(l, vec3(1.0/2.4));
}`,
  };

  // ================= 03 COLOR =================
  T.basic = {
    name: 'Basic Tone', stage: 'color', kind: 'color', icon: 'tone', desc: 'Belichtung, Kontrast, Lichter, Tiefen, Weiß, Schwarz, Dynamik.',
    params: [P('exposure', 'Belichtung', -5, 5, 0, { step: 0.05 }), P('contrast', 'Kontrast', -100, 100, 0), P('highlights', 'Lichter', -100, 100, 0), P('shadows', 'Tiefen', -100, 100, 0),
      P('whites', 'Weiß', -100, 100, 0), P('blacks', 'Schwarz', -100, 100, 0), P('saturation', 'Sättigung', 0, 200, 100), P('vibrance', 'Dynamik', -100, 100, 0)],
    actions: [{ id: 'autoTone', label: 'Auto' }],
    glsl: `uniform float u_exposure,u_contrast,u_highlights,u_shadows,u_whites,u_blacks,u_saturation,u_vibrance;
vec3 tool(vec3 c, vec2 uv){
  c = pow(pow(max(c,0.0),vec3(2.4))*exp2(u_exposure), vec3(1.0/2.4));
  float wp = 1.0 - u_whites/100.0*0.25; float bp = -u_blacks/100.0*0.08;
  c = (c-bp)/max(wp-bp,0.05);
  float L = luma(c);
  float hm = smoothstep(0.3, 1.0, L), sm = 1.0-smoothstep(0.0, 0.6, L);
  float dl = u_highlights/100.0*0.28*hm + u_shadows/100.0*0.28*sm;
  c = mix(c+dl, c*(L+dl)/max(L,1e-3), clamp(L*3.0,0.0,0.6));
  float k = 1.0+u_contrast/100.0*0.75; c = 0.435+(c-0.435)*k;
  L = luma(c); c = L+(c-L)*(u_saturation/100.0);
  float mx=max(c.r,max(c.g,c.b)), mn=min(c.r,min(c.g,c.b)); float s=clamp(mx-mn,0.0,1.0);
  float skin = 1.0-0.5*smoothstep(0.0,0.08,c.r-c.g)*smoothstep(0.0,0.08,c.g-c.b);
  c = L+(c-L)*(1.0+u_vibrance/100.0*(1.0-s)*skin);
  return c;
}`,
  };
  T.wheels = {
    name: 'Color Wheels', stage: 'color', kind: 'color', icon: 'wheel', desc: '4-Wege Farbräder: Lift, Gamma, Gain, Offset.',
    params: [{ id: 'w', type: 'wheels', def: { lift: { x: 0, y: 0, l: 0 }, gamma: { x: 0, y: 0, l: 0 }, gain: { x: 0, y: 0, l: 0 }, offset: { x: 0, y: 0, l: 0 } } }],
    glsl: `uniform vec3 u_lift,u_gamma,u_gain,u_offset;
vec3 tool(vec3 c, vec2 uv){
  c = c + u_offset*0.2;
  c = c + u_lift*0.3*(1.0-clamp(c,0.0,1.0));
  c = c * (1.0+u_gain*0.6);
  vec3 g = max(1.0+u_gamma*0.6, vec3(0.1));
  c = sign(c)*pow(abs(c), 1.0/g);
  return c;
}`,
    uniforms(u, p) { const w = p.w || {}; u.v3('u_lift', wheelVec(w.lift)); u.v3('u_gamma', wheelVec(w.gamma)); u.v3('u_gain', wheelVec(w.gain)); u.v3('u_offset', wheelVec(w.offset)); },
  };
  T.curves = {
    name: 'Curves', stage: 'color', kind: 'color', icon: 'curve', desc: 'RGB-Gradationskurven: Master + Rot/Grün/Blau.',
    params: [{ id: 'c', type: 'curves', def: { m: [[0, 0], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] } }],
    glsl: `uniform sampler2D u_curve;
float cv(float x,int ch){ vec4 t=texture(u_curve, vec2(clamp(x,0.0,1.0)*1023.0/1024.0+0.5/1024.0, 0.5)); float y=ch==0?t.r:ch==1?t.g:ch==2?t.b:t.a; return y + max(x-1.0,0.0); }
vec3 tool(vec3 c, vec2 uv){ c=vec3(cv(c.r,3),cv(c.g,3),cv(c.b,3)); return vec3(cv(c.r,0),cv(c.g,1),cv(c.b,2)); }`,
    uniforms(u, p) {
      const c = p.c || T.curves.params[0].def; const sig = JSON.stringify(c);
      u.tex('u_curve', u.engine.curveTex('curve:' + u.tool.uid, sig, () => {
        const f = ['r', 'g', 'b', 'm'].map((k) => monotone(sortPts(c[k]))); const d = new Float32Array(1024 * 4);
        for (let i = 0; i < 1024; i++) { const x = i / 1023; for (let ch = 0; ch < 4; ch++) d[i * 4 + ch] = Math.max(-0.2, Math.min(1.2, f[ch](x))); }
        return d;
      }));
    },
  };
  T.huecurves = {
    name: 'Hue Curves', stage: 'color', kind: 'color', icon: 'huecurve', desc: 'Farbton vs. Sättigung / Farbton / Luma und Luma vs. Sättigung.',
    params: [{ id: 'h', type: 'huecurves', def: { hs: [], hh: [], hl: [], ls: [] } }],
    glsl: `uniform sampler2D u_hc;
vec3 tool(vec3 c, vec2 uv){
  vec3 h = rgb2hsv(max(c,0.0)); float L=clamp(luma(c),0.0,1.0);
  vec4 a = texture(u_hc, vec2(h.x*1023.0/1024.0+0.5/1024.0,0.5)); vec4 b = texture(u_hc, vec2(L*1023.0/1024.0+0.5/1024.0,0.5));
  float w = smoothstep(0.0, 0.18, h.y);
  h.x = fract(h.x + (a.r-0.5)*0.5*w);
  h.y *= mix(1.0, a.g*2.0, w) * (b.a*2.0);
  vec3 r = hsv2rgb(h); r += (a.b-0.5)*0.6*w*h.y; return r;
}`,
    uniforms(u, p) {
      const h = p.h || {}; const sig = JSON.stringify(h);
      u.tex('u_hc', u.engine.curveTex('hue:' + u.tool.uid, sig, () => {
        const f = [periodic(h.hh || []), periodic(h.hs || []), periodic(h.hl || []), monotone(sortPts(h.ls?.length ? h.ls : [[0, 0.5], [1, 0.5]]))];
        const d = new Float32Array(1024 * 4);
        for (let i = 0; i < 1024; i++) { const x = i / 1023; for (let ch = 0; ch < 4; ch++) d[i * 4 + ch] = Math.max(0, Math.min(1, f[ch](x))); }
        return d;
      }));
    },
  };
  T.hsl = {
    name: 'HSL Mixer', stage: 'color', kind: 'color', icon: 'hsl', desc: 'Farbton, Sättigung & Luminanz für 8 Farbbereiche – wie im Raw-Entwickler.',
    params: HSL_BANDS.flatMap((b) => [P('h_' + b.id, b.label, -100, 100, 0, { group: 'Farbton', band: b }), P('s_' + b.id, b.label, -100, 100, 0, { group: 'Sättigung', band: b }), P('l_' + b.id, b.label, -100, 100, 0, { group: 'Luminanz', band: b })]),
    glsl: `uniform vec3 u_hsl[8];
const float HC[8] = float[8](0.0,30.0,60.0,120.0,180.0,225.0,275.0,315.0);
const float HW[8] = float[8](30.0,30.0,40.0,55.0,50.0,45.0,45.0,40.0);
vec3 tool(vec3 c, vec2 uv){
  vec3 h=rgb2hsv(max(c,0.0)); float deg=h.x*360.0; vec3 acc=vec3(0.0);
  for(int i=0;i<8;i++){ float d=abs(mod(deg-HC[i]+540.0,360.0)-180.0); float w=clamp(1.0-d/HW[i],0.0,1.0); w=w*w*(3.0-2.0*w); acc+=w*u_hsl[i]; }
  float sw=smoothstep(0.03,0.3,h.y);
  h.x=fract(h.x+acc.x/100.0*(30.0/360.0)*sw); h.y=max(0.0,h.y*(1.0+acc.y/100.0*sw));
  vec3 r=hsv2rgb(h); r*=exp2(acc.z/100.0*1.2*sw*smoothstep(0.0,0.5,h.y)); return r;
}`,
    uniforms(u, p) { const a = []; HSL_BANDS.forEach((b) => a.push(p['h_' + b.id] || 0, p['s_' + b.id] || 0, p['l_' + b.id] || 0)); u.v3('u_hsl[0]', new Float32Array(a)); },
  };
  T.grading = {
    name: 'Color Grading', stage: 'color', kind: 'color', icon: 'split', desc: 'Tiefen, Mitten & Lichter einfärben – Split-Toning mit Balance & Überblendung.',
    params: [P('sh_h', 'Tiefen Farbton', 0, 360, 200, { track: 'hue', group: 'Tiefen' }), P('sh_s', 'Tiefen Sättigung', 0, 100, 0, { group: 'Tiefen' }), P('sh_l', 'Tiefen Luminanz', -100, 100, 0, { group: 'Tiefen' }),
      P('md_h', 'Mitten Farbton', 0, 360, 30, { track: 'hue', group: 'Mitten' }), P('md_s', 'Mitten Sättigung', 0, 100, 0, { group: 'Mitten' }), P('md_l', 'Mitten Luminanz', -100, 100, 0, { group: 'Mitten' }),
      P('hi_h', 'Lichter Farbton', 0, 360, 40, { track: 'hue', group: 'Lichter' }), P('hi_s', 'Lichter Sättigung', 0, 100, 0, { group: 'Lichter' }), P('hi_l', 'Lichter Luminanz', -100, 100, 0, { group: 'Lichter' }),
      P('balance', 'Balance', -100, 100, 0, { group: 'Global' }), P('blending', 'Überblendung', 0, 100, 50, { group: 'Global' })],
    glsl: `uniform float u_sh_h,u_sh_s,u_sh_l,u_md_h,u_md_s,u_md_l,u_hi_h,u_hi_s,u_hi_l,u_balance,u_blending;
vec3 tool(vec3 c, vec2 uv){
  float L=clamp(luma(c),0.0,1.0); float p=0.5-u_balance/100.0*0.3; float w=0.18+u_blending/100.0*0.35;
  float ws=1.0-smoothstep(p-w, p+w*0.3, L); float wh=smoothstep(p-w*0.3, p+w, L); float wm=clamp(1.0-ws-wh,0.0,1.0);
  c += hueTint(u_sh_h)*u_sh_s/100.0*0.4*ws + hueTint(u_md_h)*u_md_s/100.0*0.32*wm + hueTint(u_hi_h)*u_hi_s/100.0*0.32*wh;
  c += (u_sh_l*ws + u_md_l*wm + u_hi_l*wh)/100.0*0.22;
  return c;
}`,
  };
  T.bw = {
    name: 'Black & White', stage: 'color', kind: 'color', icon: 'bw', desc: 'Schwarzweiß mit Farbfilter-Mischung und Toning.',
    params: [P('reds', 'Rot', -100, 100, 20), P('yellows', 'Gelb', -100, 100, 15), P('greens', 'Grün', -100, 100, -10), P('cyans', 'Cyan', -100, 100, -10), P('blues', 'Blau', -100, 100, -25), P('magentas', 'Magenta', -100, 100, 10),
      P('tint_h', 'Toning Farbton', 0, 360, 35, { track: 'hue' }), P('tint_s', 'Toning Stärke', 0, 100, 0)],
    glsl: `uniform float u_reds,u_yellows,u_greens,u_cyans,u_blues,u_magentas,u_tint_h,u_tint_s;
vec3 tool(vec3 c, vec2 uv){
  vec3 h=rgb2hsv(max(c,0.0)); float deg=h.x*360.0; float v[6]=float[6](u_reds,u_yellows,u_greens,u_cyans,u_blues,u_magentas); float f=0.0;
  for(int i=0;i<6;i++){ float d=abs(mod(deg-float(i)*60.0+540.0,360.0)-180.0); f+=clamp(1.0-d/60.0,0.0,1.0)*v[i]; }
  float g=luma(c)*(1.0+f/100.0*h.y*0.9); vec3 r=vec3(g);
  float L=clamp(g,0.0,1.0); r += hueTint(u_tint_h)*u_tint_s/100.0*0.25*(4.0*L*(1.0-L)+0.2);
  return r;
}`,
  };

  // ================= 04 FILM =================
  T.film = {
    name: 'Film Stock', stage: 'film', kind: 'color', icon: 'film', desc: 'Filmische Gradation, Crossover & Farbcharakter (eigene UB-Emulationen).',
    params: [{ id: 'stock', label: 'Film', type: 'select', def: 'ub250d', options: FILM_STOCKS.map((s) => ({ value: s.value, label: s.label })) }, P('warmth', 'Wärme', -100, 100, 0, { track: 'temp' })],
    glsl: `uniform vec3 u_g,u_st,u_ht; uniform float u_k,u_toe,u_sh,u_sat,u_warmth;
float sc(float x,float k){ x=clamp(x,0.0,1.0); return x<0.5 ? 0.5*pow(2.0*x,k) : 1.0-0.5*pow(2.0-2.0*x,k); }
vec3 tool(vec3 c, vec2 uv){
  vec3 x=pow(max(c,0.0), u_g);
  vec3 y=vec3(sc(x.r,u_k),sc(x.g,u_k),sc(x.b,u_k)) + max(c-1.0,0.0)*0.3;
  y = u_toe + (1.0-u_toe-u_sh)*y;
  float L=clamp(luma(y),0.0,1.0); y += u_st*(1.0-L)*(1.0-L)*2.0 + u_ht*L*L*1.6;
  y += vec3(u_warmth,0.0,-u_warmth)/100.0*0.05;
  L=luma(y); return L+(y-L)*u_sat;
}`,
    uniforms(u, p) { const s = FILM_STOCKS.find((x) => x.value === p.stock) || FILM_STOCKS[0]; u.v3('u_g', s.g); u.v3('u_st', s.st); u.v3('u_ht', s.ht); u.f('u_k', s.k); u.f('u_toe', s.toe); u.f('u_sh', s.sh); u.f('u_sat', s.sat); },
  };
  T.lut = {
    name: 'Creative LUT', stage: 'film', kind: 'color', icon: 'lut', desc: 'Beliebige 3D .cube LUT laden (Kamera-, Look- oder Show-LUT). Wird im .ubgrade mitgespeichert.',
    params: [{ id: 'lut', type: 'lut', def: null }],
    actions: [{ id: 'loadLut', label: '.cube laden' }],
    glsl: `uniform sampler3D u_lut; uniform float u_n, u_has; uniform vec3 u_min, u_max;
vec3 tool(vec3 c, vec2 uv){
  if(u_has<0.5) return c; vec3 t=clamp((c-u_min)/(u_max-u_min),0.0,1.0);
  return texture(u_lut, t*(u_n-1.0)/u_n + 0.5/u_n).rgb;
}`,
    uniforms(u, p) {
      const L = p.lut && UB.lutStore && UB.lutStore.get(p.lut.id);
      const e = L ? u.engine.loadLut(p.lut.id, L) : null;
      u.tex3('u_lut', e ? e.tex : u.engine.blankLut); u.f('u_has', e ? 1 : 0); u.f('u_n', e ? e.size : 2);
      u.v3('u_min', e ? e.min : [0, 0, 0]); u.v3('u_max', e ? e.max : [1, 1, 1]);
    },
  };
  T.fade = {
    name: 'Fade', stage: 'film', kind: 'color', icon: 'fade', desc: 'Matte Schwarzwerte & weiche Lichter – der Print-Look.',
    params: [P('amount', 'Matte Schwarz', 0, 100, 30), P('roll', 'Lichter abrunden', 0, 100, 20), P('tint_h', 'Tint Farbton', 0, 360, 220, { track: 'hue' }), P('tint_s', 'Tint Stärke', 0, 100, 15)],
    glsl: `uniform float u_amount,u_roll,u_tint_h,u_tint_s;
vec3 tool(vec3 c, vec2 uv){
  float f=u_amount/100.0*0.16, r=u_roll/100.0*0.14; vec3 t=hueTint(u_tint_h)*u_tint_s/100.0*0.25;
  return f + t*f*4.0 + c*(1.0-f-r);
}`,
  };
  T.bleach = {
    name: 'Bleach Bypass', stage: 'film', kind: 'color', icon: 'bleach', desc: 'Silberretention: hoher Kontrast, entsättigt, metallisch.',
    params: [P('contrast', 'Kontrast', 0, 100, 60), P('desat', 'Entsättigung', 0, 100, 55)],
    glsl: `uniform float u_contrast,u_desat;
vec3 tool(vec3 c, vec2 uv){
  float L=clamp(luma(c),0.0,1.0); vec3 x=clamp(c,0.0,1.0);
  vec3 ov = mix(2.0*x*L, 1.0-2.0*(1.0-x)*(1.0-L), step(0.5,L));
  vec3 r = mix(x, ov, u_contrast/100.0); float l2=luma(r); return mix(r, vec3(l2), u_desat/100.0*0.85);
}`,
  };
  T.grain = {
    name: 'Grain', stage: 'film', kind: 'spatial', icon: 'grain', desc: 'Organisches Filmkorn – auflösungsunabhängig, animiert, tonwertabhängig.',
    params: [P('amount', 'Stärke', 0, 100, 25), P('size', 'Korngröße', 50, 400, 110), P('color', 'Farbkorn', 0, 100, 20), P('response', 'Mitten-Betonung', 0, 100, 60), { id: 'animate', label: 'Animiert', type: 'toggle', def: true }],
    glsl: `uniform float u_amount,u_size,u_color,u_response,u_animate;
vec3 tool(vec3 c, vec2 uv){
  float s=max(0.35, u_size/100.0*(uRes.y/1080.0)); vec2 p=uv*uRes/s; float t=u_animate>0.5?floor(uTime*24.0):0.0; vec2 o=vec2(t*17.13,t*31.7);
  float n=(ub_vnoise(p+o)+ub_vnoise(p*2.1+o+7.0)*0.6)/1.6-0.5;
  vec3 nc=vec3(ub_vnoise(p+o+13.1),ub_vnoise(p+o+29.7),ub_vnoise(p+o+41.3))-0.5;
  vec3 N=mix(vec3(n), nc, u_color/100.0);
  float L=clamp(luma(c),0.0,1.0); float resp=mix(1.0, 4.0*L*(1.0-L)*1.1+0.12, u_response/100.0);
  return c + N*(u_amount/100.0)*0.32*resp;
}`,
  };

  // ================= 05 FINISH =================
  T.sharpen = {
    name: 'Sharpen', stage: 'finish', kind: 'spatial', icon: 'sharp', desc: 'Unscharf-Maskieren – auflösungsunabhängig.',
    params: [P('amount', 'Stärke', 0, 100, 30), P('radius', 'Radius', 0.5, 3, 1, { step: 0.05 })],
    glsl: `uniform float u_amount,u_radius;
vec3 tool(vec3 c, vec2 uv){
  vec2 px=u_radius*(uRes.y/1080.0)/uRes; vec3 b=(texture(uSrc,uv+vec2(px.x,0)).rgb+texture(uSrc,uv-vec2(px.x,0)).rgb+texture(uSrc,uv+vec2(0,px.y)).rgb+texture(uSrc,uv-vec2(0,px.y)).rgb)*0.25;
  vec3 d=c-b; float dl=luma(d); return c + vec3(dl)*u_amount/100.0*2.2;
}`,
  };
  T.clarity = {
    name: 'Clarity & Dehaze', stage: 'finish', kind: 'spatial', icon: 'clarity', desc: 'Lokaler Kontrast (Klarheit) und Dunst entfernen.',
    params: [P('clarity', 'Klarheit', -100, 100, 25), P('dehaze', 'Dunst entfernen', -100, 100, 0)],
    pre: (e, cur) => e.blur(cur, 0.018),
    glsl: `uniform sampler2D u_blur; uniform float u_clarity,u_dehaze;
vec3 tool(vec3 c, vec2 uv){
  vec3 b=texture(u_blur,uv).rgb; float L=clamp(luma(c),0.0,1.0); float mid=1.0-pow(abs(2.0*L-1.0),2.0);
  c += vec3(luma(c)-luma(b))*u_clarity/100.0*1.1*mid;
  float d=u_dehaze/100.0;
  if(d>0.0){ float haze=min(b.r,min(b.g,b.b))*d*0.65; c=(c-haze)/max(1.0-haze,0.35); float l=luma(c); c=l+(c-l)*(1.0+d*0.25); }
  else { c=mix(c, vec3(0.75), -d*0.3); }
  return c;
}`,
    uniforms(u) { u.tex('u_blur', u.extra.tex); },
  };
  T.letterbox = {
    name: 'Letterbox', stage: 'finish', kind: 'spatial', icon: 'box', desc: 'Kino-Balken in gängigen Seitenverhältnissen.',
    params: [{ id: 'ratio', label: 'Format', type: 'select', def: 2.39, options: LETTERBOX }, P('opacity', 'Deckkraft', 0, 100, 100)],
    glsl: `uniform float u_r,u_opacity;
vec3 tool(vec3 c, vec2 uv){ float ar=uRes.x/uRes.y; float m=0.0;
  if(u_r>ar){ m=step(0.5*ar/u_r, abs(uv.y-0.5)); } else { m=step(0.5*u_r/ar, abs(uv.x-0.5)); }
  return mix(c, vec3(0.0), m*u_opacity/100.0); }`,
    uniforms(u, p) { u.f('u_r', +p.ratio || 2.39); },
  };

  UB.TOOLS = T;
  UB.FILM_STOCKS = FILM_STOCKS;

  // ---------- instance helpers ----------
  let uidc = 0;
  UB.uid = () => 't' + Date.now().toString(36) + (uidc++).toString(36);
  UB.defaults = function (type) {
    const def = T[type]; const p = {};
    for (const pd of def.params || []) p[pd.id] = pd.def && typeof pd.def === 'object' ? JSON.parse(JSON.stringify(pd.def)) : pd.def;
    return p;
  };
  UB.makeTool = function (type, params, strength) {
    const p = Object.assign(UB.defaults(type), params ? JSON.parse(JSON.stringify(params)) : {});
    return { uid: UB.uid(), type, on: true, strength: strength == null ? 1 : strength, params: p };
  };
  UB.stageIndex = (type) => UB.STAGES.findIndex((s) => s.id === T[type].stage);
  UB.sortChain = (chain) => chain.map((t, i) => [t, i]).sort((a, b) => UB.stageIndex(a[0].type) - UB.stageIndex(b[0].type) || a[1] - b[1]).map((x) => x[0]);
  UB.isDefault = function (tool) {
    const d = UB.defaults(tool.type); return JSON.stringify(d) === JSON.stringify(tool.params);
  };
})(window.UB = window.UB || {});
