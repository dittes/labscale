/* More file formats: ZTR, SFF (454) and GCG RSF readers; ABIF and SCF v3 writers. Implemented from the public format descriptions. */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});

  /* ---------------- inflate (zlib) ---------------- */
  BW.inflate = async (u8) => {
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('deflate'), w = ds.writable.getWriter();
      w.write(u8); w.close();
      return new Uint8Array(await new Response(ds.readable).arrayBuffer());
    }
    const z = (0, eval)('require')('zlib'); return new Uint8Array(z.inflateSync(Buffer.from(u8)));
  };

  /* ---------------- ZTR ---------------- */
  const be32 = (u, o) => ((u[o] << 24) | (u[o + 1] << 16) | (u[o + 2] << 8) | u[o + 3]) >>> 0;

  /** Undo the stacked ZTR encodings. data[0] is the format byte; the decoded result again begins with a format byte (0 = raw) when stacked. */
  async function ztrDecode(data) {
    let d = data;
    for (let guard = 0; guard < 8; guard++) {
      const f = d[0];
      if (f === 0) return d.subarray(1);
      if (f === 1) { // RLE
        const n = be32(d, 1), g = d[5], out = new Uint8Array(n); let o = 0, i = 6;
        while (i < d.length && o < n) {
          const c = d[i++];
          if (c !== g) { out[o++] = c; continue; }
          const k = d[i++];
          if (k === 0) { out[o++] = g; continue; }
          const v = d[i++]; for (let j = 0; j < k && o < n; j++) out[o++] = v;
        }
        d = out;
      } else if (f === 2) { d = await BW.inflate(d.subarray(5)); }
      else if (f === 64) { // 8-bit delta
        const L = d[1], out = Uint8Array.from(d.subarray(2));
        for (let l = 0; l < L; l++) { let p = 0; for (let i = 0; i < out.length; i++) { out[i] = (out[i] + p) & 255; p = out[i]; } }
        d = out;
      } else if (f === 65 || f === 66) { // 16/32-bit delta
        const L = d[1], w = f === 65 ? 2 : 4, start = f === 65 ? 2 : 4, body = d.subarray(start), n = Math.floor(body.length / w), mask = w === 2 ? 0xffff : 0xffffffff;
        const vals = new Array(n);
        for (let i = 0; i < n; i++) { let v = 0; for (let k = 0; k < w; k++) v = v * 256 + body[i * w + k]; vals[i] = v; }
        for (let l = 0; l < L; l++) { let p = 0; for (let i = 0; i < n; i++) { vals[i] = (vals[i] + p) % (mask + 1); p = vals[i]; } }
        const out = new Uint8Array(n * w);
        for (let i = 0; i < n; i++) { let v = vals[i]; for (let k = w - 1; k >= 0; k--) { out[i * w + k] = v % 256; v = Math.floor(v / 256); } }
        d = out;
      } else if (f === 70) { // 16-to-8
        const out = []; let i = 1;
        while (i < d.length) {
          const b = d[i++] << 24 >> 24;
          if (b === -128) { const v = ((d[i] << 8) | d[i + 1]) << 16 >> 16; i += 2; out.push((v >> 8) & 255, v & 255); }
          else { const v = b; out.push((v >> 8) & 255, v & 255); }
        }
        d = Uint8Array.from(out);
      } else if (f === 72) { // follow predictor
        const table = d.subarray(1, 257), res = d.subarray(257), out = new Uint8Array(res.length);
        if (res.length) { out[0] = res[0]; for (let i = 1; i < res.length; i++) out[i] = (res[i] + table[out[i - 1]]) & 255; }
        d = out;
      } else throw new Error('Unsupported ZTR encoding ' + f + (f === 74 ? ' (Chebyshev)' : f === 3 || f === 4 ? ' (XRLE)' : ''));
      // a stacked result carries its own format byte; a result that is plain data has none. ZTR always stores one.
    }
    throw new Error('ZTR encoding too deeply nested');
  }

  BW.parseZTR = async (buf, name) => {
    const u = new Uint8Array(buf), magic = [0xae, 0x5a, 0x54, 0x52, 0x0d, 0x0a, 0x1a, 0x0a];
    if (magic.some((b, i) => u[i] !== b)) throw new Error('Not a ZTR file');
    let o = 10, bases = '', bpos = null, cnf = null, smp = null, text = {}, clip = null; const samp = {};
    while (o + 8 <= u.length) {
      const type = String.fromCharCode(u[o], u[o + 1], u[o + 2], u[o + 3]), ml = be32(u, o + 4); o += 8;
      const meta = u.subarray(o, o + ml); o += ml;
      const dl = be32(u, o); o += 4; const data = u.subarray(o, o + dl); o += dl;
      if (!['BASE', 'BPOS', 'CNF1', 'CNF4', 'SMP4', 'SAMP', 'TEXT', 'CLIP'].includes(type)) continue;
      const d = await ztrDecode(data);
      if (type === 'BASE') { bases = ''; for (let i = 0; i < d.length; i++) bases += String.fromCharCode(d[i]); }
      else if (type === 'BPOS') { bpos = []; for (let i = 3; i + 4 <= d.length; i += 4) bpos.push(be32(d, i)); }
      else if (type === 'CNF4') cnf = d;
      else if (type === 'CNF1') cnf = d;
      else if (type === 'SMP4') smp = d;
      else if (type === 'SAMP') { const nm = String.fromCharCode(meta[0]); samp[nm] = d; }
      else if (type === 'CLIP') clip = [be32(d, 0), be32(d, 4)];
      else if (type === 'TEXT') { let s = '', k = []; for (let i = 0; i < d.length; i++) { if (d[i] === 0) { k.push(s); s = ''; if (k.length === 2) { text[k[0]] = k[1]; k = []; } } else s += String.fromCharCode(d[i]); } }
    }
    const ch = {};
    const rd16 = (arr, start, n) => { const out = new Int16Array(n); for (let i = 0; i < n; i++) out[i] = ((arr[start + i * 2] << 8) | arr[start + i * 2 + 1]) << 16 >> 16; return out; };
    if (smp) {
      const n = Math.floor((smp.length - 1) / 8);
      ['A', 'C', 'G', 'T'].forEach((b, k) => (ch[b] = rd16(smp, 1 + k * n * 2, n)));
    } else if (samp.A) {
      for (const b of 'ACGT') { const a = samp[b]; ch[b] = rd16(a, 1, Math.floor((a.length - 1) / 2)); }
    } else throw new Error('ZTR file has no trace samples');
    if (!bases || !bpos) throw new Error('ZTR file has no base calls');
    const peaks = Int32Array.from(bpos.slice(0, bases.length));
    let qual = new Uint8Array(bases.length);
    if (cnf) { // CNF4: confidence of the called base first (n bytes after format byte already stripped when stacked)
      for (let i = 0; i < bases.length; i++) qual[i] = cnf[i] || 0;
    }
    const meta = {}; if (text.NAME) meta.Sample = text.NAME; if (text.MACH) meta.Instrument = text.MACH; if (text.DATE) meta['Run date'] = text.DATE; if (text.DYEP) meta['Dye set'] = text.DYEP;
    let qualEstimated = false;
    if (!qual.some((v) => v > 0)) { qual = BW.estimateQuality(bases, peaks, ch); qualEstimated = true; }
    return BW.makeTrace({ name: name || 'trace', sample: meta.Sample || '', bases: bases.toUpperCase().replace(/[-.]/g, 'N'), qual, peaks, ch, meta, qualEstimated });
  };

  /** Dispatch on file signature (async because ZTR needs inflate). */
  BW.parseTraceAsync = async (buf, name) => {
    const u = new Uint8Array(buf, 0, Math.min(8, buf.byteLength));
    if (u[0] === 0xae && u[1] === 0x5a && u[2] === 0x54 && u[3] === 0x52) return BW.parseZTR(buf, name);
    return BW.parseTrace(buf, name);
  };

  /* ---------------- SFF (454 / Roche) ---------------- */
  BW.parseSFF = (buf, limit = 1500) => {
    const dv = new DataView(buf), u = new Uint8Array(buf);
    if (String.fromCharCode(u[0], u[1], u[2], u[3]) !== '.sff') throw new Error('Not an SFF file');
    const nReads = dv.getUint32(20), hLen = dv.getUint16(24), keyLen = dv.getUint16(26), nFlows = dv.getUint16(28);
    let o = hLen; const out = [];
    for (let r = 0; r < Math.min(nReads, limit); r++) {
      const rh = dv.getUint16(o), nl = dv.getUint16(o + 2), nb = dv.getUint32(o + 4);
      const ql = dv.getUint16(o + 8), qr = dv.getUint16(o + 10);
      let name = ''; for (let i = 0; i < nl; i++) name += String.fromCharCode(u[o + 16 + i]);
      o += rh;
      const dataLen = nFlows * 2 + nb * 3, padded = Math.ceil(dataLen / 8) * 8;
      const bo = o + nFlows * 2 + nb; let seq = ''; for (let i = 0; i < nb; i++) seq += String.fromCharCode(u[bo + i]);
      const qual = Uint8Array.from(u.subarray(bo + nb, bo + 2 * nb));
      o += padded;
      const a = ql > 0 ? ql - 1 : 0, b = qr > 0 ? Math.min(qr, nb) : nb; // clips are 1-based
      out.push({ name, seq: seq.toUpperCase().slice(a, b), qual: qual.slice(a, b), type: 'dna' });
    }
    out.total = nReads; out.limit = limit; return out;
  };

  /* ---------------- GCG RSF ---------------- */
  BW.parseRSF = (text) => {
    const out = []; let cur = null, inSeq = false;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line === '{') { cur = { name: '', desc: '', seq: '', type: '' }; inSeq = false; continue; }
      if (line === '}') { if (cur && cur.seq) out.push({ name: cur.name || 'sequence', desc: cur.desc, seq: cur.seq.replace(/[^A-Za-z\-.*]/g, '').toUpperCase().replace(/\./g, '-'), type: /^pro/i.test(cur.type) ? 'protein' : /^(dna|rna|nuc)/i.test(cur.type) ? 'dna' : undefined }); cur = null; continue; }
      if (!cur) continue;
      if (inSeq) { if (line === '//') inSeq = false; else cur.seq += line; continue; }
      const m = line.match(/^(\w+)\s*(.*)$/); if (!m) continue;
      const k = m[1].toLowerCase();
      if (k === 'name') cur.name = m[2]; else if (k === 'descrip') cur.desc = m[2]; else if (k === 'type') cur.type = m[2];
      else if (k === 'sequence') { inSeq = true; cur.seq += m[2]; }
    }
    return out;
  };
  const prevParse = BW.parseAnyText;
  BW.parseAnyText = (text, filename = '') => (/^\s*!!RICH_SEQUENCE/i.test(text) ? BW.parseRSF(text) : prevParse(text, filename));

  /* ---------------- writers ---------------- */
  const enc = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 255);

  /** Write a trace as ABIF (.ab1). Edited base calls go to PBAS2, the originals to PBAS1. */
  BW.writeABIF = (t, sampleName) => {
    const L = t.bases.length, N = t.nSamples, ents = [];
    const i16 = (a) => { const b = new Uint8Array(a.length * 2), v = new DataView(b.buffer); a.forEach((x, i) => v.setInt16(i * 2, x)); return b; };
    const pstr = (s) => Uint8Array.from([s.length, ...enc(s)]);
    const add = (name, num, type, es, count, data) => ents.push({ name, num, type, es, count: type === 4 ? data.length / 2 : data.length, data });
    add('FWO_', 1, 2, 1, 4, enc('GATC'));
    ['G', 'A', 'T', 'C'].forEach((b, k) => { const arr = Array.from(t.ch[b], (x) => Math.max(-32768, Math.min(32767, Math.round(x)))); add('DATA', 1 + k, 4, 2, N, i16(arr)); add('DATA', 9 + k, 4, 2, N, i16(arr)); });
    add('LANE', 1, 4, 2, 1, i16([1]));
    add('MODL', 1, 18, 1, 5, pstr('3730'));
    add('PBAS', 1, 2, 1, L, enc(t.origBases || t.bases)); add('PBAS', 2, 2, 1, L, enc(t.bases));
    add('PCON', 1, 2, 1, L, Uint8Array.from(t.qual)); add('PCON', 2, 2, 1, L, Uint8Array.from(t.qual));
    add('PLOC', 1, 4, 2, L, i16(Array.from(t.peaks))); add('PLOC', 2, 4, 2, L, i16(Array.from(t.peaks)));
    const sm = sampleName || t.sample || t.name || 'sample'; add('SMPL', 1, 18, 1, sm.length + 1, pstr(sm));
    add('SVER', 1, 18, 1, 14, pstr('DNAScale export'));
    ents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.num - b.num));
    let off = 128; const bodies = [];
    for (const e of ents) if (e.data.length > 4) { e.off = off; bodies.push(e.data); off += e.data.length; if (off % 2) { bodies.push(new Uint8Array(1)); off++; } }
    const dirOff = off, total = dirOff + ents.length * 28, out = new Uint8Array(total), dv = new DataView(out.buffer);
    out.set(enc('ABIF'), 0); dv.setInt16(4, 101);
    out.set(enc('tdir'), 6); dv.setInt32(10, 1); dv.setInt16(14, 1023); dv.setInt16(16, 28); dv.setInt32(18, ents.length); dv.setInt32(22, ents.length * 28); dv.setInt32(26, dirOff);
    let p = 128; for (const b of bodies) { out.set(b, p); p += b.length; }
    ents.forEach((e, i) => {
      const q = dirOff + i * 28; out.set(enc(e.name), q); dv.setInt32(q + 4, e.num); dv.setInt16(q + 8, e.type); dv.setInt16(q + 10, e.es); dv.setInt32(q + 12, e.count); dv.setInt32(q + 16, e.data.length);
      if (e.data.length <= 4) out.set(e.data, q + 20); else dv.setInt32(q + 20, e.off);
    });
    return out;
  };

  /** Write a trace as SCF v3.00. */
  BW.writeSCF = (t, clipLeft = 0, clipRight = 0) => {
    const L = t.bases.length, N = t.nSamples, order = ['A', 'C', 'G', 'T'];
    const comments = enc(`NAME=${t.sample || t.name}\nCONV=DNAScale export\n`), cLen = comments.length + 1;
    const sOff = 128, sLen = N * 8, bOff = sOff + sLen, bLen = L * 12, cOff = bOff + bLen, total = cOff + cLen;
    const out = new Uint8Array(total), dv = new DataView(out.buffer);
    out.set(enc('.scf'), 0); dv.setUint32(4, N); dv.setUint32(8, sOff); dv.setUint32(12, L); dv.setUint32(16, clipLeft); dv.setUint32(20, clipRight);
    dv.setUint32(24, bOff); dv.setUint32(28, cLen); dv.setUint32(32, cOff); out.set(enc('3.00'), 36); dv.setUint32(40, 2); dv.setUint32(44, 2); dv.setUint32(48, 0); dv.setUint32(52, cOff + cLen);
    order.forEach((b, k) => {
      const a = Array.from(t.ch[b], (x) => Math.max(0, Math.min(65535, Math.round(x))));
      for (let pass = 0; pass < 2; pass++) { let p = 0; for (let i = 0; i < N; i++) { const v = a[i]; a[i] = (v - p) & 0xffff; p = v; } }
      for (let i = 0; i < N; i++) dv.setUint16(sOff + (k * N + i) * 2, a[i]);
    });
    for (let i = 0; i < L; i++) {
      dv.setUint32(bOff + i * 4, t.peaks[i]);
      const c = t.bases[i], k = order.indexOf(c);
      for (let j = 0; j < 4; j++) out[bOff + L * (4 + j) + i] = j === k ? t.qual[i] : 0;
      out[bOff + L * 8 + i] = c.charCodeAt(0);
    }
    out.set(comments, cOff);
    return out;
  };
})();
