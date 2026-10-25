'use strict';
// Plot features: maths text (super/subscripts, Greek), colour/size/shape by column, tables inside graphs, custom-formula axes UI.
// ---------- maths text ----------
const GREEK={alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',upsilon:'υ',phi:'φ',chi:'χ',psi:'ψ',omega:'ω',Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Phi:'Φ',Psi:'Ψ',Omega:'Ω',pm:'±',times:'×',cdot:'·',deg:'°',degree:'°',le:'≤',leq:'≤',ge:'≥',geq:'≥',ne:'≠',approx:'≈',infty:'∞',to:'→',partial:'∂',nabla:'∇',sum:'∑',AA:'Å',micro:'µ',percent:'%',sqrt:'√'};
function parseRich(s){const runs=[];let cur='',i=0;const flush=()=>{if(cur){runs.push({t:cur,m:'n'});cur=''}};
  while(i<s.length){const ch=s[i];
    if(ch==='\\'){const m=/^\\([A-Za-z]+)/.exec(s.slice(i));if(m&&GREEK[m[1]]){cur+=GREEK[m[1]];i+=m[0].length;if(s[i]===' ')i++;continue}if('\\^_{}'.includes(s[i+1]||' ')){cur+=s[i+1];i+=2;continue}}
    if((ch==='^'||ch==='_')&&s[i+1]==='{'){const j=s.indexOf('}',i+2);if(j>0){flush();runs.push({t:s.slice(i+2,j).replace(/\\([A-Za-z]+)/g,(a,b)=>GREEK[b]||a),m:ch==='^'?'sup':'sub'});i=j+1;continue}}
    if(ch==='^'){const m=/^\^([+\-−]?\d+|[A-Za-z])/.exec(s.slice(i));if(m){flush();runs.push({t:m[1].replace('-','−'),m:'sup'});i+=m[0].length;continue}}
    cur+=ch;i++}flush();return runs}
Chart.prototype.rt=function(c,text,x,y){text=String(text);if(!/[\^\\]|_\{/.test(text)){c.fillText(text,x,y);return}
  const font=c.font,m=/([\d.]+)px/.exec(font),base=m?+m[1]:12,al=c.textAlign,runs=parseRich(text),setS=k=>{c.font=font.replace(/([\d.]+)px/,(base*k).toFixed(2)+'px')};let tot=0;
  runs.forEach(r=>{setS(r.m==='n'?1:.7);r.w=c.measureText(r.t).width;tot+=r.w});let cx=al==='center'?x-tot/2:(al==='right'||al==='end')?x-tot:x;c.textAlign='left';
  runs.forEach(r=>{setS(r.m==='n'?1:.7);c.fillText(r.t,cx,y+(r.m==='sup'?-base*.4:r.m==='sub'?base*.22:0));cx+=r.w});c.font=font;c.textAlign=al};
// ---------- colour / size / shape by column ----------
Chart.prototype.modStyle=function(s,d){const sh=this.sheet(),out={},leg={name:d.name},cols=(ci)=>d.rows.map(r=>sh.cols[ci]?.d[r]);
  const isNum=a=>{const ne=a.filter(v=>v!==''&&v!=null&&!(typeof v==='number'&&Number.isNaN(v)));return ne.length>0&&ne.every(v=>typeof v==='number'&&Number.isFinite(v))};
  const levels=a=>{const L=[...new Set(a.map(String))],num=L.every(v=>v!==''&&Number.isFinite(+v));return L.sort((p,q)=>num?p-q:p.localeCompare(q))},nm=ci=>sh.cols[ci]?.name||L(ci);
  if(s.cby>=0){const a=cols(s.cby);if(isNum(a)&&!s.ccat){const z=a.filter(Number.isFinite),lo=s.czmin??Math.min(...z),hi=s.czmax??Math.max(...z),cm=this.g.cmap||'viridis';out.color=a.map(v=>Number.isFinite(v)?cmap(cm,(v-lo)/((hi-lo)||1)):'#999999');leg.color={num:true,lo,hi,cm,name:nm(s.cby)}}else{const Lv=levels(a);out.color=a.map(v=>PALETTE[Lv.indexOf(String(v))%PALETTE.length]);leg.color={cat:Lv.map((l,i)=>[l,PALETTE[i%PALETTE.length]]),name:nm(s.cby)}}}
  if(s.sby>=0){const a=cols(s.sby).map(Number),z=a.filter(Number.isFinite),lo=Math.min(...z),hi=Math.max(...z),mn=s.smin||4,mx=s.smax||22;out.size=a.map(v=>Number.isFinite(v)?mn+(mx-mn)*Math.sqrt((v-lo)/((hi-lo)||1)):mn);leg.size={lo,hi,mn,mx,name:nm(s.sby)}}
  if(s.shby>=0){const a=cols(s.shby),Lv=levels(a);out.sym=a.map(v=>SYMBOLS[Lv.indexOf(String(v))%7]);leg.shape={cat:Lv.map((l,i)=>[l,SYMBOLS[i%7]]),name:nm(s.shby)}}
  (this.modLeg=this.modLeg||[]).push(leg);return out};
Chart.prototype.modLegendDraw=function(c,R){const legs=(this.modLeg||[]).filter(l=>l.color||l.size||l.shape).slice(0,1);if(!legs.length||this.g.modLeg==='none')return;const g=this.g,pal=this.p,fs=(g.fs||12)-1,l=legs[0],blocks=[];
  const pad=8,lh=fs+6;let w=0,h=pad;const lines=[];
  if(l.color){lines.push({t:'title',s:l.color.name});if(l.color.num)lines.push({t:'bar',c:l.color});else l.color.cat.slice(0,12).forEach(([lb,co])=>lines.push({t:'cat',s:lb,c:co}))}
  if(l.shape){lines.push({t:'title',s:l.shape.name});l.shape.cat.slice(0,12).forEach(([lb,sy])=>lines.push({t:'sym',s:lb,sy}))}
  if(l.size){lines.push({t:'title',s:l.size.name});[0,.5,1].forEach(f=>lines.push({t:'sz',s:Mx.fmt(l.size.lo+(l.size.hi-l.size.lo)*f,3),d:l.size.mn+(l.size.mx-l.size.mn)*Math.sqrt(f)}))}
  c.font=`${fs}px ${this.ff}`;lines.forEach(q=>{w=Math.max(w,c.measureText(q.s||'').width+(q.t==='bar'?100:30));h+=q.t==='bar'?lh+12:q.t==='sz'?Math.max(lh,q.d+4):lh});w+=pad*2;h+=pad;
  const pos=g.modLeg||'tl',x=pos.endsWith('r')?R.x+R.w-w-8:R.x+8,y=pos.startsWith('b')?R.y+R.h-h-8:R.y+8;c.save();c.globalAlpha=.9;c.fillStyle='#ffffff';c.fillRect(x,y,w,h);c.globalAlpha=1;c.strokeStyle=pal.grid;c.lineWidth=1;c.strokeRect(x,y,w,h);let yy=y+pad;
  lines.forEach(q=>{c.font=`${q.t==='title'?'bold ':''}${fs}px ${this.ff}`;c.fillStyle=pal.ink;c.textAlign='left';
    if(q.t==='title'){c.fillText(q.s,x+pad,yy+fs);yy+=lh}
    else if(q.t==='cat'){c.fillStyle=q.c;c.beginPath();c.arc(x+pad+5,yy+fs/2,4.5,0,6.283);c.fill();c.fillStyle=pal.ink;c.fillText(q.s,x+pad+16,yy+fs-1);yy+=lh}
    else if(q.t==='sym'){drawSym(c,q.sy,x+pad+5,yy+fs/2,4.5,pal.ink);c.fillStyle=pal.ink;c.fillText(q.s,x+pad+16,yy+fs-1);yy+=lh}
    else if(q.t==='sz'){const hh=Math.max(lh,q.d+4);drawSym(c,'circle',x+pad+Math.max(5,q.d/2),yy+hh/2,q.d/2,pal.mut);c.fillStyle=pal.ink;c.fillText(q.s,x+pad+Math.max(14,q.d)+8,yy+hh/2+fs*.35);yy+=hh}
    else if(q.t==='bar'){const bw=90;for(let k=0;k<bw;k++){c.fillStyle=cmap(q.c.cm,k/bw);c.fillRect(x+pad+k,yy,1.5,10)}c.strokeStyle=pal.ink;c.lineWidth=.8;c.strokeRect(x+pad,yy,bw,10);c.fillStyle=pal.ink;c.font=`${fs-1}px ${this.ff}`;c.fillText(Mx.fmt(q.c.lo,3),x+pad,yy+10+fs);c.textAlign='right';c.fillText(Mx.fmt(q.c.hi,3),x+pad+bw,yy+10+fs);yy+=lh+12}});c.restore()};
(function(){const od=Chart.prototype.draw;Chart.prototype.draw=function(...a){this.modLeg=[];return od.apply(this,a)}})();
// ---------- tables inside graphs ----------
Chart.prototype.tableData=function(s){const g=this.g,sh=this.getSheet(s.sheetId||g.sheetId);if(!sh)return[['(no data)']];const f=v=>typeof v==='number'?(Number.isNaN(v)?'':Mx.fmt(v,s.dec||4)):v==null?'':String(v);
  if(s.src==='stats'){const rows=[['Series','N','Mean','SD','Min','Max']];g.series.forEach(q=>{if(q.hide)return;const d=this.sdata(q);if(!d.n)return;rows.push([d.name,d.n,f(Mx.mean(d.y)),f(d.n>1?Mx.sd(d.y):NaN),f(Math.min(...d.y)),f(Math.max(...d.y))])});return rows}
  const cs=(s.cols&&s.cols.length?s.cols:sh.cols.map((_,i)=>i).slice(0,4)).filter(i=>sh.cols[i]),r0=Math.max(0,(s.r0||1)-1),r1=Math.min(Math.max(...cs.map(i=>sh.cols[i].d.length)),s.r1||r0+8);const rows=[cs.map(i=>sh.cols[i].name||L(i))];for(let r=r0;r<r1;r++)rows.push(cs.map(i=>f(sh.cols[i].d[r])));return rows};
Chart.prototype.drawTable=function(c,s,pt,i,R){const rows=this.tableData(s),fs=s.fs||Math.max(8,(this.g.fs||12)-1),[x0_,y0_]=pt(s.x0,s.y0),pad=6,rh=fs*1.55;let x=x0_,y=y0_;c.font=`${fs}px ${this.ff}`;const nc=Math.max(...rows.map(r=>r.length)),cw=Array.from({length:nc},(_,j)=>{let m=0;rows.forEach((r,ri)=>{c.font=`${ri===0?'bold ':''}${fs}px ${this.ff}`;m=Math.max(m,c.measureText(String(r[j]??'')).width)});return m+pad*2}),W=Mx.sum(cw),Hh=rows.length*rh;s._w=W;s._h=Hh;if(R){x=Math.max(R.x+2,Math.min(x,R.x+R.w-W-2));y=Math.max(R.y+2,Math.min(y,R.y+R.h-Hh-2))}s._px=x;s._py=y;
  c.save();c.globalAlpha=.94;c.fillStyle='#ffffff';c.fillRect(x,y,W,Hh);c.globalAlpha=1;c.fillStyle='#eef2ff';c.fillRect(x,y,W,rh);c.strokeStyle=s.color||this.p.ink;c.lineWidth=s.lw||1;c.strokeRect(x,y,W,Hh);c.lineWidth=.5;c.strokeStyle=this.p.grid;
  rows.forEach((r,ri)=>{if(ri>0){c.beginPath();c.moveTo(x,y+ri*rh);c.lineTo(x+W,y+ri*rh);c.stroke()}let cx=x;r.forEach((v,j)=>{c.font=`${ri===0?'bold ':''}${fs}px ${this.ff}`;c.fillStyle=this.p.ink;const num=j>0&&/^[-+0-9.e]/i.test(String(v));c.textAlign=num?'right':'left';c.fillText(String(v??''),num?cx+cw[j]-pad:cx+pad,y+ri*rh+rh*.7);cx+=cw[j]})});
  const g=this.g;if(this.live&&((g.selSet||[]).includes(i)||g.selShape===i)){c.strokeStyle='#2563eb';c.lineWidth=1.4;c.setLineDash([4,3]);c.strokeRect(x-3,y-3,W+6,Hh+6);c.setLineDash([])}c.restore()};
(function(){const ods=Chart.prototype.drawShapes;Chart.prototype.drawShapes=function(c,pt,R){ods.call(this,c,pt,R);(this.g.shapes||[]).forEach((s,i)=>{if(s.t==='table'&&!s.hide)this.drawTable(c,s,pt,i,R)});this.modLegendDraw(c,R)}})();
function tableDialog(){const g=P.act&&P.act.t==='graph'?graphById(P.act.id):null;if(!g)return flash('Open a graph first.');const sh=sheetById(g.sheetId);
  dialog({title:'Insert table into graph',sheet:sh,ok:'Insert',hint:'The table stays linked to the data and updates automatically. Drag it to move; select it to resize the text or delete it.',fields:[{t:'sel',k:'src',label:'Content',def:'stats',opts:[['stats','Statistics of each plotted series (N, mean, SD, min, max)'],['cols','Worksheet columns (first rows)']]},{t:'cols',k:'cols',label:'Columns (for “Worksheet columns”)',def:g.series.slice(0,3).map(s=>s.y)},{t:'num',k:'r0',label:'From row',def:1},{t:'num',k:'r1',label:'To row',def:8},{t:'num',k:'fs',label:'Font size',def:Math.max(8,(g.fs||12)-1)}],
    onOk:a=>{snap();const R=chart.R||{x:80,y:40,w:400,h:300};g.shapes=g.shapes||[];const x0=chart.ax.unmap(R.x+R.w*.45),y0=chart.ay.unmap(R.y+R.h*.08);g.shapes.push({t:'table',src:a.src,cols:a.cols,r0:a.r0,r1:a.r1,fs:a.fs,sheetId:g.sheetId,x0,y0,x1:x0,y1:y0,color:'#334155',lw:1});g.selShape=g.shapes.length-1;g.selSet=[g.selShape];dirty();chart.render();renderProps()}})}
// ---------- custom-formula axis scales: formula input under the scale selector ----------
document.getElementById('props')?.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!t.dataset.fx)return;const g=P.act&&P.act.t==='graph'?graphById(P.act.id):null;if(!g)return;g[t.dataset.fx]='f:'+t.value;try{Mx.compile(t.value||'x',['x']);t.style.outline=''}catch(err){t.style.outline='2px solid #dc2626'}dirty();redrawGraph()});
if(typeof RIB!=='undefined')RIB.Plot.push(['Annotate',[['Insert table in graph','▦',tableDialog]]]);
