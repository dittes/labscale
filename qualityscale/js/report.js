/* QualityScale exports: standalone HTML report, summary table, ZIP of figures. */
(function () {
  'use strict';
  const QS = globalThis.QS, esc = QS.esc, f1 = QS.f;
  const STNAME = { pass: 'Pass', warn: 'Warning', fail: 'Fail', info: 'Info', na: 'n/a' };

  QS.summaryTsv = (samples) => {
    const mods = QS.MODS.filter((m) => m.core);
    const head = ['sample', 'score', 'grade', 'reads', 'mean_length', 'gc_percent', 'mean_q', 'q30_percent', 'unique_percent', 'adapter_max_percent', 'n_max_percent', 'reads_le1_expected_error_percent'].concat(mods.map((m) => m.id));
    const rows = samples.filter((s) => s.res).map((s) => {
      const m = QS.metrics(s.res, s.ev), r = (v, d) => (Number.isFinite(v) ? v.toFixed(d) : '');
      return [s.name, s.ev.score, s.ev.grade, m.reads, r(m.len, 1), r(m.gc, 2), r(m.meanQ, 2), r(m.q30, 2), r(m.uniq, 2), r(m.adp, 2), r(m.nmax, 3), r(m.ee1, 1)].concat(mods.map((x) => s.ev.mods[x.id].st)).join('\t');
    });
    return head.join('\t') + '\n' + rows.join('\n') + '\n';
  };

  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  QS.zip = (files) => {
    const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
    files.forEach((fl) => {
      const nm = enc.encode(fl.name), data = typeof fl.data === 'string' ? enc.encode(fl.data) : fl.data, crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(lh.buffer), nm, data);
      const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
      cd.push(new Uint8Array(ch.buffer), nm); off += 30 + nm.length + data.length;
    });
    const csz = cd.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csz, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(cd, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  };


  /* ---------- PDF report: hand-written PDF, charts embedded as JPEG images ---------- */
  const win = (t) => String(t).replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/→/g, '->').replace(/′/g, "'").replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[’‘]/g, "'").replace(/[^\x20-\x7e\xa0-\xff]/g, '?');
  const pesc = (t) => win(t).replace(/([\\()])/g, '\\$1');
  const hexc = (h) => [1, 3, 5].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
  function svgJpeg(svg, scale) {
    return new Promise((ok, no) => {
      const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/), w = +m[1], h = +m[2], img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.scale(scale, scale); x.drawImage(img, 0, 0); const d = atob(c.toDataURL('image/jpeg', 0.92).split(',')[1]), b = new Uint8Array(d.length); for (let i = 0; i < d.length; i++) b[i] = d.charCodeAt(i); ok({ w: c.width, h: c.height, data: b }); };
      img.onerror = () => no(new Error('Figure rendering failed')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(QS.svgStandalone(svg, QS.palette(false), w, h));
    });
  }
  class PdfDoc {
    constructor() { this.pages = []; this.images = []; this.W = 595; this.H = 842; this.M = 40; this.newPage(); }
    newPage() { this.cur = { ops: [], imgs: [] }; this.pages.push(this.cur); this.y = this.H - this.M; }
    room(h) { if (this.y - h < this.M + 14) this.newPage(); }
    text(t, x, y, size, bold, col) { this.cur.ops.push(`BT /F${bold ? 2 : 1} ${size} Tf ${hexc(col || '#1c2230')} rg ${x.toFixed(1)} ${y.toFixed(1)} Td (${pesc(t)}) Tj ET`); }
    wrap(t, size, width) { const cw = size * 0.5, max = Math.floor(width / cw), out = []; String(t).split('\n').forEach((para) => { let line = ''; para.split(/\s+/).forEach((w) => { if ((line + ' ' + w).trim().length > max) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }); out.push(line); }); return out; }
    para(t, size, o) { o = o || {}; const x = this.M + (o.indent || 0), lines = this.wrap(t, size, this.W - 2 * this.M - (o.indent || 0)); lines.forEach((l) => { this.room(size * 1.4); this.y -= size * 1.35; this.text(l, x, this.y, size, o.bold, o.col); }); }
    gap(h) { this.y -= h; }
    rect(x, y, w, h, col) { this.cur.ops.push(`${hexc(col)} rg ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`); }
    image(im, width) { const h = (im.h / im.w) * width; this.room(h + 6); let id = this.images.indexOf(im); if (id < 0) { this.images.push(im); id = this.images.length - 1; } this.y -= h; this.cur.imgs.push(id); this.cur.ops.push(`q ${width.toFixed(1)} 0 0 ${h.toFixed(1)} ${this.M} ${this.y.toFixed(1)} cm /Im${id} Do Q`); this.y -= 6; }
    build() {
      const enc = new TextEncoder(), chunks = [], offs = []; let len = 0;
      const put = (x) => { const b = typeof x === 'string' ? Uint8Array.from(x, (c) => c.charCodeAt(0) & 255) : x; chunks.push(b); len += b.length; };
      const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n`); put(body); put('\nendobj\n'); };
      const np = this.pages.length, ni = this.images.length, first = 5;
      put('%PDF-1.4\n');
      obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
      obj(2, `<< /Type /Pages /Count ${np} /Kids [${this.pages.map((_, i) => `${first + ni + i * 2} 0 R`).join(' ')}] >>`);
      obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      this.images.forEach((im, i) => { offs[first + i] = len; put(`${first + i} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>\nstream\n`); put(im.data); put('\nendstream\nendobj\n'); });
      this.pages.forEach((pg, i) => {
        const pn = first + ni + i * 2, cn = pn + 1, ops = pg.ops.join('\n') + `\nBT /F1 8 Tf 0.4 0.44 0.5 rg ${this.M} 22 Td (QualityScale ${QS.VERSION}) Tj ET\nBT /F1 8 Tf 0.4 0.44 0.5 rg ${this.W - this.M - 30} 22 Td (Page ${i + 1} of ${np}) Tj ET`;
        obj(pn, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Contents ${cn} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${[...new Set(pg.imgs)].map((id) => `/Im${id} ${first + id} 0 R`).join(' ')} >> >> >>`);
        obj(cn, `<< /Length ${ops.length} >>\nstream\n${ops}\nendstream`);
      });
      const total = first + ni + np * 2; const xref = len;
      put(`xref\n0 ${total}\n0000000000 65535 f \n`); for (let n = 1; n < total; n++) put(String(offs[n]).padStart(10, '0') + ' 00000 n \n');
      put(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
      return new Blob(chunks, { type: 'application/pdf' });
    }
  }
  QS.reportPdf = async (samples, o) => {
    const P = QS.palette(false), lim = o.lim, done = samples.filter((s) => s.res), D = new PdfDoc(), CW = D.W - 2 * D.M, SC = { pass: '#15803d', warn: '#c2410c', fail: '#d1344a', info: '#667085', na: '#667085' };
    QS.noTips = true;
    try {
      D.text('QualityScale report', D.M, D.y - 22, 22, true); D.gap(30);
      D.para(`${done.length} sample${done.length === 1 ? '' : 's'}  -  generated ${new Date().toLocaleString('en-GB')}  -  analysed locally in the browser`, 9, { col: '#667085' }); D.gap(8);
      done.forEach((s) => { D.room(16); D.y -= 15; const m = QS.metrics(s.res, s.ev); D.text(s.name, D.M, D.y, 10, true); D.text(`score ${s.ev.score} (${s.ev.grade})`, D.M + 300, D.y, 10, true, s.ev.score >= 80 ? '#15803d' : s.ev.score >= 60 ? '#c2410c' : '#d1344a'); D.text(`${QS.si(m.reads)} reads  Q${f1(m.meanQ, 1)}  ${f1(m.q30, 0)}% >= Q30`, D.M + 380, D.y, 9, false, '#4a5367'); });
      let first = true;
      for (const s of done) {
        const res = s.res, ev = s.ev; if (!first || done.length > 4) D.newPage(); else D.gap(22); first = false;
        D.text(s.name, D.M, D.y - 18, 16, true); D.gap(26);
        D.para(`${res.fmt}${res.gz ? ' (gzip)' : ''}  -  ${QS.num(res.n)} reads${res.truncated ? ' (first ' + QS.si(res.limit) + ' analysed)' : ''}  -  ${res.minLen === res.maxLen ? res.maxLen + ' bp' : res.minLen + '-' + res.maxLen + ' bp'}  -  ${res.hasQual ? res.enc.name : 'no qualities'}`, 9, { col: '#667085' });
        D.gap(6); D.para(`Score ${ev.score}, grade ${ev.grade}: ${ev.cnt.pass} passed, ${ev.cnt.warn} warnings, ${ev.cnt.fail} failures`, 11, { bold: true }); D.gap(4);
        QS.insights(res, ev).forEach((i) => { D.para(i.title, 10, { bold: true, col: i.sev === 'fail' ? '#d1344a' : i.sev === 'warn' ? '#c2410c' : i.sev === 'ok' ? '#15803d' : '#2563eb' }); D.para(i.text, 9, { indent: 10, col: '#4a5367' }); D.gap(3); });
        for (const x of QS.MODS) {
          const e = ev.mods[x.id]; if (!e || e.st === 'na') continue;
          for (const mode of x.id === 'tile' ? ['tile', 'flow'] : [undefined]) {
            D.room(40); D.gap(10); D.y -= 13; D.text(x.title + (mode === 'flow' ? ' - flow-cell layout' : ''), D.M, D.y, 11, true); D.text(({ pass: 'Pass', warn: 'Warning', fail: 'Fail', info: 'Info' })[e.st], D.M + CW - 50, D.y, 9, true, SC[e.st]);
            if (e.note) D.para(e.note, 8.5, { col: '#4a5367' });
            if (QS.CHART_HTML[x.id]) { tableText(D, x.id, res); continue; }
            const svg = QS.renderMod(x.id, res, { P, lim, opts: { mode }, w: 760, h: 380 });
            if (svg.startsWith('<svg')) D.image(await svgJpeg(svg, 2), CW);
          }
        }
      }
    } finally { QS.noTips = false; }
    return D.build();
  };
  function tableText(D, id, res) {
    const row = (cols, bold) => { D.room(12); D.y -= 11.5; cols.forEach(([t, x]) => D.text(t, D.M + x, D.y, 8.5, bold, '#1c2230')); };
    D.gap(2);
    if (id === 'basic') { const d = QS.derive(res); [['File name', res.name], ['File type', res.fmt + (res.gz ? ' (gzip)' : '')], ['Quality encoding', res.hasQual ? res.enc.name : '-'], ['Reads analysed', QS.num(res.n)], ['Total bases', QS.si(res.totalBases) + 'bp'], ['Read length', res.minLen === res.maxLen ? res.maxLen + ' bp' : res.minLen + '-' + res.maxLen + ' bp'], ['GC content', f1(d.gcPct, 1) + '%']].concat(res.hasQual ? [['Mean quality', 'Q' + f1(d.meanQ, 1)], ['Bases >= Q20 / >= Q30', f1(d.q20, 1) + '% / ' + f1(d.q30, 1) + '%']] : []).forEach(([a, b]) => row([[a, 0], [b, 170]])); }
    else if (id === 'over') { if (!res.over.length) return row([['No sequence reaches 0.1% of the reads.', 0]]); row([['Sequence', 0], ['Count', 330], ['Share', 375], ['Source', 420]], true); res.over.slice(0, 10).forEach((s) => row([[s.seq.length > 50 ? s.seq.slice(0, 50) : s.seq, 0], [QS.num(s.count), 330], [f1(s.pct, 2) + '%', 375], [(s.hit || 'no hit').slice(0, 24), 420]])); }
    else if (id === 'kmer') { if (!res.kmer.length) return row([['No k-mer is enriched at a specific position.', 0]]); row([['7-mer', 0], ['Count', 90], ['Max enrichment', 150], ['-log10 p', 250], ['Position', 320]], true); res.kmer.slice(0, 10).forEach((k) => row([[k.seq, 0], [QS.num(k.count), 90], [f1(k.ratio, 1) + 'x', 150], [f1(k.lp, 1), 250], [String(k.pos), 320]])); }
  }

  QS.reportHtml = (samples, o) => {
    const P = QS.palette(false), lim = o.lim, done = samples.filter((s) => s.res);
    const mods = QS.MODS.filter((m) => m.core);
    const css = `body{font:14px/1.5 -apple-system,Inter,Segoe UI,Roboto,sans-serif;color:#1c2230;background:#f4f6fa;margin:0}main{max-width:1100px;margin:0 auto;padding:28px 22px 60px}h1{font-size:26px;margin:0 0 4px;letter-spacing:-.02em}h2{font-size:20px;margin:34px 0 6px;letter-spacing:-.01em}h3{font-size:15px;margin:0}.sub{color:#667085}.card{background:#fff;border:1px solid #d9dde5;border-radius:14px;padding:14px 16px;margin:12px 0;break-inside:avoid}.hd{display:flex;gap:10px;align-items:center;margin-bottom:6px}.hd h3{flex:1}.chip{font-size:11px;font-weight:650;padding:1px 9px;border-radius:99px}.pass{background:#e0f3e6;color:#15803d}.warn{background:#fdeadd;color:#c2410c}.fail{background:#fde7ea;color:#d1344a}.info,.na{background:#eef0f4;color:#667085}svg{width:100%;height:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:6px 8px;border-bottom:1px solid #e3e6ec;text-align:left}th{font-size:11px;text-transform:uppercase;color:#667085;letter-spacing:.05em}td.r,th.r{text-align:right}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sq{font-family:ui-monospace,Menlo,monospace;font-size:12px;word-break:break-all}.sq i{font-style:normal;font-weight:600}.bA{color:#15803d}.bC{color:#2563eb}.bG{color:#d98a00}.bT{color:#d1344a}.bN{color:#667085}.mb{display:none}.score{font-size:42px;font-weight:700;letter-spacing:-.03em}.note{color:#4a5367;font-size:13px}.find{border-left:4px solid #c8cdd8;padding:6px 12px;margin:6px 0;background:#fff;border-radius:6px}.find.fail{border-color:#d1344a}.find.warn{border-color:#f59e0b}.find.ok{border-color:#15803d}.find.info{border-color:#2563eb}.dot{display:inline-block;width:12px;height:12px;border-radius:50%}@media(max-width:800px){.grid{grid-template-columns:1fr}}@media print{body{background:#fff}.card{break-inside:avoid}}`;
    const dot = (st) => `<span class="dot" style="background:${st === 'pass' ? '#15803d' : st === 'warn' ? '#f59e0b' : st === 'fail' ? '#d1344a' : '#c8cdd8'}"></span>`;
    QS.noTips = true;
    let h = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QualityScale report</title><style>${css}</style></head><body><main><h1>QualityScale report</h1><div class="sub">${done.length} sample${done.length === 1 ? '' : 's'} · generated ${new Date().toLocaleString('en-GB')} · all analysis done locally in the browser</div>`;
    h += `<div class="card"><table><thead><tr><th>Sample</th><th class="r">Score</th><th class="r">Reads</th><th class="r">Mean Q</th><th class="r">Q30</th><th class="r">GC</th>${mods.map((m) => `<th title="${esc(m.title)}">${esc(m.short)}</th>`).join('')}</tr></thead><tbody>` + done.map((s) => { const m = QS.metrics(s.res, s.ev); return `<tr><td><a href="#s${s.id}">${esc(s.name)}</a></td><td class="r"><b>${s.ev.score}</b> ${s.ev.grade}</td><td class="r">${QS.num(m.reads)}</td><td class="r">${f1(m.meanQ, 1)}</td><td class="r">${f1(m.q30, 1)}%</td><td class="r">${f1(m.gc, 1)}%</td>${mods.map((x) => `<td>${dot(s.ev.mods[x.id].st)}</td>`).join('')}</tr>`; }).join('') + '</tbody></table></div>';
    done.forEach((s) => {
      const res = s.res, ev = s.ev, d = QS.derive(res);
      h += `<h2 id="s${s.id}">${esc(s.name)}</h2><div class="sub">${res.fmt}${res.gz ? ' (gzip)' : ''} · ${QS.num(res.n)} reads${res.truncated ? ' (first ' + QS.si(res.limit) + ' analysed)' : ''} · ${res.minLen === res.maxLen ? res.maxLen + ' bp' : res.minLen + '–' + res.maxLen + ' bp'} · ${res.hasQual ? res.enc.name : 'no qualities'}</div>`;
      h += `<div class="card"><div class="hd"><div class="score">${ev.score}</div><div><h3>Overall score · grade ${ev.grade}</h3><div class="sub">${ev.cnt.pass} passed, ${ev.cnt.warn} warnings, ${ev.cnt.fail} failures</div></div></div>`;
      QS.insights(res, ev).forEach((i) => { h += `<div class="find ${i.sev}"><b>${esc(i.title)}</b><div class="note">${esc(i.text)}</div></div>`; });
      h += '</div>';
      QS.MODS.forEach((m) => {
        const e = ev.mods[m.id]; if (!e || e.st === 'na') return;
        const variants = m.id === 'tile' ? ['tile', 'flow'] : [undefined];
        variants.forEach((mode) => {
          const html = QS.renderMod(m.id, res, { P, lim, opts: { mode }, w: 760, h: 380, rows: 20 });
          h += `<div class="card"><div class="hd"><h3>${esc(m.title)}${mode === 'flow' ? ' — flow-cell layout' : ''}</h3><span class="chip ${e.st}">${STNAME[e.st]}</span></div>${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}${html}</div>`;
        });
      });
    });
    QS.noTips = false;
    h += `<p class="sub" style="margin-top:36px">Created with QualityScale ${QS.VERSION}. Thresholds: ${QS.LIMIT_DEFS.map((d) => `${esc(d.label)} ${o.lim[d.id][0]}/${o.lim[d.id][1]}${d.unit}`).join(' · ')}.</p></main></body></html>`;
    return h;
  };
})();
