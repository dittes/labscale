/* QualityScale engine: streaming FASTQ/FASTA parser and the single-pass read analyser. */
(function () {
  'use strict';
  const QS = globalThis.QS;
  const CAPPOS = 5000, NQ = 94, TP = 500, NB = 110, DUPLIM = 100000;
  const BASE = new Uint8Array(256).fill(4);
  'ACGT'.split('').forEach((c, i) => { BASE[c.charCodeAt(0)] = i; BASE[c.toLowerCase().charCodeAt(0)] = i; });
  const kbin = (p) => (p < 50 ? p : 50 + ((p - 50) >> 3));
  QS.kmerBinStart = (b) => (b < 50 ? b : 50 + (b - 50) * 8);
  QS.NQ = NQ; QS.TP = TP; QS.NB = NB;

  function encodingFor(min) {
    if (min < 33) return { name: 'Unknown (characters below “!”)', offset: 33 };
    if (min < 59) return { name: 'Phred+33', offset: 33 };
    if (min < 64) return { name: 'Phred+64 (legacy scale)', offset: 64 };
    if (min <= 65) return { name: 'Phred+64', offset: 64 };
    return { name: 'Phred+33', offset: 33 };
  }

  QS.Analyzer = class Analyzer {
    constructor(o) {
      o = this.o = o || {};
      this.limit = o.limit || 0;
      const ad = o.adapters || QS.ADAPTERS;
      this.adNames = ad.map((a) => a.name); this.adSeq = ad.map((a) => a.seq.toUpperCase()); this.na = ad.length;
      this.contam = (o.contaminants || QS.CONTAMINANTS).map((c) => ({ name: c.name, seq: c.seq.toUpperCase(), rc: QS.revcomp(c.seq.toUpperCase()) }));
      this.fq = true; this.seen = 0; this.n = 0; this.bad = 0; this.full = false; this.cap = 0; this.maxL = 0;
      this.minLen = Infinity; this.maxLen = 0; this.totalBases = 0; this.flagged = 0;
      this.pend = []; this.detected = false; this.offset = 33; this.enc = encodingFor(33); this.minChar = 255;
      this.q = null; this.b = new Uint32Array(0); this.ad = new Uint32Array(0); this.adTot = new Uint32Array(this.na);
      this.qh = new Uint32Array(NQ); this.gch = new Uint32Array(101); this.qgc = new Uint32Array(101 * NQ);
      this.eeH = new Uint32Array(121); this.ee = { sum: 0, le05: 0, le1: 0, le2: 0, le5: 0 };
      this.entH = new Uint32Array(41); this.hpH = new Uint32Array(61);
      this.lenMap = new Map(); this.dm = new Map(); this.cal = 0;
      this.tiles = new Map(); this.tileFail = false; this.px = []; this.py = []; this.pq = [];
      this.kmers = new Map(); this.kTot = new Float64Array(NB); this.bc = new Map(); this.bcTotal = 0;
      this.eeT = new Float64Array(NQ);
    }
    setFormat(fq) { this.fq = fq; }
    ensure(L) {
      if (L <= this.cap) return;
      const nc = Math.max(L, Math.min(CAPPOS, Math.max(256, this.cap * 2)));
      const g = (a, k) => { const n = new Uint32Array(nc * k); if (a) n.set(a); return n; };
      if (this.fq) this.q = g(this.q, NQ);
      this.b = g(this.b, 5); this.ad = g(this.ad, this.na); this.cap = nc;
    }
    add(name, seq, qual) {
      if (this.limit && this.seen >= this.limit) { this.full = true; return false; }
      this.seen++;
      if (this.fq && qual.length !== seq.length) { this.bad++; this.seen--; return true; }
      if (!this.detected) {
        this.pend.push(name, seq, qual);
        if (this.pend.length >= 6000) this._detect();
        return true;
      }
      this._rec(name, seq, qual); return true;
    }
    _detect() {
      this.detected = true;
      if (this.fq) {
        let mn = 255;
        for (let i = 2; i < this.pend.length; i += 3) { const s = this.pend[i]; const m = Math.min(s.length, 400); for (let p = 0; p < m; p++) { const c = s.charCodeAt(p); if (c < mn) mn = c; } }
        this.minChar = mn; this.enc = encodingFor(mn); this.offset = this.enc.offset;
        for (let i = 0; i < NQ; i++) this.eeT[i] = Math.pow(10, -Math.max(0, i + 33 - this.offset) / 10);
      }
      const p = this.pend; this.pend = [];
      for (let i = 0; i < p.length; i += 3) this._rec(p[i], p[i + 1], p[i + 2]);
    }
    _rec(name, seq, qual) {
      const n0 = seq.length, L = n0 > CAPPOS ? CAPPOS : n0;
      this.n++; this.totalBases += n0;
      if (n0 < this.minLen) this.minLen = n0;
      if (n0 > this.maxLen) this.maxLen = n0;
      this.lenMap.set(n0, (this.lenMap.get(n0) || 0) + 1);
      if (L === 0) return;
      this.ensure(L); if (L > this.maxL) this.maxL = L;
      const fq = this.fq, q = this.q, b = this.b, eeT = this.eeT;
      let sum = 0, ee = 0, nA = 0, nC = 0, nG = 0, nT = 0, nN = 0, run = 0, maxRun = 0, prev = -1, mn = 255;
      for (let p = 0; p < L; p++) {
        const x = BASE[seq.charCodeAt(p)];
        b[p * 5 + x]++;
        if (x < 4) { run = x === prev ? run + 1 : 1; if (run > maxRun) maxRun = run; } else run = 0;
        prev = x;
        if (x === 0) nA++; else if (x === 1) nC++; else if (x === 2) nG++; else if (x === 3) nT++; else nN++;
        if (fq) {
          let c = qual.charCodeAt(p); if (c < mn) mn = c; c -= 33; if (c < 0) c = 0; else if (c > 93) c = 93;
          q[p * NQ + c]++; sum += c; ee += eeT[c];
        }
      }
      let mi = 0;
      if (fq) {
        mi = Math.round(sum / L); this.qh[mi]++; if (mn < this.minChar) this.minChar = mn;
        const e = this.ee; e.sum += ee; if (ee <= 5) { e.le5++; if (ee <= 2) { e.le2++; if (ee <= 1) { e.le1++; if (ee <= 0.5) e.le05++; } } }
        this.eeH[Math.max(0, Math.min(120, Math.floor(Math.log10(ee + 0.01) * 20) + 40))]++;
      }
      const nb = L - nN;
      if (nb > 0) {
        const gcp = Math.round(((nC + nG) * 100) / nb); this.gch[gcp]++;
        if (fq) this.qgc[gcp * NQ + mi]++;
        if (nb >= 20) {
          let H = 0; const ks = [nA, nC, nG, nT];
          for (let i = 0; i < 4; i++) if (ks[i] > 0) { const pr = ks[i] / nb; H -= pr * Math.log2(pr); }
          this.entH[Math.min(40, Math.floor(H * 20 + 1e-9))]++;
        }
      }
      this.hpH[Math.min(60, maxRun)]++;
      // duplication (first sequences only, long reads truncated)
      const key = n0 > 75 ? seq.substring(0, 50) : seq, dm = this.dm, c = dm.get(key);
      if (c !== undefined) dm.set(key, c + 1);
      else if (dm.size < DUPLIM) { dm.set(key, 1); if (dm.size >= DUPLIM) this.cal = this.n; }
      // adapters
      const na = this.na;
      for (let a = 0; a < na; a++) {
        const i = seq.indexOf(this.adSeq[a]);
        if (i >= 0) { this.adTot[a]++; const end = i + this.adSeq[a].length - 1; if (end < L) this.ad[end * na + a]++; }
      }
      // header derived data: barcode, filter flag, tile
      const sp = name.indexOf(' ');
      if (sp > 0 && name.charCodeAt(sp + 2) === 58) {
        const m = name.substring(sp + 1).split(':');
        if (m.length >= 4 && (m[1] === 'N' || m[1] === 'Y')) {
          if (m[1] === 'Y') this.flagged++;
          const k = m[3].trim();
          if (k) { this.bcTotal++; const v = this.bc.get(k); if (v !== undefined) this.bc.set(k, v + 1); else if (this.bc.size < 5000) this.bc.set(k, 1); }
        }
      }
      if (fq && (this.n <= 50000 || this.n % 10 === 0)) this._tile(name, qual, L, mi, sp);
      if (this.n % (this.n <= 100000 ? 5 : 50) === 0) this._kmer(seq);
    }
    _tile(name, qual, L, mi, sp) {
      const f = (sp > 0 ? name.substring(0, sp) : name).split(':');
      let ti;
      if (f.length >= 7) ti = 4; else if (f.length >= 5) ti = 2; else return;
      const tile = parseInt(f[ti], 10); if (!Number.isFinite(tile) || this.tileFail) return;
      let T = this.tiles.get(tile);
      if (!T) { if (this.tiles.size >= 2500) { this.tileFail = true; this.tiles.clear(); return; } T = { s: new Float64Array(TP), c: new Uint32Array(TP) }; this.tiles.set(tile, T); }
      const m = Math.min(L, TP);
      for (let p = 0; p < m; p++) { let c = qual.charCodeAt(p) - 33; if (c < 0) c = 0; T.s[p] += c; T.c[p]++; }
      const x = parseInt(f[ti + 1], 10), y = parseInt(f[ti + 2], 10);
      if (Number.isFinite(x) && Number.isFinite(y) && this.px.length < 150000) { this.px.push(x); this.py.push(y); this.pq.push(mi); this.pt = this.pt || []; this.pt.push(tile); }
    }
    _kmer(seq) {
      const s = seq.length > 500 ? seq.substring(0, 500) : seq; let km = 0, valid = 0;
      for (let p = 0; p < s.length; p++) {
        const x = BASE[s.charCodeAt(p)];
        if (x > 3) { valid = 0; continue; }
        km = ((km << 2) | x) & 0x3fff; valid++;
        if (valid >= 7) { const bin = kbin(p - 6); let a = this.kmers.get(km); if (!a) { a = new Uint32Array(NB); this.kmers.set(km, a); } a[bin]++; this.kTot[bin]++; }
      }
    }
    _contam(seq) {
      if (seq.length < 20) return '';
      const win = [];
      for (let i = 0; i + 20 <= seq.length && win.length < 12; i += Math.max(1, Math.floor((seq.length - 20) / 11) || 1)) win.push(seq.substr(i, 20));
      for (const c of this.contam) {
        if (c.seq.indexOf(seq) >= 0 || c.rc.indexOf(seq) >= 0) return c.name;
        for (const w of win) if (c.seq.indexOf(w) >= 0 || c.rc.indexOf(w) >= 0) return c.name;
      }
      return '';
    }
    finish() {
      if (!this.detected) this._detect();
      const n = this.n, L = this.maxL, fq = this.fq, na = this.na;
      /* duplication levels with the under-sampling correction */
      const collate = new Map(); for (const v of this.dm.values()) collate.set(v, (collate.get(v) || 0) + 1);
      const corr = (lvl, obs) => {
        const cal = this.cal || n;
        if (cal === n || n - obs < cal) return obs;
        let pNot = 1; const care = 1 - obs / (obs + 0.01);
        for (let i = 0; i < cal; i++) { pNot *= (n - i - lvl) / (n - i); if (pNot < care) { pNot = 0; break; } }
        return pNot >= 1 ? obs : obs / (1 - pNot);
      };
      const dd = new Float64Array(16), dt = new Float64Array(16);
      for (const [lvl, obs] of collate) {
        const c = corr(lvl, obs), slot = lvl >= 10000 ? 15 : lvl >= 5000 ? 14 : lvl >= 1000 ? 13 : lvl >= 500 ? 12 : lvl >= 100 ? 11 : lvl >= 50 ? 10 : lvl >= 10 ? 9 : lvl - 1;
        dd[slot] += c; dt[slot] += c * lvl;
      }
      const sd = dd.reduce((a, v) => a + v, 0), st = dt.reduce((a, v) => a + v, 0);
      const dup = { labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '>10', '>50', '>100', '>500', '>1k', '>5k', '>10k+'], dedup: Array.from(dd, (v) => (sd ? (v * 100) / sd : 0)), total: Array.from(dt, (v) => (st ? (v * 100) / st : 0)), pctDedup: st ? (sd * 100) / st : 100, sampled: this.cal > 0 };
      /* over-represented sequences */
      const over = [];
      for (const [seq, count] of this.dm) if (count >= 2 && count / n >= 0.0001) over.push({ seq, count, pct: (count * 100) / n });
      over.sort((a, b) => b.count - a.count); over.length = Math.min(over.length, 40);
      over.forEach((o) => { o.hit = this._contam(o.seq); });
      /* k-mer enrichment */
      const km = []; let grand = 0; for (let i = 0; i < NB; i++) grand += this.kTot[i];
      let maxBin = 0; for (let i = 0; i < NB; i++) if (this.kTot[i] > 0) maxBin = i;
      if (grand > 2000) {
        for (const [code, arr] of this.kmers) {
          let tot = 0; for (let i = 0; i <= maxBin; i++) tot += arr[i];
          if (tot < 20) continue;
          let best = null; const prof = new Array(maxBin + 1);
          for (let i = 0; i <= maxBin; i++) {
            const exp = (tot * this.kTot[i]) / grand; const ratio = exp > 0 ? arr[i] / exp : 0; prof[i] = +ratio.toFixed(2);
            if (arr[i] < 10 || ratio < 5) continue;
            const z = (arr[i] - exp - 0.5) / Math.sqrt(exp);
            const lp = z > 0 ? (z < 8 ? -Math.log10(0.5 * erfc(z / Math.SQRT2)) : (z * z / 2 + Math.log(z * Math.sqrt(2 * Math.PI))) / Math.LN10) : 0;
            const adj = lp - Math.log10(16384 * (maxBin + 1));
            if (adj > 0 && (!best || adj > best.lp)) best = { bin: i, ratio, lp: adj };
          }
          if (best && best.lp > 0.5) { let s = ''; for (let i = 6; i >= 0; i--) s += 'ACGT'[(code >> (2 * i)) & 3]; km.push({ seq: s, count: tot, ratio: +best.ratio.toFixed(1), lp: +best.lp.toFixed(1), pos: QS.kmerBinStart(best.bin) + 1, prof }); }
        }
        km.sort((a, b) => b.lp - a.lp); km.length = Math.min(km.length, 20);
      }
      /* tiles */
      let tiles = null;
      if (fq && this.tiles.size > 1) {
        const ids = [...this.tiles.keys()].sort((a, b) => a - b), tp = Math.min(L, TP), mean = new Float32Array(ids.length * tp), cnt = new Uint32Array(ids.length * tp);
        ids.forEach((id, t) => { const T = this.tiles.get(id); for (let p = 0; p < tp; p++) { cnt[t * tp + p] = T.c[p]; mean[t * tp + p] = T.c[p] ? T.s[p] / T.c[p] : NaN; } });
        tiles = { ids, tp, mean, cnt };
      }
      const lenH = [...this.lenMap.entries()].sort((a, b) => a[0] - b[0]);
      const bc = [...this.bc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
      return {
        v: 1, name: this.o.name || 'sample', size: this.o.size || 0, gz: !!this.o.gz, fmt: fq ? 'FASTQ' : 'FASTA', hasQual: fq, enc: this.enc,
        n, truncated: this.full, limit: this.limit, flagged: this.flagged, bad: this.bad, minLen: n ? this.minLen : 0, maxLen: this.maxLen, totalBases: this.totalBases, L,
        q: fq && this.q ? this.q.slice(0, L * NQ) : null, b: this.b.slice(0, L * 5), qh: this.qh, gch: this.gch, qgc: fq ? this.qgc : null,
        lenH, eeH: fq ? this.eeH : null, ee: fq ? this.ee : null, entH: this.entH, hpH: this.hpH,
        adNames: this.adNames, ad: this.ad.slice(0, L * na), adTot: this.adTot,
        dup, over, kmer: km, tiles,
        sp: fq && this.px.length ? { x: Float32Array.from(this.px), y: Float32Array.from(this.py), q: Float32Array.from(this.pq), t: Int32Array.from(this.pt || []) } : null,
        bc, bcTotal: this.bcTotal, made: Date.now(), ver: QS.VERSION,
      };
    }
  };
  QS.erfc = erfc;
  function erfc(x) { // Numerical Recipes erfc, relative error < 1.2e-7
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }

  /* Incremental line parser for FASTQ and FASTA text. */
  QS.Parser = class Parser {
    constructor(an) { this.an = an; this.left = ''; this.mode = ''; this.st = 0; this.h = ''; this.s = ''; this.fh = null; this.fs = []; this.stop = false; }
    push(text, final) {
      if (this.stop) return;
      const t = this.left + text; let pos = 0; const len = t.length;
      while (pos < len) {
        let e = t.indexOf('\n', pos);
        if (e < 0) { if (!final) break; e = len; }
        let line = t.substring(pos, e); pos = e + 1;
        if (line.charCodeAt(line.length - 1) === 13) line = line.substring(0, line.length - 1);
        if (!this.mode) {
          if (!line) continue;
          this.mode = line[0] === '>' ? 'fa' : '@+'.includes(line[0]) ? 'fq' : 'bad';
          if (this.mode === 'bad') throw new Error('Not a FASTQ or FASTA file (first line must start with “@” or “>”).');
          this.an.setFormat(this.mode === 'fq');
        }
        if (this.mode === 'fq') {
          if (this.st === 0) { if (!line) continue; this.h = line.substring(1); this.st = 1; }
          else if (this.st === 1) { this.s = line; this.st = 2; }
          else if (this.st === 2) { this.st = 3; }
          else { this.st = 0; if (!this.an.add(this.h, this.s, line)) { this.stop = true; return; } }
        } else if (line[0] === '>') { if (!this._fa()) return; this.fh = line.substring(1); this.fs = []; }
        else if (line) this.fs.push(line);
      }
      this.left = pos < len ? t.substring(pos) : '';
      if (final) { if (this.mode === 'fa') this._fa(); this.left = ''; }
    }
    _fa() { if (this.fh === null) return true; const ok = this.an.add(this.fh, this.fs.join('').toUpperCase(), ''); if (!ok) this.stop = true; return ok; }
  };

  /* Read a File (optionally gzip-compressed) in chunks. */
  QS.analyzeFile = async function (file, o) {
    o = o || {};
    const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    const gz = head[0] === 0x1f && head[1] === 0x8b;
    const an = new QS.Analyzer({ name: file.name, size: file.size, gz, limit: o.limit, adapters: o.adapters, contaminants: o.contaminants });
    const parser = new QS.Parser(an);
    let read = 0, last = performance.now();
    let stream = file.stream().pipeThrough(new TransformStream({ transform(ch, ctl) { read += ch.length; ctl.enqueue(ch); } }));
    if (gz) {
      if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open .gz files directly. Unzip the file first.');
      stream = stream.pipeThrough(new DecompressionStream('gzip'));
    }
    const rd = stream.getReader(), dec = new TextDecoder();
    for (;;) {
      if (o.signal && o.signal.aborted) { rd.cancel(); throw new Error('cancelled'); }
      const { value, done } = await rd.read();
      if (done) { parser.push(dec.decode(), true); break; }
      parser.push(dec.decode(value, { stream: true }), false);
      if (parser.stop) { rd.cancel(); break; }
      const now = performance.now();
      if (o.onProgress) o.onProgress(Math.min(1, read / Math.max(1, file.size)), an.n);
      if (now - last > 30) { await new Promise((r) => setTimeout(r, 0)); last = performance.now(); }
    }
    if (!parser.mode) throw new Error('The file is empty.');
    if (an.seen === 0) throw new Error('No sequences found.');
    return an.finish();
  };
  QS.analyzeText = function (text, name, o) {
    o = o || {};
    const an = new QS.Analyzer({ name: name || 'pasted', size: text.length, limit: o.limit, adapters: o.adapters, contaminants: o.contaminants });
    const p = new QS.Parser(an); p.push(text, true);
    if (!p.mode) throw new Error('Nothing to analyse.');
    if (an.seen === 0) throw new Error('No sequences found.');
    return an.finish();
  };

  /* Results ⇄ JSON (typed arrays are tagged). Keys starting with "_" are caches and are dropped. */
  QS.packRes = (res) => JSON.stringify(res, (k, v) => {
    if (k[0] === '_') return undefined;
    if (ArrayBuffer.isView(v)) return { $t: v.constructor.name, d: Array.from(v, (x) => (Number.isFinite(x) ? x : null)) };
    return v;
  });
  QS.unpackRes = (txt) => JSON.parse(txt, (k, v) => {
    if (v && v.$t && Array.isArray(v.d)) { const C = globalThis[v.$t]; return C ? C.from(v.d, (x) => (x === null ? NaN : x)) : v.d; }
    return v;
  });
})();
