'use strict';
// Function plots, user-defined fitting functions, curve simulation.
const swapVars=(expr,map)=>expr.replace(/\b([A-Za-z_]\w*)\b(?!\s*\()/g,m=>map[m]??m);
const lin12=(a,b,n)=>Array.from({length:n},(_,i)=>+(a+(b-a)*i/(n-1)).toPrecision(12));

function registerUserFuncs(){
  Object.keys(MODELS).filter(k=>k.startsWith('u:')).forEach(k=>delete MODELS[k]);
  (P.userFuncs||[]).forEach(u=>{try{const names=Mx.exprParams(u.expr),fn=Mx.compile(u.expr,['x',...names]),ini=u.init||{};
    MODELS['u:'+u.name]={label:`${u.name}  y = ${u.expr}`,names,f:(x,p)=>fn(x,...p),init:()=>[names.map(n=>ini[n]!==undefined?+ini[n]:1)],user:true}}catch(e){console.warn('bad user function',u.name,e)}})}

function functionPlotDialog(){
  dialog({title:'Function Plot',sheet:{cols:[]},ok:'Plot',hint:'2D: <code>sin(x)/x</code> · parametric uses <code>t</code> (e.g. x = <code>cos(3*t)</code>, y = <code>sin(2*t)</code>) · 3D uses <code>x</code> and <code>y</code> (e.g. <code>sin(sqrt(x^2+y^2))</code>). The y column is a live formula column: edit the X column and it updates.',
    fields:[{t:'sel',k:'kind',label:'Type',def:'y',opts:[['y','2D function  y = f(x)'],['param','2D parametric  x(t), y(t)'],['z','3D surface  z = f(x, y)']]},
      {t:'txt',k:'f1',label:'f(x)  /  x(t)  /  z(x, y)',def:'sin(x)/x'},{t:'txt',k:'f2',label:'y(t)  (parametric only)',def:'sin(2*t)'},
      {t:'num',k:'a',label:'From',def:-10},{t:'num',k:'b',label:'To',def:10},{t:'num',k:'n',label:'Points',def:400},
      {t:'num',k:'c',label:'y from (3D)',def:-10},{t:'num',k:'d',label:'y to (3D)',def:10},{t:'num',k:'m',label:'Grid size per axis (3D)',def:50}],
    onOk:a=>{try{
      snap();const n=Math.max(2,Math.round(a.n));let sh;
      if(a.kind==='y'){const fn=Mx.compile(a.f1,['x']);fn(1);const xs=lin12(a.a,a.b,n);sh=mkSheet('Function',[{name:'x',des:'X',d:xs},{name:'y',des:'Y',d:xs.map(x=>{const v=fn(x);return Number.isFinite(v)?v:NaN})}]);sh.cols[1].formula=swapVars(a.f1,{x:'A'});openWin('sheet',sh.id);gsel={c0:1,r0:0,c1:1,r1:0,extra:new Set()};plotCmd('line').title=a.f1}
      else if(a.kind==='param'){const fx=Mx.compile(a.f1,['t']),fy=Mx.compile(a.f2,['t']);fx(1);fy(1);const ts=lin12(a.a,a.b,n);sh=mkSheet('Parametric',[{name:'t',des:'X',d:ts},{name:'x(t)',des:'X',d:ts.map(fx)},{name:'y(t)',des:'Y',d:ts.map(fy)}]);sh.cols[1].formula=swapVars(a.f1,{t:'A'});sh.cols[2].formula=swapVars(a.f2,{t:'A'});openWin('sheet',sh.id);gsel={c0:2,r0:0,c1:2,r1:0,extra:new Set()};const g=plotCmd('line');g.series[0].x=1;g.xl='x(t)';g.yl='y(t)';g.title=`x=${a.f1}, y=${a.f2}`;redrawGraph(true)}
      else{const fn=Mx.compile(a.f1,['x','y']);fn(1,1);const m=Math.max(3,Math.round(a.m)),xv=lin12(a.a,a.b,m),yv=lin12(a.c,a.d,m);sh=mkSheet('Surface fn',xv.map((x,j)=>({name:String(x),des:'Y',d:yv.map(y=>{const v=fn(x,y);return Number.isFinite(v)?+v.toPrecision(8):NaN})})),{isMatrix:true,xv,yv});openWin('sheet',sh.id);gsel={c0:0,r0:0,c1:0,r1:0,extra:new Set()};const g=plotCmd('surf3d');g.title=`z = ${a.f1}`;redrawGraph(true)}
      dirty()}catch(e){alert('Could not evaluate the expression: '+e.message)}}})}

function funcBuilderDialog(){
  const list=P.userFuncs||[];
  dialog({title:'Fitting Function Builder',sheet:{cols:[]},ok:'Save function',hint:`Define a model in <code>x</code>; every other identifier becomes a fit parameter (e.g. <code>A*exp(-k*x)+c</code>). Saved functions appear in Nonlinear Fit, Global Fit and the Quick-fit gadget.${list.length?'<br><b>Saved:</b> '+list.map(u=>esc(u.name)).join(', '):''}`,
    fields:[{t:'txt',k:'name',label:'Function name',def:'MyDecay'},{t:'txt',k:'expr',label:'Expression',def:'A*exp(-k*x)+c'},{t:'txt',k:'init',label:'Initial values (e.g. A=5,k=0.2) – optional',def:''},{t:'sel',k:'del',label:'…or delete an existing function',def:'',opts:[['','(none)'],...list.map(u=>[u.name,u.name])]}],
    onOk:a=>{if(a.del){snap();P.userFuncs=P.userFuncs.filter(u=>u.name!==a.del);registerUserFuncs();dirty();flash('Deleted '+a.del);return}
      try{const names=Mx.exprParams(a.expr);if(!names.length)throw new Error('The expression needs at least one parameter.');Mx.compile(a.expr,['x',...names])(1,...names.map(()=>1));
        const init=Object.fromEntries((a.init||'').split(/[,;]/).map(s=>s.split('=').map(t=>t.trim())).filter(q=>q.length===2&&q[0]&&q[1]!==''));
        snap();P.userFuncs=(P.userFuncs||[]).filter(u=>u.name!==a.name);P.userFuncs.push({name:a.name.replace(/\W/g,'_'),expr:a.expr,init});registerUserFuncs();dirty();flash(`Saved “${a.name}” (${names.join(', ')})`)}catch(e){alert('Invalid function: '+e.message)}}})}

function simulateDialog(){
  dialog({title:'Simulate Curve',sheet:{cols:[]},ok:'Simulate',hint:'Generates a worksheet from a model and parameter values (e.g. <code>y0=1,A=5,t=3</code>).',
    fields:[{t:'sel',k:'model',label:'Function',def:'expdec1',opts:()=>Object.entries(MODELS).map(([k,m])=>[k,m.label])},{t:'txt',k:'p',label:'Parameters',def:'y0=1,A=5,t=3'},{t:'num',k:'a',label:'X from',def:0},{t:'num',k:'b',label:'X to',def:20},{t:'num',k:'n',label:'Points',def:200},{t:'num',k:'noise',label:'Add Gaussian noise (SD)',def:0}],
    onOk:a=>{const M=MODELS[a.model],o=Object.fromEntries(a.p.split(/[,;]/).map(s=>s.split('=').map(t=>t.trim())).filter(q=>q.length===2));const p=M.names.map(n=>+o[n]);if(p.some(v=>!Number.isFinite(v)))return alert('Give a value for every parameter: '+M.names.join(', '));
      const xs=lin12(a.a,a.b,Math.max(2,Math.round(a.n)));let seed=1;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;snap();
      const sh=mkSheet('Simulated',[{name:'x',des:'X',d:xs},{name:'y',des:'Y',d:xs.map(x=>+(M.f(x,p)+(a.noise?a.noise*Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd()):0)).toPrecision(10))}]);openWin('sheet',sh.id);dirty()}})}

RIB.Plot.push(['Function',[['Function plot',IC.line,functionPlotDialog,1]]]);
RIB.Fitting.push(['Functions',[['Function builder','f(x)',funcBuilderDialog],['Simulate curve','~y',simulateDialog]]]);
