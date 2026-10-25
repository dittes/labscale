'use strict';
// SVG export: a canvas-2D-compatible recording context that emits SVG markup.
const svgEsc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
class SVGCtx{
  constructor(){this.out=[];this.defs=[];this.stack=[];this.open=0;this.clipN=0;this.path='';this.cur=false;this.fillStyle='#000';this.strokeStyle='#000';this.lineWidth=1;this.globalAlpha=1;this.font='12px sans-serif';this.textAlign='left';this._dash=[]}
  _n(v){return Number.isFinite(v)?Math.round(v*1000)/1000:0}
  save(){this.stack.push({f:this.fillStyle,s:this.strokeStyle,w:this.lineWidth,a:this.globalAlpha,fo:this.font,ta:this.textAlign,d:this._dash,open:this.open});this.out.push('<g>');this.open=0}
  restore(){while(this.open>0){this.out.push('</g>');this.open--}this.out.push('</g>');const s=this.stack.pop();if(s){this.fillStyle=s.f;this.strokeStyle=s.s;this.lineWidth=s.w;this.globalAlpha=s.a;this.font=s.fo;this.textAlign=s.ta;this._dash=s.d;this.open=s.open}}
  translate(x,y){this.out.push(`<g transform="translate(${this._n(x)} ${this._n(y)})">`);this.open++}
  rotate(a){this.out.push(`<g transform="rotate(${this._n(a*180/Math.PI)})">`);this.open++}
  scale(x,y){this.out.push(`<g transform="scale(${this._n(x)} ${this._n(y)})">`);this.open++}
  setLineDash(a){this._dash=a||[]}
  beginPath(){this.path='';this.cur=false}
  moveTo(x,y){this.path+=`M${this._n(x)} ${this._n(y)}`;this.cur=true}
  lineTo(x,y){if(!this.cur)return this.moveTo(x,y);this.path+=`L${this._n(x)} ${this._n(y)}`}
  bezierCurveTo(a,b,c,d,e,f){if(!this.cur)this.moveTo(a,b);this.path+=`C${this._n(a)} ${this._n(b)} ${this._n(c)} ${this._n(d)} ${this._n(e)} ${this._n(f)}`}
  rect(x,y,w,h){this.path+=`M${this._n(x)} ${this._n(y)}h${this._n(w)}v${this._n(h)}h${this._n(-w)}z`;this.cur=false}
  closePath(){this.path+='Z'}
  arc(cx,cy,r,a0,a1,ccw){let d=a1-a0;if(ccw){while(d>0)d-=2*Math.PI;if(d<-2*Math.PI)d=-2*Math.PI}else{while(d<0)d+=2*Math.PI;if(d>2*Math.PI)d=2*Math.PI}
    const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0);this.cur?this.path+=`L${this._n(x0)} ${this._n(y0)}`:this.moveTo(x0,y0);this.cur=true;
    const segs=Math.max(1,Math.ceil(Math.abs(d)/(Math.PI/2))),da=d/segs,k=4/3*Math.tan(da/4);
    for(let i=0;i<segs;i++){const a=a0+da*i,b=a+da,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
      this.path+=`C${this._n(cx+r*(ca-k*sa))} ${this._n(cy+r*(sa+k*ca))} ${this._n(cx+r*(cb+k*sb))} ${this._n(cy+r*(sb-k*cb))} ${this._n(cx+r*cb)} ${this._n(cy+r*sb)}`}}
  _paint(style){const[r,g,b,a]=cssColor(style),hx=v=>Math.round(v*255).toString(16).padStart(2,'0');return{c:`#${hx(r)}${hx(g)}${hx(b)}`,a:a*this.globalAlpha}}
  _fa(){const p=this._paint(this.fillStyle);return`fill="${p.c}"${p.a<1?` fill-opacity="${this._n(p.a)}"`:''}`}
  _sa(){const p=this._paint(this.strokeStyle);return`fill="none" stroke="${p.c}"${p.a<1?` stroke-opacity="${this._n(p.a)}"`:''} stroke-width="${this._n(this.lineWidth)}" stroke-linejoin="round"${this._dash.length?` stroke-dasharray="${this._dash.map(v=>this._n(v)).join(' ')}"`:''}`}
  fill(){this.out.push(`<path d="${this.path}" ${this._fa()} stroke="none"/>`)}
  stroke(){this.out.push(`<path d="${this.path}" ${this._sa()}/>`)}
  clip(){const id='clip'+(++this.clipN);this.defs.push(`<clipPath id="${id}"><path d="${this.path}"/></clipPath>`);this.out.push(`<g clip-path="url(#${id})">`);this.open++}
  fillRect(x,y,w,h){this.out.push(`<rect x="${this._n(x)}" y="${this._n(y)}" width="${this._n(w)}" height="${this._n(h)}" ${this._fa()}/>`)}
  strokeRect(x,y,w,h){this.out.push(`<rect x="${this._n(x)}" y="${this._n(y)}" width="${this._n(w)}" height="${this._n(h)}" ${this._sa()}/>`)}
  clearRect(){}
  measureText(t){_mc.font=this.font;return{width:_mc.measureText(String(t)).width}}
  fillText(t,x,y){const m=this.font.match(/^(?:(\d{3}|bold)\s+)?([\d.]+)px\s+(.+)$/)||[],weight=m[1]?` font-weight="${m[1]==='bold'?700:m[1]}"`:'',size=m[2]||12,fam=svgEsc(m[3]||'sans-serif'),anchor=this.textAlign==='center'?'middle':this.textAlign==='right'||this.textAlign==='end'?'end':'start';
    this.out.push(`<text x="${this._n(x)}" y="${this._n(y)}" font-family="${fam}" font-size="${size}"${weight} text-anchor="${anchor}" ${this._fa()}>${svgEsc(t)}</text>`)}
  toSVG(W,H){const close='</g>'.repeat(this.open);return`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${this.defs.join('')}</defs>\n${this.out.join('\n')}${close}</svg>`}
}
function graphToSVG(g){const[W,H]=graphSize(g),c=new SVGCtx();drawGraphTo(c,g,W,H);return new Blob([c.toSVG(W,H)],{type:'image/svg+xml'})}
