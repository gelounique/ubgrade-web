/* UBGrade by gelounique — Color science
 * Camera log curves + gamut matrices, implemented from the manufacturers'
 * published white-paper formulas (no third-party LUT files are bundled).
 */
(function (UB) {
  'use strict';

  // xy chromaticities (all D65 white unless noted)
  const PRIM = {
    rec709:  [[0.640, 0.330], [0.300, 0.600], [0.150, 0.060]],
    rec2020: [[0.708, 0.292], [0.170, 0.797], [0.131, 0.046]],
    awg3:    [[0.6840, 0.3130], [0.2210, 0.8480], [0.0861, -0.1020]],
    awg4:    [[0.7347, 0.2653], [0.1424, 0.8576], [0.0991, -0.0308]],
    rwg:     [[0.780308, 0.304253], [0.121595, 1.493994], [0.095612, -0.084589]],
    sg3c:    [[0.766, 0.275], [0.225, 0.800], [0.089, -0.087]],
    sg3:     [[0.730, 0.280], [0.140, 0.855], [0.100, -0.050]],
    cinema:  [[0.740, 0.270], [0.170, 1.140], [0.080, -0.100]],
    vgamut:  [[0.730, 0.280], [0.165, 0.840], [0.100, -0.030]],
    bmdwg5:  [[0.7177, 0.3171], [0.2280, 0.8616], [0.1006, -0.0820]],
    dgamut:  [[0.71, 0.31], [0.21, 0.88], [0.09, -0.08]],
  };
  const D65 = [0.3127, 0.3290];

  function inv3(m) {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
            B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
            C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
  }
  function mul3(m, n) {
    const r = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      r[i * 3 + j] = m[i * 3] * n[j] + m[i * 3 + 1] * n[3 + j] + m[i * 3 + 2] * n[6 + j];
    return r;
  }
  function rgb2xyz(p, w = D65) {
    const xyz = (x, y) => [x / y, 1, (1 - x - y) / y];
    const [R, G, B] = p.map(([x, y]) => xyz(x, y));
    const M = [R[0], G[0], B[0], R[1], G[1], B[1], R[2], G[2], B[2]];
    const W = xyz(w[0], w[1]);
    const Mi = inv3(M);
    const S = [Mi[0] * W[0] + Mi[1] * W[1] + Mi[2] * W[2],
               Mi[3] * W[0] + Mi[4] * W[1] + Mi[5] * W[2],
               Mi[6] * W[0] + Mi[7] * W[1] + Mi[8] * W[2]];
    return [M[0] * S[0], M[1] * S[1], M[2] * S[2], M[3] * S[0], M[4] * S[1], M[5] * S[2], M[6] * S[0], M[7] * S[1], M[8] * S[2]];
  }
  const XYZ_TO_709 = inv3(rgb2xyz(PRIM.rec709));
  function gamutTo709(name) {
    if (!PRIM[name] || name === 'rec709') return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    return mul3(XYZ_TO_709, rgb2xyz(PRIM[name]));
  }
  // row-major → column-major for GLSL mat3
  function toGL(m) { return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]); }

  // id → curve index in GLSL, gamut
  const PROFILES = [
    { id: 'none',     label: 'Rec.709 / sRGB (kein Log)', curve: 0,  gamut: 'rec709' },
    { id: 'logc3',    label: 'ARRI LogC3 · AWG3',          curve: 1,  gamut: 'awg3' },
    { id: 'logc4',    label: 'ARRI LogC4 · AWG4',          curve: 2,  gamut: 'awg4' },
    { id: 'log3g10',  label: 'RED Log3G10 · REDWideGamut', curve: 3,  gamut: 'rwg' },
    { id: 'slog3c',   label: 'Sony S-Log3 · S-Gamut3.Cine',curve: 4,  gamut: 'sg3c' },
    { id: 'slog3',    label: 'Sony S-Log3 · S-Gamut3',     curve: 4,  gamut: 'sg3' },
    { id: 'clog3',    label: 'Canon Log 3 · Cinema Gamut', curve: 5,  gamut: 'cinema' },
    { id: 'clog2',    label: 'Canon Log 2 · Cinema Gamut', curve: 6,  gamut: 'cinema' },
    { id: 'vlog',     label: 'Panasonic V-Log · V-Gamut',  curve: 7,  gamut: 'vgamut' },
    { id: 'flog',     label: 'Fujifilm F-Log · F-Gamut',   curve: 8,  gamut: 'rec2020' },
    { id: 'flog2',    label: 'Fujifilm F-Log2 · F-Gamut',  curve: 9,  gamut: 'rec2020' },
    { id: 'bmdfilm5', label: 'Blackmagic Film Gen5 · WG',  curve: 10, gamut: 'bmdwg5' },
    { id: 'nlog',     label: 'Nikon N-Log · Rec.2020',     curve: 11, gamut: 'rec2020' },
    { id: 'dlog',     label: 'DJI D-Log · D-Gamut',        curve: 12, gamut: 'dgamut' },
    { id: 'applelog', label: 'Apple Log (iPhone) · Rec.2020', curve: 13, gamut: 'rec2020' },
    { id: 'protune',  label: 'GoPro Protune Flat',         curve: 14, gamut: 'rec709' },
  ];

  const GLSL = /* glsl */`
float ub_log10i(float x){ return pow(10.0, x); }
float ub_decode(float x, int k){
  if(k==1){ // ARRI LogC3 EI800
    return x > 0.1496582 ? (pow(10.0,(x-0.385537)/0.247190)-0.052272)/5.555556 : (x-0.092809)/5.367655; }
  if(k==2){ // ARRI LogC4
    float a=(pow(2.0,18.0)-16.0)/117.45, b=(1023.0-95.0)/1023.0, c=95.0/1023.0;
    float s=(7.0*log(2.0)*pow(2.0,7.0-14.0*c/b))/(a*b), t=(pow(2.0,14.0*(-c/b)+6.0)-64.0)/a;
    return x>=0.0 ? (pow(2.0,14.0*(x-c)/b+6.0)-64.0)/a : x*s+t; }
  if(k==3){ // RED Log3G10 (v3)
    float y = x<0.0 ? x/15.1927 : (pow(10.0,x/0.224282)-1.0)/155.975327; return y-0.01; }
  if(k==4){ // Sony S-Log3
    return x>=171.2102946929/1023.0 ? pow(10.0,(x*1023.0-420.0)/261.5)*(0.18+0.01)-0.01 : (x*1023.0-95.0)*0.01125/(171.2102946929-95.0); }
  if(k==5){ // Canon Log 3
    float y;
    if(x<0.097465473) y=-(pow(10.0,(0.12783901-x)/0.36726845)-1.0)/14.98325;
    else if(x<=0.15277891) y=(x-0.12512219)/1.9754798;
    else y=(pow(10.0,(x-0.12240537)/0.36726845)-1.0)/14.98325;
    return y*0.9; }
  if(k==6){ // Canon Log 2
    float y = x<0.092864125 ? -(pow(10.0,(0.092864125-x)/0.24136077)-1.0)/87.09937546 : (pow(10.0,(x-0.092864125)/0.24136077)-1.0)/87.09937546;
    return y*0.9; }
  if(k==7){ // Panasonic V-Log
    return x<0.181 ? (x-0.125)/5.6 : pow(10.0,(x-0.598206)/0.241514)-0.00873; }
  if(k==8){ // Fujifilm F-Log
    return x>=0.100537775223865 ? (pow(10.0,(x-0.790453)/0.344676)-0.009468)/0.555556 : (x-0.092864)/8.735631; }
  if(k==9){ // Fujifilm F-Log2
    return x>=0.100686685370811 ? (pow(10.0,(x-0.384316)/0.245281)-0.064829)/5.555556 : (x-0.092864)/8.799461; }
  if(k==10){ // Blackmagic Film Gen5
    float A=0.08692876065491224,B=0.005494072432257808,C=0.5300133392291939,D=8.283605932402494,E=0.09246575342465753;
    float logCut=D*0.005+E; return x<logCut ? (x-E)/D : exp((x-C)/A)-B; }
  if(k==11){ // Nikon N-Log
    return x<452.0/1023.0 ? pow(x/(650.0/1023.0),3.0)-0.0075 : exp((x-619.0/1023.0)/(150.0/1023.0)); }
  if(k==12){ // DJI D-Log
    return x<=0.14 ? (x-0.0929)/6.025 : (pow(10.0,3.89616*x-2.27752)-0.0108)/0.9892; }
  if(k==13){ // Apple Log
    float R0=-0.05641088, Rt=0.01, c=47.28711236, b=0.00964052, g=0.08550479, be=0.69336945;
    float Pt=c*(Rt-R0)*(Rt-R0);
    return x>=Pt ? pow(2.0,(x-be)/g)-b : (x>0.0 ? sqrt(x/c)+R0 : R0); }
  if(k==14){ // GoPro Protune
    return (pow(113.0,x)-1.0)/112.0; }
  return x;
}
vec3 ub_decode3(vec3 c, int k){ return vec3(ub_decode(c.r,k),ub_decode(c.g,k),ub_decode(c.b,k)); }
vec3 ub_tonemap(vec3 x, int mode){
  x = max(x, vec3(0.0));
  if(mode==0){ // UB Filmic (fitted ACES-style curve)
    x *= 0.6;
    x = clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0);
    return pow(x, vec3(1.0/2.4));
  }
  if(mode==1){ // Rec.709 OETF with soft highlight knee
    vec3 y = mix(4.5*x, 1.099*pow(x,vec3(0.45))-0.099, step(0.018,x));
    vec3 k = 0.85 + 0.15*(1.0-exp(-(y-0.85)/0.15));
    return mix(y, k, step(0.85,y));
  }
  return pow(clamp(x,0.0,1.0), vec3(1.0/2.4));
}
`;

  UB.Color = { PRIM, PROFILES, GLSL, gamutTo709, toGL, inv3, mul3 };
})(window.UB = window.UB || {});
