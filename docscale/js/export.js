/* DocScale export: ZIP writer, DOCX, EPUB, Markdown, plain text, standalone HTML */
(function(){
'use strict';
const enc=new TextEncoder();
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=d=>{let c=~0;for(let i=0;i<d.length;i++)c=CRC[(c^d[i])&255]^(c>>>8);return(~c)>>>0};
const bytes=x=>typeof x==='string'?enc.encode(x):x;
function dataToBytes(u){const m=/^data:([^;,]+)?(;base64)?,(.*)$/s.exec(u);if(!m)return new Uint8Array();if(m[2]){const b=atob(m[3]),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}return enc.encode(decodeURIComponent(m[3]))}
function zip(files){const chunks=[],cd=[];let off=0;const d0=new Date(),time=(d0.getHours()<<11)|(d0.getMinutes()<<5)|(d0.getSeconds()>>1),date=((d0.getFullYear()-1980)<<9)|((d0.getMonth()+1)<<5)|d0.getDate();
  for(const f of files){const nm=enc.encode(f.name),d=bytes(f.data),crc=crc32(d),sz=d.length;
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(10,time,true);h.setUint16(12,date,true);h.setUint32(14,crc,true);h.setUint32(18,sz,true);h.setUint32(22,sz,true);h.setUint16(26,nm.length,true);
    chunks.push(h.buffer,nm,d);
    const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,time,true);c.setUint16(14,date,true);c.setUint32(16,crc,true);c.setUint32(20,sz,true);c.setUint32(24,sz,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
    cd.push(c.buffer,nm);off+=30+nm.length+sz}
  const cds=cd.reduce((s,x)=>s+(x.byteLength!==undefined?x.byteLength:x.length),0),e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cds,true);e.setUint32(16,off,true);
  return new Blob(chunks.concat(cd,[e.buffer]),{type:'application/zip'})}
function download(name,data,mime){const b=data instanceof Blob?data:new Blob([data],{type:mime||'application/octet-stream'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}
const tmp=html=>{const d=document.createElement('div');d.innerHTML=html;return d};
const texOf=n=>{const k=n.classList.contains('katex')?n:n.querySelector('.katex');if(k&&k.dataset.tex!=null)return k.dataset.tex;const a=n.querySelector('annotation[encoding="application/x-tex"]');return a?a.textContent.trim():n.textContent};
const sq=s=>s.replace(/\s+/g,' ');

/* ---- plain text ---- */
function toText(root){const out=[];
  (function w(n){if(n.nodeType===3){out.push(sq(n.textContent));return}if(n.nodeType!==1)return;const t=n.tagName.toLowerCase(),c=n.classList;
    if(c.contains('katex-display')||c.contains('katex')){out.push(texOf(n));return}if(c.contains('anc')||c.contains('pgbrk')){return}
    const blk=/^(p|div|h[1-6]|li|tr|pre|figure|figcaption|blockquote|header|section|nav|ul|ol|table|dt|dd)$/.test(t);
    if(t==='br'){out.push('\n');return}if(t==='img'){out.push('[image]');return}
    if(blk&&out.length&&!/\n$/.test(out[out.length-1]))out.push('\n');
    if(t==='li')out.push(n.parentNode.tagName==='OL'?(Array.prototype.indexOf.call(n.parentNode.children,n)+1)+'. ':'• ');
    if(t==='td'||t==='th'){out.push('\t')}
    n.childNodes.forEach(w);
    if(blk)out.push(/^(h[1-6]|p|figure|table|ul|ol|blockquote|pre)$/.test(t)?'\n\n':'\n')})(root);
  return out.join('').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').replace(/\t+/g,'  ').trim()+'\n'}

/* ---- markdown ---- */
function toMarkdown(root){
  const inl=n=>{let s='';n.childNodes.forEach(c=>s+=mdI(c));return s};
  function mdI(n){if(n.nodeType===3)return sq(n.textContent);if(n.nodeType!==1)return'';const t=n.tagName.toLowerCase(),c=n.classList;
    if(c.contains('katex-display')){return'\n\n$$\n'+texOf(n)+'\n$$\n\n'}if(c.contains('katex'))return'$'+texOf(n)+'$';if(c.contains('anc'))return'';
    const i=inl(n);
    switch(t){case'b':case'strong':return'**'+i+'**';case'i':case'em':return'*'+i+'*';case'code':return'`'+i+'`';case'u':return i;case's':return'~~'+i+'~~';case'mark':return'=='+i+'==';
      case'sup':return n.classList.contains('fn')?'[^'+n.textContent.trim()+']':'^'+i+'^';case'sub':return'~'+i+'~';case'br':return'  \n';
      case'a':{const h=n.getAttribute('href')||'';if(n.classList.contains('cite')||n.classList.contains('ref'))return i;return'['+i+']('+h+')'}
      case'img':return'![]('+(n.dataset.path||n.getAttribute('src'))+')';
      case'span':return c.contains('tt')?'`'+i+'`':c.contains('sc')?i.toUpperCase():i;
      default:return i}}
  function blocks(n,pre){let s='';n.childNodes.forEach(c=>s+=mdB(c,pre));return s}
  function mdB(n,pre){pre=pre||'';if(n.nodeType===3)return n.textContent.trim()?pre+sq(n.textContent)+'\n\n':'';if(n.nodeType!==1)return'';
    const t=n.tagName.toLowerCase(),c=n.classList;
    if(c.contains('pgbrk'))return'\\newpage\n\n';if(c.contains('anc'))return'';
    if(c.contains('eq'))return'$$\n'+texOf(n.querySelector('.katex')||n).replace(/^\\begin\{(equation)\}([\s\S]*)\\end\{\1\}$/,'$2').trim()+'\n$$\n\n';
    if(c.contains('toc'))return'[TOC]\n\n';
    if(/^h[1-6]$/.test(t)){const lv=+t[1];return'#'.repeat(c.contains('title')?1:Math.max(2,lv))+' '+(c.contains('sec')&&n.querySelector('.num')?n.querySelector('.num').textContent+' ':'')+inl(n).replace(n.querySelector('.num')?n.querySelector('.num').textContent:'\u0000','').trim()+'\n\n'}
    if(t==='p')return pre+inl(n).trim()+'\n\n';
    if(t==='ul'||t==='ol'){let k=0,s='';n.childNodes.forEach(li=>{if(li.tagName!=='LI')return;k++;const body=[];let first='';li.childNodes.forEach(x=>{if(x.nodeType===1&&/^(ul|ol)$/i.test(x.tagName))body.push(mdB(x,'    ').replace(/\n+$/,'\n'));else first+=mdI(x)});
      const mk=t==='ol'?k+'. ':'- ';s+=pre+mk+first.trim()+'\n'+body.join('')});return s+'\n'}
    if(t==='dl'){let s='';n.childNodes.forEach(x=>{s+=x.tagName==='DT'?'**'+inl(x)+'**\n':': '+blocks(x).trim()+'\n\n'});return s}
    if(t==='blockquote'){const ct=n.querySelector('.ct'),ty=ct?ct.textContent.trim():'';let inner=blocks(n);if(ct)inner=inner.replace(ty,'').replace(/^\s+/,'');const L=inner.trim().split('\n').map(l=>'> '+l);if(ct)L[0]='> [!'+ty+'] '+L[0].slice(2);return L.join('\n')+'\n\n'}
    if(t==='pre')return'```\n'+n.textContent+'\n```\n\n';
    if(t==='hr')return'---\n\n';
    if(t==='table'){const rows=[...n.rows].map(r=>[...r.cells].map(cl=>inl(cl).trim().replace(/\|/g,'\\|')));if(!rows.length)return'';const w=Math.max(...rows.map(r=>r.length));
      rows.forEach(r=>{while(r.length<w)r.push('')});return'| '+rows[0].join(' | ')+' |\n|'+rows[0].map(()=>' --- |').join('')+'\n'+rows.slice(1).map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n\n'}
    if(t==='figure'||c.contains('tabwrap')){let s='';n.childNodes.forEach(x=>{if(x.tagName==='FIGCAPTION'||(x.classList&&x.classList.contains('tcap')))return;s+=mdB(x,pre)});const cap=n.querySelector('figcaption,.tcap');
      if(cap&&n.querySelector('table'))return s+'Table: '+inl(cap).replace(/\*\*Table \d+\.\*\*\s*/,'').trim()+'\n\n';
      return cap?s.replace(/!\[\]\(/,'!['+inl(cap).replace(/\*\*(Figure|Table) \d+\.\*\*\s*/,'').replace(/[\[\]]/g,'').trim()+'](')+'':s}
    if(c.contains('thm')||c.contains('proof')||c.contains('abstract')){return blocks(n,pre)}
    if(c.contains('tl')||c.contains('pl'))return pre+'**'+n.textContent.trim()+'** ';
    if(t==='header'){let s='';const ti=n.querySelector('.title');if(ti)s+='# '+inl(ti).trim()+'\n\n';const a=n.querySelector('.authors');if(a)s+='*'+inl(a).trim()+'*\n\n';return s}
    if(t==='section'&&c.contains('footnotes')){let s='';n.querySelectorAll('li').forEach(li=>{const x=li.cloneNode(true);const b=x.querySelector('.fnb');if(b)b.remove();s+='[^'+li.value+']: '+inl(x).trim()+'\n'});return s+'\n'}
    if(t==='section'&&c.contains('bib')){let s='## '+inl(n.querySelector('h2')).trim()+'\n\n';n.querySelectorAll('li').forEach(li=>{s+='1. '+inl(li).trim()+'\n'});return s+'\n'}
    if(t==='nav')return'';
    if(t==='div'||t==='section'||t==='article'||t==='main')return blocks(n,pre);
    return pre+inl(n).trim()+'\n\n'}
  return blocks(root).replace(/\*\*([^*\n]*?)(\s+)\*\*/g,'**$1**$2').replace(/\n{3,}/g,'\n\n').trim()+'\n'}

/* ---- DOCX ---- */
function loadImg(src){return new Promise(r=>{const i=new Image();i.onload=()=>r({w:i.naturalWidth,h:i.naturalHeight});i.onerror=()=>r({w:600,h:400});i.src=src})}
async function toDocx(root,title){
  const media=[],rels=[];const imgs=[...root.querySelectorAll('img')];const dims=new Map();
  for(const im of imgs)dims.set(im,await loadImg(im.getAttribute('src')));
  const rpr=o=>{let s='';if(o.b)s+='<w:b/>';if(o.i)s+='<w:i/>';if(o.u)s+='<w:u w:val="single"/>';if(o.code)s+='<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>';if(o.m)s+='<w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/><w:i/>';if(o.col)s+='<w:color w:val="'+o.col+'"/>';if(o.sc)s+='<w:smallCaps/>';if(o.sup)s+='<w:vertAlign w:val="superscript"/>';if(o.sub)s+='<w:vertAlign w:val="subscript"/>';if(o.sz)s+='<w:sz w:val="'+o.sz+'"/>';return s?'<w:rPr>'+s+'</w:rPr>':''};
  const run=(t,o)=>'<w:r>'+rpr(o||{})+'<w:t xml:space="preserve">'+esc(t)+'</w:t></w:r>';
  function runs(n,o){let s='';n.childNodes.forEach(c=>s+=run1(c,o));return s}
  function run1(n,o){if(n.nodeType===3){const t=n.textContent.replace(/\s+/g,' ');return t?run(t,o):''}if(n.nodeType!==1)return'';const t=n.tagName.toLowerCase(),c=n.classList;
    if(c.contains('katex')&&!c.contains('katex-display'))return run(texOf(n),Object.assign({},o,{m:1}));if(c.contains('katex-display'))return run(texOf(n),Object.assign({},o,{m:1}));
    if(c.contains('anc')||c.contains('katex-mathml'))return'';
    if(t==='br')return'<w:r><w:br/></w:r>';
    if(t==='img'){const d=dims.get(n);let w=d.w*9525,h=d.h*9525;const max=5600000;if(w>max){h=h*max/w;w=max}const idx=media.length+1;media.push({name:'image'+idx+(/image\/jpe?g/.test(n.getAttribute('src'))?'.jpg':'.png'),data:dataToBytes(n.getAttribute('src'))});
      return'<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+Math.round(w)+'" cy="'+Math.round(h)+'"/><wp:docPr id="'+idx+'" name="Picture '+idx+'"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="'+idx+'" name="image'+idx+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg'+idx+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+Math.round(w)+'" cy="'+Math.round(h)+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'}
    const p=Object.assign({},o);
    if(t==='b'||t==='strong')p.b=1;if(t==='i'||t==='em')p.i=1;if(t==='u')p.u=1;if(t==='sup')p.sup=1;if(t==='sub')p.sub=1;if(t==='code'||c.contains('tt'))p.code=1;if(c.contains('sc'))p.sc=1;if(t==='a')p.col='2563EB';
    return runs(n,p)}
  const par=(inner,o)=>{o=o||{};return'<w:p><w:pPr>'+(o.style?'<w:pStyle w:val="'+o.style+'"/>':'')+(o.keep?'<w:keepNext/>':'')+(o.ind?'<w:ind w:left="'+o.ind+'"'+(o.hang?' w:hanging="'+o.hang+'"':'')+'/>':'')+(o.jc?'<w:jc w:val="'+o.jc+'"/>':'')+(o.br?'<w:pageBreakBefore/>':'')+'</w:pPr>'+inner+'</w:p>'};
  let body='';
  function block(n,o){o=o||{};if(n.nodeType===3){if(n.textContent.trim())body+=par(run(n.textContent.replace(/\s+/g,' '),{}),o);return}if(n.nodeType!==1)return;const t=n.tagName.toLowerCase(),c=n.classList;
    if(c.contains('anc')||t==='nav')return;
    if(c.contains('pgbrk')){body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';return}
    if(c.contains('eq')){body+=par(run(texOf(n.querySelector('.katex')||n),{m:1}),Object.assign({},o,{jc:'center'}));return}
    if(/^h[1-6]$/.test(t)){const lv=c.contains('title')?0:Math.min(+t[1]-(1-1),4);body+=par(runs(n,{}),{style:c.contains('title')?'Title':'Heading'+Math.max(1,Math.min(lv-1,3)||1),keep:1});return}
    if(t==='p'){body+=par(runs(n,{}),Object.assign({},o,{jc:c.contains('center')?'center':o.jc}));return}
    if(t==='ul'||t==='ol'){let k=0;n.childNodes.forEach(li=>{if(li.tagName!=='LI'&&li.tagName!=='DT')return;if(li.tagName==='DT'){body+=par(runs(li,{b:1}),o);return}k++;let pre=t==='ol'?k+'. ':'• ';const ind=(o.ind||0)+500;let first=document.createElement('span');
        const subs=[];li.childNodes.forEach(x=>{if(x.nodeType===1&&/^(ul|ol)$/i.test(x.tagName))subs.push(x);else first.appendChild(x.cloneNode(true))});
        body+=par(run(pre,{})+runs(first,{}),{ind,hang:300});subs.forEach(x=>block(x,{ind}))});return}
    if(t==='dl'){n.childNodes.forEach(x=>{if(x.tagName==='DT')body+=par(runs(x,{b:1}),o);else block(x,{ind:400})});return}
    if(t==='blockquote'){n.childNodes.forEach(x=>block(x,{ind:700}));return}
    if(t==='pre'){n.textContent.split('\n').forEach(l=>{body+=par(run(l||' ',{code:1,sz:20}),{ind:300})});return}
    if(t==='table'){const rows=[...n.rows];const grid=n.classList.contains('grid')||n.classList.contains('vg');let x='<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>'+['top','bottom','insideH'].concat(grid?['left','right','insideV']:[]).map(b=>'<w:'+b+' w:val="single" w:sz="4" w:color="888888"/>').join('')+'</w:tblBorders></w:tblPr>';
      rows.forEach(r=>{x+='<w:tr>';[...r.cells].forEach(cl=>{x+='<w:tc><w:tcPr>'+(cl.colSpan>1?'<w:gridSpan w:val="'+cl.colSpan+'"/>':'')+'</w:tcPr>'+par(runs(cl,{b:cl.tagName==='TH'?1:0}),{jc:cl.classList.contains('c')?'center':cl.classList.contains('r')?'right':'left'})+'</w:tc>'});x+='</w:tr>'});body+=x+'</w:tbl>'+par('',{});return}
    if(t==='figure'){n.childNodes.forEach(x=>block(x,Object.assign({},o,{jc:'center'})));return}
    if(t==='figcaption'){body+=par(runs(n,{sz:20}),{style:'Caption',jc:'center'});return}
    if(c.contains('thm')||c.contains('proof')||c.contains('abstract')){let first=true;n.childNodes.forEach(x=>{if(x.nodeType===1&&x.tagName==='P'&&first){first=false}block(x,Object.assign({},o,{ind:c.contains('abstract')?500:o.ind}))});return}
    if(c.contains('tl')||c.contains('pl')){body+=par(runs(n,{b:1}),o);return}
    if(t==='span'&&n.parentNode&&/^(div)$/i.test(n.parentNode.tagName)){body+=par(runs(n,{}),o);return}
    if(t==='header'){n.childNodes.forEach(x=>{if(x.nodeType!==1)return;if(x.classList.contains('title'))body+=par(runs(x,{}),{style:'Title',jc:'center'});else body+=par(runs(x,{}),{jc:'center'})});return}
    if(t==='hr'){body+=par('',{});return}
    if(['div','section','article','main','tbody','thead'].includes(t)){n.childNodes.forEach(x=>block(x,o));return}
    body+=par(runs(n,{}),o)}
  root.childNodes.forEach(n=>block(n,{}));
  const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+NS+'><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  const sty=(id,name,rp,pp)=>'<w:style w:type="paragraph" w:styleId="'+id+'"><w:name w:val="'+name+'"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr>'+(pp||'')+'</w:pPr><w:rPr>'+(rp||'')+'</w:rPr></w:style>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Times New Roman"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'
    +sty('Title','Title','<w:b/><w:sz w:val="40"/>','<w:spacing w:before="0" w:after="200"/>')+sty('Heading1','heading 1','<w:b/><w:sz w:val="32"/>','<w:spacing w:before="320" w:after="120"/>')+sty('Heading2','heading 2','<w:b/><w:sz w:val="26"/>','<w:spacing w:before="240" w:after="100"/>')+sty('Heading3','heading 3','<w:b/><w:i/><w:sz w:val="23"/>','<w:spacing w:before="200" w:after="80"/>')+sty('Caption','caption','<w:sz w:val="20"/>','')+'</w:styles>';
  const ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  const rootRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const docRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+media.map((m,i)=>'<Relationship Id="rIdImg'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+m.name+'"/>').join('')+'</Relationships>';
  return zip([{name:'[Content_Types].xml',data:ct},{name:'_rels/.rels',data:rootRels},{name:'word/document.xml',data:doc},{name:'word/styles.xml',data:styles},{name:'word/_rels/document.xml.rels',data:docRels}].concat(media.map(m=>({name:'word/media/'+m.name,data:m.data}))))}

/* ---- CSS helpers (document styles + KaTeX with embedded fonts) ---- */
async function fetchText(u){const r=await fetch(u);if(!r.ok)throw new Error(r.status);return r.text()}
async function docCss(){try{return await fetchText('css/paper.css')}catch(e){return''}}
async function katexCss(embed){let css='';try{css=await fetchText('vendor/katex/katex.min.css')}catch(e){return''}
  if(!embed)return css;const urls=[...new Set((css.match(/url\(fonts\/[^)]+\)/g)||[]))];
  for(const u of urls){const f=u.slice(4,-1);try{const b=await (await fetch('vendor/katex/'+f)).arrayBuffer();let s='';const a=new Uint8Array(b);for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));css=css.split(u).join('url(data:font/woff2;base64,'+btoa(s)+')')}catch(e){}}return css}
async function toHtml(html,title,opts){const root=tmp(html);const math=!!root.querySelector('.katex');const css=await docCss(),k=math?await katexCss(true):'';
  return'<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'+k+'\n'+css+'\nbody{margin:0;background:#eef0f4}.doc{max-width:794px;margin:24px auto;background:#fff;padding:96px;box-shadow:0 2px 12px rgba(0,0,0,.18)}@media print{body{background:#fff}.doc{margin:0;box-shadow:none;max-width:none;padding:0}}@media(max-width:860px){.doc{padding:24px;margin:0}}</style></head><body><main class="doc paper-text">'+html+'</main></body></html>'}

/* ---- EPUB ---- */
async function toEpub(html,title,author){
  const root=tmp(html);const imgs=[];let n=0;
  root.querySelectorAll('img').forEach(im=>{const s=im.getAttribute('src');if(/^data:/.test(s)){n++;const ext=/jpe?g/.test(s)?'jpg':'png';imgs.push({name:'images/img'+n+'.'+ext,data:dataToBytes(s),type:ext==='jpg'?'image/jpeg':'image/png',id:'img'+n});im.setAttribute('src','images/img'+n+'.'+ext)}});
  root.querySelectorAll('.katex-display,.katex').forEach(m=>{if(!m.isConnected||(m.classList.contains('katex')&&m.closest('.katex-display')))return;const tex=texOf(m),disp=m.classList.contains('katex-display');let ml='';try{ml=katex.renderToString(tex,{output:'mathml',displayMode:disp,throwOnError:false,strict:'ignore'})}catch(e){ml=esc(tex)}
    const sp=document.createElement(disp?'div':'span');sp.innerHTML=ml;m.replaceWith(sp)});
  root.querySelectorAll('a.anc').forEach(a=>a.remove());
  const body=new XMLSerializer().serializeToString(root).replace(/^<div[^>]*>|<\/div>$/g,'');
  const css=(await docCss()).replace(/@media print[\s\S]*?\}\s*\}/g,'');
  const x='<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><meta charset="utf-8"/><title>'+esc(title)+'</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body class="paper-text">'+body+'</body></html>';
  const id='urn:uuid:'+(crypto.randomUUID?crypto.randomUUID():String(Date.now()));
  const opf='<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">'+id+'</dc:identifier><dc:title>'+esc(title)+'</dc:title><dc:language>en</dc:language><dc:creator>'+esc(author||'DocScale')+'</dc:creator><meta property="dcterms:modified">'+new Date().toISOString().replace(/\.\d+Z/,'Z')+'</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="c1" href="chapter.xhtml" media-type="application/xhtml+xml" properties="mathml"/><item id="css" href="style.css" media-type="text/css"/>'+imgs.map(i=>'<item id="'+i.id+'" href="'+i.name+'" media-type="'+i.type+'"/>').join('')+'</manifest><spine><itemref idref="c1"/></spine></package>';
  const nav='<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">'+esc(title)+'</a></li></ol></nav></body></html>';
  return zip([{name:'mimetype',data:'application/epub+zip'},{name:'META-INF/container.xml',data:'<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'},{name:'OEBPS/content.opf',data:opf},{name:'OEBPS/nav.xhtml',data:nav},{name:'OEBPS/chapter.xhtml',data:x},{name:'OEBPS/style.css',data:css+'\nbody{margin:1em}'}].concat(imgs.map(i=>({name:'OEBPS/'+i.name,data:i.data}))))}

/* ---- project zip ---- */
function projectZip(files){return zip(files.map(f=>({name:f.path,data:f.bin?dataToBytes(f.bin):(f.text||'')})))}

window.DSX={zip,download,toText,toMarkdown,toDocx,toHtml,toEpub,projectZip,dataToBytes,tmp,docCss,katexCss};
})();
