/* QualityScale demo data: small synthetic sequencing runs with realistic problems. */
(function () {
  'use strict';
  const QS = globalThis.QS;
  const ADAPTER = 'AGATCGGAAGAGCACACGTCTGAACTCCAGTCACATCACGATCTCGTATGCCGTCTTCTGCTTG';
  const DIMER = 'AATGATACGGCGACCACCGAGATCTACACTCTTTCCCTACACGACGCTCTTCCGATCTAGATCGGAAGAGCACACGTCTGAACTCCAGTCAC';
  const COMP = { A: 'T', C: 'G', G: 'C', T: 'A', N: 'N' };
  const rc = (s) => { let o = ''; for (let i = s.length - 1; i >= 0; i--) o += COMP[s[i]]; return o; };
  function genome(rng, len, gc) { const a = []; for (let i = 0; i < len; i++) { const r = rng(); a.push(r < gc ? (r < gc / 2 ? 'G' : 'C') : (r < gc + (1 - gc) / 2 ? 'A' : 'T')); } return a.join(''); }
  const gauss = (rng) => { let u = 0; for (let i = 0; i < 6; i++) u += rng(); return (u - 3) * 1.414; };

  const KINDS = {
    good: { name: 'Library A · R1', seed: 11, n: 15000, L: 150, frag: 400, fragSd: 70, dup: 0.02, adapter: 1, over: 0, qDrop: 3, contam: 0, bias: false, polyG: 0, badTile: false, bubble: false, nCycle: false, bcMain: 0.985 },
    tail: { name: 'Library A · R2', seed: 23, n: 15000, L: 150, frag: 190, fragSd: 55, dup: 0.4, adapter: 1, over: 0.021, qDrop: 17, contam: 0.11, bias: false, polyG: 0.07, badTile: true, bubble: true, nCycle: true, bcMain: 0.9 },
    rna: { name: 'Library C · RNA', seed: 37, n: 15000, L: 101, frag: 260, fragSd: 60, dup: 0.35, adapter: 0.4, over: 0.012, qDrop: 5, contam: 0, bias: true, polyG: 0.01, badTile: false, bubble: false, nCycle: false, trim: true, bcMain: 0.96 },
  };

  QS.demoKinds = Object.keys(KINDS);
  QS.demoName = (k) => KINDS[k].name;
  QS.makeDemo = function (kind, n) {
    const K = KINDS[kind], rng = QS.mulberry32(K.seed), rngA = QS.mulberry32(777), L = K.L; n = n || K.n;
    const G = genome(QS.mulberry32(5), 300000, 0.41), G2 = genome(QS.mulberry32(6), 60000, 0.64);
    const hot = Array.from({ length: 250 }, () => Math.floor(rng() * (G.length - 700))), hotFrag = hot.map(() => 80 + Math.floor(rng() * 250));
    const tiles = []; for (const s of [1, 2]) for (const w of [1, 2, 3]) for (let t = 1; t <= 14; t++) tiles.push(s * 1000 + w * 100 + t);
    const bcs = ['ATCACGAT', 'CGATGTAT', 'TTAGGCAT'], bcMain = bcs[0];
    const bias = [[.34, .16, .2, .3], [.28, .2, .22, .3], [.3, .2, .24, .26]];
    const out = [];
    for (let i = 0; i < n; i++) {
      const tile = tiles[Math.floor(rngA() * tiles.length)];
      const x = Math.floor(1000 + rngA() * 31000), y = Math.floor(1000 + rngA() * 31000), rb1 = rngA(), rb2 = rngA(), rf = rngA();
      let frag = Math.max(35, Math.round(K.frag + gauss(rng) * K.fragSd)), seq, kindOfRead = 0;
      const r0 = rng();
      if (K.over && r0 < K.over) { seq = DIMER; kindOfRead = 1; }
      else {
        const from2 = rng() < K.contam, src = from2 ? G2 : G;
        const isDup = rng() < K.dup && !from2, hi = Math.floor(rng() * hot.length);
        const st = isDup ? hot[hi] : Math.floor(rng() * (src.length - 700));
        if (isDup) frag = hotFrag[hi];
        let ins = src.substr(st, Math.max(frag, 30));
        if (isDup ? hi % 2 : rng() < 0.5) ins = rc(ins);
        seq = frag < L ? ins.substr(0, frag) + ADAPTER : ins;
        if (K.adapter < 1 && frag < L && rng() > K.adapter) seq = ins.substr(0, L);
      }
      if (seq.length < L) seq += genome(rng, L - seq.length, 0.4);
      seq = seq.substr(0, L);
      let rl = L; if (K.trim) rl = Math.max(36, Math.min(L, Math.round(L - Math.abs(gauss(rng)) * 22 - (rng() < 0.25 ? rng() * 40 : 0))));
      const sa = seq.split('');
      // quality model
      const shift = gauss(rng) * 1.8, polyStart = rng() < K.polyG ? 90 + Math.floor(rng() * 50) : -1;
      const crash = rng() < (K.qDrop > 10 ? 0.16 : 0.01) ? 60 + Math.floor(rng() * 80) : -1;
      const badT = K.badTile && tile === 1208, bubble = K.bubble && tile === 2105 && x > 12000 && x < 19000 && y > 10000 && y < 17000;
      const ql = [];
      for (let p = 0; p < rl; p++) {
        const f = p / L;
        let mu = 38.5 - K.qDrop * f * f * f - 1.2 * f - (p < 3 ? 2 : 0);
        if (K.qDrop > 10) mu -= 8 * Math.max(0, f - 0.55) * 4;
        if (badT && p > 38 && p < 112) mu -= 13;
        if (bubble) mu -= 17;
        let q = Math.round(mu + shift + gauss(rng) * (2 + f * (K.qDrop > 10 ? 6 : 2)));
        if (crash >= 0 && p >= crash) q = 2 + Math.floor(rng() * 5);
        if (polyStart >= 0 && p >= polyStart) { q = 2; sa[p] = 'G'; }
        if (K.nCycle && p === 31 && rng() < 0.04) { sa[p] = 'N'; q = 2; }
        q = Math.max(2, Math.min(41, q));
        if (sa[p] !== 'N' && q < 38 && rng() < Math.pow(10, -q / 10)) sa[p] = 'ACGT'[Math.floor(rng() * 4)];
        if (q <= 2 && rng() < 0.2) sa[p] = 'N';
        if (K.bias && p < 10 && rng() < 0.4) { const b = bias[Math.min(2, p >> 1)], r = rng(); sa[p] = r < b[0] ? 'A' : r < b[0] + b[1] ? 'C' : r < b[0] + b[1] + b[2] ? 'G' : 'T'; }
        ql.push(String.fromCharCode(33 + q));
      }
      const bc = rb1 < K.bcMain ? bcMain : rb2 < 0.6 ? 'ATCACGAA' : bcs[1 + (rb2 > 0.8 ? 1 : 0)];
      out.push(`@SIM00123:77:HFKXYDSX2:${1 + (tile % 100 > 7 ? 1 : 0)}:${tile}:${x}:${y} 1:${rf < 0.012 ? 'Y' : 'N'}:0:${bc}\n${sa.slice(0, rl).join('')}\n+\n${ql.join('')}\n`);
    }
    return out.join('');
  };
})();
