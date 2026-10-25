// ===== Every element on a graph stays editable =====
// Old-style notes (g.notes) become text shapes, which can be selected, moved, restyled and edited by double-click.
(function(){
  const od=Chart.prototype.draw;
  Chart.prototype.draw=function(...a){const g=this.g;
    if(g&&g.notes&&g.notes.length&&g.type!=='bar'){g.shapes=g.shapes||[];g.notes.forEach(n=>g.shapes.push({t:'text',x0:n.x,y0:n.y,x1:n.x,y1:n.y,text:n.text,fs:g.fs||12}));g.notes=[]}
    return od.apply(this,a)};
  // double-click a reference line to change its value (empty = delete)
  const cv=document.getElementById('cv');if(!cv)return;
  cv.addEventListener('dblclick',e=>{const g=typeof curGraphObj==='function'?curGraphObj():null;if(!g||!g.refs||!g.refs.length||!chart.ax||chart.kind!=='cart')return;
    const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,hz=chart.hz;
    const i=g.refs.findIndex(q=>{if(q.axis==='x'){const p=hz?chart.VA.map(q.v):chart.HA.map(q.v);return hz?Math.abs(y-p)<6:Math.abs(x-p)<6}const p=hz?chart.HA.map(q.v):chart.VA.map(q.v);return hz?Math.abs(x-p)<6:Math.abs(y-p)<6});
    if(i<0)return;e.stopImmediatePropagation();const q=g.refs[i],t=prompt(`Reference line (${q.axis} =). New value, or leave empty to delete:`,q.v);if(t===null)return;
    histHint='Edit reference line';snap();histHint=null;if(t.trim()==='')g.refs.splice(i,1);else{const v=parseFloat(t);if(!Number.isNaN(v))q.v=v}dirty();chart.render();if(typeof renderProps==='function')renderProps()},true);
})();
