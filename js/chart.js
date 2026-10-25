'use strict';
// Chart engine: 2D cartesian (line/scatter/column/bar/stack/area/histogram/box), pie, polar, heatmap/contour, 3D scatter/surface.
const PALETTE=['#2563eb','#dc2626','#16a34a','#d97706','#7c3aed','#0891b2','#db2777','#4b5563','#65a30d','#9333ea'];
const SYMBOLS=['circle','square','triangle','diamond','cross','plus','star','none'];
const CMAPS={viridis:['#440154','#3b528b','#21908d','#5dc863','#fde725'],plasma:['#0d0887','#7e03a8','#cc4778','#f89540','#f0f921'],
  jet:['#00007f','#0000ff','#00ffff','#ffff00','#ff0000','#7f0000'],coolwarm:['#3b4cc0','#9ebeff','#f2f2f2','#f4a582','#b40426'],
  hot:['#000000','#e60000','#ffd200','#ffffff'],gray:['#000000','#ffffff'],rainbow:['#6e40aa','#3f8dd8','#1ac7c2','#7be04e','#d9ce34','#ff7847','#af2a2a']};
const _rgb={};const hex=h=>_rgb[h]||(_rgb[h]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)));
function cmap(name,t){const st=CMAPS[name]||CMAPS.viridis;t=Math.max(0,Math.min(1,t));const p=t*(st.length-1),i=Math.min(st.length-2,Math.floor(p)),f=p-i,a=hex(st[i]),b=hex(st[i+1]);
  return`rgb(${Math.round(a[0]+(b[0]-a[0])*f)},${Math.round(a[1]+(b[1]-a[1])*f)},${Math.round(a[2]+(b[2]-a[2])*f)})`}
const TF={linear:{f:v=>v,i:v=>v},log10:{f:Math.log10,i:v=>Math.pow(10,v)},ln:{f:Math.log,i:Math.exp},recip:{f:v=>1/v,i:v=>1/v},sqrt:{f:v=>Math.sqrt(Math.max(v,0)),i:t=>t*t},symlog:{f:v=>Math.sign(v)*Math.log10(1+Math.abs(v)),i:t=>Math.sign(t)*(Math.pow(10,Math.abs(t))-1)},logit:{f:v=>Math.log(Math.min(1-1e-9,Math.max(1e-9,v))/(1-Math.min(1-1e-9,Math.max(1e-9,v)))),i:t=>1/(1+Math.exp(-t))},probit:{f:v=>Mx.norminv(Math.min(1-1e-9,Math.max(1e-9,v))),i:t=>Mx.normcdf(t)}};
const LIGHT={bg:'#ffffff',ink:'#1c2230',mut:'#667085',grid:'#e5e8ee',minor:'#f0f2f6'};
const DARK={bg:'#171c25',ink:'#e6e9ef',mut:'#8b94a5',grid:'#2a313e',minor:'#212733'};

function niceTicks(lo,hi,n=6){if(!(hi>lo))hi=lo+1;const raw=(hi-lo)/n,p=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/p,st=(f<1.5?1:f<3?2:f<7?5:10)*p;
  const a=Math.floor(lo/st+1e-9)*st,b=Math.ceil(hi/st-1e-9)*st,t=[];for(let v=a;v<=b+st*.5;v+=st)t.push(+v.toPrecision(12));return{t,a:+a.toPrecision(12),b:+b.toPrecision(12),st}}
function autoRange(lo,hi,scale,zero,pad=true){
  if(!Number.isFinite(lo)||!Number.isFinite(hi)){lo=0;hi=1}
  if(zero){lo=Math.min(lo,0);hi=Math.max(hi,0)}
  if(scale==='log10'||scale==='ln'){lo=Math.max(lo,1e-300);hi=Math.max(hi,lo*10);return[Math.pow(10,Math.floor(Math.log10(lo))),Math.pow(10,Math.ceil(Math.log10(hi)))]}
  if(lo===hi){const d=Math.abs(lo)*.1||1;lo-=d;hi+=d}
  const p=pad?(hi-lo)*.03:0,t=niceTicks(zero&&lo===0?0:lo-(zero&&lo===0?0:p),zero&&hi===0?0:hi+(zero&&hi===0?0:p),10);return[t.a,t.b]}
function fmtTick(v,st){if(v===0)return'0';const a=Math.abs(v);if(a>=1e6||a<1e-3){return v.toExponential(a>=1e6&&st&&a/st<1e3?1:2).replace(/\.?0+e/,'e').replace('e+','e')}
  const d=st?Math.max(0,Math.min(8,-Math.floor(Math.log10(st)+1e-9))):6;return String(+v.toFixed(d))}
function dateTicks(lo,hi,len){
  const S=1e3,Mi=6e4,Hh=36e5,D=864e5,target=Math.max(3,Math.round(len/110)),span=hi-lo,ticks=[];
  const steps=[S,2*S,5*S,10*S,15*S,30*S,Mi,2*Mi,5*Mi,10*Mi,15*Mi,30*Mi,Hh,2*Hh,3*Hh,6*Hh,12*Hh,D,2*D,7*D,14*D],step=steps.find(s=>span/s<=target*1.3),p2=n=>String(n).padStart(2,'0');
  if(step){for(let t=Math.ceil(lo/step)*step;t<=hi;t+=step){const d=new Date(t);let label;
      if(step<D)label=t%D===0?`${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())}`:`${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}${step<Mi?':'+p2(d.getUTCSeconds()):''}`;
      else label=span>400*D?formatDate(t):`${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())}`;
      ticks.push({v:t,label})}return ticks}
  const ms=[1,2,3,6,12,24,60,120,240,600].find(m=>span/(m*30.44*D)<=target*1.3)||600,d0=new Date(lo);let y=d0.getUTCFullYear(),mo=d0.getUTCMonth();
  if(ms<12)mo=Math.floor(mo/ms)*ms;else{const ys=ms/12;y=Math.floor(y/ys)*ys;mo=0}
  for(let k=0;k<400;k++){const t=Date.UTC(y,mo,1);if(t>hi)break;if(t>=lo)ticks.push({v:t,label:ms>=12?String(new Date(t).getUTCFullYear()):`${new Date(t).getUTCFullYear()}-${p2(new Date(t).getUTCMonth()+1)}`});mo+=ms;if(ms>=12){y+=Math.floor(mo/12);mo=mo%12}else if(mo>=12){y+=Math.floor(mo/12);mo=mo%12}}
  return ticks}
const FXC={};
function fxTF(expr,lo,hi){try{const fn=FXC[expr]||(FXC[expr]=Mx.compile((expr||'x').replace(/\blog10\(/g,'log('),['x'])),f=v=>{const r=fn(v);return Number.isFinite(r)?r:NaN},span=Math.abs(hi-lo)||1,dlo=Math.min(lo,hi)-span*3,dhi=Math.max(lo,hi)+span*3,inc=!(f(Math.max(lo,hi))<f(Math.min(lo,hi)));const i=t=>{let a=dlo,b=dhi;for(let k=0;k<80;k++){const m=(a+b)/2,fm=f(m);const below=Number.isFinite(fm)?(inc?fm<t:fm>t):true;below?a=m:b=m}return(a+b)/2};return{f,i}}catch(e){return TF.linear}}
function mkAxis(lo,hi,scale,p0,p1,cats,date,brk){
  let tf=TF[scale]||(typeof scale==='string'&&scale.startsWith('f:')?fxTF(scale.slice(2),lo,hi):TF.linear);
  if(brk&&scale==='linear'&&!date&&!cats&&brk[1]>brk[0]&&brk[0]>lo&&brk[1]<hi){const b0=brk[0],b1=brk[1],w=b1-b0,gap=(hi-lo-w)*.03;tf={f:v=>v<=b0?v:v>=b1?v-w+gap:b0+(v-b0)/w*gap,i:t=>t<=b0?t:t>=b0+gap?t+w-gap:b0+(t-b0)/gap*w,brk:[b0,b1]}}if((scale==='log10'||scale==='ln')&&lo<=0)lo=Math.min(hi/1e3,1e-6)||1e-6;
  if(typeof scale==='string'&&scale.startsWith('f:')&&tf!==TF.linear){if(!Number.isFinite(tf.f(lo)))for(let k=1;k<=400;k++){const c=lo+(hi-lo)*k/400;if(Number.isFinite(tf.f(c))){lo=c;break}}if(!Number.isFinite(tf.f(hi)))for(let k=1;k<=400;k++){const c=hi-(hi-lo)*k/400;if(Number.isFinite(tf.f(c))){hi=c;break}}}
  let a=tf.f(lo),b=tf.f(hi);if(!Number.isFinite(a)||!Number.isFinite(b)){tf=TF.linear;a=lo;b=hi}if(a===b){a-=.5;b+=.5}
  const ax={lo,hi,scale,tf,a,b,p0,p1,ticks:[],map:v=>p0+(tf.f(v)-a)/(b-a)*(p1-p0),unmap:px=>tf.i(a+(px-p0)/(p1-p0)*(b-a)),tmap:px=>a+(px-p0)/(p1-p0)*(b-a)};
  const lim=Math.min(lo,hi),lim2=Math.max(lo,hi);
  if(date){ax.ticks=dateTicks(lim,lim2,Math.abs(p1-p0));return ax}
  if(cats){cats.forEach((c,i)=>{if(i+1>=lim-.01&&i+1<=lim2+.01)ax.ticks.push({v:i+1,label:c})});return ax}
  if((scale==='log10'||scale==='ln')||(typeof scale==='string'&&scale.startsWith('f:')&&lim>0&&lim2/lim>60)){const e0=Math.floor(Math.log10(lim)),e1=Math.ceil(Math.log10(lim2));
    for(let e=e0;e<=e1;e++){for(let m=1;m<10;m++){const v=m*Math.pow(10,e);if(v<lim*(1-1e-9)||v>lim2*(1+1e-9))continue;ax.ticks.push({v,label:m===1?fmtTick(v):'',minor:m!==1})}}return ax}
  if(typeof scale==='string'&&scale.startsWith('f:')&&tf!==TF.linear){const cand=new Set();niceTicks(lim,lim2,Math.max(3,Math.round(Math.abs(p1-p0)/70))).t.forEach(v=>cand.add(+v.toPrecision(10)));if(lim>=0)cand.add(0);const e0=Math.floor(Math.log10(Math.max(1e-12,Math.abs(lim)||1)))-1,e1=Math.ceil(Math.log10(Math.max(Math.abs(lim),Math.abs(lim2),1e-12)))+1;for(let e=e0;e<=e1;e++)[1,2,5].forEach(m=>{[m*Math.pow(10,e),-m*Math.pow(10,e)].forEach(v=>cand.add(+v.toPrecision(10)))});
    const list=[...cand].filter(v=>v>=lim&&v<=lim2&&Number.isFinite(tf.f(v))).sort((x,y)=>tf.f(x)-tf.f(y));let last=-1e9;const out=[];list.forEach(v=>{const px=p0+(tf.f(v)-a)/(b-a)*(p1-p0);if(Math.abs(px-last)>=48){out.push({v,label:fmtTick(v)});last=px}});ax.ticks=out;return ax}
  if(scale==='symlog'){const m=Math.ceil(Math.log10(Math.max(Math.abs(lim),Math.abs(lim2),1)+1));const vs=[0];for(let e=0;e<=m;e++){vs.push(Math.pow(10,e),-Math.pow(10,e))}vs.sort((p,q)=>p-q).forEach(v=>{if(v>=lim&&v<=lim2)ax.ticks.push({v,label:fmtTick(v)})});return ax}
  if(scale==='logit'||scale==='probit'){[.0001,.001,.01,.05,.1,.25,.5,.75,.9,.95,.99,.999,.9999].forEach(v=>{if(v>=lim&&v<=lim2)ax.ticks.push({v,label:String(v)})});return ax}
  if(scale==='recip'){const t=niceTicks(Math.min(a,b),Math.max(a,b));t.t.forEach(q=>{if(q!==0&&q>=Math.min(a,b)&&q<=Math.max(a,b))ax.ticks.push({v:1/q,label:fmtTick(1/q)})});return ax}
  const t=niceTicks(lim,lim2,Math.max(3,Math.round(Math.abs(p1-p0)/70))),inBrk=v=>tf.brk&&v>tf.brk[0]&&v<tf.brk[1];t.t.forEach(v=>{if(v>=lim-(lim2-lim)*1e-9&&v<=lim2+(lim2-lim)*1e-9&&!inBrk(v))ax.ticks.push({v,label:fmtTick(v,t.st)})});
  for(let v=t.a-t.st/2;v<=t.b;v+=t.st/2){const vv=+v.toPrecision(12);if(vv>=lim&&vv<=lim2&&!inBrk(vv)&&!ax.ticks.some(q=>Math.abs(q.v-vv)<t.st*1e-6))ax.ticks.push({v:vv,label:'',minor:true})}
  return ax}
function drawSym(c,s,x,y,r,col,filled=true){if(s==='none')return;c.beginPath();c.fillStyle=col;c.strokeStyle=col;c.lineWidth=1.4;
  switch(s){case'square':c.rect(x-r,y-r,2*r,2*r);break;case'triangle':c.moveTo(x,y-r*1.2);c.lineTo(x+r*1.1,y+r*.8);c.lineTo(x-r*1.1,y+r*.8);c.closePath();break;
    case'diamond':c.moveTo(x,y-r*1.3);c.lineTo(x+r*1.1,y);c.lineTo(x,y+r*1.3);c.lineTo(x-r*1.1,y);c.closePath();break;
    case'cross':c.moveTo(x-r,y-r);c.lineTo(x+r,y+r);c.moveTo(x+r,y-r);c.lineTo(x-r,y+r);c.stroke();return;
    case'plus':c.moveTo(x-r*1.2,y);c.lineTo(x+r*1.2,y);c.moveTo(x,y-r*1.2);c.lineTo(x,y+r*1.2);c.stroke();return;
    case'star':for(let i=0;i<10;i++){const rr=i%2?r*.5:r*1.3,a=-Math.PI/2+i*Math.PI/5;i?c.lineTo(x+rr*Math.cos(a),y+rr*Math.sin(a)):c.moveTo(x+rr*Math.cos(a),y+rr*Math.sin(a))}c.closePath();break;
    default:c.arc(x,y,r,0,7)}
  filled?c.fill():c.stroke()}
const DASH={'':[],dash:[8,5],dot:[2,4],dashdot:[9,4,2,4]};

class Chart{
  constructor(canvas,tip,interactive=true){this.cv=canvas;this.tip=tip;this.g=null;this.getSheet=null;this.mode='pan';this.theme='light';this.hits=[];this.view=null;this.onView=null;this.onNote=null;this.rb=null;this.getGraph=null;if(interactive)this.bind()}
  setTheme(t){this.theme=t}
  set(g,getSheet){this.g=g;this.getSheet=getSheet;this.render()}
  render(){
    const cv=this.cv,dpr=window.devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;if(!W||!H)return;
    cv.width=W*dpr;cv.height=H*dpr;const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);this.draw(c,W,H,this.theme==='dark'?DARK:LIGHT,true)}
  exportPNG(scale=2,cb){
    const W=this.cv.clientWidth,H=this.cv.clientHeight,t=document.createElement('canvas');t.width=W*scale;t.height=H*scale;const c=t.getContext('2d');c.scale(scale,scale);
    const saved=[this.ax,this.ay,this.hits];this.draw(c,W,H,LIGHT,false);[this.ax,this.ay,this.hits]=saved;this.render();t.toBlob(cb)}
  // ---------- data helpers ----------
  sheet(){return this.getSheet(this.g.sheetId)}
  sdata(s){const sh=this.sheet(),yc=sh.cols[s.y];if(!yc)return{x:[],y:[],e:[],z:[],n:0};const n=yc.d.length,xc=s.x!=null&&s.x>=0?sh.cols[s.x]:null,ec=s.e!=null&&s.e>=0?sh.cols[s.e]:null,zc=s.z!=null&&s.z>=0?sh.cols[s.z]:null,x=[],y=[],e=[],z=[],rows=[];
    for(let i=0;i<n;i++){const yv=yc.d[i];if(sh.mask&&sh.mask[i])continue;if(!this.rowOk(s,i,sh))continue;const xv=xc?xc.d[i]:i+1;if(!Number.isFinite(xv)||!Number.isFinite(yv))continue;x.push(xv);y.push(yv);e.push(ec&&Number.isFinite(ec.d[i])?ec.d[i]:0);if(zc)z.push(zc.d[i]);rows.push(i)}
    return{x,y,e,z,rows,n:x.length,name:this.tok(s.label||yc.name||'Y',s)}}
  matrix(){const g=this.g,sh=this.sheet();if(g.type==='kde2d'&&this.kde2dMatrix)return this.kde2dMatrix();let cs=g.mcols&&g.mcols.length?g.mcols.filter(i=>sh.cols[i]):sh.cols.map((_,i)=>i);if(!cs.length)cs=sh.cols.map((_,i)=>i);
    const nr=sh.isMatrix&&sh.yv?sh.yv.length:Math.max(0,...cs.map(i=>sh.cols[i].d.length)),z=Array.from({length:nr},(_,r)=>cs.map(i=>sh.cols[i].d[r])),
    xv=cs.map((i,k)=>sh.isMatrix&&sh.xv?sh.xv[i]:(Number.isFinite(+sh.cols[i].name)&&sh.cols[i].name!==''?+sh.cols[i].name:k+1)),yv=Array.from({length:nr},(_,r)=>sh.isMatrix&&sh.yv?sh.yv[r]:r+1);
    const flat=z.flat().filter(Number.isFinite);return{z,xv,yv,zmin:g.zmin??Math.min(...flat),zmax:g.zmax??Math.max(...flat)}}
  // ---------- main draw ----------
  draw(c,W,H,pal,live){
    const g=this.g;this.p=pal;this.live=live;this.ff=(g&&g.font)||'system-ui,sans-serif';if(live){this.hits=[];this.kind=null}
    c.clearRect(0,0,W,H);c.fillStyle=pal.bg;c.fillRect(0,0,W,H);if(!g)return;
    const fs=g.fs||12;c.font=`${fs}px ${this.ff}`;c.textBaseline='alphabetic';
    if(g.title){c.fillStyle=pal.ink;c.font=`600 ${fs+4}px ${this.ff}`;c.textAlign='center';this.rt(c,this.tok(g.title),W/2,fs+8)}
    if(g.subtitle){c.fillStyle=pal.mut;c.font=`${fs}px ${this.ff}`;c.textAlign='center';this.rt(c,this.tok(g.subtitle),W/2,(g.title?fs+8:0)+fs+8+(g.title?2:0)+(g.title?0:0));c.fillStyle=pal.ink}
    c.font=`${fs}px ${this.ff}`;
    const top=(g.title?fs+22:12)+(g.subtitle?fs+2:0);
    try{
      switch(g.type){
        case'pie':case'doughnut':return this.drawPie(c,W,H,top);
        case'radar':return this.drawRadar(c,W,H,top);
        case'multi':return this.drawMulti(c,W,H,top);
        case'polar':return this.drawPolar(c,W,H,top);
        case'heat':case'contour':case'kde2d':return this.drawHeat(c,W,H,top);
        case'surf3d':case'wire3d':case'scat3d':case'traj3d':case'bars3d':case'ribbon3d':case'wall3d':return this.draw3D(c,W,H,top);
        default:if(typeof GX!=='undefined'&&GX[g.type])return GX[g.type].call(this,c,W,H,top);return this.drawCart(c,W,H,top)}
    }catch(err){c.fillStyle='#dc2626';c.textAlign='left';c.fillText('Render error: '+err.message,12,top+20);console.error(err)}}
  empty(c,W,H,msg){c.fillStyle=this.p.mut;c.textAlign='center';c.fillText(msg||'No data to plot — select columns in the worksheet and choose a plot type.',W/2,H/2)}
  // ---------- cartesian ----------
  drawCart(c,W,H,top){
    const g=this.g,pal=this.p,fs=g.fs||12,hz=g.type==='bar',isBar=['column','bar','stack','stack100','floatcol'].includes(g.type),isHist=g.type==='hist',isBox=['box','violin','interval','meanbar','swarm','colscatter'].includes(g.type);let type=g.type,connect=g.connect;const extra=[],fx=v=>g.xdate&&!hz?formatDate(v):Mx.fmt(v);
    const series=g.series.filter(s=>!s.hide).map(s=>({s,d:this.sdata(s)}));
    if(!series.length||series.every(q=>!q.d.n))return this.empty(c,W,H);
    if(type==='qq'){series.forEach((q,i)=>{const s=Array.from(Mx.sorted(q.d.y)),n=s.length,th=s.map((_,k)=>Mx.norminv((k+1-.375)/(n+.25)));q.d={...q.d,x:th,y:s,e:new Array(n).fill(0),z:[],n,rows:[]};
        if(n>3){const i1=Math.floor(n*.25),i3=Math.floor(n*.75),sl=(s[i3]-s[i1])/(th[i3]-th[i1]),ic=s[i1]-sl*th[i1];extra.push([th[0],ic+sl*th[0],th[n-1],ic+sl*th[n-1]])}});type='scatter'}
    else if(type==='ecdf'){series.forEach(q=>{const s=Array.from(Mx.sorted(q.d.y)),n=s.length;q.d={...q.d,x:s,y:s.map((_,i)=>(i+1)/n),e:new Array(n).fill(0),z:[],n,rows:[]}});type='line';connect='step'}
    else if(type==='kde'){series.forEach(q=>{const y=q.d.y,n=y.length,so=Mx.sorted(y),sd=Mx.sd(y)||1,iqr=(Mx.quantile(so,.75)-Mx.quantile(so,.25))/1.34,h=.9*Math.min(sd,iqr||sd)*Math.pow(n,-.2)||1,lo=so[0]-3*h,hi=so[n-1]+3*h,gx=Array.from({length:200},(_,i)=>lo+(hi-lo)*i/199);
        q.d={...q.d,x:gx,y:gx.map(x=>y.reduce((a,v)=>a+Math.exp(-.5*((x-v)/h)**2),0)/(n*h*Math.sqrt(2*Math.PI))),e:new Array(200).fill(0),z:[],n:200,rows:[]}});type='line'}
    if(type==='ba'&&series.length>=2){const a=series[0].d,b=series[1].d,mp=new Map(b.rows.map((r,i)=>[r,i])),X=[],Y=[],RR=[];a.rows.forEach((r,i)=>{if(mp.has(r)){const j=mp.get(r);X.push((a.y[i]+b.y[j])/2);Y.push(a.y[i]-b.y[j]);RR.push(r)}});
      const md=Mx.mean(Y),sd=Mx.sd(Y),x0=Math.min(...X),x1=Math.max(...X);series.splice(1);series[0]={s:series[0].s,d:{...a,x:X,y:Y,e:Y.map(()=>0),z:[],rows:RR,n:Y.length,name:'Difference'}};type='scatter';extra.push([x0,md,x1,md],[x0,md+1.96*sd,x1,md+1.96*sd],[x0,md-1.96*sd,x1,md-1.96*sd]);this.baStats={md,sd}}
    if(type==='vector'){series.forEach(q=>{q.d.mag=q.d.e;q.d.e=q.d.e.map(()=>0)})}
    const v=g.view||{};
    // histogram transformation
    let hist=null;if(isHist){const all=series.flatMap(q=>q.d.y),lo=Math.min(...all),hi=Math.max(...all),k=g.bins>0?Math.round(g.bins):Math.max(5,Math.ceil(Math.log2(all.length)+1)),w=(hi-lo)/k||1;
      hist={lo,w,k,bars:series.map(q=>{const cnt=new Array(k).fill(0);q.d.y.forEach(a=>cnt[Math.min(k-1,Math.floor((a-lo)/w))]++);return cnt})};}
    let cats=null;if(isBox)cats=series.map(q=>q.d.name);
    // stacked cumulative
    let stack=null;if(['stack','stack100','sarea','sarea100'].includes(type)){const n0=series[0].d.n,cum=new Array(n0).fill(0),tot=new Array(n0).fill(0),p100=type.endsWith('100');if(p100)series.forEach(q=>q.d.y.forEach((y,i)=>{tot[i]=(tot[i]||0)+Math.abs(y)}));stack=series.map(q=>q.d.y.map((y,i)=>{const lo=cum[i]||0,val=p100?Math.abs(y)/(tot[i]||1)*100:y;cum[i]=lo+val;return[lo,cum[i]]}))}
    // domains
    const ext=(arrs)=>{let lo=Infinity,hi=-Infinity;for(const a of arrs)for(const x of a){if(x<lo)lo=x;if(x>hi)hi=x}return[lo,hi]};
    const barW=this.barWidth(series,type);
    let xl,xh,yl,yh;const rkeys=[...new Set(series.map(q=>q.s.axis).filter(a=>a&&a!=='L'))].sort(),rext={};
    if(isHist){xl=hist.lo;xh=hist.lo+hist.k*hist.w;yl=0;yh=Math.max(...hist.bars.flat())}
    else if(isBox){xl=.5;xh=cats.length+.5;[yl,yh]=ext(series.flatMap(q=>[q.d.y]))}
    else{[xl,xh]=ext(series.map(q=>q.d.x));if(isBar){xl-=barW;xh+=barW}
      const L=series.filter(q=>!q.s.axis||q.s.axis==='L');[yl,yh]=ext(L.map((q,i)=>q.d.y.map((y,k)=>y+(q.d.e[k]||0)).concat(q.d.y.map((y,k)=>y-(q.d.e[k]||0)))));if(type==='floatcol'){const zz=ext(series.map(q=>q.d.z.map(Number)));yl=Math.min(yl,zz[0]);yh=Math.max(yh,zz[1])}
      if(stack)[yl,yh]=ext([stack.flatMap(a=>a.flat())]);
      rkeys.forEach(k=>{rext[k]=ext(series.filter(q=>q.s.axis===k).map(q=>q.d.y.map((y,i)=>y+q.d.e[i]).concat(q.d.y.map((y,i)=>y-q.d.e[i]))))})}
    const zero=isBar||isHist||g.type==='meanbar';
    const dom=(lo,hi,sc,mn,mx,vw,z)=>vw?vw:[mn??autoRange(lo,hi,sc,z)[0],mx??autoRange(lo,hi,sc,z)[1]];
    let XD=dom(xl,xh,g.xs,g.xmin,g.xmax,v.x,false),YD=dom(yl,yh,g.ys,g.ymin,g.ymax,v.y,zero||['area','sarea','sarea100','lollipop','drop'].includes(type));
    if(type==='stack100'||type==='sarea100')YD=v.y||[g.ymin??0,g.ymax??100];
    if(isHist||isBar){const nx=autoRange(xl,xh,g.xs,false,false);XD=v.x||[g.xmin??nx[0],g.xmax??nx[1]]}
    if(isBox)XD=v.x||[.5,cats.length+.5];
    if(g.xdate&&!hz&&!isBox&&!isHist){const pd=(xh-xl)*.02||864e5;XD=v.x||[g.xmin??xl-pd,g.xmax??xh+pd]}
    if(this.forceX&&!hz&&!isBox&&!isHist)XD=this.forceX;
    const tser=series.filter(q=>q.s.xaxis==='T'),hasT=tser.length>0&&!hz,tcfg=(g.axes&&g.axes.T)||{};let TD=null;if(hasT){const[tl,th]=ext(tser.map(q=>q.d.x));TD=dom(tl,th,tcfg.scale||'linear',tcfg.min??null,tcfg.max??null,v.t,false)}
    const hasR=rkeys.length>0,rcfg=k=>k==='R'?{label:g.yrl,scale:g.yrs,min:g.yrmin,max:g.yrmax}:(g.axes&&g.axes[k])||{};
    // layout (measure tick labels first, using temporary axes)
    c.font=`${fs}px ${this.ff}`;
    const probeY=mkAxis(hz?XD[0]:YD[0],hz?XD[1]:YD[1],hz?g.xs:g.ys,H-60,top,hz?cats:null),wLab=Math.max(20,...probeY.ticks.map(t=>c.measureText(t.label).width));
    const m={l:Math.ceil(wLab)+(g.yl||hz&&g.xl?fs+18:10)+8,r:hasR?8+rkeys.reduce((a,k)=>a+62+(rcfg(k).label?fs+8:0),0):16,t:top+(hasT?26+(tcfg.label?fs+6:0):0),b:fs*2+(g.xl?fs+10:6)+8};
    if(g.legend==='out')m.r+=130;
    const pw=W-m.l-m.r,ph=H-m.t-m.b;if(pw<40||ph<40)return;
    const R={x:m.l,y:m.t,w:pw,h:ph};
    const ax=mkAxis(XD[0],XD[1],g.xs,m.l,m.l+pw,isBox?cats:null,g.xdate&&!hz&&!isBox,g.xbreak&&!hz&&!isBox?g.xbreak:null),ay=mkAxis(YD[0],YD[1],g.ys,m.t+ph,m.t,null,false,g.ybreak&&!hz?g.ybreak:null),ras={},axT=hasT?mkAxis(TD[0],TD[1],tcfg.scale||'linear',m.l,m.l+pw):null;this.customAxes&&this.customAxes(ax,ay,hz);
        // re-make vertical axis for hz with categories
    const HA=hz?mkAxis(YD[0],YD[1],g.ys,m.l,m.l+pw):ax,VA=hz?mkAxis(XD[0],XD[1],g.xs,m.t+ph,m.t):ay;
    rkeys.forEach(k=>{if(!rext[k]||!Number.isFinite(rext[k][0]))return;const cf=rcfg(k),sc=cf.scale||'linear',D_=dom(rext[k][0],rext[k][1],sc,cf.min??null,cf.max??null,v[k.toLowerCase()],false);ras[k]=mkAxis(D_[0],D_[1],sc,m.t+ph,m.t)});const ar=ras.R||null;
    this.axT=axT;this.ax=ax;this.ay=ay;this.ar=ar;this.ars=ras;this.HA=HA;this.VA=VA;this.hz=hz;this.R=R;this.kind='cart';
    const pt=(x,y,axis,xa)=>hz?[HA.map(y),VA.map(x)]:[(xa==='T'&&axT?axT:ax).map(x),(axis&&axis!=='L'&&ras[axis]?ras[axis]:ay).map(y)];
    // grid
    c.lineWidth=1;
    if(g.gridx!==false){HA.ticks.forEach(t=>{if(t.minor&&!g.minor)return;const x=Math.round(HA.map(t.v))+.5;c.strokeStyle=t.minor?pal.minor:pal.grid;c.beginPath();c.moveTo(x,R.y);c.lineTo(x,R.y+R.h);c.stroke()})}
    if(g.gridy!==false){VA.ticks.forEach(t=>{if(t.minor&&!g.minor)return;const y=Math.round(VA.map(t.v))+.5;c.strokeStyle=t.minor?pal.minor:pal.grid;c.beginPath();c.moveTo(R.x,y);c.lineTo(R.x+R.w,y);c.stroke()})}
    // clip & series
    c.save();c.beginPath();c.rect(R.x,R.y,R.w,R.h);c.clip();
    (g.refs||[]).forEach(r=>{c.strokeStyle=r.color||pal.mut;c.lineWidth=1.2;c.setLineDash([6,4]);c.beginPath();if(r.axis==='x'){const p=hz?VA.map(r.v):HA.map(r.v);hz?(c.moveTo(R.x,p),c.lineTo(R.x+R.w,p)):(c.moveTo(p,R.y),c.lineTo(p,R.y+R.h))}else{const p=hz?HA.map(r.v):VA.map(r.v);hz?(c.moveTo(p,R.y),c.lineTo(p,R.y+R.h)):(c.moveTo(R.x,p),c.lineTo(R.x+R.w,p))}c.stroke();c.setLineDash([])});
    const nS=series.length;
    series.forEach((q,si)=>{const s=q.s,d=q.d,col=this.dim(si,s.color||PALETTE[si%PALETTE.length]),axis=s.axis;c.strokeStyle=col;c.fillStyle=col;
      if(isHist){const cnt=hist.bars[si],bw=hist.w/nS;c.globalAlpha=nS>1?.55:.85;cnt.forEach((n,i)=>{const x0=hist.lo+i*hist.w+si*bw,[a,b]=pt(x0,0),[a2,b2]=pt(x0+bw,n);c.fillRect(Math.min(a,a2),Math.min(b,b2),Math.abs(a2-a)-(nS===1?1:0),Math.abs(b-b2))});c.globalAlpha=1;
        if(g.normal&&d.n>2){const mu=Mx.mean(d.y),sd=Mx.sd(d.y);c.lineWidth=2;c.beginPath();for(let i=0;i<=120;i++){const x=hist.lo+hist.k*hist.w*i/120,y=d.n*hist.w*Math.exp(-((x-mu)**2)/(2*sd*sd))/(sd*Math.sqrt(2*Math.PI)),[px,py]=pt(x,y);i?c.lineTo(px,py):c.moveTo(px,py)}c.stroke()}return}
      if(g.type==='violin'){this.violin(c,d,si+1,pt,col,live);return}
      if(['interval','meanbar','swarm','colscatter'].includes(g.type)){this.catplot(c,d,si+1,pt,col,live,pal);return}
      if(isBox){const sorted=Mx.sorted(d.y),q1=Mx.quantile(sorted,.25),q3=Mx.quantile(sorted,.75),med=Mx.quantile(sorted,.5),iqr=q3-q1,lo=sorted.find(a=>a>=q1-1.5*iqr),hi=[...sorted].reverse().find(a=>a<=q3+1.5*iqr),bx=.55,x=si+1;
        const[px,py1]=pt(x,q1),[,py3]=pt(x,q3),[px0]=pt(x-bx/2,0),[px1]=pt(x+bx/2,0);c.globalAlpha=.25;c.fillRect(px0,py3,px1-px0,py1-py3);c.globalAlpha=1;c.lineWidth=1.6;c.strokeRect(px0,py3,px1-px0,py1-py3);
        const ly=pt(x,lo)[1],hy=pt(x,hi)[1],my=pt(x,med)[1];c.beginPath();c.moveTo(px0,my);c.lineTo(px1,my);c.moveTo(px,py1);c.lineTo(px,ly);c.moveTo(px,py3);c.lineTo(px,hy);c.moveTo(px-8,ly);c.lineTo(px+8,ly);c.moveTo(px-8,hy);c.lineTo(px+8,hy);c.stroke();
        drawSym(c,'square',px,pt(x,Mx.mean(d.y))[1],3,col);sorted.forEach(a=>{if(a<lo||a>hi){const[ox,oy]=pt(x,a);drawSym(c,'circle',ox+(Math.sin(a*97)*8),oy,2.5,col,false)}});
        if(live)this.hits.push({px,py:my,text:`${d.name}: median ${Mx.fmt(med)}, mean ${Mx.fmt(Mx.mean(d.y))}, n=${d.n}`,color:col});return}
      if(stack&&(type==='sarea'||type==='sarea100')){const so=series[0].d.x.map((_,i)=>i).sort((a,b)=>series[0].d.x[a]-series[0].d.x[b]);c.beginPath();so.forEach((i,k)=>{const[px,py]=pt(d.x[i],stack[si][i][1]);k?c.lineTo(px,py):c.moveTo(px,py)});for(let k=so.length-1;k>=0;k--){const i=so[k],[px,py]=pt(d.x[i],stack[si][i][0]);c.lineTo(px,py)}c.closePath();c.globalAlpha=.75;c.fill();c.globalAlpha=1;c.lineWidth=1.4;c.stroke();return}
      if(isBar){const w=barW/nS*(stack?nS:1)*.9,off=stack?0:(si-(nS-1)/2)*barW/nS*.9;c.globalAlpha=.88;
        d.x.forEach((x,i)=>{const y0=stack?stack[si][i][0]:(type==='floatcol'&&d.z.length?Number(d.z[i]):Math.min(Math.max(0,YD[0]),YD[1])),y1=stack?stack[si][i][1]:d.y[i],[a,b]=pt(x+off-w/2,y0),[a2,b2]=pt(x+off+w/2,y1);
          const bx=Math.min(a,a2),by=Math.min(b,b2);c.fillRect(bx,by,Math.max(1,Math.abs(a2-a)),Math.max(1,Math.abs(b2-b)));
          if(live)this.hits.push({px:(a+a2)/2,py:hz?(b+b2)/2:b2,text:`${d.name}: x=${Mx.fmt(x)}, y=${Mx.fmt(d.y[i])}`,color:col})});c.globalAlpha=1;
        if(d.e.some(e=>e)){c.lineWidth=1.4;d.x.forEach((x,i)=>{if(!d.e[i])return;const[ex,ey1]=pt(x+off,d.y[i]+d.e[i]),[,ey2]=pt(x+off,d.y[i]-d.e[i]);c.beginPath();c.moveTo(ex,ey1);c.lineTo(ex,ey2);c.moveTo(ex-4,ey1);c.lineTo(ex+4,ey1);c.moveTo(ex-4,ey2);c.lineTo(ex+4,ey2);c.stroke()})}return}
      // line / scatter / area
      const idx=d.x.map((_,i)=>i);if(type!=='scatter'&&type!=='bubble'&&type!=='cscatter'&&type!=='vector')idx.sort((a,b)=>d.x[a]-d.x[b]);
      const P=idx.map(i=>pt(d.x[i],d.y[i]+(g.offset?si*g.offset:0),axis,s.xaxis)).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
      const PP=(g.speed!==false&&P.length>(g.speedN||5000)&&(type==='line'||type==='linesym'||type==='area'))?Mx.lttb(P,Math.max(300,Math.round(R.w*1.5))):(g.speed!==false&&type==='scatter'&&P.length>20000)?Mx.dedupe(P):P;
      const showLine=['line','linesym','area','errband'].includes(type),showSym=['scatter','linesym','cscatter','lollipop','drop'].includes(type);
      if(type==='errband'&&d.e.some(e=>e)){const so=idx;c.beginPath();so.forEach((i,k)=>{const[px,py]=pt(d.x[i],d.y[i]+d.e[i],axis,s.xaxis);k?c.lineTo(px,py):c.moveTo(px,py)});for(let k=so.length-1;k>=0;k--){const i=so[k],[px,py]=pt(d.x[i],d.y[i]-d.e[i],axis,s.xaxis);c.lineTo(px,py)}c.closePath();c.globalAlpha=.22;c.fill();c.globalAlpha=1}
      if(type==='cline'&&d.z.length){const zs=d.z.map(Number),z0=Math.min(...zs),z1=Math.max(...zs);this.zr=[z0,z1];c.lineWidth=s.lw??2;for(let k=1;k<idx.length;k++){const a=idx[k-1],b=idx[k],pa=pt(d.x[a],d.y[a],axis,s.xaxis),pb=pt(d.x[b],d.y[b],axis,s.xaxis);c.strokeStyle=cmap(g.cmap||'viridis',(zs[b]-z0)/((z1-z0)||1));c.beginPath();c.moveTo(pa[0],pa[1]);c.lineTo(pb[0],pb[1]);c.stroke()}}
      if(type==='lollipop'||type==='drop'){const by=VA.map(Math.min(Math.max(0,YD[0]),YD[1]));c.lineWidth=type==='drop'?1:s.lw??2;c.setLineDash(type==='drop'?[4,3]:[]);c.beginPath();P.forEach(p=>{c.moveTo(p[0],by);c.lineTo(p[0],p[1])});c.stroke();c.setLineDash([])}
      if(showLine&&PP.length>1){c.lineWidth=s.lw??2;c.setLineDash(DASH[s.dash||'']||[]);c.beginPath();this.path(c,PP,connect);
        if(type==='area'){const base=VA.map(Math.max(YD[0],Math.min(0,YD[1])));c.stroke();c.lineTo(PP[PP.length-1][0],base);c.lineTo(PP[0][0],base);c.closePath();c.globalAlpha=.22;c.fill();c.globalAlpha=1}else c.stroke();c.setLineDash([])}
      if(d.e.some(e=>e)){c.lineWidth=1.2;idx.forEach(i=>{if(!d.e[i])return;const[ex,ey1]=pt(d.x[i],d.y[i]+d.e[i],axis,s.xaxis),[,ey2]=pt(d.x[i],d.y[i]-d.e[i],axis,s.xaxis);c.beginPath();c.moveTo(ex,ey1);c.lineTo(ex,ey2);c.moveTo(ex-4,ey1);c.lineTo(ex+4,ey1);c.moveTo(ex-4,ey2);c.lineTo(ex+4,ey2);c.stroke()})}
      if(showSym&&s.symbol!=='none'){if(type==='cscatter'&&d.z.length){const zs=d.z.map(Number),z0=Math.min(...zs),z1=Math.max(...zs);this.zr=[z0,z1];P.forEach((p,k)=>drawSym(c,s.symbol||'circle',p[0],p[1],(s.size||6)/2,cmap(g.cmap||'viridis',(zs[idx[k]]-z0)/((z1-z0)||1)),true))}
        else if(PP===P&&(s.cby>=0||s.sby>=0||s.shby>=0)&&P.length===idx.length){const m=this.modStyle(s,d);P.forEach((p,k)=>drawSym(c,m.sym?m.sym[idx[k]]:(s.symbol||SYMBOLS[si%6]),p[0],p[1],(m.size?m.size[idx[k]]:(s.size||6))/2,m.color?m.color[idx[k]]:col,!s.open))}
        else if(s.pts&&PP===P){P.forEach((p,k)=>{const o=s.pts[d.rows[idx[k]]]||{};drawSym(c,o.symbol||s.symbol||SYMBOLS[si%6],p[0],p[1],(o.size||s.size||6)/2,o.color||col,!s.open)})}
        else PP.forEach(p=>drawSym(c,s.symbol||SYMBOLS[si%6],p[0],p[1],(s.size||6)/2,col,!s.open))}
      if(this.seriesExtras)this.seriesExtras(c,s,d,idx,P,pt,axis,col,si,type);
      if(type==='vector'&&d.z.length){const mg=d.mag.map(Math.abs),mx0=Math.max(...mg)||1,L=(g.vscale||34);c.lineWidth=s.lw??1.6;idx.forEach((i,k)=>{if(!P[k])return;const a=-Number(d.z[i])*Math.PI/180,len=L*(d.mag[i]?Math.abs(d.mag[i])/mx0:1),x0=P[k][0],y0=P[k][1],x1=x0+len*Math.cos(a),y1=y0+len*Math.sin(a),h=Math.min(7,len*.35);c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.moveTo(x1,y1);c.lineTo(x1-h*Math.cos(a-.45),y1-h*Math.sin(a-.45));c.moveTo(x1,y1);c.lineTo(x1-h*Math.cos(a+.45),y1-h*Math.sin(a+.45));c.stroke()})}
      if(type==='bubble'&&d.z.length){const zs=d.z.map(Number),zmin=Math.min(...zs),zmax=Math.max(...zs);idx.forEach((i,k)=>{if(!P[k])return;const r=5+24*Math.sqrt((zs[i]-zmin)/((zmax-zmin)||1));c.beginPath();c.arc(P[k][0],P[k][1],r,0,7);c.fillStyle=col;c.globalAlpha=.45;c.fill();c.globalAlpha=1;c.strokeStyle=col;c.lineWidth=1.2;c.stroke()})}
      if(s.labels&&P.length<=80){c.fillStyle=pal.ink;c.font=`${fs-1}px ${this.ff}`;c.textAlign='center';idx.forEach((i,k)=>{if(P[k])c.fillText(Mx.fmt(d.y[i],4),P[k][0],P[k][1]-9)})}
      if(live&&d.n<=30000)idx.forEach((i,k)=>{if(P[k])this.hits.push({px:P[k][0],py:P[k][1],text:`${d.name}  x=${fx(d.x[i])}  y=${Mx.fmt(d.y[i])}`,color:col,si,row:d.rows[i]})})});
    extra.forEach(l=>{const a=pt(l[0],l[1]),b=pt(l[2],l[3]);c.strokeStyle=pal.mut;c.lineWidth=1.3;c.setLineDash([6,4]);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();c.setLineDash([])});
    this.lastSeries=series;
    // fit curves, marks
    (g.curves||[]).forEach((cu,i)=>{if(cu.hide)return;c.strokeStyle=cu.color||(cu.dash?pal.mut:pal.ink);c.lineWidth=cu.dash?1.3:2.2;c.setLineDash(cu.dot?[2,4]:cu.dash?[7,4]:[]);c.beginPath();let f=true;
      cu.x.forEach((x,k)=>{if(!Number.isFinite(cu.y[k])){f=true;return}const[px,py]=pt(x,cu.y[k]);f?c.moveTo(px,py):c.lineTo(px,py);f=false});c.stroke();c.setLineDash([])});
    (g.marks||[]).forEach(mk=>{if(g.hideMarks)return;const[px,py]=pt(mk.x,mk.y);drawSym(c,'triangle',px,py-9,4.5,'#dc2626');c.fillStyle=pal.ink;c.textAlign='center';c.font=`${fs-1}px ${this.ff}`;c.fillText(mk.label||'',px,py-20)});
    (g.notes||[]).forEach(nt=>{const[px,py]=pt(nt.x,nt.y);c.fillStyle=pal.ink;c.font=`${fs}px ${this.ff}`;c.textAlign='left';this.rt(c,nt.text,px,py)});
    this.drawOverlays&&this.drawOverlays(c,pt,R,series,hz);
    c.restore();
    // frame + ticks
    c.strokeStyle=pal.ink;c.lineWidth=1.2;c.strokeRect(R.x+.5,R.y+.5,R.w,R.h);c.fillStyle=pal.ink;c.font=`${fs}px ${this.ff}`;
    this.axisTicks(c,HA,VA,R,fs,pal,hz,axT,tcfg);
    {let off=0;Object.keys(ras).sort().forEach(k=>{const A_=ras[k],cf=rcfg(k),xa=R.x+R.w+off,tc=(series.find(q=>q.s.axis===k)||{s:{}}).s.color||pal.ink;c.strokeStyle=tc;c.fillStyle=tc;c.lineWidth=1.2;
      if(off>0){c.beginPath();c.moveTo(xa+.5,R.y);c.lineTo(xa+.5,R.y+R.h);c.stroke()}
      c.textAlign='left';A_.ticks.forEach(t=>{const y=A_.map(t.v);c.beginPath();c.moveTo(xa,y);c.lineTo(xa+(t.minor?3:6),y);c.stroke();if(t.label)c.fillText(t.label,xa+9,y+fs*.35)});
      if(cf.label){c.font=`${fs+1}px ${this.ff}`;c.save();c.translate(xa+58+fs*.4,R.y+R.h/2);c.rotate(Math.PI/2);c.textAlign='center';c.fillText(cf.label,0,0);c.restore();c.font=`${fs}px ${this.ff}`}
      off+=62+(cf.label?fs+8:0)});c.fillStyle=pal.ink;c.strokeStyle=pal.ink}
    const xlab=hz?g.yl:g.xl,ylab=hz?g.xl:g.yl;c.font=`${fs+1}px ${this.ff}`;
    if(xlab){c.textAlign='center';this.rt(c,this.tok(xlab),R.x+R.w/2,H-8)}
    if(ylab){c.save();c.translate(14,R.y+R.h/2);c.rotate(-Math.PI/2);c.textAlign='center';this.rt(c,this.tok(ylab),0,0);c.restore()}
    c.font=`${fs}px ${this.ff}`;
    // legend
    const items=[];series.forEach((q,si)=>{if(isBox)return;items.push({hide:q.s.legHide,label:q.d.name+(q.s.axis&&q.s.axis!=='L'?` (${q.s.axis})`:''),color:q.s.color||PALETTE[si%PALETTE.length],sym:(type==='scatter'||type==='bubble'||type==='linesym'||type==='lollipop'||type==='drop')?(q.s.symbol||SYMBOLS[si%6]):null,line:!['scatter','bubble','cscatter','vector','lollipop','drop','column','bar','stack','stack100','floatcol','hist'].includes(type)})});
    (g.curves||[]).filter(cu=>!cu.dash||g.legendBands).forEach(cu=>items.push({label:cu.label||'Fit',color:cu.color||pal.ink,line:true,dash:cu.dash}));
    (this.trendLeg||[]).forEach(t=>items.push(t));
    if(g.legend!=='none'&&items.length)this.legend(c,R,items,g.legend||'tr',pal,fs);
    if((type==='cscatter'||type==='cline')&&this.zr)this.colorbar(c,R,this.zr,g.cmap||'viridis',pal,fs);
    this.rbDraw(c);
  }
  barWidth(series,type){if(!['column','bar','stack'].includes(type))return 1;const xs=[...new Set(series.flatMap(q=>q.d.x))].sort((a,b)=>a-b);let m=Infinity;for(let i=1;i<xs.length;i++)m=Math.min(m,xs[i]-xs[i-1]);return Number.isFinite(m)?m*.85:.8}
  path(c,P,mode){
    if(mode==='hv'||mode==='vh'){P.forEach((p,i)=>{if(!i)c.moveTo(p[0],p[1]);else if(mode==='hv'){c.lineTo(p[0],P[i-1][1]);c.lineTo(p[0],p[1])}else{c.lineTo(P[i-1][0],p[1]);c.lineTo(p[0],p[1])}});return}
    if(mode==='step'){P.forEach((p,i)=>{if(!i)c.moveTo(p[0],p[1]);else{c.lineTo((P[i-1][0]+p[0])/2,P[i-1][1]);c.lineTo((P[i-1][0]+p[0])/2,p[1]);c.lineTo(p[0],p[1])}});return}
    if(mode==='spline'&&P.length>2){c.moveTo(P[0][0],P[0][1]);for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];c.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6,p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6,p2[0],p2[1])}return}
    P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]))}
  legend(c,R,items,pos,pal,fs){const g=this.g;items=items.filter(i=>!i.hide);if(!items.length){this.legendRect=null;return}fs=g.lfs||fs;c.font=`${fs}px ${this.ff}`;
    const orient=g.legendOrient==='h'?'h':'v',iw=Math.min(260,Math.max(...items.map(i=>c.measureText(String(i.label).replace(/[\\^_{}]/g,'')).width))+40),rowH=fs+6,titleH=g.legendTitle?fs+8:0;
    let ncols=orient==='h'?Math.max(1,Math.min(items.length,Math.floor((R.w*.94-8)/iw))):Math.max(1,Math.min(items.length,g.legendCols>0?g.legendCols:1));if(orient==='h'&&g.legendCols>0)ncols=Math.min(ncols,g.legendCols);
    const nrows=Math.ceil(items.length/ncols),w=Math.max(ncols*iw+8,g.legendTitle?c.measureText(g.legendTitle).width+24:0),h=nrows*rowH+8+titleH;
    const lp=g.legendPos,x=lp?R.x+lp.fx*R.w:pos==='out'?R.x+R.w+10:pos.includes('l')?R.x+8:R.x+R.w-w-8,y=lp?R.y+lp.fy*R.h:pos==='out'||pos.includes('t')?R.y+8:R.y+R.h-h-8;this.legendRect={x,y,w,h};
    c.fillStyle=pal.bg;c.globalAlpha=g.legendFrame===false?.6:.88;c.fillRect(x,y,w,h);c.globalAlpha=1;if(g.legendFrame!==false){c.strokeStyle=pal.grid;c.strokeRect(x+.5,y+.5,w,h)}
    if(g.legendTitle){c.fillStyle=pal.ink;c.font=`bold ${fs}px ${this.ff}`;c.textAlign='left';this.rt(c,g.legendTitle,x+8,y+fs+3);c.font=`${fs}px ${this.ff}`}
    items.forEach((it,i)=>{const col=orient==='h'?i%ncols:Math.floor(i/nrows),row=orient==='h'?Math.floor(i/ncols):i%nrows,ix=x+4+col*iw,yy=y+4+titleH+row*rowH+rowH/2;c.strokeStyle=it.color;c.fillStyle=it.color;c.lineWidth=2;c.setLineDash(it.dash?[5,3]:[]);
      if(it.line){c.beginPath();c.moveTo(ix+6,yy);c.lineTo(ix+26,yy);c.stroke()}c.setLineDash([]);if(it.sym)drawSym(c,it.sym,ix+16,yy,4,it.color);else if(!it.line)c.fillRect(ix+10,yy-5,12,10);
      c.fillStyle=pal.ink;c.textAlign='left';this.rt(c,it.label,ix+32,yy+fs*.35)})}
  violin(c,d,x,pt,col,live){const y=d.y,n=y.length;if(n<2)return;const so=Mx.sorted(y),sd=Mx.sd(y)||1,iqr=(Mx.quantile(so,.75)-Mx.quantile(so,.25))/1.34,h=.9*Math.min(sd,iqr||sd)*Math.pow(n,-.2)||1,lo=so[0]-h,hi=so[n-1]+h,K=60,gy=Array.from({length:K},(_,i)=>lo+(hi-lo)*i/(K-1)),dn=gy.map(t=>y.reduce((a,v)=>a+Math.exp(-.5*((t-v)/h)**2),0)),mx=Math.max(...dn);
    c.fillStyle=col;c.strokeStyle=col;c.lineWidth=1.5;c.beginPath();gy.forEach((t,i)=>{const[px,py]=pt(x+dn[i]/mx*.42,t);i?c.lineTo(px,py):c.moveTo(px,py)});for(let i=K-1;i>=0;i--){const[px,py]=pt(x-dn[i]/mx*.42,gy[i]);c.lineTo(px,py)}c.closePath();c.globalAlpha=.3;c.fill();c.globalAlpha=1;c.stroke();
    const q1=Mx.quantile(so,.25),q3=Mx.quantile(so,.75),med=Mx.quantile(so,.5),[ax,a1]=pt(x,q1),[,a3]=pt(x,q3),[,am]=pt(x,med);c.lineWidth=5;c.beginPath();c.moveTo(ax,a1);c.lineTo(ax,a3);c.stroke();c.fillStyle=this.p.bg;c.beginPath();c.arc(ax,am,3,0,7);c.fill();
    if(live)this.hits.push({px:ax,py:am,text:`${d.name}: median ${Mx.fmt(med)}, mean ${Mx.fmt(Mx.mean(y))}, n=${n}`,color:col})}
  drawRadar(c,W,H,top){
    const g=this.g,pal=this.p,fs=g.fs||12,sh=this.sheet(),series=g.series.filter(s=>!s.hide).map(s=>({s,d:this.sdata(s)}));if(!series.length||!series[0].d.n)return this.empty(c,W,H);
    const n=Math.max(...series.map(q=>q.d.n)),lc=g.labelCol!=null&&g.labelCol>=0?sh.cols[g.labelCol]:null,cx=W/2,cy=(H+top)/2,R=Math.min(W,H-top)/2-fs*3,vmax=g.zmax??Math.max(...series.flatMap(q=>q.d.y)),vmin=Math.min(0,g.zmin??Math.min(...series.flatMap(q=>q.d.y))),ang=i=>-Math.PI/2+i*2*Math.PI/n,rr=v=>(v-vmin)/((vmax-vmin)||1)*R;
    c.strokeStyle=pal.grid;c.fillStyle=pal.mut;c.lineWidth=1;c.textAlign='center';
    for(let k=1;k<=5;k++){c.beginPath();for(let i=0;i<n;i++){const r=R*k/5,x=cx+r*Math.cos(ang(i)),y=cy+r*Math.sin(ang(i));i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.stroke();c.fillText(Mx.fmt(vmin+(vmax-vmin)*k/5,3),cx+3,cy-R*k/5-2)}
    for(let i=0;i<n;i++){const x=cx+R*Math.cos(ang(i)),y=cy+R*Math.sin(ang(i));c.beginPath();c.moveTo(cx,cy);c.lineTo(x,y);c.stroke();const lx=cx+(R+14)*Math.cos(ang(i)),ly=cy+(R+14)*Math.sin(ang(i));c.fillStyle=pal.ink;c.textAlign=Math.abs(Math.cos(ang(i)))<.2?'center':Math.cos(ang(i))>0?'left':'right';c.fillText(String(lc?lc.d[i]??i+1:i+1),lx,ly+4)}
    series.forEach((q,si)=>{const col=q.s.color||PALETTE[si%PALETTE.length],P=q.d.y.map((v,i)=>[cx+rr(v)*Math.cos(ang(i)),cy+rr(v)*Math.sin(ang(i))]);c.strokeStyle=col;c.fillStyle=col;c.lineWidth=q.s.lw??2;c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.globalAlpha=.18;c.fill();c.globalAlpha=1;c.stroke();
      P.forEach((p,i)=>{drawSym(c,'circle',p[0],p[1],3,col);if(live(this))this.hits.push({px:p[0],py:p[1],text:`${q.d.name}: ${Mx.fmt(q.d.y[i])}`,color:col})})});
    if(series.length>1)this.legend(c,{x:0,y:top,w:W-8,h:H},series.map((q,si)=>({label:q.d.name,color:q.s.color||PALETTE[si%PALETTE.length],line:true})),'tr',pal,fs)}
  drawMulti(c,W,H,top){
    const g=this.g,pal=this.p,kids=(g.children||[]).map(id=>this.getGraph&&this.getGraph(id)).filter(k=>k&&k.type!=='multi');
    if(!kids.length)return this.empty(c,W,H,'Multi-panel graph: add graphs in the properties panel.');
    const n=kids.length,cols=Math.max(1,g.pcols||Math.ceil(Math.sqrt(n))),rows=Math.max(1,g.prows||Math.ceil(n/cols)),gap=g.gap??8,cw=(W-gap*(cols+1))/cols,ch=(H-top-gap*(rows))/rows;
    this.sub=this.sub||new Chart(null,null,false);const s=this.sub;s.getSheet=this.getSheet;s.getGraph=this.getGraph;
    let fx_=null;if(g.linkX){let lo=Infinity,hi=-Infinity;kids.forEach(k=>{try{s.g=k;k.series.filter(q=>!q.hide).forEach(q=>{const d=s.sdata(q);d.x.forEach(v=>{if(v<lo)lo=v;if(v>hi)hi=v})})}catch(e){}});if(isFinite(lo)){const pd=(hi-lo)*.03||1;fx_=[lo-pd,hi+pd]}}
    kids.forEach((k,i)=>{const r=Math.floor(i/cols),cc=i%cols;if(r>=rows)return;const x=gap+cc*(cw+gap),y=top+r*(ch+gap);s.g=k;s.forceX=fx_;c.save();c.translate(x,y);c.beginPath();c.rect(0,0,cw,ch);c.clip();s.draw(c,cw,ch,pal,false);c.restore();s.forceX=null;c.strokeStyle=pal.grid;c.lineWidth=1;c.strokeRect(x+.5,y+.5,cw-1,ch-1)});
    this.p=pal}
  // ---------- pie ----------
  drawPie(c,W,H,top){
    const g=this.g,s=g.series[0];if(!s)return this.empty(c,W,H);const d=this.sdata(s),pal=this.p,fs=g.fs||12,sh=this.sheet(),lblCol=s.x!=null&&s.x>=0?sh.cols[s.x]:null;
    const vals=d.y.map(Math.abs),tot=Mx.sum(vals);if(!tot)return this.empty(c,W,H);
    const cx=W/2,cy=(H+top)/2,r=Math.min(W,H-top)/2-fs*3;let a=-Math.PI/2;
    d.y.forEach((v,i)=>{const sw=Math.abs(v)/tot*2*Math.PI,col=PALETTE[i%PALETTE.length];c.fillStyle=col;c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,r,a,a+sw);c.closePath();c.fill();c.strokeStyle=pal.bg;c.lineWidth=2;c.stroke();
      const m=a+sw/2,lx=cx+Math.cos(m)*(r+16),ly=cy+Math.sin(m)*(r+16);c.fillStyle=pal.ink;c.textAlign=Math.cos(m)>0?'left':'right';
      const nm=lblCol?String(lblCol.d[d.rows[i]]??''):'';c.fillText(`${nm?nm+' ':''}${(Math.abs(v)/tot*100).toFixed(1)}%`,lx,ly+4);
      if(live(this))this.hits.push({px:cx+Math.cos(m)*r*.6,py:cy+Math.sin(m)*r*.6,text:`${nm||'Slice '+(i+1)}: ${Mx.fmt(v)} (${(Math.abs(v)/tot*100).toFixed(1)}%)`,color:col});a+=sw});
    if(g.type==='doughnut'){c.fillStyle=pal.bg;c.beginPath();c.arc(cx,cy,r*.55,0,7);c.fill();c.fillStyle=pal.ink;c.textAlign='center';c.font=`600 ${fs+4}px ${this.ff}`;c.fillText(Mx.fmt(tot,5),cx,cy+fs*.4);c.font=`${fs}px ${this.ff}`}}
  // ---------- polar ----------
  drawPolar(c,W,H,top){
    const g=this.g,pal=this.p,fs=g.fs||12,series=g.series.filter(s=>!s.hide).map(s=>({s,d:this.sdata(s)}));if(!series.length||!series[0].d.n)return this.empty(c,W,H);
    const cx=W/2,cy=(H+top)/2,R=Math.min(W,H-top)/2-fs*2.5,rmax=autoRange(0,Math.max(...series.flatMap(q=>q.d.y)),'linear',false,false)[1],k=g.rad?1:Math.PI/180;
    c.strokeStyle=pal.grid;c.fillStyle=pal.mut;c.lineWidth=1;c.textAlign='center';
    for(let i=1;i<=4;i++){c.beginPath();c.arc(cx,cy,R*i/4,0,7);c.stroke();c.fillText(Mx.fmt(rmax*i/4,3),cx+4,cy-R*i/4-2)}
    for(let a=0;a<360;a+=30){const t=a*Math.PI/180;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+R*Math.cos(t),cy-R*Math.sin(t));c.stroke();c.fillText(a+'°',cx+(R+16)*Math.cos(t),cy-(R+16)*Math.sin(t)+4)}
    series.forEach((q,si)=>{const col=q.s.color||PALETTE[si%PALETTE.length],o=q.d.x.map((a,i)=>[cx+q.d.y[i]/rmax*R*Math.cos(a*k),cy-q.d.y[i]/rmax*R*Math.sin(a*k)]);c.strokeStyle=col;c.lineWidth=q.s.lw??2;
      if(g.type==='polar'&&(g.polarLine!==false)){c.beginPath();o.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
      if(g.polarSym)o.forEach(p=>drawSym(c,q.s.symbol||'circle',p[0],p[1],3,col));
      if(live(this))o.forEach((p,i)=>this.hits.push({px:p[0],py:p[1],text:`${q.d.name}  θ=${Mx.fmt(q.d.x[i])}  r=${Mx.fmt(q.d.y[i])}`,color:col}))});
    if(series.length>0)this.legend(c,{x:0,y:top,w:W-8,h:H},series.map((q,si)=>({label:q.d.name,color:q.s.color||PALETTE[si%PALETTE.length],line:true})),'tr',pal,fs)}
  // ---------- heatmap / contour ----------
  drawHeat(c,W,H,top){
    const g=this.g,pal=this.p,fs=g.fs||12,M=this.matrix(),nr=M.z.length,nc=M.xv.length;if(!nr||!nc)return this.empty(c,W,H);
    const dx=nc>1?(M.xv[nc-1]-M.xv[0])/(nc-1):1,dy=nr>1?(M.yv[nr-1]-M.yv[0])/(nr-1):1,v=g.view||{};
    const XD=v.x||[g.xmin??M.xv[0]-dx/2,g.xmax??M.xv[nc-1]+dx/2],YD=v.y||[g.ymin??Math.min(M.yv[0],M.yv[nr-1])-Math.abs(dy)/2,g.ymax??Math.max(M.yv[0],M.yv[nr-1])+Math.abs(dy)/2];
    const mL=60+(g.yl?fs+6:0),mR=g.cbar===false?16:90,pw=W-mL-mR,ph=H-top-fs*2-(g.xl?fs+10:6)-8;if(pw<40||ph<40)return;
    const R={x:mL,y:top,w:pw,h:ph},ax=mkAxis(XD[0],XD[1],'linear',R.x,R.x+R.w),ay=mkAxis(YD[0],YD[1],'linear',R.y+R.h,R.y);this.ax=ax;this.ay=ay;this.HA=ax;this.VA=ay;this.R=R;this.kind='heat';this.hz=false;this.M=M;
    const nm=g.cmap||'viridis',norm=z=>(z-M.zmin)/((M.zmax-M.zmin)||1);
    const edge=(v,i,d)=>{const n=v.length;if(n<2)return[v[i]-.5,v[i]+.5];const lo=i===0?v[0]-(v[1]-v[0])/2:(v[i-1]+v[i])/2,hi=i===n-1?v[n-1]+(v[n-1]-v[n-2])/2:(v[i]+v[i+1])/2;return[lo,hi]};
    c.save();c.beginPath();c.rect(R.x,R.y,R.w,R.h);c.clip();
    if(g.type==='heat'||g.fillmap!==false){for(let r=0;r<nr;r++)for(let k=0;k<nc;k++){const z=M.z[r][k];if(!Number.isFinite(z))continue;const ex=edge(M.xv,k,dx),ey=edge(M.yv,r,dy),x0=ax.map(ex[0]),x1=ax.map(ex[1]),y0=ay.map(ey[0]),y1=ay.map(ey[1]);
      c.fillStyle=cmap(nm,norm(z));c.fillRect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0)+1,Math.abs(y1-y0)+1);if(g.cellLabels&&Math.abs(x1-x0)>28&&Math.abs(y1-y0)>14){c.fillStyle=norm(z)>.55?'#000':'#fff';c.textAlign='center';c.font=`${Math.max(8,fs-2)}px ${this.ff}`;c.fillText(Mx.fmt(z,3),(x0+x1)/2,(y0+y1)/2+4)}}}
    if(g.type==='contour'||g.contour){const L=Math.max(2,g.levels||10);c.lineWidth=1.1;
      for(let l=1;l<L;l++){const lv=M.zmin+(M.zmax-M.zmin)*l/L;c.strokeStyle=g.type==='contour'&&g.fillmap===false?cmap(nm,l/L):pal.ink;c.globalAlpha=g.fillmap===false?1:.55;c.beginPath();let lab=null;
        for(let r=0;r<nr-1;r++)for(let k=0;k<nc-1;k++){const z=[M.z[r][k],M.z[r][k+1],M.z[r+1][k+1],M.z[r+1][k]];if(z.some(a=>!Number.isFinite(a)))continue;
          const P=[[M.xv[k],M.yv[r]],[M.xv[k+1],M.yv[r]],[M.xv[k+1],M.yv[r+1]],[M.xv[k],M.yv[r+1]]],pts=[];
          for(let e=0;e<4;e++){const a=z[e],b=z[(e+1)%4];if((a<lv)!==(b<lv)){const t=(lv-a)/(b-a),p=P[e],q=P[(e+1)%4];pts.push([ax.map(p[0]+(q[0]-p[0])*t),ay.map(p[1]+(q[1]-p[1])*t)])}}
          if(pts.length>=2){if(!lab)lab=pts[0];c.moveTo(pts[0][0],pts[0][1]);c.lineTo(pts[1][0],pts[1][1]);if(pts.length===4){c.moveTo(pts[2][0],pts[2][1]);c.lineTo(pts[3][0],pts[3][1])}}}
        c.stroke();if(g.clabels&&lab){c.globalAlpha=1;c.fillStyle=pal.ink;c.textAlign='center';c.font=`${fs-2}px ${this.ff}`;c.fillText(Mx.fmt(lv,3),lab[0],lab[1]-2)}}c.globalAlpha=1}
    c.restore();
    c.strokeStyle=pal.ink;c.lineWidth=1.2;c.strokeRect(R.x+.5,R.y+.5,R.w,R.h);c.fillStyle=pal.ink;c.font=`${fs}px ${this.ff}`;c.textAlign='center';
    ax.ticks.forEach(t=>{if(t.minor)return;const x=ax.map(t.v);c.beginPath();c.moveTo(x,R.y+R.h);c.lineTo(x,R.y+R.h+5);c.stroke();c.fillText(t.label,x,R.y+R.h+fs+8)});
    c.textAlign='right';ay.ticks.forEach(t=>{if(t.minor)return;const y=ay.map(t.v);c.beginPath();c.moveTo(R.x,y);c.lineTo(R.x-5,y);c.stroke();c.fillText(t.label,R.x-8,y+fs*.35)});
    c.font=`${fs+1}px ${this.ff}`;if(g.xl){c.textAlign='center';c.fillText(g.xl,R.x+R.w/2,H-8)}if(g.yl){c.save();c.translate(14,R.y+R.h/2);c.rotate(-Math.PI/2);c.textAlign='center';c.fillText(g.yl,0,0);c.restore()}
    if(g.cbar!==false){const x=R.x+R.w+16,w=14;for(let i=0;i<R.h;i++){c.fillStyle=cmap(nm,1-i/R.h);c.fillRect(x,R.y+i,w,2)}c.strokeStyle=pal.ink;c.strokeRect(x+.5,R.y+.5,w,R.h);c.fillStyle=pal.ink;c.font=`${fs}px ${this.ff}`;c.textAlign='left';
      const t=niceTicks(M.zmin,M.zmax,5);t.t.forEach(z=>{if(z<M.zmin||z>M.zmax)return;const y=R.y+R.h-(z-M.zmin)/((M.zmax-M.zmin)||1)*R.h;c.beginPath();c.moveTo(x+w,y);c.lineTo(x+w+4,y);c.stroke();c.fillText(fmtTick(z,t.st),x+w+7,y+4)})}
    this.rbDraw(c)}
  // ---------- 3D ----------
  draw3D(c,W,H,top){
    const g=this.g,pal=this.p,fs=g.fs||12,az=(g.az??-50)*Math.PI/180,el=(g.el??25)*Math.PI/180,zoom=g.zoom||1,S=Math.min(W,H-top)*.3*zoom,cx=W/2,cy=(H+top)/2+S*.1;this.kind='3d';
    const proj=(x,y,z)=>{const x1=x*Math.cos(az)-y*Math.sin(az),y1=x*Math.sin(az)+y*Math.cos(az),y2=y1*Math.cos(el)-z*Math.sin(el),z2=y1*Math.sin(el)+z*Math.cos(el);return[cx+x1*S,cy-z2*S,y2]};
    let X,Y,Z,xr,yr,zr,pts=null,quads=null;const nm=g.cmap||'viridis';
    if(g.type==='scat3d'||g.type==='traj3d'){const s=g.series[0];if(!s)return this.empty(c,W,H);const d=this.sdata(s);if(!d.n||!d.z.length)return this.empty(c,W,H,'3D scatter needs X, Y and Z columns.');
      xr=[Math.min(...d.x),Math.max(...d.x)];yr=[Math.min(...d.y),Math.max(...d.y)];const zz=d.z;zr=[Math.min(...zz),Math.max(...zz)];pts=d.x.map((x,i)=>[x,d.y[i],zz[i]])}
    else{const M=this.matrix();if(!M.z.length)return this.empty(c,W,H);xr=[Math.min(...M.xv),Math.max(...M.xv)];yr=[Math.min(...M.yv),Math.max(...M.yv)];zr=[M.zmin,M.zmax];this.M=M;quads=M}
    const nx=v=>(v-xr[0])/((xr[1]-xr[0])||1)*2-1,ny=v=>(v-yr[0])/((yr[1]-yr[0])||1)*2-1,nz=v=>(v-zr[0])/((zr[1]-zr[0])||1)*1.4-.7;
    // box
    const E=[[-1,-1,-.7,1,-1,-.7],[1,-1,-.7,1,1,-.7],[1,1,-.7,-1,1,-.7],[-1,1,-.7,-1,-1,-.7],[-1,-1,.7,1,-1,.7],[1,-1,.7,1,1,.7],[1,1,.7,-1,1,.7],[-1,1,.7,-1,-1,.7],[-1,-1,-.7,-1,-1,.7],[1,-1,-.7,1,-1,.7],[1,1,-.7,1,1,.7],[-1,1,-.7,-1,1,.7]];
    c.strokeStyle=pal.grid;c.lineWidth=1;E.forEach(e=>{const a=proj(e[0],e[1],e[2]),b=proj(e[3],e[4],e[5]);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()});
    // ticks on three edges
    c.fillStyle=pal.mut;c.font=`${fs-1}px ${this.ff}`;c.textAlign='center';
    const tk=(r,fn,lbl)=>{const t=niceTicks(r[0],r[1],4);t.t.forEach(v=>{if(v<r[0]||v>r[1])return;const p=fn(v);c.fillText(fmtTick(v,t.st),p[0],p[1]+(lbl||0))})};
    tk(xr,v=>{const p=proj(nx(v),-1.12,-.7);return p},12);tk(yr,v=>proj(1.12,ny(v),-.7),12);tk(zr,v=>proj(-1.1,-1.1,nz(v)),4);
    c.fillStyle=pal.ink;c.font=`600 ${fs}px ${this.ff}`;let p=proj(0,-1.45,-.7);c.fillText(g.xl||'X',p[0],p[1]+14);p=proj(1.5,0,-.7);c.fillText(g.yl||'Y',p[0],p[1]+14);p=proj(-1.35,-1.35,0);c.fillText(g.zl||'Z',p[0],p[1]);
    if(pts){if(g.type==='traj3d'){c.strokeStyle=g.series[0].color||PALETTE[0];c.lineWidth=2;c.beginPath();pts.forEach((q,i)=>{const r=proj(nx(q[0]),ny(q[1]),nz(q[2]));i?c.lineTo(r[0],r[1]):c.moveTo(r[0],r[1])});c.stroke()}
      const P=pts.map(q=>{const r=proj(nx(q[0]),ny(q[1]),nz(q[2]));return{x:r[0],y:r[1],d:r[2],z:q[2],q}}).sort((a,b)=>b.d-a.d),s=g.series[0],sz=(s.size||6)/2;
      P.forEach(r=>{drawSym(c,s.symbol||'circle',r.x,r.y,sz,g.colorByZ===false?(s.color||PALETTE[0]):cmap(nm,(r.z-zr[0])/((zr[1]-zr[0])||1)));if(live(this))this.hits.push({px:r.x,py:r.y,text:`x=${Mx.fmt(r.q[0])}  y=${Mx.fmt(r.q[1])}  z=${Mx.fmt(r.q[2])}`,color:'#888'})})}
    else if(['bars3d','ribbon3d','wall3d'].includes(g.type)){this.faces3d(c,proj,nx,ny,nz,quads,zr,nm)}
    else{const M=quads,nr=M.z.length,nc=M.xv.length,Q=[];
      for(let r=0;r<nr-1;r++)for(let k=0;k<nc-1;k++){const zs=[M.z[r][k],M.z[r][k+1],M.z[r+1][k+1],M.z[r+1][k]];if(zs.some(a=>!Number.isFinite(a)))continue;
        const cs=[[k,r],[k+1,r],[k+1,r+1],[k,r+1]].map(([kk,rr],i)=>proj(nx(M.xv[kk]),ny(M.yv[rr]),nz(zs[i])));Q.push({cs,d:Mx.mean(cs.map(a=>a[2])),z:Mx.mean(zs)})}
      Q.sort((a,b)=>b.d-a.d);Q.forEach(q=>{c.beginPath();q.cs.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();
        if(g.type!=='wire3d'){c.fillStyle=cmap(nm,(q.z-zr[0])/((zr[1]-zr[0])||1));c.fill()}c.strokeStyle=g.type==='wire3d'?cmap(nm,(q.z-zr[0])/((zr[1]-zr[0])||1)):'rgba(0,0,0,.22)';c.lineWidth=g.type==='wire3d'?1.2:.5;c.stroke()})}
    // colorbar
    const x=W-50,y0=top+20,h=Math.min(200,H-top-60);for(let i=0;i<h;i++){c.fillStyle=cmap(nm,1-i/h);c.fillRect(x,y0+i,12,2)}c.strokeStyle=pal.ink;c.strokeRect(x+.5,y0+.5,12,h);c.fillStyle=pal.ink;c.textAlign='right';c.font=`${fs-1}px ${this.ff}`;c.fillText(fmtTick(zr[1]),x-3,y0+8);c.fillText(fmtTick(zr[0]),x-3,y0+h)}
  rbDraw(c){if(!this.rb)return;const r=this.rb;c.strokeStyle='#2563eb';c.fillStyle='rgba(37,99,235,.12)';c.lineWidth=1;c.setLineDash([4,3]);const x=Math.min(r.x0,r.x1),y=Math.min(r.y0,r.y1),w=Math.abs(r.x1-r.x0),h=Math.abs(r.y1-r.y0);c.fillRect(x,y,w,h);c.strokeRect(x,y,w,h);c.setLineDash([])}
  // ---------- interaction ----------
  pos(e){const b=this.cv.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top]}
  inPlot(x,y){const R=this.R;return R&&x>=R.x&&x<=R.x+R.w&&y>=R.y&&y<=R.y+R.h}
  setView(k,lo,hi){const g=this.g;g.view=g.view||{};g.view[k]=[lo,hi]}
  bind(){
    const cv=this.cv;let drag=null;
    cv.addEventListener('mousedown',e=>{if(!this.g)return;const[x,y]=this.pos(e);
      if(this.kind==='3d'){drag={t:'rot',x,y,az:this.g.az??-50,el:this.g.el??25};return}
      if(this.kind!=='cart'&&this.kind!=='heat')return;
      if(this.mode==='note'&&this.inPlot(x,y)){const t=prompt('Annotation text:');if(t){const hz=this.hz,xv=hz?this.VA.unmap(y):this.ax.unmap(x),yv=hz?this.HA.unmap(x):this.ay.unmap(y);this.g.notes=this.g.notes||[];this.g.notes.push({x:xv,y:yv,text:t});this.render();this.onNote&&this.onNote()}return}
      if(this.mode==='zoom'&&this.inPlot(x,y)){this.rb={x0:x,y0:y,x1:x,y1:y};drag={t:'zoom'};return}
      if((this.mode==='roi'||this.mode==='brush')&&this.inPlot(x,y)&&this.kind==='cart'){this.rb={x0:x,y0:y,x1:x,y1:y};drag={t:this.mode};return}
      if(this.mode==='cursor'&&this.inPlot(x,y)&&this.kind==='cart'){this.cursorClick&&this.cursorClick(x,y);return}
      if(this.legendRect&&this.mode==='pan'&&x>=this.legendRect.x&&x<=this.legendRect.x+this.legendRect.w&&y>=this.legendRect.y&&y<=this.legendRect.y+this.legendRect.h){drag={t:'legend',dx:x-this.legendRect.x,dy:y-this.legendRect.y};return}
      if(this.shapeMouse&&this.shapeMouse(x,y,e,v=>{drag=v}))return;
      drag={t:'pan',x,y,view:this.captureView(),x0:x,y0:y}});
    window.addEventListener('mousemove',e=>{if(!this.g||!drag)return;const[x,y]=this.pos(e);
      if(drag.t==='rot'){this.g.az=drag.az+(x-drag.x)*.5;this.g.el=Math.max(-90,Math.min(90,drag.el+(y-drag.y)*.5));this.render();this.onView&&this.onView();return}
      if(drag.t==='zoom'||drag.t==='roi'||drag.t==='brush'){this.rb.x1=x;this.rb.y1=y;this.render();return}
      if(drag.t==='legend'){const R=this.R;this.g.legendPos={fx:(x-drag.dx-R.x)/R.w,fy:(y-drag.dy-R.y)/R.h};this.render();return}
      if(drag.t==='shape'||drag.t==='shapemove'||drag.t==='movept'){this.shapeDrag&&this.shapeDrag(drag,x,y);return}
      if(drag.t==='pan')this.pan(drag,x,y)});
    window.addEventListener('mouseup',e=>{if(!drag)return;if(drag.t==='pan'&&Math.abs(this.pos(e)[0]-drag.x0)<3&&Math.abs(this.pos(e)[1]-drag.y0)<3){const[cx_,cy_]=this.pos(e);this.clickSelect&&this.clickSelect(cx_,cy_)}
    if(drag.t==='shape'||drag.t==='shapemove'||drag.t==='movept'){this.shapeUp&&this.shapeUp(drag);drag=null;return}
    if((drag.t==='roi'||drag.t==='brush')&&this.rb){const r=this.rb;this.rb=null;this.render();drag.t==='roi'?this.roiDone&&this.roiDone(r):this.brushDone&&this.brushDone(r);drag=null;return}if(drag.t==='zoom'&&this.rb){const r=this.rb,[x,y]=this.pos(e);this.rb=null;if(Math.abs(r.x1-r.x0)>6&&Math.abs(r.y1-r.y0)>6){this.zoomBox(r)}else this.render()}drag=null});
    cv.addEventListener('mousemove',e=>{if(drag)return;this.hover(e)});
    cv.addEventListener('mouseleave',()=>{this.tip.style.display='none'});
    cv.addEventListener('dblclick',()=>{if(!this.g)return;this.g.view=null;this.g.zoom=1;this.render();this.onView&&this.onView()});
    cv.addEventListener('wheel',e=>{if(!this.g)return;e.preventDefault();const[x,y]=this.pos(e),f=e.deltaY>0?1.15:1/1.15;
      if(this.kind==='3d'){this.g.zoom=Math.max(.3,Math.min(4,(this.g.zoom||1)/f));this.render();return}
      if(this.kind!=='cart'&&this.kind!=='heat')return;const R=this.R,inX=x>=R.x-1&&x<=R.x+R.w+1,inY=y>=R.y-1&&y<=R.y+R.h+1;
      const zoomAx=(A,px,key)=>{const t=A.tmap(px),a=t+(A.a-t)*f,b=t+(A.b-t)*f,lo=A.tf.i(a),hi=A.tf.i(b);this.setView(key,Math.min(lo,hi),Math.max(lo,hi))};
      const hKey=this.hz?'y':'x',vKey=this.hz?'x':'y';
      if(inX&&inY||(!inX&&inY)||(inX&&!inY)){if(inX&&(y>R.y+R.h||inY))zoomAx(this.HA,x,hKey);if(inY&&(x<R.x||inX))zoomAx(this.VA,y,vKey)}
      this.render();this.onView&&this.onView()},{passive:false});
  }
  captureView(){return{h:[this.HA?.a,this.HA?.b],v:[this.VA?.a,this.VA?.b]}}
  pan(d,x,y){if(!this.HA||!this.VA)return;const hA=this.HA,vA=this.VA,dxT=(x-d.x)/(hA.p1-hA.p0)*(hA.b-hA.a),dyT=(y-d.y)/(vA.p1-vA.p0)*(vA.b-vA.a);
    const hKey=this.hz?'y':'x',vKey=this.hz?'x':'y',v=d.view,a=hA.tf.i(v.h[0]-dxT),b=hA.tf.i(v.h[1]-dxT),c1=vA.tf.i(v.v[0]-dyT),c2=vA.tf.i(v.v[1]-dyT);
    this.setView(hKey,Math.min(a,b),Math.max(a,b));this.setView(vKey,Math.min(c1,c2),Math.max(c1,c2));
    if(this.ars&&!this.hz&&this.kind==='cart'){d.rv=d.rv||{};Object.entries(this.ars).forEach(([k,r])=>{const dr=(y-d.y)/(r.p1-r.p0)*(r.b-r.a);if(!d.rv[k])d.rv[k]=[r.a,r.b];const lo=r.tf.i(d.rv[k][0]-dr),hi=r.tf.i(d.rv[k][1]-dr);this.setView(k.toLowerCase(),Math.min(lo,hi),Math.max(lo,hi))})}
    this.render();this.onView&&this.onView()}
  zoomBox(r){const hA=this.HA,vA=this.VA,hKey=this.hz?'y':'x',vKey=this.hz?'x':'y',x0=hA.unmap(r.x0),x1=hA.unmap(r.x1),y0=vA.unmap(r.y0),y1=vA.unmap(r.y1);
    this.setView(hKey,Math.min(x0,x1),Math.max(x0,x1));this.setView(vKey,Math.min(y0,y1),Math.max(y0,y1));
    if(this.ars)Object.entries(this.ars).forEach(([k,A_])=>{const a=A_.unmap(r.y0),b=A_.unmap(r.y1);this.setView(k.toLowerCase(),Math.min(a,b),Math.max(a,b))});this.render();this.onView&&this.onView()}
  hover(e){const[x,y]=this.pos(e),tip=this.tip;
    if(this.kind==='heat'&&this.inPlot(x,y)&&this.M){const M=this.M,xv=this.ax.unmap(x),yv=this.ay.unmap(y);let bk=0,br=0,bd=Infinity;M.xv.forEach((v,k)=>{const d=Math.abs(v-xv);if(d<bd){bd=d;bk=k}});bd=Infinity;M.yv.forEach((v,r)=>{const d=Math.abs(v-yv);if(d<bd){bd=d;br=r}});
      tip.style.display='block';tip.textContent=`x=${Mx.fmt(M.xv[bk])}  y=${Mx.fmt(M.yv[br])}  z=${Mx.fmt(M.z[br][bk])}`;tip.style.left=x+14+'px';tip.style.top=y+14+'px';return}
    let best=null,bd=18*18;for(const h of this.hits){const d=(h.px-x)**2+(h.py-y)**2;if(d<bd){bd=d;best=h}}
    if(best){tip.style.display='block';tip.textContent=best.text;tip.style.left=Math.min(best.px+12,this.cv.clientWidth-200)+'px';tip.style.top=best.py-26+'px';tip.style.borderColor=best.color}else tip.style.display='none'}
}
function live(ch){return ch.live}
