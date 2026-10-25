'use strict';
// Gallery round 3: 3D pie / column / waterfall, isosurface, polar quiver, Durov, soil texture, tile-grid map, clustered heatmap.
Object.assign(GALLERY_HELP,{
  pie3d:'One Y column of values; optional label column. Drag to rotate. “Thickness” and “Explode” are in Properties.',
  column3d:'Each Y column is a series (depth); each row is a category (label column optional). Drag to rotate.',
  waterfall3d:'X plus several Y columns: each column is drawn as a filled curve at its own depth. Drag to rotate.',
  isosurface:'X, then three Y columns: y, z and value of a regular 3-D grid. The surface at the “iso level” is extracted. Drag to rotate.',
  polarquiver:'X = angle θ (degrees), Y columns: radius r, arrow magnitude, arrow direction (degrees, counter-clockwise from east).',
  durov:'Eight Y columns: Ca, Mg, Na+K, Cl, SO4, HCO3, pH, TDS. Simplified Durov: Piper fields plus a pH–TDS panel.',
  soiltex:'Three Y columns: sand %, silt %, clay % (normalised to 100). USDA texture classes are drawn and samples classified.',
  tilemap:'Label column of US state codes (AL, AK, …) or any names, plus one Y column of values. Non-state labels are laid out in a square grid.',
  heatdendro:'A matrix sheet (or several columns). Rows and columns are clustered (average linkage) and reordered; dendrograms are drawn on the sides.'});

// ---- shared 3D helpers ----
function scene3(ch,c,W,H,top,sc=.3){const g=ch.g,az=(g.az??-50)*Math.PI/180,el=(g.el??25)*Math.PI/180,zoom=g.zoom||1,S=Math.min(W,H-top)*sc*zoom,cx=W/2,cy=(H+top)/2+S*.1;ch.kind='3d';
  return(x,y,z)=>{const x1=x*Math.cos(az)-y*Math.sin(az),y1=x*Math.sin(az)+y*Math.cos(az),y2=y1*Math.cos(el)-z*Math.sin(el),z2=y1*Math.sin(el)+z*Math.cos(el);return[cx+x1*S,cy-z2*S,y2]}}
function paintFaces(c,F,edge='rgba(0,0,0,.28)'){F.sort((a,b)=>b.d-a.d);F.forEach(f=>{c.beginPath();f.P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fillStyle=f.color;c.globalAlpha=(f.alpha??1)*(f.shade??1);c.fill();c.globalAlpha=1;if(edge){c.strokeStyle=edge;c.lineWidth=.5;c.stroke()}})}
const mkFace=(proj,pts,color,shade,alpha)=>{const P=pts.map(p=>proj(p[0],p[1],p[2]));return{P,d:Mx.mean(P.map(p=>p[2])),color,shade,alpha}};
const hex2=(col,k)=>{const[r,g,b]=cssColor(col);return`rgb(${Math.round(255*Math.min(1,r*k))},${Math.round(255*Math.min(1,g*k))},${Math.round(255*Math.min(1,b*k))})`};
function box3(ch,c,proj,pal,fs){c.strokeStyle=pal.grid;c.lineWidth=1;[[-1,-1,-.7,1,-1,-.7],[1,-1,-.7,1,1,-.7],[1,1,-.7,-1,1,-.7],[-1,1,-.7,-1,-1,-.7],[-1,-1,.7,1,-1,.7],[1,-1,.7,1,1,.7],[1,1,.7,-1,1,.7],[-1,1,.7,-1,-1,.7],[-1,-1,-.7,-1,-1,.7],[1,-1,-.7,1,-1,.7],[1,1,-.7,1,1,.7],[-1,1,-.7,-1,1,.7]].forEach(e=>{const a=proj(e[0],e[1],e[2]),b=proj(e[3],e[4],e[5]);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()})}

// ---- 3D pie ----
GX.pie3d=function(c,W,H,top){const S=gxSeries(this);if(!S.length)return this.empty(c,W,H);const g=this.g,d=S[0].d,v=d.y.map(x=>Math.max(0,x)),tot=Mx.sum(v);if(!(tot>0))return this.empty(c,W,H);const proj=scene3(this,c,W,H,top,.36),lab=gxLabels(this,d),th=(g.p3h??.3),ex=g.pexp??0,F=[];let a=0;const seg=48;
  v.forEach((x,i)=>{const w=x/tot*TAU,a0=a,a1=a+w,am=(a0+a1)/2,ox=Math.cos(am)*ex,oy=Math.sin(am)*ex,col=gcol(i),n=Math.max(2,Math.ceil(w/TAU*seg)),P=(r,ang,z)=>[ox+r*Math.cos(ang),oy+r*Math.sin(ang),z];
    const top_=[[ox,oy,th]];for(let k=0;k<=n;k++)top_.push(P(1,a0+(a1-a0)*k/n,th));F.push(mkFace(proj,top_,col,1));
    const bot=[[ox,oy,0]];for(let k=0;k<=n;k++)bot.push(P(1,a0+(a1-a0)*k/n,0));F.push(mkFace(proj,bot,col,.6));
    for(let k=0;k<n;k++){const b0=a0+(a1-a0)*k/n,b1=a0+(a1-a0)*(k+1)/n;F.push(mkFace(proj,[P(1,b0,0),P(1,b1,0),P(1,b1,th),P(1,b0,th)],col,.78+.2*Math.cos((b0+b1)/2-.8)))}
    [a0,a1].forEach((ang,j)=>F.push(mkFace(proj,[[ox,oy,0],P(1,ang,0),P(1,ang,th),[ox,oy,th]],col,.7)));a=a1;if(this.live){const p=proj(ox+.6*Math.cos(am),oy+.6*Math.sin(am),th);this.hits.push({px:p[0],py:p[1],text:`${lab[i]}: ${Mx.fmt(x)} (${Mx.fmt(100*x/tot,3)}%)`,color:col})}});
  paintFaces(c,F);c.fillStyle=this.p.ink;c.font=`${g.fs||12}px ${this.ff}`;c.textAlign='center';a=0;v.forEach((x,i)=>{const w=x/tot*TAU,am=a+w/2;a+=w;if(w<.18)return;const p=proj(Math.cos(am)*(1.18+ex),Math.sin(am)*(1.18+ex),th);c.fillText(`${lab[i]} ${Mx.fmt(100*x/tot,3)}%`,p[0],p[1])})};

// ---- 3D column ----
GX.column3d=function(c,W,H,top){const S=gxSeries(this);if(!S.length)return this.empty(c,W,H);const g=this.g,pal=this.p,fs=g.fs||12,ns=S.length,nr=Math.max(...S.map(q=>q.d.n)),lab=gxLabels(this,S[0].d),all=S.flatMap(q=>q.d.y),zr=[Math.min(0,...all),Math.max(0,...all)],proj=scene3(this,c,W,H,top),nz=v=>(v-zr[0])/((zr[1]-zr[0])||1)*1.4-.7,base=nz(0),F=[],hx=.8/Math.max(nr,2),hy=.7/Math.max(ns,2);
  box3(this,c,proj,pal,fs);const X=i=>nr>1?-1+(i+.5)/nr*2:0,Y=k=>ns>1?-1+(k+.5)/ns*2:0;
  S.forEach((q,k)=>q.d.y.forEach((z,i)=>{const x0=X(i)-hx,x1=X(i)+hx,y0=Y(k)-hy,y1=Y(k)+hy,tp=nz(z),col=gxCol(q,k),b=Math.min(base,tp),t=Math.max(base,tp);F.push(mkFace(proj,[[x0,y0,t],[x1,y0,t],[x1,y1,t],[x0,y1,t]],col,1),mkFace(proj,[[x0,y0,b],[x1,y0,b],[x1,y0,t],[x0,y0,t]],col,.8),mkFace(proj,[[x1,y0,b],[x1,y1,b],[x1,y1,t],[x1,y0,t]],col,.65),mkFace(proj,[[x0,y1,b],[x1,y1,b],[x1,y1,t],[x0,y1,t]],col,.8),mkFace(proj,[[x0,y0,b],[x0,y1,b],[x0,y1,t],[x0,y0,t]],col,.65));
    if(this.live){const p=proj(X(i),Y(k),t);this.hits.push({px:p[0],py:p[1],text:`${q.d.name} · ${lab[i]||i+1}: ${Mx.fmt(z)}`,color:col})}}));
  paintFaces(c,F);c.fillStyle=pal.ink;c.font=`${fs-1}px ${this.ff}`;c.textAlign='center';const step=Math.ceil(nr/12);for(let i=0;i<nr;i+=step){const p=proj(X(i),-1.12,-.7);c.fillText(lab[i]||i+1,p[0],p[1]+fs+2)}c.textAlign='left';S.forEach((q,k)=>{const p=proj(1.12,Y(k),-.7);c.fillStyle=gxCol(q,k);c.fillText(q.d.name,p[0]+4,p[1]+4)});
  c.fillStyle=pal.mut;c.textAlign='right';const t=niceTicks(zr[0],zr[1],4);t.t.forEach(v=>{if(v<zr[0]||v>zr[1])return;const p=proj(-1.1,-1.1,nz(v));c.fillText(fmtTick(v,t.st),p[0],p[1]+4)})};

// ---- 3D waterfall ----
GX.waterfall3d=function(c,W,H,top){const S=gxSeries(this);if(!S.length)return this.empty(c,W,H);const g=this.g,pal=this.p,fs=g.fs||12,ns=S.length,xs=S.flatMap(q=>q.d.x),all=S.flatMap(q=>q.d.y),xr=[Math.min(...xs),Math.max(...xs)],zr=[Math.min(0,...all),Math.max(...all)],proj=scene3(this,c,W,H,top),nx=v=>(v-xr[0])/((xr[1]-xr[0])||1)*2-1,nz=v=>(v-zr[0])/((zr[1]-zr[0])||1)*1.4-.7,F=[],base=-.7;
  box3(this,c,proj,pal,fs);S.forEach((q,k)=>{const Y=ns>1?-.85+1.7*k/(ns-1):0,col=gxCol(q,k),n=q.d.n;for(let i=0;i<n-1;i++)F.push(mkFace(proj,[[nx(q.d.x[i]),Y,base],[nx(q.d.x[i+1]),Y,base],[nx(q.d.x[i+1]),Y,nz(q.d.y[i+1])],[nx(q.d.x[i]),Y,nz(q.d.y[i])]],col,.85,.9))});
  paintFaces(c,F,null);S.forEach((q,k)=>{const Y=ns>1?-.85+1.7*k/(ns-1):0;c.strokeStyle=hex2(gxCol(q,k),.55);c.lineWidth=1.6;c.beginPath();q.d.x.forEach((x,i)=>{const p=proj(nx(x),Y,nz(q.d.y[i]));i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])});c.stroke();const p=proj(1.12,Y,-.7);c.fillStyle=gxCol(q,k);c.font=`${fs-1}px ${this.ff}`;c.textAlign='left';c.fillText(q.d.name,p[0]+4,p[1]+4)});
  c.fillStyle=pal.mut;c.font=`${fs-1}px ${this.ff}`;c.textAlign='center';const tx=niceTicks(xr[0],xr[1],4);tx.t.forEach(v=>{if(v<xr[0]||v>xr[1])return;const p=proj(nx(v),-1.12,-.7);c.fillText(fmtTick(v,tx.st),p[0],p[1]+fs)});c.textAlign='right';const tz=niceTicks(zr[0],zr[1],4);tz.t.forEach(v=>{if(v<zr[0]||v>zr[1])return;const p=proj(-1.1,-1.1,nz(v));c.fillText(fmtTick(v,tz.st),p[0],p[1]+4)})};

// ---- Isosurface (marching tetrahedra) ----
GX.isosurface=function(c,W,H,top){const S=gxSeries(this);if(S.length<3)return this.empty(c,W,H,'Select X plus three Y columns: y, z, value.');const g=this.g,pal=this.p,fs=g.fs||12,[A1,A2,A3]=S,mz=new Map(A2.d.rows.map((r,i)=>[r,A2.d.y[i]])),mv=new Map(A3.d.rows.map((r,i)=>[r,A3.d.y[i]])),pts=A1.d.rows.map((r,i)=>mz.has(r)&&mv.has(r)?[A1.d.x[i],A1.d.y[i],mz.get(r),mv.get(r)]:null).filter(Boolean);if(pts.length<8)return this.empty(c,W,H);
  const uq=k=>[...new Set(pts.map(p=>+p[k].toPrecision(9)))].sort((a,b)=>a-b),ux=uq(0),uy=uq(1),uz=uq(2);if(ux.length*uy.length*uz.length>60000)return this.empty(c,W,H,'Grid too large (max ≈ 39³ points).');if(ux.length<2||uy.length<2||uz.length<2)return this.empty(c,W,H,'Data must form a 3-D grid.');
  const ix=new Map(ux.map((v,i)=>[v,i])),iy=new Map(uy.map((v,i)=>[v,i])),iz=new Map(uz.map((v,i)=>[v,i])),NX=ux.length,NY=uy.length,NZ=uz.length,V=new Float64Array(NX*NY*NZ).fill(NaN),id=(i,j,k)=>(k*NY+j)*NX+i;pts.forEach(p=>{V[id(ix.get(+p[0].toPrecision(9)),iy.get(+p[1].toPrecision(9)),iz.get(+p[2].toPrecision(9)))]=p[3]});
  const vs=pts.map(p=>p[3]),vmin=Math.min(...vs),vmax=Math.max(...vs),levels=[g.iso??(vmin+vmax)/2];if(g.iso2!=null&&g.iso2!=='')levels.push(+g.iso2);const proj=scene3(this,c,W,H,top),nx=v=>(v-ux[0])/((ux[NX-1]-ux[0])||1)*2-1,ny=v=>(v-uy[0])/((uy[NY-1]-uy[0])||1)*2-1,nz=v=>(v-uz[0])/((uz[NZ-1]-uz[0])||1)*1.4-.7,nm=g.cmap||'viridis',F=[];
  const CR=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],TET=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],light=[.4,-.5,.77];
  levels.forEach((lv,li)=>{const alpha=levels.length>1&&li===0?.45:.95;for(let k=0;k<NZ-1;k++)for(let j=0;j<NY-1;j++)for(let i=0;i<NX-1;i++){const cp=CR.map(q=>[ux[i+q[0]],uy[j+q[1]],uz[k+q[2]]]),cv=CR.map(q=>V[id(i+q[0],j+q[1],k+q[2])]);if(cv.some(Number.isNaN))continue;
    TET.forEach(t=>{const ins=t.filter(q=>cv[q]>=lv),out=t.filter(q=>cv[q]<lv);if(!ins.length||!out.length)return;const ed=(a,b)=>{const f=(lv-cv[a])/(cv[b]-cv[a]);return[nx(cp[a][0]+(cp[b][0]-cp[a][0])*f),ny(cp[a][1]+(cp[b][1]-cp[a][1])*f),nz(cp[a][2]+(cp[b][2]-cp[a][2])*f)]};let polys=[];
      if(ins.length===1)polys=[[ed(ins[0],out[0]),ed(ins[0],out[1]),ed(ins[0],out[2])]];else if(out.length===1)polys=[[ed(out[0],ins[0]),ed(out[0],ins[1]),ed(out[0],ins[2])]];else polys=[[ed(ins[0],out[0]),ed(ins[0],out[1]),ed(ins[1],out[1]),ed(ins[1],out[0])]];
      polys.forEach(pg=>{const a=pg[0],b=pg[1],c2=pg[2],u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],w=[c2[0]-a[0],c2[1]-a[1],c2[2]-a[2]],n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],nl=Math.hypot(...n)||1,sh=.4+.6*Math.abs((n[0]*light[0]+n[1]*light[1]+n[2]*light[2])/nl),zc=(pg[0][2]+.7)/1.4;F.push(mkFace(proj,pg,levels.length>1?gcol(li):cmap(nm,Math.min(1,Math.max(0,zc))),sh,alpha))})})}});
  if(!F.length)return this.empty(c,W,H,`No surface at level ${Mx.fmt(levels[0],4)} (data range ${Mx.fmt(vmin,4)} – ${Mx.fmt(vmax,4)}).`);box3(this,c,proj,pal,fs);paintFaces(c,F,null);
  c.fillStyle=pal.mut;c.font=`${fs}px ${this.ff}`;c.textAlign='left';c.fillText(`iso level ${levels.map(l=>Mx.fmt(l,4)).join(', ')}  ·  ${F.length} facets`,10,top+14)};

// ---- Polar quiver ----
GX.polarquiver=function(c,W,H,top){const S=gxSeries(this);if(S.length<3)return this.empty(c,W,H,'Select X (θ in degrees) and Y columns: r, magnitude, direction (degrees).');this.kind=null;const g=this.g,pal=this.p,fs=g.fs||12,th=S[0].d.x,rr=S[0].d.y,mm=new Map(S[1].d.rows.map((r,i)=>[r,S[1].d.y[i]])),dd=new Map(S[2].d.rows.map((r,i)=>[r,S[2].d.y[i]])),rows=S[0].d.rows.map((r,i)=>mm.has(r)&&dd.has(r)?{t:th[i]*Math.PI/180,r:rr[i],m:mm.get(r),a:dd.get(r)*Math.PI/180}:null).filter(Boolean);if(!rows.length)return this.empty(c,W,H);
  const{cx,cy,R}=squareBox(W,H,top,40),rmax=Math.max(...rows.map(q=>q.r))*1.05||1,sc=R/rmax,mmax=Math.max(...rows.map(q=>Math.abs(q.m)))||1,Lmax=R*(g.qscale??.17),nm=g.cmap||'viridis',tk=niceTicks(0,rmax,4);
  c.strokeStyle=pal.grid;c.lineWidth=.8;tk.t.forEach(v=>{if(v<=0||v>rmax)return;c.beginPath();c.arc(cx,cy,v*sc,0,TAU);c.stroke();gxText(c,fmtTick(v,tk.st),cx+3,cy-v*sc-2,'left',pal.mut,`${fs-2}px ${this.ff}`)});c.beginPath();c.arc(cx,cy,rmax*sc,0,TAU);c.stroke();
  for(let a=0;a<360;a+=30){const t=a*Math.PI/180;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+R*Math.cos(t),cy-R*Math.sin(t));c.stroke();gxText(c,a+'°',cx+(R+14)*Math.cos(t),cy-(R+14)*Math.sin(t)+4,'center',pal.mut,`${fs-1}px ${this.ff}`)}
  rows.forEach(q=>{const x=cx+q.r*sc*Math.cos(q.t),y=cy-q.r*sc*Math.sin(q.t),len=Math.abs(q.m)/mmax*Lmax,ang=-q.a+(q.m<0?Math.PI:0),x2=x+len*Math.cos(ang),y2=y+len*Math.sin(ang),col=cmap(nm,Math.abs(q.m)/mmax);c.strokeStyle=col;c.fillStyle=col;c.lineWidth=1.6;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();const hd=Math.min(7,len*.4);c.beginPath();c.moveTo(x2,y2);c.lineTo(x2-hd*Math.cos(ang-.45),y2-hd*Math.sin(ang-.45));c.lineTo(x2-hd*Math.cos(ang+.45),y2-hd*Math.sin(ang+.45));c.closePath();c.fill();c.beginPath();c.arc(x,y,1.8,0,TAU);c.fill();if(this.live)this.hits.push({px:x,py:y,text:`θ ${Mx.fmt(q.t*180/Math.PI,4)}°, r ${Mx.fmt(q.r,4)}, magnitude ${Mx.fmt(q.m,4)}`,color:col})})};

// ---- Durov (simplified) ----
GX.durov=function(c,W,H,top){const S=gxSeries(this);if(S.length<8)return this.empty(c,W,H,'Select eight Y columns: Ca, Mg, Na+K, Cl, SO4, HCO3, pH, TDS.');const h1=H*.66;c.save();GX.piper.call(this,c,W,h1,top);c.restore();this.kind=null;
  const g=this.g,mP=new Map(S[6].d.rows.map((r,i)=>[r,S[6].d.y[i]])),mT=new Map(S[7].d.rows.map((r,i)=>[r,S[7].d.y[i]])),gr=gxGroups(this,S[0].d),pts=S[0].d.rows.map((r,i)=>mP.has(r)&&mT.has(r)&&mT.get(r)>0?{p:mP.get(r),t:Math.log10(mT.get(r)),k:gr.idx[i]}:null).filter(Boolean);if(!pts.length)return;
  c.save();c.translate(W*.28,H*.71);const w=W*.44,hh=H*.29,px=pts.map(q=>q.p),pl=Math.min(...px,6)-.3,ph=Math.max(...px,9)+.3,tl=Math.floor(Math.min(...pts.map(q=>q.t))),th=Math.ceil(Math.max(...pts.map(q=>q.t)));
  gxFrame(this,c,w,hh,6,{xd:[pl,ph],yd:[tl,th],xl:'pH',yl:'log10 TDS (mg/L)',draw:({ax,ay})=>{pts.forEach(q=>drawSym(c,'circle',ax.map(q.p),ay.map(q.t),3.8,gcol(q.k)))}});c.restore();this.kind=null};

// ---- Soil texture (USDA) ----
function usdaClass(sand,clay){const silt=100-sand-clay;
  if(silt+1.5*clay<15)return'Sand';if(silt+1.5*clay>=15&&silt+2*clay<30)return'Loamy sand';
  if((clay>=7&&clay<20&&sand>52&&silt+2*clay>=30)||(clay<7&&silt<50&&silt+2*clay>=30))return'Sandy loam';
  if(clay>=7&&clay<27&&silt>=28&&silt<50&&sand<=52)return'Loam';if((silt>=50&&clay>=12&&clay<27)||(silt>=50&&silt<80&&clay<12))return'Silt loam';if(silt>=80&&clay<12)return'Silt';
  if(clay>=20&&clay<35&&silt<28&&sand>45)return'Sandy clay loam';if(clay>=27&&clay<40&&sand>20&&sand<=45)return'Clay loam';if(clay>=27&&clay<40&&sand<=20)return'Silty clay loam';
  if(clay>=35&&sand>45)return'Sandy clay';if(clay>=40&&silt>=40)return'Silty clay';if(clay>=40&&sand<=45&&silt<40)return'Clay';return'Other'}
const SOIL_CLASSES=['Sand','Loamy sand','Sandy loam','Loam','Silt loam','Silt','Sandy clay loam','Clay loam','Silty clay loam','Sandy clay','Silty clay','Clay'];
GX.soiltex=function(c,W,H,top){const S=gxSeries(this);if(S.length<3)return this.empty(c,W,H,'Select three Y columns: sand %, silt %, clay %.');this.kind=null;const g=this.g,pal=this.p,fs=g.fs||12,m1=new Map(S[1].d.rows.map((r,i)=>[r,S[1].d.y[i]])),m2=new Map(S[2].d.rows.map((r,i)=>[r,S[2].d.y[i]])),rows=S[0].d.rows.map((r,i)=>m1.has(r)&&m2.has(r)?{sa:S[0].d.y[i],si:m1.get(r),cl:m2.get(r)}:null).filter(Boolean).map(q=>{const s=q.sa+q.si+q.cl||1;return{sa:100*q.sa/s,si:100*q.si/s,cl:100*q.cl/s}});
  const side=Math.min((W-40)/1,(H-top-50)/(Math.sqrt(3)/2)),h=side*Math.sqrt(3)/2,x0=(W-side)/2,y0=top+30+(H-top-70-h)/2+h,TOP=[x0+side/2,y0-h],BL=[x0,y0],BR=[x0+side,y0],pt=(sa,si,cl)=>[(cl*TOP[0]+sa*BL[0]+si*BR[0])/100,(cl*TOP[1]+sa*BL[1]+si*BR[1])/100];
  const N=100,st=100/N,hh=st/2,col=Object.fromEntries(SOIL_CLASSES.map((n,i)=>[n,PALETTE[i%PALETTE.length]])),cen={},P2=(sa,cl)=>pt(sa,100-sa-cl,cl),cls=(sa,cl)=>sa<0||cl<0||sa+cl>100?'':usdaClass(sa,cl);
  for(let ci=0;ci<N;ci++)for(let sj=0;sj<N-ci;sj++){const cl=(ci+.5)*st,sa=(sj+.5)*st;if(100-sa-cl<0)continue;const cn=cls(sa,cl);if(!cn||cn==='Other')continue;c.beginPath();[[sa-hh,cl-hh],[sa+hh,cl-hh],[sa+hh,cl+hh],[sa-hh,cl+hh]].forEach(([a,b],i)=>{const p=P2(a,b);i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])});c.closePath();c.fillStyle=col[cn];c.globalAlpha=.3;c.fill();c.globalAlpha=1;(cen[cn]=cen[cn]||[]).push(P2(sa,cl))}
  c.strokeStyle=pal.ink;c.lineWidth=.9;c.beginPath();for(let ci=0;ci<N;ci++)for(let sj=0;sj<N-ci;sj++){const cl=(ci+.5)*st,sa=(sj+.5)*st,a=cls(sa,cl);if(!a)continue;const r=cls(sa+st,cl),u=cls(sa,cl+st);
    if(r&&r!==a){const p=P2(sa+hh,cl-hh),q=P2(sa+hh,cl+hh);c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1])}if(u&&u!==a){const p=P2(sa-hh,cl+hh),q=P2(sa+hh,cl+hh);c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1])}}c.stroke();
  c.strokeStyle=pal.ink;c.lineWidth=1.8;c.beginPath();c.moveTo(TOP[0],TOP[1]);c.lineTo(BL[0],BL[1]);c.lineTo(BR[0],BR[1]);c.closePath();c.stroke();
  c.fillStyle=pal.ink;c.font=`${fs-2}px ${this.ff}`;c.textAlign='center';Object.entries(cen).forEach(([n,a])=>{c.fillText(n,Mx.mean(a.map(p=>p[0])),Mx.mean(a.map(p=>p[1]))+3)});
  c.font=`bold ${fs}px ${this.ff}`;c.fillText('Clay %',TOP[0],TOP[1]-8);c.textAlign='right';c.fillText('Sand %',BL[0]-4,BL[1]+fs+4);c.textAlign='left';c.fillText('Silt %',BR[0]+4,BR[1]+fs+4);
  c.font=`${fs-3}px ${this.ff}`;c.fillStyle=pal.mut;for(let v=20;v<100;v+=20){let p=pt(100-v,0,v);c.textAlign='right';c.fillText(v,p[0]-4,p[1]+3);p=pt(v,100-v,0);c.textAlign='center';c.fillText(v,p[0],p[1]+fs);p=pt(0,v,100-v);c.textAlign='left';c.fillText(v,p[0]+5,p[1]+3)}
  const cnt={};rows.forEach(q=>{const cn=usdaClass(q.sa,q.cl),p=pt(q.sa,q.si,q.cl);cnt[cn]=(cnt[cn]||0)+1;c.beginPath();c.arc(p[0],p[1],4.2,0,TAU);c.fillStyle='#111';c.fill();c.strokeStyle='#fff';c.lineWidth=1.2;c.stroke();if(this.live)this.hits.push({px:p[0],py:p[1],text:`${cn}: sand ${Mx.fmt(q.sa,3)}%, silt ${Mx.fmt(q.si,3)}%, clay ${Mx.fmt(q.cl,3)}%`,color:'#111'})});
  if(Object.keys(cnt).length){c.fillStyle=pal.ink;c.font=`${fs-1}px ${this.ff}`;c.textAlign='left';let y=top+14;Object.entries(cnt).forEach(([n,k])=>{c.fillText(`${n}: ${k}`,12,y);y+=14})}};

// ---- Tile-grid map ----
const US_TILES={AK:[0,0],ME:[11,0],VT:[10,1],NH:[11,1],WA:[1,2],ID:[2,2],MT:[3,2],ND:[4,2],MN:[5,2],IL:[6,2],WI:[7,2],MI:[8,2],NY:[9,2],RI:[10,2],MA:[11,2],OR:[1,3],NV:[2,3],WY:[3,3],SD:[4,3],IA:[5,3],IN:[6,3],OH:[7,3],PA:[8,3],NJ:[9,3],CT:[10,3],CA:[1,4],UT:[2,4],CO:[3,4],NE:[4,4],MO:[5,4],KY:[6,4],WV:[7,4],VA:[8,4],MD:[9,4],DE:[10,4],AZ:[2,5],NM:[3,5],KS:[4,5],AR:[5,5],TN:[6,5],NC:[7,5],SC:[8,5],DC:[9,5],OK:[4,6],LA:[5,6],MS:[6,6],AL:[7,6],GA:[8,6],HI:[0,7],TX:[4,7],FL:[9,7]};
GX.tilemap=function(c,W,H,top){const S=gxSeries(this);if(!S.length)return this.empty(c,W,H);this.kind=null;const g=this.g,pal=this.p,fs=g.fs||12,d=S[0].d,lab=gxLabels(this,d),nm=g.cmap||'viridis',st=lab.filter(l=>US_TILES[l.toUpperCase()]).length>=Math.max(1,lab.length/2);let pos={};
  if(st)lab.forEach(l=>{pos[l]=US_TILES[l.toUpperCase()]});else{const n=Math.ceil(Math.sqrt(lab.length));lab.forEach((l,i)=>pos[l]=[i%n,Math.floor(i/n)])}
  const cells=lab.map((l,i)=>pos[l]?{l,v:d.y[i],p:pos[l]}:null).filter(Boolean);if(!cells.length)return this.empty(c,W,H);const mc=Math.max(...cells.map(q=>q.p[0]))+1,mr=Math.max(...cells.map(q=>q.p[1]))+1,sz=Math.min((W-120)/mc,(H-top-50)/mr),ox=(W-sz*mc)/2,oy=top+14,vl=Math.min(...cells.map(q=>q.v)),vh=Math.max(...cells.map(q=>q.v));
  cells.forEach(q=>{const x=ox+q.p[0]*sz,y=oy+q.p[1]*sz,col=cmap(nm,(q.v-vl)/((vh-vl)||1));c.fillStyle=col;c.fillRect(x+1.5,y+1.5,sz-3,sz-3);const t=(q.v-vl)/((vh-vl)||1);c.fillStyle=t>.55?'#111':'#fff';c.font=`bold ${Math.max(8,Math.min(fs,sz*.28))}px ${this.ff}`;c.textAlign='center';c.fillText(q.l,x+sz/2,y+sz*.5);c.font=`${Math.max(7,Math.min(fs-2,sz*.22))}px ${this.ff}`;if(sz>34)c.fillText(Mx.fmt(q.v,3),x+sz/2,y+sz*.78);if(this.live)this.hits.push({px:x+sz/2,py:y+sz/2,text:`${q.l}: ${Mx.fmt(q.v,4)}`,color:col})});
  this.colorbar(c,{x:ox+sz*mc,y:oy,w:62,h:sz*mr},[vl,vh],nm,pal,fs)};

// ---- Heatmap with dendrograms ----
function avgLink(vecs){const n=vecs.length;if(n<2)return{order:[0],tree:{leaf:0,h:0}};const dist=(a,b)=>{let s=0;for(let k=0;k<a.length;k++){const d=a[k]-b[k];s+=d*d}return Math.sqrt(s)},nodes=vecs.map((_,i)=>({leaf:i,h:0,size:1,members:[i]})),D=new Map();const key=(a,b)=>a<b?a+','+b:b+','+a;let alive=nodes.map((_,i)=>i);const all=nodes.slice();
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)D.set(key(i,j),dist(vecs[i],vecs[j]));
  while(alive.length>1){let bi=-1,bj=-1,bd=Infinity;for(let x=0;x<alive.length;x++)for(let y=x+1;y<alive.length;y++){const d=D.get(key(alive[x],alive[y]));if(d<bd){bd=d;bi=alive[x];bj=alive[y]}}
    const id=all.length,a=all[bi],b=all[bj],node={l:a,r:b,h:bd,size:a.size+b.size};all.push(node);alive=alive.filter(q=>q!==bi&&q!==bj);alive.forEach(o=>{const dd=(D.get(key(o,bi))*a.size+D.get(key(o,bj))*b.size)/(a.size+b.size);D.set(key(o,id),dd)});alive.push(id)}
  const root=all[alive[0]],order=[];const walk=nd=>{if(nd.leaf!==undefined)order.push(nd.leaf);else{walk(nd.l);walk(nd.r)}};walk(root);return{order,tree:root}}
GX.heatdendro=function(c,W,H,top){const g=this.g,pal=this.p,fs=g.fs||12,M=this.matrix(),nr=M.z.length,nc=M.xv.length;if(nr<2||nc<2)return this.empty(c,W,H,'Needs a matrix with at least 2 rows and 2 columns.');this.kind=null;
  let Z=M.z.map(r=>r.map(v=>Number.isFinite(v)?v:0));if(g.zrow){Z=Z.map(r=>{const m=Mx.mean(r),s=Mx.sd(r)||1;return r.map(v=>(v-m)/s)})}
  const rc=avgLink(Z),cc=avgLink(Z[0].map((_,j)=>Z.map(r=>r[j]))),sh=this.sheet(),lc=g.labelCol!=null&&g.labelCol>=0?sh.cols[g.labelCol]:null,rowLab=i=>lc?String(lc.d[i]??''):String(Mx.fmt(M.yv[i],4)),colLab=j=>sh.isMatrix?String(Mx.fmt(M.xv[j],4)):(sh.cols[(g.mcols&&g.mcols[j])??j]?.name||String(j+1));
  const lw=90,tw=70,rw=Math.min(140,W*.18),bh=Math.min(90,H*.14),x0=lw+10,y0=top+tw+8,w=W-x0-rw,h=H-y0-bh,cw=w/nc,ch2=h/nr,z0=Math.min(...Z.flat()),z1=Math.max(...Z.flat()),nm=g.cmap||'viridis';if(w<40||h<40)return;
  rc.order.forEach((ri,i)=>cc.order.forEach((cj,j)=>{c.fillStyle=cmap(nm,(Z[ri][cj]-z0)/((z1-z0)||1));c.fillRect(x0+j*cw,y0+i*ch2,Math.ceil(cw)+.5,Math.ceil(ch2)+.5)}));
  const hmax=t=>t.leaf!==undefined?0:Math.max(t.h,hmax(t.l),hmax(t.r)),dd=(tree,order,horiz)=>{const posOf={};order.forEach((k,i)=>posOf[k]=i);const H0=hmax(tree)||1,len=horiz?lw:tw;c.strokeStyle=pal.ink;c.lineWidth=1;
    const rec=nd=>{if(nd.leaf!==undefined)return{p:posOf[nd.leaf]+.5,h:0};const a=rec(nd.l),b=rec(nd.r),hh=nd.h/H0*(len-4),seg=(p,h0,h1)=>{if(horiz){const X=x0-6-h0,X2=x0-6-h1,Y=y0+p*ch2;c.moveTo(X,Y);c.lineTo(X2,Y)}else{const Y=y0-6-h0,Y2=y0-6-h1,X=x0+p*cw;c.moveTo(X,Y);c.lineTo(X,Y2)}},join=(h,p0,p1)=>{if(horiz){const X=x0-6-h;c.moveTo(X,y0+p0*ch2);c.lineTo(X,y0+p1*ch2)}else{const Y=y0-6-h;c.moveTo(x0+p0*cw,Y);c.lineTo(x0+p1*cw,Y)}};
      c.beginPath();seg(a.p,a.h,hh);seg(b.p,b.h,hh);join(hh,a.p,b.p);c.stroke();return{p:(a.p+b.p)/2,h:hh}};rec(tree)};
  dd(rc.tree,rc.order,true);dd(cc.tree,cc.order,false);c.fillStyle=pal.ink;c.font=`${Math.min(fs-1,ch2+1)}px ${this.ff}`;c.textAlign='left';if(ch2>=8)rc.order.forEach((ri,i)=>c.fillText(rowLab(ri),x0+w+6,y0+(i+.5)*ch2+3));
  c.font=`${Math.min(fs-1,cw+1)}px ${this.ff}`;if(cw>=8)cc.order.forEach((cj,j)=>{c.save();c.translate(x0+(j+.5)*cw+3,y0+h+6);c.rotate(Math.PI/3);c.textAlign='left';c.fillText(colLab(cj),0,0);c.restore()});
  c.strokeStyle=pal.ink;c.strokeRect(x0,y0,w,h);if(this.live)rc.order.forEach((ri,i)=>cc.order.forEach((cj,j)=>{if(nr*nc<=2500)this.hits.push({px:x0+(j+.5)*cw,py:y0+(i+.5)*ch2,text:`${rowLab(ri)} × ${colLab(cj)}: ${Mx.fmt(M.z[ri][cj],4)}`,color:'#888'})}))};

Object.assign(GTYPES,{pie3d:'3D Pie',column3d:'3D Columns',waterfall3d:'3D Waterfall',isosurface:'Isosurface',polarquiver:'Polar Quiver',durov:'Durov Diagram',soiltex:'Soil Texture (USDA)',tilemap:'Tile-Grid Map',heatdendro:'Heatmap + Dendrograms'});
RIB.Plot.push(['3D charts',[tx('pie3d','3D pie','3Dp'),tx('column3d','3D columns','3Dc'),tx('waterfall3d','3D waterfall','3Dw'),tx('isosurface','Isosurface','Iso')]]);
RIB.Plot.push(['Maps & fields',[tx('tilemap','Tile-grid map','Til'),tx('polarquiver','Polar quiver','PQ'),tx('heatdendro','Clustered heatmap','HmD')]]);
RIB.Plot.push(['Classification',[tx('soiltex','Soil texture','Soil'),tx('durov','Durov','Dur')]]);
