/* SMILES reader/writer with distance-geometry 3D embedding, plus peptide, fullerene and nanotube builders. */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});
  const EL = MS.EL, V = MS.V, C = MS.chem, D2R = Math.PI / 180;

  const ORG = { B: 5, C: 6, N: 7, O: 8, P: 15, S: 16, F: 9, I: 53, Cl: 17, Br: 35 };
  const AROM = { b: 5, c: 6, n: 7, o: 8, p: 15, s: 16, se: 34, as: 33 };

  function parse(str) {
    const atoms = [], bonds = [], seq = [], stack = [], rings = {};
    let prev = -1, bo = null, i = 0;
    const s = str.trim().split(/\s+/)[0];
    const add = (at) => {
      atoms.push(at); seq.push([]); const k = atoms.length - 1;
      if (prev >= 0) {
        const o = bo != null ? bo : (atoms[prev].arom && at.arom ? 1.5 : 1);
        bonds.push({ a: prev, b: k, o }); seq[prev].push(k); seq[k].push(prev);
      }
      if (at.chir && at.h === 1) seq[k].push('H');
      bo = null; prev = k;
    };
    while (i < s.length) {
      const ch = s[i];
      if (ch === '(') { stack.push(prev); i++; continue; }
      if (ch === ')') { prev = stack.pop(); bo = null; i++; continue; }
      if (ch === '.') { prev = -1; bo = null; i++; continue; }
      if (ch === '-') { bo = 1; i++; continue; }
      if (ch === '=') { bo = 2; i++; continue; }
      if (ch === '#') { bo = 3; i++; continue; }
      if (ch === ':') { bo = 1.5; i++; continue; }
      if (ch === '/' || ch === '\\' || ch === '~') { bo = 1; i++; continue; }
      if (ch === '$') { bo = 4; i++; continue; }
      if (/[0-9%]/.test(ch)) {
        let d; if (ch === '%') { d = s.substr(i + 1, 2); i += 3; } else { d = ch; i++; }
        if (prev < 0) throw new Error('ring closure without atom');
        if (rings[d]) {
          const r = rings[d]; delete rings[d];
          const o = bo != null ? bo : r.bo != null ? r.bo : (atoms[prev].arom && atoms[r.atom].arom ? 1.5 : 1);
          bonds.push({ a: r.atom, b: prev, o });
          seq[r.atom][seq[r.atom].indexOf(r.mark)] = prev; seq[prev].push(r.atom);
        } else { const mark = { ring: d }; rings[d] = { atom: prev, bo, mark }; seq[prev].push(mark); }
        bo = null; continue;
      }
      if (ch === '[') {
        const j = s.indexOf(']', i); if (j < 0) throw new Error('unclosed [');
        const t = s.slice(i + 1, j); i = j + 1;
        const m = /^(\d+)?([A-Za-z][a-z]?)(@@?)?(?:H(\d*))?([+-]+\d*|[+-]\d+)?(?::\d+)?$/.exec(t);
        if (!m) throw new Error('bad atom [' + t + ']');
        let sym = m[2], arom = false, z;
        if (AROM[sym] && sym === sym.toLowerCase()) { z = AROM[sym]; arom = true; } else { z = MS.sym2z[sym[0].toUpperCase() + sym.slice(1)]; if (!z) { const s2 = sym[0].toUpperCase(); if (AROM[sym[0]] && sym.length === 2) { /* e.g. "Hs" */ } z = z || 0; } }
        if (!z) throw new Error('unknown element ' + sym);
        let q = 0; if (m[5]) { const sg = m[5][0] === '+' ? 1 : -1; const num = /\d+/.exec(m[5]); q = num ? sg * parseInt(num[0], 10) : sg * m[5].length; }
        add({ e: z, q, h: m[4] === undefined && !/H/.test(t.replace(/^\d+/, '').slice(sym.length)) ? 0 : (m[4] === '' || m[4] === undefined ? 1 : parseInt(m[4], 10)), arom, chir: m[3] ? (m[3] === '@' ? 1 : -1) : 0, br: true });
        continue;
      }
      // organic subset
      let sym = null;
      if (s.startsWith('Cl', i)) sym = 'Cl'; else if (s.startsWith('Br', i)) sym = 'Br';
      else if (ORG[ch]) sym = ch; else if (AROM[ch] && ch === ch.toLowerCase()) sym = ch;
      if (!sym) throw new Error('unexpected "' + ch + '"');
      i += sym.length;
      if (AROM[sym]) add({ e: AROM[sym], q: 0, h: null, arom: true, chir: 0 }); else add({ e: ORG[sym], q: 0, h: null, arom: false, chir: 0 });
    }
    if (Object.keys(rings).length) throw new Error('unclosed ring');
    return { atoms, bonds, seq };
  }

  function kekulize(g) {
    const { atoms, bonds } = g, n = atoms.length;
    const ab = bonds.filter((b) => b.o === 1.5);
    if (!ab.length) return;
    const sumO = new Array(n).fill(0), arCount = new Array(n).fill(0);
    bonds.forEach((b) => { if (b.o === 1.5) { arCount[b.a]++; arCount[b.b]++; } else { sumO[b.a] += b.o; sumO[b.b] += b.o; } });
    const need = atoms.map((a, i) => {
      if (!a.arom || !arCount[i]) return false;
      const vl = MS.valList(a.e, a.q); if (!vl) return false;
      const h = a.br ? a.h : 0;
      return sumO[i] + arCount[i] + h + 1 <= vl[0];
    });
    const adj = atoms.map(() => []);
    ab.forEach((b) => { adj[b.a].push(b); adj[b.b].push(b); });
    const matched = new Array(n).fill(false), dbl = new Set();
    let guard = 0;
    const solve = () => {
      if (++guard > 200000) return false;
      let k = -1; for (let i = 0; i < n; i++) if (need[i] && !matched[i]) { k = i; break; }
      if (k < 0) return true;
      for (const b of adj[k]) {
        const o = b.a === k ? b.b : b.a; if (!need[o] || matched[o]) continue;
        matched[k] = matched[o] = true; dbl.add(b);
        if (solve()) return true;
        matched[k] = matched[o] = false; dbl.delete(b);
      }
      return false;
    };
    solve();
    ab.forEach((b) => { b.o = dbl.has(b) ? 2 : 1; });
  }

  /* ---------- SMILES -> Mol (topology + chirality only; coordinates from embed) ---------- */
  function toGraph(smi) {
    const g = parse(smi); kekulize(g);
    const m = new MS.Mol(), chiral = [];
    g.atoms.forEach((a) => m.addAtom(a.e, 0, 0, 0, { q: a.q }));
    g.bonds.forEach((b) => m.addBond(b.a, b.b, b.o));
    const hmap = new Map();
    g.atoms.forEach((a, i) => {
      let h = a.br ? a.h : C.implicitH(m, i);
      if (!a.br && (a.e === 7 || a.e === 15 || a.e === 16) && h < 0) h = 0;
      for (let t = 0; t < h; t++) { const hi = m.addAtom(1, 0, 0, 0, {}); m.addBond(i, hi, 1); if (!hmap.has(i)) hmap.set(i, []); hmap.get(i).push(hi); }
    });
    // chirality records
    const ref = (() => { const v1 = [1, 0, -0.33], v2 = [-0.5, 0.866, -0.33], v3 = [-0.5, -0.866, -0.33]; return Math.sign(V.dot(v1, V.cross(v2, v3))); })();
    g.atoms.forEach((a, i) => {
      if (!a.chir) return;
      const hl = hmap.get(i) ? hmap.get(i).slice() : [];
      const ord = g.seq[i].map((x) => (x === 'H' ? hl.shift() : x)).filter((x) => typeof x === 'number');
      hl.forEach((h) => ord.push(h));
      if (ord.length !== 4) return;
      chiral.push({ c: i, n: [ord[1], ord[2], ord[3]], n0: ord[0], s: a.chir === 1 ? ref : -ref });
    });
    m.meta.chiral = chiral;
    return m;
  }

  /* ---------- distance geometry embedding ---------- */
  function d14(r1, r2, r3, t1, t2, phi) {
    const ix = r1 * Math.cos(t1), iy = r1 * Math.sin(t1);
    const lx = r2 - r3 * Math.cos(t2), ly = r3 * Math.sin(t2) * Math.cos(phi), lz = r3 * Math.sin(t2) * Math.sin(phi);
    return Math.hypot(lx - ix, ly - iy, lz);
  }

  function boundsFor(m, ff) {
    const A = m.atoms, N = A.length, nb = m.nb(), hy = ff.hy;
    const lb = new Float32Array(N * N), ub = new Float32Array(N * N).fill(1000);
    const set = (i, j, lo, hi) => { lb[i * N + j] = lb[j * N + i] = lo; ub[i * N + j] = ub[j * N + i] = hi; };
    for (let i = 0; i < N; i++) set(i, i, 0, 0);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const lo = (EL[A[i].e].vdw + EL[A[j].e].vdw) * 0.62; lb[i * N + j] = lb[j * N + i] = lo; }
    const r0 = (i, j) => { const k = m.bondIndex(i, j); return ff.bonds.find ? ff.bonds[k][2] : 1.5; };
    ff.bonds.forEach(([i, j, r]) => set(i, j, r - 0.01, r + 0.01));
    const ang = new Map();
    ff.angles.forEach(([i, j, k, c0]) => {
      const a = r0(i, j), b = r0(j, k), d = Math.sqrt(a * a + b * b - 2 * a * b * c0);
      set(i, k, d - 0.02, d + 0.02); ang.set(Math.min(i, k) + ',' + j + ',' + Math.max(i, k), Math.acos(Math.max(-1, Math.min(1, c0))));
    });
    const rings = C.rings(m);
    const smallestRing = (j, k) => { let best = null; for (const r of rings) { if (r.includes(j) && r.includes(k)) { if (!best || r.length < best.length) best = r; } } return best; };
    m.bonds.forEach((b, bi) => {
      const j = b.a, k = b.b;
      const lj = nb[j].filter((x) => x.j !== k), lk = nb[k].filter((x) => x.j !== j);
      const ring = smallestRing(j, k), rset = ring ? new Set(ring) : null;
      const planar = (b.o === 2 || (hy[j] === 'sp2' && hy[k] === 'sp2')) && hy[j] !== 'sp' && hy[k] !== 'sp';
      const linear = hy[j] === 'sp' || hy[k] === 'sp';
      lj.forEach((x, a) => lk.forEach((y, c) => {
        const i = x.j, l = y.j; if (i === l) return;
        const t1 = ang.get(Math.min(i, k) + ',' + j + ',' + Math.max(i, k)), t2 = ang.get(Math.min(j, l) + ',' + k + ',' + Math.max(j, l));
        if (t1 === undefined || t2 === undefined) return;
        const R1 = r0(i, j), R2 = r0(j, k), R3 = r0(k, l);
        const D = (deg) => d14(R1, R2, R3, t1, t2, deg * D2R);
        let lo, hi;
        if (linear) { lo = D(0); hi = D(180); }
        else if (ring && planar) { const cis = rset.has(i) === rset.has(l) || (!rset.has(i) && !rset.has(l)); const d = cis ? D(0) : D(180); lo = d - 0.06; hi = d + 0.06; }
        else if (planar) { const trans = (a + c) % 2 === 0; const d = trans ? D(180) : D(0); lo = d - 0.08; hi = d + 0.08; }
        else if (ring && rset.has(i) && rset.has(l)) { lo = D(10); hi = D(70); }
        else if (hy[j] === 'sp3' && hy[k] === 'sp3') { lo = D(55); hi = D(180); }
        else { lo = D(0); hi = D(180); }
        if (lb[i * N + l] < 0 || ub[i * N + l] === 1000 || true) {
          const cur = ub[i * N + l];
          if (cur === 1000 || (ff.n14 && hi - lo < cur - lb[i * N + l])) set(i, l, Math.max(lo, 0.5), hi);
        }
      }));
    });
    // smooth upper bounds (triangle inequality)
    if (N <= 450) {
      for (let k = 0; k < N; k++) for (let i = 0; i < N; i++) {
        const ik = ub[i * N + k]; if (ik >= 1000) continue;
        for (let j = i + 1; j < N; j++) { const v = ik + ub[k * N + j]; if (v < ub[i * N + j]) { ub[i * N + j] = v; ub[j * N + i] = v; } }
      }
    }
    for (let i = 0; i < N * N; i++) { if (ub[i] >= 1000) ub[i] = 40; if (lb[i] > ub[i]) lb[i] = ub[i] * 0.95; }
    return { lb, ub };
  }

  function topEigen(G, N, k) {
    const vecs = [], vals = [];
    for (let e = 0; e < k; e++) {
      let v = new Float64Array(N); for (let i = 0; i < N; i++) v[i] = Math.random() - 0.5;
      let lam = 0;
      for (let it = 0; it < 120; it++) {
        const w = new Float64Array(N);
        for (let i = 0; i < N; i++) { let s = 0; const row = i * N; for (let j = 0; j < N; j++) s += G[row + j] * v[j]; w[i] = s; }
        for (const u of vecs) { let d = 0; for (let i = 0; i < N; i++) d += w[i] * u[i]; for (let i = 0; i < N; i++) w[i] -= d * u[i]; }
        let nn = 0; for (let i = 0; i < N; i++) nn += w[i] * w[i]; nn = Math.sqrt(nn) || 1e-12;
        let diff = 0; for (let i = 0; i < N; i++) { const t = w[i] / nn; diff += Math.abs(t - v[i]); v[i] = t; }
        lam = nn; if (diff < 1e-6) break;
      }
      vecs.push(v); vals.push(lam);
    }
    return { vecs, vals };
  }

  function embedOnce(m, ff, bd) {
    const N = m.atoms.length, { lb, ub } = bd;
    const D2 = new Float64Array(N * N);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const lo = lb[i * N + j], hi = ub[i * N + j]; const d = lo + Math.random() * Math.max(0, Math.min(hi, lo + 12) - lo);
      D2[i * N + j] = D2[j * N + i] = d * d;
    }
    const rowMean = new Float64Array(N); let tot = 0;
    for (let i = 0; i < N; i++) { let s = 0; for (let j = 0; j < N; j++) s += D2[i * N + j]; rowMean[i] = s / N; tot += s; }
    tot /= N * N;
    const G = new Float64Array(N * N);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) G[i * N + j] = 0.5 * (rowMean[i] + rowMean[j] - D2[i * N + j] - tot);
    const { vecs, vals } = topEigen(G, N, 3);
    const x = new Float64Array(N * 3);
    for (let e = 0; e < 3; e++) { const s = Math.sqrt(Math.max(vals[e], 0.01)); for (let i = 0; i < N; i++) x[i * 3 + e] = vecs[e][i] * s; }
    return x;
  }

  function chiralOK(m, x, chiral) {
    let bad = 0;
    for (const ch of chiral) {
      const c = ch.c, [a, b, d] = ch.n;
      const u = [x[a * 3] - x[c * 3], x[a * 3 + 1] - x[c * 3 + 1], x[a * 3 + 2] - x[c * 3 + 2]];
      const v = [x[b * 3] - x[c * 3], x[b * 3 + 1] - x[c * 3 + 1], x[b * 3 + 2] - x[c * 3 + 2]];
      const w = [x[d * 3] - x[c * 3], x[d * 3 + 1] - x[c * 3 + 1], x[d * 3 + 2] - x[c * 3 + 2]];
      if (ch.s * V.dot(u, V.cross(v, w)) < 0) bad++;
    }
    return bad;
  }

  /** place 3D coordinates on a topology-only molecule */
  function embed(m, tries) {
    const N = m.atoms.length, chiral = m.meta.chiral || [];
    if (N === 1) { m.atoms[0].x = m.atoms[0].y = m.atoms[0].z = 0; return; }
    if (N === 2) { const b = m.bonds[0]; m.atoms[1].x = EL[m.atoms[0].e].cov + EL[m.atoms[1].e].cov; return; }
    const ff = MS.ff.build(m, { chiral });
    const bd = boundsFor(m, ff);
    let best = null, bestE = Infinity; tries = tries || (N > 150 ? 2 : 5);
    for (let t = 0; t < tries; t++) {
      const x = embedOnce(m, ff, bd);
      if (chiral.length) { const bad = chiralOK(m, x, chiral); if (bad > chiral.length / 2) for (let i = 0; i < N; i++) x[i * 3 + 2] = -x[i * 3 + 2]; }
      m.setCoords(x);
      const mz = new MS.ff.Minimizer(m, { chiral, dt: 0.01, maxStep: 0.1 }); mz.step(N > 150 ? 700 : 500); mz.apply();
      let worst = 0; ff.bonds.forEach(([i, j, r0]) => { worst = Math.max(worst, Math.abs(MS.geom.dist(m, i, j) - r0)); });
      const bad = chiralOK(m, m.coords(), chiral);
      const score = mz.E + bad * 1000 + worst * 200;
      if (score < bestE) { bestE = score; best = m.coords(); }
      if (bad === 0 && worst < 0.25 && mz.E < 60 + N * 2.5) break;
    }
    m.setCoords(best);
    const fin = new MS.ff.Minimizer(m, { chiral, dt: 0.02 }); fin.step(600); fin.apply();
    // centre
    const c = m.centroid(); m.translate(null, [-c[0], -c[1], -c[2]]);
  }

  function fromSmiles(smi) {
    const m = toGraph(smi);
    embed(m);
    delete m.meta.chiral;
    m.title = smi; m.touch();
    return m;
  }

  /* ---------- Mol -> SMILES ---------- */
  function toSmiles(m) {
    const A = m.atoms, nb = m.nb(), n = A.length;
    const heavy = []; for (let i = 0; i < n; i++) if (A[i].e > 1) heavy.push(i);
    if (!heavy.length) return A.length ? 'H' : '';
    const hn = (i) => nb[i].filter((x) => A[x.j].e === 1).length;
    const hv = (i) => nb[i].filter((x) => A[x.j].e > 1);
    const sym = (i) => {
      const a = A[i], h = hn(i), sumO = nb[i].reduce((s, x) => s + m.bonds[x.b].o, 0), vl = MS.valList(a.e, 0);
      let simple = !a.q && ORG[EL[a.e].sym] && vl;
      if (simple) { let dh = null; for (const v of vl) if (v >= sumO - h) { dh = v - (sumO - h); break; } simple = dh === h; }
      if (simple) return EL[a.e].sym;
      return '[' + EL[a.e].sym + (h ? 'H' + (h > 1 ? h : '') : '') + (a.q ? (a.q > 0 ? '+' : '-') + (Math.abs(a.q) > 1 ? Math.abs(a.q) : '') : '') + ']';
    };
    const seen = new Set(), parts = [];
    for (const start of heavy) {
      if (seen.has(start)) continue;
      // pass 1: DFS tree and ring-closure edges
      const order = [], parent = new Map([[start, -1]]), rc = new Map(); let rid = 0; const treeEdge = new Set(); const visited = new Set();
      const dfs = (u) => {
        visited.add(u); order.push(u);
        const ns = hv(u).map((x) => x.j).sort((a, b) => hv(a).length - hv(b).length);
        for (const v of ns) {
          if (v === parent.get(u)) continue;
          if (!visited.has(v)) { parent.set(v, u); treeEdge.add(u + '_' + v); dfs(v); }
          else if (!treeEdge.has(v + '_' + u) && !treeEdge.has(u + '_' + v)) {
            const key = Math.min(u, v) + '_' + Math.max(u, v); if (!rc.has(key)) { rc.set(key, ++rid); }
          }
        }
      };
      dfs(start); order.forEach((u) => seen.add(u));
      const rcAt = new Map(); rc.forEach((id, key) => { const [a, b] = key.split('_').map(Number); (rcAt.get(a) || rcAt.set(a, []).get(a)).push([id, b]); (rcAt.get(b) || rcAt.set(b, []).get(b)).push([id, a]); });
      const bsym = (u, v) => { const o = m.bonds[m.bondIndex(u, v)].o; return o === 2 ? '=' : o === 3 ? '#' : ''; };
      const emitted = new Set();
      const emit = (u, from) => {
        let s = sym(u);
        (rcAt.get(u) || []).forEach(([id, other]) => { s += bsym(u, other) + (id > 9 ? '%' + id : id); });
        const kids = hv(u).map((x) => x.j).filter((v) => parent.get(v) === u && !emitted.has(v));
        kids.forEach((v) => emitted.add(v));
        kids.forEach((v, idx) => { const sub = bsym(u, v) + emit(v, u); s += idx < kids.length - 1 ? '(' + sub + ')' : sub; });
        return s;
      };
      emitted.add(start); parts.push(emit(start, -1));
    }
    return parts.join('.');
  }

  /* ---------- builders ---------- */
  const SIDE = { A: 'C', R: 'CCCNC(=N)N', N: 'CC(=O)N', D: 'CC(=O)O', C: 'CS', Q: 'CCC(=O)N', E: 'CCC(=O)O', H: 'Cc1c[nH]cn1', I: '[C@@H](C)CC', L: 'CC(C)C', K: 'CCCCN', M: 'CCSC', F: 'Cc1ccccc1', S: 'CO', T: '[C@@H](C)O', W: 'Cc1c[nH]c2ccccc12', Y: 'Cc1ccc(O)cc1', V: 'C(C)C' };
  const AA3 = { A: 'ALA', R: 'ARG', N: 'ASN', D: 'ASP', C: 'CYS', Q: 'GLN', E: 'GLU', G: 'GLY', H: 'HIS', I: 'ILE', L: 'LEU', K: 'LYS', M: 'MET', F: 'PHE', P: 'PRO', S: 'SER', T: 'THR', W: 'TRP', Y: 'TYR', V: 'VAL' };
  MS.AA3 = AA3;
  const SS = { helix: [-57, -47], sheet: [-120, 130], extended: [-150, 150], coil: [-70, 140], ppii: [-75, 145] };

  function peptide(seqStr, ss) {
    const seq = seqStr.toUpperCase().replace(/[^A-Z]/g, '').split('').filter((c) => AA3[c]);
    if (!seq.length) throw new Error('No valid residues. Use one-letter codes (ACDEFGHIKLMNPQRSTVWY).');
    if (seq.length > 40) throw new Error('Up to 40 residues are supported.');
    let smi = '', starts = [];
    seq.forEach((c) => {
      const frag = c === 'G' ? 'NCC(=O)' : c === 'P' ? 'N1CCC[C@H]1C(=O)' : 'N[C@@H](' + SIDE[c] + ')C(=O)';
      starts.push({ c, frag, n: parse(frag).atoms.length }); smi += frag;
    });
    smi += 'O';
    const m = toGraph(smi);
    let off = 0; const bb = [];
    starts.forEach((s, ri) => {
      const N = off, CA = s.c === 'P' ? off + 4 : off + 1, Cc = off + s.n - 2, O = off + s.n - 1;
      bb.push({ N, CA, C: Cc, O });
      const ridx = m.res.length; m.res.push({ name: AA3[s.c], num: ri + 1, chain: 'A', ss: 'C', aa: true, water: false });
      for (let k = off; k < off + s.n; k++) m.atoms[k].r = ridx;
      m.atoms[N].nm = 'N'; m.atoms[CA].nm = 'CA'; m.atoms[Cc].nm = 'C'; m.atoms[O].nm = 'O';
      let cnt = {}; for (let k = off; k < off + s.n; k++) { if (!m.atoms[k].nm) { const e = EL[m.atoms[k].e].sym; cnt[e] = (cnt[e] || 0) + 1; m.atoms[k].nm = e + cnt[e]; } }
      off += s.n;
    });
    m.atoms[off].nm = 'OXT'; m.atoms[off].r = m.res.length - 1;
    // hydrogens inherit residue
    m.atoms.forEach((a, i) => { if (a.e === 1) { const nbr = m.nb()[i][0]; if (nbr) { a.r = m.atoms[nbr.j].r; a.nm = 'H'; } } });
    embed(m);
    const [phi, psi] = SS[ss] || SS.helix;
    if (ss && ss !== 'coil') {
      for (let r = 0; r < bb.length; r++) {
        if (r > 0) C.setDihedral(m, bb[r - 1].C, bb[r].N, bb[r].CA, bb[r].C, phi);
        if (r < bb.length - 1) { C.setDihedral(m, bb[r].N, bb[r].CA, bb[r].C, bb[r + 1].N, psi); C.setDihedral(m, bb[r].CA, bb[r].C, bb[r + 1].N, bb[r + 1].CA, 180); }
      }
      bb.forEach((b) => [b.N, b.CA, b.C, b.O].forEach((i) => { m.atoms[i].fx = 1; }));
      MS.ff.minimize(m, 300);
      m.atoms.forEach((a) => { a.fx = 0; });
      m.res.forEach((r) => { r.ss = ss === 'helix' ? 'H' : ss === 'coil' ? 'C' : 'E'; });
    }
    const c = m.centroid(); m.translate(null, [-c[0], -c[1], -c[2]]);
    m.title = 'Peptide ' + seq.join(''); m.meta.protein = true; delete m.meta.chiral; m.touch();
    return m;
  }

  function fullerene() {
    const phi = (1 + Math.sqrt(5)) / 2, pts = [];
    const perms = [[0, 1, 3 * phi], [1, 2 + phi, 2 * phi], [phi, 2, 2 * phi + 1]];
    const cyc = (v) => [[v[0], v[1], v[2]], [v[1], v[2], v[0]], [v[2], v[0], v[1]]];
    perms.forEach((p) => cyc(p).forEach((v) => {
      for (let s = 0; s < 8; s++) {
        const q = [v[0] * (s & 1 ? -1 : 1), v[1] * (s & 2 ? -1 : 1), v[2] * (s & 4 ? -1 : 1)];
        if (!pts.some((u) => Math.hypot(u[0] - q[0], u[1] - q[1], u[2] - q[2]) < 1e-6)) pts.push(q);
      }
    }));
    const m = new MS.Mol(); const sc = 1.42 / 2;
    pts.forEach((p) => m.addAtom(6, p[0] * sc, p[1] * sc, p[2] * sc));
    C.perceiveBonds(m, { tol: 0.15, clear: true }); C.perceiveOrders(m); m.title = 'Fullerene C60'; return m;
  }

  /** carbon nanotube (n,m) with given length in unit cells; hydrogens not added */
  function nanotube(n, mm, cells) {
    const a = 2.46, a1 = [a, 0], a2 = [a / 2, a * Math.sqrt(3) / 2];
    const Ch = [n * a1[0] + mm * a2[0], n * a1[1] + mm * a2[1]], Lc = Math.hypot(Ch[0], Ch[1]), R = Lc / (2 * Math.PI);
    const gcd = (x, y) => (y ? gcd(y, x % y) : x), d = gcd(2 * n + mm, 2 * mm + n);
    const T = [(2 * mm + n) / d * a1[0] - (2 * n + mm) / d * a2[0], (2 * mm + n) / d * a1[1] - (2 * n + mm) / d * a2[1]], Tl = Math.hypot(T[0], T[1]);
    const ex = [Ch[0] / Lc, Ch[1] / Lc], ey = [T[0] / Tl, T[1] / Tl];
    const basis = [[0, 0], [(a1[0] + a2[0]) / 3, (a1[1] + a2[1]) / 3]];
    const m = new MS.Mol(); const pts = [];
    const range = Math.max(n, mm) * 2 + 12;
    for (let i = -range; i <= range; i++) for (let j = -range; j <= range; j++) for (const b of basis) {
      const px = i * a1[0] + j * a2[0] + b[0], py = i * a1[1] + j * a2[1] + b[1];
      const u = px * ex[0] + py * ex[1], v = px * ey[0] + py * ey[1];
      if (u >= -1e-6 && u < Lc - 1e-6 && v >= -1e-6 && v < Tl * cells - 1e-6) pts.push([u, v]);
    }
    pts.forEach(([u, v]) => { const th = u / R; m.addAtom(6, R * Math.cos(th), v, R * Math.sin(th)); });
    C.perceiveBonds(m, { tol: 0.2, clear: true }); C.perceiveOrders(m);
    const c = m.centroid(); m.translate(null, [-c[0], -c[1], -c[2]]); m.title = 'Nanotube (' + n + ',' + mm + ')'; return m;
  }

  function graphene(nx, ny) {
    const a = 2.46, m = new MS.Mol();
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const x = i * a + j * a / 2, y = j * a * Math.sqrt(3) / 2;
      m.addAtom(6, x, y, 0); m.addAtom(6, x + a / 2, y + a / (2 * Math.sqrt(3)), 0);
    }
    C.perceiveBonds(m, { tol: 0.2, clear: true }); C.perceiveOrders(m);
    const c = m.centroid(); m.translate(null, [-c[0], -c[1], -c[2]]); m.title = 'Graphene sheet'; return m;
  }

  MS.smiles = { parse, toGraph, embed, fromSmiles, toSmiles };
  MS.build = { peptide, fullerene, nanotube, graphene, SS };
})();
