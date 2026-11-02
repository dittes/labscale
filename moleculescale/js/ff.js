/* Quick force field (bonds, angles, torsions, planarity, van der Waals) and a FIRE minimiser. Energies in kcal/mol. */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});
  const EL = MS.EL, V = MS.V, C = MS.chem;
  const D2R = Math.PI / 180;

  const LJE = { 1: 0.02, 6: 0.09, 7: 0.075, 8: 0.07, 9: 0.06, 15: 0.2, 16: 0.25, 17: 0.23, 35: 0.28, 53: 0.34 };
  const bondLen = (a, b, o) => EL[a].cov + EL[b].cov - (o === 2 ? 0.17 : o === 3 ? 0.3 : 0) + (a === 1 || b === 1 ? 0.01 : 0);

  /** Build the term lists for a molecule. opts.chiral: array of {c,n:[a,b,d],s} for embedding. */
  function build(m, opts) {
    opts = opts || {};
    const A = m.atoms, N = A.length, nb = m.nb();
    const hy = A.map((_, i) => C.hybrid(m, i));
    const rsz = C.ringSizeMap(m);
    const rings = C.rings(m);
    const inRing = (i, j, k) => { // smallest ring containing i-j-k consecutively
      let best = 0; for (const r of rings) { const s = new Set(r); if (s.has(i) && s.has(j) && s.has(k)) best = best ? Math.min(best, r.length) : r.length; } return best;
    };
    const ff = { N, bonds: [], angles: [], tors: [], oop: [], chiral: opts.chiral || [], pairs: null, excl: new Set(), fixed: new Uint8Array(N), restr: [] };
    const key = (i, j) => (i < j ? i * N + j : j * N + i);
    m.bonds.forEach((b) => {
      ff.bonds.push([b.a, b.b, bondLen(A[b.a].e, A[b.b].e, b.o), 300 + 60 * (b.o - 1)]);
      ff.excl.add(key(b.a, b.b));
    });
    const metal = (i) => A[i].e > 18 && A[i].e !== 35 && A[i].e !== 53 && A[i].e !== 34 && A[i].e !== 33 && A[i].e !== 32;
    for (let j = 0; j < N; j++) {
      const l = nb[j]; if (metal(j)) continue;
      const h = hy[j];
      for (let a = 0; a < l.length; a++) for (let b = a + 1; b < l.length; b++) {
        const i = l[a].j, k = l[b].j;
        let t0 = h === 'sp' ? 180 : h === 'sp2' ? 120 : A[j].e === 8 ? 106 : A[j].e === 7 ? 108 : A[j].e === 16 ? 99 : A[j].e === 15 ? 100 : 109.47;
        if (l.length === 3 && h === 'sp3' && A[j].e === 6) t0 = 109.47;
        if (h === 'sp2' && l.length === 4) t0 = 109.47;
        const rs = inRing(i, j, k);
        if (rs === 3) t0 = 60; else if (rs === 4) t0 = 90; else if (rs === 5) t0 = h === 'sp2' ? 108 : 104; else if (rs === 6 && h === 'sp3') t0 = 111;
        if (l.length === 4 && h !== 'sp') t0 = 109.47;
        ff.angles.push([i, j, k, Math.cos(t0 * D2R), h === 'sp' ? 40 : 60]);
        ff.excl.add(key(i, k));
      }
      if (h === 'sp2' && l.length === 3 && A[j].e <= 8) ff.oop.push([j, l[0].j, l[1].j, l[2].j, 40]);
    }
    // torsions
    m.bonds.forEach((b) => {
      const j = b.a, k = b.b; if (metal(j) || metal(k)) return;
      const lj = nb[j].filter((x) => x.j !== k), lk = nb[k].filter((x) => x.j !== j); if (!lj.length || !lk.length) return;
      const hj = hy[j], hk = hy[k];
      let n = 0, V0 = 0;
      if (b.o === 2) { n = 2; V0 = 28; }
      else if (hj !== 'sp3' && hk !== 'sp3' && hj !== 'sp' && hk !== 'sp' && A[j].e !== 1 && A[k].e !== 1) {
        n = 2; const amide = (A[j].e === 7 && nb[k].some((x) => A[x.j].e === 8 && m.bonds[x.b].o === 2)) || (A[k].e === 7 && nb[j].some((x) => A[x.j].e === 8 && m.bonds[x.b].o === 2));
        V0 = amide ? 20 : (rsz.get(j) && rsz.get(k) && inRing(lj[0].j, j, k) ? 8 : 5);
      } else if (hj === 'sp3' && hk === 'sp3') { n = 3; V0 = (A[j].e === 6 && A[k].e === 6) ? 1.8 : 1.0; }
      else return;
      const pairs = lj.length * lk.length, v = V0 / pairs;
      for (const x of lj) for (const y of lk) { if (x.j === y.j) continue; ff.tors.push([x.j, j, k, y.j, v, n]); }
    });
    // 1-4 set (for scaled vdW)
    ff.n14 = new Set();
    for (let j = 0; j < N; j++) for (const x of nb[j]) for (const y of nb[x.j]) { if (y.j === j) continue; for (const z of nb[y.j]) { if (z.j === x.j || z.j === j) continue; ff.n14.add(key(j, z.j)); } }
    ff.key = key; ff.hy = hy;
    return ff;
  }

  function buildPairs(ff, m, x) {
    const N = ff.N, A = m.atoms, cut = 8, cs = cut, cells = new Map(), pairs = [];
    const idx = (v) => Math.floor(v / cs);
    for (let i = 0; i < N; i++) { const k = idx(x[i * 3]) + ',' + idx(x[i * 3 + 1]) + ',' + idx(x[i * 3 + 2]); (cells.get(k) || cells.set(k, []).get(k)).push(i); }
    for (let i = 0; i < N; i++) {
      const cx = idx(x[i * 3]), cy = idx(x[i * 3 + 1]), cz = idx(x[i * 3 + 2]);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const l = cells.get((cx + dx) + ',' + (cy + dy) + ',' + (cz + dz)); if (!l) continue;
        for (const j of l) {
          if (j <= i) continue; const k = ff.key(i, j); if (ff.excl.has(k)) continue;
          const ei = A[i].e, ej = A[j].e, r0 = (EL[ei].vdw + EL[ej].vdw) * 0.92;
          const eps = Math.sqrt((LJE[ei] || 0.1) * (LJE[ej] || 0.1)) * (ff.n14.has(k) ? 0.5 : 1);
          pairs.push([i, j, r0 * (ff.n14.has(k) ? 0.9 : 1), eps]);
        }
      }
    }
    ff.pairs = pairs; ff.pairX = Float64Array.from(x);
  }

  /** energy and gradient (g is zeroed and filled) */
  function evalFF(ff, x, g, o) {
    o = o || {};
    g.fill(0); let E = 0;
    const N = ff.N;
    // bonds
    for (const [i, j, r0, k] of ff.bonds) {
      const dx = x[i * 3] - x[j * 3], dy = x[i * 3 + 1] - x[j * 3 + 1], dz = x[i * 3 + 2] - x[j * 3 + 2];
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9, d = r - r0; E += k * d * d;
      const f = 2 * k * d / r;
      g[i * 3] += f * dx; g[i * 3 + 1] += f * dy; g[i * 3 + 2] += f * dz; g[j * 3] -= f * dx; g[j * 3 + 1] -= f * dy; g[j * 3 + 2] -= f * dz;
    }
    // angles (cosine form)
    for (const [i, j, k, c0, ka] of ff.angles) {
      const ux = x[i * 3] - x[j * 3], uy = x[i * 3 + 1] - x[j * 3 + 1], uz = x[i * 3 + 2] - x[j * 3 + 2];
      const vx = x[k * 3] - x[j * 3], vy = x[k * 3 + 1] - x[j * 3 + 1], vz = x[k * 3 + 2] - x[j * 3 + 2];
      const lu = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1e-9, lv = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1e-9;
      const c = (ux * vx + uy * vy + uz * vz) / (lu * lv), d = c - c0; E += ka * d * d;
      const f = 2 * ka * d;
      const gix = (vx / lv - c * ux / lu) / lu, giy = (vy / lv - c * uy / lu) / lu, giz = (vz / lv - c * uz / lu) / lu;
      const gkx = (ux / lu - c * vx / lv) / lv, gky = (uy / lu - c * vy / lv) / lv, gkz = (uz / lu - c * vz / lv) / lv;
      g[i * 3] += f * gix; g[i * 3 + 1] += f * giy; g[i * 3 + 2] += f * giz;
      g[k * 3] += f * gkx; g[k * 3 + 1] += f * gky; g[k * 3 + 2] += f * gkz;
      g[j * 3] -= f * (gix + gkx); g[j * 3 + 1] -= f * (giy + gky); g[j * 3 + 2] -= f * (giz + gkz);
    }
    // torsions: E = V/2 (1 + cos(n phi)) for n=3 (minima staggered), V/2 (1 - cos 2phi) for n=2 (planar)
    for (const [i, j, k, l, Vt, n] of ff.tors) {
      const Fx = x[i * 3] - x[j * 3], Fy = x[i * 3 + 1] - x[j * 3 + 1], Fz = x[i * 3 + 2] - x[j * 3 + 2];
      const Gx = x[j * 3] - x[k * 3], Gy = x[j * 3 + 1] - x[k * 3 + 1], Gz = x[j * 3 + 2] - x[k * 3 + 2];
      const Hx = x[l * 3] - x[k * 3], Hy = x[l * 3 + 1] - x[k * 3 + 1], Hz = x[l * 3 + 2] - x[k * 3 + 2];
      const Ax = Fy * Gz - Fz * Gy, Ay = Fz * Gx - Fx * Gz, Az = Fx * Gy - Fy * Gx;
      const Bx = Hy * Gz - Hz * Gy, By = Hz * Gx - Hx * Gz, Bz = Hx * Gy - Hy * Gx;
      const la = Math.sqrt(Ax * Ax + Ay * Ay + Az * Az), lb = Math.sqrt(Bx * Bx + By * By + Bz * Bz);
      if (la < 1e-6 || lb < 1e-6) continue;
      const ax = Ax / la, ay = Ay / la, az = Az / la, bx = Bx / lb, by = By / lb, bz = Bz / lb;
      const c = ax * bx + ay * by + az * bz;
      let dE;
      if (n === 3) { E += 0.5 * Vt * (1 + 4 * c * c * c - 3 * c); dE = 0.5 * Vt * (12 * c * c - 3); } else { E += 0.5 * Vt * (1 - (2 * c * c - 1)); dE = -0.5 * Vt * 4 * c; }
      const gAx = (bx - c * ax) / la, gAy = (by - c * ay) / la, gAz = (bz - c * az) / la;
      const gBx = (ax - c * bx) / lb, gBy = (ay - c * by) / lb, gBz = (az - c * bz) / lb;
      // dF = G x gA ; dH = G x gB ; dG = gA x F + gB x H
      const dFx = Gy * gAz - Gz * gAy, dFy = Gz * gAx - Gx * gAz, dFz = Gx * gAy - Gy * gAx;
      const dHx = Gy * gBz - Gz * gBy, dHy = Gz * gBx - Gx * gBz, dHz = Gx * gBy - Gy * gBx;
      const dGx = (gAy * Fz - gAz * Fy) + (gBy * Hz - gBz * Hy), dGy = (gAz * Fx - gAx * Fz) + (gBz * Hx - gBx * Hz), dGz = (gAx * Fy - gAy * Fx) + (gBx * Hy - gBy * Hx);
      g[i * 3] += dE * dFx; g[i * 3 + 1] += dE * dFy; g[i * 3 + 2] += dE * dFz;
      g[j * 3] += dE * (dGx - dFx); g[j * 3 + 1] += dE * (dGy - dFy); g[j * 3 + 2] += dE * (dGz - dFz);
      g[k * 3] += dE * (-dGx - dHx); g[k * 3 + 1] += dE * (-dGy - dHy); g[k * 3 + 2] += dE * (-dGz - dHz);
      g[l * 3] += dE * dHx; g[l * 3 + 1] += dE * dHy; g[l * 3 + 2] += dE * dHz;
    }
    // planarity: distance of centre from plane of its three neighbours
    for (const [c, a, b, d, k] of ff.oop) {
      const ca = [x[c * 3] - x[a * 3], x[c * 3 + 1] - x[a * 3 + 1], x[c * 3 + 2] - x[a * 3 + 2]];
      const ba = [x[b * 3] - x[a * 3], x[b * 3 + 1] - x[a * 3 + 1], x[b * 3 + 2] - x[a * 3 + 2]];
      const da = [x[d * 3] - x[a * 3], x[d * 3 + 1] - x[a * 3 + 1], x[d * 3 + 2] - x[a * 3 + 2]];
      const nn = V.cross(ba, da), ln = V.len(nn); if (ln < 1e-6) continue;
      const nh = V.mul(nn, 1 / ln), h = V.dot(ca, nh); E += k * h * h;
      const q = V.mul(V.sub(ca, V.mul(nh, h)), 1 / ln), f = 2 * k * h;
      const gc = nh, gb = V.cross(da, q), gd = V.cross(q, ba);
      const ga = V.mul(V.add(V.add(nh, gb), gd), -1);
      const put = (i, v) => { g[i * 3] += f * v[0]; g[i * 3 + 1] += f * v[1]; g[i * 3 + 2] += f * v[2]; };
      put(c, gc); put(a, ga); put(b, gb); put(d, gd);
    }
    // chirality (embedding only): hinge on signed volume
    for (const ch of ff.chiral) {
      const [a, b, d] = ch.n, c = ch.c;
      const u = [x[a * 3] - x[c * 3], x[a * 3 + 1] - x[c * 3 + 1], x[a * 3 + 2] - x[c * 3 + 2]];
      const v = [x[b * 3] - x[c * 3], x[b * 3 + 1] - x[c * 3 + 1], x[b * 3 + 2] - x[c * 3 + 2]];
      const w = [x[d * 3] - x[c * 3], x[d * 3 + 1] - x[c * 3 + 1], x[d * 3 + 2] - x[c * 3 + 2]];
      const vol = V.dot(u, V.cross(v, w)), sv = ch.s * vol;
      if (sv < 0.8) {
        const e = 0.8 - sv; E += 8 * e * e; const f = -2 * 8 * e * ch.s;
        const gu = V.cross(v, w), gv = V.cross(w, u), gw = V.cross(u, v);
        const put = (i, vv, s) => { g[i * 3] += f * vv[0] * s; g[i * 3 + 1] += f * vv[1] * s; g[i * 3 + 2] += f * vv[2] * s; };
        put(a, gu, 1); put(b, gv, 1); put(d, gw, 1);
        put(c, [gu[0] + gv[0] + gw[0], gu[1] + gv[1] + gw[1], gu[2] + gv[2] + gw[2]], -1);
      }
    }
    // non-bonded (Lennard-Jones 12-6, softened at short range)
    if (!ff.pairs) buildPairs(ff, o.mol, x);
    for (const [i, j, r0, eps] of ff.pairs) {
      const dx = x[i * 3] - x[j * 3], dy = x[i * 3 + 1] - x[j * 3 + 1], dz = x[i * 3 + 2] - x[j * 3 + 2];
      const r2 = dx * dx + dy * dy + dz * dz; if (r2 > 100) continue;
      let r = Math.sqrt(r2) || 1e-9; const rc = Math.max(r, r0 * 0.55);
      const s = r0 / rc, s6 = s * s * s * s * s * s, e = eps * (s6 * s6 - 2 * s6);
      E += e;
      const dEdr = r < rc ? -40 * (rc - r) : -eps * 12 * (s6 * s6 - s6) / r;
      if (r < rc) E += 20 * (rc - r) * (rc - r);
      const f = dEdr / r; g[i * 3] += f * dx; g[i * 3 + 1] += f * dy; g[i * 3 + 2] += f * dz; g[j * 3] -= f * dx; g[j * 3 + 1] -= f * dy; g[j * 3 + 2] -= f * dz;
    }
    // user distance restraints
    for (const [i, j, r0, k] of ff.restr) {
      const dx = x[i * 3] - x[j * 3], dy = x[i * 3 + 1] - x[j * 3 + 1], dz = x[i * 3 + 2] - x[j * 3 + 2];
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9, d = r - r0; E += k * d * d; const f = 2 * k * d / r;
      g[i * 3] += f * dx; g[i * 3 + 1] += f * dy; g[i * 3 + 2] += f * dz; g[j * 3] -= f * dx; g[j * 3 + 1] -= f * dy; g[j * 3 + 2] -= f * dz;
    }
    for (let i = 0; i < N; i++) if (ff.fixed[i]) { g[i * 3] = 0; g[i * 3 + 1] = 0; g[i * 3 + 2] = 0; }
    return E;
  }

  /** FIRE minimiser object: call step(n) repeatedly. */
  class Minimizer {
    constructor(m, opts) {
      opts = opts || {};
      this.m = m; this.ff = build(m, opts); this.x = m.coords(); this.N = m.atoms.length;
      m.atoms.forEach((a, i) => { if (a.fx) this.ff.fixed[i] = 1; });
      this.v = new Float64Array(this.N * 3); this.g = new Float64Array(this.N * 3);
      this.dt = opts.dt || 0.02; this.alpha = 0.1; this.npos = 0; this.iter = 0; this.maxStep = opts.maxStep || 0.15;
      this.E = evalFF(this.ff, this.x, this.g, { mol: m }); this.gmax = 0; this.done = false; this.opts = opts;
    }
    pin(i, on) { this.ff.fixed[i] = on ? 1 : 0; }
    step(n) {
      const { x, v, g, ff, N } = this;
      for (let s = 0; s < n; s++) {
        if (this.iter % 25 === 0 && this.iter > 0) buildPairs(ff, this.m, x);
        // FIRE (unit mass)
        let P = 0, vn = 0, fn = 0;
        for (let k = 0; k < N * 3; k++) { const f = -g[k]; P += f * v[k]; vn += v[k] * v[k]; fn += f * f; }
        vn = Math.sqrt(vn); fn = Math.sqrt(fn);
        if (P > 0) {
          for (let k = 0; k < N * 3; k++) v[k] = (1 - this.alpha) * v[k] + this.alpha * (-g[k]) / (fn || 1) * vn;
          if (++this.npos > 5) { this.dt = Math.min(this.dt * 1.1, 0.05); this.alpha *= 0.99; }
        } else { v.fill(0); this.dt *= 0.5; this.alpha = 0.1; this.npos = 0; }
        let gm = 0;
        for (let k = 0; k < N * 3; k++) {
          v[k] += -g[k] * this.dt; let dx = v[k] * this.dt;
          const lim = this.maxStep; if (dx > lim) dx = lim; else if (dx < -lim) dx = -lim;
          x[k] += dx; const ag = Math.abs(g[k]); if (ag > gm) gm = ag;
        }
        this.E = evalFF(ff, x, g, { mol: this.m });
        this.gmax = gm; this.iter++;
        if (gm < (this.opts.tol || 0.05) || this.dt < 1e-6) { this.done = true; break; }
      }
      return this.E;
    }
    apply() { this.m.setCoords(this.x); this.m.touch(); }
  }

  MS.ff = {
    build, evalFF, Minimizer,
    /** one-shot minimisation; returns {E, iters} */
    minimize(m, maxIter, opts) {
      const mz = new Minimizer(m, opts); mz.step(maxIter || 500); mz.apply(); return { E: mz.E, iters: mz.iter, done: mz.done };
    },
    energy(m) { const f = build(m); const g = new Float64Array(m.atoms.length * 3); return evalFF(f, m.coords(), g, { mol: m }); },
  };
})();
