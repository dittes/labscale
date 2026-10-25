'use strict';
// Extra graph types, axis styling, annotation shapes, and chart helpers.
const GX={};
const hexRGBA=(col,a)=>{const[r,g,b]=cssColor(col);return`rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})`};
function fmtAxis(v,mode,dec){const d=Number.isFinite(dec)?dec:2;switch(mode){case'fixed':return v.toFixed(d);case'sci':return v.toExponential(d);case'pct':return(v*100).toFixed(d)+'%';case'int':return String(Math.round(v));case'sig':return v.toPrecision(d+1);case'eng':{const e=Math.floor(Math.log10(Math.abs(v)||1)/3)*3;return(v/Math.pow(10,e)).toFixed(d)+(e?'e'+e:'')}default:return null}}

// ---------- small Chart helpers ----------
Chart.prototype.rowOk=function(s,i,sh){const g=this.g;if(s.r0!=null&&i<s.r0-1)return false;if(s.r1!=null&&i>=s.r1)return false;
  if(s.filt&&s.filt.col>=0&&String(sh.cols[s.filt.col]?.d[i])!==String(s.filt.val))return false;if(g.filt&&g.filt.col>=0&&String(sh.cols[g.filt.col]?.d[i])!==String(g.filt.val))return false;
  const sl=g.slice;if(sl&&sl.levels&&sl.col!=null&&!sl.levels.includes(String(sh.cols[sl.col]?.d[i])))return false;return true};
Chart.prototype.tok=function(str,s){if(!str||str.indexOf('{')<0)return str;const g=this.g,sh=this.getSheet(g.sheetId)||{cols:[],name:''},ss=s||g.series[0]||{},yc=sh.cols[ss.y]||{},xc=(ss.x!=null&&sh.cols[ss.x])||{};
  const map={sheet:sh.name,y:yc.name||'',x:xc.name||'',yunit:yc.unit||'',xunit:xc.unit||'',ycomment:yc.comment||'',xcomment:xc.comment||'',date:new Date().toLocaleDateString()};return str.replace(/(?<![_^])\{(\w+)\}/g,(m,k)=>k in map?map[k]:m)};
Chart.prototype.dim=function(si,col){const h=this.g.hi;return h!=null&&h!==si?hexRGBA(col,.22):col};
Chart.prototype.colorbar=function(c,R,zr,nm,pal,fs){const x=R.x+R.w-26,y0=R.y+R.h*.08,h=R.h*.45;for(let i=0;i<h;i++){c.fillStyle=cmap(nm,1-i/h);c.fillRect(x,y0+i,10,2)}c.strokeStyle=pal.ink;c.lineWidth=1;c.strokeRect(x+.5,y0+.5,10,h);c.fillStyle=pal.ink;c.textAlign='right';c.font=`${fs-2}px ${this.ff}`;c.fillText(Mx.fmt(zr[1],3),x-3,y0+8);c.fillText(Mx.fmt(zr[0],3),x-3,y0+h)};
Chart.prototype.clickSelect=function(x,y){if(!['cart'].includes(this.kind)||this.mode!=='pan')return;let best=null,bd=14*14;this.hits.forEach(h=>{if(h.si===undefined)return;const d=(h.px-x)**2+(h.py-y)**2;if(d<bd){bd=d;best=h}});const g=this.g;
  if(best){g.hi=g.hi===best.si?null:best.si}else if(g.hi!=null)g.hi=null;else return;this.render()};
Chart.prototype.customAxes=function(ax,ay,hz){const g=this.g;if(hz)return;
  const apply=(A,list,labels,scale)=>{if(!list||!String(list).trim()||scale!=='linear')return;const vs=String(list).split(/[,;]/).map(s=>parseFloat(s)).filter(Number.isFinite),ls=labels?String(labels).split(/[,;]/):[];A.ticks=vs.filter(v=>v>=Math.min(A.lo,A.hi)&&v<=Math.max(A.lo,A.hi)).map((v,i)=>({v,label:(ls[i]!==undefined&&ls[i].trim()!=='')?ls[i].trim():fmtTick(v)}))};
  apply(ax,g.xticks,g.xticklabels,g.xs);apply(ay,g.yticks,g.yticklabels,g.ys)};

// ---------- axis ticks with styling ----------
Chart.prototype.axisTicks=function(c,HA,VA,R,fs,pal,hz,axT,tcfg){
  const g=this.g,dirH=g.xtickdir||'out',dirV=g.ytickdir||'out',lenH=g.xticklen||6,lenV=g.yticklen||6,rotH=g.xrot||0;
  const text=(t,A,mode,dec)=>{if(!t.label||!mode||mode==='auto'||A.scale!=='linear'||A.date||A.isCat)return t.label;return fmtAxis(t.v,mode,dec)??t.label};
  c.strokeStyle=pal.ink;c.fillStyle=pal.ink;c.lineWidth=1.2;const y0=R.y+R.h;
  HA.ticks.forEach(t=>{const x=HA.map(t.v),L=t.minor?lenH/2:lenH;c.beginPath();if(dirH==='out'||dirH==='both'){c.moveTo(x,y0);c.lineTo(x,y0+L)}if(dirH==='in'||dirH==='both'){c.moveTo(x,y0);c.lineTo(x,y0-L)}c.stroke();
    if(t.label&&g.xlabels!==false){c.save();c.translate(x,y0+fs+(dirH==='out'||dirH==='both'?Math.max(3,lenH-3):6));if(rotH){c.rotate(-rotH*Math.PI/180);c.textAlign=rotH>0?'right':'left'}else c.textAlign='center';c.fillText(text(t,HA,hz?g.yfmt:g.xfmt,hz?g.ydec:g.xdec),0,0);c.restore()}});
  VA.ticks.forEach(t=>{const y=VA.map(t.v),L=t.minor?lenV/2:lenV;c.beginPath();if(dirV==='out'||dirV==='both'){c.moveTo(R.x,y);c.lineTo(R.x-L,y)}if(dirV==='in'||dirV==='both'){c.moveTo(R.x,y);c.lineTo(R.x+L,y)}c.stroke();
    if(t.label&&g.ylabels!==false){c.textAlign='right';c.fillText(text(t,VA,hz?g.xfmt:g.yfmt,hz?g.xdec:g.ydec),R.x-(dirV==='out'||dirV==='both'?Math.max(4,lenV+3):6),y+fs*.35)}});
  if(g.topaxis&&!axT)HA.ticks.forEach(t=>{const x=HA.map(t.v);c.beginPath();c.moveTo(x,R.y);c.lineTo(x,R.y+(t.minor?lenH/2:lenH));c.stroke()});
  if(g.rightaxis&&!Object.keys(this.ars||{}).length)VA.ticks.forEach(t=>{const y=VA.map(t.v);c.beginPath();c.moveTo(R.x+R.w,y);c.lineTo(R.x+R.w-(t.minor?lenV/2:lenV),y);c.stroke()});
  if(axT){const tc=((this.lastSeries||[]).find(q=>q.s.xaxis==='T')||{s:{}}).s.color||pal.ink;c.strokeStyle=tc;c.fillStyle=tc;axT.ticks.forEach(t=>{const x=axT.map(t.v);c.beginPath();c.moveTo(x,R.y);c.lineTo(x,R.y-(t.minor?3:6));c.stroke();if(t.label){c.textAlign='center';c.fillText(t.label,x,R.y-9)}});
    if(tcfg&&tcfg.label){c.font=`${fs+1}px ${this.ff}`;c.textAlign='center';this.rt(c,this.tok(tcfg.label),R.x+R.w/2,R.y-fs-14);c.font=`${fs}px ${this.ff}`}c.strokeStyle=pal.ink;c.fillStyle=pal.ink}
  // axis break marks
  [[HA,true],[VA,false]].forEach(([A,horiz])=>{if(!A.tf||!A.tf.brk)return;const a=A.map(A.tf.brk[0]),b=A.map(A.tf.brk[1]),m=(a+b)/2;c.fillStyle=pal.bg;c.strokeStyle=pal.ink;c.lineWidth=1.2;
    if(horiz){c.fillRect(Math.min(a,b),y0-1.5,Math.abs(b-a),4);c.fillRect(Math.min(a,b),R.y-1.5,Math.abs(b-a),4);[R.y,y0].forEach(yy=>{c.beginPath();c.moveTo(m-7,yy+5);c.lineTo(m-2,yy-5);c.moveTo(m+2,yy+5);c.lineTo(m+7,yy-5);c.stroke()})}
    else{c.fillRect(R.x-1.5,Math.min(a,b),4,Math.abs(b-a));c.fillRect(R.x+R.w-1.5,Math.min(a,b),4,Math.abs(b-a));[R.x,R.x+R.w].forEach(xx=>{c.beginPath();c.moveTo(xx-5,m+7);c.lineTo(xx+5,m+2);c.moveTo(xx-5,m-2);c.lineTo(xx+5,m-7);c.stroke()})}});
};

// ---------- categorical stat plots ----------
Chart.prototype.catplot=function(c,d,x,pt,col,live,pal){const g=this.g,y=d.y,n=y.length;if(!n)return;const m=Mx.mean(y),sd=n>1?Mx.sd(y):0,se=sd/Math.sqrt(n),et=g.errtype||'sd',e=et==='sem'?se:et==='ci95'&&n>1?se*Mx.tcrit(.05,n-1):sd,t=g.type;
  c.strokeStyle=col;c.fillStyle=col;c.lineWidth=1.6;const cap=(xx,ym,ee)=>{const[px,a]=pt(xx,ym+ee),[,b]=pt(xx,ym-ee);c.beginPath();c.moveTo(px,a);c.lineTo(px,b);c.moveTo(px-6,a);c.lineTo(px+6,a);c.moveTo(px-6,b);c.lineTo(px+6,b);c.stroke()};
  if(t==='meanbar'){const[a,by]=pt(x-.3,0),[b,ty]=pt(x+.3,m);c.globalAlpha=.7;c.fillRect(Math.min(a,b),Math.min(by,ty),Math.abs(b-a),Math.abs(by-ty));c.globalAlpha=1;c.strokeRect(Math.min(a,b),Math.min(by,ty),Math.abs(b-a),Math.abs(by-ty));cap(x,m,e)}
  else if(t==='interval'){cap(x,m,e);const[px,py]=pt(x,m);drawSym(c,'square',px,py,4.5,col)}
  else if(t==='colscatter'){y.forEach((v,i)=>{const[px,py]=pt(x+(((i*0.6180339)%1)-.5)*.5,v);drawSym(c,'circle',px,py,3.2,col,true)});const[a,ym]=pt(x-.28,m),[b]=pt(x+.28,m);c.lineWidth=2.2;c.beginPath();c.moveTo(a,ym);c.lineTo(b,ym);c.stroke();cap(x+.34,m,e)}
  else{const pts=y.map(v=>pt(x,v)).sort((p,q)=>p[1]-q[1]),placed=[],rr=3.4;pts.forEach(p=>{let off=0,k=0;for(;;){const cand=k===0?0:((k%2?1:-1)*Math.ceil(k/2)*rr*1.05);if(placed.every(q=>Math.hypot(q[0]-(p[0]+cand),q[1]-p[1])>=rr*2)){off=cand;break}k++;if(k>200)break}placed.push([p[0]+off,p[1]]);drawSym(c,'circle',p[0]+off,p[1],rr,col,true)})}
  if(live){const[px,py]=pt(x,m);this.hits.push({px,py,text:`${d.name}: mean ${Mx.fmt(m)} ± ${Mx.fmt(e)} (${et}), n=${n}`,color:col})}};

// ---------- annotation shapes ----------
Chart.prototype.drawShapes=function(c,pt,R){const g=this.g,pal=this.p;(g.shapes||[]).forEach((s,i)=>{if(s.hide)return;const[a,b]=pt(s.x0,s.y0),[a2,b2]=pt(s.x1,s.y1);c.strokeStyle=s.color||'#dc2626';c.fillStyle=s.color||'#dc2626';c.lineWidth=s.lw||2;c.setLineDash(s.dash?[6,4]:[]);
  if(s.t==='line'||s.t==='arrow'){c.beginPath();c.moveTo(a,b);c.lineTo(a2,b2);c.stroke();if(s.t==='arrow'){const an=Math.atan2(b2-b,a2-a),h=10;c.beginPath();c.moveTo(a2,b2);c.lineTo(a2-h*Math.cos(an-.4),b2-h*Math.sin(an-.4));c.lineTo(a2-h*Math.cos(an+.4),b2-h*Math.sin(an+.4));c.closePath();c.fill()}}
  else if(s.t==='rect'){const x=Math.min(a,a2),y=Math.min(b,b2),w=Math.abs(a2-a),h=Math.abs(b2-b);if(s.fill){c.globalAlpha=.25;c.fillStyle=s.fill;c.fillRect(x,y,w,h);c.globalAlpha=1}c.strokeRect(x,y,w,h)}
  else if(s.t==='ellipse'){const cx=(a+a2)/2,cy=(b+b2)/2,rx=Math.abs(a2-a)/2,ry=Math.abs(b2-b)/2,K=.5522847498;c.beginPath();c.moveTo(cx+rx,cy);c.bezierCurveTo(cx+rx,cy+K*ry,cx+K*rx,cy+ry,cx,cy+ry);c.bezierCurveTo(cx-K*rx,cy+ry,cx-rx,cy+K*ry,cx-rx,cy);c.bezierCurveTo(cx-rx,cy-K*ry,cx-K*rx,cy-ry,cx,cy-ry);c.bezierCurveTo(cx+K*rx,cy-ry,cx+rx,cy-K*ry,cx+rx,cy);c.closePath();if(s.fill){c.globalAlpha=.25;c.fillStyle=s.fill;c.fill();c.globalAlpha=1}c.stroke()}
  else if(s.t==='text'){c.font=`${s.fs||g.fs||12}px ${this.ff}`;c.textAlign='left';c.fillStyle=s.color||pal.ink;this.rt(c,this.tok(s.text||''),a,b)}
  else if(s.t==='image'&&s.src&&typeof c.drawImage==='function'){const im=(this.imgs=this.imgs||{})[s.src]||(this.imgs[s.src]=Object.assign(new Image(),{src:s.src,onload:()=>this.render()}));if(im.complete&&im.naturalWidth)c.drawImage(im,Math.min(a,a2),Math.min(b,b2),Math.abs(a2-a)||im.naturalWidth/2,Math.abs(b2-b)||im.naturalHeight/2)}
  c.setLineDash([]);if(g.selShape===i&&this.live){c.strokeStyle='#2563eb';c.lineWidth=1;c.setLineDash([3,3]);const x=Math.min(a,a2)-4,y=Math.min(b,b2)-(s.t==='text'?(s.fs||12):4),w=Math.abs(a2-a)+8,h=Math.abs(b2-b)+(s.t==='text'?(s.fs||12)+6:8);c.strokeRect(x,y,s.t==='text'?60:w,s.t==='text'?h:h);c.setLineDash([]);[[a,b],[a2,b2]].forEach(p=>{c.fillStyle='#2563eb';c.fillRect(p[0]-3,p[1]-3,6,6)})}})};
Chart.prototype.shapeAt=function(x,y){const g=this.g,pt=(X,Y)=>[this.ax.map(X),this.ay.map(Y)];const sh=g.shapes||[];for(let i=sh.length-1;i>=0;i--){const s=sh[i],[a,b]=pt(s.x0,s.y0),[a2,b2]=pt(s.x1,s.y1);let hit=false;
  if(s.t==='line'||s.t==='arrow'){const dx=a2-a,dy=b2-b,L=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((x-a)*dx+(y-b)*dy)/L)),px=a+t*dx,py=b+t*dy;hit=Math.hypot(x-px,y-py)<7}
  else if(s.t==='text'){hit=x>=a-2&&x<=a+Math.max(40,(s.text||'').length*(s.fs||12)*.6)&&y>=b-(s.fs||12)-2&&y<=b+4}
  else{const x0=Math.min(a,a2),x1=Math.max(a,a2),y0=Math.min(b,b2),y1=Math.max(b,b2);hit=x>=x0-4&&x<=x1+4&&y>=y0-4&&y<=y1+4}
  if(hit)return i}return-1};
Chart.prototype.shapeMouse=function(x,y,e,setDrag){const g=this.g;if(this.kind!=='cart'||this.hz||!this.inPlot(x,y))return false;
  if(this.mode==='movept'){let best=null,bd=18*18;this.hits.forEach(h=>{if(h.si===undefined)return;const d=(h.px-x)**2+(h.py-y)**2;if(d<bd){bd=d;best=h}});if(best){this.onEditPoint&&this.onEditPoint('start');setDrag({t:'movept',hit:best})}return true}
  if(this.mode==='drawpt'){const q=this.lastSeries&&this.lastSeries[0];if(q&&this.onEditPoint){const axis=q.s.axis,A=axis&&axis!=='L'&&this.ars[axis]?this.ars[axis]:this.ay;this.onEditPoint('add',{s:q.s,x:this.ax.unmap(x),y:A.unmap(y)})}return true}
  if(this.mode!=='shape')return false;g.shapes=g.shapes||[];
  if(this.shapeTool==='pointer'||!this.shapeTool){const i=this.shapeAt(x,y);g.selShape=i;if(i>=0)setDrag({t:'shapemove',i,px:x,py:y,orig:{...g.shapes[i]}});this.render();this.onShape&&this.onShape();return true}
  const dx=this.ax.unmap(x),dy=this.ay.unmap(y);
  if(this.shapeTool==='text'){const t=prompt('Text:');if(t){g.shapes.push({t:'text',x0:dx,y0:dy,x1:dx,y1:dy,text:t,color:this.p.ink,fs:g.fs||12});g.selShape=g.shapes.length-1;this.render();this.onShape&&this.onShape()}return true}
  g.shapes.push({t:this.shapeTool,x0:dx,y0:dy,x1:dx,y1:dy,color:'#dc2626',lw:2,fill:''});g.selShape=g.shapes.length-1;setDrag({t:'shape',i:g.selShape});return true};
Chart.prototype.shapeDrag=function(d,x,y){const g=this.g;
  if(d.t==='shape'){const s=g.shapes[d.i];s.x1=this.ax.unmap(x);s.y1=this.ay.unmap(y);this.render()}
  else if(d.t==='shapemove'){const s=g.shapes[d.i],o=d.orig,dx=this.ax.unmap(x)-this.ax.unmap(d.px),dy=this.ay.unmap(y)-this.ay.unmap(d.py);s.x0=o.x0+dx;s.x1=o.x1+dx;s.y0=o.y0+dy;s.y1=o.y1+dy;this.render()}
  else if(d.t==='movept'){const h=d.hit,q=this.lastSeries[h.si],axis=q.s.axis,A=axis&&axis!=='L'&&this.ars[axis]?this.ars[axis]:this.ay;this.onEditPoint&&this.onEditPoint('move',{s:q.s,row:h.row,x:this.ax.unmap(x),y:A.unmap(y)});this.render()}};
Chart.prototype.shapeUp=function(d){if(d.t==='movept'){this.onEditPoint&&this.onEditPoint('end')}this.onShape&&this.onShape()};

// ---------- 2D KDE matrix ----------
Chart.prototype.kde2dMatrix=function(){const g=this.g,s=g.series.find(q=>!q.hide);if(!s)return{z:[],xv:[],yv:[],zmin:0,zmax:1};const d=this.sdata(s),n=d.n;if(n<3)return{z:[],xv:[],yv:[],zmin:0,zmax:1};
  const sx=Mx.sd(d.x)||1,sy=Mx.sd(d.y)||1,hx=1.06*sx*Math.pow(n,-.2),hy=1.06*sy*Math.pow(n,-.2),x0=Math.min(...d.x)-2*hx,x1=Math.max(...d.x)+2*hx,y0=Math.min(...d.y)-2*hy,y1=Math.max(...d.y)+2*hy,N=48,xv=Array.from({length:N},(_,i)=>x0+(x1-x0)*i/(N-1)),yv=Array.from({length:N},(_,i)=>y0+(y1-y0)*i/(N-1));
  const z=yv.map(y=>xv.map(x=>{let a=0;for(let i=0;i<n;i++)a+=Math.exp(-.5*(((x-d.x[i])/hx)**2+((y-d.y[i])/hy)**2));return a/(n*2*Math.PI*hx*hy)})),f=z.flat();return{z,xv,yv,zmin:g.zmin??Math.min(...f),zmax:g.zmax??Math.max(...f)}};

// ---------- 3D faces (bars / ribbons / walls) ----------
Chart.prototype.faces3d=function(c,proj,nx,ny,nz,M,zr,nm){const g=this.g,nr=M.z.length,nc=M.xv.length,F=[],base=nz(Math.max(zr[0],Math.min(0,zr[1]))),hx=1/Math.max(nc,2)*.8,hy=1/Math.max(nr,2)*.8,col=z=>cmap(nm,(z-zr[0])/((zr[1]-zr[0])||1));
  const face=(pts,z,shade=1)=>{const P=pts.map(p=>proj(p[0],p[1],p[2]));F.push({P,d:Mx.mean(P.map(p=>p[2])),color:col(z),shade})};
  for(let k=0;k<nc;k++)for(let r=0;r<nr;r++){const z=M.z[r][k];if(!Number.isFinite(z))continue;const X=nx(M.xv[k]),Y=ny(M.yv[r]),top=nz(z);
    if(g.type==='bars3d'){const x0=X-hx,x1=X+hx,y0=Y-hy,y1=Y+hy;face([[x0,y0,top],[x1,y0,top],[x1,y1,top],[x0,y1,top]],z);face([[x0,y0,base],[x1,y0,base],[x1,y0,top],[x0,y0,top]],z,.8);face([[x1,y0,base],[x1,y1,base],[x1,y1,top],[x1,y0,top]],z,.65);face([[x0,y1,base],[x1,y1,base],[x1,y1,top],[x0,y1,top]],z,.8);face([[x0,y0,base],[x0,y1,base],[x0,y1,top],[x0,y0,top]],z,.65)}
    else if(g.type==='ribbon3d'&&r<nr-1&&Number.isFinite(M.z[r+1][k])){const Y2=ny(M.yv[r+1]),t2=nz(M.z[r+1][k]);face([[X-hx*.6,Y,top],[X+hx*.6,Y,top],[X+hx*.6,Y2,t2],[X-hx*.6,Y2,t2]],z)}
    else if(g.type==='wall3d'&&r<nr-1&&Number.isFinite(M.z[r+1][k])){const Y2=ny(M.yv[r+1]),t2=nz(M.z[r+1][k]);face([[X,Y,base],[X,Y2,base],[X,Y2,t2],[X,Y,top]],z)}}
  F.sort((a,b)=>b.d-a.d);F.forEach(f=>{c.beginPath();f.P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fillStyle=f.color;c.globalAlpha=f.shade;c.fill();c.globalAlpha=1;c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=.5;c.stroke()})};

// ---------- frame helper for custom 2D types ----------
function gxFrame(ch,c,W,H,top,o){const g=ch.g,pal=ch.p,fs=g.fs||12;c.font=`${fs}px ${ch.ff}`;
  const probe=mkAxis(o.yd[0],o.yd[1],'linear',H-60,top),wl=o.noYLabels?(o.leftPad||10):Math.max(20,...probe.ticks.map(t=>c.measureText(t.label).width)),m={l:Math.ceil(wl)+(o.yl&&!o.noYLabels?fs+18:10)+8,r:o.y2?66:16,t:top,b:fs*2+(o.xl?fs+10:6)+8},R={x:m.l,y:m.t,w:W-m.l-m.r,h:H-m.t-m.b};
  const ax=mkAxis(o.xd[0],o.xd[1],'linear',R.x,R.x+R.w,o.xcats,o.xdate),ay=mkAxis(o.yd[0],o.yd[1],'linear',R.y+R.h,R.y);
  c.lineWidth=1;ax.ticks.forEach(t=>{if(t.minor&&!g.minor)return;const x=Math.round(ax.map(t.v))+.5;c.strokeStyle=t.minor?pal.minor:pal.grid;c.beginPath();c.moveTo(x,R.y);c.lineTo(x,R.y+R.h);c.stroke()});
  if(!o.noYLabels)ay.ticks.forEach(t=>{if(t.minor&&!g.minor)return;const y=Math.round(ay.map(t.v))+.5;c.strokeStyle=t.minor?pal.minor:pal.grid;c.beginPath();c.moveTo(R.x,y);c.lineTo(R.x+R.w,y);c.stroke()});
  c.save();c.beginPath();c.rect(R.x,R.y,R.w,R.h);c.clip();o.draw&&o.draw({R,ax,ay});c.restore();
  c.strokeStyle=pal.ink;c.lineWidth=1.2;c.strokeRect(R.x+.5,R.y+.5,R.w,R.h);c.fillStyle=pal.ink;c.textAlign='center';
  ax.ticks.forEach(t=>{const x=ax.map(t.v);c.beginPath();c.moveTo(x,R.y+R.h);c.lineTo(x,R.y+R.h+(t.minor?3:6));c.stroke();if(t.label)c.fillText(t.label,x,R.y+R.h+fs+9)});
  c.textAlign='right';if(!o.noYLabels)ay.ticks.forEach(t=>{const y=ay.map(t.v);c.beginPath();c.moveTo(R.x,y);c.lineTo(R.x-(t.minor?3:6),y);c.stroke();if(t.label)c.fillText(t.label,R.x-9,y+fs*.35)});
  c.font=`${fs+1}px ${ch.ff}`;if(o.xl){c.textAlign='center';ch.rt(c,ch.tok(o.xl),R.x+R.w/2,H-8)}if(o.yl&&!o.noYLabels){c.save();c.translate(14,R.y+R.h/2);c.rotate(-Math.PI/2);c.textAlign='center';ch.rt(c,ch.tok(o.yl),0,0);c.restore()}c.font=`${fs}px ${ch.ff}`;
  ch.kind=null;return{R,ax,ay,pal,fs}}
const gxSeries=ch=>ch.g.series.filter(s=>!s.hide).map(s=>({s,d:ch.sdata(s)}));
const gxCol=(q,i)=>q.s.color||PALETTE[i%PALETTE.length];
const gxLabels=(ch,d)=>{const g=ch.g,sh=ch.sheet(),lc=g.labelCol!=null&&g.labelCol>=0?sh.cols[g.labelCol]:null;return d.rows.map((r,i)=>lc?String(lc.d[r]??''):String(i+1))};
function kde1(y,pts,lo,hi){const n=y.length,so=Mx.sorted(y),sd=Mx.sd(y)||1,iqr=(Mx.quantile(so,.75)-Mx.quantile(so,.25))/1.34,h=.9*Math.min(sd,iqr||sd)*Math.pow(n,-.2)||1;lo=lo??so[0]-2*h;hi=hi??so[n-1]+2*h;const gx=Array.from({length:pts},(_,i)=>lo+(hi-lo)*i/(pts-1));return{x:gx,y:gx.map(x=>y.reduce((a,v)=>a+Math.exp(-.5*((x-v)/h)**2),0)/(n*h*Math.sqrt(2*Math.PI)))}}

// ---------- GX: Pareto ----------
GX.pareto=function(c,W,H,top){const g=this.g,S=gxSeries(this);if(!S.length)return this.empty(c,W,H);const d=S[0].d,lab=gxLabels(this,d),items=d.y.map((v,i)=>({v:Math.abs(v),l:lab[i]})).sort((a,b)=>b.v-a.v),tot=Mx.sum(items.map(q=>q.v))||1,col=gxCol(S[0],0);
  const F=gxFrame(this,c,W,H,top,{xd:[.5,items.length+.5],yd:[0,tot],xcats:items.map(q=>q.l),y2:true,xl:g.xl,yl:g.yl||'Count',draw:({R,ax,ay})=>{c.fillStyle=col;items.forEach((q,i)=>{const x0=ax.map(i+1-.35),x1=ax.map(i+1+.35),y=ay.map(q.v);c.globalAlpha=.85;c.fillRect(x0,y,x1-x0,ay.map(0)-y);c.globalAlpha=1});
    let cum=0;c.strokeStyle='#dc2626';c.lineWidth=2;c.beginPath();items.forEach((q,i)=>{cum+=q.v;const px=ax.map(i+1),py=ay.map(cum);i?c.lineTo(px,py):c.moveTo(px,py)});c.stroke();cum=0;items.forEach((q,i)=>{cum+=q.v;drawSym(c,'circle',ax.map(i+1),ay.map(cum),3.5,'#dc2626')});
    c.setLineDash([5,4]);c.strokeStyle=this.p.mut;c.lineWidth=1;[80].forEach(p=>{const y=ay.map(tot*p/100);c.beginPath();c.moveTo(R.x,y);c.lineTo(R.x+R.w,y);c.stroke()});c.setLineDash([])}});
  c.fillStyle='#dc2626';c.textAlign='left';[0,20,40,60,80,100].forEach(p=>{const y=F.ay.map(tot*p/100);c.fillText(p+'%',F.R.x+F.R.w+8,y+4)})};

// ---------- GX: candlestick / OHLC ----------
function ohlcPlot(kind){return function(c,W,H,top){const g=this.g,S=g.series.filter(s=>!s.hide).slice(0,4);if(S.length<4)return this.empty(c,W,H,'Pick four Y columns in the order open, high, low, close (and an X column).');
  const D=S.map(s=>this.sdata(s)),mp=D.slice(1).map(d=>new Map(d.rows.map((r,i)=>[r,i]))),rows=[];
  D[0].rows.forEach((r,i)=>{const j=mp.map(m=>m.get(r));if(j.every(v=>v!==undefined))rows.push({x:D[0].x[i],o:D[0].y[i],h:D[1].y[j[0]],l:D[2].y[j[1]],c:D[3].y[j[2]]})});rows.sort((a,b)=>a.x-b.x);if(!rows.length)return this.empty(c,W,H);
  const xs=rows.map(r=>r.x),dx=xs.length>1?Math.min(...xs.slice(1).map((v,i)=>v-xs[i]).filter(v=>v>0)):1,pad=dx*.8,lo=Math.min(...rows.map(r=>r.l)),hi=Math.max(...rows.map(r=>r.h)),yp=(hi-lo)*.05||1;
  gxFrame(this,c,W,H,top,{xd:[xs[0]-pad,xs[xs.length-1]+pad],yd:[lo-yp,hi+yp],xdate:g.xdate,xl:g.xl,yl:g.yl,draw:({ax,ay})=>{rows.forEach(r=>{const up=r.c>=r.o,col=up?'#16a34a':'#dc2626',x=ax.map(r.x),w=Math.max(2,Math.abs(ax.map(r.x+dx*.35)-ax.map(r.x-dx*.35)));c.strokeStyle=col;c.fillStyle=col;c.lineWidth=1.4;
    c.beginPath();c.moveTo(x,ay.map(r.h));c.lineTo(x,ay.map(r.l));c.stroke();
    if(kind==='candle'){const y0=ay.map(r.o),y1=ay.map(r.c);c.globalAlpha=up?.35:.9;c.fillRect(x-w/2,Math.min(y0,y1),w,Math.max(1,Math.abs(y1-y0)));c.globalAlpha=1;c.strokeRect(x-w/2,Math.min(y0,y1),w,Math.max(1,Math.abs(y1-y0)))}
    else{c.beginPath();c.moveTo(x-w/2,ay.map(r.o));c.lineTo(x,ay.map(r.o));c.moveTo(x,ay.map(r.c));c.lineTo(x+w/2,ay.map(r.c));c.stroke()}})}})}}
GX.candle=ohlcPlot('candle');GX.ohlc=ohlcPlot('ohlc');

// ---------- GX: scatter matrix ----------
GX.scatmat=function(c,W,H,top){const g=this.g,S=gxSeries(this),pal=this.p,fs=g.fs||12;if(S.length<2)return this.empty(c,W,H,'Select two or more Y columns.');const N=S.length,pad=30,sz=Math.min((W-pad-10)/N,(H-top-pad-10)/N),ox=pad+((W-pad-10)-sz*N)/2,oy=top+pad*.5;this.kind=null;
  const maps=S.map(q=>new Map(q.d.rows.map((r,i)=>[r,q.d.y[i]]))),ext=S.map(q=>{const lo=Math.min(...q.d.y),hi=Math.max(...q.d.y),p=(hi-lo)*.05||1;return[lo-p,hi+p]});
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x0=ox+j*sz,y0=oy+i*sz;c.strokeStyle=pal.grid;c.lineWidth=1;c.strokeRect(x0+.5,y0+.5,sz-1,sz-1);
    if(i===j){const k=10,cnt=new Array(k).fill(0),[lo,hi]=ext[i];S[i].d.y.forEach(v=>cnt[Math.min(k-1,Math.floor((v-lo)/(hi-lo)*k))]++);const mx=Math.max(...cnt);c.fillStyle=gxCol(S[i],i);c.globalAlpha=.75;cnt.forEach((n,b)=>{const w=sz/k,h=n/mx*(sz-18);c.fillRect(x0+b*w+1,y0+sz-h-2,w-2,h)});c.globalAlpha=1;c.fillStyle=pal.ink;c.textAlign='center';c.font=`600 ${fs}px ${this.ff}`;c.fillText(S[i].d.name,x0+sz/2,y0+fs+2);c.font=`${fs}px ${this.ff}`}
    else{c.fillStyle=gxCol(S[j],j);S[j].d.rows.forEach((r,q)=>{const yv=maps[i].get(r);if(yv===undefined)return;const px=x0+(S[j].d.y[q]-ext[j][0])/(ext[j][1]-ext[j][0])*sz,py=y0+sz-(yv-ext[i][0])/(ext[i][1]-ext[i][0])*sz;c.globalAlpha=.6;c.beginPath();c.arc(px,py,2.2,0,7);c.fill();c.globalAlpha=1});
      if(j<i){const a=S[j].d.rows.filter(r=>maps[i].has(r)).map(r=>[maps[j].get(r),maps[i].get(r)]);if(a.length>2){const mx=Mx.mean(a.map(p=>p[0])),my=Mx.mean(a.map(p=>p[1]));let sxy=0,sxx=0,syy=0;a.forEach(p=>{sxy+=(p[0]-mx)*(p[1]-my);sxx+=(p[0]-mx)**2;syy+=(p[1]-my)**2});const r=sxy/Math.sqrt(sxx*syy);c.fillStyle=pal.ink;c.textAlign='right';c.font=`${fs-1}px ${this.ff}`;c.fillText('r='+r.toFixed(2),x0+sz-4,y0+fs);c.font=`${fs}px ${this.ff}`}}}}};

// ---------- GX: marginal histograms ----------
GX.marginal=function(c,W,H,top){const g=this.g,S=gxSeries(this);if(!S.length)return this.empty(c,W,H);const d=S[0].d,col=gxCol(S[0],0),pal=this.p;if(d.n<3)return this.empty(c,W,H);
  const xlo=Math.min(...d.x),xhi=Math.max(...d.x),ylo=Math.min(...d.y),yhi=Math.max(...d.y),px=(xhi-xlo)*.05||1,py=(yhi-ylo)*.05||1,B=14;
  const F=gxFrame(this,c,W-70,H,top+70,{xd:[xlo-px,xhi+px],yd:[ylo-py,yhi+py],xl:g.xl,yl:g.yl,draw:({ax,ay})=>{c.fillStyle=col;d.x.forEach((x,i)=>{c.globalAlpha=.6;c.beginPath();c.arc(ax.map(x),ay.map(d.y[i]),3.2,0,7);c.fill();c.globalAlpha=1})}});
  const hist=(vals,lo,hi,fn)=>{const cnt=new Array(B).fill(0);vals.forEach(v=>cnt[Math.min(B-1,Math.floor((v-lo)/(hi-lo)*B))]++);const mx=Math.max(...cnt);cnt.forEach((n,b)=>fn(b,n/mx))};
  c.fillStyle=col;c.globalAlpha=.7;hist(d.x,xlo-px,xhi+px,(b,f)=>{const x0=F.ax.map(xlo-px+(xhi-xlo+2*px)*b/B),x1=F.ax.map(xlo-px+(xhi-xlo+2*px)*(b+1)/B);c.fillRect(x0+1,F.R.y-4-f*60,x1-x0-2,f*60)});
  hist(d.y,ylo-py,yhi+py,(b,f)=>{const y0=F.ay.map(ylo-py+(yhi-ylo+2*py)*b/B),y1=F.ay.map(ylo-py+(yhi-ylo+2*py)*(b+1)/B);c.fillRect(F.R.x+F.R.w+4,Math.min(y0,y1)+1,f*56,Math.abs(y1-y0)-2)});c.globalAlpha=1};

// ---------- GX: ridgeline ----------
GX.ridge=function(c,W,H,top){const g=this.g,S=gxSeries(this);if(!S.length)return this.empty(c,W,H);const all=S.flatMap(q=>q.d.y),lo=Math.min(...all),hi=Math.max(...all),p=(hi-lo)*.12||1,N=S.length;
  const K=S.map(q=>kde1(q.d.y,160,lo-p,hi+p)),mx=Math.max(...K.map(k=>Math.max(...k.y)));
  const F=gxFrame(this,c,W,H,top,{xd:[lo-p,hi+p],yd:[0,N+.8],noYLabels:true,leftPad:Math.max(...S.map(q=>c.measureText(q.d.name).width))+6,xl:g.xl,draw:({R,ax,ay})=>{
    for(let i=0;i<N;i++){const base=N-1-i+.2,col=gxCol(S[i],i);c.beginPath();K[i].x.forEach((x,k)=>{const px=ax.map(x),py=ay.map(base+K[i].y[k]/mx*1.7);k?c.lineTo(px,py):c.moveTo(px,py)});c.lineTo(ax.map(hi+p),ay.map(base));c.lineTo(ax.map(lo-p),ay.map(base));c.closePath();c.globalAlpha=.55;c.fillStyle=col;c.fill();c.globalAlpha=1;c.strokeStyle=col;c.lineWidth=1.6;c.stroke()}}});
  c.fillStyle=this.p.ink;c.textAlign='right';S.forEach((q,i)=>c.fillText(q.d.name,F.R.x-6,F.ay.map(N-1-i+.2)+4))};

// ---------- GX: wind rose ----------
GX.windrose=function(c,W,H,top){const g=this.g,S=gxSeries(this),pal=this.p,fs=g.fs||12;if(!S.length)return this.empty(c,W,H);this.kind=null;const dd=S[0].d,sp=S[1]?S[1].d:null,mpS=sp?new Map(sp.rows.map((r,i)=>[r,sp.y[i]])):null;
  const dirs=dd.y.map((v,i)=>({a:((v%360)+360)%360,s:mpS?mpS.get(dd.rows[i]):1})).filter(q=>q.s!==undefined),NS=16,NB=mpS?4:1,speeds=dirs.map(q=>q.s),q=NB>1?[1,2,3].map(k=>Mx.quantile(Mx.sorted(speeds),k/4)):[],bins=Array.from({length:NS},()=>new Array(NB).fill(0));
  dirs.forEach(r=>{const sct=Math.floor(((r.a+360/NS/2)%360)/(360/NS)),b=NB>1?q.filter(t=>r.s>t).length:0;bins[sct][b]++});const tot=dirs.length||1,mx=Math.max(...bins.map(b=>Mx.sum(b)))/tot*100,top100=autoRange(0,mx,'linear',false,false)[1];
  const cx=W/2,cy=(H+top)/2,R=Math.min(W,H-top)/2-fs*2.5,toR=p=>p/top100*R;c.strokeStyle=pal.grid;c.fillStyle=pal.mut;c.lineWidth=1;c.textAlign='center';
  for(let i=1;i<=4;i++){c.beginPath();c.arc(cx,cy,R*i/4,0,7);c.stroke();c.fillText(Mx.fmt(top100*i/4,3)+'%',cx+4,cy-R*i/4-2)}
  ['N','E','S','W'].forEach((l,i)=>{const a=i*Math.PI/2-Math.PI/2;c.fillStyle=pal.ink;c.fillText(l,cx+(R+14)*Math.cos(a),cy+(R+14)*Math.sin(a)+4);c.strokeStyle=pal.grid;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+R*Math.cos(a),cy+R*Math.sin(a));c.stroke()});
  const cols=['#93c5fd','#3b82f6','#1d4ed8','#1e1b4b'],w=(360/NS)*.42*Math.PI/180;
  bins.forEach((b,i)=>{const ac=(i*360/NS-90)*Math.PI/180;let cum=0;b.forEach((n,k)=>{const r0=toR(cum/tot*100),r1=toR((cum+n)/tot*100);cum+=n;if(!n)return;c.beginPath();c.arc(cx,cy,r1,ac-w,ac+w);c.arc(cx,cy,r0,ac+w,ac-w,true);c.closePath();c.fillStyle=NB>1?cols[k]:PALETTE[0];c.fill();c.strokeStyle=pal.bg;c.lineWidth=1;c.stroke()})});
  if(NB>1){const lab=['≤ Q1','Q1–Q2','Q2–Q3','> Q3'];lab.forEach((t,k)=>{c.fillStyle=cols[k];c.fillRect(12,top+8+k*16,12,10);c.fillStyle=pal.ink;c.textAlign='left';c.fillText(t,28,top+17+k*16)})}};

// ---------- GX: radial bar ----------
GX.radialbar=function(c,W,H,top){const g=this.g,S=gxSeries(this),pal=this.p,fs=g.fs||12;if(!S.length)return this.empty(c,W,H);this.kind=null;const d=S[0].d,lab=gxLabels(this,d),n=d.n,vmax=Math.max(...d.y.map(Math.abs))||1,cx=W/2,cy=(H+top)/2,R=Math.min(W,H-top)/2-fs,r0=R*.25,sw=(R-r0)/n;
  d.y.forEach((v,i)=>{const r=r0+sw*(n-1-i)+sw/2,a1=Math.abs(v)/vmax*Math.PI*1.5,col=PALETTE[i%PALETTE.length];c.strokeStyle=pal.grid;c.lineWidth=sw*.8;c.beginPath();c.arc(cx,cy,r,-Math.PI/2,Math.PI,false);c.stroke();c.strokeStyle=col;c.lineWidth=sw*.8;c.beginPath();c.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+a1,false);c.stroke();
    c.fillStyle=pal.ink;c.textAlign='right';c.font=`${Math.min(fs,sw*.7)}px ${this.ff}`;c.fillText(`${lab[i]}  ${Mx.fmt(v,4)}`,cx-4,cy-r+sw*.25)});c.font=`${fs}px ${this.ff}`};

// ---------- GX: Smith chart ----------
GX.smith=function(c,W,H,top){const g=this.g,S=gxSeries(this),pal=this.p;this.kind=null;const cx=W/2,cy=(H+top)/2,R=Math.min(W,H-top)/2-20;c.save();c.beginPath();c.arc(cx,cy,R,0,7);c.clip();c.strokeStyle=pal.grid;c.lineWidth=1;
  [0,.2,.5,1,2,5].forEach(r=>{c.beginPath();c.arc(cx+R*r/(1+r),cy,R/(1+r),0,7);c.stroke()});
  [.2,.5,1,2,5].forEach(x=>{[1,-1].forEach(sg=>{c.beginPath();c.arc(cx+R,cy-sg*R/x,R/x,0,7);c.stroke()})});c.beginPath();c.moveTo(cx-R,cy);c.lineTo(cx+R,cy);c.stroke();c.restore();c.strokeStyle=pal.ink;c.lineWidth=1.4;c.beginPath();c.arc(cx,cy,R,0,7);c.stroke();
  c.fillStyle=pal.mut;c.textAlign='center';[0,.2,.5,1,2,5].forEach(r=>c.fillText(String(r),cx+R*(r-1)/(r+1)-0,cy+11));
  if(S.length>=2){const re=S[0].d,im=S[1].d,mp=new Map(im.rows.map((r,i)=>[r,im.y[i]])),P=[];re.rows.forEach((r,i)=>{const x=mp.get(r);if(x===undefined)return;const a=re.y[i],den=(a+1)**2+x*x;P.push([cx+R*((a*a+x*x-1)/den),cy-R*(2*x/den)])});c.strokeStyle=PALETTE[0];c.lineWidth=2;c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();P.forEach(p=>drawSym(c,'circle',p[0],p[1],3.5,PALETTE[0]))}
  else{c.fillStyle=pal.mut;c.fillText('Select two Y columns: normalized resistance and reactance.',cx,top+14)}};

// ---------- GX: ternary ----------
GX.ternary=function(c,W,H,top){const g=this.g,S=gxSeries(this),pal=this.p,fs=g.fs||12;this.kind=null;const side=Math.min(W-80,(H-top-50)/(Math.sqrt(3)/2)),hgt=side*Math.sqrt(3)/2,x0=(W-side)/2,y0=top+20+hgt;
  const P=(a,b,cc)=>{const t=a+b+cc||1;return[x0+side*(.5*(2*b+cc)/t),y0-hgt*(cc/t)]},A=P(1,0,0),B=P(0,1,0),C=P(0,0,1);c.strokeStyle=pal.grid;c.lineWidth=1;
  for(let i=1;i<5;i++){const t=i/5;[[P(t,1-t,0),P(t,0,1-t)],[P(1-t,t,0),P(0,t,1-t)],[P(1-t,0,t),P(0,1-t,t)]].forEach(([p,q])=>{c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);c.stroke()})}
  c.strokeStyle=pal.ink;c.lineWidth=1.5;c.beginPath();c.moveTo(A[0],A[1]);c.lineTo(B[0],B[1]);c.lineTo(C[0],C[1]);c.closePath();c.stroke();c.fillStyle=pal.ink;c.font=`600 ${fs+1}px ${this.ff}`;c.textAlign='center';
  const names=S.length>=3?S.slice(0,3).map(q=>q.d.name):['A','B','C'];c.fillText(names[0],A[0]-14,A[1]+fs+4);c.fillText(names[1],B[0]+14,B[1]+fs+4);c.fillText(names[2],C[0],C[1]-10);c.font=`${fs-2}px ${this.ff}`;c.fillStyle=pal.mut;for(let i=1;i<5;i++){const t=i/5,p=P(1-t,t,0);c.fillText(Math.round(t*100)+'',p[0],p[1]+fs+2)}
  if(S.length>=3){const m1=new Map(S[1].d.rows.map((r,i)=>[r,S[1].d.y[i]])),m2=new Map(S[2].d.rows.map((r,i)=>[r,S[2].d.y[i]]));S[0].d.rows.forEach((r,i)=>{const b=m1.get(r),cc=m2.get(r);if(b===undefined||cc===undefined)return;const p=P(S[0].d.y[i],b,cc);drawSym(c,'circle',p[0],p[1],4,PALETTE[0],true);if(this.live)this.hits.push({px:p[0],py:p[1],text:`${names[0]}=${Mx.fmt(S[0].d.y[i])} ${names[1]}=${Mx.fmt(b)} ${names[2]}=${Mx.fmt(cc)}`,color:PALETTE[0]})})}
  else{c.fillStyle=pal.mut;c.textAlign='center';c.fillText('Select three Y columns (A, B, C).',W/2,top+12)}};

// ---------- GX: parallel coordinates ----------
GX.parallel=function(c,W,H,top){const g=this.g,S=gxSeries(this),pal=this.p,fs=g.fs||12;if(S.length<2)return this.empty(c,W,H,'Select two or more Y columns.');this.kind=null;const N=S.length,l=50,r=30,t=top+26,b=H-24,maps=S.map(q=>new Map(q.d.rows.map((rw,i)=>[rw,q.d.y[i]]))),rows=S[0].d.rows.filter(rw=>maps.every(m=>m.has(rw))),rng=maps.map(m=>{const v=[...m.values()];return[Math.min(...v),Math.max(...v)]}),X=i=>l+(W-l-r)*i/(N-1),Y=(i,v)=>b-(v-rng[i][0])/((rng[i][1]-rng[i][0])||1)*(b-t);
  rows.forEach(rw=>{const k=(maps[0].get(rw)-rng[0][0])/((rng[0][1]-rng[0][0])||1);c.strokeStyle=cmap(g.cmap||'viridis',k);c.globalAlpha=.55;c.lineWidth=1.3;c.beginPath();maps.forEach((m,i)=>{const px=X(i),py=Y(i,m.get(rw));i?c.lineTo(px,py):c.moveTo(px,py)});c.stroke()});c.globalAlpha=1;
  S.forEach((q,i)=>{c.strokeStyle=pal.ink;c.lineWidth=1.4;c.beginPath();c.moveTo(X(i),t);c.lineTo(X(i),b);c.stroke();c.fillStyle=pal.ink;c.textAlign='center';c.fillText(q.d.name,X(i),t-10);c.font=`${fs-2}px ${this.ff}`;c.fillStyle=pal.mut;c.fillText(Mx.fmt(rng[i][1],3),X(i),t-1+0);c.fillText(Mx.fmt(rng[i][0],3),X(i),b+13);c.font=`${fs}px ${this.ff}`})};

// ---------- GX: Sankey ----------
GX.sankey=function(c,W,H,top){const g=this.g,S=gxSeries(this),sh=this.sheet(),pal=this.p,fs=g.fs||12;this.kind=null;const lc=(g.sankeySrc!=null?g.sankeySrc:g.labelCol),lt=g.sankeyDst;
  if(!S.length||lc==null||lt==null||!sh.cols[lc]||!sh.cols[lt])return this.empty(c,W,H,'Sankey needs a source column, a target column and a value column (set in Properties ▸ Sankey).');
  const d=S[0].d,links=d.rows.map((r,i)=>({s:String(sh.cols[lc].d[r]??''),t:String(sh.cols[lt].d[r]??''),v:Math.abs(d.y[i])})).filter(q=>q.s&&q.t&&q.v>0);if(!links.length)return this.empty(c,W,H);
  const nodes=[...new Set(links.flatMap(q=>[q.s,q.t]))],depth=Object.fromEntries(nodes.map(n=>[n,0]));for(let it=0;it<nodes.length;it++)links.forEach(q=>{if(depth[q.t]<depth[q.s]+1)depth[q.t]=Math.min(depth[q.s]+1,nodes.length)});
  const D=Math.max(...Object.values(depth))+1,inV={},outV={};nodes.forEach(n=>{inV[n]=0;outV[n]=0});links.forEach(q=>{outV[q.s]+=q.v;inV[q.t]+=q.v});const val=n=>Math.max(inV[n],outV[n]),cols=Array.from({length:D},(_,k)=>nodes.filter(n=>depth[n]===k));
  const x0=20,x1=W-110,nw=14,t0=top+10,hAvail=H-t0-16,scale=Math.min(...cols.map(cl=>(hAvail-(cl.length-1)*10)/(Mx.sum(cl.map(val))||1))),pos={};
  cols.forEach((cl,k)=>{const x=x0+(x1-x0-nw)*(D>1?k/(D-1):0);let y=t0;cl.forEach(n=>{const h=val(n)*scale;pos[n]={x,y,h,out:0,inn:0};y+=h+10})});
  links.forEach(q=>{const a=pos[q.s],b=pos[q.t],h=q.v*scale,ya=a.y+a.out,yb=b.y+b.inn;a.out+=h;b.inn+=h;const xa=a.x+nw,xb=b.x,mx=(xa+xb)/2;c.beginPath();c.moveTo(xa,ya);c.bezierCurveTo(mx,ya,mx,yb,xb,yb);c.lineTo(xb,yb+h);c.bezierCurveTo(mx,yb+h,mx,ya+h,xa,ya+h);c.closePath();c.fillStyle=PALETTE[nodes.indexOf(q.s)%PALETTE.length];c.globalAlpha=.4;c.fill();c.globalAlpha=1;
    if(this.live)this.hits.push({px:mx,py:(ya+yb)/2+h/2,text:`${q.s} → ${q.t}: ${Mx.fmt(q.v)}`,color:'#888'})});
  nodes.forEach((n,i)=>{const p=pos[n];c.fillStyle=PALETTE[i%PALETTE.length];c.fillRect(p.x,p.y,nw,Math.max(2,p.h));c.fillStyle=pal.ink;c.textAlign=p.x>W/2?'right':'left';c.fillText(`${n} (${Mx.fmt(val(n),4)})`,p.x>W/2?p.x-4:p.x+nw+4,p.y+Math.max(2,p.h)/2+4)})};

// ---------- GX: QC (X-bar / R) ----------
GX.qc=function(c,W,H,top){const g=this.g,S=gxSeries(this),pal=this.p;if(S.length<2||S.length>10)return this.empty(c,W,H,'Select 2–10 Y columns: each row is one subgroup.');const n=S.length,maps=S.map(q=>new Map(q.d.rows.map((r,i)=>[r,q.d.y[i]]))),rows=S[0].d.rows.filter(r=>maps.every(m=>m.has(r)));
  const xb=[],rg=[];rows.forEach(r=>{const v=maps.map(m=>m.get(r));xb.push(Mx.mean(v));rg.push(Math.max(...v)-Math.min(...v))});const A2=[0,0,1.880,1.023,.729,.577,.483,.419,.373,.337,.308][n],D3=[0,0,0,0,0,0,0,.076,.136,.184,.223][n],D4=[0,0,3.267,2.574,2.282,2.114,2.004,1.924,1.864,1.816,1.777][n];
  const xbb=Mx.mean(xb),rb=Mx.mean(rg),panels=[{v:xb,cl:xbb,u:xbb+A2*rb,l:xbb-A2*rb,t:'X-bar chart'},{v:rg,cl:rb,u:D4*rb,l:D3*rb,t:'R chart'}],h=(H-top)/2;
  panels.forEach((p,k)=>{c.save();c.translate(0,top+k*h);const lo=Math.min(...p.v,p.l),hi=Math.max(...p.v,p.u),pd=(hi-lo)*.08||1;
    gxFrame(this,c,W,h,6,{xd:[.5,rows.length+.5],yd:[lo-pd,hi+pd],xl:k===1?(g.xl||'Subgroup'):'',yl:p.t,draw:({R,ax,ay})=>{[[p.u,'#dc2626','UCL'],[p.cl,'#16a34a','CL'],[p.l,'#dc2626','LCL']].forEach(([y,col,lab])=>{c.strokeStyle=col;c.lineWidth=1.3;c.setLineDash(lab==='CL'?[]:[6,4]);c.beginPath();c.moveTo(R.x,ay.map(y));c.lineTo(R.x+R.w,ay.map(y));c.stroke();c.setLineDash([]);c.fillStyle=col;c.textAlign='left';c.fillText(lab+' '+Mx.fmt(y,4),R.x+4,ay.map(y)-3)});
      c.strokeStyle=PALETTE[0];c.lineWidth=1.6;c.beginPath();p.v.forEach((v,i)=>{i?c.lineTo(ax.map(i+1),ay.map(v)):c.moveTo(ax.map(i+1),ay.map(v))});c.stroke();p.v.forEach((v,i)=>drawSym(c,'circle',ax.map(i+1),ay.map(v),3.2,(v>p.u||v<p.l)?'#dc2626':PALETTE[0]))}});c.restore()});this.kind=null};

// ---------- GX: population pyramid ----------
GX.pyramid=function(c,W,H,top){const g=this.g,S=gxSeries(this),pal=this.p;if(S.length<2)return this.empty(c,W,H,'Select two Y columns (e.g. male / female).');const a=S[0].d.y,b=S[1].d.y,all=[...a,...b],lo=Math.min(...all),hi=Math.max(...all),K=g.bins>0?g.bins:12,w=(hi-lo)/K||1;
  const ca=new Array(K).fill(0),cb=new Array(K).fill(0);a.forEach(v=>ca[Math.min(K-1,Math.floor((v-lo)/w))]++);b.forEach(v=>cb[Math.min(K-1,Math.floor((v-lo)/w))]++);const mx=Math.max(...ca,...cb);
  gxFrame(this,c,W,H,top,{xd:[-mx*1.1,mx*1.1],yd:[lo,hi],xl:g.xl||'Count',yl:g.yl,draw:({ax,ay})=>{for(let i=0;i<K;i++){const y0=ay.map(lo+i*w),y1=ay.map(lo+(i+1)*w);c.fillStyle=gxCol(S[0],0);c.fillRect(ax.map(-ca[i]),Math.min(y0,y1)+1,ax.map(0)-ax.map(-ca[i]),Math.abs(y1-y0)-2);c.fillStyle=gxCol(S[1],1);c.fillRect(ax.map(0),Math.min(y0,y1)+1,ax.map(cb[i])-ax.map(0),Math.abs(y1-y0)-2)}}})};

// ---------- GX: bullet ----------
GX.bullet=function(c,W,H,top){const g=this.g,S=gxSeries(this),pal=this.p;if(!S.length)return this.empty(c,W,H);this.kind=null;const d=S[0].d,tg=S[1]?S[1].d:null,lab=gxLabels(this,d),n=d.n,rowH=Math.min(48,(H-top-20)/n),l=90,r=24,vmax=Math.max(...d.y,...(tg?tg.y:[0]))*1.2;
  d.y.forEach((v,i)=>{const y=top+10+i*rowH,sc=x=>l+(W-l-r)*x/vmax;[.6,.8,1].forEach((f,k)=>{c.fillStyle=['#9ca3af','#d1d5db','#e5e7eb'][k];c.globalAlpha=.8;c.fillRect(l,y+rowH*.15,sc(vmax*f/1.2*1.2)-l,rowH*.6);c.globalAlpha=1});
    c.fillStyle=gxCol(S[0],0);c.fillRect(l,y+rowH*.35,sc(v)-l,rowH*.2);if(tg&&tg.y[i]!==undefined){c.fillStyle=pal.ink;c.fillRect(sc(tg.y[i])-2,y+rowH*.2,4,rowH*.5)}c.fillStyle=pal.ink;c.textAlign='right';c.fillText(lab[i],l-6,y+rowH*.5+4)})};

// ---------- per-type metadata used by the UI ----------
const NEWTYPES={errband:'Error Band',cscatter:'Color-Mapped Scatter',cline:'Color-Mapped Line',lollipop:'Lollipop',drop:'Drop Lines',stack100:'100% Stacked Column',floatcol:'Floating Column',sarea:'Stacked Area',sarea100:'100% Stacked Area',interval:'Interval Plot',meanbar:'Mean Bar + Error',swarm:'Beeswarm',colscatter:'Column Scatter',doughnut:'Doughnut',ba:'Bland–Altman',vector:'Vector (XYAM)',kde2d:'2D Kernel Density',pareto:'Pareto',candle:'Candlestick',ohlc:'OHLC Bars',scatmat:'Scatter Matrix',marginal:'Scatter + Marginal Histograms',ridge:'Ridgeline',windrose:'Wind Rose',radialbar:'Radial Bar',smith:'Smith Chart',ternary:'Ternary',parallel:'Parallel Coordinates',sankey:'Sankey',qc:'QC X-bar / R',pyramid:'Population Pyramid',bullet:'Bullet',bars3d:'3D Bars',ribbon3d:'3D Ribbon',wall3d:'3D Wall',traj3d:'3D Trajectory'};
Object.assign(GTYPES,NEWTYPES);
