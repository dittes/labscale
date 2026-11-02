/* Molecule model and chemistry helpers: bonding, bond orders, hydrogens, rings, charges, measurements. */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});
  const EL = MS.EL;
  const D2R = Math.PI / 180;

  /* ---------- vector helpers (plain arrays) ---------- */
  const V = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    perp: (a) => { const t = Math.abs(a[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]; return V.norm(V.cross(a, t)); },
  };
  MS.V = V;

  /* ---------- valence tables ---------- */
  const VAL = { 1: [1], 3: [1], 5: [3], 6: [4], 7: [3], 8: [2], 9: [1], 11: [1], 12: [2], 14: [4], 15: [3, 5], 16: [2, 4, 6], 17: [1], 19: [1], 20: [2], 32: [4], 33: [3, 5], 34: [2, 4, 6], 35: [1], 53: [1, 3, 5] };
  const ORGANIC = new Set([5, 6, 7, 8, 9, 14, 15, 16, 17, 33, 34, 35, 53]);
  MS.valList = (z, q) => VAL[z - (q || 0)] || (q ? null : VAL[z]) || null;

  /* ---------- Mol ---------- */
  class Mol {
    constructor() {
      this.atoms = []; this.bonds = []; this.res = []; this.cell = null; this.frames = []; this.frame = 0;
      this.title = ''; this.vol = null; this.ver = 0; this.sel = new Set(); this.meta = {};
      this._nb = null; this._rings = null;
    }
    touch() { this.ver++; this._nb = null; this._rings = null; }
    addAtom(z, x, y, z2, extra) {
      this.atoms.push(Object.assign({ e: z, x, y, z: z2, q: 0, pc: 0, nm: '', r: -1, b: 0 }, extra || {}));
      this.touch(); return this.atoms.length - 1;
    }
    addBond(a, b, o) {
      if (a === b || a == null || b == null) return -1;
      const k = this.bondIndex(a, b);
      if (k >= 0) { if (o) this.bonds[k].o = o; return k; }
      this.bonds.push({ a, b, o: o || 1 }); this.touch(); return this.bonds.length - 1;
    }
    bondIndex(a, b) { const nb = this.nb()[a]; for (const n of nb) if (n.j === b) return n.b; return -1; }
    nb() {
      if (this._nb) return this._nb;
      const nb = this.atoms.map(() => []);
      this.bonds.forEach((bd, k) => { nb[bd.a].push({ j: bd.b, b: k }); nb[bd.b].push({ j: bd.a, b: k }); });
      return (this._nb = nb);
    }
    /** remove atoms (Set or array of indices); returns old->new index map (-1 = removed) */
    removeAtoms(list) {
      const rm = new Set(list); if (!rm.size) return null;
      const map = new Int32Array(this.atoms.length); let n = 0;
      for (let i = 0; i < this.atoms.length; i++) map[i] = rm.has(i) ? -1 : n++;
      this.atoms = this.atoms.filter((_, i) => map[i] >= 0);
      this.bonds = this.bonds.filter((b) => map[b.a] >= 0 && map[b.b] >= 0).map((b) => ({ a: map[b.a], b: map[b.b], o: b.o }));
      const s = new Set(); this.sel.forEach((i) => { if (map[i] >= 0) s.add(map[i]); }); this.sel = s;
      if (this.frames.length) this.frames = this.frames.map((f) => { const g = new Float32Array(n * 3); let k = 0; for (let i = 0; i < map.length; i++) if (map[i] >= 0) { g[k * 3] = f[i * 3]; g[k * 3 + 1] = f[i * 3 + 1]; g[k * 3 + 2] = f[i * 3 + 2]; k++; } return g; });
      this.touch(); return map;
    }
    pos(i) { const a = this.atoms[i]; return [a.x, a.y, a.z]; }
    setPos(i, p) { const a = this.atoms[i]; a.x = p[0]; a.y = p[1]; a.z = p[2]; }
    coords() { const c = new Float64Array(this.atoms.length * 3); this.atoms.forEach((a, i) => { c[i * 3] = a.x; c[i * 3 + 1] = a.y; c[i * 3 + 2] = a.z; }); return c; }
    setCoords(c) { for (let i = 0; i < this.atoms.length; i++) { const a = this.atoms[i]; a.x = c[i * 3]; a.y = c[i * 3 + 1]; a.z = c[i * 3 + 2]; } }
    snapshot() {
      return structuredClone({ atoms: this.atoms, bonds: this.bonds, res: this.res, cell: this.cell, title: this.title, sel: [...this.sel], meta: this.meta });
    }
    restore(s) {
      const c = structuredClone(s);
      this.atoms = c.atoms; this.bonds = c.bonds; this.res = c.res; this.cell = c.cell; this.title = c.title; this.sel = new Set(c.sel); this.meta = c.meta || {};
      this.frames = []; this.frame = 0; this.touch();
    }
    heavy() { return this.atoms.reduce((n, a) => n + (a.e > 1 ? 1 : 0), 0); }
    bbox(onlyIdx) {
      let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], n = 0;
      const each = (a) => { if (a.hid) return; n++; mn = [Math.min(mn[0], a.x), Math.min(mn[1], a.y), Math.min(mn[2], a.z)]; mx = [Math.max(mx[0], a.x), Math.max(mx[1], a.y), Math.max(mx[2], a.z)]; };
      if (onlyIdx) onlyIdx.forEach((i) => each(this.atoms[i])); else this.atoms.forEach(each);
      if (!n) return { c: [0, 0, 0], r: 5, n: 0 };
      const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
      let r = 0; const f = (a) => { if (!a.hid) r = Math.max(r, Math.hypot(a.x - c[0], a.y - c[1], a.z - c[2]) + EL[a.e].vdw * 0.6); };
      if (onlyIdx) onlyIdx.forEach((i) => f(this.atoms[i])); else this.atoms.forEach(f);
      return { c, r: Math.max(r, 1.5), n };
    }
    centroid(idx) {
      const l = idx ? [...idx] : this.atoms.map((_, i) => i); if (!l.length) return [0, 0, 0];
      let x = 0, y = 0, z = 0; l.forEach((i) => { const a = this.atoms[i]; x += a.x; y += a.y; z += a.z; });
      return [x / l.length, y / l.length, z / l.length];
    }
    translate(idx, d) { const l = idx ? [...idx] : this.atoms.map((_, i) => i); l.forEach((i) => { const a = this.atoms[i]; a.x += d[0]; a.y += d[1]; a.z += d[2]; }); }
    components() {
      const nb = this.nb(), comp = new Int32Array(this.atoms.length).fill(-1); let n = 0;
      for (let i = 0; i < this.atoms.length; i++) {
        if (comp[i] >= 0) continue; const st = [i]; comp[i] = n;
        while (st.length) { const k = st.pop(); for (const x of nb[k]) if (comp[x.j] < 0) { comp[x.j] = n; st.push(x.j); } }
        n++;
      }
      return { comp, n };
    }
  }
  MS.Mol = Mol;

  /* ---------- geometry measurements ---------- */
  MS.geom = {
    dist(m, i, j) { const a = m.atoms[i], b = m.atoms[j]; return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); },
    angle(m, i, j, k) {
      const u = V.sub(m.pos(i), m.pos(j)), v = V.sub(m.pos(k), m.pos(j));
      return Math.acos(Math.max(-1, Math.min(1, V.dot(u, v) / (V.len(u) * V.len(v) || 1)))) / D2R;
    },
    dihedral(m, i, j, k, l) {
      const b0 = V.sub(m.pos(i), m.pos(j)), b1 = V.norm(V.sub(m.pos(k), m.pos(j))), b2 = V.sub(m.pos(l), m.pos(k));
      const v = V.sub(b0, V.mul(b1, V.dot(b0, b1))), w = V.sub(b2, V.mul(b1, V.dot(b2, b1)));
      return Math.atan2(V.dot(V.cross(b1, v), w), V.dot(v, w)) / D2R;
    },
  };

  /* ---------- bond perception ---------- */
  MS.chem = {};
  const C = MS.chem;

  C.perceiveBonds = function (m, opts) {
    opts = opts || {};
    const tol = opts.tol == null ? 0.45 : opts.tol, A = m.atoms, n = A.length;
    const existing = new Set(m.bonds.map((b) => (b.a < b.b ? b.a * n + b.b : b.b * n + b.a)));
    if (opts.clear) { m.bonds = []; existing.clear(); }
    const cs = 4.2, cells = new Map();
    const key = (x, y, z) => x + ',' + y + ',' + z;
    A.forEach((a, i) => { const k = key(Math.floor(a.x / cs), Math.floor(a.y / cs), Math.floor(a.z / cs)); (cells.get(k) || cells.set(k, []).get(k)).push(i); });
    for (let i = 0; i < n; i++) {
      const a = A[i], cx = Math.floor(a.x / cs), cy = Math.floor(a.y / cs), cz = Math.floor(a.z / cs);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const l = cells.get(key(cx + dx, cy + dy, cz + dz)); if (!l) continue;
        for (const j of l) {
          if (j <= i) continue; const b = A[j];
          if (a.e === 1 && b.e === 1) continue;
          const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          if (d < 0.4) continue;
          const metal = !ORGANIC.has(a.e) && a.e !== 1 || !ORGANIC.has(b.e) && b.e !== 1;
          const lim = EL[a.e].cov + EL[b.e].cov + (metal ? tol + 0.1 : tol);
          if (d > lim) continue;
          if (a.e === 1 && b.e > 1 && d > EL[b.e].cov + 0.31 + 0.25) continue;
          if (existing.has(i * n + j)) continue;
          m.bonds.push({ a: i, b: j, o: 1 });
        }
      }
    }
    m.touch();
  };

  /** assign bond orders from geometry + valence (greedy, shortest bonds first) */
  C.perceiveOrders = function (m) {
    const A = m.atoms, nb = m.nb();
    m.bonds.forEach((b) => { b.o = 1; });
    const target = (i) => { const a = A[i]; const vl = MS.valList(a.e, a.q); if (!vl || !ORGANIC.has(a.e)) return 0; return vl[0]; };
    const deg = (i) => nb[i].length;
    const def = A.map((_, i) => Math.max(0, target(i) - deg(i)));
    const planar = (i) => {
      const l = nb[i]; if (l.length < 2) return null;
      if (l.length === 2) { const ang = MS.geom.angle(m, l[0].j, i, l[1].j); return ang > 160 ? 'sp' : ang > 108 ? 'sp2' : 'sp3'; }
      if (l.length === 3) { const u = V.sub(m.pos(l[0].j), m.pos(i)), v = V.sub(m.pos(l[1].j), m.pos(i)), w = V.sub(m.pos(l[2].j), m.pos(i)); const vol = Math.abs(V.dot(V.cross(u, v), w)) / (V.len(u) * V.len(v) * V.len(w) || 1); return vol < 0.18 ? 'sp2' : 'sp3'; }
      return 'sp3';
    };
    const cand = [];
    m.bonds.forEach((b, k) => {
      if (A[b.a].e === 1 || A[b.b].e === 1) return;
      const d = MS.geom.dist(m, b.a, b.b), r = d / (EL[A[b.a].e].cov + EL[A[b.b].e].cov);
      cand.push({ k, r });
    });
    cand.sort((x, y) => x.r - y.r);
    const hyb = A.map((_, i) => (ORGANIC.has(A[i].e) ? planar(i) : null));
    for (const c of cand) {
      const b = m.bonds[c.k];
      if (def[b.a] <= 0 || def[b.b] <= 0) continue;
      if (hyb[b.a] === 'sp3' || hyb[b.b] === 'sp3') continue;
      if (c.r > 0.96) continue;
      b.o = 2; def[b.a]--; def[b.b]--;
    }
    for (const c of cand) { // second pass: triples where linear and still short
      const b = m.bonds[c.k];
      if (b.o !== 2 || def[b.a] <= 0 || def[b.b] <= 0) continue;
      if (hyb[b.a] === 'sp' && hyb[b.b] === 'sp' && c.r < 0.88) { b.o = 3; def[b.a]--; def[b.b]--; }
    }
    m.touch();
  };

  C.hybrid = function (m, i) {
    const a = m.atoms[i], nb = m.nb()[i];
    if (a.e === 1) return 's';
    let dbl = 0, trp = 0, hasPi = false;
    for (const x of nb) { const o = m.bonds[x.b].o; if (o === 2) dbl++; else if (o === 3) trp++; }
    if (!ORGANIC.has(a.e) || a.e > 9 && a.e !== 14) return 'sp3';
    if (a.e > 8) return 'sp3';
    if (trp || dbl >= 2) return 'sp';
    if (dbl) return 'sp2';
    if (a.e === 5 && nb.length <= 3) return 'sp2';
    if (a.e === 7) { for (const x of nb) { const o = m.atoms[x.j]; if (o.e === 1) continue; const nn = m.nb()[x.j]; for (const y of nn) if (y.j !== i && m.bonds[y.b].o >= 2) hasPi = true; } if (hasPi && nb.length >= 2) return 'sp2'; }
    return 'sp3';
  };

  /* ---------- hydrogens ---------- */
  C.implicitH = function (m, i) {
    const a = m.atoms[i]; const vl = MS.valList(a.e, a.q); if (!vl || !ORGANIC.has(a.e) || a.e === 1) return 0;
    let s = 0; for (const x of m.nb()[i]) s += m.bonds[x.b].o;
    for (const v of vl) if (v >= s) return v - s;
    return 0;
  };
  const XH = { 6: 1.09, 7: 1.01, 8: 0.96, 16: 1.34, 15: 1.42, 5: 1.19, 14: 1.48 };
  const TET = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(V.norm);
  /** unit directions for n new substituents around atom i */
  C.missingDirs = function (m, i, n, geom) {
    const nbs = m.nb()[i].map((x) => V.norm(V.sub(m.pos(x.j), m.pos(i)))), out = [];
    const k = nbs.length;
    if (k === 0) return TET.slice(0, n);
    if (geom === 'sp') { return [V.mul(nbs[0], -1)]; }
    if (k === 1) {
      const u = nbs[0]; let ref = null;
      for (const x of m.nb()[m.nb()[i][0].j]) { if (x.j !== i) { const w = V.sub(m.pos(x.j), m.pos(m.nb()[i][0].j)); const wp = V.sub(w, V.mul(u, V.dot(w, u))); if (V.len(wp) > 1e-3) { ref = V.norm(wp); break; } } }
      let p = ref ? V.mul(ref, -1) : V.perp(u); const q = V.cross(u, p);
      const alpha = (geom === 'sp2' ? 120 : 109.47) * D2R;
      const phis = geom === 'sp2' ? [0, 180] : [0, 120, 240];
      for (let t = 0; t < n; t++) { const f = phis[t % phis.length] * D2R; out.push(V.add(V.mul(u, Math.cos(alpha)), V.add(V.mul(p, Math.sin(alpha) * Math.cos(f)), V.mul(q, Math.sin(alpha) * Math.sin(f))))); }
      return out;
    }
    if (k === 2) {
      let b = V.mul(V.add(nbs[0], nbs[1]), -1); if (V.len(b) < 1e-3) b = V.perp(nbs[0]); b = V.norm(b);
      if (geom === 'sp2' || n === 1 && geom !== 'sp3') return [b];
      let w = V.cross(nbs[0], nbs[1]); w = V.len(w) < 1e-3 ? V.perp(nbs[0]) : V.norm(w);
      const g = 54.74 * D2R; const d1 = V.add(V.mul(b, Math.cos(g)), V.mul(w, Math.sin(g))), d2 = V.add(V.mul(b, Math.cos(g)), V.mul(w, -Math.sin(g)));
      return n === 1 ? [d1] : [d1, d2];
    }
    const s = nbs.reduce((p, q) => V.add(p, q), [0, 0, 0]);
    return [V.len(s) < 1e-3 ? V.perp(nbs[0]) : V.norm(V.mul(s, -1))];
  };

  C.addHydrogens = function (m, only) {
    const start = m.atoms.length, idx = only ? [...only] : m.atoms.map((_, i) => i);
    let added = 0;
    for (const i of idx) {
      const a = m.atoms[i]; if (a.e === 1) continue;
      const h = C.implicitH(m, i); if (h <= 0) continue;
      const k = m.nb()[i].length; let hy = C.hybrid(m, i);
      if (hy === 'sp3' && (k + h) === 3) hy = 'sp2';
      if (hy === 'sp3' && (k + h) === 2) hy = 'sp';
      const geom = (k + h) <= 2 ? 'sp' : (k + h) === 3 ? 'sp2' : (hy === 'sp2' && (k + h) <= 3 ? 'sp2' : 'sp3');
      const dirs = C.missingDirs(m, i, h, geom), len = XH[a.e] || EL[a.e].cov + 0.31;
      const created = [];
      for (let t = 0; t < h && t < dirs.length; t++) {
        const d = dirs[t]; const hi = m.addAtom(1, a.x + d[0] * len, a.y + d[1] * len, a.z + d[2] * len, { r: a.r, nm: 'H', het: a.het });
        m.addBond(i, hi, 1); created.push(hi); added++;
      }
      m.touch();
    }
    return added;
  };
  C.removeHydrogens = function (m, only) {
    const nb = m.nb(); const rm = [];
    m.atoms.forEach((a, i) => { if (a.e === 1 && nb[i].length <= 1 && (!only || only.has(i))) rm.push(i); });
    m.removeAtoms(rm); return rm.length;
  };

  /* ---------- rings, aromaticity ---------- */
  C.rings = function (m) {
    if (m._rings) return m._rings;
    const nb = m.nb(), seen = new Set(), rings = [];
    for (let k = 0; k < m.bonds.length; k++) {
      const { a, b } = m.bonds[k]; if (m.atoms[a].e === 1 || m.atoms[b].e === 1) continue;
      // BFS from a to b avoiding bond k, depth <= 8
      const prev = new Map([[a, -1]]); let fr = [a], found = false;
      for (let d = 0; d < 8 && fr.length && !found; d++) {
        const nx = [];
        for (const u of fr) for (const x of nb[u]) {
          if (x.b === k || prev.has(x.j) || m.atoms[x.j].e === 1) continue;
          prev.set(x.j, u); if (x.j === b) { found = true; break; } nx.push(x.j);
        }
        fr = nx;
      }
      if (!found) continue;
      const path = []; let c = b; while (c !== -1) { path.push(c); c = prev.get(c); }
      const key = [...path].sort((p, q) => p - q).join(',');
      if (!seen.has(key)) { seen.add(key); rings.push(path); }
    }
    return (m._rings = rings);
  };
  C.aromaticRings = function (m) {
    const nb = m.nb();
    return C.rings(m).filter((r) => {
      if (r.length !== 5 && r.length !== 6) return false;
      let pi = 0; const set = new Set(r);
      for (const i of r) {
        const a = m.atoms[i]; let dbl = false;
        for (const x of nb[i]) { if (m.bonds[x.b].o === 2 && set.has(x.j)) dbl = true; else if (m.bonds[x.b].o >= 2 && !set.has(x.j)) return false; }
        if (dbl) pi += 1; else if (a.e === 7 && nb[i].length + C.implicitH(m, i) === 3 || a.e === 8 || a.e === 16) pi += 2; else return false;
      }
      return (pi - 2) % 4 === 0;
    });
  };
  C.ringSizeMap = function (m) { // atom -> smallest ring size
    const mp = new Map(); C.rings(m).forEach((r) => r.forEach((i) => { mp.set(i, Math.min(mp.get(i) || 99, r.length)); })); return mp;
  };

  /* ---------- formula, mass ---------- */
  C.counts = function (m, idx) {
    const c = {}; (idx ? [...idx] : m.atoms.map((_, i) => i)).forEach((i) => { const z = m.atoms[i].e; c[z] = (c[z] || 0) + 1; });
    return c;
  };
  C.formula = function (m, idx, html) {
    const c = C.counts(m, idx), order = [];
    const zs = Object.keys(c).map(Number);
    if (c[6]) { order.push(6); if (c[1]) order.push(1); zs.filter((z) => z !== 6 && z !== 1).sort((a, b) => EL[a].sym.localeCompare(EL[b].sym)).forEach((z) => order.push(z)); }
    else zs.sort((a, b) => EL[a].sym.localeCompare(EL[b].sym)).forEach((z) => order.push(z));
    return order.map((z) => EL[z].sym + (c[z] > 1 ? (html ? '<sub>' + c[z] + '</sub>' : c[z]) : '')).join('') || '—';
  };
  C.mass = function (m, idx) { return (idx ? [...idx] : m.atoms.map((_, i) => i)).reduce((s, i) => s + EL[m.atoms[i].e].mass, 0); };
  C.charge = function (m) { return m.atoms.reduce((s, a) => s + (a.q || 0), 0); };

  /* ---------- Gasteiger–Marsili partial charges ---------- */
  const GP = { H: [7.17, 6.24, -0.56], C3: [7.98, 9.18, 1.88], C2: [8.79, 9.32, 1.51], C1: [10.39, 9.45, 0.73], N3: [11.54, 10.82, 1.36], N2: [12.87, 11.15, 0.85], N1: [15.68, 11.7, -0.27], O3: [14.18, 12.92, 1.39], O2: [17.07, 13.79, 0.47], F: [14.66, 13.85, 2.31], Cl: [11.0, 9.69, 1.35], Br: [10.08, 8.47, 1.16], I: [9.9, 7.96, 0.96], S: [10.14, 9.13, 1.38], P: [8.9, 8.24, 0.95] };
  C.gasteiger = function (m) {
    const A = m.atoms, nb = m.nb(), n = A.length, q = new Float64Array(n), par = [];
    for (let i = 0; i < n; i++) {
      const a = A[i]; q[i] = a.q || 0; let p;
      const hy = C.hybrid(m, i), s = hy === 'sp' ? '1' : hy === 'sp2' ? '2' : '3';
      switch (a.e) {
        case 1: p = GP.H; break; case 6: p = GP['C' + s]; break; case 7: p = GP['N' + s]; break;
        case 8: p = nb[i].some((x) => m.bonds[x.b].o === 2) ? GP.O2 : GP.O3; break;
        case 9: p = GP.F; break; case 17: p = GP.Cl; break; case 35: p = GP.Br; break; case 53: p = GP.I; break; case 16: p = GP.S; break; case 15: p = GP.P; break;
        default: { const en = EL[a.e].en || 1.5; p = [5 * en, 5 * en, 1]; }
      }
      par.push(p);
    }
    const chi = (i, x) => par[i][0] + par[i][1] * x + par[i][2] * x * x;
    const chiPlus = (i) => (A[i].e === 1 ? 20.02 : par[i][0] + par[i][1] + par[i][2]);
    let damp = 1;
    for (let it = 0; it < 7; it++) {
      damp *= 0.5; const dq = new Float64Array(n);
      for (const b of m.bonds) {
        const x = chi(b.a, q[b.a]), y = chi(b.b, q[b.b]);
        if (x === y) continue;
        const lo = x < y ? b.a : b.b, hi = x < y ? b.b : b.a;
        const t = Math.abs(x - y) / chiPlus(lo);
        dq[lo] += t * damp; dq[hi] -= t * damp;
      }
      for (let i = 0; i < n; i++) q[i] += dq[i];
    }
    for (let i = 0; i < n; i++) A[i].pc = q[i];
    return q;
  };

  C.dipole = function (m) {
    C.gasteiger(m); const c = m.centroid(); let d = [0, 0, 0];
    m.atoms.forEach((a) => { d = V.add(d, V.mul([a.x - c[0], a.y - c[1], a.z - c[2]], a.pc)); });
    return { vec: d, debye: V.len(d) * 4.8032 };
  };

  C.props = function (m) {
    const nb = m.nb(), A = m.atoms, ringAtoms = new Set(); C.rings(m).forEach((r) => r.forEach((i) => ringAtoms.add(i)));
    const ringB = new Set(); C.rings(m).forEach((r) => { for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; ringB.add(Math.min(a, b) + '_' + Math.max(a, b)); } });
    let rot = 0, hbd = 0, hba = 0;
    m.bonds.forEach((b) => {
      if (b.o !== 1 || ringB.has(Math.min(b.a, b.b) + '_' + Math.max(b.a, b.b))) return;
      const ha = nb[b.a].filter((x) => A[x.j].e > 1).length, hb = nb[b.b].filter((x) => A[x.j].e > 1).length;
      if (A[b.a].e > 1 && A[b.b].e > 1 && ha > 1 && hb > 1) rot++;
    });
    A.forEach((a, i) => {
      if (a.e === 7 || a.e === 8) { hba++; if (nb[i].some((x) => A[x.j].e === 1)) hbd++; }
    });
    return { atoms: A.length, heavy: m.heavy(), bonds: m.bonds.length, rings: C.rings(m).length, aromatic: C.aromaticRings(m).length, rotatable: rot, hbd, hba, mass: C.mass(m), charge: C.charge(m), formula: C.formula(m), frags: m.components().n };
  };

  /* ---------- torsion editing ---------- */
  /** atoms on the b-side of bond a-b (null if bond is in a ring) */
  C.sideOf = function (m, a, b) {
    const nb = m.nb(), seen = new Set([b]), st = [b];
    while (st.length) { const u = st.pop(); for (const x of nb[u]) { if (x.j === a && u === b) continue; if (x.j === a) return null; if (!seen.has(x.j)) { seen.add(x.j); st.push(x.j); } } }
    return seen;
  };
  C.rotateAbout = function (m, atoms, p0, axis, ang) {
    const k = V.norm(axis), c = Math.cos(ang), s = Math.sin(ang);
    atoms.forEach((i) => {
      const a = m.atoms[i], v = [a.x - p0[0], a.y - p0[1], a.z - p0[2]];
      const kv = V.cross(k, v), kd = V.dot(k, v);
      a.x = p0[0] + v[0] * c + kv[0] * s + k[0] * kd * (1 - c);
      a.y = p0[1] + v[1] * c + kv[1] * s + k[1] * kd * (1 - c);
      a.z = p0[2] + v[2] * c + kv[2] * s + k[2] * kd * (1 - c);
    });
  };
  C.setDihedral = function (m, i, j, k, l, deg) {
    const cur = MS.geom.dihedral(m, i, j, k, l), side = C.sideOf(m, j, k); if (!side) return false;
    C.rotateAbout(m, side, m.pos(k), V.sub(m.pos(k), m.pos(j)), (deg - cur) * D2R); return true;
  };
  C.setDistance = function (m, i, j, d) {
    const side = C.sideOf(m, i, j); if (!side) return false;
    const u = V.sub(m.pos(j), m.pos(i)), cur = V.len(u); const t = V.mul(V.norm(u), d - cur);
    side.forEach((x) => { const a = m.atoms[x]; a.x += t[0]; a.y += t[1]; a.z += t[2]; }); return true;
  };
  C.setAngle = function (m, i, j, k, deg) {
    const side = C.sideOf(m, j, k); if (!side) return false;
    const u = V.sub(m.pos(i), m.pos(j)), v = V.sub(m.pos(k), m.pos(j)); let ax = V.cross(u, v); if (V.len(ax) < 1e-6) ax = V.perp(u);
    const cur = MS.geom.angle(m, i, j, k); C.rotateAbout(m, side, m.pos(j), ax, (deg - cur) * D2R); return true;
  };
})();
