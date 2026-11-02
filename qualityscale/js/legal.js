/* Imprint and privacy notice (same operator details as the other LabScale tools). */
(function () {
  'use strict';
  const QS = (globalThis.QS = globalThis.QS || {});
  const L = { name: 'Andreas Dittes', street: 'Bautzener Str. 35', city: '10829 Berlin', country: 'Germany', mail: 'labscale@dittes.info' };
  QS.LEGAL_IMPRINT = [
    ['Legal notice (Imprint)', [
      `Information pursuant to § 5 DDG (German Digital Services Act)\nLabScale\nc/o ${L.name}\n${L.street}\n${L.city}\n${L.country}`,
      `Contact\nE-mail: ${L.mail}`,
      `Responsible for content pursuant to § 18(2) MStV\n${L.name}, address as above`]],
    ['Liability for content', ['As a service provider I am responsible for my own content under the general laws (§ 7(1) DDG). Under §§ 8–10 DDG I am not obliged to monitor transmitted or stored third-party information or to investigate circumstances indicating illegal activity. Obligations to remove or block the use of information under general law remain unaffected.']],
    ['Copyright', ['Content and works created by the operator (source code, texts, sample data, graphics) are subject to German copyright law.']],
    ['Notice on results', ['QualityScale reports summary statistics and heuristic warnings about sequencing data. Thresholds are rules of thumb and do not replace judgement about the experiment. The demo data are synthetic and were generated in your browser. No warranty is given for correctness or fitness for a particular purpose; results must be verified independently before they are used for decisions.']],
  ];
  QS.LEGAL_PRIVACY = [
    ['Privacy notice', [`Controller (Art. 4(7) GDPR)\nLabScale, c/o ${L.name}, ${L.street}, ${L.city}, e-mail: ${L.mail}`]],
    ['Local processing', ['QualityScale runs entirely in your browser once loaded from this site. Your sequencing files are read locally and never uploaded to any server. Only your settings (theme, thresholds, read limit) are kept in your browser’s local storage. This data never leaves your device and can be deleted at any time with your browser’s site-data controls.']],
    ['No external services', ['The app does not load scripts, fonts or data from third parties and makes no network requests after loading.']],
    ['Hosting and server log files', ['This site is hosted on GitHub Pages, a service of GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA. When you open the site, GitHub processes technically necessary access data (IP address, date and time, requested file, browser type) in server logs to deliver the pages and to ensure security and stability (Art. 6(1)(f) GDPR). I have no influence on this processing.']],
    ['Your rights', ['You have the right of access (Art. 15), rectification (16), erasure (17), restriction (18), data portability (20) and objection (21 GDPR), and the right to lodge a complaint with a supervisory authority, e.g. the Berlin Commissioner for Data Protection and Freedom of Information, Alt-Moabit 59–61, 10555 Berlin, Germany.']],
  ];
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  QS.legalHtml = (sections) => sections.map(([h, ps]) => `<h4>${esc(h)}</h4>` + ps.map((p) => { const lines = p.split('\n'); return `<p>${lines.map((l, i) => (i === 0 && lines.length > 1 && !/@|^\d|^c\//.test(l) ? `<b>${esc(l)}</b>` : esc(l))).join('<br>')}</p>`; }).join('')).join('');
})();
