/* Geometry builders: colour schemes, cartoon ribbons, scalar fields and marching-tetrahedra isosurfaces. */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});
  const EL = MS.EL, V = MS.V;

  const CHAIN_PAL = ['#4f8cff', '#ff7a59', '#34c98b', '#f4b63f', '#b36bff', '#27c1d6', '#ef5f8c', '#8fb339', '#8b95a7', '#d2691e'];
  const hex2 = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const PAL = CHAIN_PAL.map(hex2);
  const SS_COL = { H: hex2('#ff5d73'), E: hex2('#ffc83d'), C: hex2('#a9b4c6') };
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const RDBU = (t) => { // t in [-1,1]: red (neg) -> white -> blue (pos)
    t = Math.max(-1, Math.min(1, t));
    return t < 0 ? lerp3([1, 1, 1], [0.93, 0.18, 0.22], -t) : lerp3([1, 1, 1], [0.16, 0.38, 0.95], t);
  };
  const VIRIDIS = [[0.27, 0.0, 0.33], [0.23, 0.32, 0.55], [0.13, 0.57, 0.55], [0.37, 0.79, 0.38], [0.99, 0.91, 0.14]];
  const ramp = (t) => { t = Math.max(0, Math.min(1, t)) * (VIRIDIS.length - 1); const i = Math.min(VIRIDIS.length - 2, Math.floor(t)); return lerp3(VIRIDIS[i], VIRIDIS[i + 1], t - i); };
  const HYDRO = new Set(['ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PHE', 'TRP', 'PRO', 'GLY', 'CYS']);
  const POLAR = new Set(['SER', 'THR', 'ASN', 'GLN', 'TYR', 'HIS']);
  const POS = new Set(['LYS', 'ARG']), NEG = new Set(['ASP', 'GLU']);

  /** colour of atom i for a scheme. ctx: {uniform:[r,g,b], classic:bool, nRes, bmax} */
  function atomColor(scheme, m, i, ctx) {
    const a = m.atoms[i], el = EL[a.e];
    switch (scheme) {
      case 'element': return ctx.classic ? el.col : el.modern;
      case 'uniform': return ctx.uniform;
      case 'chain': { if (a.r < 0) return ctx.classic ? el.col : el.modern; const ch = m.res[a.r].chain.charCodeAt(0); return a.e === 6 || a.e === 1 ? PAL[ch % PAL.length] : (ctx.classic ? el.col : el.modern); }
      case 'carbon-chain': { if (a.e !== 6 || a.r < 0) return ctx.classic ? el.col : el.modern; return PAL[m.res[a.r].chain.charCodeAt(0) % PAL.length]; }
      case 'residue': { if (a.r < 0) return el.modern; const n = m.res[a.r].name; return HYDRO.has(n) ? hex2('#8e9aae') : POLAR.has(n) ? hex2('#34c98b') : POS.has(n) ? hex2('#4f8cff') : NEG.has(n) ? hex2('#ff5d73') : m.res[a.r].water ? hex2('#7ec8ff') : hex2('#f4b63f'); }
      case 'ss': return a.r >= 0 ? SS_COL[m.res[a.r].ss || 'C'] : (ctx.classic ? el.col : el.modern);
      case 'rainbow': { if (a.r < 0) return ctx.classic ? el.col : el.modern; const t = a.r / Math.max(1, m.res.length - 1); const h = (1 - t) * 0.72; return hsv(h, 0.62, 0.95); }
      case 'index': return hsv((i / Math.max(1, m.atoms.length)) * 0.8, 0.6, 0.95);
      case 'bfactor': return ramp(ctx.bmax > 0 ? (1 - Math.min(1, a.b / ctx.bmax)) : 0.5);
      case 'charge': return RDBU(-(a.pc || 0) * 2.2);
      case 'hybrid': return a.e === 1 ? [0.92, 0.94, 0.98] : [0.4, 0.55, 0.9];
      default: return el.modern;
    }
  }
  function hsv(h, s, v) {
    const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6];
  }

  /* ---------------- cartoon ---------------- */
  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return [0, 1, 2].map((k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
  }
  function buildCartoon(m, inScope, scheme, ctx) {
    const SUB = 7, SIDES = 14, mesh = { pos: [], nrm: [], col: [], idx: [] };
    // collect CA, O per residue (in order)
    const chains = [];
    let cur = null, lastCA = null;
    const caOf = new Map(), oOf = new Map();
    m.atoms.forEach((a, i) => { if (a.r >= 0 && m.res[a.r].aa) { if (a.nm === 'CA') caOf.set(a.r, i); else if (a.nm === 'O' || a.nm === 'OT1') oOf.set(a.r, i); } });
    m.res.forEach((r, ri) => {
      if (!caOf.has(ri) || !inScope(caOf.get(ri))) { cur = null; return; }
      const ca = m.pos(caOf.get(ri));
      if (!cur || r.chain !== cur.chain || (lastCA && V.len(V.sub(ca, lastCA)) > 4.6)) { cur = { chain: r.chain, res: [] }; chains.push(cur); }
      cur.res.push({ ri, ca, o: oOf.has(ri) ? m.pos(oOf.get(ri)) : null, ss: r.ss || 'C' }); lastCA = ca;
    });
    chains.forEach((ch) => {
      const R = ch.res; if (R.length < 2) return;
      const P = R.map((r) => r.ca);
      const pts = [], info = [];
      for (let i = 0; i < R.length - 1; i++) {
        const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(R.length - 1, i + 2)];
        for (let s = 0; s < SUB; s++) {
          const t = s / SUB; pts.push(catmull(p0, p1, p2, p3, t));
          const near = t < 0.5 ? i : i + 1; info.push({ r: near, f: i + t });
        }
      }
      pts.push(P[R.length - 1]); info.push({ r: R.length - 1, f: R.length - 1 });
      const n = pts.length;
      // tangents
      const T = pts.map((p, i) => V.norm(V.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)])));
      // width vectors from carbonyl directions (smoothed, sign-consistent)
      const Wd = []; let prev = null;
      for (let i = 0; i < n; i++) {
        const fi = info[i].f, a = Math.floor(fi), b = Math.min(R.length - 1, a + 1), t = fi - a;
        const dirOf = (k) => { const r = R[k]; if (!r.o) return null; const d = V.sub(r.o, r.ca); return d; };
        const da = dirOf(a), db = dirOf(b);
        let d = da && db ? V.add(V.mul(da, 1 - t), V.mul(db, t)) : (da || db || V.perp(T[i]));
        d = V.sub(d, V.mul(T[i], V.dot(d, T[i]))); if (V.len(d) < 1e-3) d = V.perp(T[i]);
        d = V.norm(d);
        if (prev && V.dot(d, prev) < 0) d = V.mul(d, -1);
        Wd.push(d); prev = d;
      }
      // smooth width vectors
      for (let pass = 0; pass < 2; pass++) for (let i = 1; i < n - 1; i++) { let d = V.add(V.add(Wd[i - 1], Wd[i]), Wd[i + 1]); d = V.sub(d, V.mul(T[i], V.dot(d, T[i]))); Wd[i] = V.norm(d); }
      // profile
      const wArr = new Array(n), hArr = new Array(n);
      for (let i = 0; i < n; i++) {
        const r = R[info[i].r], ss = r.ss;
        let w = 0.2, h = 0.2;
        if (ss === 'H') { w = 1.05; h = 0.2; } else if (ss === 'E') { w = 1.05; h = 0.19; }
        if (ss === 'E') { // arrow head over the last residue span of a strand
          const k = info[i].r; const last = k === R.length - 1 || R[k + 1].ss !== 'E';
          if (last) { const f = info[i].f - (k - 0.5); const t = Math.min(1, Math.max(0, f)); if (info[i].f >= k - 0.5) w = 1.9 * (1 - t) + 0.12; }
        }
        wArr[i] = w; hArr[i] = h;
      }
      for (let pass = 0; pass < 2; pass++) {
        const w2 = wArr.slice(), h2 = hArr.slice();
        for (let i = 1; i < n - 1; i++) { if (wArr[i] > wArr[i - 1] + 0.5 || wArr[i] < wArr[i - 1] - 0.5 || wArr[i] > wArr[i + 1] + 0.5) continue; w2[i] = (wArr[i - 1] + wArr[i] + wArr[i + 1]) / 3; h2[i] = (hArr[i - 1] + hArr[i] + hArr[i + 1]) / 3; }
        for (let i = 0; i < n; i++) { wArr[i] = w2[i]; hArr[i] = h2[i]; }
      }
      const base = mesh.pos.length / 3;
      for (let i = 0; i < n; i++) {
        const nrm = Wd[i], bn = V.norm(V.cross(T[i], nrm)); const r = R[info[i].r];
        const sel = m.sel.has(caOf.get(r.ri));
        let c = scheme === 'ss' ? SS_COL[r.ss] : scheme === 'rainbow' ? hsv((1 - info[i].f / Math.max(1, R.length - 1)) * 0.72, 0.62, 0.95) : scheme === 'uniform' ? ctx.uniform : scheme === 'bfactor' ? atomColor('bfactor', m, caOf.get(r.ri), ctx) : scheme === 'residue' ? atomColor('residue', m, caOf.get(r.ri), ctx) : PAL[ch.chain.charCodeAt(0) % PAL.length];
        if (sel) c = lerp3(c, [0.15, 0.45, 1], 0.55);
        for (let s = 0; s < SIDES; s++) {
          const th = (s / SIDES) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
          const w = wArr[i], h = hArr[i];
          const p = V.add(pts[i], V.add(V.mul(nrm, cs * w), V.mul(bn, sn * h)));
          const nn = V.norm(V.add(V.mul(nrm, cs / Math.max(w, 0.05)), V.mul(bn, sn / Math.max(h, 0.05))));
          mesh.pos.push(p[0], p[1], p[2]); mesh.nrm.push(nn[0], nn[1], nn[2]); mesh.col.push(c[0], c[1], c[2], 1);
        }
      }
      for (let i = 0; i < n - 1; i++) for (let s = 0; s < SIDES; s++) {
        const a = base + i * SIDES + s, b = base + i * SIDES + (s + 1) % SIDES, c = a + SIDES, d = b + SIDES;
        mesh.idx.push(a, c, b, b, c, d);
      }
      // end caps
      [[0, -1], [n - 1, 1]].forEach(([i, sg]) => {
        const cidx = mesh.pos.length / 3; const p = pts[i], tn = V.mul(T[i], sg);
        const rr = R[info[i].r]; const c = scheme === 'ss' ? SS_COL[rr.ss] : PAL[ch.chain.charCodeAt(0) % PAL.length];
        mesh.pos.push(p[0], p[1], p[2]); mesh.nrm.push(tn[0], tn[1], tn[2]); mesh.col.push(c[0], c[1], c[2], 1);
        for (let s = 0; s < SIDES; s++) { const a = base + i * SIDES + s, b = base + i * SIDES + (s + 1) % SIDES; if (sg < 0) mesh.idx.push(cidx, b, a); else mesh.idx.push(cidx, a, b); }
      });
    });
    return mesh.idx.length ? mesh : null;
  }

  /* ---------------- scalar fields ---------------- */
  /** gaussian-blob density over the atoms in `list`. Returns grid {nx,ny,nz,o:[x,y,z],h,data} */
  function atomField(m, list, opt) {
    const probe = opt.probe || 0, sc = opt.scale || 1;
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; const rad = {};
    list.forEach((i) => { const a = m.atoms[i]; const r = (EL[a.e].vdw * sc + probe) * 2.0; rad[i] = r; mn = [Math.min(mn[0], a.x - r), Math.min(mn[1], a.y - r), Math.min(mn[2], a.z - r)]; mx = [Math.max(mx[0], a.x + r), Math.max(mx[1], a.y + r), Math.max(mx[2], a.z + r)]; });
    const ext = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
    let h = opt.h || 0.3; const maxPts = opt.maxPts || 2.2e6;
    while ((ext[0] / h + 1) * (ext[1] / h + 1) * (ext[2] / h + 1) > maxPts) h *= 1.12;
    const nx = Math.ceil(ext[0] / h) + 1, ny = Math.ceil(ext[1] / h) + 1, nz = Math.ceil(ext[2] / h) + 1;
    const data = new Float32Array(nx * ny * nz), k = opt.sharp || 2.2;
    list.forEach((i) => {
      const a = m.atoms[i], R = EL[a.e].vdw * sc + probe, cut = R * 2.0, R2 = R * R;
      const x0 = Math.max(0, Math.floor((a.x - cut - mn[0]) / h)), x1 = Math.min(nx - 1, Math.ceil((a.x + cut - mn[0]) / h));
      const y0 = Math.max(0, Math.floor((a.y - cut - mn[1]) / h)), y1 = Math.min(ny - 1, Math.ceil((a.y + cut - mn[1]) / h));
      const z0 = Math.max(0, Math.floor((a.z - cut - mn[2]) / h)), z1 = Math.min(nz - 1, Math.ceil((a.z + cut - mn[2]) / h));
      for (let ix = x0; ix <= x1; ix++) { const dx = mn[0] + ix * h - a.x; for (let iy = y0; iy <= y1; iy++) { const dy = mn[1] + iy * h - a.y; const dxy = dx * dx + dy * dy; if (dxy > cut * cut) continue; let o = (ix * ny + iy) * nz; for (let iz = z0; iz <= z1; iz++) { const dz = mn[2] + iz * h - a.z; const d2 = dxy + dz * dz; if (d2 < cut * cut) data[o + iz] += Math.exp(k * (1 - d2 / R2)); } } }
    });
    return { nx, ny, nz, origin: mn, h, data, axes: [[h, 0, 0], [0, h, 0], [0, 0, h]] };
  }

  const TETS = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
  const CORNER = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  /** marching tetrahedra. g: grid with axes; inside where value > iso (sign=+1) or value < iso (sign=-1) */
  function isoSurface(g, iso, sign, colorFn, outMesh) {
    const { nx, ny, nz, data, origin, axes } = g;
    const mesh = outMesh || { pos: [], nrm: [], col: [], idx: [] };
    const val = (x, y, z) => sign * (data[(x * ny + y) * nz + z] - iso);
    const gradAt = (x, y, z) => {
      const xa = Math.max(0, x - 1), xb = Math.min(nx - 1, x + 1), ya = Math.max(0, y - 1), yb = Math.min(ny - 1, y + 1), za = Math.max(0, z - 1), zb = Math.min(nz - 1, z + 1);
      return [(data[(xb * ny + y) * nz + z] - data[(xa * ny + y) * nz + z]) / (xb - xa || 1), (data[(x * ny + yb) * nz + z] - data[(x * ny + ya) * nz + z]) / (yb - ya || 1), (data[(x * ny + y) * nz + zb] - data[(x * ny + y) * nz + za]) / (zb - za || 1)];
    };
    const toWorld = (fx, fy, fz) => [origin[0] + fx * axes[0][0] + fy * axes[1][0] + fz * axes[2][0], origin[1] + fx * axes[0][1] + fy * axes[1][1] + fz * axes[2][1], origin[2] + fx * axes[0][2] + fy * axes[1][2] + fz * axes[2][2]];
    // gradient in grid space -> world: solve with inverse transpose of axes (approx: use axes columns for orthogonal grids)
    const lens = axes.map((a) => V.len(a));
    const toWorldGrad = (gr) => {
      const w = [0, 0, 0];
      for (let k = 0; k < 3; k++) { const a = axes[k]; const l2 = lens[k] * lens[k]; for (let c = 0; c < 3; c++) w[c] += gr[k] * a[c] / l2; }
      return w;
    };
    const cache = new Map(), tot = nx * ny * nz;
    const vert = (x1, y1, z1, x2, y2, z2, v1, v2) => {
      const k1 = (x1 * ny + y1) * nz + z1, k2 = (x2 * ny + y2) * nz + z2, key = k1 < k2 ? k1 * tot + k2 : k2 * tot + k1;
      let id = cache.get(key); if (id !== undefined) return id;
      const t = v1 / (v1 - v2);
      const p = toWorld(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, z1 + (z2 - z1) * t);
      const g1 = gradAt(x1, y1, z1), g2 = gradAt(x2, y2, z2);
      let n = toWorldGrad([g1[0] + (g2[0] - g1[0]) * t, g1[1] + (g2[1] - g1[1]) * t, g1[2] + (g2[2] - g1[2]) * t]);
      n = V.norm(V.mul(n, -sign));
      const c = colorFn ? colorFn(p, n) : [0.7, 0.7, 0.9, 1];
      id = mesh.pos.length / 3; mesh.pos.push(p[0], p[1], p[2]); mesh.nrm.push(n[0], n[1], n[2]); mesh.col.push(c[0], c[1], c[2], c[3] === undefined ? 1 : c[3]);
      cache.set(key, id); return id;
    };
    const tri = (a, b, c) => {
      // orient to agree with the outward normal
      const pa = [mesh.pos[a * 3], mesh.pos[a * 3 + 1], mesh.pos[a * 3 + 2]], pb = [mesh.pos[b * 3], mesh.pos[b * 3 + 1], mesh.pos[b * 3 + 2]], pc = [mesh.pos[c * 3], mesh.pos[c * 3 + 1], mesh.pos[c * 3 + 2]];
      const gn = V.cross(V.sub(pb, pa), V.sub(pc, pa)); const nn = [mesh.nrm[a * 3] + mesh.nrm[b * 3] + mesh.nrm[c * 3], mesh.nrm[a * 3 + 1] + mesh.nrm[b * 3 + 1] + mesh.nrm[c * 3 + 1], mesh.nrm[a * 3 + 2] + mesh.nrm[b * 3 + 2] + mesh.nrm[c * 3 + 2]];
      if (V.dot(gn, nn) >= 0) mesh.idx.push(a, b, c); else mesh.idx.push(a, c, b);
    };
    const cv = new Float32Array(8);
    for (let x = 0; x < nx - 1; x++) for (let y = 0; y < ny - 1; y++) for (let z = 0; z < nz - 1; z++) {
      let any = 0, all = 0;
      for (let c = 0; c < 8; c++) { const o = CORNER[c]; const v = val(x + o[0], y + o[1], z + o[2]); cv[c] = v; if (v > 0) any++; }
      if (any === 0 || any === 8) continue;
      for (const tt of TETS) {
        const idx = tt; let mask = 0; for (let k = 0; k < 4; k++) if (cv[idx[k]] > 0) mask |= 1 << k;
        if (mask === 0 || mask === 15) continue;
        const P = idx.map((c) => [x + CORNER[c][0], y + CORNER[c][1], z + CORNER[c][2], cv[c]]);
        const ins = [], out = []; for (let k = 0; k < 4; k++) (mask & (1 << k) ? ins : out).push(P[k]);
        const E = (a, b) => vert(a[0], a[1], a[2], b[0], b[1], b[2], a[3], b[3]);
        if (ins.length === 1) tri(E(ins[0], out[0]), E(ins[0], out[1]), E(ins[0], out[2]));
        else if (out.length === 1) tri(E(out[0], ins[0]), E(out[0], ins[1]), E(out[0], ins[2]));
        else { const a = E(ins[0], out[0]), b = E(ins[0], out[1]), c = E(ins[1], out[1]), d = E(ins[1], out[0]); tri(a, b, c); tri(a, c, d); }
      }
    }
    return mesh;
  }

  /** nearest-atom lookup for colouring vertices */
  function atomGrid(m, list) {
    const cs = 4, cells = new Map(), key = (x, y, z) => x + ',' + y + ',' + z;
    list.forEach((i) => { const a = m.atoms[i]; const k = key(Math.floor(a.x / cs), Math.floor(a.y / cs), Math.floor(a.z / cs)); (cells.get(k) || cells.set(k, []).get(k)).push(i); });
    return (p) => {
      const cx = Math.floor(p[0] / cs), cy = Math.floor(p[1] / cs), cz = Math.floor(p[2] / cs); let best = -1, bd = 1e9;
      for (let r = 1; r <= 3 && best < 0; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
        const l = cells.get(key(cx + dx, cy + dy, cz + dz)); if (!l) continue;
        for (const i of l) { const a = m.atoms[i]; const d = (a.x - p[0]) ** 2 + (a.y - p[1]) ** 2 + (a.z - p[2]) ** 2 - (EL[a.e].vdw) ** 2; if (d < bd) { bd = d; best = i; } }
      }
      return best;
    };
  }

  /** build a molecular surface mesh for a layer */
  function surfaceMesh(m, list, layer, ctx) {
    if (!list.length) return null;
    const type = layer.surf || 'smooth';
    const opt = type === 'sas' ? { probe: 1.4, scale: 1, sharp: 3.2, h: layer.res || 0.32 } : type === 'vdw' ? { probe: 0, scale: 1, sharp: 3.6, h: layer.res || 0.28 } : { probe: 0, scale: 1.05, sharp: 1.6, h: layer.res || 0.3 };
    const g = atomField(m, list, opt);
    const near = atomGrid(m, list);
    const alpha = layer.opacity == null ? 0.72 : layer.opacity;
    const scheme = layer.color || 'element';
    let pot = null;
    if (scheme === 'esp') {
      MS.chem.gasteiger(m);
      const pos = list.map((i) => [m.atoms[i].x, m.atoms[i].y, m.atoms[i].z, m.atoms[i].pc]);
      pot = (p) => { let s = 0; for (const q of pos) { const d = Math.max(1.2, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])); s += q[3] / d; } return s; };
    }
    const colorFn = (p) => {
      if (pot) { const c = RDBU(-pot(p) * 3.2); return [c[0], c[1], c[2], alpha]; }
      if (scheme === 'uniform') return [ctx.uniform[0], ctx.uniform[1], ctx.uniform[2], alpha];
      const i = near(p); const c = i < 0 ? [0.7, 0.7, 0.7] : atomColor(scheme === 'esp' ? 'element' : scheme, m, i, ctx);
      return [c[0], c[1], c[2], alpha];
    };
    const mesh = isoSurface(g, 1.0, 1, colorFn);
    return mesh.idx.length ? mesh : null;
  }

  /** orbital / density isosurfaces from a volume (positive and negative lobes) */
  function volumeMesh(vol, iso, alpha, colors) {
    const g = { nx: vol.nx, ny: vol.ny, nz: vol.nz, origin: vol.origin, axes: vol.axes, data: vol.data };
    const pc = colors ? colors[0] : [0.16, 0.42, 0.98], nc = colors ? colors[1] : [0.95, 0.26, 0.28];
    const mesh = { pos: [], nrm: [], col: [], idx: [] };
    isoSurface(g, iso, 1, () => [pc[0], pc[1], pc[2], alpha], mesh);
    isoSurface(g, -iso, -1, () => [nc[0], nc[1], nc[2], alpha], mesh);
    return mesh.idx.length ? mesh : null;
  }

  /** analytic hydrogen-like orbital on a grid (real spherical harmonics) */
  function orbitalVolume(n, l, mIdx, zeff) {
    const N = 60, L = n * n * 1.6 + 5, h = (2 * L) / (N - 1); zeff = zeff || 1;
    const data = new Float32Array(N * N * N);
    const a0 = 1; // Angstrom-scaled; looks identical in shape
    for (let ix = 0; ix < N; ix++) for (let iy = 0; iy < N; iy++) for (let iz = 0; iz < N; iz++) {
      const x = -L + ix * h, y = -L + iy * h, z = -L + iz * h, r = Math.sqrt(x * x + y * y + z * z) || 1e-6;
      const rho = (2 * zeff * r) / (n * 0.529 * a0 * 1.0);
      let R;
      if (n === 1) R = Math.exp(-rho / 2);
      else if (n === 2) R = l === 0 ? (2 - rho) * Math.exp(-rho / 2) : rho * Math.exp(-rho / 2);
      else if (n === 3) R = l === 0 ? (27 - 18 * rho + 2 * rho * rho) * Math.exp(-rho / 2) : l === 1 ? rho * (6 - rho) * Math.exp(-rho / 2) : rho * rho * Math.exp(-rho / 2);
      else R = rho * rho * rho * Math.exp(-rho / 2); // 4f
      const c = x / r, d = y / r, e = z / r; let Y;
      if (l === 0) Y = 0.282;
      else if (l === 1) Y = 0.489 * [e, c, d][mIdx];
      else if (l === 2) Y = [0.315 * (3 * e * e - 1), 1.093 * c * e, 1.093 * d * e, 0.546 * (c * c - d * d), 1.093 * c * d][mIdx];
      else Y = [0.373 * e * (5 * e * e - 3), 0.457 * c * (5 * e * e - 1), 0.457 * d * (5 * e * e - 1), 1.445 * e * (c * c - d * d), 2.89 * c * d * e, 0.59 * c * (c * c - 3 * d * d), 0.59 * d * (3 * c * c - d * d)][mIdx];
      data[(ix * N + iy) * N + iz] = R * Y;
    }
    let mx = 0; for (let i = 0; i < data.length; i++) mx = Math.max(mx, Math.abs(data[i]));
    for (let i = 0; i < data.length; i++) data[i] /= mx;
    return { nx: N, ny: N, nz: N, origin: [-L, -L, -L], axes: [[h, 0, 0], [0, h, 0], [0, 0, h]], data };
  }

  MS.g3 = { atomColor, buildCartoon, atomField, isoSurface, surfaceMesh, volumeMesh, orbitalVolume, hex2, PAL, SS_COL, RDBU, hsv, lerp3 };
})();
