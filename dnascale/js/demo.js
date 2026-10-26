/* Synthetic Sanger data so the app can be explored without any files. */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});

  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = (r) => { let u = 0; for (let i = 0; i < 4; i++) u += r(); return (u - 2) * 1.73; };

  function randomGene(len, seed) {
    const r = rng(seed), B = 'ACGT', stops = new Set(['TAA', 'TAG', 'TGA']);
    let s = 'ATG';
    while (s.length < len - 3) {
      let c; do { c = B[(r() * 4) | 0] + B[(r() * 4) | 0] + B[(r() * 4) | 0]; } while (stops.has(c));
      s += c;
    }
    return s + 'TAA';
  }

  function synthTrace(seq, { name, seed = 1, het = {}, spacing = 11.2 }) {
    const r = rng(seed), L = seq.length, SIG = 2.7;
    const peaks = new Int32Array(L), qual = new Uint8Array(L);
    const N = Math.round(26 + L * spacing + 40);
    const ch = { A: new Float32Array(N), C: new Float32Array(N), G: new Float32Array(N), T: new Float32Array(N) };
    let called = '';
    const addPeak = (arr, c, amp) => {
      const a = Math.max(0, (c - 5 * SIG) | 0), b = Math.min(N - 1, (c + 5 * SIG) | 0);
      for (let x = a; x <= b; x++) arr[x] += amp * Math.exp(-((x - c) ** 2) / (2 * SIG * SIG));
    };
    for (let i = 0; i < L; i++) {
      const c = 26 + i * spacing + gauss(r) * 0.6;
      peaks[i] = Math.round(c);
      // quality profile: poor start, great middle, decaying tail
      const head = Math.min(1, i / 38), tail = Math.min(1, (L - i) / 90);
      const qf = Math.min(head, tail);
      let q = Math.round(6 + qf * (48 + gauss(r) * 3));
      let amp = 900 + 700 * qf * (0.7 + r() * 0.6) * (i % 7 === 3 ? 0.8 : 1);
      if (i > L * 0.55) amp *= 1 - 0.35 * ((i - L * 0.55) / (L * 0.45));
      let b = seq[i];
      const noise = (1 - qf) * 0.5 + 0.02;
      if (het[i]) {
        const o = het[i];
        addPeak(ch[b], c, amp * 0.52); addPeak(ch[o], c, amp * 0.48);
        q = 11; if (r() < 0.5) b = o;
      } else if (qf < 0.55 && r() < 0.16 * (1 - qf)) {
        const alt = 'ACGT'.replace(b, '')[(r() * 3) | 0];
        addPeak(ch[b], c, amp * 0.42); addPeak(ch[alt], c, amp * 0.55);
        b = alt; q = Math.min(q, 9);
      } else addPeak(ch[b], c, amp);
      // cross-talk / shoulder + noisy secondary peaks in poor regions
      for (const k of 'ACGT') if (k !== b && r() < noise) addPeak(ch[k], c + gauss(r) * 2, amp * noise * 0.9 * r());
      called += b; qual[i] = Math.max(2, Math.min(60, q));
    }
    for (const k of 'ACGT') {
      const a = ch[k];
      for (let x = 0; x < N; x++) a[x] = Math.round(Math.max(0, a[x] + 18 + gauss(r) * 9));
    }
    return BW.makeTrace({ name, sample: name.replace(/\.ab1$/i, ''), bases: called, qual, peaks, ch, meta: { Instrument: 'Synthetic (demo)', Basecaller: 'DNAScale demo' } });
  }

  BW.demoProject = () => {
    const ref = randomGene(756, 20240611);
    const sample = [...ref];
    sample[329] = sample[329] === 'T' ? 'C' : 'T';           // homozygous SNP (pos 330)
    const hetPos = 409, hetAlt = sample[hetPos] === 'A' ? 'G' : 'A'; // heterozygous (pos 410)
    const sampleSeq = sample.join('');
    const fwdSeq = sampleSeq.slice(22, 680);
    const revSeq = BW.revcomp(sampleSeq.slice(250, 756));
    const hetF = { [hetPos - 22]: hetAlt };
    const hetR = { [revSeq.length - 1 - (hetPos - 250)]: BW.complementBase(hetAlt) };
    return {
      reference: { name: 'GENE1_reference', seq: ref },
      reads: [
        synthTrace(fwdSeq, { name: 'Clone12_T7_fwd.ab1', seed: 7, het: hetF }),
        synthTrace(revSeq, { name: 'Clone12_pRev.ab1', seed: 11, het: hetR }),
      ],
      note: { snp: 330, het: 410 },
    };
  };

  BW.synthTrace = synthTrace;
})();
