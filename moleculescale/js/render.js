/* WebGL2 renderer: instanced spheres/cylinders, ribbons, surfaces, SSAO + outline post pass, CPU picking, 2D overlay. */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});
  const EL = MS.EL, V = MS.V, G3 = MS.g3;

  /* ---------------- camera ---------------- */
  const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  const qaxis = (ax, ang) => { const s = Math.sin(ang / 2), n = V.norm(ax); return [n[0] * s, n[1] * s, n[2] * s, Math.cos(ang / 2)]; };
  const qnorm = (q) => { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; };
  function qmat(q) { // rotation matrix rows (world -> view)
    const [x, y, z, w] = q;
    return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]];
  }
  class Camera {
    constructor() { this.q = [0, 0, 0, 1]; this.target = [0, 0, 0]; this.dist = 20; this.fov = 32 * Math.PI / 180; this.ortho = false; this.radius = 10; this.W = 1; this.H = 1; }
    R() { return qmat(this.q); }
    rotate(dx, dy, rz) {
      let q = this.q;
      if (rz) q = qmul(qaxis([0, 0, 1], rz), q); else q = qmul(qaxis([1, 0, 0], dy * 0.0085), qmul(qaxis([0, 1, 0], dx * 0.0085), q));
      this.q = qnorm(q);
    }
    pan(dx, dy) {
      const s = this.pxToWorld(); const R = this.R();
      // move target along view x/y (rows of R are view axes in world)
      this.target = V.add(this.target, V.add(V.mul(R[0], -dx * s), V.mul(R[1], dy * s)));
    }
    pxToWorld() { return (2 * this.dist * Math.tan(this.fov / 2)) / this.H; }
    zoom(f) { this.dist = Math.max(0.5, Math.min(2000, this.dist * f)); }
    pos() { const R = this.R(); return V.add(this.target, V.mul([R[2][0], R[2][1], R[2][2]], this.dist)); }
    view() { // column-major 4x4
      const R = this.R(), t = this.target;
      const tx = -(R[0][0] * t[0] + R[0][1] * t[1] + R[0][2] * t[2]), ty = -(R[1][0] * t[0] + R[1][1] * t[1] + R[1][2] * t[2]), tz = -(R[2][0] * t[0] + R[2][1] * t[1] + R[2][2] * t[2]) - this.dist;
      return new Float32Array([R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, tx, ty, tz, 1]);
    }
    clip() { return { near: Math.max(0.2, this.dist - this.radius * 1.5), far: this.dist + this.radius * 1.5 + 2 }; }
    proj() {
      const asp = this.W / this.H, { near, far } = this.clip(), t = Math.tan(this.fov / 2);
      if (this.ortho) {
        const hh = this.dist * t, hw = hh * asp;
        return new Float32Array([1 / hw, 0, 0, 0, 0, 1 / hh, 0, 0, 0, 0, -2 / (far - near), 0, 0, 0, -(far + near) / (far - near), 1]);
      }
      const f = 1 / t;
      return new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]);
    }
    /** world point -> [sx, sy, depth] in CSS px */
    project(p) {
      const R = this.R(), d = V.sub(p, this.target);
      const vx = R[0][0] * d[0] + R[0][1] * d[1] + R[0][2] * d[2], vy = R[1][0] * d[0] + R[1][1] * d[1] + R[1][2] * d[2], vz = R[2][0] * d[0] + R[2][1] * d[1] + R[2][2] * d[2];
      const depth = this.dist - vz, t = Math.tan(this.fov / 2), asp = this.W / this.H;
      let nx, ny;
      if (this.ortho) { nx = vx / (this.dist * t * asp); ny = vy / (this.dist * t); } else { nx = vx / (depth * t * asp); ny = vy / (depth * t); }
      return [(nx * 0.5 + 0.5) * this.W, (1 - (ny * 0.5 + 0.5)) * this.H, depth];
    }
    /** screen px -> world ray {o, d} */
    ray(sx, sy) {
      const nx = (sx / this.W) * 2 - 1, ny = 1 - (sy / this.H) * 2, t = Math.tan(this.fov / 2), asp = this.W / this.H, R = this.R();
      const inv = (v) => [R[0][0] * v[0] + R[1][0] * v[1] + R[2][0] * v[2], R[0][1] * v[0] + R[1][1] * v[1] + R[2][1] * v[2], R[0][2] * v[0] + R[1][2] * v[1] + R[2][2] * v[2]];
      const cp = this.pos();
      if (this.ortho) { const o = V.add(cp, inv([nx * this.dist * t * asp, ny * this.dist * t, 0])); return { o, d: inv([0, 0, -1]) }; }
      return { o: cp, d: V.norm(inv([nx * t * asp, ny * t, -1])) };
    }
    /** world point on the plane through `p` facing the camera, under screen px */
    unprojectAt(sx, sy, p) {
      const r = this.ray(sx, sy), n = this.forward(); const dn = V.dot(r.d, n); if (Math.abs(dn) < 1e-6) return p;
      const t = V.dot(V.sub(p, r.o), n) / dn; return V.add(r.o, V.mul(r.d, t));
    }
    forward() { const R = this.R(); return [-R[2][0], -R[2][1], -R[2][2]]; }
    fit(center, radius) { this.target = center.slice(); this.radius = radius; this.dist = Math.max(3, radius / Math.sin(Math.min(this.fov, 1.2) / 2) * 1.02); }
    set(o) { Object.assign(this, o); }
  }
  MS.Camera = Camera;

  /* ---------------- GL helpers ---------------- */
  function icosphere(sub) {
    const t = (1 + Math.sqrt(5)) / 2;
    let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(V.norm);
    let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let s = 0; s < sub; s++) {
      const cache = new Map(), nf = [];
      const mid = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (cache.has(k)) return cache.get(k); v.push(V.norm(V.mul(V.add(v[a], v[b]), 0.5))); cache.set(k, v.length - 1); return v.length - 1; };
      f.forEach(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); });
      f = nf;
    }
    return { pos: new Float32Array(v.flat()), idx: new Uint16Array(f.flat()) };
  }
  function cylinderMesh(sides) {
    const p = [], idx = [];
    for (let i = 0; i < sides; i++) { const a = (i / sides) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); p.push(c, s, 0, c, s, 0, c, s, 1, c, s, 0); }
    for (let i = 0; i < sides; i++) { const a = i * 2, b = ((i + 1) % sides) * 2; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    return { pos: new Float32Array(p), idx: new Uint16Array(idx) };
  }

  const LIGHT = `
precision highp float;
uniform vec3 uLight; uniform float uOrtho; uniform vec3 uAccent;
vec3 shade(vec3 base, vec3 N, vec3 P, float flag){
  vec3 L = normalize(uLight);
  vec3 Vv = uOrtho > 0.5 ? vec3(0.,0.,1.) : normalize(-P);
  vec3 H = normalize(L + Vv);
  float nl = dot(N, L);
  float diff = clamp(nl * 0.5 + 0.5, 0., 1.); diff *= diff;
  float hemi = N.y * 0.5 + 0.5;
  vec3 amb = mix(vec3(0.36,0.37,0.43), vec3(0.74,0.77,0.86), hemi);
  float spec = pow(max(dot(N, H), 0.), 56.) * 0.5;
  float fres = pow(1.0 - max(dot(N, Vv), 0.), 3.0);
  vec3 c = base * (amb * 0.60 + vec3(diff) * 0.66) + vec3(spec) + fres * (0.10 + 0.18 * base);
  if (flag > 0.5 && flag < 1.5) c = mix(c, uAccent, 0.48) + uAccent * 0.08;
  else if (flag > 1.5) c = mix(c, vec3(1.), 0.3);
  return c;
}`;
  const VS_SPHERE = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec4 iPR; layout(location=2) in vec4 iCF;
uniform mat4 uV; uniform mat4 uP;
out vec3 vN; out vec4 vCF; out vec3 vPos;
void main(){ vec3 wp = iPR.xyz + aPos * iPR.w; vec4 vp = uV * vec4(wp,1.); vN = mat3(uV) * aPos; vCF = iCF; vPos = vp.xyz; gl_Position = uP * vp; }`;
  const VS_CYL = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 iA; layout(location=3) in vec4 iB; layout(location=4) in vec4 iC;
uniform mat4 uV; uniform mat4 uP;
out vec3 vN; out vec4 vCF; out vec3 vPos;
void main(){
  vec3 d = iB.xyz - iA.xyz; float L = max(length(d), 1e-5); vec3 zz = d / L;
  vec3 up = abs(zz.y) < 0.99 ? vec3(0.,1.,0.) : vec3(1.,0.,0.);
  vec3 xx = normalize(cross(up, zz)); vec3 yy = cross(zz, xx);
  vec3 wp = iA.xyz + (xx * aPos.x + yy * aPos.y) * iA.w + zz * aPos.z * L;
  vec3 n = xx * aNrm.x + yy * aNrm.y;
  vec4 vp = uV * vec4(wp,1.); vN = mat3(uV) * n; vCF = vec4(iC.rgb, iB.w); vPos = vp.xyz; gl_Position = uP * vp;
}`;
  const VS_MESH = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec4 aC;
uniform mat4 uV; uniform mat4 uP;
out vec3 vN; out vec4 vCF; out vec3 vPos;
void main(){ vec4 vp = uV * vec4(aP,1.); vN = mat3(uV) * aN; vCF = aC; vPos = vp.xyz; gl_Position = uP * vp; }`;
  const FS_LIT = `#version 300 es
${LIGHT}
in vec3 vN; in vec4 vCF; in vec3 vPos; layout(location=0) out vec4 oC;
void main(){ vec3 N = normalize(vN); if(!gl_FrontFacing && uOrtho < 2.) { } oC = vec4(shade(vCF.rgb, N, vPos, vCF.a), 1.); }`;
  const FS_MESH = `#version 300 es
${LIGHT}
in vec3 vN; in vec4 vCF; in vec3 vPos; layout(location=0) out vec4 oC;
void main(){ vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N; oC = vec4(shade(vCF.rgb, N, vPos, 0.), 1.); }`;
  const FS_SURF = `#version 300 es
${LIGHT}
uniform sampler2D uDepth;
in vec3 vN; in vec4 vCF; in vec3 vPos; layout(location=0) out vec4 oC;
void main(){
  float sd = texelFetch(uDepth, ivec2(gl_FragCoord.xy), 0).r;
  if (gl_FragCoord.z > sd + 2e-5) discard;
  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
  oC = vec4(shade(vCF.rgb, N, vPos, 0.), vCF.a);
}`;
  const VS_FS = `#version 300 es
out vec2 uv; void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); uv = p; gl_Position = vec4(p * 2. - 1., 0., 1.); }`;
  const FS_COMMON = `
uniform float uNear; uniform float uFar; uniform float uOrtho; uniform vec2 uTan;
float lin(float d){ float z = d * 2. - 1.; return uOrtho > .5 ? (z * (uFar - uNear) + uFar + uNear) * .5 : 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
vec3 vpos(vec2 t, float ld){ vec2 n = t * 2. - 1.; return uOrtho > .5 ? vec3(n * uTan, -ld) : vec3(n * uTan * ld, -ld); }`;
  const FS_AO = `#version 300 es
precision highp float;
in vec2 uv; out vec4 oC;
uniform sampler2D uDepth; uniform vec2 uTexel; uniform float uRadius; uniform vec3 uKernel[16];
${FS_COMMON}
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  float d = texture(uDepth, uv).r;
  if (d >= 1.) { oC = vec4(1.); return; }
  float ld = lin(d); vec3 P = vpos(uv, ld);
  vec2 ox = vec2(uTexel.x, 0.), oy = vec2(0., uTexel.y);
  float dl = lin(texture(uDepth, uv - ox).r), dr = lin(texture(uDepth, uv + ox).r), du = lin(texture(uDepth, uv + oy).r), dd = lin(texture(uDepth, uv - oy).r);
  vec3 Pl = vpos(uv - ox, dl), Pr = vpos(uv + ox, dr), Pu = vpos(uv + oy, du), Pd = vpos(uv - oy, dd);
  vec3 dx = abs(dl - ld) < abs(dr - ld) ? (P - Pl) : (Pr - P);
  vec3 dy = abs(dd - ld) < abs(du - ld) ? (P - Pd) : (Pu - P);
  vec3 N = normalize(cross(dx, dy)); if (N.z < 0.) N = -N;
  float ang = hash(gl_FragCoord.xy) * 6.2831853;
  vec3 rv = vec3(cos(ang), sin(ang), 0.);
  vec3 T = normalize(rv - N * dot(rv, N)); vec3 B = cross(N, T);
  float occ = 0.;
  for (int i = 0; i < 16; i++) {
    vec3 k = uKernel[i]; vec3 s = P + (T * k.x + B * k.y + N * k.z) * uRadius;
    vec2 suv = uOrtho > .5 ? (s.xy / uTan) * .5 + .5 : (s.xy / (-s.z * uTan)) * .5 + .5;
    float sd = lin(texture(uDepth, suv).r);
    float diff = (-s.z) - sd;
    float rc = smoothstep(0., 1., uRadius / max(abs(ld - sd), 1e-3));
    occ += (diff > 0.03 * uRadius ? 1. : 0.) * rc;
  }
  oC = vec4(1. - occ / 16., 0., 0., 1.);
}`;
  const FS_COMP = `#version 300 es
precision highp float;
in vec2 uv; out vec4 oC;
uniform sampler2D uColor; uniform sampler2D uDepth; uniform sampler2D uAO;
uniform vec2 uTexel; uniform float uAOStr; uniform float uOutline; uniform float uFog; uniform float uTransparent; uniform float uFogNear; uniform float uFogFar; uniform float uThick;
uniform vec3 uBg1; uniform vec3 uBg2;
${FS_COMMON}
void main(){
  vec4 c = texture(uColor, uv); float d = texture(uDepth, uv).r;
  float r = length((uv - vec2(.5, .56)) * vec2(1., 1.15));
  vec3 bg = mix(uBg1, uBg2, smoothstep(0., .85, r));
  vec3 geo = c.a > 0.002 ? c.rgb / c.a : vec3(0.);
  float ld = lin(d);
  if (d < 1.) {
    float ao = 0., ws = 0.;
    for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++) {
      vec2 o = vec2(float(x), float(y)) * uTexel * 1.5; float dn = lin(texture(uDepth, uv + o).r);
      float w = exp(-abs(dn - ld) / 0.6); ao += texture(uAO, uv + o).r * w; ws += w;
    }
    ao /= max(ws, 1e-4);
    geo *= mix(1., ao * ao * 0.55 + ao * 0.45, uAOStr);
  }
  if (uOutline > 0.) {
    vec2 o = uTexel * uThick; float e = 0.;
    float l1 = lin(texture(uDepth, uv + vec2(o.x, 0.)).r), l2 = lin(texture(uDepth, uv - vec2(o.x, 0.)).r), l3 = lin(texture(uDepth, uv + vec2(0., o.y)).r), l4 = lin(texture(uDepth, uv - vec2(0., o.y)).r);
    e = max(max(l1 - ld, l2 - ld), max(l3 - ld, l4 - ld));
    float ee = smoothstep(0.25, 1.4, e);
    geo = mix(geo, geo * 0.28, ee * uOutline * step(d, 0.9999));
  }
  if (uFog > 0. && d < 1.) { float f = clamp((ld - uFogNear) / max(uFogFar - uFogNear, 1e-3), 0., 1.); geo = mix(geo, bg, f * uFog * 0.85); }
  if (uTransparent > .5) oC = vec4(geo * c.a, c.a);
  else oC = vec4(mix(bg, geo, c.a), 1.);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader error: ' + gl.getShaderInfoLog(s) + '\n' + src.split('\n').slice(0, 6).join('\n'));
    return s;
  }
  function program(gl, vs, fs) {
    const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link error: ' + gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace('[0]', ''); u[name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }

  /* ---------------- renderer ---------------- */
  class Renderer {
    constructor(canvas, overlay) {
      this.canvas = canvas; this.ov = overlay; this.octx = overlay.getContext('2d'); this.cam = new Camera();
      const gl = (this.gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false }));
      if (!gl) throw new Error('WebGL 2 is not available in this browser.');
      this.opts = { bg: 'auto', ao: 0.8, outline: 0.6, fog: 0, dark: false, transparent: false, cell: false, axes: true, classic: false, lightDir: [-0.45, 0.7, 0.55] };
      this.mol = null; this.layers = []; this.hover = -1; this.hoverBond = -1;
      this.hooks = []; this.geo = null; this.dirty = true; this.geoDirty = true; this.raf = 0; this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      this.progs = {
        sphere: program(gl, VS_SPHERE, FS_LIT), cyl: program(gl, VS_CYL, FS_LIT), mesh: program(gl, VS_MESH, FS_MESH), surf: program(gl, VS_MESH, FS_SURF),
        ao: program(gl, VS_FS, FS_AO), comp: program(gl, VS_FS, FS_COMP),
      };
      this.initGeometry(); this.kernel = this.makeKernel(); this.fbo = null; this.size = [0, 0];
      this.empty = gl.createVertexArray();
    }
    makeKernel() {
      const k = new Float32Array(48);
      for (let i = 0; i < 16; i++) {
        const u = (i + 0.5) / 16, th = i * 2.399963, r = Math.sqrt(u); const x = r * Math.cos(th), y = r * Math.sin(th), z = Math.sqrt(Math.max(0, 1 - u));
        const sc = 0.25 + 0.75 * ((i % 4) + 1) / 4;
        k[i * 3] = x * sc; k[i * 3 + 1] = y * sc; k[i * 3 + 2] = z * sc;
      }
      return k;
    }
    initGeometry() {
      const gl = this.gl, mk = (data, target) => { const b = gl.createBuffer(); gl.bindBuffer(target || gl.ARRAY_BUFFER, b); gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; };
      this.lod = -1; this.sph = null; this.cyl = null;
      this.sphInst = gl.createBuffer(); this.cylInst = gl.createBuffer();
      this.makeSphere = (sub) => {
        const ico = icosphere(sub), vao = gl.createVertexArray(); gl.bindVertexArray(vao);
        mk(ico.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sphInst);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(2, 1);
        mk(ico.idx, gl.ELEMENT_ARRAY_BUFFER); this.sph = { vao, n: ico.idx.length }; gl.bindVertexArray(null);
      };
      this.makeCyl = (sides) => {
        const c = cylinderMesh(sides), vao = gl.createVertexArray(); gl.bindVertexArray(vao);
        mk(c.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cylInst);
        for (let k = 0; k < 3; k++) { gl.enableVertexAttribArray(2 + k); gl.vertexAttribPointer(2 + k, 4, gl.FLOAT, false, 48, k * 16); gl.vertexAttribDivisor(2 + k, 1); }
        mk(c.idx, gl.ELEMENT_ARRAY_BUFFER); this.cyl = { vao, n: c.idx.length }; gl.bindVertexArray(null);
      };
    }
    setLOD(natoms) {
      const lod = natoms > 12000 ? 0 : natoms > 3000 ? 1 : 2;
      if (lod === this.lod) return; this.lod = lod;
      this.makeSphere([1, 2, 3][lod]); this.makeCyl([8, 12, 20][lod]);
    }
    /* ----- data ----- */
    setData(mol, layers) { this.mol = mol; this.layers = layers; this.invalidate(true); }
    invalidate(geo) { if (geo) this.geoDirty = true; this.dirty = true; if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.frame(); }); }
    frame() {
      if (this.geoDirty) { try { this.buildGeometry(); } catch (e) { console.error(e); } this.geoDirty = false; }
      this.draw(); this.dirty = false;
      if (this.animating && this.animating()) this.invalidate(false);
    }
    resize() {
      const c = this.canvas, w = c.clientWidth, h = c.clientHeight; if (!w || !h) return false;
      const pr = this.forcedRatio || this.pixelRatio, pw = Math.round(w * pr), ph = Math.round(h * pr);
      if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; this.ov.width = pw; this.ov.height = ph; }
      this.cam.W = w; this.cam.H = h; return true;
    }
    /* ----- geometry building ----- */
    scopeFn(layer) {
      const m = this.mol, s = layer.scope || 'all';
      switch (s) {
        case 'protein': return (i) => { const r = m.atoms[i].r; return r >= 0 && m.res[r].aa; };
        case 'nonprotein': return (i) => { const r = m.atoms[i].r; return !(r >= 0 && m.res[r].aa); };
        case 'ligand': return (i) => { const r = m.atoms[i].r; return r >= 0 && !m.res[r].aa && !m.res[r].water && !m.res[r].nuc; };
        case 'water': return (i) => { const r = m.atoms[i].r; return r >= 0 && m.res[r].water; };
        case 'nowater': return (i) => { const r = m.atoms[i].r; return !(r >= 0 && m.res[r].water); };
        case 'heavy': return (i) => m.atoms[i].e > 1;
        case 'backbone': return (i) => ['N', 'CA', 'C', 'O'].includes(m.atoms[i].nm);
        case 'sidechain': return (i) => { const r = m.atoms[i].r; return r >= 0 && m.res[r].aa && !['N', 'CA', 'C', 'O', 'OXT', 'H'].includes(m.atoms[i].nm); };
        case 'sel': return (i) => layer.idx && layer.idx.has(i);
        case 'selnow': return (i) => m.sel.has(i);
        default: return () => true;
      }
    }
    buildGeometry() {
      const m = this.mol; const G = { sph: [], cyl: [], opaque: [], trans: [], pickR: null, bondSeg: [], extra: [] };
      this.geo = G; if (!m) return;
      const n = m.atoms.length; this.setLOD(n);
      G.pickR = new Float32Array(n);
      const ctx = { classic: this.opts.classic, bmax: 0, uniform: [0.5, 0.6, 0.8] };
      m.atoms.forEach((a) => { if (a.b > ctx.bmax) ctx.bmax = a.b; });
      const selFlag = (i) => (m.sel.has(i) ? 1 : i === this.hover ? 2 : 0);
      const nb = m.nb();
      const perp = (a, b, dir) => {
        for (const x of nb[a]) if (x.j !== b) { const w = V.sub(m.pos(x.j), m.pos(a)); const p = V.sub(w, V.mul(dir, V.dot(w, dir))); if (V.len(p) > 0.05) return V.norm(p); }
        for (const x of nb[b]) if (x.j !== a) { const w = V.sub(m.pos(x.j), m.pos(b)); const p = V.sub(w, V.mul(dir, V.dot(w, dir))); if (V.len(p) > 0.05) return V.norm(p); }
        return V.perp(dir);
      };
      const sph = G.sph, cyl = G.cyl;
      const addSphere = (i, r, c, flag) => { const a = m.atoms[i]; sph.push(a.x, a.y, a.z, r, c[0], c[1], c[2], flag); if (r > G.pickR[i]) G.pickR[i] = r; };
      const addCyl = (p0, p1, r, c, flag) => { cyl.push(p0[0], p0[1], p0[2], r, p1[0], p1[1], p1[2], flag, c[0], c[1], c[2], 0); };
      this.layers.forEach((L) => {
        if (!L.vis) return;
        const inScope = this.scopeFn(L), sc = L.size || 1;
        const col = L.color || 'element'; ctx.uniform = G3.hex2(L.hex || '#7aa2ff');
        const ok = (i) => !m.atoms[i].hid && inScope(i);
        const cfn = (i) => G3.atomColor(col, m, i, ctx);
        const st = L.style;
        if (st === 'bs' || st === 'stick' || st === 'wire' || st === 'vdw') {
          const rbond = st === 'bs' ? 0.11 * sc : st === 'stick' ? 0.17 * sc : 0.035 * sc;
          for (let i = 0; i < n; i++) {
            if (!ok(i)) continue; const a = m.atoms[i], c = cfn(i);
            if (st === 'vdw') addSphere(i, EL[a.e].vdw * (L.scale || 1) * 1.0, c, selFlag(i));
            else if (st === 'bs') addSphere(i, (a.e === 1 ? 0.27 : 0.3 * Math.min(EL[a.e].vdw, 2.2) / 1.7 * 1.0 + 0.0) * sc * (L.ball || 1), c, selFlag(i));
            else if (st === 'stick') addSphere(i, rbond, c, selFlag(i));
            else if (nb[i].length === 0) addSphere(i, 0.12 * sc, c, selFlag(i)); else { if (rbond > G.pickR[i]) G.pickR[i] = rbond * 1.5; }
          }
          if (st !== 'vdw') {
            m.bonds.forEach((b, k) => {
              if (!ok(b.a) || !ok(b.b)) return;
              const A = m.pos(b.a), B = m.pos(b.b), mid = V.mul(V.add(A, B), 0.5), ca = cfn(b.a), cb = cfn(b.b);
              const fa = selFlag(b.a), fb = selFlag(b.b);
              const dir = V.norm(V.sub(B, A));
              const draw = (o, r) => {
                const off = o ? V.mul(o, 1) : [0, 0, 0];
                const a0 = V.add(A, off), b0 = V.add(B, off), m0 = V.add(mid, off);
                addCyl(a0, m0, r, ca, fa); addCyl(m0, b0, r, cb, fb);
              };
              if (b.o === 1 || (b.o >= 4)) draw(null, rbond);
              else {
                const u = perp(b.a, b.b, dir);
                if (b.o === 2) { const d = (st === 'wire' ? 0.06 : st === 'stick' ? 0.1 : 0.085) * sc; draw(V.mul(u, d), rbond * 0.72); draw(V.mul(u, -d), rbond * 0.72); }
                else { const d = (st === 'wire' ? 0.1 : st === 'stick' ? 0.15 : 0.13) * sc; draw(null, rbond * 0.7); draw(V.mul(u, d), rbond * 0.62); draw(V.mul(u, -d), rbond * 0.62); }
              }
              G.bondSeg.push([k, rbond]);
            });
          }
        } else if (st === 'cartoon') {
          const mesh = G3.buildCartoon(m, ok, col, ctx); if (mesh) G.opaque.push(mesh);
          // make CA atoms pickable
          m.atoms.forEach((a, i) => { if (a.nm === 'CA' && ok(i) && G.pickR[i] < 0.7) G.pickR[i] = 0.7; });
        } else if (st === 'surface') {
          const list = []; for (let i = 0; i < n; i++) if (ok(i) && (L.noH ? m.atoms[i].e > 1 : true)) list.push(i);
          const key = [m.ver, m.cv, L.surf, L.res, L.color, L.opacity, list.length, L.hex, ctx.classic, L.id, L.noH].join('|');
          if (L._key !== key && !(this.fast && L._mesh)) { L._mesh = G3.surfaceMesh(m, list, L, ctx); L._key = key; }
          if (L._mesh) G.trans.push(L._mesh);
        } else if (st === 'iso' && m.vol) {
          const key = ['iso', m.vol.data.length, L.iso, L.opacity, L.id].join('|');
          if (L._key !== key) { L._mesh = G3.volumeMesh(m.vol, L.iso || 0.05, L.opacity == null ? 0.78 : L.opacity); L._key = key; }
          if (L._mesh) G.trans.push(L._mesh);
        }
      });
      // unit cell
      if (this.opts.cell && m.cell) {
        const M = MS.cellMatrix(m.cell), o = [0, 0, 0], cc = [0.55, 0.6, 0.7];
        const corner = (i, j, k) => [i * M[0][0] + j * M[1][0] + k * M[2][0], i * M[0][1] + j * M[1][1] + k * M[2][1], i * M[0][2] + j * M[1][2] + k * M[2][2]];
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { addCyl(corner(0, i, j), corner(1, i, j), 0.035, cc, 0); addCyl(corner(i, 0, j), corner(i, 1, j), 0.035, cc, 0); addCyl(corner(i, j, 0), corner(i, j, 1), 0.035, cc, 0); }
      }
      // user extras (dipole arrow etc.)
      (this.extraGeo ? this.extraGeo(m) : []).forEach((e) => { if (e.t === 'cyl') addCyl(e.a, e.b, e.r, e.c, 0); else if (e.t === 'sph') { sph.push(e.p[0], e.p[1], e.p[2], e.r, e.c[0], e.c[1], e.c[2], 0); } });
      const gl = this.gl;
      this.nSph = sph.length / 8; this.nCyl = cyl.length / 12;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.sphInst); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sph), gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.cylInst); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cyl), gl.DYNAMIC_DRAW);
      const up = (mesh) => {
        if (mesh._vao && mesh._gl === gl && mesh._ver === mesh.pos.length) return mesh._vao;
        const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
        const buf = (data, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
        buf(mesh.pos, 0, 3); buf(mesh.nrm, 1, 3); buf(mesh.col, 2, 4);
        const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.idx), gl.STATIC_DRAW);
        gl.bindVertexArray(null); mesh._vao = vao; mesh._gl = gl; mesh._ver = mesh.pos.length; mesh._n = mesh.idx.length; return vao;
      };
      G.opaque.forEach(up); G.trans.forEach(up);
      // fit radius for clipping
      const bb = m.bbox(); this.cam.radius = Math.max(bb.r, 2) + 1;
    }
    /* ----- framebuffers ----- */
    ensureFBO(w, h) {
      const gl = this.gl;
      if (this.fbo && this.size[0] === w && this.size[1] === h) return;
      if (this.fbo) { const f = this.fbo; [f.msaa, f.res, f.ao].forEach((x) => gl.deleteFramebuffer(x)); [f.rbC, f.rbD].forEach((x) => gl.deleteRenderbuffer(x)); [f.tC, f.tD, f.tA].forEach((x) => gl.deleteTexture(x)); }
      const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 4);
      const f = (this.fbo = {});
      f.rbC = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, f.rbC); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, w, h);
      f.rbD = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, f.rbD); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
      f.msaa = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f.msaa);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, f.rbC); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, f.rbD);
      const tex = (fmt, ifmt, type, filter) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, ifmt, type, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
      f.tC = tex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR); f.tD = tex(gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST); f.tA = tex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      f.res = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f.res);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, f.tC, 0); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, f.tD, 0);
      f.ao = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f.ao); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, f.tA, 0);
      this.size = [w, h]; gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    bgColors() {
      const o = this.opts, hex = G3.hex2;
      if (o.bg === 'white') return [[1, 1, 1], [0.93, 0.95, 0.98]];
      if (o.bg === 'black') return [[0.07, 0.08, 0.1], [0.0, 0.0, 0.0]];
      if (o.bg === 'custom') { const c = hex(o.bgHex || '#ffffff'); return [c, c.map((v) => v * 0.9)]; }
      return o.dark ? [[0.12, 0.15, 0.21], [0.045, 0.06, 0.09]] : [[0.97, 0.98, 1.0], [0.85, 0.89, 0.95]];
    }
    /* ----- draw ----- */
    draw(transparentOut) {
      if (!this.resize()) return;
      const gl = this.gl, cam = this.cam, W = this.canvas.width, H = this.canvas.height;
      this.ensureFBO(W, H); const f = this.fbo, P = this.progs, o = this.opts;
      const V4 = cam.view(), P4 = cam.proj(), { near, far } = cam.clip(), t = Math.tan(cam.fov / 2), asp = cam.W / cam.H;
      const uTan = cam.ortho ? [cam.dist * t * asp, cam.dist * t] : [t * asp, t];
      const lightV = V.norm(o.lightDir), acc = o.dark ? [0.36, 0.6, 1.0] : [0.15, 0.4, 0.95];
      const setCommon = (pr) => { gl.uniformMatrix4fv(pr.u.uV, false, V4); gl.uniformMatrix4fv(pr.u.uP, false, P4); gl.uniform3fv(pr.u.uLight, lightV); gl.uniform1f(pr.u.uOrtho, cam.ortho ? 1 : 0); gl.uniform3fv(pr.u.uAccent, acc); };
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.msaa); gl.viewport(0, 0, W, H);
      gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.CULL_FACE);
      gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const G = this.geo;
      if (G) {
        if (this.nSph && this.sph) { gl.useProgram(P.sphere.p); setCommon(P.sphere); gl.bindVertexArray(this.sph.vao); gl.drawElementsInstanced(gl.TRIANGLES, this.sph.n, gl.UNSIGNED_SHORT, 0, this.nSph); }
        if (this.nCyl && this.cyl) { gl.useProgram(P.cyl.p); setCommon(P.cyl); gl.bindVertexArray(this.cyl.vao); gl.drawElementsInstanced(gl.TRIANGLES, this.cyl.n, gl.UNSIGNED_SHORT, 0, this.nCyl); }
        if (G.opaque.length) { gl.useProgram(P.mesh.p); setCommon(P.mesh); G.opaque.forEach((ms) => { gl.bindVertexArray(ms._vao); gl.drawElements(gl.TRIANGLES, ms._n, gl.UNSIGNED_INT, 0); }); }
      }
      gl.bindVertexArray(null);
      // resolve
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, f.msaa); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, f.res);
      gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
      gl.disable(gl.DEPTH_TEST); gl.bindVertexArray(this.empty);
      const bindTex = (unit, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); };
      // AO
      if (o.ao > 0) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, f.ao); gl.viewport(0, 0, W, H); gl.useProgram(P.ao.p);
        bindTex(0, f.tD); gl.uniform1i(P.ao.u.uDepth, 0); gl.uniform2f(P.ao.u.uTexel, 1 / W, 1 / H);
        gl.uniform1f(P.ao.u.uNear, near); gl.uniform1f(P.ao.u.uFar, far); gl.uniform1f(P.ao.u.uOrtho, cam.ortho ? 1 : 0); gl.uniform2f(P.ao.u.uTan, uTan[0], uTan[1]);
        gl.uniform1f(P.ao.u.uRadius, 1.5); gl.uniform3fv(P.ao.u.uKernel, this.kernel);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      // composite
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.useProgram(P.comp.p);
      bindTex(0, f.tC); bindTex(1, f.tD); bindTex(2, f.tA);
      gl.uniform1i(P.comp.u.uColor, 0); gl.uniform1i(P.comp.u.uDepth, 1); gl.uniform1i(P.comp.u.uAO, 2);
      gl.uniform2f(P.comp.u.uTexel, 1 / W, 1 / H); gl.uniform1f(P.comp.u.uAOStr, o.ao); gl.uniform1f(P.comp.u.uOutline, o.outline); gl.uniform1f(P.comp.u.uThick, Math.max(1, W / cam.W));
      gl.uniform1f(P.comp.u.uFog, o.fog); gl.uniform1f(P.comp.u.uFogNear, Math.max(near, cam.dist - cam.radius)); gl.uniform1f(P.comp.u.uFogFar, cam.dist + cam.radius * 1.2);
      gl.uniform1f(P.comp.u.uNear, near); gl.uniform1f(P.comp.u.uFar, far); gl.uniform1f(P.comp.u.uOrtho, cam.ortho ? 1 : 0); gl.uniform2f(P.comp.u.uTan, uTan[0], uTan[1]);
      const bg = this.bgColors(); gl.uniform3fv(P.comp.u.uBg1, bg[0]); gl.uniform3fv(P.comp.u.uBg2, bg[1]); gl.uniform1f(P.comp.u.uTransparent, (o.transparent || transparentOut) ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // transparent surfaces
      if (G && G.trans.length) {
        gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        gl.useProgram(P.surf.p); setCommon(P.surf); bindTex(0, f.tD); gl.uniform1i(P.surf.u.uDepth, 0); gl.enable(gl.CULL_FACE);
        [gl.FRONT, gl.BACK].forEach((face) => { gl.cullFace(face); G.trans.forEach((ms) => { gl.bindVertexArray(ms._vao); gl.drawElements(gl.TRIANGLES, ms._n, gl.UNSIGNED_INT, 0); }); });
        gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.depthMask(true);
      }
      gl.bindVertexArray(null);
      this.drawOverlay();
    }
    /* ----- overlay ----- */
    drawOverlay() {
      const ctx = this.octx, c = this.ov, cam = this.cam; const k = c.width / cam.W;
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, cam.W, cam.H);
      ctx.font = '11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
      if (this.mol) this.drawLabels(ctx);
      this.hooks.forEach((h) => { try { h(ctx, this); } catch (e) { console.error(e); } });
      if (this.opts.axes && !this.exporting) this.drawAxes(ctx);
    }
    drawAxes(ctx) {
      const cam = this.cam, R = cam.R(), ox = 46, oy = cam.H - 46, L = 24;
      const ax = [[1, 0, 0, '#ef4a5a', 'x'], [0, 1, 0, '#2fb374', 'y'], [0, 0, 1, '#3f7bff', 'z']].map((a) => ({ a, v: [R[0][0] * a[0] + R[0][1] * a[1] + R[0][2] * a[2], R[1][0] * a[0] + R[1][1] * a[1] + R[1][2] * a[2], R[2][0] * a[0] + R[2][1] * a[1] + R[2][2] * a[2]] })).sort((p, q) => p.v[2] - q.v[2]);
      ctx.save(); ctx.lineCap = 'round'; ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ax.forEach(({ a, v }) => { const x = ox + v[0] * L, y = oy - v[1] * L; ctx.globalAlpha = 0.55 + 0.45 * (v[2] + 1) / 2; ctx.strokeStyle = a[3]; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = a[3]; ctx.beginPath(); ctx.arc(x, y, 6.2, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(a[4], x, y + 0.5); });
      ctx.restore();
    }
    drawLabels(ctx) {
      const m = this.mol; const todo = this.layers.filter((l) => l.vis && l.style === 'labels'); if (!todo.length) return;
      ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      const dark = this.opts.dark || this.opts.bg === 'black';
      todo.forEach((L) => {
        const inScope = this.scopeFn(L); const kind = L.label || 'element'; const size = (L.size || 1) * 11.5;
        ctx.font = `600 ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
        const items = [];
        m.atoms.forEach((a, i) => {
          if (a.hid || !inScope(i)) return; if (L.noH && a.e === 1) return;
          const r = a.r >= 0 ? m.res[a.r] : null;
          let t = '';
          switch (kind) {
            case 'element': t = EL[a.e].sym; break; case 'index': t = String(i + 1); break; case 'name': t = a.nm || EL[a.e].sym; break;
            case 'charge': t = (a.pc >= 0 ? '+' : '') + a.pc.toFixed(2); break; case 'residue': if (!r || (a.nm !== 'CA' && r.aa)) return; t = r.name + r.num; break;
            case 'label': t = a.e === 1 ? '' : EL[a.e].sym + (i + 1); break; case 'coords': t = a.x.toFixed(1) + ',' + a.y.toFixed(1) + ',' + a.z.toFixed(1); break;
          }
          if (!t) return;
          const p = this.cam.project([a.x, a.y, a.z]); if (p[0] < -20 || p[0] > this.cam.W + 20 || p[1] < -20 || p[1] > this.cam.H + 20) return;
          items.push([p, t, i]);
        });
        if (items.length > 2500) return;
        items.sort((a, b) => b[0][2] - a[0][2]);
        items.forEach(([p, t]) => { ctx.lineWidth = 3.4; ctx.strokeStyle = dark ? 'rgba(10,14,22,.85)' : 'rgba(255,255,255,.9)'; ctx.strokeText(t, p[0], p[1] - 0.5); ctx.fillStyle = dark ? '#f1f4fa' : '#1c2230'; ctx.fillText(t, p[0], p[1] - 0.5); });
      });
      ctx.restore();
    }
    /* ----- picking ----- */
    pxRadius(r, depth) { const cam = this.cam, t = Math.tan(cam.fov / 2); return cam.ortho ? (r * cam.H) / (2 * cam.dist * t) : (r * cam.H) / (2 * depth * t); }
    pick(sx, sy, tol) {
      const m = this.mol, G = this.geo; if (!m || !G || !G.pickR) return { atom: -1, bond: -1 };
      tol = tol == null ? 4 : tol; let best = -1, bd = 1e9;
      for (let i = 0; i < m.atoms.length; i++) {
        const r = G.pickR[i]; if (!r || m.atoms[i].hid) continue;
        const a = m.atoms[i], p = this.cam.project([a.x, a.y, a.z]); if (p[2] <= 0.1) continue;
        const rp = Math.max(this.pxRadius(r, p[2]), 3) + tol, dx = p[0] - sx, dy = p[1] - sy, d2 = dx * dx + dy * dy;
        if (d2 <= rp * rp && p[2] - r < bd) { bd = p[2] - r; best = i; }
      }
      let bb = -1;
      if (best < 0) {
        let bdist = 1e9;
        for (const [k, rb] of G.bondSeg) {
          const b = m.bonds[k]; if (m.atoms[b.a].hid || m.atoms[b.b].hid) continue;
          const p = this.cam.project(m.pos(b.a)), q = this.cam.project(m.pos(b.b));
          const vx = q[0] - p[0], vy = q[1] - p[1], L2 = vx * vx + vy * vy || 1; let t = ((sx - p[0]) * vx + (sy - p[1]) * vy) / L2; t = Math.max(0, Math.min(1, t));
          const dx = p[0] + vx * t - sx, dy = p[1] + vy * t - sy, d = Math.hypot(dx, dy);
          const rp = Math.max(this.pxRadius(rb, (p[2] + q[2]) / 2), 2.5) + tol;
          if (d <= rp && d < bdist) { bdist = d; bb = k; }
        }
      }
      return { atom: best, bond: bb };
    }
    /** atoms inside a screen rectangle */
    pickRect(x0, y0, x1, y1) {
      const m = this.mol, G = this.geo, out = []; if (!m || !G || !G.pickR) return out;
      const lx = Math.min(x0, x1), hx = Math.max(x0, x1), ly = Math.min(y0, y1), hy = Math.max(y0, y1);
      m.atoms.forEach((a, i) => { if (a.hid || !G.pickR[i]) return; const p = this.cam.project([a.x, a.y, a.z]); if (p[0] >= lx && p[0] <= hx && p[1] >= ly && p[1] <= hy) out.push(i); });
      return out;
    }
    /* ----- export ----- */
    snapshot(scale, transparent) {
      return new Promise((resolve) => {
        const prev = this.forcedRatio; this.exporting = true;
        const max = Math.min(8192, this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE) || 4096);
        this.forcedRatio = Math.max(1, Math.min(scale, max / Math.max(this.canvas.clientWidth, this.canvas.clientHeight)));
        this.draw(!!transparent);
        const oc = document.createElement('canvas'); oc.width = this.canvas.width; oc.height = this.canvas.height;
        const x = oc.getContext('2d'); x.drawImage(this.canvas, 0, 0); x.drawImage(this.ov, 0, 0);
        this.forcedRatio = prev; this.exporting = false; this.invalidate(false);
        oc.toBlob((b) => resolve(b), 'image/png');
      });
    }
    toOBJ() {
      const G = this.geo; if (!G) return '';
      const lines = ['# MoleculeScale model'], vb = { n: 1 };
      const ico = icosphere(2), cy = cylinderMesh(12);
      const emit = (p, nrm) => {};
      const addMesh = (pos, idx, xf) => {
        const base = vb.n; for (let i = 0; i < pos.length; i += 3) { const q = xf([pos[i], pos[i + 1], pos[i + 2]]); lines.push('v ' + q.map((x) => x.toFixed(4)).join(' ')); vb.n++; }
        for (let i = 0; i < idx.length; i += 3) lines.push('f ' + (base + idx[i]) + ' ' + (base + idx[i + 1]) + ' ' + (base + idx[i + 2]));
      };
      for (let i = 0; i < G.sph.length; i += 8) { const c = G.sph.slice(i, i + 4); lines.push('o atom' + i / 8); addMesh(ico.pos, ico.idx, (p) => [c[0] + p[0] * c[3], c[1] + p[1] * c[3], c[2] + p[2] * c[3]]); }
      for (let i = 0; i < G.cyl.length; i += 12) {
        const a = G.cyl.slice(i, i + 3), r = G.cyl[i + 3], b = G.cyl.slice(i + 4, i + 7); const d = V.sub(b, a), L = V.len(d) || 1e-5, z = V.mul(d, 1 / L);
        const xx = V.norm(V.cross(Math.abs(z[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0], z)), yy = V.cross(z, xx);
        lines.push('o bond' + i / 12); addMesh(cy.pos.filter((_, k) => k % 6 < 3), cy.idx, (p) => V.add(a, V.add(V.mul(xx, p[0] * r), V.add(V.mul(yy, p[1] * r), V.mul(z, p[2] * L)))));
      }
      [...G.opaque, ...G.trans].forEach((ms, k) => { lines.push('o mesh' + k); const base = vb.n; for (let i = 0; i < ms.pos.length; i += 3) { lines.push('v ' + [ms.pos[i], ms.pos[i + 1], ms.pos[i + 2]].map((x) => x.toFixed(4)).join(' ')); vb.n++; } for (let i = 0; i < ms.idx.length; i += 3) lines.push('f ' + (base + ms.idx[i]) + ' ' + (base + ms.idx[i + 1]) + ' ' + (base + ms.idx[i + 2])); });
      return lines.join('\n') + '\n';
    }
  }
  MS.Renderer = Renderer;
})();
