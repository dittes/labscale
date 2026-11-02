/* Structure analysis and biopolymer builders: CIP stereodescriptors, structure checks, property estimates, isotope pattern, FASTA, all-atom DNA/RNA. */
(function () {
  'use strict';
  const MS = window.MS, EL = MS.EL, V = MS.V, C = MS.chem;
  const bio = (MS.bio = {});

  /* ------------------------------------------------------------ CIP stereodescriptors */
  const CIP_DEPTH = 5;
  function tree(m, nb, i, from, depth, path) {
    const node = { z: m.atoms[i].e, kids: [], i };
    if (depth <= 0) return node;
    const p2 = path.concat(i);
    for (const x of nb[i]) {
      if (x.j === from) continue;
      const o = m.bonds[x.b].o, Z = m.atoms[x.j].e;
      node.kids.push(p2.includes(x.j) ? { z: Z, kids: [] } : tree(m, nb, x.j, i, depth - 1, p2));
      for (let k = 1; k < o; k++) node.kids.push({ z: Z, kids: [] });
    }
    if (from >= 0) { const o = m.bonds[m.bondIndex(i, from)].o; for (let k = 1; k < o; k++) node.kids.push({ z: m.atoms[from].e, kids: [] }); }
    const ih = C.implicitH(m, i); for (let k = 0; k < ih; k++) node.kids.push({ z: 1, kids: [] });
    return node;
  }
  function kidsOf(n, L) { return n.kids.slice().sort((a, b) => -cmp(a, b, L)); }
  function spheres(n, L) {
    const out = [[n.z]]; let lvl = [n];
    for (let d = 1; d <= L; d++) {
      const nxt = [], zs = [];
      for (const x of lvl) for (const c of kidsOf(x, L - d)) { nxt.push(c); zs.push(c.z); }
      if (!nxt.length) break; out.push(zs); lvl = nxt;
    }
    return out;
  }
  function cmp(a, b, L) {
    if (a.z !== b.z) return a.z > b.z ? 1 : -1;
    const sa = spheres(a, L), sb = spheres(b, L), D = Math.max(sa.length, sb.length);
    for (let d = 1; d < D; d++) {
      const x = sa[d] || [], y = sb[d] || [], n = Math.max(x.length, y.length);
      for (let k = 0; k < n; k++) { const u = x[k] || 0, v = y[k] || 0; if (u !== v) return u > v ? 1 : -1; }
    }
    return 0;
  }
  /** substituents of atom c as [{node, pos}], optionally excluding one neighbour; implicit hydrogens get a virtual position */
  function subs(m, nb, c, excl) {
    const out = [], cp = m.pos(c);
    for (const x of nb[c]) { if (x.j === excl) continue; out.push({ node: tree(m, nb, x.j, c, CIP_DEPTH, [c]), pos: m.pos(x.j), j: x.j }); }
    const ih = C.implicitH(m, c);
    if (ih > 0) {
      const sum = out.reduce((s, o) => V.add(s, V.norm(V.sub(o.pos, cp))), excl >= 0 ? V.norm(V.sub(m.pos(excl), cp)) : [0, 0, 0]);
      const d = V.len(sum) > 1e-3 ? V.norm(V.mul(sum, -1)) : [0, 0, 1];
      for (let k = 0; k < ih; k++) out.push({ node: { z: 1, kids: [] }, pos: V.add(cp, V.mul(d, 1.0)), j: -1 });
    }
    return out;
  }
  function rankDistinct(list) {
    const s = list.slice().sort((a, b) => -cmp(a.node, b.node, CIP_DEPTH));
    for (let i = 0; i + 1 < s.length; i++) if (cmp(s[i].node, s[i + 1].node, CIP_DEPTH) === 0) return null;
    return s;
  }
  const STEREO_OK = new Set([6, 7, 14, 15, 16, 32]);
  /** map atom index -> 'R' | 'S' (tetrahedral centres) and atom index -> 'E' | 'Z' (double bonds) */
  bio.stereo = function (m) {
    if (m._stereo && m._stereo.v === m.ver) return m._stereo.map;
    const map = new Map(), nb = m.nb(), A = m.atoms;
    if (m.heavy() > 600) { m._stereo = { v: m.ver, map }; return map; }
    const rings = C.rings(m), ringSize = new Map();
    const inSmallRing = new Set(); rings.forEach((r) => { if (r.length < 8) for (let i = 0; i < r.length; i++) inSmallRing.add(Math.min(r[i], r[(i + 1) % r.length]) + '_' + Math.max(r[i], r[(i + 1) % r.length])); });
    for (let c = 0; c < A.length; c++) {
      const a = A[c]; if (a.e === 1 || !STEREO_OK.has(a.e)) continue;
      if (nb[c].some((x) => m.bonds[x.b].o > 1)) continue;
      const total = nb[c].length + C.implicitH(m, c);
      if (total !== 4) continue;
      if (a.e === 7 && !(a.q > 0)) continue;
      const s = rankDistinct(subs(m, nb, c, -1)); if (!s) continue;
      const cp = m.pos(c), t = V.dot(V.sub(s[0].pos, cp), V.cross(V.sub(s[1].pos, cp), V.sub(s[2].pos, cp)));
      map.set(c, t < 0 ? 'R' : 'S');
    }
    m.bonds.forEach((b) => {
      if (b.o !== 2 || inSmallRing.has(Math.min(b.a, b.b) + '_' + Math.max(b.a, b.b))) return;
      const ends = [b.a, b.b]; if (ends.some((e) => ![6, 7].includes(A[e].e))) return;
      const side = ends.map((e, k) => {
        const other = ends[1 - k]; const list = subs(m, nb, e, other);
        if (A[e].e === 7) return list.length === 1 ? list : null;
        return list.length === 2 ? list : null;
      });
      if (!side[0] || !side[1]) return;
      const top = side.map((l) => (l.length === 1 ? l[0] : rankDistinct(l) && rankDistinct(l)[0]));
      if (!top[0] || !top[1]) return;
      const a0 = m.pos(b.a), b0 = m.pos(b.b), ax = V.norm(V.sub(b0, a0));
      const p = V.sub(top[0].pos, a0), q = V.sub(top[1].pos, b0);
      const pp = V.sub(p, V.mul(ax, V.dot(p, ax))), qq = V.sub(q, V.mul(ax, V.dot(q, ax)));
      if (V.len(pp) < 1e-3 || V.len(qq) < 1e-3) return;
      map.set(b.a, V.dot(V.norm(pp), V.norm(qq)) > 0 ? 'Z' : 'E');
    });
    m._stereo = { v: m.ver, map };
    return map;
  };

  /* ------------------------------------------------------------ structure checks */
  bio.check = function (m) {
    const out = [], A = m.atoms, nb = m.nb();
    if (!A.length) return out;
    const ORG = new Set([1, 5, 6, 7, 8, 9, 14, 15, 16, 17, 35, 53]);
    const over = [], open = [];
    A.forEach((a, i) => {
      if (!ORG.has(a.e)) return;
      const vl = MS.valList(a.e, a.q); if (!vl) return;
      const s = nb[i].reduce((t, x) => t + m.bonds[x.b].o, 0);
      if (s > vl[vl.length - 1]) over.push(i);
      else if (a.e > 1 && C.implicitH(m, i) > 0) open.push(i);
    });
    if (over.length) out.push({ sev: 'error', msg: over.length + ' atom' + (over.length > 1 ? 's' : '') + ' with too many bonds (' + over.slice(0, 6).map((i) => EL[A[i].e].sym + (i + 1)).join(', ') + (over.length > 6 ? ', …' : '') + ')', atoms: over });
    if (open.length) out.push({ sev: 'warn', msg: open.length + ' atom' + (open.length > 1 ? 's have' : ' has') + ' open valences (missing hydrogens). Use Edit → Add hydrogens.', atoms: open });
    // close contacts through a coarse grid
    const N = A.length;
    if (N <= 6000) {
      const dist2 = new Map(); // graph distance <=2 exclusion
      const near = (i) => { const s = new Set([i]); nb[i].forEach((x) => { s.add(x.j); nb[x.j].forEach((y) => s.add(y.j)); }); return s; };
      const cell = 2.2, g = new Map(); const key = (x, y, z) => x + ',' + y + ',' + z;
      A.forEach((a, i) => { if (a.hid) return; const k = key(Math.floor(a.x / cell), Math.floor(a.y / cell), Math.floor(a.z / cell)); (g.get(k) || g.set(k, []).get(k)).push(i); });
      const bad = new Set(), pairs = [];
      A.forEach((a, i) => {
        const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell), cz = Math.floor(a.z / cell); let ex = null;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
          const l = g.get(key(cx + dx, cy + dy, cz + dz)); if (!l) continue;
          for (const j of l) {
            if (j <= i) continue; const b = A[j];
            const lim = a.e === 1 || b.e === 1 ? (a.e === 1 && b.e === 1 ? 1.2 : 1.5) : 2.0;
            const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); if (d >= lim) continue;
            if (!ex) ex = near(i); if (ex.has(j)) continue;
            bad.add(i); bad.add(j); if (pairs.length < 4) pairs.push(EL[a.e].sym + (i + 1) + '–' + EL[b.e].sym + (j + 1) + ' ' + d.toFixed(2) + ' Å');
          }
        }
      });
      if (bad.size) out.push({ sev: 'error', msg: 'Atoms overlap or are unrealistically close: ' + pairs.join(', ') + (bad.size > 8 ? ', …' : ''), atoms: [...bad] });
    }
    // fragments
    const seen = new Uint8Array(N); let frags = 0;
    for (let s = 0; s < N; s++) { if (seen[s]) continue; frags++; const st = [s]; seen[s] = 1; while (st.length) { const u = st.pop(); nb[u].forEach((x) => { if (!seen[x.j]) { seen[x.j] = 1; st.push(x.j); } }); } }
    if (frags > 1) out.push({ sev: 'info', msg: frags + ' separate fragments (this is fine for salts, solvent or complexes).', atoms: [] });
    const q = C.charge(m); if (q !== 0) out.push({ sev: 'info', msg: 'Net charge ' + (q > 0 ? '+' : '') + q + '.', atoms: [] });
    const st = bio.stereo(m); let nr = 0; st.forEach((v) => { if (v === 'R' || v === 'S') nr++; });
    if (nr) out.push({ sev: 'info', msg: nr + ' stereocentre' + (nr > 1 ? 's' : '') + ' assigned from the 3D geometry.', atoms: [...st.entries()].filter((e) => e[1] === 'R' || e[1] === 'S').map((e) => e[0]) });
    if (!out.some((o) => o.sev !== 'info')) out.unshift({ sev: 'ok', msg: 'No valence or contact problems found.', atoms: [] });
    return out;
  };

  /* ------------------------------------------------------------ property estimates */
  /** topological polar surface area from N and O fragment contributions (Å²) */
  bio.tpsa = function (m) {
    const A = m.atoms, nb = m.nb(), arom = new Set(); C.aromaticRings(m).forEach((r) => r.forEach((i) => arom.add(i)));
    let t = 0;
    A.forEach((a, i) => {
      if (a.e !== 7 && a.e !== 8) return;
      const nh = nb[i].filter((x) => A[x.j].e === 1).length + C.implicitH(m, i), ds = nb[i].filter((x) => A[x.j].e > 1).length, con = ds + nh;
      const ord = nb[i].reduce((s, x) => s + m.bonds[x.b].o, 0) + C.implicitH(m, i), dbl = nb[i].some((x) => m.bonds[x.b].o === 2), trp = nb[i].some((x) => m.bonds[x.b].o === 3);
      if (a.e === 8) {
        if (a.q < 0) t += 23.06; else if (arom.has(i)) t += 13.14; else if (dbl) t += 17.07; else if (nh) t += 20.23; else t += 9.23;
      } else if (a.q > 0) { t += nh === 3 ? 27.64 : nh === 2 ? 16.61 : nh === 1 ? 4.44 : 0; } else if (arom.has(i)) { t += nh ? 15.79 : con === 3 ? 4.41 : 12.89; } else if (trp) t += 23.79;
      else if (dbl) t += nh ? 23.85 : 12.36;
      else t += nh === 2 ? 26.02 : nh === 1 ? 12.03 : 3.24;
    });
    return t;
  };
  /* Atom-type model for log P, fitted to ~100 experimental values of small molecules (leave-one-out error about 0.6). Treat as an estimate. */
  const LOGP_T = ['Cali', 'Chet', 'Car', 'Csp2', 'Cco', 'Csp', 'HC', 'Hhet', 'Osp3', 'Oco', 'Oar', 'Nam', 'Nar', 'Nsp2', 'F', 'Cl', 'Br', 'I', 'S', 'P', 'Nco'];
  bio.logpTypes = function (m) {
    const A = m.atoms, nb = m.nb(), arom = new Set(); C.aromaticRings(m).forEach((r) => r.forEach((i) => arom.add(i)));
    const cnt = {}; LOGP_T.forEach((k) => (cnt[k] = 0));
    const hetero = (j) => [7, 8, 9, 16, 17, 35, 53].includes(A[j].e);
    const add = (k, n) => { cnt[k] += n == null ? 1 : n; };
    A.forEach((a, i) => {
      const ih = C.implicitH(m, i), dbl = nb[i].some((x) => m.bonds[x.b].o === 2), trp = nb[i].some((x) => m.bonds[x.b].o === 3);
      switch (a.e) {
        case 1: { const p = nb[i][0]; add(p && (A[p.j].e === 7 || A[p.j].e === 8 || A[p.j].e === 16) ? 'Hhet' : 'HC'); break; }
        case 6:
          if (arom.has(i)) add('Car');
          else if (trp) add('Csp');
          else if (dbl) add(nb[i].some((x) => m.bonds[x.b].o === 2 && (A[x.j].e === 8 || A[x.j].e === 7 || A[x.j].e === 16)) ? 'Cco' : 'Csp2');
          else add(nb[i].some((x) => hetero(x.j)) ? 'Chet' : 'Cali');
          if (ih) add('HC', ih); break;
        case 7: {
          const amide = nb[i].some((x) => A[x.j].e === 6 && nb[x.j].some((y) => m.bonds[y.b].o === 2 && A[y.j].e === 8));
          if (arom.has(i)) add('Nar'); else if (trp || dbl) add('Nsp2'); else if (amide) add('Nco'); else add('Nam');
          if (ih) add('Hhet', ih); break;
        }
        case 8:
          if (arom.has(i)) add('Oar'); else if (dbl || (a.q < 0)) add('Oco'); else add('Osp3');
          if (ih) add('Hhet', ih); break;
        case 9: add('F'); break; case 17: add('Cl'); break; case 35: add('Br'); break; case 53: add('I'); break;
        case 16: add('S'); if (ih) add('Hhet', ih); break;
        case 15: add('P'); break;
      }
    });
    return cnt;
  };
  const LOGP_W = {"Cali":0.218,"Chet":-0.432,"Car":0.219,"Csp2":0.263,"Cco":-0.425,"Csp":0.018,"HC":0.141,"Hhet":-0.333,"Osp3":-0.036,"Oco":-0.076,"Oar":-0.05,"Nam":-0.195,"Nar":-0.276,"Nsp2":-0.285,"F":0.226,"Cl":0.779,"Br":0.997,"I":1.317,"S":0.293,"P":-0.5,"Nco":-0.197};
  bio.setLogpWeights = (w) => Object.assign(LOGP_W, w);
  bio.logp = function (m) { const c = bio.logpTypes(m); let s = 0; LOGP_T.forEach((k) => { s += (LOGP_W[k] || 0) * c[k]; }); return s; };
  bio.LOGP_T = LOGP_T;

  bio.props = function (m) {
    const p = C.props(m), lp = bio.logp(m), tp = bio.tpsa(m);
    const lip = [['Molar mass ≤ 500', p.mass <= 500], ['H-bond donors ≤ 5', p.hbd <= 5], ['H-bond acceptors ≤ 10', p.hba <= 10], ['log P ≤ 5', lp <= 5]];
    return { logp: lp, tpsa: tp, hbd: p.hbd, hba: p.hba, rotatable: p.rotatable, mass: p.mass, lipinski: lip, violations: lip.filter((x) => !x[1]).length, veber: tp <= 140 && p.rotatable <= 10 };
  };

  /* ------------------------------------------------------------ exact mass and isotope pattern */
  const ISO = {
    1: [[1.00782503, 0.999885], [2.01410178, 0.000115]], 5: [[10.0129370, 0.199], [11.0093054, 0.801]], 6: [[12, 0.9893], [13.0033548, 0.0107]],
    7: [[14.0030740, 0.99636], [15.0001089, 0.00364]], 8: [[15.9949146, 0.99757], [16.9991317, 0.00038], [17.9991596, 0.00205]], 9: [[18.9984032, 1]],
    11: [[22.9897693, 1]], 14: [[27.9769265, 0.92223], [28.9764947, 0.04685], [29.9737702, 0.03092]], 15: [[30.9737620, 1]],
    16: [[31.9720707, 0.9499], [32.9714589, 0.0075], [33.9678670, 0.0425], [35.9670808, 0.0001]], 17: [[34.9688527, 0.7576], [36.9659026, 0.2424]],
    19: [[38.9637069, 0.932581], [40.9618260, 0.067302]], 35: [[78.9183376, 0.5069], [80.9162897, 0.4931]], 53: [[126.904473, 1]],
    34: [[79.9165218, 0.4961], [77.9173095, 0.2377], [81.9166995, 0.0873], [75.9192137, 0.0937], [76.9199146, 0.0763]],
  };
  /** returns {mono, peaks:[{mass, p}]} with p relative to the tallest peak; null if an element is not tabulated */
  bio.isotopes = function (m, idx) {
    const cnt = {}; (idx || m.atoms.map((_, i) => i)).forEach((i) => { const e = m.atoms[i].e; cnt[e] = (cnt[e] || 0) + 1; });
    let dist = [[0, 1]];
    for (const z in cnt) {
      const iso = ISO[z]; if (!iso) return null;
      for (let k = 0; k < cnt[z]; k++) {
        const nd = new Map();
        for (const [ma, pa] of dist) for (const [mb, pb] of iso) {
          const mm = ma + mb, key = Math.round(mm * 50), p = pa * pb;
          const cur = nd.get(key); if (cur) { cur[0] = (cur[0] * cur[1] + mm * p) / (cur[1] + p); cur[1] += p; } else nd.set(key, [mm, p]);
        }
        dist = [...nd.values()].filter((d) => d[1] > 1e-9);
      }
    }
    dist.sort((a, b) => a[0] - b[0]);
    // merge to nominal mass
    const nom = new Map(); dist.forEach(([mm, p]) => { const k = Math.round(mm); const c = nom.get(k); if (c) { c[0] = (c[0] * c[1] + mm * p) / (c[1] + p); c[1] += p; } else nom.set(k, [mm, p]); });
    const peaks = [...nom.values()].map(([mm, p]) => ({ mass: mm, p })); const mx = Math.max(...peaks.map((x) => x.p));
    peaks.forEach((x) => { x.p /= mx; });
    const first = peaks.find((x) => x.p > 0);
    return { mono: peaks.slice().sort((a, b) => b.p - a.p)[0].mass, lowest: first.mass, peaks: peaks.filter((x) => x.p > 0.002) };
  };
  /** exact mass of the most abundant isotopologue-free monoisotopic species */
  bio.monoMass = function (m) { let s = 0; for (const a of m.atoms) { const iso = ISO[a.e]; s += iso ? iso[0][0] : EL[a.e].mass; } return s; };

  /* ------------------------------------------------------------ FASTA */
  bio.parseFasta = function (text) {
    const recs = []; let cur = null;
    String(text).split(/\r?\n/).forEach((l) => {
      l = l.trim(); if (!l) return;
      if (l[0] === '>') { cur = { name: l.slice(1).trim(), seq: '' }; recs.push(cur); } else { if (!cur) { cur = { name: '', seq: '' }; recs.push(cur); } cur.seq += l.replace(/[\s\d*-]/g, ''); }
    });
    recs.forEach((r) => { r.seq = r.seq.toUpperCase(); r.kind = bio.guessKind(r.seq, r.name); });
    return recs;
  };
  /** 'dna' | 'rna' | 'protein' */
  bio.guessKind = function (seq, name) {
    const s = seq.toUpperCase(); if (!s) return 'protein';
    if (/\b(rna|mrna|trna|rrna)\b/i.test(name || '')) return 'rna';
    if (/\b(dna|genomic|plasmid)\b/i.test(name || '')) return 'dna';
    const nuc = s.replace(/[ACGTUN]/g, '').length === 0;
    if (nuc && s.length >= 8) return s.includes('U') && !s.includes('T') ? 'rna' : 'dna';
    return 'protein';
  };
  bio.looksLikeFasta = (t) => /^\s*>/.test(t) && /\n[A-Za-z*\- ]+/.test(t);

  /* ------------------------------------------------------------ all-atom DNA / RNA */
  const NA_NAMES = new Set(['A', 'C', 'G', 'T', 'U', 'DA', 'DC', 'DG', 'DT', 'DU', 'RA', 'RC', 'RG', 'RU', 'ADE', 'CYT', 'GUA', 'THY', 'URA']);
  bio.baseOf = function (rn) { rn = rn.toUpperCase(); const map = { ADE: 'A', CYT: 'C', GUA: 'G', THY: 'T', URA: 'U' }; if (map[rn]) return map[rn]; return rn.length === 2 && (rn[0] === 'D' || rn[0] === 'R') ? rn[1] : rn; };
  bio.isNucleic = (m) => { if (m._isNA !== undefined && m._isNAv === m.res.length) return m._isNA; m._isNAv = m.res.length; m._isNA = m.res.length > 1 && m.res.filter((r) => NA_NAMES.has(r.name.toUpperCase())).length >= m.res.length * 0.6; return m._isNA; };

  const BASE_BONDS = {
    A: [['C1\'', 'N9', 1], ['N9', 'C8', 1], ['C8', 'N7', 2], ['N7', 'C5', 1], ['C5', 'C4', 2], ['C4', 'N9', 1], ['C5', 'C6', 1], ['C6', 'N6', 1], ['C6', 'N1', 2], ['N1', 'C2', 1], ['C2', 'N3', 2], ['N3', 'C4', 1]],
    G: [['C1\'', 'N9', 1], ['N9', 'C8', 1], ['C8', 'N7', 2], ['N7', 'C5', 1], ['C5', 'C4', 2], ['C4', 'N9', 1], ['C5', 'C6', 1], ['C6', 'O6', 2], ['C6', 'N1', 1], ['N1', 'C2', 1], ['C2', 'N2', 1], ['C2', 'N3', 2], ['N3', 'C4', 1]],
    C: [['C1\'', 'N1', 1], ['N1', 'C2', 1], ['C2', 'O2', 2], ['C2', 'N3', 1], ['N3', 'C4', 2], ['C4', 'N4', 1], ['C4', 'C5', 1], ['C5', 'C6', 2], ['C6', 'N1', 1]],
    T: [['C1\'', 'N1', 1], ['N1', 'C2', 1], ['C2', 'O2', 2], ['C2', 'N3', 1], ['N3', 'C4', 1], ['C4', 'O4', 2], ['C4', 'C5', 1], ['C5', 'C7', 1], ['C5', 'C6', 2], ['C6', 'N1', 1]],
  };
  BASE_BONDS.U = BASE_BONDS.T.filter((b) => b[1] !== 'C7' && b[0] !== 'C7');
  const SUGAR_BONDS = [['P', 'OP1', 2], ['P', 'OP2', 1], ['P', 'O5\'', 1], ['O5\'', 'C5\'', 1], ['C5\'', 'C4\'', 1], ['C4\'', 'O4\'', 1], ['C4\'', 'C3\'', 1], ['O4\'', 'C1\'', 1], ['C3\'', 'O3\'', 1], ['C3\'', 'C2\'', 1], ['C2\'', 'C1\'', 1]];
  const COMP = { A: 'T', T: 'A', G: 'C', C: 'G', U: 'A' };
  const TEMPLATE_ATOMS = ['P', 'OP1', 'OP2', 'O5\'', 'C5\'', 'C4\'', 'O4\'', 'C3\'', 'O3\'', 'C2\'', 'C1\''];
  const BASE_ATOMS = { A: ['N9', 'C8', 'N7', 'C5', 'C6', 'N6', 'N1', 'C2', 'N3', 'C4'], G: ['N9', 'C8', 'N7', 'C5', 'C6', 'O6', 'N1', 'C2', 'N2', 'N3', 'C4'], C: ['N1', 'C2', 'O2', 'N3', 'C4', 'N4', 'C5', 'C6'], T: ['N1', 'C2', 'O2', 'N3', 'C4', 'O4', 'C5', 'C7', 'C6'] };
  BASE_ATOMS.U = BASE_ATOMS.T.filter((n) => n !== 'C7');

  let _tpl = null;
  /** derive per-base templates and idealised helix parameters from the embedded B-DNA dodecamer */
  function templates() {
    if (_tpl) return _tpl;
    const src = window.MS_SAMPLES && window.MS_SAMPLES['DNA dodecamer']; if (!src) throw new Error('Nucleic-acid template data is missing.');
    const res = new Map();
    src.split('\n').forEach((l) => {
      if (!/^ATOM/.test(l)) return;
      const ch = l[21], num = parseInt(l.slice(22, 26), 10), key = ch + num;
      let r = res.get(key); if (!r) res.set(key, (r = { ch, num, name: l.slice(17, 20).trim(), at: {} }));
      r.at[l.slice(12, 16).trim()] = [parseFloat(l.slice(30, 38)), parseFloat(l.slice(38, 46)), parseFloat(l.slice(46, 54))];
    });
    const RING = ['N1', 'C2', 'N3', 'C4', 'C5', 'C6'];
    const cen = (r) => { let s = [0, 0, 0]; RING.forEach((n) => { s = V.add(s, r.at[n]); }); return V.mul(s, 1 / 6); };
    const NS = 12, A = [], B = [];
    for (let s = 0; s < NS; s++) { A.push(res.get('A' + (s + 1))); B.push(res.get('B' + (24 - s))); }
    const mid = A.map((r, s) => V.mul(V.add(cen(r), cen(B[s])), 0.5));
    // helix axis: principal direction of the base-pair centres
    const mean = mid.reduce((p, q) => V.add(p, q), [0, 0, 0]).map((x) => x / NS);
    let ax = V.norm(V.sub(mid[NS - 1], mid[0]));
    for (let it = 0; it < 30; it++) { let nx = [0, 0, 0]; mid.forEach((p) => { const d = V.sub(p, mean); nx = V.add(nx, V.mul(d, V.dot(d, ax))); }); ax = V.norm(nx); }
    if (V.dot(ax, V.sub(mid[NS - 1], mid[0])) < 0) ax = V.mul(ax, -1);
    const ex = V.norm(V.perp(ax)), ey = V.cross(ax, ex);
    const toAxis = (p) => { const d = V.sub(p, mean); return [V.dot(d, ex), V.dot(d, ey), V.dot(d, ax)]; };
    // twist and rise from the centroids of strand A
    const cA = A.map((r) => toAxis(cen(r)));
    let tw = 0, rise = 0; for (let s = 1; s < NS; s++) { let d = Math.atan2(cA[s][1], cA[s][0]) - Math.atan2(cA[s - 1][1], cA[s - 1][0]); while (d < -Math.PI) d += 2 * Math.PI; while (d > Math.PI) d -= 2 * Math.PI; tw += d; } tw /= NS - 1;
    rise = (toAxis(mid[NS - 1])[2] - toAxis(mid[0])[2]) / (NS - 1);
    const unrot = (p, s) => { const t = -tw * s, c = Math.cos(t), sn = Math.sin(t), z = p[2] - rise * s; return [c * p[0] - sn * p[1], sn * p[0] + c * p[1], z]; };
    const acc = { A: {}, B: {} };
    const take = (strand, key, r, s) => { for (const n in r.at) { const o = (acc[strand][key] = acc[strand][key] || {}); const e = (o[n] = o[n] || { s: [0, 0, 0], n: 0 }); e.s = V.add(e.s, unrot(toAxis(r.at[n]), s)); e.n++; } };
    for (let s = 1; s < NS - 1; s++) {
      const bA = bio.baseOf(A[s].name); take('A', bA, A[s], s); take('B', bA, B[s], s);
    }
    const out = { tw, rise, A: {}, B: {}, nameB: {} };
    ['A', 'B'].forEach((st) => { for (const k in acc[st]) { out[st][k] = {}; for (const n in acc[st][k]) out[st][k][n] = V.mul(acc[st][k][n].s, 1 / acc[st][k][n].n); } });
    // uracil template: thymine without the methyl group
    ['A', 'B'].forEach((st) => { if (out[st].T) { out[st].U = Object.assign({}, out[st].T); delete out[st].U.C7; } });
    _tpl = out; return out;
  }
  bio.templateInfo = () => { const t = templates(); return { twist: t.tw * 180 / Math.PI, rise: t.rise }; };

  /**
   * Build an all-atom double (or single) helix from a sequence.
   * opts: { rna: bool, double: bool (default true), minimize: bool }
   */
  bio.nucleic = function (seqStr, opts) {
    opts = opts || {};
    const rna = !!opts.rna, dbl = opts.double !== false;
    let seq = seqStr.toUpperCase().replace(/[^A-Z]/g, '').split('');
    seq = seq.map((c) => (rna ? (c === 'T' ? 'U' : c) : (c === 'U' ? 'T' : c)));
    const bad = seq.filter((c) => !'ACGTU'.includes(c)); if (bad.length) throw new Error('Unsupported letter' + (bad.length > 1 ? 's' : '') + ' in the sequence: ' + [...new Set(bad)].join(', ') + '. Use A, C, G and ' + (rna ? 'U' : 'T') + '.');
    if (seq.length < 1) throw new Error('Enter a sequence.');
    if (seq.length > 40) throw new Error('Up to 40 bases (80 for a duplex) are supported.');
    const T = templates(), n = seq.length, m = new MS.Mol();
    const place = (p, s) => { const t = T.tw * s, c = Math.cos(t), sn = Math.sin(t); return [c * p[0] - sn * p[1], sn * p[0] + c * p[1], p[2] + T.rise * s]; };
    const strands = [{ ch: 'A', bases: seq, step: (i) => i, id: 'A' }];
    if (dbl) { const comp = seq.map((c) => COMP[rna ? (c === 'U' ? 'U' : c) : c]).map((c, i) => (rna && c === 'T' ? 'U' : c)); strands.push({ ch: 'B', bases: comp.slice().reverse(), step: (i) => n - 1 - i, id: 'B', partner: seq.slice().reverse() }); }
    const rn = (b) => (rna ? b : 'D' + b);
    const O3 = [], Pidx = []; // per strand: last O3' index, and first P
    strands.forEach((st, si) => {
      let prevO3 = -1;
      st.bases.forEach((b, i) => {
        const s = st.step(i), partnerA = si === 0 ? b : st.partner[i];
        const tpl = si === 0 ? T.A[b === 'U' ? 'U' : b] : T.B[partnerA === 'U' ? 'U' : partnerA];
        if (!tpl) throw new Error('Template missing for base ' + b);
        const ridx = m.res.length; m.res.push({ name: rn(b), num: i + 1, chain: st.ch, ss: 'C', aa: false, na: true, water: false });
        const first = i === 0, idx = {};
        const names = TEMPLATE_ATOMS.concat(BASE_ATOMS[b]);
        names.forEach((nm) => {
          if (first && (nm === 'P' || nm === 'OP1' || nm === 'OP2')) return;
          const p = tpl[nm]; if (!p) return;
          const q = place(p, s), el = { P: 15 }[nm] || ({ O: 8, N: 7, C: 6 }[nm[0]]);
          idx[nm] = m.addAtom(el, q[0], q[1], q[2], { nm, r: ridx, q: nm === 'OP2' ? -1 : 0 });
        });
        SUGAR_BONDS.concat(BASE_BONDS[b]).forEach(([a, c, o]) => { if (idx[a] !== undefined && idx[c] !== undefined) m.addBond(idx[a], idx[c], o); });
        if (prevO3 >= 0) m.addBond(prevO3, idx.P, 1);
        prevO3 = idx['O3\''];
      });
    });
    if (rna) { // 2'-hydroxyl, cis to O3'
      m.atoms.forEach((a, i) => {
        if (a.nm !== 'C2\'') return; const ro = m.res[a.r];
        const o3 = m.atoms.findIndex((x) => x.r === a.r && x.nm === 'O3\''), c3 = m.atoms.findIndex((x) => x.r === a.r && x.nm === 'C3\'');
        const dirs = C.missingDirs(m, i, 2, 'sp3'); const ref = V.sub(m.pos(o3), m.pos(c3));
        const d = V.dot(dirs[0], ref) > V.dot(dirs[1], ref) ? dirs[0] : dirs[1];
        m.addAtom(8, a.x + d[0] * 1.43, a.y + d[1] * 1.43, a.z + d[2] * 1.43, { nm: 'O2\'', r: a.r }); m.addBond(i, m.atoms.length - 1, 1);
      });
    }
    const heavy = m.atoms.length;
    C.addHydrogens(m);
    for (let i = heavy; i < m.atoms.length; i++) { const nbr = m.nb()[i][0]; if (nbr) { m.atoms[i].r = m.atoms[nbr.j].r; m.atoms[i].nm = 'H' + (m.atoms[nbr.j].nm || ''); } }
    // relax the backbone junctions and hydrogens, keep the base geometry
    if (opts.minimize !== false) {
      m.atoms.forEach((a) => { a.fx = a.e > 1 && !/^(P|OP1|OP2|O5'|C5'|O3'|O2')$/.test(a.nm) ? 1 : 0; });
      MS.ff.minimize(m, 120);
      m.atoms.forEach((a) => { a.fx = 0; });
      MS.ff.minimize(m, 80);
    }
    const c = m.centroid(); m.translate(null, [-c[0], -c[1], -c[2]]);
    m.atoms.forEach((a) => { const y = a.y; a.y = a.z; a.z = -y; }); // helix axis vertical
    m.title = (rna ? 'RNA ' : 'DNA ') + (dbl ? 'duplex ' : 'strand ') + seq.join('');
    m.meta.nucleic = true; m.touch();
    return m;
  };

  /* ------------------------------------------------------------ base-pair hydrogen bonds */
  const DON = { A: ['N6'], G: ['N1', 'N2'], C: ['N4'], T: ['N3'], U: ['N3'] }, ACC = { A: ['N1'], G: ['O6'], C: ['N3', 'O2'], T: ['O4'], U: ['O4'] };
  bio.basePairBonds = function (m) {
    if (!bio.isNucleic(m)) return [];
    const c = m._hb; if (c && c.v === m.ver) return c.list;
    const donors = [], accs = [], nb = m.nb();
    m.atoms.forEach((a, i) => {
      if (a.r < 0) return; const r = m.res[a.r]; if (!NA_NAMES.has(r.name.toUpperCase())) return; const b = bio.baseOf(r.name);
      if ((DON[b] || []).includes(a.nm)) { const h = nb[i].filter((x) => m.atoms[x.j].e === 1).map((x) => x.j); donors.push({ i, r: a.r, ch: r.chain, h }); }
      if ((ACC[b] || []).includes(a.nm)) accs.push({ i, r: a.r, ch: r.chain });
    });
    const cand = [];
    donors.forEach((d) => accs.forEach((a) => {
      if (d.r === a.r || d.ch === a.ch) return;
      const dd = MS.geom.dist(m, d.i, a.i); if (dd < 2.45 || dd > 3.45) return;
      let from = d.i; if (d.h.length) { let best = 1e9; d.h.forEach((h) => { const x = MS.geom.dist(m, h, a.i); if (x < best) { best = x; from = h; } }); if (best > 2.5) return; }
      cand.push({ dd, from, d: d.i, a: a.i, rd: d.r, ra: a.r });
    }));
    // pair residues mutually by their best contact set, then keep one bond per donor and acceptor
    const sc = new Map(); cand.forEach((c) => { const k = Math.min(c.rd, c.ra) + '_' + Math.max(c.rd, c.ra); const o = sc.get(k) || { n: 0, s: 0, a: Math.min(c.rd, c.ra), b: Math.max(c.rd, c.ra) }; o.n++; o.s += c.dd; sc.set(k, o); });
    const better = (x, y) => !y || x.n > y.n || (x.n === y.n && x.s < y.s), best = new Map();
    sc.forEach((o) => { [o.a, o.b].forEach((r) => { if (better(o, best.get(r))) best.set(r, o); }); });
    const okPair = new Set(); sc.forEach((o, k) => { if (best.get(o.a) === o && best.get(o.b) === o) okPair.add(k); });
    cand.sort((p, q) => p.dd - q.dd); const usedD = new Set(), usedA = new Set(), list = [];
    cand.forEach((c) => { if (!okPair.has(Math.min(c.rd, c.ra) + '_' + Math.max(c.rd, c.ra)) || usedD.has(c.d) || usedA.has(c.a)) return; usedD.add(c.d); usedA.add(c.a); list.push([c.from, c.a]); });
    m._hb = { v: m.ver, list }; return list;
  };
})();
