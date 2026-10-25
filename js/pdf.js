'use strict';
// Vector PDF export: a canvas-2D-compatible recording context + a small PDF writer. Also print helpers.
const PDF_SYM={'α':'a','β':'b','γ':'g','δ':'d','ε':'e','ζ':'z','η':'h','θ':'q','ι':'i','κ':'k','λ':'l','μ':'m','ν':'n','ξ':'x','ο':'o','π':'p','ρ':'r','σ':'s','τ':'t','υ':'u','φ':'f','χ':'c','ψ':'y','ω':'w','Γ':'G','Δ':'D','Θ':'Q','Λ':'L','Ξ':'X','Π':'P','Σ':'S','Φ':'F','Ψ':'Y','Ω':'W','∞':'\xA5','≤':'\xA3','≥':'\xB3','≠':'\xB9','≈':'\xBB','∂':'\xB6','∇':'\xD1','→':'\xAE','∑':'\xE5'},PDF_SYM_RE=new RegExp('['+Object.keys(PDF_SYM).join('')+']+|[^'+Object.keys(PDF_SYM).join('')+']+','g'),pdfSymChar=ch=>{const c=ch.charCodeAt(0);return ch==='\\'||ch==='('||ch===')'?'\\'+ch:c>126?'\\'+c.toString(8).padStart(3,'0'):ch};
const PDF_CHARMAP={'−':'-','–':'-','—':'-','⁻':'-','⁰':'0','¹':'¹','²':'²','³':'³','⁴':'4','₀':'0','₁':'1','₂':'2','µ':'µ','μ':'µ','·':'·','°':'°','±':'±','×':'×','÷':'÷','Σ':'Sum','χ':'chi','α':'alpha','β':'beta','γ':'gamma','δ':'delta','Δ':'Delta','π':'pi','ρ':'rho','σ':'sigma','θ':'theta','λ':'lambda','ω':'omega','→':'->','⇄':'<>','≈':'~','≤':'<=','≥':'>=','…':'...','“':'"','”':'"','‘':"'",'’':"'",'✕':'x','▲':'^','∞':'inf','ₚ':'p','₁':'1','Å':'Å'};
function pdfText(str){let o='';for(const ch of String(str)){const m=PDF_CHARMAP[ch]!==undefined?PDF_CHARMAP[ch]:ch;for(const c of m){const code=c.charCodeAt(0);if(c==='\\'||c==='('||c===')')o+='\\'+c;else if(code<32)o+=' ';else if(code>255)o+='?';else if(code>126)o+='\\'+code.toString(8).padStart(3,'0');else o+=c}}return o}
function cssColor(s){s=String(s||'#000').trim();let m;
  if((m=s.match(/^#([0-9a-f]{3})$/i)))return[...m[1]].map(h=>parseInt(h+h,16)/255).concat(1);
  if((m=s.match(/^#([0-9a-f]{6})$/i)))return[0,2,4].map(i=>parseInt(m[1].substr(i,2),16)/255).concat(1);
  if((m=s.match(/^rgba?\(([^)]+)\)/i))){const p=m[1].split(',').map(parseFloat);return[p[0]/255,p[1]/255,p[2]/255,p.length>3?p[3]:1]}
  return[0,0,0,1]}
const _mc=document.createElement('canvas').getContext('2d');
class PDFCtx{
  constructor(doc){this.doc=doc;this.out=[];this.stack=[];this.path='';this.cur=false;this.fillStyle='#000';this.strokeStyle='#000';this.lineWidth=1;this.globalAlpha=1;this.font='12px sans-serif';this.textAlign='left';this.textBaseline='alphabetic';this._dash=[]}
  _o(s){this.out.push(s)}
  save(){this.stack.push({f:this.fillStyle,s:this.strokeStyle,w:this.lineWidth,a:this.globalAlpha,fo:this.font,ta:this.textAlign,d:this._dash});this._o('q')}
  restore(){const s=this.stack.pop();if(s){this.fillStyle=s.f;this.strokeStyle=s.s;this.lineWidth=s.w;this.globalAlpha=s.a;this.font=s.fo;this.textAlign=s.ta;this._dash=s.d}this._o('Q')}
  translate(x,y){this._o(`1 0 0 1 ${n(x)} ${n(y)} cm`)}
  rotate(a){const c=Math.cos(a),s=Math.sin(a);this._o(`${n(c)} ${n(s)} ${n(-s)} ${n(c)} 0 0 cm`)}
  scale(x,y){this._o(`${n(x)} 0 0 ${n(y)} 0 0 cm`)}
  setLineDash(a){this._dash=a||[]}
  beginPath(){this.path='';this.cur=false}
  moveTo(x,y){this.path+=`${n(x)} ${n(y)} m `;this.cur=true;this.sx=x;this.sy=y}
  lineTo(x,y){if(!this.cur)return this.moveTo(x,y);this.path+=`${n(x)} ${n(y)} l `}
  bezierCurveTo(a,b,c,d,e,f){if(!this.cur)this.moveTo(a,b);this.path+=`${n(a)} ${n(b)} ${n(c)} ${n(d)} ${n(e)} ${n(f)} c `}
  rect(x,y,w,h){this.path+=`${n(x)} ${n(y)} ${n(w)} ${n(h)} re `;this.cur=false}
  closePath(){this.path+='h '}
  arc(cx,cy,r,a0,a1,ccw){
    let d=a1-a0;if(ccw){while(d>0)d-=2*Math.PI;if(d<-2*Math.PI)d=-2*Math.PI}else{while(d<0)d+=2*Math.PI;if(d>2*Math.PI)d=2*Math.PI}
    if(Math.abs(d)<1e-9)d=0;const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0);this.cur?this.path+=`${n(x0)} ${n(y0)} l `:this.moveTo(x0,y0);this.cur=true;
    const segs=Math.max(1,Math.ceil(Math.abs(d)/(Math.PI/2))),da=d/segs,k=4/3*Math.tan(da/4);
    for(let i=0;i<segs;i++){const a=a0+da*i,b=a+da,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
      this.path+=`${n(cx+r*(ca-k*sa))} ${n(cy+r*(sa+k*ca))} ${n(cx+r*(cb+k*sb))} ${n(cy+r*(sb-k*cb))} ${n(cx+r*cb)} ${n(cy+r*sb)} c `}}
  _col(style,stroke){const[r,g,b,a]=cssColor(style);return{op:`${n(r)} ${n(g)} ${n(b)} ${stroke?'RG':'rg'}`,a}}
  _gs(a){return '/'+this.doc.gs(Math.max(0,Math.min(1,a)))}
  _paintF(){const f=this._col(this.fillStyle,false);return`${this._gs(f.a*this.globalAlpha)} gs ${f.op} `}
  _paintS(){const s=this._col(this.strokeStyle,true),d=this._dash.length?`[${this._dash.map(n).join(' ')}] 0 d `:'[] 0 d ';return`${this._gs(s.a*this.globalAlpha)} gs ${s.op} ${n(this.lineWidth)} w ${d}`}
  fill(){this._o(`q ${this._paintF()}${this.path}f Q`)}
  stroke(){this._o(`q ${this._paintS()}${this.path}S Q`)}
  clip(){this._o(`${this.path}W n`)}
  fillRect(x,y,w,h){this._o(`q ${this._paintF()}${n(x)} ${n(y)} ${n(w)} ${n(h)} re f Q`)}
  strokeRect(x,y,w,h){this._o(`q ${this._paintS()}${n(x)} ${n(y)} ${n(w)} ${n(h)} re S Q`)}
  clearRect(){}
  _font(){const m=this.font.match(/([\d.]+)px/),size=m?parseFloat(m[1]):12,bold=/(^|\s)(600|700|800|bold)(\s|$)/.test(this.font),fam=/mono|courier|menlo/i.test(this.font)?'C':/(^|[^-])serif|georgia|times/i.test(this.font)&&!/sans-serif|system-ui/i.test(this.font)?'T':'H';return{size,bold,fam}}
  measureText(t){const f=this._font();_mc.font=`${f.bold?'bold ':''}${f.size}px ${f.fam==='C'?'"Courier New",monospace':f.fam==='T'?'"Times New Roman",serif':'Helvetica,Arial,sans-serif'}`;return{width:_mc.measureText(pdfPlain(t)).width}}
  fillText(t,x,y){const f=this._font(),w=this.measureText(t).width,ox=this.textAlign==='center'?-w/2:this.textAlign==='right'||this.textAlign==='end'?-w:0,fn=this.doc.font(f.fam,f.bold);
    const segs=String(t).match(PDF_SYM_RE)||[''],symFn=segs.some(q=>PDF_SYM[q[0]]!==undefined)?this.doc.font('S',false):null;
    const body=segs.map(q=>PDF_SYM[q[0]]!==undefined&&symFn?`/${symFn} ${n(f.size)} Tf (${[...q].map(ch=>pdfSymChar(PDF_SYM[ch]||'?')).join('')}) Tj /${fn} ${n(f.size)} Tf`:`(${pdfText(q)}) Tj`).join(' ');
    this._o(`q ${this._paintF()}1 0 0 -1 ${n(x+ox)} ${n(y)} cm BT /${fn} ${n(f.size)} Tf ${body} ET Q`)}
  content(){return this.out.join('\n')}
}
const pdfPlain=t=>String(t).replace(/./gu,ch=>PDF_SYM[ch]!==undefined?ch:PDF_CHARMAP[ch]!==undefined?PDF_CHARMAP[ch]:ch);
function n(v){return Number.isFinite(v)?(Math.round(v*1000)/1000).toString():'0'}

class PDFDoc{
  constructor(){this.pages=[];this.gsm=new Map();this.fonts=new Map()}
  gs(a){a=Math.round(a*100)/100;if(!this.gsm.has(a))this.gsm.set(a,'GS'+this.gsm.size);return this.gsm.get(a)}
  font(fam,bold){const key=fam+(bold?'B':'');if(!this.fonts.has(key)){const base={H:['Helvetica','Helvetica-Bold'],T:['Times-Roman','Times-Bold'],C:['Courier','Courier-Bold'],S:['Symbol','Symbol']}[fam][bold?1:0];this.fonts.set(key,{name:'F'+this.fonts.size,base})}return this.fonts.get(key).name}
  // page: draws via fn(ctx) in canvas-style coordinates mapped into the page rectangle
  addPage(W,H,drawFn,{pw=841.89,ph=595.28,margin=36,footer=''}={}){
    const ctx=new PDFCtx(this),s=Math.min((pw-2*margin)/W,(ph-2*margin-10)/H),ox=(pw-W*s)/2,oy=margin;
    ctx._o(`q ${n(s)} 0 0 ${n(-s)} ${n(ox)} ${n(ph-oy)} cm`);drawFn(ctx,W,H);ctx._o('Q');
    if(footer){const f=this.font('H',false);ctx._o(`q 0.4 0.4 0.4 rg BT /${f} 8 Tf ${n(margin)} 20 Td (${pdfText(footer)}) Tj ET Q`)}
    this.pages.push({pw,ph,content:ctx.content()})}
  build(){
    const objs=[],add=s=>{objs.push(s);return objs.length};
    const cat=add(''),pagesObj=add(''),fontIds={};
    this.fonts.forEach((f,k)=>{fontIds[f.name]=add(`<< /Type /Font /Subtype /Type1 /BaseFont /${f.base}${f.base==='Symbol'?'':' /Encoding /WinAnsiEncoding'} >>`)});
    if(!this.fonts.size){const id=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');fontIds.F0=id}
    const gsEntries=[...this.gsm.entries()].map(([a,nm])=>`/${nm} << /ca ${a} /CA ${a} >>`).join(' ');
    const res=`<< /Font << ${Object.entries(fontIds).map(([k,id])=>`/${k} ${id} 0 R`).join(' ')} >> /ExtGState << ${gsEntries||'/GS_ << /ca 1 >>'} >> >>`;
    const kids=[];
    this.pages.forEach(p=>{const cid=add(`<< /Length ${p.content.length} >>\nstream\n${p.content}\nendstream`),pid=add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${n(p.pw)} ${n(p.ph)}] /Contents ${cid} 0 R /Resources ${res} >>`);kids.push(pid)});
    objs[cat-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;objs[pagesObj-1]=`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`;
    let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const offs=[];
    objs.forEach((o,i)=>{offs.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`});
    const xr=out.length;out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n${offs.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objs.length+1} /Root ${cat} 0 R /Info << /Title (LabScale export) /Producer (LabScale) >> >>\nstartxref\n${xr}\n%%EOF`;
    const bytes=new Uint8Array(out.length);for(let i=0;i<out.length;i++)bytes[i]=out.charCodeAt(i)&255;return new Blob([bytes],{type:'application/pdf'})}
}
// ---- graph helpers ----
function graphSize(g){return g.type==='multi'?[1100,720]:['heat','contour','surf3d','wire3d','scat3d'].includes(g.type)?[960,640]:g.type==='pie'||g.type==='polar'||g.type==='radar'?[760,620]:[960,600]}
function drawGraphTo(c,g,W,H,pal=LIGHT,inLayout=false){const ch=new Chart(null,null,false);ch.getSheet=sheetById;ch.getGraph=graphById;ch.g=g;ch.draw(c,W,H,pal,false);if(!inLayout&&typeof drawMaster==='function')drawMaster(c,W,H)}
function graphsToPDF(list){const doc=new PDFDoc(),stamp=new Date().toLocaleString();
  list.forEach((g,i)=>{const[W,H]=graphSize(g);doc.addPage(W,H,(c)=>drawGraphTo(c,g,W,H),{footer:`${g.name}  ·  LabScale  ·  ${stamp}  ·  page ${i+1}/${list.length}`})});
  return doc.build()}
function graphToPNGUrl(g,scale=2){const[W,H]=graphSize(g),cv=document.createElement('canvas');cv.width=W*scale;cv.height=H*scale;const c=cv.getContext('2d');c.scale(scale,scale);drawGraphTo(c,g,W,H);return cv.toDataURL('image/png')}
function exportPDF(list,name){if(!list.length)return alert('No graphs to export.');download(name,graphsToPDF(list))}
async function printHTML(html){
  let a=$('#printArea');if(!a){a=document.createElement('div');a.id='printArea';document.body.append(a)}
  a.innerHTML=html;await Promise.all([...a.querySelectorAll('img')].map(i=>i.decode?i.decode().catch(()=>{}):Promise.resolve()));
  const clean=()=>{a.innerHTML='';window.removeEventListener('afterprint',clean)};window.addEventListener('afterprint',clean);window.print()}
function printGraphs(list){if(!list.length)return alert('No graphs to print.');
  printHTML(list.map(g=>`<figure class="pf"><img src="${graphToPNGUrl(g,3)}" alt="${esc(g.name)}"><figcaption>${esc(g.name)} · LabScale</figcaption></figure>`).join(''))}
