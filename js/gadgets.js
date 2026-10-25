'use strict';
// Interactive graph tools: region of interest (ROI), brush selection, data cursors and analysis gadgets.
const GS={tab:'region',si:0,model:'poly2',thr:8,open:false,cache:null};
const GTABS=[['region','Region'],['stats','Statistics'],['integ','Integrate'],['fit','Quick fit'],['peaks','Quick peaks'],['deriv','Differentiate'],['fft','FFT'],['interp','Interpolate'],['intersect','Intersect'],['rise','Rise time'],['cursor','Cursor'],['sel','Selection'],['translate','Translate'],['slice','Slicer']];
const toDays=(g,v)=>g.xdate?v/864e5:v;

// ---------- overlays drawn inside the plot area ----------
Chart.prototype.drawOverlays=function(c,pt,R,series,hz){
  const g=this.g,pal=this.p;if(hz||!this.ax)return;const T=this.tmp&&this.tmp.gid===g.id?this.tmp:{};
  (T.fills||[]).forEach(f=>{c.beginPath();f.x.forEach((x,i)=>{const[px,py]=pt(x,f.y[i]);i?c.lineTo(px,py):c.moveTo(px,py)});for(let i=f.x.length-1;i>=0;i--){const[px,py]=pt(f.x[i],f.y0?f.y0[i]:0);c.lineTo(px,py)}c.closePath();c.fillStyle=f.color||'#2563eb';c.globalAlpha=.28;c.fill();c.globalAlpha=1});
  (T.hlines||[]).forEach(h=>{const py=pt(0,h.y)[1];c.strokeStyle=h.color||'#d97706';c.lineWidth=1.3;c.setLineDash(h.dash?[5,4]:[]);c.beginPath();c.moveTo(R.x,py);c.lineTo(R.x+R.w,py);c.stroke();c.setLineDash([]);if(h.label){c.fillStyle=h.color||'#d97706';c.textAlign='left';c.fillText(h.label,R.x+4,py-3)}});
  (T.curves||[]).forEach(cu=>{c.strokeStyle=cu.color||'#dc2626';c.lineWidth=2.2;c.setLineDash(cu.dash?[6,4]:[]);c.beginPath();let f=true;cu.x.forEach((x,i)=>{if(!Number.isFinite(cu.y[i])){f=true;return}const[px,py]=pt(x,cu.y[i]);f?c.moveTo(px,py):c.lineTo(px,py);f=false});c.stroke();c.setLineDash([])});
  (T.marks||[]).forEach(m=>{const[px,py]=pt(m.x,m.y);drawSym(c,m.sym||'triangle',px,py-(m.sym?0:9),5,m.color||'#dc2626');c.fillStyle=pal.ink;c.textAlign='center';c.fillText(m.label||'',px,py-(m.sym?9:20))});
  if(g.roi){const x0=this.ax.map(g.roi.x0),x1=this.ax.map(g.roi.x1),a=Math.min(x0,x1),b=Math.max(x0,x1);c.fillStyle='rgba(37,99,235,.10)';c.fillRect(a,R.y,b-a,R.h);c.strokeStyle='#2563eb';c.lineWidth=1.2;c.setLineDash([5,3]);c.beginPath();c.moveTo(a,R.y);c.lineTo(a,R.y+R.h);c.moveTo(b,R.y);c.lineTo(b,R.y+R.h);c.stroke();c.setLineDash([])}
  if(g.sel&&g.sel.length){const by={};g.sel.forEach(s=>(by[s.y]=by[s.y]||new Set()).add(s.row));series.forEach(q=>{const set=by[q.s.y];if(!set)return;const axis=q.s.axis;set.forEach(row=>{const i=q.d.rows.indexOf(row);if(i<0)return;const[px,py]=pt(q.d.x[i],q.d.y[i],axis);c.strokeStyle='#dc2626';c.fillStyle='rgba(220,38,38,.25)';c.lineWidth=2;c.beginPath();c.arc(px,py,7,0,7);c.fill();c.stroke()})})}
  this.drawShapes&&this.drawShapes(c,pt,R);
  (g.cursors||[]).forEach((cu,i)=>{const px=this.ax.map(cu.x),py=pt(cu.x,cu.y,cu.axis)[1];c.strokeStyle='#16a34a';c.lineWidth=1.3;c.setLineDash([4,3]);c.beginPath();c.moveTo(px,R.y);c.lineTo(px,R.y+R.h);c.moveTo(R.x,py);c.lineTo(R.x+R.w,py);c.stroke();c.setLineDash([]);c.fillStyle='#16a34a';c.beginPath();c.arc(px,py,4,0,7);c.fill();c.textAlign='left';c.fillText('C'+(i+1),px+5,R.y+12)})};
Chart.prototype.roiDone=function(r){if(!this.ax)return;const a=this.ax.unmap(Math.min(r.x0,r.x1)),b=this.ax.unmap(Math.max(r.x0,r.x1));if(Math.abs(r.x1-r.x0)<4)return;this.g.roi={x0:Math.min(a,b),x1:Math.max(a,b)};this.render();GS.cache=null;gadgetRefresh()};
Chart.prototype.brushDone=function(r){const x0=Math.min(r.x0,r.x1),x1=Math.max(r.x0,r.x1),y0=Math.min(r.y0,r.y1),y1=Math.max(r.y0,r.y1),sel=[];
  this.hits.forEach(h=>{if(h.si!==undefined&&h.px>=x0&&h.px<=x1&&h.py>=y0&&h.py<=y1)sel.push({y:this.lastSeries[h.si].s.y,row:h.row})});this.g.sel=sel;this.render();GS.tab='sel';gadgetRefresh(true)};
Chart.prototype.cursorClick=function(x,y){let best=null,bd=1600;this.hits.forEach(h=>{if(h.si===undefined)return;const d=(h.px-x)**2+(h.py-y)**2;if(d<bd){bd=d;best=h}});if(!best)return;
  const q=this.lastSeries[best.si],i=q.d.rows.indexOf(best.row),g=this.g;g.cursors=g.cursors||[];if(g.cursors.length>=2)g.cursors=[];g.cursors.push({x:q.d.x[i],y:q.d.y[i],axis:q.s.axis,si:best.si});this.render();GS.tab='cursor';gadgetRefresh(true)};

// ---------- data access for gadgets ----------
function gSeries(g){return g.series.filter(s=>!s.hide)}
function gCtx(){const g=curGraph();if(!g||g.type==='multi')return null;const sh=sheetById(g.sheetId),ss=gSeries(g);if(!sh||!ss.length)return null;const s=ss[Math.min(GS.si,ss.length-1)];
  let clone={...sh,cols:sh.cols.slice(),mask:(sh.mask||[]).slice()},xi=s.x;const n=NR(sh);
  if(xi==null||xi<0){clone.cols.push({name:'Index',unit:'',comment:'',des:'X',d:Array.from({length:n},(_,i)=>i+1)});xi=clone.cols.length-1}
  const xc=clone.cols[xi];if(g.roi){const lo=g.roi.x0,hi=g.roi.x1;for(let i=0;i<n;i++){const x=xc.d[i];if(!(x>=lo&&x<=hi))clone.mask[i]=true}}
  return{g,sh,s,xi,yi:s.y,clone,ctx:ctxFor(clone),n}}
function gArgs(def,base){const a={};def.fields.forEach(f=>{if(f.def!==undefined)a[f.k]=f.def});return{...a,...base}}
function gRun(id,base){const c=gCtx();if(!c)return null;const def=A.defs[id],args=gArgs(def,{x:c.xi,y:c.yi,...base});try{return{res:def.run(args,c.ctx),args,c}}catch(e){return{res:{html:`<p class="err">${esc(e.message)}</p>`},args,c}}}
function gPoints(c){const s=c.s,d=chart.sdata(s),lo=c.g.roi?c.g.roi.x0:-Infinity,hi=c.g.roi?c.g.roi.x1:Infinity,x=[],y=[],rows=[];d.x.forEach((v,i)=>{if(v>=lo&&v<=hi){x.push(v);y.push(d.y[i]);rows.push(d.rows[i])}});const idx=x.map((_,i)=>i).sort((a,b)=>x[a]-x[b]);return{x:idx.map(i=>x[i]),y:idx.map(i=>y[i]),rows:idx.map(i=>rows[i])}}
function miniPlot(el,x,y,xl,yl){const cv=el,W=cv.width=cv.clientWidth*2,H=cv.height=cv.clientHeight*2,c=cv.getContext('2d');c.scale(2,2);const w=W/2,h=H/2,m={l:36,r:6,t:6,b:16};c.fillStyle=getComputedStyle(document.body).getPropertyValue('--panel2')||'#fff';c.fillRect(0,0,w,h);
  const px=x.filter((_,i)=>Number.isFinite(y[i])),py=y.filter(Number.isFinite);if(px.length<2){c.fillStyle='#888';c.fillText('no data',10,20);return}
  const x0=Math.min(...px),x1=Math.max(...px),y0=Math.min(...py),y1=Math.max(...py),sx=v=>m.l+(v-x0)/((x1-x0)||1)*(w-m.l-m.r),sy=v=>h-m.b-(v-y0)/((y1-y0)||1)*(h-m.t-m.b);
  c.strokeStyle='#888';c.lineWidth=1;c.strokeRect(m.l,m.t,w-m.l-m.r,h-m.t-m.b);c.fillStyle='#888';c.font='10px system-ui';c.textAlign='right';c.fillText(Mx.fmt(y1,3),m.l-3,m.t+8);c.fillText(Mx.fmt(y0,3),m.l-3,h-m.b);c.textAlign='left';c.fillText(Mx.fmt(x0,3),m.l,h-3);c.textAlign='right';c.fillText(Mx.fmt(x1,3),w-m.r,h-3);
  c.strokeStyle='#2563eb';c.lineWidth=1.5;c.beginPath();let f=true;x.forEach((v,i)=>{if(!Number.isFinite(y[i])){f=true;return}f?c.moveTo(sx(v),sy(y[i])):c.lineTo(sx(v),sy(y[i]));f=false});c.stroke()}

// ---------- panel ----------
function gadgetInit(){
  const wrap=$('#gwrap');if($('#gpanel'))return;const p=document.createElement('div');p.id='gpanel';p.hidden=true;wrap.append(p);
  p.addEventListener('click',e=>{const t=e.target;
    if(t.dataset.gtab){GS.tab=t.dataset.gtab;GS.cache=null;gadgetRefresh();return}
    if(t.dataset.gact)gadgetAction(t.dataset.gact,t)});
  p.addEventListener('change',e=>{const t=e.target;if(t.id==='gSer'){GS.si=+t.value;GS.cache=null;gadgetRefresh()}else if(t.id==='gModel'){GS.model=t.value;GS.cache=null;gadgetRefresh()}else if(t.id==='gThr'){GS.thr=+t.value;gadgetRefresh()}
    else if(t.dataset.roi){const g=curGraph();g.roi=g.roi||{x0:0,x1:0};g.roi[t.dataset.roi]=parseFloat(t.value);chart.render();gadgetRefresh()}});
}
function gadgetToggle(on){GS.open=on??!GS.open;const p=$('#gpanel');if(!p)return;p.hidden=!GS.open;$('#gGad')?.classList.toggle('on',GS.open);if(GS.open)gadgetRefresh()}
function gadgetRefresh(show){const p=$('#gpanel');if(!p)return;if(show&&!GS.open){GS.open=true;p.hidden=false;$('#gGad')?.classList.add('on')}if(!GS.open)return;
  const g=curGraph();if(!g||g.type==='multi'||!['line','scatter','linesym','area','column','bar','stack','bubble'].includes(g.type)){p.innerHTML='<div class="gh"><b>Gadgets</b></div><div class="gb note">Open a 2D line / scatter graph to use the gadgets.</div>';return}
  const ss=gSeries(g);if(GS.si>=ss.length)GS.si=0;
  p.innerHTML=`<div class="gh"><b>Gadgets</b><select id="gSer">${ss.map((s,i)=>`<option value="${i}" ${i===GS.si?'selected':''}>${esc((sheetById(g.sheetId).cols[s.y]||{}).name||'Y')}</option>`).join('')}</select><span class="sp"></span><button data-gact="close">✕</button></div>
  <div class="gt">${GTABS.map(([k,l])=>`<button data-gtab="${k}" class="${k===GS.tab?'on':''}">${l}</button>`).join('')}</div><div class="gb" id="gBody"></div>`;
  gadgetBody(g)}
function gHTML(h){$('#gBody').innerHTML=h}
function gRoiNote(g){return g.roi?`<div class="note">Region: ${Mx.fmt(toDays(g,g.roi.x0),6)} … ${Mx.fmt(toDays(g,g.roi.x1),6)} ${g.xdate?'(days)':''}</div>`:'<div class="note">No region set – whole curve is used. Use the <b>ROI</b> tool and drag across the graph.</div>'}
const sendBtn=(id)=>`<button class="p" data-gact="send" data-id="${id}">Send to Results</button>`;
function gadgetBody(g){
  chart.tmp={gid:g.id};const T=chart.tmp,c=gCtx(),tab=GS.tab;if(!c){gHTML('<span class="note">No data.</span>');return}
  switch(tab){
    case'region':{const r=g.roi;gHTML(`<div class="r2"><label>From X</label><input type="number" step="any" data-roi="x0" value="${r?r.x0:''}"><label>To X</label><input type="number" step="any" data-roi="x1" value="${r?r.x1:''}"></div><div class="row"><button data-gact="roiOn">Draw region…</button><button data-gact="roiClr">Clear region</button><button data-gact="roiMask">Mask outside region</button></div>${gRoiNote(g)}<div class="note">Every gadget and every analysis dialog (“Limit X range”) can use this region. Drag a rectangle with the ROI tool; reset by clearing.</div>`);break}
    case'stats':{const r=gRun('descr',{cols:[c.yi]});T.hlines=[];const v=Mx.clean(c.ctx.vals(c.yi));if(v.length>1){const m=Mx.mean(v),sd=Mx.sd(v);T.hlines=[{y:m,label:'mean',color:'#d97706'},{y:m+sd,dash:1,color:'#d97706'},{y:m-sd,dash:1,color:'#d97706'}]}chart.render();gHTML(gRoiNote(g)+r.res.html+sendBtn('descr'));break}
    case'integ':{const r=gRun('integ',{});const p=gPoints(c);T.fills=[{x:p.x,y:p.y,color:'#16a34a'}];chart.render();gHTML(gRoiNote(g)+r.res.html+sendBtn('integ'));break}
    case'fit':{const models=[['poly1','Linear'],['poly2','Polynomial 2'],['poly3','Polynomial 3'],...['exp','expdec1','expgrow','power','log','gauss','lorentz','boltz','logistic4','hill','mm','sine'].map(k=>[k,MODELS[k].label.split('  ')[0]])];let r;
      if(GS.model.startsWith('poly')){const o=+GS.model.slice(4);r=o===1?gRun('linreg',{band:false,pband:false,resid:false}):gRun('polyreg',{order:o,resid:false})}else r=gRun('nlfit',{model:GS.model,expr:'',init:'',fix:'',bounds:'',resid:false});
      if(r.res.curves)T.curves=r.res.curves.filter(cu=>!cu.dash).map(cu=>({x:g.xdate?cu.x.map(v=>v*864e5):cu.x,y:cu.y,color:'#dc2626'}));chart.render();
      gHTML(`<div class="row"><label>Function</label><select id="gModel">${models.map(([k,l])=>`<option value="${k}" ${k===GS.model?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`+gRoiNote(g)+r.res.html+sendBtn(GS.model==='poly1'?'linreg':GS.model.startsWith('poly')?'polyreg':'nlfit'));break}
    case'peaks':{const r=gRun('peakfind',{thr:GS.thr,smooth:0,dist:0});if(r.res.marks)T.marks=r.res.marks.map(m=>({...m,x:g.xdate?m.x*864e5:m.x}));chart.render();gHTML(`<div class="row"><label>Min prominence %</label><input id="gThr" type="number" value="${GS.thr}" min="0.5" step="1" style="width:70px"></div>`+gRoiNote(g)+r.res.html+sendBtn('peakfind'));break}
    case'deriv':{const r=gRun('deriv',{ord:'1',w:0});gHTML(gRoiNote(g)+'<canvas id="gMini" class="mini"></canvas><div class="note">First derivative of the selected range.</div>'+sendBtn('deriv'));const col=r.res.cols&&r.res.cols[0],x=[],y=[];if(col){const xc=c.clone.cols[c.xi].d;col.d.forEach((v,i)=>{if(Number.isFinite(v)){x.push(xc[i]);y.push(v)}})}miniPlot($('#gMini'),x,y);break}
    case'fft':{const r=gRun('fft',{win:'hann',detrend:true});gHTML(gRoiNote(g)+'<canvas id="gMini" class="mini"></canvas>'+r.res.html+sendBtn('fft'));if(r.res.cols)miniPlot($('#gMini'),r.res.cols[0].d,r.res.cols[1].d);break}
    case'interp':{const r=gRun('interp',{m:'spline',n:300});if(r.res.cols)T.curves=[{x:r.res.cols[0].d,y:r.res.cols[1].d,color:'#7c3aed'}];if(g.xdate&&T.curves)T.curves[0].x=T.curves[0].x.map(v=>v*864e5);chart.render();gHTML(gRoiNote(g)+r.res.html+sendBtn('interp'));break}
    case'intersect':{const ss=gSeries(g);if(ss.length<2){gHTML('<span class="note">Needs a graph with two or more curves.</span>');break}const a=chart.sdata(ss[0]),b=chart.sdata(ss[1]),lo=g.roi?g.roi.x0:-Infinity,hi=g.roi?g.roi.x1:Infinity;
      const sa=a.x.map((x,i)=>[x,a.y[i]]).sort((p,q)=>p[0]-q[0]),sb=b.x.map((x,i)=>[x,b.y[i]]).sort((p,q)=>p[0]-q[0]);const fb=Mx.linterp(sb.map(p=>p[0]),sb.map(p=>p[1])),pts=[];
      for(let i=1;i<sa.length;i++){const[x0,y0]=sa[i-1],[x1,y1]=sa[i];if(x1<sb[0][0]||x0>sb[sb.length-1][0])continue;const d0=y0-fb(x0),d1=y1-fb(x1);if(d0===0||d0*d1<0){const t=d0===d1?0:d0/(d0-d1),x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;if(x>=lo&&x<=hi)pts.push([x,y])}}
      T.marks=pts.map((p,i)=>({x:p[0],y:p[1],label:String(i+1),sym:'circle'}));chart.render();gHTML(`<div class="note">Curves: ${esc(a.name)} × ${esc(b.name)}</div>`+gRoiNote(g)+(pts.length?T_html(['#','X','Y'],pts.map((p,i)=>[i+1,g.xdate?formatDate(p[0]):Mx.fmt(p[0],6),Mx.fmt(p[1],6)])):'<p class="note">No intersections found.</p>'));break}
    case'rise':{const p=gPoints(c);if(p.x.length<6){gHTML('<span class="note">Need at least 6 points.</span>');break}const k=Math.max(2,Math.floor(p.x.length*.1)),lo=Mx.mean(p.y.slice(0,k)),hi=Mx.mean(p.y.slice(-k)),amp=hi-lo;if(!amp){gHTML('<span class="note">Flat signal.</span>');break}
      const cross=(lv)=>{for(let i=1;i<p.x.length;i++){const a=(p.y[i-1]-lv)*(amp>0?1:-1),b=(p.y[i]-lv)*(amp>0?1:-1);if(a<0&&b>=0)return p.x[i-1]+(p.x[i]-p.x[i-1])*(lv-p.y[i-1])/(p.y[i]-p.y[i-1])}return NaN};
      const l10=lo+.1*amp,l50=lo+.5*amp,l90=lo+.9*amp,t10=cross(l10),t50=cross(l50),t90=cross(l90);T.marks=[[t10,l10,'10%'],[t50,l50,'50%'],[t90,l90,'90%']].filter(m=>Number.isFinite(m[0])).map(m=>({x:m[0],y:m[1],label:m[2],sym:'circle'}));T.hlines=[{y:lo,label:'base',dash:1,color:'#888'},{y:hi,label:'top',dash:1,color:'#888'}];chart.render();
      gHTML(gRoiNote(g)+T_html(['Quantity','Value'],[['Base level',Mx.fmt(lo)],['Top level',Mx.fmt(hi)],['Amplitude',Mx.fmt(amp)],['t10%',Mx.fmt(t10)],['t50%',Mx.fmt(t50)],['t90%',Mx.fmt(t90)],['Rise time (10–90 %)',Mx.fmt(t90-t10)]]));break}
    case'cursor':{const cs=g.cursors||[];let h='<div class="note">Use the <b>Cursor</b> tool: click near a data point (twice for two cursors).</div>';
      if(cs.length)h+=T_html(['Cursor','X','Y'],cs.map((q,i)=>['C'+(i+1),g.xdate?formatDate(q.x):Mx.fmt(q.x,7),Mx.fmt(q.y,7)]));
      if(cs.length===2){const dx=cs[1].x-cs[0].x,dy=cs[1].y-cs[0].y;h+=T_html(['Δ','Value'],[['ΔX',g.xdate?Mx.fmt(dx/864e5,6)+' days':Mx.fmt(dx,7)],['ΔY',Mx.fmt(dy,7)],['Slope ΔY/ΔX',Mx.fmt(dy/dx,6)],['Distance',Mx.fmt(Math.hypot(dx,dy),6)]])}
      h+='<div class="row"><button data-gact="curClr">Clear cursors</button></div>';gHTML(h);break}
    case'sel':{const sel=g.sel||[];let h=`<div class="note">Use the <b>Brush</b> tool and drag a rectangle over points.</div><p><b>${sel.length}</b> point(s) selected.</p>`;
      if(sel.length){const sh=c.sh,ys=sel.map(s=>sh.cols[s.y].d[s.row]).filter(Number.isFinite);if(ys.length)h+=T_html(['Y of selection','Value'],[['Mean',Mx.fmt(Mx.mean(ys))],['SD',Mx.fmt(Mx.sd(ys))],['Min',Mx.fmt(Math.min(...ys))],['Max',Mx.fmt(Math.max(...ys))]])}
      h+='<div class="row"><button data-gact="selMask">Mask</button><button data-gact="selSubset">New sheet from rows</button><button data-gact="selDel">Delete Y values</button><button data-gact="selCopy">Copy</button><button data-gact="selClr">Clear</button></div>';gHTML(h);break}
    case'slice':{const sh=c.sh,sl=g.slice||{col:Math.max(0,sh.cols.findIndex(q=>q.des==='X')),levels:null},col=sl.col??0,vals=[...new Set(sh.cols[col].d.map(v=>String(v)))].filter(v=>v!=='NaN').slice(0,60),sel=sl.levels||vals;
      gHTML(`<div class="row"><label>Slice by column</label><select id="gSliceCol">${sh.cols.map((q,i)=>`<option value="${i}" ${i===col?'selected':''}>${esc(L(i)+': '+(q.name||''))}</option>`).join('')}</select></div><div class="note">Click values to include / exclude them from the plot (non-destructive).</div><div>${vals.map(v=>`<span class="tag chipv ${sel.includes(v)?'on':''}" data-gact="sliceTog" data-v="${esc(v)}">${esc(v.length>14?v.slice(0,13)+'…':v)}</span>`).join('')}</div><div class="row"><button data-gact="sliceAll">All</button><button data-gact="sliceClr">Clear slicer</button></div>`);
      $('#gSliceCol').onchange=e=>{g.slice={col:+e.target.value,levels:null};chart.render();gadgetRefresh()};break}
    case'translate':gHTML(`<div class="r2"><label>ΔX</label><input id="gDx" type="number" step="any" value="0"><label>ΔY</label><input id="gDy" type="number" step="any" value="0"></div><div class="row"><button class="p" data-gact="translate">Apply to data</button></div><div class="note">Adds the offsets to the curve's X and Y columns (undoable).</div>`);break}
}
function T_html(head,rows){return`<table class="rt"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
function gadgetAction(a,el){const g=curGraph();if(!g)return;const c=gCtx();
  switch(a){
    case'close':gadgetToggle(false);break;
    case'roiOn':setGraphMode('roi');break;
    case'roiClr':g.roi=null;chart.render();gadgetRefresh();break;
    case'roiMask':{if(!g.roi)return flash('Draw a region first');snap();const sh=c.sh,n=NR(sh),xc=c.clone.cols[c.xi].d;sh.mask=sh.mask||[];for(let i=0;i<n;i++)if(!(xc[i]>=g.roi.x0&&xc[i]<=g.roi.x1))sh.mask[i]=true;dirty();redrawGraph();flash('Rows outside the region are masked (Column ▸ Clear mask to undo)');break}
    case'send':{const id=el.dataset.id,r=gRun(id,{});if(!r)return;const args={...r.args};if(g.roi){args._xlo=toDays(g,g.roi.x0);args._xhi=toDays(g,g.roi.x1)}
      // map synthetic index column back: only real columns can be sent
      if(c.s.x==null||c.s.x<0){flash('Set an X column for this series to send results to the worksheet');return}runAnalysis(id,args,c.sh);break}
    case'sliceTog':{const sh=c.sh,sl=g.slice||{col:Math.max(0,sh.cols.findIndex(q=>q.des==='X')),levels:null},vals=[...new Set(sh.cols[sl.col].d.map(v=>String(v)))].filter(v=>v!=='NaN');let lv=sl.levels||vals.slice(),v=el.dataset.v;lv=lv.includes(v)?lv.filter(x=>x!==v):[...lv,v];g.slice={col:sl.col,levels:lv};chart.render();gadgetRefresh();break}
    case'sliceAll':case'sliceClr':g.slice=null;chart.render();gadgetRefresh();break;
    case'curClr':g.cursors=[];chart.render();gadgetRefresh();break;
    case'selClr':g.sel=[];chart.render();gadgetRefresh();break;
    case'selMask':{snap();const sh=c.sh;sh.mask=sh.mask||[];(g.sel||[]).forEach(s=>sh.mask[s.row]=true);g.sel=[];dirty();redrawGraph();gadgetRefresh();dataChanged(sh.id);break}
    case'selDel':{if(!confirm('Clear the Y value of each selected point?'))return;snap();const sh=c.sh;(g.sel||[]).forEach(s=>{sh.cols[s.y].d[s.row]=NaN});g.sel=[];dirty();redrawGraph();gadgetRefresh();dataChanged(sh.id);break}
    case'selSubset':{const rows=[...new Set((g.sel||[]).map(s=>s.row))].sort((x,y)=>x-y);if(!rows.length)return;snap();const sh=c.sh,ns=mkSheet(sh.name+'_subset',sh.cols.map(col=>({name:col.name,unit:col.unit,comment:col.comment,des:col.des,fmt:col.fmt,d:rows.map(r=>col.d[r]??NaN)})));openWin('sheet',ns.id);break}
    case'selCopy':{const sh=c.sh,rows=[...new Set((g.sel||[]).map(s=>s.row))].sort((x,y)=>x-y);navigator.clipboard.writeText(rows.map(r=>sh.cols.map(col=>col.d[r]??'').join('\t')).join('\n')).then(()=>flash('Copied '+rows.length+' rows')).catch(()=>alert('Clipboard not available'));break}
    case'translate':{const dx=parseFloat($('#gDx').value)||0,dy=parseFloat($('#gDy').value)||0;snap();const s=c.s,sh=c.sh;
      if(dy)sh.cols[s.y].d=sh.cols[s.y].d.map(v=>typeof v==='number'?v+dy:v);if(dx&&s.x!=null&&s.x>=0)sh.cols[s.x].d=sh.cols[s.x].d.map(v=>typeof v==='number'?v+(g.xdate?dx*864e5:dx):v);dirty();redrawGraph();dataChanged(sh.id);flash('Curve translated');break}
  }}
function setGraphMode(m){$$('#gtools [data-mode]').forEach(x=>x.classList.toggle('on',x.dataset.mode===m));chart.mode=m;gmode=m;$('#cv').style.cursor=m==='pan'?'grab':'crosshair'}
