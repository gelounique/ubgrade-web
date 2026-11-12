/* UBGrade by gelounique — GPU render engine (WebGL2, 16-bit float pipeline)
 * © Gelo Santino Mares · uniquebaby.de
 */
(function (UB) {
  'use strict';

  const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }`;

  const PRELUDE = `#version 300 es
precision highp float; precision highp int; precision highp sampler3D;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uRes; uniform float uAmt; uniform float uTime;
float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec3 rgb2hsv(vec3 c){
  vec4 K=vec4(0.0,-1.0/3.0,2.0/3.0,-1.0);
  vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));
  vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));
  float d=q.x-min(q.w,q.y); float e=1.0e-10;
  return vec3(abs(q.z+(q.w-q.y)/(6.0*d+e)), d/(q.x+e), q.x);
}
vec3 hsv2rgb(vec3 c){
  vec3 p=abs(fract(c.xxx+vec3(0.0,2.0/3.0,1.0/3.0))*6.0-3.0);
  return c.z*mix(vec3(1.0),clamp(p-1.0,0.0,1.0),c.y);
}
vec3 hueTint(float deg){ vec3 t=hsv2rgb(vec3(fract(deg/360.0),1.0,1.0)); return t-luma(t); }
float ub_hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float ub_vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(ub_hash(i),ub_hash(i+vec2(1,0)),f.x), mix(ub_hash(i+vec2(0,1)),ub_hash(i+vec2(1,1)),f.x), f.y); }
`;
  const MAIN = `
void main(){ vec4 s = texture(uSrc, vUv); vec3 r = tool(s.rgb, vUv); o = vec4(mix(s.rgb, r, uAmt), 1.0); }`;

  const SH_COPY = PRELUDE + `uniform float uFlip; void main(){ vec2 uv = vUv; if(uFlip>0.5) uv.y = 1.0-uv.y; o = vec4(texture(uSrc, uv).rgb, 1.0); }`;
  const SH_DOWN = PRELUDE + `uniform vec2 uTexel; uniform float uThr;
void main(){
  vec3 c = texture(uSrc, vUv+uTexel*vec2(-0.5,-0.5)).rgb + texture(uSrc, vUv+uTexel*vec2(0.5,-0.5)).rgb
         + texture(uSrc, vUv+uTexel*vec2(-0.5,0.5)).rgb + texture(uSrc, vUv+uTexel*vec2(0.5,0.5)).rgb;
  c *= 0.25;
  if(uThr >= 0.0){ float L=luma(c); float k=smoothstep(uThr, min(uThr+0.25,1.0), L); c = c*k; }
  o = vec4(c,1.0);
}`;
  const SH_GAUSS = PRELUDE + `uniform vec2 uDir; uniform float uSigma;
void main(){
  float s2 = 2.0*uSigma*uSigma; vec3 acc=vec3(0.0); float wsum=0.0; int R=int(min(ceil(uSigma*3.0),40.0));
  for(int i=-40;i<=40;i++){ if(i<-R||i>R) continue; float fi=float(i); float w=exp(-fi*fi/s2);
    acc += texture(uSrc, vUv + uDir*fi).rgb*w; wsum+=w; }
  o = vec4(acc/wsum, 1.0);
}`;
  const SH_MIX = PRELUDE + `uniform sampler2D uB; void main(){ vec3 a=texture(uSrc,vUv).rgb, b=texture(uB,vUv).rgb; o=vec4(mix(a,b,uAmt),1.0); }`;
  const SH_PRESENT = PRELUDE + `uniform sampler2D uOrig, uBase; uniform float uSplit, uMode, uDither, uBefore;
void main(){
  vec3 f = texture(uSrc, vUv).rgb; vec3 b = texture(uBase, vUv).rgb;
  vec3 c = mix(b, f, uAmt);
  if(uBefore > 0.5 || (uSplit >= 0.0 && vUv.x < uSplit)) c = texture(uOrig, vUv).rgb;
  if(uMode > 0.5 && uMode < 1.5){ // false color
    float L = clamp(luma(c),0.0,1.0); vec3 g = vec3(L*0.85);
    if(L<0.02) g=vec3(0.45,0.1,0.65); else if(L<0.10) g=vec3(0.15,0.35,1.0);
    else if(L>0.38&&L<0.46) g=vec3(0.25,0.85,0.35); else if(L>0.54&&L<0.64) g=vec3(1.0,0.6,0.78);
    else if(L>0.97) g=vec3(1.0,0.15,0.15); else if(L>0.92) g=vec3(1.0,0.9,0.2);
    c = g;
  } else if(uMode > 1.5){ // zebra
    float L = luma(c); float st = step(0.5, fract((gl_FragCoord.x+gl_FragCoord.y)/12.0));
    if(L>0.95) c = mix(c, vec3(1.0,0.71,0.84), st*0.85);
  }
  if(uDither > 0.5){ c += (ub_hash(gl_FragCoord.xy+fract(uTime)*91.0)-0.5)/255.0; }
  o = vec4(clamp(c,0.0,1.0), 1.0);
}`;

  class Engine {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: false });
      if (!gl) throw new Error('WebGL2 wird von diesem System nicht unterstützt.');
      this.gl = gl;
      this.float = !!gl.getExtension('EXT_color_buffer_float');
      gl.getExtension('OES_texture_float_linear');
      this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      this.IF = this.float ? gl.RGBA16F : gl.RGBA8;
      this.TY = this.float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.progs = {}; this.pool = {}; this.frame = [];
      this.luts = {}; this.dataTex = {};
      this.srcTex = null; this.srcW = 0; this.srcH = 0;
      this.time = 0;
      this.p = {
        copy: this._prog('copy', SH_COPY), down: this._prog('down', SH_DOWN), gauss: this._prog('gauss', SH_GAUSS),
        mix: this._prog('mix', SH_MIX), present: this._prog('present', SH_PRESENT),
      };
      this.blankLut = this._make3D(2, new Float32Array([0,0,0,1, 1,0,0,1, 0,1,0,1, 1,1,0,1, 0,0,1,1, 1,0,1,1, 0,1,1,1, 1,1,1,1]));
      this.blank2D = this._dataTex2D('blank', 2, new Float32Array(8).fill(0.5));
    }

    // ---------- GL helpers ----------
    _prog(key, fs) {
      const gl = this.gl;
      const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); console.error(key, log, src); throw new Error('Shader ' + key + ': ' + log); } return s; };
      const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link ' + key + ': ' + gl.getProgramInfoLog(p));
      const locs = {}; const prog = { p, loc: (n) => (n in locs ? locs[n] : (locs[n] = gl.getUniformLocation(p, n))), unit: 0 };
      return prog;
    }
    toolProg(type) {
      if (this.progs[type]) return this.progs[type];
      const def = UB.TOOLS[type];
      const fs = PRELUDE + (def.needsColor ? UB.Color.GLSL : '') + def.glsl + (def.customMain ? '' : MAIN);
      return (this.progs[type] = this._prog(type, fs));
    }
    _tex(w, h, internal, format, type, data, filter) {
      const gl = this.gl; gl.activeTexture(gl.TEXTURE15); const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data || null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    target(w, h, bytes) {
      const key = w + 'x' + h + (bytes ? 'b' : 'f');
      const list = this.pool[key] || (this.pool[key] = []);
      let t = list.pop();
      if (!t) {
        const gl = this.gl;
        const tex = bytes ? this._tex(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE) : this._tex(w, h, this.IF, gl.RGBA, this.TY);
        const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        t = { tex, fb, w, h, key };
      }
      this.frame.push(t);
      return t;
    }
    release(t) { if (!t || t.ext) return; const i = this.frame.indexOf(t); if (i >= 0) this.frame.splice(i, 1); (this.pool[t.key] = this.pool[t.key] || []).push(t); }
    releaseFrame() { for (const t of this.frame) (this.pool[t.key] = this.pool[t.key] || []).push(t); this.frame = []; }
    trimPool() { const gl = this.gl; for (const k in this.pool) { for (const t of this.pool[k]) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); } } this.pool = {}; }

    _use(prog, out, w, h) {
      const gl = this.gl; gl.useProgram(prog.p); prog.unit = 0;
      gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null); gl.viewport(0, 0, w, h);
      gl.uniform2f(prog.loc('uRes'), w, h); gl.uniform1f(prog.loc('uTime'), this.time);
    }
    _bind(prog, name, tex, is3D) {
      const gl = this.gl; const u = prog.unit++; gl.activeTexture(gl.TEXTURE0 + u);
      gl.bindTexture(is3D ? gl.TEXTURE_3D : gl.TEXTURE_2D, tex); gl.uniform1i(prog.loc(name), u);
    }
    _draw() { const gl = this.gl; gl.bindVertexArray(this.vao); gl.drawArrays(gl.TRIANGLES, 0, 3); }

    // ---------- Sources ----------
    setSource(el) {
      const gl = this.gl;
      const w = el.videoWidth || el.naturalWidth || el.width, h = el.videoHeight || el.naturalHeight || el.height;
      if (!w || !h) return false;
      // ImageBitmap uploads ignore UNPACK_FLIP_Y → flip in the copy pass instead
      this.srcFlip = (typeof ImageBitmap !== 'undefined' && el instanceof ImageBitmap);
      if (!this.srcTex || this.srcW !== w || this.srcH !== h || this.srcIsData) {
        if (this.srcTex) gl.deleteTexture(this.srcTex);
        this.srcTex = gl.createTexture(); this.srcW = w; this.srcH = h; this.srcIsData = false;
      }
      gl.activeTexture(gl.TEXTURE15); gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, el);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return true;
    }
    hasSource() { return !!this.srcTex; }

    _dataTex2D(key, w, data) { // RGBA float data → RGBA16F texture (cached by key)
      const gl = this.gl; let e = this.dataTex[key];
      if (!e) { e = this.dataTex[key] = { tex: this._tex(w, 1, gl.RGBA16F, gl.RGBA, gl.FLOAT, data) }; }
      else { gl.activeTexture(gl.TEXTURE15); gl.bindTexture(gl.TEXTURE_2D, e.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, 1, 0, gl.RGBA, gl.FLOAT, data); }
      return e.tex;
    }
    curveTex(key, sig, build) { // sig = change signature
      const e = this.dataTex[key];
      if (e && e.sig === sig) return e.tex;
      const tex = this._dataTex2D(key, 1024, build()); this.dataTex[key].sig = sig; return tex;
    }
    _make3D(n, rgba) {
      const gl = this.gl; gl.activeTexture(gl.TEXTURE15); const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_3D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA16F, n, n, n, 0, gl.RGBA, gl.FLOAT, rgba);
      for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_3D, p, gl.LINEAR);
      for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, p, gl.CLAMP_TO_EDGE);
      return t;
    }
    loadLut(id, cube) { // cube = {size, data(Float32 rgb), min, max}
      if (this.luts[id]) return this.luts[id];
      const n = cube.size, rgba = new Float32Array(n * n * n * 4);
      for (let i = 0; i < n * n * n; i++) { rgba[i * 4] = cube.data[i * 3]; rgba[i * 4 + 1] = cube.data[i * 3 + 1]; rgba[i * 4 + 2] = cube.data[i * 3 + 2]; rgba[i * 4 + 3] = 1; }
      return (this.luts[id] = { tex: this._make3D(n, rgba), size: n, min: cube.min || [0, 0, 0], max: cube.max || [1, 1, 1] });
    }

    // ---------- Building blocks ----------
    copy(srcTex, w, h, flip) {
      const t = this.target(w, h); const p = this.p.copy; this._use(p, t, w, h); this._bind(p, 'uSrc', srcTex); this.gl.uniform1f(p.loc('uFlip'), flip ? 1 : 0); this._draw(); return t;
    }
    blur(src, radiusFrac, threshold) {
      // src: target {tex,w,h}. radiusFrac: sigma relative to image height.
      let sigma = Math.max(0.5, radiusFrac * src.h);
      let cur = src, scale = 1, first = true;
      const temps = [];
      while ((sigma / scale > 3 && cur.w > 24 && cur.h > 24) || (first && threshold >= 0)) {
        const nw = Math.max(1, Math.ceil(cur.w / 2)), nh = Math.max(1, Math.ceil(cur.h / 2));
        const t = this.target(nw, nh); const p = this.p.down; this._use(p, t, nw, nh);
        this._bind(p, 'uSrc', cur.tex); gl2f(this.gl, p.loc('uTexel'), 1 / cur.w, 1 / cur.h);
        this.gl.uniform1f(p.loc('uThr'), first && threshold >= 0 ? threshold : -1);
        this._draw(); if (cur !== src) temps.push(cur); cur = t; scale *= 2; first = false;
      }
      const s = Math.max(0.6, sigma / scale);
      const a = this.target(cur.w, cur.h), b = this.target(cur.w, cur.h);
      const p = this.p.gauss;
      this._use(p, a, cur.w, cur.h); this._bind(p, 'uSrc', cur.tex); gl2f(this.gl, p.loc('uDir'), 1 / cur.w, 0); this.gl.uniform1f(p.loc('uSigma'), s); this._draw();
      this._use(p, b, cur.w, cur.h); this._bind(p, 'uSrc', a.tex); gl2f(this.gl, p.loc('uDir'), 0, 1 / cur.h); this.gl.uniform1f(p.loc('uSigma'), s); this._draw();
      this.release(a); if (cur !== src) this.release(cur); temps.forEach((t) => this.release(t));
      return b;
    }

    runTool(tool, cur, w, h, opts) {
      const def = UB.TOOLS[tool.type]; const gl = this.gl;
      const prog = this.toolProg(tool.type);
      const extra = def.pre ? def.pre(this, cur, tool.params, tool, opts) : null;
      const out = this.target(w, h);
      this._use(prog, out, w, h);
      this._bind(prog, 'uSrc', cur.tex);
      gl.uniform1f(prog.loc('uAmt'), tool.strength == null ? 1 : tool.strength);
      const ctx = {
        f: (n, v) => gl.uniform1f(prog.loc(n), v), i: (n, v) => gl.uniform1i(prog.loc(n), v),
        v2: (n, a, b) => gl.uniform2f(prog.loc(n), a, b), v3: (n, a) => gl.uniform3fv(prog.loc(n), a),
        m3: (n, m) => gl.uniformMatrix3fv(prog.loc(n), false, m), tex: (n, t) => this._bind(prog, n, t), tex3: (n, t) => this._bind(prog, n, t, true),
        engine: this, tool, extra,
      };
      // default: every numeric/select param → uniform u_<id>
      for (const pd of def.params || []) {
        const v = tool.params[pd.id];
        if (pd.type === 'select' || pd.type === 'toggle' || pd.type == null) {
          if (typeof v === 'number') ctx.f('u_' + pd.id, v);
          else if (typeof v === 'boolean') ctx.f('u_' + pd.id, v ? 1 : 0);
          else if (pd.type === 'select') ctx.f('u_' + pd.id, Math.max(0, pd.options.findIndex((o) => (o.value ?? o) === v)));
        }
      }
      if (def.uniforms) def.uniforms(ctx, tool.params);
      this._draw();
      if (extra) (Array.isArray(extra) ? extra : [extra]).forEach((t) => t && t.w && this.release(t));
      return out;
    }

    runChain(chain, w, h, opts = {}) {
      const src = opts.srcTex || this.srcTex;
      const orig = this.copy(src, w, h, !opts.srcTex && this.srcFlip);
      let cur = orig, base = null;
      for (const tool of chain) {
        const def = UB.TOOLS[tool.type];
        if (!def || tool.on === false || (tool.strength != null && tool.strength <= 0.0001)) continue;
        if (opts.colorOnly && def.kind !== 'color') continue;
        if (opts.stopAt && tool.uid === opts.stopAt) break;
        if (def.stage !== 'source' && !base) base = cur;
        const out = this.runTool(tool, cur, w, h, opts);
        if (cur !== orig && cur !== base) this.release(cur);
        cur = out;
      }
      if (!base) base = cur;
      return { orig, base, final: cur };
    }

    present(res, out, w, h, o = {}) {
      const gl = this.gl, p = this.p.present; this._use(p, out, w, h);
      this._bind(p, 'uSrc', res.final.tex); this._bind(p, 'uBase', res.base.tex); this._bind(p, 'uOrig', res.orig.tex);
      gl.uniform1f(p.loc('uAmt'), o.strength == null ? 1 : o.strength);
      gl.uniform1f(p.loc('uSplit'), o.split == null ? -1 : o.split);
      gl.uniform1f(p.loc('uMode'), o.mode || 0); gl.uniform1f(p.loc('uDither'), o.dither ? 1 : 0);
      gl.uniform1f(p.loc('uBefore'), o.before ? 1 : 0);
      this._draw();
    }

    // Main viewer render
    render(state, w, h, view = {}) {
      if (!this.srcTex) return null;
      const cv = this.canvas; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const res = this.runChain(state.chain, w, h, {});
      this.present(res, null, w, h, { strength: state.strength, split: view.split, mode: view.mode, before: view.before, dither: true });
      let scope = null;
      if (view.scopeW) {
        const sw = view.scopeW, sh = Math.max(1, Math.round(sw * h / w));
        const t = this.target(sw, sh, true);
        this.present(res, t, sw, sh, { strength: state.strength, before: view.before });
        scope = { w: sw, h: sh, px: new Uint8Array(sw * sh * 4) };
        this.gl.readPixels(0, 0, sw, sh, this.gl.RGBA, this.gl.UNSIGNED_BYTE, scope.px);
      }
      this.releaseFrame();
      return scope;
    }

    // Offscreen render → top-down RGBA8 pixels
    renderPixels(state, w, h, o = {}) {
      const res = this.runChain(o.chain || state.chain, w, h, o);
      const t = this.target(w, h, true);
      this.present(res, t, w, h, { strength: o.strength ?? state.strength, dither: true });
      const px = new Uint8Array(w * h * 4); this.gl.readPixels(0, 0, w, h, this.gl.RGBA, this.gl.UNSIGNED_BYTE, px);
      this.releaseFrame();
      const out = new Uint8ClampedArray(w * h * 4), row = w * 4;
      for (let y = 0; y < h; y++) out.set(px.subarray((h - 1 - y) * row, (h - y) * row), y * row);
      return out;
    }
    renderToCanvas(state, w, h, o = {}) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').putImageData(new ImageData(this.renderPixels(state, w, h, o), w, h), 0, 0); return c;
    }

    // Read float stats of chain output at a point (for Shot Match etc.)
    sampleStats(state, o = {}) {
      if (!this.srcTex) return null;
      const w = 128, h = Math.max(8, Math.round(128 * this.srcH / this.srcW));
      const px = this.renderPixels(state, w, h, Object.assign({ colorOnly: true, strength: 1 }, o));
      return UB.statsYCC(px);
    }

    // Bake all per-pixel tools into a 3D LUT (Float32 rgb, r fastest)
    bakeLUT(state, n = 33) {
      const gl = this.gl, W = n * n, H = n; const data = new Float32Array(W * H * 4);
      for (let g = 0; g < n; g++) for (let b = 0; b < n; b++) for (let r = 0; r < n; r++) {
        const i = (g * W + b * n + r) * 4; data[i] = r / (n - 1); data[i + 1] = g / (n - 1); data[i + 2] = b / (n - 1); data[i + 3] = 1;
      }
      const lat = this._tex(W, H, gl.RGBA16F, gl.RGBA, gl.FLOAT, data);
      const res = this.runChain(state.chain, W, H, { colorOnly: true, srcTex: lat });
      const t = this.target(W, H);
      const p = this.p.mix; this._use(p, t, W, H); this._bind(p, 'uSrc', res.base.tex); this._bind(p, 'uB', res.final.tex);
      gl.uniform1f(p.loc('uAmt'), state.strength == null ? 1 : state.strength); this._draw();
      let px;
      if (this.float) { px = new Float32Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, px); }
      else { const b8 = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b8); px = Float32Array.from(b8, (v) => v / 255); }
      this.releaseFrame(); gl.deleteTexture(lat);
      const out = new Float32Array(n * n * n * 3);
      for (let b = 0; b < n; b++) for (let g = 0; g < n; g++) for (let r = 0; r < n; r++) {
        const s = (g * W + b * n + r) * 4, d = ((b * n + g) * n + r) * 3;
        out[d] = clamp01(px[s]); out[d + 1] = clamp01(px[s + 1]); out[d + 2] = clamp01(px[s + 2]);
      }
      return out;
    }
  }
  function gl2f(gl, l, a, b) { gl.uniform2f(l, a, b); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // ---------- Stats / LUT IO ----------
  UB.statsYCC = function (px) {
    const n = px.length / 4; const m = [0, 0, 0], q = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const r = px[i * 4] / 255, g = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255;
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b, cb = (b - y) / 1.8556, cr = (r - y) / 1.5748;
      m[0] += y; m[1] += cb; m[2] += cr; q[0] += y * y; q[1] += cb * cb; q[2] += cr * cr;
    }
    const mean = m.map((v) => v / n); const std = q.map((v, i) => Math.sqrt(Math.max(1e-6, v / n - mean[i] * mean[i])));
    return { mean, std };
  };
  UB.parseCube = function (text) {
    let size = 0, min = [0, 0, 0], max = [1, 1, 1], title = ''; const vals = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim(); if (!line || line[0] === '#') continue;
      const up = line.toUpperCase();
      if (up.startsWith('TITLE')) { title = line.replace(/^TITLE\s*/i, '').replace(/"/g, ''); continue; }
      if (up.startsWith('LUT_3D_SIZE')) { size = parseInt(line.split(/\s+/)[1], 10); continue; }
      if (up.startsWith('LUT_1D_SIZE')) throw new Error('1D-LUTs werden nicht unterstützt – bitte 3D .cube verwenden.');
      if (up.startsWith('DOMAIN_MIN')) { min = line.split(/\s+/).slice(1).map(Number); continue; }
      if (up.startsWith('DOMAIN_MAX')) { max = line.split(/\s+/).slice(1).map(Number); continue; }
      if (/^[A-Z_]/.test(up)) continue;
      const p = line.split(/\s+/); if (p.length >= 3) vals.push(+p[0], +p[1], +p[2]);
    }
    if (!size || vals.length < size * size * size * 3) throw new Error('Ungültige .cube Datei');
    return { size, min, max, title, data: new Float32Array(vals.slice(0, size * size * size * 3)) };
  };
  UB.writeCube = function (data, n, title) {
    const lines = [`# Created with UBGrade by gelounique — uniquebaby.de`, `TITLE "${title || 'UBGrade'}"`, `LUT_3D_SIZE ${n}`, 'DOMAIN_MIN 0.0 0.0 0.0', 'DOMAIN_MAX 1.0 1.0 1.0'];
    for (let i = 0; i < n * n * n; i++) lines.push(data[i * 3].toFixed(6) + ' ' + data[i * 3 + 1].toFixed(6) + ' ' + data[i * 3 + 2].toFixed(6));
    return lines.join('\n') + '\n';
  };

  UB.Engine = Engine;
})(window.UB = window.UB || {});
