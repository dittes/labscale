'use strict';
// Graph-gallery chart types: flow, hierarchy, circular, geochemistry, layout and profile plots.
// Data conventions are documented per type in GALLERY_HELP (shown in Properties ▸ Type options).
const GALLERY_HELP={
  chord:'Edge list: Source and Target label columns plus one Y column of flow values.',
  network:'Edge list: Source and Target label columns plus one Y column of edge weights.',
  edgebundle:'Edge list: Source and Target label columns plus one Y column of weights.',
  alluvial:'Two or more label (L) columns = dimensions; optional Y column = weight (else each row counts 1).',
  sunburst:'One or more label (L) columns = hierarchy levels (outer = last); Y column = size.',
  circpack:'One or more label (L) columns = hierarchy levels; Y column = size.',
  treemap:'One or more label (L) columns = hierarchy levels; Y column = size.',
  spiralbar:'One Y column; each row is one bar placed along a spiral. Optional label column.',
  trellis:'X, Y and a label column giving the panel (group) of each row.',
  cluster:'X, Y and a label column giving the cluster of each row. Convex hulls are drawn around each cluster.',
  ellipse:'X, Y and an optional label column (group). A 95% confidence ellipse is drawn per group.',
  fence:'Several Y columns against X, drawn as offset lines (a 3-D fence).',
  inset:'X and Y; a zoomed inset of the X window below is drawn inside the plot.',
  doublex:'Two Y columns. Series 1 uses the bottom X axis, series 2 uses the top X axis (a second X column if present).',
  streamline:'X column = x position, then three Y columns: y position, u (x-velocity), v (y-velocity).',
  contourprofile:'A matrix sheet (or several columns). Profiles through the crosshair are shown above and to the right.',
  imageprofile:'A matrix sheet holding image intensities. Profiles through the crosshair are shown above and to the right.',
  waterfall:'One Y column of increments (+/−); a final total bar is added. Optional label column.',
  bridge:'One Y column: first row = start total, last row = end total, rows between = increments.',
  hlc:'X plus three Y columns: High, Low, Close.',
  kite:'X = distance along the transect, one Y column per species (abundance).',
  piper:'Six Y columns in this order: Ca, Mg, Na+K, Cl, SO4, HCO3(+CO3) in meq/L or mg/L. Optional label column = group.',
  schoeller:'One Y column per ion; each row is one sample drawn as a line on a log axis.',
  stiff:'Y columns: first half are cations, second half anions (paired by order). One polygon per row (max 12).',
  tetra:'Four Y columns (components); each row is normalised to 100% and plotted inside a tetrahedron.',
  variability:'One Y column and one or two label columns (group, sub-group).',
  corrplot:'Two or more Y columns; shows the correlation matrix as circles (lower) and values (upper).',
  map:'X = longitude, first Y = latitude, optional second Y = value (bubble size / colour). Coarse built-in continent outlines.'};
const gxLabCols=ch=>{const sh=ch.sheet(),ys=new Set(ch.g.series.map(s=>s.y)),xs=new Set(ch.g.series.map(s=>s.x));return sh.cols.map((c,i)=>i).filter(i=>!ys.has(i)&&!xs.has(i)&&(sh.cols[i].des==='L'||sh.cols[i].d.some(v=>typeof v==='string'&&v!=='')))};
const gxCell=(ch,ci,r)=>{const v=ch.sheet().cols[ci]?.d[r];return v==null?'':String(v)};
function gxGroups(ch,d){const g=ch.g,lc=g.labelCol!=null&&g.labelCol>=0?g.labelCol:gxLabCols(ch)[0];if(lc==null)return{names:[''],idx:d.rows.map(()=>0),has:false};const names=[];const idx=d.rows.map(r=>{const k=gxCell(ch,lc,r);let i=names.indexOf(k);if(i<0){i=names.length;names.push(k)}return i});return{names,idx,has:true}}
function gxEdges(ch){const g=ch.g,S=gxSeries(ch),sh=ch.sheet(),a=g.sankeySrc,b=g.sankeyDst;if(!S.length||a==null||b==null||!sh.cols[a]||!sh.cols[b])return null;const d=S[0].d;
  const links=d.rows.map((r,i)=>({s:gxCell(ch,a,r),t:gxCell(ch,b,r),v:Math.abs(d.y[i])})).filter(q=>q.s&&q.t&&q.v>0);return links.length?links:null}
const EDGE_MSG='Needs a Source column, a Target column and a value column (set in Properties ▸ Type options).';
const gcol=i=>PALETTE[i%PALETTE.length],TAU=Math.PI*2;
const pol=(cx,cy,r,a)=>[cx+r*Math.cos(a),cy+r*Math.sin(a)];
function gxText(c,t,x,y,al,col,font){if(font)c.font=font;c.textAlign=al||'left';if(col)c.fillStyle=col;c.fillText(t,x,y)}
function arcBand(c,cx,cy,r0,r1,a0,a1){c.beginPath();c.arc(cx,cy,r1,a0,a1,false);c.arc(cx,cy,r0,a1,a0,true);c.closePath()}
const squareBox=(W,H,top,pad)=>{const s=Math.min(W-2*pad,H-top-pad);return{cx:W/2,cy:top+(H-top)/2,R:s/2}};

// ---- Chord diagram ----
GX.chord=function(c,W,H,top){const L=gxEdges(this);if(!L)return this.empty(c,W,H,EDGE_MSG);this.kind=null;const fs=this.g.fs||12,pal=this.p;
  const nodes=[...new Set(L.flatMap(q=>[q.s,q.t]))],tot=Object.fromEntries(nodes.map(n=>[n,0]));L.forEach(q=>{tot[q.s]+=q.v;tot[q.t]+=q.v});
  const {cx,cy,R}=squareBox(W,H,top,70),r1=R,r0=R-14,gap=.03,sum=Mx.sum(Object.values(tot)),k=(TAU-gap*nodes.length)/sum,pos={};let a=-Math.PI/2;
  nodes.forEach((n,i)=>{const w=tot[n]*k;pos[n]={a0:a,a1:a+w,cur:a,i};c.fillStyle=gcol(i);arcBand(c,cx,cy,r0,r1,a,a+w);c.fill();const m=a+w/2,[lx,ly]=pol(cx,cy,r1+8,m);c.save();c.translate(lx,ly);let rot=m;const flip=Math.cos(m)<0;if(flip)rot+=Math.PI;c.rotate(rot);c.fillStyle=pal.ink;c.font=`${fs}px ${this.ff}`;c.textAlign=flip?'right':'left';c.fillText(n,0,4);c.restore();a+=w+gap});
  L.forEach(q=>{const A=pos[q.s],B=pos[q.t],w=q.v*k,s0=A.cur,t0=B.cur;A.cur+=w;B.cur+=w;const r=r0-2;c.beginPath();c.arc(cx,cy,r,s0,s0+w,false);const[bx,by]=pol(cx,cy,r,t0);c.bezierCurveTo(cx,cy,cx,cy,bx,by);c.arc(cx,cy,r,t0,t0+w,false);const[ex,ey]=pol(cx,cy,r,s0);c.bezierCurveTo(cx,cy,cx,cy,ex,ey);c.closePath();c.fillStyle=gcol(A.i);c.globalAlpha=.45;c.fill();c.globalAlpha=1;c.strokeStyle='#fff';c.lineWidth=.4;c.stroke();
    if(this.live){const[mx,my]=pol(cx,cy,r*.45,(s0+t0)/2);this.hits.push({px:mx,py:my,text:`${q.s} → ${q.t}: ${Mx.fmt(q.v)}`,color:gcol(A.i)})}})};

// ---- Network (force-directed) ----
GX.network=function(c,W,H,top){const L=gxEdges(this);if(!L)return this.empty(c,W,H,EDGE_MSG);this.kind=null;const fs=this.g.fs||12,pal=this.p;
  const nodes=[...new Set(L.flatMap(q=>[q.s,q.t]))],n=nodes.length,id=Object.fromEntries(nodes.map((x,i)=>[x,i])),deg=new Array(n).fill(0);L.forEach(q=>{deg[id[q.s]]++;deg[id[q.t]]++});
  const X=nodes.map((_,i)=>[Math.cos(i/n*TAU)*.5+.001*i,Math.sin(i/n*TAU)*.5]),k=Math.sqrt(1/n)*1.1;let temp=.1;
  for(let it=0;it<250;it++){const D=X.map(()=>[0,0]);for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){let dx=X[i][0]-X[j][0],dy=X[i][1]-X[j][1],d=Math.hypot(dx,dy)||1e-3,f=k*k/d;dx/=d;dy/=d;D[i][0]+=dx*f;D[i][1]+=dy*f;D[j][0]-=dx*f;D[j][1]-=dy*f}
    L.forEach(q=>{const i=id[q.s],j=id[q.t];let dx=X[i][0]-X[j][0],dy=X[i][1]-X[j][1],d=Math.hypot(dx,dy)||1e-3,f=d*d/k;dx/=d;dy/=d;D[i][0]-=dx*f;D[i][1]-=dy*f;D[j][0]+=dx*f;D[j][1]+=dy*f});
    for(let i=0;i<n;i++){const d=Math.hypot(D[i][0],D[i][1])||1;X[i][0]+=D[i][0]/d*Math.min(d,temp);X[i][1]+=D[i][1]/d*Math.min(d,temp)}temp*=.985}
  const xs=X.map(p=>p[0]),ys=X.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),pad=60,sx=(W-2*pad)/((x1-x0)||1),sy=(H-top-2*pad)/((y1-y0)||1),s=Math.min(sx,sy),ox=W/2-(x0+x1)/2*s,oy=top+(H-top)/2-(y0+y1)/2*s,P=X.map(p=>[p[0]*s+ox,p[1]*s+oy]),vmax=Math.max(...L.map(q=>q.v));
  L.forEach(q=>{const a=P[id[q.s]],b=P[id[q.t]];c.strokeStyle=pal.ink;c.globalAlpha=.35;c.lineWidth=.6+3.4*q.v/vmax;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();c.globalAlpha=1;if(this.live)this.hits.push({px:(a[0]+b[0])/2,py:(a[1]+b[1])/2,text:`${q.s} – ${q.t}: ${Mx.fmt(q.v)}`,color:'#888'})});
  nodes.forEach((nm,i)=>{const r=5+Math.sqrt(deg[i])*3;c.fillStyle=gcol(i);c.beginPath();c.arc(P[i][0],P[i][1],r,0,TAU);c.fill();c.strokeStyle='#fff';c.lineWidth=1.2;c.stroke();gxText(c,nm,P[i][0],P[i][1]-r-4,'center',pal.ink,`${fs}px ${this.ff}`)})};

// ---- Hierarchical edge bundling ----
GX.edgebundle=function(c,W,H,top){const L=gxEdges(this);if(!L)return this.empty(c,W,H,EDGE_MSG);this.kind=null;const fs=this.g.fs||12,pal=this.p;
  const nodes=[...new Set(L.flatMap(q=>[q.s,q.t]))],{cx,cy,R}=squareBox(W,H,top,80),ang=nodes.map((_,i)=>-Math.PI/2+i/nodes.length*TAU),id=Object.fromEntries(nodes.map((x,i)=>[x,i])),beta=this.g.beta??.85,vmax=Math.max(...L.map(q=>q.v));
  L.forEach(q=>{const i=id[q.s],j=id[q.t],[ax,ay]=pol(cx,cy,R,ang[i]),[bx,by]=pol(cx,cy,R,ang[j]),k=1-beta;c.strokeStyle=gcol(i);c.globalAlpha=.55;c.lineWidth=.6+2.4*q.v/vmax;c.beginPath();c.moveTo(ax,ay);c.bezierCurveTo(cx+(ax-cx)*k,cy+(ay-cy)*k,cx+(bx-cx)*k,cy+(by-cy)*k,bx,by);c.stroke();c.globalAlpha=1;if(this.live)this.hits.push({px:(ax+bx)/2*.5+cx*.5,py:(ay+by)/2*.5+cy*.5,text:`${q.s} → ${q.t}: ${Mx.fmt(q.v)}`,color:gcol(i)})});
  nodes.forEach((n,i)=>{const[x,y]=pol(cx,cy,R,ang[i]);c.fillStyle=gcol(i);c.beginPath();c.arc(x,y,4,0,TAU);c.fill();const flip=Math.cos(ang[i])<0;c.save();const[lx,ly]=pol(cx,cy,R+10,ang[i]);c.translate(lx,ly);c.rotate(ang[i]+(flip?Math.PI:0));c.fillStyle=pal.ink;c.font=`${fs}px ${this.ff}`;c.textAlign=flip?'right':'left';c.fillText(n,0,4);c.restore()})};

// ---- Alluvial ----
GX.alluvial=function(c,W,H,top){const sh=this.sheet(),S=gxSeries(this),lc=gxLabCols(this).slice(0,6),fs=this.g.fs||12,pal=this.p;if(lc.length<2)return this.empty(c,W,H,'Needs two or more label (L) columns as dimensions.');this.kind=null;
  const nr=Math.max(...lc.map(i=>sh.cols[i].d.length)),w=S.length?new Map(S[0].d.rows.map((r,i)=>[r,Math.abs(S[0].d.y[i])])):null,rows=[];for(let r=0;r<nr;r++){const key=lc.map(i=>gxCell(this,i,r));if(key.some(k=>!k))continue;const v=w?w.get(r):1;if(v>0)rows.push({key,v})}
  if(!rows.length)return this.empty(c,W,H);const D=lc.length,cats=lc.map((_,k)=>[...new Set(rows.map(q=>q.key[k]))]),tot=Mx.sum(rows.map(q=>q.v)),x0=30,x1=W-100,nw=14,t0=top+26,hh=H-t0-24,gap=8,sc=Math.min(...cats.map(cl=>(hh-(cl.length-1)*gap)/tot)),node=[];
  cats.forEach((cl,k)=>{const x=x0+(x1-x0-nw)*(D>1?k/(D-1):0);let y=t0;node[k]={};cl.forEach(nm=>{const v=Mx.sum(rows.filter(q=>q.key[k]===nm).map(q=>q.v));node[k][nm]={x,y,h:v*sc,o:0,i:0,v};y+=v*sc+gap})});
  const firstIdx=Object.fromEntries(cats[0].map((n,i)=>[n,i]));
  for(let k=0;k<D-1;k++){const agg=new Map();rows.forEach(q=>{const kk=q.key[k]+'\u0001'+q.key[k+1]+'\u0001'+q.key[0];agg.set(kk,(agg.get(kk)||0)+q.v)});
    [...agg.entries()].sort((a,b)=>{const[a1,a2]=a[0].split('\u0001'),[b1,b2]=b[0].split('\u0001');return cats[k].indexOf(a1)-cats[k].indexOf(b1)||cats[k+1].indexOf(a2)-cats[k+1].indexOf(b2)}).forEach(([key,v])=>{const[s,t,f]=key.split('\u0001'),A=node[k][s],B=node[k+1][t],h=v*sc,ya=A.y+A.o,yb=B.y+B.i;A.o+=h;B.i+=h;const xa=A.x+nw,xb=B.x,mx=(xa+xb)/2;c.beginPath();c.moveTo(xa,ya);c.bezierCurveTo(mx,ya,mx,yb,xb,yb);c.lineTo(xb,yb+h);c.bezierCurveTo(mx,yb+h,mx,ya+h,xa,ya+h);c.closePath();c.fillStyle=gcol(firstIdx[f]);c.globalAlpha=.42;c.fill();c.globalAlpha=1;if(this.live)this.hits.push({px:mx,py:(ya+yb)/2+h/2,text:`${s} → ${t}: ${Mx.fmt(v)}`,color:gcol(firstIdx[f])})})}
  cats.forEach((cl,k)=>{cl.forEach(nm=>{const p=node[k][nm];c.fillStyle=pal.ink;c.fillRect(p.x,p.y,nw,Math.max(2,p.h));c.fillStyle=pal.ink;c.font=`${fs}px ${this.ff}`;c.textAlign=k===D-1?'left':'left';c.fillText(`${nm}`,p.x+nw+4,p.y+Math.max(2,p.h)/2+4)});c.font=`bold ${fs}px ${this.ff}`;c.fillStyle=pal.mut;c.textAlign='left';c.fillText(sh.cols[lc[k]].name||'',node[k][cats[k][0]].x,top+8)})};

// ---- hierarchy helpers ----
function gxTree(ch){const S=gxSeries(ch),sh=ch.sheet(),lc=gxLabCols(ch);if(!S.length||!lc.length)return null;const root={name:'',children:new Map(),v:0},d=S[0].d;
  d.rows.forEach((r,i)=>{let n=root;lc.forEach(ci=>{const k=gxCell(ch,ci,r);if(!k)return;if(!n.children.has(k))n.children.set(k,{name:k,children:new Map(),v:0});n=n.children.get(k)});n.v+=Math.abs(d.y[i])});
  const fin=(n,dp)=>{n.kids=[...n.children.values()];n.depth=dp;n.kids.forEach(k=>fin(k,dp+1));n.value=Mx.sum(n.kids.map(k=>k.value))+n.v;n.maxd=n.kids.length?Math.max(...n.kids.map(k=>k.maxd)):dp;return n};fin(root,0);return root.value>0?root:null}
const HIER_MSG='Needs one or more label (L) columns for the hierarchy and a Y column of sizes.';
GX.sunburst=function(c,W,H,top){const root=gxTree(this);if(!root)return this.empty(c,W,H,HIER_MSG);this.kind=null;const fs=this.g.fs||12,pal=this.p,{cx,cy,R}=squareBox(W,H,top,20),D=root.maxd,r0=R*.14,rw=(R-r0)/D;
  const draw=(n,a0,a1,ci)=>{n.kids.forEach((k,i)=>{const w=(a1-a0)*k.value/n.value,col=n.depth===0?gcol(i):ci;const rI=r0+(k.depth-1)*rw,rO=rI+rw;arcBand(c,cx,cy,rI,rO,a0,a0+w);c.fillStyle=col;c.globalAlpha=1-.12*(k.depth-1);c.fill();c.globalAlpha=1;c.strokeStyle='#fff';c.lineWidth=1;c.stroke();
    const m=a0+w/2,arcLen=w*(rI+rw/2);if(arcLen>fs*1.4&&rw>fs*2){c.save();const[x,y]=pol(cx,cy,rI+rw/2,m);c.translate(x,y);let rot=m+Math.PI/2;if(Math.sin(m)<0&&false)rot+=Math.PI;c.rotate(Math.cos(m)<0&&Math.abs(Math.sin(m))<.01?rot:rot-Math.PI/2+(Math.cos(m)<0?Math.PI:0));c.fillStyle='#fff';c.font=`${fs-1}px ${this.ff}`;c.textAlign='center';let t=k.name;while(t.length>2&&c.measureText(t).width>rw*.95)t=t.slice(0,-1);c.fillText(t,0,4);c.restore()}
    if(this.live){const[x,y]=pol(cx,cy,rI+rw/2,m);this.hits.push({px:x,py:y,text:`${k.name}: ${Mx.fmt(k.value)}`,color:col})}draw(k,a0,a0+w,col);a0+=w})};
  draw(root,-Math.PI/2,-Math.PI/2+TAU,'#999')};
function packLayout(n){if(!n.kids.length){n.R=Math.sqrt(n.value);n.P=[];return}n.kids.forEach(packLayout);const ks=n.kids.slice().sort((a,b)=>b.R-a.R),P=[];
  ks.forEach((k,i)=>{const r=k.R;if(!i){P.push({k,x:0,y:0,r});return}let best=null;for(const q of P){for(let a=0;a<48;a++){const t=a/48*TAU,x=q.x+(q.r+r)*Math.cos(t)*1.02,y=q.y+(q.r+r)*Math.sin(t)*1.02;if(P.every(o=>Math.hypot(o.x-x,o.y-y)>=o.r+r)){const d=Math.hypot(x,y)+r;if(!best||d<best.d)best={x,y,d}}}}P.push({k,x:best.x,y:best.y,r})});
  let cx=0,cy=0,w=0;P.forEach(p=>{cx+=p.x*p.r*p.r;cy+=p.y*p.r*p.r;w+=p.r*p.r});cx/=w;cy/=w;P.forEach(p=>{p.x-=cx;p.y-=cy});n.R=Math.max(...P.map(p=>Math.hypot(p.x,p.y)+p.r))*1.04;n.P=P}
GX.circpack=function(c,W,H,top){const root=gxTree(this);if(!root)return this.empty(c,W,H,HIER_MSG);this.kind=null;const fs=this.g.fs||12,pal=this.p;packLayout(root);const{cx,cy,R}=squareBox(W,H,top,20),s=R/root.R;
  const draw=(n,x,y,ci)=>{n.P.forEach((p,i)=>{const k=p.k,X=x+p.x*s,Y=y+p.y*s,r=p.r*s,col=n.depth===0?gcol(i):ci;c.beginPath();c.arc(X,Y,r,0,TAU);c.fillStyle=col;c.globalAlpha=k.kids.length?.18+.04*k.depth:.75;c.fill();c.globalAlpha=1;c.strokeStyle=col;c.lineWidth=1;c.stroke();
    if(!k.kids.length){if(r>fs*1.1){let t=k.name;c.font=`${fs-2}px ${this.ff}`;while(t.length>2&&c.measureText(t).width>r*1.8)t=t.slice(0,-1);gxText(c,t,X,Y+3,'center','#fff')}if(this.live)this.hits.push({px:X,py:Y,text:`${k.name}: ${Mx.fmt(k.value)}`,color:col})}else draw(k,X,Y,col)})};
  draw(root,cx,cy,'#999')};
GX.treemap=function(c,W,H,top){const root=gxTree(this);if(!root)return this.empty(c,W,H,HIER_MSG);this.kind=null;const fs=this.g.fs||12;
  const lay=(kids,x,y,w,h)=>{const arr=kids.slice().sort((a,b)=>b.value-a.value),tot=Mx.sum(arr.map(k=>k.value));let rest=arr.slice(),X=x,Y=y,Wd=w,Hd=h,scale=Wd*Hd/tot;
    while(rest.length){const short=Math.min(Wd,Hd);let row=[],best=Infinity,sum=0;for(let i=0;i<rest.length;i++){const t=[...row,rest[i]],s=sum+rest[i].value*scale,worst=Math.max(...t.map(k=>{const a=k.value*scale;return Math.max(short*short*a/(s*s),s*s/(short*short*a))}));if(worst<=best||!row.length){row=t;sum=s;best=worst}else break}
      const horiz=Wd>=Hd,th=sum/short;let off=0;row.forEach(k=>{const a=k.value*scale,len=a/th;k.rx=horiz?X:X+off;k.ry=horiz?Y+off:Y;k.rw=horiz?th:len;k.rh=horiz?len:th;off+=len});rest=rest.slice(row.length);if(horiz){X+=th;Wd-=th}else{Y+=th;Hd-=th}}};
  const place=(n,x,y,w,h)=>{lay(n.kids,x,y,w,h);n.kids.forEach(k=>{if(k.kids.length)place(k,k.rx+3,k.ry+14,Math.max(1,k.rw-6),Math.max(1,k.rh-17))})};place(root,10,top+4,W-20,H-top-14);
  const draw=(n,ci)=>n.kids.forEach((k,i)=>{const col=n.depth===0?gcol(i):ci;c.fillStyle=col;c.globalAlpha=k.kids.length?.2:.8;c.fillRect(k.rx,k.ry,k.rw,k.rh);c.globalAlpha=1;c.strokeStyle='#fff';c.lineWidth=1.5;c.strokeRect(k.rx,k.ry,k.rw,k.rh);
    if(k.rw>fs*3&&k.rh>fs+2){let t=k.name;c.font=`${fs-1}px ${this.ff}`;while(t.length>2&&c.measureText(t).width>k.rw-6)t=t.slice(0,-1);gxText(c,t,k.rx+4,k.ry+fs,'left',k.kids.length?this.p.ink:'#fff')}if(this.live&&!k.kids.length)this.hits.push({px:k.rx+k.rw/2,py:k.ry+k.rh/2,text:`${k.name}: ${Mx.fmt(k.value)}`,color:col});draw(k,col)});draw(root,'#999')};

// ---- Spiral bar ----
GX.spiralbar=function(c,W,H,top){const S=gxSeries(this);if(!S.length)return this.empty(c,W,H);this.kind=null;const g=this.g,fs=g.fs||12,pal=this.p,d=S[0].d,n=d.n,lab=gxLabels(this,d),{cx,cy,R}=squareBox(W,H,top,30),turns=g.turns>0?g.turns:Math.max(1,Math.ceil(n/20)),r0=R*.12,pitch=(R-r0)/(turns+1),vmax=Math.max(...d.y.map(Math.abs))||1,nm=g.cmap||'viridis',step=Math.ceil(n/24);
  d.y.forEach((v,i)=>{const th=i/n*turns*TAU,a=th-Math.PI/2,rb=r0+pitch*th/TAU,len=Math.abs(v)/vmax*pitch*.95,da=TAU/(n/turns)*.4;c.beginPath();c.arc(cx,cy,rb+len,a-da,a+da,false);c.arc(cx,cy,rb,a+da,a-da,true);c.closePath();c.fillStyle=cmap(nm,Math.abs(v)/vmax);c.fill();
    if(i%step===0){const[x,y]=pol(cx,cy,rb-4,a);c.fillStyle=pal.mut;c.font=`${fs-3}px ${this.ff}`;c.textAlign='center';c.fillText(lab[i],x,y+3)}if(this.live){const[x,y]=pol(cx,cy,rb+len/2,a);this.hits.push({px:x,py:y,text:`${lab[i]}: ${Mx.fmt(v)}`,color:cmap(nm,Math.abs(v)/vmax)})}})};

// ---- Trellis / Cluster / Ellipse ----
GX.trellis=function(c,W,H,top){const S=gxSeries(this);if(!S.length)return this.empty(c,W,H);const d=S[0].d,gr=gxGroups(this,d);if(!gr.has)return this.empty(c,W,H,'Needs a label column giving the panel of each row.');this.kind=null;
  const n=gr.names.length,cols=Math.ceil(Math.sqrt(n*W/(H-top))),rows=Math.ceil(n/cols),pw=W/cols,ph=(H-top)/rows,xl=Math.min(...d.x),xh=Math.max(...d.x),yl=Math.min(...d.y),yh=Math.max(...d.y),px=(xh-xl)*.05||1,py=(yh-yl)*.08||1,sym=this.g.series[0].symbol||'circle';
  gr.names.forEach((nm,k)=>{const col=k%cols,row=Math.floor(k/cols);c.save();c.translate(col*pw,top+row*ph);gxFrame(this,c,pw,ph,18,{xd:[xl-px,xh+px],yd:[yl-py,yh+py],xl:row===rows-1?this.g.xl:'',yl:col===0?this.g.yl:'',draw:({ax,ay})=>{d.x.forEach((x,i)=>{if(gr.idx[i]===k)drawSym(c,sym,ax.map(x),ay.map(d.y[i]),3.5,gcol(k))})}});c.fillStyle=this.p.ink;c.font=`bold ${(this.g.fs||12)}px ${this.ff}`;c.textAlign='center';c.fillText(nm,pw/2,12);c.restore()});this.kind=null};
function hull(P){P=P.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(P.length<3)return P;const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];P.forEach(p=>{while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)});for(let i=P.length-1;i>=0;i--){const p=P[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}lo.pop();up.pop();return lo.concat(up)}
function ellipsePts(P,conf){const n=P.length;if(n<3)return null;const mx=Mx.mean(P.map(p=>p[0])),my=Mx.mean(P.map(p=>p[1]));let sxx=0,syy=0,sxy=0;P.forEach(p=>{sxx+=(p[0]-mx)**2;syy+=(p[1]-my)**2;sxy+=(p[0]-mx)*(p[1]-my)});sxx/=n-1;syy/=n-1;sxy/=n-1;
  const tr=sxx+syy,det=sxx*syy-sxy*sxy,disc=Math.sqrt(Math.max(0,tr*tr/4-det)),l1=tr/2+disc,l2=Math.max(0,tr/2-disc),th=.5*Math.atan2(2*sxy,sxx-syy),k=-2*Math.log(1-conf),a=Math.sqrt(k*l1),b=Math.sqrt(k*l2),pts=[];
  for(let i=0;i<=64;i++){const t=i/64*TAU,x=a*Math.cos(t),y=b*Math.sin(t);pts.push([mx+x*Math.cos(th)-y*Math.sin(th),my+x*Math.sin(th)+y*Math.cos(th)])}return pts}
function groupPlot(ch,c,W,H,top,mode){const S=gxSeries(ch);if(!S.length)return ch.empty(c,W,H);const g=ch.g,d=S[0].d,gr=gxGroups(ch,d);ch.kind=null;
  const xl=Math.min(...d.x),xh=Math.max(...d.x),yl=Math.min(...d.y),yh=Math.max(...d.y),px=(xh-xl)*.08||1,py=(yh-yl)*.08||1,sym=g.series[0].symbol||'circle',polys=[];
  gr.names.forEach((nm,k)=>{const P=d.x.map((x,i)=>gr.idx[i]===k?[x,d.y[i]]:null).filter(Boolean);polys.push(mode==='cluster'?hull(P):ellipsePts(P,g.conf||.95))});
  gxFrame(ch,c,W,H,top,{xd:[xl-px,xh+px],yd:[yl-py,yh+py],xl:g.xl,yl:g.yl,draw:({ax,ay})=>{polys.forEach((pg,k)=>{if(!pg||pg.length<3)return;c.beginPath();pg.forEach((p,i)=>i?c.lineTo(ax.map(p[0]),ay.map(p[1])):c.moveTo(ax.map(p[0]),ay.map(p[1])));c.closePath();c.fillStyle=gcol(k);c.globalAlpha=.16;c.fill();c.globalAlpha=1;c.strokeStyle=gcol(k);c.lineWidth=1.6;c.stroke()});
    d.x.forEach((x,i)=>drawSym(c,sym,ax.map(x),ay.map(d.y[i]),3.6,gcol(gr.idx[i])))}});
  if(gr.has&&gr.names.length>1){c.font=`${g.fs||12}px ${ch.ff}`;let y=top+18;const x=W-120;gr.names.forEach((nm,k)=>{c.fillStyle=gcol(k);c.fillRect(x,y-8,10,10);c.fillStyle=ch.p.ink;c.textAlign='left';c.fillText(nm,x+14,y+1);y+=16})}}
GX.cluster=function(c,W,H,top){groupPlot(this,c,W,H,top,'cluster')};
GX.ellipse=function(c,W,H,top){groupPlot(this,c,W,H,top,'ellipse')};

// ---- Fence ----
GX.fence=function(c,W,H,top){const S=gxSeries(this);if(!S.length)return this.empty(c,W,H);this.kind=null;const g=this.g,n=S.length,all=S.flatMap(q=>q.d.y),all2=S.flatMap(q=>q.d.x),ylo=Math.min(0,...all),yhi=Math.max(...all),xlo=Math.min(...all2),xhi=Math.max(...all2),sy=(yhi-ylo)*.35/Math.max(1,n-1)*Math.min(n-1,4)/Math.max(1,Math.min(n-1,4)),dy=(yhi-ylo)*(g.fenceDy??.3),dx=(xhi-xlo)*(g.fenceDx??.12);
  gxFrame(this,c,W,H,top,{xd:[xlo,xhi+dx],yd:[ylo,yhi+dy],xl:g.xl,yl:g.yl,draw:({ax,ay})=>{for(let k=n-1;k>=0;k--){const q=S[k],o=n>1?k/(n-1):0,ox=dx*o,oy=dy*o,col=gxCol(q,k);c.beginPath();q.d.x.forEach((x,i)=>i?c.lineTo(ax.map(x+ox),ay.map(q.d.y[i]+oy)):c.moveTo(ax.map(x+ox),ay.map(q.d.y[i]+oy)));c.lineTo(ax.map(q.d.x[q.d.n-1]+ox),ay.map(ylo+oy));c.lineTo(ax.map(q.d.x[0]+ox),ay.map(ylo+oy));c.closePath();c.fillStyle=this.p.bg||'#fff';c.fill();c.globalAlpha=.25;c.fillStyle=col;c.fill();c.globalAlpha=1;
    c.beginPath();q.d.x.forEach((x,i)=>i?c.lineTo(ax.map(x+ox),ay.map(q.d.y[i]+oy)):c.moveTo(ax.map(x+ox),ay.map(q.d.y[i]+oy)));c.strokeStyle=col;c.lineWidth=q.s.lw||1.8;c.stroke()}}})};

// ---- Inset ----
GX.inset=function(c,W,H,top){const S=gxSeries(this);if(!S.length)return this.empty(c,W,H);this.kind=null;const g=this.g,all=S.flatMap(q=>q.d.x),ally=S.flatMap(q=>q.d.y),xlo=Math.min(...all),xhi=Math.max(...all),ylo=Math.min(...ally),yhi=Math.max(...ally),px=(xhi-xlo)*.04||1,py=(yhi-ylo)*.06||1,x0=g.ix0??xlo+(xhi-xlo)*.4,x1=g.ix1??xlo+(xhi-xlo)*.6,fs=g.fs||12;
  const plot=(q,k,mx,my,clip)=>{c.beginPath();let on=false;q.d.x.forEach((x,i)=>{if(clip&&(x<clip[0]||x>clip[1])){on=false;return}const X=mx(x),Y=my(q.d.y[i]);on?c.lineTo(X,Y):c.moveTo(X,Y);on=true});c.strokeStyle=gxCol(q,k);c.lineWidth=q.s.lw||1.8;c.stroke()};
  const fr=gxFrame(this,c,W,H,top,{xd:[xlo-px,xhi+px],yd:[ylo-py,yhi+py],xl:g.xl,yl:g.yl,draw:({R,ax,ay})=>{S.forEach((q,k)=>plot(q,k,ax.map,ay.map));c.strokeStyle='#e11d48';c.setLineDash([4,3]);c.lineWidth=1.2;c.strokeRect(ax.map(x0),R.y+2,ax.map(x1)-ax.map(x0),R.h-4);c.setLineDash([])}});
  const R=fr.R,iw=R.w*.42,ih=R.h*.42,ix=R.x+R.w-iw-12,iy=R.y+12,sub=S.map(q=>q.d.y.filter((_,i)=>q.d.x[i]>=x0&&q.d.x[i]<=x1)).flat(),slo=Math.min(...sub),shi=Math.max(...sub),sp=(shi-slo)*.08||1;
  c.fillStyle=this.p.bg||'#fff';c.fillRect(ix,iy,iw,ih);c.save();c.beginPath();c.rect(ix,iy,iw,ih);c.clip();const mx=x=>ix+(x-x0)/(x1-x0||1)*iw,my=y=>iy+ih-(y-(slo-sp))/((shi+sp)-(slo-sp)||1)*ih;S.forEach((q,k)=>plot(q,k,mx,my,[x0,x1]));c.restore();c.strokeStyle='#e11d48';c.lineWidth=1.4;c.strokeRect(ix,iy,iw,ih);
  c.fillStyle=this.p.ink;c.font=`${fs-2}px ${this.ff}`;c.textAlign='left';c.fillText(Mx.fmt(x0,4),ix,iy+ih+fs);c.textAlign='right';c.fillText(Mx.fmt(x1,4),ix+iw,iy+ih+fs);c.fillText(Mx.fmt(shi+sp,4),ix-3,iy+fs*.7);c.fillText(Mx.fmt(slo-sp,4),ix-3,iy+ih)};

// ---- Double-X ----
GX.doublex=function(c,W,H,top){const S=gxSeries(this);if(S.length<2)return this.empty(c,W,H,'Select two Y columns (series 2 uses the top X axis).');this.kind=null;const g=this.g,[A,B]=S,ylo=Math.min(...A.d.y,...B.d.y),yhi=Math.max(...A.d.y,...B.d.y),py=(yhi-ylo)*.06||1,a0=Math.min(...A.d.x),a1=Math.max(...A.d.x),b0=Math.min(...B.d.x),b1=Math.max(...B.d.x),pa=(a1-a0)*.03||1,pb=(b1-b0)*.03||1;
  const fr=gxFrame(this,c,W,H,top+22,{xd:[a0-pa,a1+pa],yd:[ylo-py,yhi+py],xl:g.xl,yl:g.yl,draw:({R,ax,ay})=>{const tm=x=>R.x+(x-(b0-pb))/((b1+pb)-(b0-pb))*R.w;[[A,0,ax.map],[B,1,tm]].forEach(([q,k,m])=>{c.beginPath();q.d.x.forEach((x,i)=>i?c.lineTo(m(x),ay.map(q.d.y[i])):c.moveTo(m(x),ay.map(q.d.y[i])));c.strokeStyle=gxCol(q,k);c.lineWidth=q.s.lw||1.8;c.stroke();q.d.x.forEach((x,i)=>drawSym(c,q.s.symbol||'circle',m(x),ay.map(q.d.y[i]),3.2,gxCol(q,k)))})}});
  const R=fr.R,tax=mkAxis(b0-pb,b1+pb,'linear',R.x,R.x+R.w),fs=g.fs||12;c.strokeStyle=gcol(1);c.fillStyle=gcol(1);c.lineWidth=1.2;c.textAlign='center';c.font=`${fs}px ${this.ff}`;tax.ticks.forEach(t=>{if(t.minor)return;const x=tax.map(t.v);c.beginPath();c.moveTo(x,R.y);c.lineTo(x,R.y-6);c.stroke();c.fillText(t.label,x,R.y-9)});
  c.font=`${fs+1}px ${this.ff}`;c.fillStyle=gcol(1);c.fillText(g.xl2||(B.s.label||'Top axis'),R.x+R.w/2,R.y-fs-12)};

// ---- Streamlines ----
GX.streamline=function(c,W,H,top){const S=gxSeries(this);if(S.length<3)return this.empty(c,W,H,'Select X plus three Y columns: y position, u, v.');this.kind=null;const g=this.g,fs=g.fs||12,px=S[0].d.x,py=S[0].d.y,m=new Map(S[1].d.rows.map((r,i)=>[r,S[1].d.y[i]])),mv=new Map(S[2].d.rows.map((r,i)=>[r,S[2].d.y[i]])),pts=S[0].d.rows.map((r,i)=>m.has(r)&&mv.has(r)?{x:px[i],y:py[i],u:m.get(r),v:mv.get(r)}:null).filter(Boolean);if(pts.length<4)return this.empty(c,W,H);
  const xl=Math.min(...pts.map(p=>p.x)),xh=Math.max(...pts.map(p=>p.x)),yl=Math.min(...pts.map(p=>p.y)),yh=Math.max(...pts.map(p=>p.y)),sx=xh-xl||1,sy=yh-yl||1,K=Math.min(8,pts.length);
  const field=(x,y)=>{const d=pts.map(p=>({p,d:((p.x-x)/sx)**2+((p.y-y)/sy)**2})).sort((a,b)=>a.d-b.d).slice(0,K);let w=0,u=0,v=0;d.forEach(q=>{const k=1/(q.d+1e-6);w+=k;u+=k*q.p.u;v+=k*q.p.v});return[u/w,v/w]};
  const sp=pts.map(p=>Math.hypot(p.u,p.v)),smax=Math.max(...sp)||1,nm=g.cmap||'viridis',N=g.seeds||16,lines=[];
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x0=xl+sx*(i+.5)/N,y0=yl+sy*(j+.5)/N,tr=[];for(const dir of[1,-1]){let x=x0,y=y0;const arr=[];for(let s=0;s<120;s++){const[u,v]=field(x,y),mag=Math.hypot(u,v);if(mag<smax*.02)break;const h=dir*Math.min(sx,sy)*.012,[u2,v2]=field(x+u/mag*h/2,y+v/mag*h/2),m2=Math.hypot(u2,v2)||1;x+=u2/m2*h;y+=v2/m2*h;if(x<xl||x>xh||y<yl||y>yh)break;arr.push([x,y,mag])}tr.push(arr)}
    const line=[...tr[1].reverse(),[x0,y0,Math.hypot(...field(x0,y0))],...tr[0]];if(line.length>6)lines.push(line)}
  gxFrame(this,c,W,H,top,{xd:[xl-sx*.02,xh+sx*.02],yd:[yl-sy*.02,yh+sy*.02],xl:g.xl,yl:g.yl,draw:({ax,ay})=>{c.lineWidth=1.1;lines.forEach(ln=>{c.beginPath();ln.forEach((p,i)=>i?c.lineTo(ax.map(p[0]),ay.map(p[1])):c.moveTo(ax.map(p[0]),ay.map(p[1])));c.strokeStyle=cmap(nm,ln[Math.floor(ln.length/2)][2]/smax);c.globalAlpha=.8;c.stroke();c.globalAlpha=1;
    const i=Math.floor(ln.length/2),a=ln[i],b=ln[Math.min(ln.length-1,i+1)],X=ax.map(a[0]),Y=ay.map(a[1]),th=Math.atan2(ay.map(b[1])-Y,ax.map(b[0])-X);c.fillStyle=cmap(nm,a[2]/smax);c.beginPath();c.moveTo(X+5*Math.cos(th),Y+5*Math.sin(th));c.lineTo(X+3*Math.cos(th+2.5),Y+3*Math.sin(th+2.5));c.lineTo(X+3*Math.cos(th-2.5),Y+3*Math.sin(th-2.5));c.closePath();c.fill()})}})};

// ---- Contour / image profile ----
function profilePlot(ch,c,W,H,top,img){const g=ch.g,fs=g.fs||12,pal=ch.p;if(img){g.cmap=g.cmap||'gray';g.contour=false;g.fillmap=true}else{g.contour=true;g.fillmap=true}g.cbar=false;const PH=70,PW=80;
  ch.drawHeat(c,W-PW-10,H,top+PH+8);const R=ch.R,M=ch.M,ax=ch.ax,ay=ch.ay;if(!R||!M)return;ch.kind=null;
  const px=g.profX??M.xv[Math.floor(M.xv.length/2)],py=g.profY??M.yv[Math.floor(M.yv.length/2)],near=(a,v)=>a.reduce((b,x,i)=>Math.abs(x-v)<Math.abs(a[b]-v)?i:b,0),ci=near(M.xv,px),ri=near(M.yv,py),zr=M.z[ri].map(v=>Number.isFinite(v)?v:NaN),zc=M.z.map(r=>r[ci]),lo=M.zmin,hi=M.zmax,sc=(v,len)=>len*(v-lo)/((hi-lo)||1);
  c.save();c.beginPath();c.rect(R.x,R.y,R.w,R.h);c.clip();c.strokeStyle='#e11d48';c.setLineDash([5,4]);c.lineWidth=1.1;c.beginPath();c.moveTo(R.x,ay.map(M.yv[ri]));c.lineTo(R.x+R.w,ay.map(M.yv[ri]));c.moveTo(ax.map(M.xv[ci]),R.y);c.lineTo(ax.map(M.xv[ci]),R.y+R.h);c.stroke();c.setLineDash([]);c.restore();
  const y0=top,yb=R.y-6;c.strokeStyle=pal.mut;c.lineWidth=.8;c.strokeRect(R.x,y0,R.w,yb-y0);c.beginPath();M.xv.forEach((x,i)=>{const v=zr[i];if(!Number.isFinite(v))return;const X=ax.map(x),Y=yb-sc(v,yb-y0-4);i?c.lineTo(X,Y):c.moveTo(X,Y)});c.strokeStyle='#e11d48';c.lineWidth=1.5;c.stroke();
  const xa=R.x+R.w+8;c.strokeStyle=pal.mut;c.lineWidth=.8;c.strokeRect(xa,R.y,PW-6,R.h);c.beginPath();M.yv.forEach((y,i)=>{const v=zc[i];if(!Number.isFinite(v))return;const Y=ay.map(y),X=xa+sc(v,PW-10);i?c.lineTo(X,Y):c.moveTo(X,Y)});c.strokeStyle='#2563eb';c.lineWidth=1.5;c.stroke();
  c.fillStyle=pal.mut;c.font=`${fs-2}px ${ch.ff}`;c.textAlign='left';c.fillText(`profile at y = ${Mx.fmt(M.yv[ri],4)}`,R.x+4,y0+fs);c.textAlign='right';c.fillText(`x = ${Mx.fmt(M.xv[ci],4)}`,xa+PW-8,R.y-4)}
GX.contourprofile=function(c,W,H,top){profilePlot(this,c,W,H,top,false)};
GX.imageprofile=function(c,W,H,top){profilePlot(this,c,W,H,top,true)};

// ---- Waterfall / Bridge ----
function waterfallPlot(ch,c,W,H,top,bridge){const S=gxSeries(ch);if(!S.length)return ch.empty(c,W,H);ch.kind=null;const g=ch.g,d=S[0].d,lab=gxLabels(ch,d),n=d.n;let steps=[],run=0;
  if(bridge){d.y.forEach((v,i)=>{if(i===0||i===n-1){steps.push({l:lab[i],a:0,b:v,tot:true});run=v}else{steps.push({l:lab[i],a:run,b:run+v});run+=v}})}
  else{d.y.forEach((v,i)=>{steps.push({l:lab[i],a:run,b:run+v});run+=v});steps.push({l:g.totalLabel||'Total',a:0,b:run,tot:true})}
  const all=steps.flatMap(s=>[s.a,s.b]),lo=Math.min(0,...all),hi=Math.max(0,...all),pd=(hi-lo)*.08||1,N=steps.length;
  gxFrame(ch,c,W,H,top,{xd:[.4,N+.6],yd:[lo-(lo<0?pd:0),hi+pd],xcats:steps.map(s=>s.l),xl:g.xl,yl:g.yl,draw:({ax,ay})=>{steps.forEach((s,i)=>{const x0=ax.map(i+1-.35),x1=ax.map(i+1+.35),ya=ay.map(s.a),yb=ay.map(s.b),up=s.b>=s.a;c.fillStyle=s.tot?'#64748b':up?'#16a34a':'#dc2626';c.fillRect(x0,Math.min(ya,yb),x1-x0,Math.max(1,Math.abs(yb-ya)));
    if(i<N-1){c.strokeStyle='#888';c.lineWidth=.8;c.setLineDash([3,3]);c.beginPath();c.moveTo(x1,yb);c.lineTo(ax.map(i+2-.35),yb);c.stroke();c.setLineDash([])}const v=s.tot?s.b:s.b-s.a;c.fillStyle=ch.p.ink;c.font=`${(g.fs||12)-1}px ${ch.ff}`;c.textAlign='center';c.fillText((s.tot||v<0?'':'+')+Mx.fmt(v,4),(x0+x1)/2,(up?Math.min(ya,yb)-4:Math.max(ya,yb)+(g.fs||12)));
    if(ch.live)ch.hits.push({px:(x0+x1)/2,py:Math.min(ya,yb),text:`${s.l}: ${Mx.fmt(v)}`,color:'#888'})})}})}
GX.waterfall=function(c,W,H,top){waterfallPlot(this,c,W,H,top,false)};
GX.bridge=function(c,W,H,top){waterfallPlot(this,c,W,H,top,true)};

// ---- High-Low-Close ----
GX.hlc=function(c,W,H,top){const S=gxSeries(this);if(S.length<3)return this.empty(c,W,H,'Select X plus High, Low, Close columns.');this.kind=null;const g=this.g,[Hh,Ll,Cc]=S,mC=new Map(Cc.d.rows.map((r,i)=>[r,Cc.d.y[i]])),mL=new Map(Ll.d.rows.map((r,i)=>[r,Ll.d.y[i]])),pts=Hh.d.rows.map((r,i)=>mC.has(r)&&mL.has(r)?{x:Hh.d.x[i],h:Hh.d.y[i],l:mL.get(r),c:mC.get(r)}:null).filter(Boolean);if(!pts.length)return this.empty(c,W,H);
  const xs=pts.map(p=>p.x),x0=Math.min(...xs),x1=Math.max(...xs),dx=pts.length>1?(x1-x0)/(pts.length-1):1,lo=Math.min(...pts.map(p=>p.l)),hi=Math.max(...pts.map(p=>p.h)),pd=(hi-lo)*.06||1;
  gxFrame(this,c,W,H,top,{xd:[x0-dx,x1+dx],yd:[lo-pd,hi+pd],xdate:g.xdate,xl:g.xl,yl:g.yl,draw:({ax,ay})=>{const t=Math.max(2,Math.min(8,(ax.map(x0+dx)-ax.map(x0))*.35));c.strokeStyle=gcol(0);c.lineWidth=1.5;pts.forEach(p=>{const X=ax.map(p.x);c.beginPath();c.moveTo(X,ay.map(p.h));c.lineTo(X,ay.map(p.l));c.moveTo(X,ay.map(p.c));c.lineTo(X+t,ay.map(p.c));c.stroke()})}})};

// ---- Kite ----
GX.kite=function(c,W,H,top){const S=gxSeries(this);if(!S.length)return this.empty(c,W,H);this.kind=null;const g=this.g,n=S.length,vmax=Math.max(...S.flatMap(q=>q.d.y.map(Math.abs)))||1,xs=S.flatMap(q=>q.d.x),x0=Math.min(...xs),x1=Math.max(...xs),fs=g.fs||12;
  const fr=gxFrame(this,c,W,H,top,{xd:[x0,x1],yd:[.4,n+.6],noYLabels:true,leftPad:70,xl:g.xl,draw:({ax,ay})=>{S.forEach((q,k)=>{const cy=ay.map(n-k),h=Math.abs(ay.map(1)-ay.map(0))*.46;c.beginPath();q.d.x.forEach((x,i)=>{const X=ax.map(x),Y=cy-Math.abs(q.d.y[i])/vmax*h;i?c.lineTo(X,Y):c.moveTo(X,Y)});for(let i=q.d.n-1;i>=0;i--)c.lineTo(ax.map(q.d.x[i]),cy+Math.abs(q.d.y[i])/vmax*h);c.closePath();c.fillStyle=gxCol(q,k);c.globalAlpha=.75;c.fill();c.globalAlpha=1;c.strokeStyle=gxCol(q,k);c.lineWidth=1;c.stroke()})}});
  c.fillStyle=this.p.ink;c.font=`${fs}px ${this.ff}`;c.textAlign='right';S.forEach((q,k)=>c.fillText(q.d.name,fr.R.x-8,fr.ay.map(n-k)+4))};

// ---- Piper trilinear diagram ----
function piperData(ch,S){if(S.length<6)return null;const m=S.map(q=>new Map(q.d.rows.map((r,i)=>[r,q.d.y[i]]))),rows=S[0].d.rows.filter(r=>m.every(x=>x.has(r)&&x.get(r)>=0)),out=[];
  rows.forEach(r=>{const v=m.map(x=>x.get(r)),cs=v[0]+v[1]+v[2],as=v[3]+v[4]+v[5];if(cs>0&&as>0)out.push({r,cat:[v[0]/cs,v[1]/cs,v[2]/cs],an:[v[3]/as,v[4]/as,v[5]/as]})});return out}
GX.piper=function(c,W,H,top){const S=gxSeries(this),D=piperData(this,S);if(!D)return this.empty(c,W,H,'Select six Y columns: Ca, Mg, Na+K, Cl, SO4, HCO3.');this.kind=null;const fs=this.g.fs||12,pal=this.p,gr=gxGroups(this,S[0].d),mapG=new Map(S[0].d.rows.map((r,i)=>[r,gr.idx[i]]));
  const s0=Math.min((W-30)/2.5,(H-top-30)/(2.5*Math.sqrt(3)/2)),s=s0,h=s*Math.sqrt(3)/2,ox=(W-2.5*s)/2,oy=top+10+2.5*h,X=x=>ox+x,Y=y=>oy-y;
  const tri=(x0)=>[[x0,0],[x0+s,0],[x0+s/2,h]];const pt=(x0,top_,bl,br)=>[x0+s*(br+top_/2),h*top_];
  const T1=tri(0),T2=tri(1.5*s),B=[1.25*s,h/2],Rr=[1.25*s+s/2,h/2+h],Tt=[1.25*s,h/2+2*h],Ll=[1.25*s-s/2,h/2+h];
  c.strokeStyle=pal.ink;c.lineWidth=1.2;[T1,T2].forEach(T=>{c.beginPath();T.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1])));c.closePath();c.stroke()});c.beginPath();[B,Rr,Tt,Ll].forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1])));c.closePath();c.stroke();
  c.strokeStyle=pal.grid;c.lineWidth=.6;const l=(p0,p1,t)=>[p0[0]+(p1[0]-p0[0])*t,p0[1]+(p1[1]-p0[1])*t],seg=(p,q)=>{c.moveTo(X(p[0]),Y(p[1]));c.lineTo(X(q[0]),Y(q[1]))};
  c.beginPath();for(let k=1;k<5;k++){const f=k/5;[T1,T2].forEach(([A,Bv,Cv])=>{seg(l(A,Cv,f),l(Bv,Cv,f));seg(l(A,Bv,f),l(Cv,Bv,f));seg(l(Bv,A,f),l(Cv,A,f))});seg(l(B,Rr,f),l(Ll,Tt,f));seg(l(B,Ll,f),l(Rr,Tt,f))}c.stroke();
  c.fillStyle=pal.ink;c.font=`${fs}px ${this.ff}`;c.textAlign='center';const lb=(t,p,dy)=>c.fillText(t,X(p[0]),Y(p[1])+dy);lb('Mg²⁺',[s/2,h],-6);lb('Ca²⁺',[0,0],fs+8);lb('Na⁺+K⁺',[s,0],fs+8);lb('SO₄²⁻',[1.5*s+s/2,h],-6);lb('HCO₃⁻',[1.5*s,0],fs+8);lb('Cl⁻',[2.5*s,0],fs+8);lb('Cations',[s/2,0],fs*2+10);lb('Anions',[2*s,0],fs*2+10);
  D.forEach(p=>{const gi=mapG.get(p.r)||0,col=gcol(gi),pc=pt(0,p.cat[1],p.cat[0],p.cat[2]),pa=pt(1.5*s,p.an[1],p.an[2],p.an[0]);// anions: top=SO4, bl=HCO3, br=Cl
    const sa=pt(1.5*s,p.an[1],0,0);const ax_=1.5*s+s*(p.an[0]+p.an[1]/2),ay_=h*p.an[1],cx_=s*(p.cat[2]+p.cat[1]/2),cy_=h*p.cat[1];// cation: top=Mg, br=Na+K
    const t=((ax_-cx_)*2+(ay_-cy_)*2/Math.sqrt(3))/2,dx=cx_+t/2,dy=cy_+t*Math.sqrt(3)/2;
    [[cx_,cy_],[ax_,ay_]].forEach(q=>drawSym(c,'circle',X(q[0]),Y(q[1]),3.6,col));drawSym(c,'circle',X(dx),Y(dy),4,col);if(this.live)this.hits.push({px:X(dx),py:Y(dy),text:`Sample row ${p.r+1}: Ca ${Mx.fmt(p.cat[0]*100,3)}%, Mg ${Mx.fmt(p.cat[1]*100,3)}%, Na+K ${Mx.fmt(p.cat[2]*100,3)}%`,color:col})})};

// ---- Schoeller ----
GX.schoeller=function(c,W,H,top){const S=gxSeries(this);if(S.length<2)return this.empty(c,W,H,'Select one Y column per ion.');this.kind=null;const g=this.g,fs=g.fs||12,n=S.length,m=S.map(q=>new Map(q.d.rows.map((r,i)=>[r,q.d.y[i]]))),rows=S[0].d.rows.filter(r=>m.every(x=>x.get(r)>0)),all=rows.flatMap(r=>m.map(x=>x.get(r)));if(!rows.length)return this.empty(c,W,H,'Values must be > 0 (log axis).');
  const lo=Math.floor(Math.log10(Math.min(...all))),hi=Math.ceil(Math.log10(Math.max(...all))),pal=this.p,gr=gxGroups(this,S[0].d),gm=new Map(S[0].d.rows.map((r,i)=>[r,gr.idx[i]]));
  const fr=gxFrame(this,c,W,H,top,{xd:[.5,n+.5],yd:[lo,hi],xcats:S.map(q=>q.d.name),noYLabels:true,leftPad:44,xl:g.xl,draw:({R,ax,ay})=>{c.strokeStyle=pal.grid;c.lineWidth=1;S.forEach((q,k)=>{c.beginPath();c.moveTo(ax.map(k+1),R.y);c.lineTo(ax.map(k+1),R.y+R.h);c.stroke()});
    rows.forEach(r=>{c.beginPath();m.forEach((x,k)=>{const X=ax.map(k+1),Y=ay.map(Math.log10(x.get(r)));k?c.lineTo(X,Y):c.moveTo(X,Y)});c.strokeStyle=gcol(gm.get(r)||0);c.lineWidth=1.6;c.globalAlpha=.8;c.stroke();c.globalAlpha=1})}});
  c.fillStyle=pal.ink;c.font=`${fs}px ${this.ff}`;c.textAlign='right';for(let e=lo;e<=hi;e++){c.fillText(e>=0&&e<4?String(Math.pow(10,e)):'1e'+e,fr.R.x-8,fr.ay.map(e)+4)}c.save();c.translate(14,fr.R.y+fr.R.h/2);c.rotate(-Math.PI/2);c.textAlign='center';c.fillText(g.yl||'Concentration (log scale)',0,0);c.restore()};

// ---- Stiff diagram ----
GX.stiff=function(c,W,H,top){const S=gxSeries(this);if(S.length<2||S.length%2)return this.empty(c,W,H,'Select an even number of Y columns: cations first, then anions.');this.kind=null;const g=this.g,fs=g.fs||12,pal=this.p,h=S.length/2,rows=S[0].d.rows.slice(0,12),vmax=Math.max(...S.flatMap(q=>q.d.y))||1,cols=Math.min(rows.length,4),rr=Math.ceil(rows.length/cols),pw=W/cols,ph=(H-top)/rr,gr=gxGroups(this,S[0].d);
  const val=(q,r)=>{const i=q.d.rows.indexOf(r);return i<0?0:q.d.y[i]};
  rows.forEach((r,k)=>{const rh=Math.min(56,(ph-90)/Math.max(1,h-1)),cx=(k%cols+.5)*pw,y0=top+Math.floor(k/cols)*ph+22+Math.max(0,(ph-rh*(h-1)-50)/2),half=pw*.38,sc=half/vmax;c.strokeStyle=pal.mut;c.lineWidth=.8;c.beginPath();c.moveTo(cx,y0-6);c.lineTo(cx,y0+rh*(h-1)+6);c.moveTo(cx-half,y0-6);c.lineTo(cx-half,y0+rh*(h-1)+6);c.moveTo(cx+half,y0-6);c.lineTo(cx+half,y0+rh*(h-1)+6);c.stroke();
    c.beginPath();for(let j=0;j<h;j++){const x=cx-val(S[j],r)*sc,y=y0+j*rh;j?c.lineTo(x,y):c.moveTo(x,y)}for(let j=h-1;j>=0;j--)c.lineTo(cx+val(S[h+j],r)*sc,y0+j*rh);c.closePath();c.fillStyle=gcol(k);c.globalAlpha=.45;c.fill();c.globalAlpha=1;c.strokeStyle=gcol(k);c.lineWidth=1.4;c.stroke();
    c.fillStyle=pal.ink;c.font=`${fs-2}px ${this.ff}`;for(let j=0;j<h;j++){c.textAlign='right';c.fillText(S[j].d.name,cx-half-4,y0+j*rh+3);c.textAlign='left';c.fillText(S[h+j].d.name,cx+half+4,y0+j*rh+3)}c.textAlign='center';c.font=`bold ${fs}px ${this.ff}`;c.fillText(gr.has?gr.names[gr.idx[S[0].d.rows.indexOf(r)]]||`Sample ${r+1}`:`Sample ${r+1}`,cx,y0+rh*(h-1)+22)})};

// ---- Tetrahedral ----
GX.tetra=function(c,W,H,top){const S=gxSeries(this);if(S.length<4)return this.empty(c,W,H,'Select four Y columns (components).');this.kind=null;const g=this.g,fs=g.fs||12,pal=this.p,az=(g.az??30)*Math.PI/180,el=(g.el??22)*Math.PI/180,m=S.slice(0,4).map(q=>new Map(q.d.rows.map((r,i)=>[r,q.d.y[i]]))),rows=S[0].d.rows.filter(r=>m.every(x=>x.has(r)&&x.get(r)>=0)),gr=gxGroups(this,S[0].d),gm=new Map(S[0].d.rows.map((r,i)=>[r,gr.idx[i]]));
  const V=[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]],proj=p=>{const x1=p[0]*Math.cos(az)-p[1]*Math.sin(az),y1=p[0]*Math.sin(az)+p[1]*Math.cos(az),z1=p[2];return[x1,z1*Math.cos(el)-y1*Math.sin(el),y1*Math.cos(el)+z1*Math.sin(el)]},P=V.map(proj),{cx,cy,R}=squareBox(W,H,top,60),sc=R/2.2,xy=p=>[cx+p[0]*sc,cy-p[1]*sc];
  const dpt=r=>{const v=m.map(x=>x.get(r)),s=Mx.sum(v)||1;let p=[0,0,0];v.forEach((w,i)=>{p=[p[0]+w/s*V[i][0],p[1]+w/s*V[i][1],p[2]+w/s*V[i][2]]});return proj(p)};
  const E=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],depth=E.map(e=>(P[e[0]][2]+P[e[1]][2])/2),dmin=Math.min(...depth);c.lineWidth=1.3;E.forEach((e,i)=>{const a=xy(P[e[0]]),b=xy(P[e[1]]);c.strokeStyle=pal.ink;c.setLineDash(depth[i]===dmin?[4,4]:[]);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()});c.setLineDash([]);
  c.fillStyle=pal.ink;c.font=`bold ${fs}px ${this.ff}`;c.textAlign='center';P.forEach((p,i)=>{const q=xy(p);c.fillText(S[i].d.name,q[0],q[1]+(p[1]>0?-8:fs+6))});
  rows.map(r=>({p:dpt(r),r})).sort((a,b)=>a.p[2]-b.p[2]).forEach(({p,r})=>{const q=xy(p);drawSym(c,'circle',q[0],q[1],4.2,gcol(gm.get(r)||0));if(this.live)this.hits.push({px:q[0],py:q[1],text:`row ${r+1}: `+S.slice(0,4).map((s,i)=>`${s.d.name} ${Mx.fmt(m[i].get(r),4)}`).join(', '),color:gcol(gm.get(r)||0)})})};

// ---- Variability chart ----
GX.variability=function(c,W,H,top){const S=gxSeries(this);if(!S.length)return this.empty(c,W,H);const lc=gxLabCols(this),g=this.g;if(!lc.length)return this.empty(c,W,H,'Needs one or two label columns (group, sub-group).');this.kind=null;const d=S[0].d,l1=g.labelCol!=null&&g.labelCol>=0?g.labelCol:lc[0],l2=lc.find(i=>i!==l1);
  const keys=[],byKey=new Map();d.rows.forEach((r,i)=>{const a=gxCell(this,l1,r),b=l2!=null?gxCell(this,l2,r):'',k=a+'\u0001'+b;if(!byKey.has(k)){byKey.set(k,{a,b,v:[]});keys.push(k)}byKey.get(k).v.push(d.y[i])});const cats=keys.map(k=>byKey.get(k)),lo=Math.min(...d.y),hi=Math.max(...d.y),pd=(hi-lo)*.08||1,gs=[...new Set(cats.map(q=>q.a))];
  const fr=gxFrame(this,c,W,H,top,{xd:[.4,cats.length+.6],yd:[lo-pd,hi+pd],xcats:cats.map(q=>l2!=null?q.b:q.a),xl:'',yl:g.yl||d.name,draw:({ax,ay,R})=>{cats.forEach((q,i)=>{const x=ax.map(i+1),col=gcol(gs.indexOf(q.a));q.v.forEach((v,j)=>{const jit=((j*37%11)/11-.5)*Math.min(22,(ax.map(2)-ax.map(1))*.6);drawSym(c,'circle',x+jit,ay.map(v),3.2,col)});const mu=Mx.mean(q.v);c.strokeStyle=col;c.lineWidth=2.4;c.beginPath();c.moveTo(x-9,ay.map(mu));c.lineTo(x+9,ay.map(mu));c.stroke()});
    if(l2!=null){c.strokeStyle=this.p.grid;c.lineWidth=1;cats.forEach((q,i)=>{if(i&&q.a!==cats[i-1].a){const x=(ax.map(i)+ax.map(i+1))/2;c.beginPath();c.moveTo(x,R.y);c.lineTo(x,R.y+R.h);c.stroke()}})}}});
  if(l2!=null){c.fillStyle=this.p.ink;c.font=`bold ${g.fs||12}px ${this.ff}`;c.textAlign='center';gs.forEach(a=>{const ix=cats.map((q,i)=>q.a===a?i:-1).filter(i=>i>=0),x=(fr.ax.map(ix[0]+1)+fr.ax.map(ix[ix.length-1]+1))/2;c.fillText(a,x,H-(g.xl?30:8))})}};

// ---- Correlation plot ----
GX.corrplot=function(c,W,H,top){const S=gxSeries(this);if(S.length<2)return this.empty(c,W,H,'Select two or more Y columns.');this.kind=null;const fs=this.g.fs||12,pal=this.p,N=S.length,lab=S.map(q=>q.d.name),mp=S.map(q=>new Map(q.d.rows.map((r,i)=>[r,q.d.y[i]]))),R=Array.from({length:N},()=>new Array(N).fill(1));
  for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){const rs=S[i].d.rows.filter(r=>mp[j].has(r)),a=rs.map(r=>mp[i].get(r)),b=rs.map(r=>mp[j].get(r)),ma=Mx.mean(a),mb=Mx.mean(b);let sab=0,saa=0,sbb=0;a.forEach((v,k)=>{sab+=(v-ma)*(b[k]-mb);saa+=(v-ma)**2;sbb+=(b[k]-mb)**2});R[i][j]=R[j][i]=sab/Math.sqrt(saa*sbb||1)}
  const lw=Math.min(100,W*.18),cell=Math.min((W-lw-20)/N,(H-top-lw-10)/N),ox=(W-cell*N)/2+lw/2,oy=top+lw/2+8,col=r=>r>=0?`rgba(37,99,235,${.15+.85*Math.abs(r)})`:`rgba(220,38,38,${.15+.85*Math.abs(r)})`;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=ox+j*cell,y=oy+i*cell,cx=x+cell/2,cy=y+cell/2;c.strokeStyle=pal.grid;c.lineWidth=.6;c.strokeRect(x,y,cell,cell);
    if(i===j){c.fillStyle=pal.ink;c.font=`bold ${fs}px ${this.ff}`;c.textAlign='center';c.fillText(lab[i],cx,cy+4)}else if(i>j){c.beginPath();c.arc(cx,cy,Math.max(1.5,cell*.46*Math.sqrt(Math.abs(R[i][j]))),0,TAU);c.fillStyle=col(R[i][j]);c.fill();if(this.live)this.hits.push({px:cx,py:cy,text:`${lab[i]} vs ${lab[j]}: r = ${Mx.fmt(R[i][j],4)}`,color:'#888'})}else{c.fillStyle=col(R[i][j]);c.fillRect(x+1,y+1,cell-2,cell-2);c.fillStyle=Math.abs(R[i][j])>.6?'#fff':pal.ink;c.font=`${fs}px ${this.ff}`;c.textAlign='center';c.fillText(R[i][j].toFixed(2),cx,cy+4)}}};

// ---- Map (coarse continents) ----
const WORLD=[
 [[-168,66],[-156,71],[-125,70],[-95,72],[-80,73],[-62,66],[-55,52],[-66,45],[-76,35],[-81,25],[-90,29],[-97,26],[-97,18],[-87,21],[-83,10],[-78,8],[-92,14],[-105,20],[-117,32],[-124,40],[-125,49],[-135,58],[-150,60],[-168,66]],
 [[-73,78],[-60,82],[-30,83],[-20,75],[-22,70],[-43,60],[-52,66],[-60,76]],
 [[-78,8],[-72,12],[-62,10],[-50,0],[-35,-6],[-40,-22],[-48,-26],[-58,-38],[-65,-42],[-68,-52],[-72,-52],[-74,-42],[-71,-20],[-81,-6],[-80,0]],
 [[-10,36],[-9,43],[-2,48],[4,52],[8,55],[10,59],[5,62],[15,69],[28,71],[45,68],[60,70],[80,73],[105,77],[140,72],[170,70],[180,66],[160,60],[142,52],[135,44],[127,40],[122,30],[110,20],[106,10],[100,5],[103,1],[98,8],[92,22],[80,15],[77,8],[72,20],[66,25],[57,25],[50,30],[44,12],[35,28],[34,32],[27,37],[26,40],[19,40],[12,44],[16,38],[8,44],[3,43],[-2,37]],
 [[-17,21],[-10,30],[-6,36],[10,37],[22,32],[32,31],[35,27],[43,12],[51,12],[40,-3],[40,-15],[35,-25],[27,-34],[18,-34],[12,-18],[9,-1],[9,5],[-8,4],[-17,14]],
 [[114,-22],[122,-18],[131,-12],[137,-12],[142,-11],[146,-19],[153,-26],[150,-37],[140,-38],[131,-31],[115,-34]],
 [[-5,50],[1,51],[2,55],[-3,59],[-6,56]],[[130,31],[135,34],[141,40],[142,45],[140,36]],[[44,-25],[50,-15],[48,-13],[44,-17]],
 [[109,1],[117,7],[119,1],[116,-4],[110,-3]],[[167,-46],[174,-41],[178,-38],[172,-35],[171,-44]],[[-180,-70],[180,-70],[180,-85],[-180,-85]]];
const PROJ={equirect:(lo,la)=>[lo,la],mercator:(lo,la)=>[lo,Math.log(Math.tan(Math.PI/4+Math.max(-80,Math.min(80,la))*Math.PI/360))*180/Math.PI],
  mollweide:(lo,la)=>{const p=la*Math.PI/180;let t=p;for(let i=0;i<12;i++){const f=2*t+Math.sin(2*t)-Math.PI*Math.sin(p),d=2+2*Math.cos(2*t);if(Math.abs(d)<1e-9)break;t-=f/d}return[(2*Math.SQRT2/Math.PI)*lo*Math.cos(t),Math.SQRT2*Math.sin(t)*90]}};
GX.map=function(c,W,H,top){const S=gxSeries(this);if(!S.length)return this.empty(c,W,H);this.kind=null;const g=this.g,fs=g.fs||12,pal=this.p,pj=PROJ[g.proj||'equirect']||PROJ.equirect,d=S[0].d,V=S[1]?new Map(S[1].d.rows.map((r,i)=>[r,S[1].d.y[i]])):null,vals=V?[...V.values()]:[],vlo=Math.min(...vals),vhi=Math.max(...vals);
  const pts=d.x.map((lo,i)=>({lo,la:d.y[i],v:V?V.get(d.rows[i]):null,p:pj(lo,d.y[i])})).filter(p=>Math.abs(p.la)<=90&&Math.abs(p.lo)<=360);let b=[-180,180,-90,90];if(g.mapfit&&pts.length){const lo=pts.map(p=>p.lo),la=pts.map(p=>p.la),pl=(Math.max(...lo)-Math.min(...lo))*.15+1,pa=(Math.max(...la)-Math.min(...la))*.15+1;b=[Math.min(...lo)-pl,Math.max(...lo)+pl,Math.min(...la)-pa,Math.max(...la)+pa]}
  const corners=[pj(b[0],b[2]),pj(b[1],b[2]),pj(b[0],b[3]),pj(b[1],b[3]),pj(0,b[2]),pj(0,b[3])],px0=Math.min(...corners.map(p=>p[0])),px1=Math.max(...corners.map(p=>p[0])),py0=Math.min(...corners.map(p=>p[1])),py1=Math.max(...corners.map(p=>p[1])),pad=16,s=Math.min((W-2*pad)/(px1-px0),(H-top-2*pad)/(py1-py0)),ox=(W-(px1-px0)*s)/2-px0*s,oy=top+(H-top)/2+(py0+py1)/2*s,M=p=>[ox+p[0]*s,oy-p[1]*s];
  c.save();c.beginPath();c.rect(pad,top+pad/2,W-2*pad,H-top-pad);c.clip();c.strokeStyle=pal.grid;c.lineWidth=.6;const step=g.gstep||30;for(let lo=-180;lo<=180;lo+=step){c.beginPath();for(let la=-90;la<=90;la+=5){const q=M(pj(lo,la));la===-90?c.moveTo(q[0],q[1]):c.lineTo(q[0],q[1])}c.stroke()}for(let la=-90+step;la<90;la+=step){c.beginPath();for(let lo=-180;lo<=180;lo+=5){const q=M(pj(lo,la));lo===-180?c.moveTo(q[0],q[1]):c.lineTo(q[0],q[1])}c.stroke()}
  WORLD.forEach(pg=>{c.beginPath();pg.forEach((q,i)=>{const m=M(pj(q[0],q[1]));i?c.lineTo(m[0],m[1]):c.moveTo(m[0],m[1])});c.closePath();c.fillStyle='#e5e7eb';c.fill();c.strokeStyle='#9ca3af';c.lineWidth=.8;c.stroke()});
  const nm=g.cmap||'plasma';pts.forEach(p=>{const q=M(p.p),t=V&&vhi>vlo?(p.v-vlo)/(vhi-vlo):.5,r=V?4+10*t:5,col=V?cmap(nm,t):gcol(0);c.beginPath();c.arc(q[0],q[1],r,0,TAU);c.fillStyle=col;c.globalAlpha=.75;c.fill();c.globalAlpha=1;c.strokeStyle='#fff';c.lineWidth=.8;c.stroke();if(this.live)this.hits.push({px:q[0],py:q[1],text:`lon ${Mx.fmt(p.lo,5)}, lat ${Mx.fmt(p.la,5)}${V?', value '+Mx.fmt(p.v,4):''}`,color:col})});c.restore();
  c.fillStyle=pal.mut;c.font=`${fs-3}px ${this.ff}`;c.textAlign='right';c.fillText('Coarse continent outlines',W-pad,H-4)};

// ---- registration ----
const GALLERY_TYPES={chord:'Chord Diagram',network:'Network Plot',edgebundle:'Edge Bundling',alluvial:'Alluvial',sunburst:'Sunburst',circpack:'Circular Packing',treemap:'Treemap',spiralbar:'Spiral Bar',trellis:'Trellis Plot',cluster:'Cluster Plot',ellipse:'Confidence Ellipses',fence:'Fence Plot',inset:'Plot with Inset',doublex:'Double-X Plot',streamline:'Streamlines',contourprofile:'Contour Profile',imageprofile:'Image Profile',waterfall:'Waterfall',bridge:'Bridge Chart',hlc:'High-Low-Close',kite:'Kite Diagram',piper:'Piper Diagram',schoeller:'Schoeller Diagram',stiff:'Stiff Diagram',tetra:'Tetrahedral Plot',variability:'Variability Chart',corrplot:'Correlation Plot',map:'Map (lon/lat)'};
Object.assign(GTYPES,GALLERY_TYPES);
RIB.Plot.push(['Flow & hierarchy',[tx('chord','Chord','Chd'),tx('network','Network','Net'),tx('edgebundle','Edge bundling','EB'),tx('alluvial','Alluvial','All'),tx('sunburst','Sunburst','Sun'),tx('circpack','Circle packing','CP'),tx('treemap','Treemap','Tm'),tx('spiralbar','Spiral bar','Spr')]]);
RIB.Plot.push(['Layout & stats',[tx('trellis','Trellis','Trl'),tx('cluster','Cluster','Clu'),tx('ellipse','Ellipses','Ell'),tx('variability','Variability','Var'),tx('corrplot','Correlation','Cor'),tx('fence','Fence','Fnc'),tx('inset','Inset','Ins'),tx('doublex','Double-X','2X')]]);
RIB.Plot.push(['Fields & profiles',[tx('streamline','Streamlines','Str'),tx('contourprofile','Contour profile','CPr'),tx('imageprofile','Image profile','IPr'),tx('map','Map','Map')]]);
RIB.Plot.push(['Financial & flow',[tx('waterfall','Waterfall','Wf'),tx('bridge','Bridge','Brg'),tx('hlc','High-Low-Close','HLC')]]);
RIB.Plot.push(['Geochemistry',[tx('piper','Piper','Pip'),tx('schoeller','Schoeller','Sch'),tx('stiff','Stiff','Stf'),tx('kite','Kite','Kit'),tx('tetra','Tetrahedral','Tet')]]);
