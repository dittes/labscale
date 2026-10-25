// ===== Axis tick labels never overlap: thin them out and leave space instead =====
let axFs=12,axFf='system-ui,sans-serif';
(function(){
  const mctx=document.createElement('canvas').getContext('2d');
  const od=Chart.prototype.draw;Chart.prototype.draw=function(c,W,H,pal,live){const g=this.g;axFs=(g&&g.fs)||12;axFf=(g&&g.font)||'system-ui,sans-serif';return od.apply(this,arguments)};
  const om=mkAxis;
  mkAxis=function(lo,hi,scale,p0,p1,cats,date,brk){
    const ax=om.apply(this,arguments);
    try{
      const horiz=p1>p0,len=Math.abs(p1-p0),lab=ax.ticks.filter(t=>t.label&&!t.minor).sort((a,b)=>ax.map(a.v)-ax.map(b.v));
      if(lab.length<2||!(len>0))return ax;
      mctx.font=`${axFs}px ${axFf}`;
      const need=horiz?Math.max(...lab.map(t=>mctx.measureText(String(t.label)).width))*1.08+14:axFs*1.7;
      const gap=len/(lab.length-1);
      let k=Math.max(1,Math.ceil(need/gap));
      const pos=lab.map(t=>ax.map(t.v));let tight=false;for(let i=1;i<pos.length;i++)if(Math.abs(pos[i]-pos[i-1])<need)tight=true;
      if(!tight)return ax;
      if(k<2)k=2;
      let off=0;
      if(!cats&&!date){let best=1e9;for(let o=0;o<k;o++){let s=0;for(let i=o;i<lab.length;i+=k)s+=String(lab[i].label).length;s=s/Math.ceil((lab.length-o)/k);if(s<best-1e-9){best=s;off=o}}}
      const keep=new Set();for(let i=off;i<lab.length;i+=k)keep.add(lab[i]);
      lab.forEach(t=>{if(!keep.has(t)){t.label='';t.minor=true}});
    }catch(e){}
    return ax};
})();
