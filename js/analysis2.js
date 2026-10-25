'use strict';
// Additional analyses: two-way ANOVA, Wilcoxon, Fisher, logistic regression/ROC, Kaplan–Meier, global fit, Butterworth, STFT, matrix→XYZ.
const optCol=(k,label)=>({...col(k,label,'y'),none:true,noneLabel:'(none)'});
const rawBad=v=>v===undefined||v===''||(typeof v==='number'&&Number.isNaN(v));
function levelsOf(vals){const m=new Map();vals.forEach(v=>m.set(String(v),v));return[...m.keys()].sort((a,b)=>(isNaN(a)||isNaN(b))?a.localeCompare(b):a-b)}

// ---------- Two-way ANOVA (Type III, effect coding) ----------
def('anova2','Statistics','Two-Way ANOVA',[col('y','Response (Y)','y'),col('a','Factor A column','x'),col('b','Factor B column','x'),chk('inter','Include A×B interaction',true),chk('tukey','Tukey HSD for main effects',true),ALPHA],({y:yi,a:ai,b:bi,inter,tukey,alpha},ctx)=>{
  const Y=ctx.vals(yi),RA=ctx.raw(ai),RB=ctx.raw(bi),rows=[];
  for(let i=0;i<Y.length;i++)if(Number.isFinite(Y[i])&&!rawBad(RA[i])&&!rawBad(RB[i]))rows.push(i);
  const la=levelsOf(rows.map(i=>RA[i])),lb=levelsOf(rows.map(i=>RB[i])),a=la.length,b=lb.length;
  if(a<2||b<2)return warn('Both factors need at least two levels (put factor labels in their own columns).');
  const ia=rows.map(i=>la.indexOf(String(RA[i]))),ib=rows.map(i=>lb.indexOf(String(RB[i]))),y=rows.map(i=>Y[i]),N=y.length;
  const eff=(idx,k)=>idx.map(v=>Array.from({length:k-1},(_,j)=>v===j?1:v===k-1?-1:0)),EA=eff(ia,a),EB=eff(ib,b);
  const EAB=inter?rows.map((_,r)=>{const o=[];for(const u of EA[r])for(const w of EB[r])o.push(u*w);return o}):null;
  const build=(iA,iB,iI)=>y.map((_,r)=>[1,...(iA?EA[r]:[]),...(iB?EB[r]:[]),...(iI&&EAB?EAB[r]:[])]);
  const sse=X=>{const r=Mx.lstsq(X,y);return r?r.sse:NaN},full=build(1,1,1),sF=sse(full),dfE=N-full[0].length;
  if(!(dfE>0)||!Number.isFinite(sF))return warn('Design is not estimable (empty cells or no replicates).');
  const mse=sF/dfE,ym=Mx.mean(y),sst=y.reduce((s,v)=>s+(v-ym)**2,0);
  const terms=[['Factor A',sse(build(0,1,1))-sF,a-1],['Factor B',sse(build(1,0,1))-sF,b-1]];if(inter)terms.push(['A × B',sse(build(1,1,0))-sF,(a-1)*(b-1)]);
  const model=sst-sF,dfM=N-1-dfE;
  const rowsT=[['Model',F(model),dfM,F(model/dfM),F(model/dfM/mse),PV(Mx.fsf(model/dfM/mse,dfM,dfE))],...terms.map(([n,ss,df])=>{const Fv=ss/df/mse;return[n,F(ss),df,F(ss/df),F(Fv),PV(Mx.fsf(Fv,df,dfE))]}),['Error',F(sF),dfE,F(mse),'',''],['Total (corrected)',F(sst),N-1,'','','']];
  const cell=(i,j)=>{const v=y.filter((_,r)=>ia[r]===i&&ib[r]===j);return v.length?[Mx.mean(v),v.length]:[NaN,0]};
  const cm=T(['A \\ B',...lb],la.map((l,i)=>[l,...lb.map((_,j)=>{const[m,n]=cell(i,j);return n?`${F(m,5)} (n=${n})`:'—'})]));
  const marg=(idx,k,labels,title)=>{const g=labels.map((_,l)=>y.filter((__,r)=>idx[r]===l)),mean=g.map(Mx.mean),res=[];
    for(let i=0;i<k;i++)for(let j=i+1;j<k;j++){const d=mean[i]-mean[j],q=Math.abs(d)/Math.sqrt(mse/2*(1/g[i].length+1/g[j].length)),p=1-Mx.ptukey(q,k,dfE);res.push([`${labels[i]} − ${labels[j]}`,F(d),F(q),PV(p),p<alpha?'Yes':'No'])}
    return H(`${title} marginal means`)+T(['Level','N','Mean','SE'],labels.map((l,i)=>[l,g[i].length,F(mean[i]),F(Math.sqrt(mse/g[i].length))]))+(tukey?H(`Tukey HSD – ${title}`)+T(['Comparison','Mean diff','q','Adj. p','Significant'],res):'')};
  return{html:H('ANOVA table (Type III)')+T(['Source','SS','df','MS','F','Prob>F'],rowsT)+H('Cell means')+cm+marg(ia,a,la,'Factor A')+marg(ib,b,lb,'Factor B')}});

// ---------- Wilcoxon signed-rank ----------
def('wilcoxon','Statistics','Wilcoxon Signed-Rank Test',[col('a','Sample 1','y'),col('b','Sample 2','y'),ALPHA],({a,b,alpha},ctx)=>{
  const A1=ctx.vals(a),B1=ctx.vals(b),d=[];for(let i=0;i<Math.min(A1.length,B1.length);i++)if(Number.isFinite(A1[i])&&Number.isFinite(B1[i])&&A1[i]!==B1[i])d.push(A1[i]-B1[i]);
  const n=d.length;if(n<5)return warn('Need at least 5 non-zero differences.');const{r,tie}=Mx.rank(d.map(Math.abs)),Wp=Mx.sum(r.filter((_,i)=>d[i]>0)),mu=n*(n+1)/4,sg=Math.sqrt(n*(n+1)*(2*n+1)/24-tie/48),z=(Math.abs(Wp-mu)-.5)/sg,p=2*(1-Mx.normcdf(z));
  return{html:KV([['Non-zero pairs',n],['W+ (sum of positive ranks)',F(Wp)],['W− ',F(n*(n+1)/2-Wp)],['z (continuity corrected)',F(z)],['Prob (two-sided, asymptotic)',PV(p)],['Conclusion',p<alpha?'Medians differ':'No significant difference']])}});

// ---------- Fisher exact (2x2) ----------
def('fisher','Statistics',"Fisher's Exact Test (2×2)",[col('a','Column 1 (rows 1–2 = counts)','y'),col('b','Column 2 (rows 1–2 = counts)','y'),ALPHA],({a,b,alpha},ctx)=>{
  const A1=ctx.vals(a),B1=ctx.vals(b),t=[A1[0],B1[0],A1[1],B1[1]];if(t.some(v=>!Number.isFinite(v)||v<0))return warn('The first two rows of both columns must contain non-negative counts.');
  const[a0,b0,a1,b1]=t.map(Math.round),r1=a0+b0,r2=a1+b1,c1=a0+a1,n=r1+r2,lg=k=>Mx.gammaln(k+1),lp=x=>lg(r1)-lg(x)-lg(r1-x)+lg(r2)-lg(c1-x)-lg(r2-c1+x)+lg(c1)+lg(n-c1)-lg(n);
  const po=Math.exp(lp(a0));let p=0;for(let x=Math.max(0,c1-r2);x<=Math.min(r1,c1);x++){const q=Math.exp(lp(x));if(q<=po*(1+1e-7))p+=q}
  return{html:T(['','Col 1','Col 2'],[['Row 1',a0,b0],['Row 2',a1,b1]])+KV([['Odds ratio',b0*a1===0?'∞':F(a0*b1/(b0*a1))],['Prob (two-sided)',PV(Math.min(1,p))],['Conclusion',p<alpha?'Association is significant':'No significant association']])}});

// ---------- Logistic regression + ROC ----------
def('logreg','Statistics','Logistic Regression + ROC',[col('y','Binary response (0/1)','y'),cols('xs','Predictors','x'),ALPHA],({y:yi,xs,alpha},ctx)=>{
  xs=xs.filter(c=>c!==yi);const Y=ctx.vals(yi),Xs=xs.map(c=>ctx.vals(c)),rows=[],X=[],y=[];
  for(let i=0;i<Y.length;i++)if((Y[i]===0||Y[i]===1)&&Xs.every(c=>Number.isFinite(c[i]))){rows.push(i);y.push(Y[i]);X.push([1,...Xs.map(c=>c[i])])}
  const n=y.length,k=X[0]?.length;if(!k||k<2)return warn('Select at least one predictor.');if(n<k+2)return warn('Not enough rows. The response column must contain only 0 and 1.');
  let beta=new Array(k).fill(0),cov=null,ok=false;
  for(let it=0;it<60;it++){const eta=X.map(r=>r.reduce((s,v,j)=>s+v*beta[j],0)),p=eta.map(e=>1/(1+Math.exp(-e))),w=p.map(q=>Math.max(q*(1-q),1e-9)),z=eta.map((e,i)=>e+(y[i]-p[i])/w[i]);
    const A=Array.from({length:k},(_,a)=>Array.from({length:k},(_,b)=>{let s=0;for(let r=0;r<n;r++)s+=w[r]*X[r][a]*X[r][b];return s})),bb=Array.from({length:k},(_,a)=>{let s=0;for(let r=0;r<n;r++)s+=w[r]*X[r][a]*z[r];return s}),nb=Mx.solve(A,bb);
    if(!nb||!nb.every(Number.isFinite))return warn('Fit failed (perfect separation or collinear predictors).');const dl=Math.max(...nb.map((v,j)=>Math.abs(v-beta[j])));beta=nb;cov=Mx.inv(A);if(dl<1e-9){ok=true;break}}
  if(!ok||!cov)return warn('Did not converge (possible perfect separation).');
  const p=X.map(r=>1/(1+Math.exp(-r.reduce((s,v,j)=>s+v*beta[j],0)))),LL=y.reduce((s,v,i)=>s+v*Math.log(Math.max(p[i],1e-300))+(1-v)*Math.log(Math.max(1-p[i],1e-300)),0),yb=Mx.mean(y),LL0=n*(yb*Math.log(yb)+(1-yb)*Math.log(1-yb)),lr=2*(LL-LL0),zc=Mx.norminv(1-alpha/2);
  const names=['Intercept',...xs.map(c=>ctx.name(c))],se=cov.map((r,i)=>Math.sqrt(r[i]));
  const ord=p.map((_,i)=>i).sort((i,j)=>p[j]-p[i]),P1=Mx.sum(y),N0=n-P1,fpr=[0],tpr=[0];let tp=0,fp=0;
  for(let q=0;q<ord.length;q++){y[ord[q]]?tp++:fp++;if(q===ord.length-1||p[ord[q+1]]!==p[ord[q]]){tpr.push(tp/P1);fpr.push(fp/N0)}}
  let auc=0;for(let i=1;i<fpr.length;i++)auc+=(fpr[i]-fpr[i-1])*(tpr[i]+tpr[i-1])/2;
  const tp5=y.filter((v,i)=>v===1&&p[i]>=.5).length,tn5=y.filter((v,i)=>v===0&&p[i]<.5).length;
  return{html:T(['Parameter','B','Std. Error','z','Prob>|z|','Odds ratio',`OR ${100*(1-alpha)}% CI`],names.map((nm,i)=>{const zz=beta[i]/se[i];return[nm,F(beta[i],6),F(se[i],5),F(zz,4),PV(2*(1-Mx.normcdf(Math.abs(zz)))),F(Math.exp(beta[i]),5),`${F(Math.exp(beta[i]-zc*se[i]),4)} … ${F(Math.exp(beta[i]+zc*se[i]),4)}`]}))+
    KV([['N',n],['−2 log-likelihood',F(-2*LL)],['LR χ² (df='+(k-1)+')',F(lr)],['Prob>χ²',PV(Mx.chi2sf(lr,k-1))],['McFadden pseudo-R²',F(1-LL/LL0,5)],['Accuracy at 0.5',F((tp5+tn5)/n*100,4)+' %'],['AUC (ROC)',F(auc,5)]]),
    cols:[{name:'P(y=1)',d:place(rows,p,ctx.nrows)},{name:'FPR',d:fpr},{name:'TPR',d:tpr}],plot:{type:'line',series:[[1,2,'ROC']],xl:'False positive rate',yl:'True positive rate',lw:2.5}}});

// ---------- Kaplan–Meier ----------
def('km','Statistics','Kaplan–Meier Survival',[col('t','Time column','x'),col('e','Event column (1 = event, 0 = censored)','y'),optCol('g','Group column (optional)'),ALPHA],({t:ti,e:ei,g:gi,alpha},ctx)=>{
  const T0=ctx.vals(ti),E0=ctx.vals(ei),G0=gi>=0?ctx.raw(gi):null,data=[];
  for(let i=0;i<T0.length;i++)if(Number.isFinite(T0[i])&&(E0[i]===0||E0[i]===1)&&(!G0||!rawBad(G0[i])))data.push({t:T0[i],e:E0[i],g:G0?String(G0[i]):'All'});
  if(data.length<2)return warn('Need time (numbers) and event (0/1) columns.');const groups=levelsOf(data.map(d=>d.g)),zc=Mx.norminv(1-alpha/2),cols=[],sum=[],series=[];
  groups.forEach(gn=>{const D=data.filter(d=>d.g===gn).sort((a,b)=>a.t-b.t),times=[0],S=[1],lo=[1],hi=[1];let s=1,v=0,atRisk=D.length,i=0,med=NaN;
    while(i<D.length){const t=D[i].t;let d=0,c=0;while(i<D.length&&D[i].t===t){D[i].e?d++:c++;i++}
      if(d>0){s*=1-d/atRisk;if(atRisk>d)v+=d/(atRisk*(atRisk-d));const se=s*Math.sqrt(v);times.push(t);S.push(s);lo.push(Math.max(0,s-zc*se));hi.push(Math.min(1,s+zc*se));if(Number.isNaN(med)&&s<=.5)med=t}atRisk-=d+c}
    const tag=groups.length>1?`_${gn}`:'',base=cols.length;cols.push({name:'Time'+tag,d:times,des:'X'},{name:'Survival'+tag,d:S},{name:'Lower'+tag,d:lo},{name:'Upper'+tag,d:hi});series.push([base,base+1,groups.length>1?gn:'Survival']);
    sum.push([gn,D.length,D.filter(d=>d.e).length,D.length-D.filter(d=>d.e).length,Number.isNaN(med)?'not reached':F(med)])});
  let lr='';if(groups.length>1){const k=groups.length,ts=[...new Set(data.filter(d=>d.e).map(d=>d.t))].sort((a,b)=>a-b),O=new Array(k).fill(0),E=new Array(k).fill(0),V=Array.from({length:k},()=>new Array(k).fill(0));
    ts.forEach(t=>{const nk=groups.map(g=>data.filter(d=>d.g===g&&d.t>=t).length),dk=groups.map(g=>data.filter(d=>d.g===g&&d.t===t&&d.e).length),nn=Mx.sum(nk),dd=Mx.sum(dk);
      for(let i=0;i<k;i++){O[i]+=dk[i];E[i]+=dd*nk[i]/nn;if(nn>1)for(let j=0;j<k;j++)V[i][j]+=dd*(nk[i]/nn)*((i===j?1:0)-nk[j]/nn)*(nn-dd)/(nn-1)}});
    const m=k-1,Vi=Mx.inv(V.slice(0,m).map(r=>r.slice(0,m)));if(Vi){const d=O.slice(0,m).map((o,i)=>o-E[i]);let chi=0;for(let i=0;i<m;i++)for(let j=0;j<m;j++)chi+=d[i]*Vi[i][j]*d[j];lr=KV([['Log-rank χ²',F(chi)],['df',m],['Prob>χ²',PV(Mx.chi2sf(chi,m))]])}}
  return{html:T(['Group','N','Events','Censored','Median survival'],sum)+lr,cols,plot:{type:'line',connect:'step',series,xl:'Time',yl:'Survival probability',lw:2}}});

// ---------- Global fit (shared / fixed parameters) ----------
function globalFit(M,D,shared,fixM={}){
  const names=M.names,free=names.filter(n=>fixM[n]===undefined),sIdx={},dIdx=D.map(()=>({}));let slots=0;
  free.forEach(nm=>{if(shared.has(nm))sIdx[nm]=slots++});D.forEach((_,d)=>free.forEach(nm=>{if(!shared.has(nm))dIdx[d][nm]=slots++}));
  const getp=(p,d)=>names.map(nm=>fixM[nm]!==undefined?+fixM[nm]:shared.has(nm)?p[sIdx[nm]]:p[dIdx[d][nm]]);
  const X=D.flatMap(d=>d.x),Yv=D.flatMap(d=>d.y),ds=D.flatMap((d,i)=>d.x.map(()=>i)),ids=X.map((_,i)=>i),f=(i,p)=>M.f(X[i],getp(p,ds[i]));
  const inits=D.map(d=>M.init(d.x,d.y)),nst=Math.min(...inits.map(q=>q.length));let best=null;
  for(let s=0;s<nst;s++){const p0=new Array(slots).fill(0);free.forEach(nm=>{const j=names.indexOf(nm);if(shared.has(nm))p0[sIdx[nm]]=Mx.mean(inits.map(q=>q[s][j]));else inits.forEach((q,d)=>p0[dIdx[d][nm]]=q[s][j])});
    let r;try{r=Mx.lm(f,p0,ids,Yv)}catch(e){continue}if(r.p.every(Number.isFinite)&&(!best||r.c<best.c))best=r}
  return best&&{...best,slots,getp,sIdx,dIdx,names,free,N:X.length,f,ids,Yv}}
def('gfit','Fitting','Global Fit (shared parameters)',[col('x','X column','x'),cols('ys','Y columns (datasets)','y'),{t:'sel',k:'model',label:'Function',opts:Object.entries(MODELS).map(([k,m])=>[k,m.label]),def:'expdec1'},txt('shared','Shared parameters (comma-separated, e.g. t)','t'),ALPHA],({x:xi,ys,model,shared,alpha},ctx)=>{
  ys=ys.filter(c=>c!==xi);if(ys.length<2)return warn('Select at least two Y columns.');const M=MODELS[model],names=M.names,sh=new Set(shared.split(/[,;\s]+/).filter(Boolean));
  const bad=[...sh].filter(q=>!names.includes(q));if(bad.length)return warn(`Unknown parameter(s): ${bad.join(', ')}. Model parameters are: ${names.join(', ')}.`);
  const D=ys.map(yi=>sortedPairs(ctx,xi,yi));if(D.some(d=>d.x.length<=names.length))return warn('A dataset has too few points.');
  const G=globalFit(M,D,sh);if(!G)return warn('Global fit failed to converge.');const st=fitStats(G.Yv,G.ids.map(i=>G.f(i,G.p)),G.slots),rowsT=[];
  names.forEach(nm=>{if(sh.has(nm))rowsT.push([nm+' (shared)',F(G.p[G.sIdx[nm]],7),F(G.se[G.sIdx[nm]],4)]);else ys.forEach((yi,d)=>rowsT.push([`${nm} · ${ctx.name(yi,true)}`,F(G.p[G.dIdx[d][nm]],7),F(G.se[G.dIdx[d][nm]],4)]))});
  const curves=D.map((d,i)=>{const gx=grid(d.x[0],d.x[d.x.length-1],300),p=G.getp(G.p,i);return{x:gx,y:gx.map(v=>M.f(v,p)),label:`Global fit: ${ctx.name(ys[i],true)}`,color:PALETTE[i%PALETTE.length]}});
  return{html:`<div class="eq">${M.label}</div><p>${ys.length} datasets · shared: ${[...sh].join(', ')||'none'} · ${G.slots} free parameters</p>`+T(['Parameter','Value','Std. Error'],rowsT)+gofTable(st,[['Iterations',G.it]]),curves}});

// ---------- Dose–response (4PL, variable slope) with curve comparison ----------
const DRM={names:['bottom','top','logEC50','hill'],f:(x,p)=>p[0]+(p[1]-p[0])/(1+Math.pow(10,(p[2]-x)*p[3])),
  init:(x,y)=>{const mn=Math.min(...y),mx_=Math.max(...y),mid=(mn+mx_)/2;let k=0,bd=Infinity;y.forEach((v,i)=>{const d=Math.abs(v-mid);if(d<bd){bd=d;k=i}});return[[mn,mx_,x[k],1],[mn,mx_,x[k],-1],[mn,mx_,x[k],1.5],[mn,mx_,x[k],-1.5]]}};
def('doseresp','Fitting','Dose–Response (EC50 / IC50)',[col('x','Dose / concentration column','x'),cols('ys','Response columns (one curve each)','y'),chk('xlog','X values are already log10(dose)',false),txt('bot','Fix bottom at (blank = fit)',''),txt('top','Fix top at (blank = fit)',''),ALPHA],({x:xi,ys,xlog,bot,top,alpha},ctx)=>{
  ys=ys.filter(c=>c!==xi);if(!ys.length)return warn('Select at least one response column.');
  const D=ys.map(yi=>{const p=sortedPairs(ctx,xi,yi),x=[],y=[];p.x.forEach((v,i)=>{if(xlog||v>0){x.push(xlog?v:Math.log10(v));y.push(p.y[i])}});return{x,y}});
  if(D.some(d=>d.x.length<5))return warn('Each curve needs at least 5 points (dose must be > 0).');
  const fixM={};if(String(bot).trim()!=='')fixM.bottom=+bot;if(String(top).trim()!=='')fixM.top=+top;
  const fits=D.map(d=>globalFit(DRM,[d],new Set(),fixM));if(fits.some(f=>!f))return warn('A curve failed to converge.');
  const tc=(f)=>Mx.tcrit(alpha,f.dof),rows=[],curves=[];
  fits.forEach((f,i)=>{const p=f.getp(f.p,0),nm=ctx.name(ys[i],true),sl=DRM.names.map(n=>f.free.includes(n)?f.se[f.dIdx[0][n]]:NaN),le=sl[2],t=tc(f),st=fitStats(D[i].y,D[i].x.map(v=>DRM.f(v,p)),f.free.length);
    rows.push([nm,F(Math.pow(10,p[2]),5),Number.isFinite(le)?`${F(Math.pow(10,p[2]-t*le),4)} … ${F(Math.pow(10,p[2]+t*le),4)}`:'—',F(p[2],5),F(p[3],4),F(p[0],5),F(p[1],5),F(st.r2,4),D[i].x.length]);
    const lo=Math.min(...D[i].x),hi=Math.max(...D[i].x),pad=(hi-lo)*.05,gx=grid(lo-pad,hi+pad,300);curves.push({x:gx.map(v=>xlog?v:Math.pow(10,v)),y:gx.map(v=>DRM.f(v,p)),label:`${nm} fit`,color:PALETTE[i%PALETTE.length]})});
  let cmp='';
  if(D.length>1){const sepSSE=Mx.sum(fits.map(f=>f.c)),sepDF=Mx.sum(fits.map(f=>f.dof)),test=(name,sh)=>{const G=globalFit(DRM,D,new Set(sh),fixM);if(!G)return[name,'—','—','—'];const dfn=G.dof-sepDF,Fv=((G.c-sepSSE)/dfn)/(sepSSE/sepDF);return[name,F(Fv,4),`${dfn}, ${sepDF}`,PV(Mx.fsf(Fv,dfn,sepDF))]};
    cmp=H('Do the curves differ? (extra-sum-of-squares F test)')+T(['Null hypothesis','F','df','p-value'],[test('Same EC50 (other parameters free)',['logEC50']),test('Same hill slope',['hill']),test('One curve fits all datasets',DRM.names)])+'<p class="note">p &lt; α means the shared model fits significantly worse, i.e. the parameter differs between curves.</p>'}
  return{html:T(['Curve','EC50 / IC50','CI','log10 EC50','Hill slope','Bottom','Top','R²','N'],rows)+cmp,curves,graphOpts:xlog?undefined:{xs:'log10'}}});

// ---------- Standard curve with unknowns ----------
const STD={
  linear:{label:'Linear  y = a + b·x',names:['a','b'],lsq:x=>[1,x],yf:(x,p)=>p[0]+p[1]*x},
  quad:{label:'Quadratic  y = a + b·x + c·x²',names:['a','b','c'],lsq:x=>[1,x,x*x],yf:(x,p)=>p[0]+p[1]*x+p[2]*x*x},
  loglog:{label:'Log–log linear  ln y = a + b·ln x',names:['a','b'],lsq:x=>[1,Math.log(x)],ty:Math.log,yf:(x,p)=>Math.exp(p[0]+p[1]*Math.log(x)),pos:true},
  semilog:{label:'Semi-log  y = a + b·log10 x',names:['a','b'],lsq:x=>[1,Math.log10(x)],yf:(x,p)=>p[0]+p[1]*Math.log10(x),pos:true},
  logistic4:{label:'4-parameter logistic',nl:MODELS.logistic4,pos:true},hill:{label:'Hill',nl:MODELS.hill,pos:true},power:{label:'Power',nl:MODELS.power,pos:true}};
STD.logistic4.names=MODELS.logistic4.names;STD.logistic4.yf=MODELS.logistic4.f;STD.hill.names=MODELS.hill.names;STD.hill.yf=MODELS.hill.f;STD.power.names=MODELS.power.names;STD.power.yf=MODELS.power.f;
def('stdcurve','Fitting','Standard Curve & Unknowns',[col('x','Known concentration column','x'),col('y','Signal column','y'),{t:'sel',k:'model',label:'Calibration model',opts:Object.entries(STD).map(([k,m])=>[k,m.label]),def:'linear'},{t:'sel',k:'wt',label:'Weighting',opts:[['none','None'],['1/x','1/x'],['1/x2','1/x²'],['1/y','1/y'],['1/y2','1/y²']],def:'none'},optCol('u','Unknown sample signals (optional)'),ALPHA],({x:xi,y:yi,model,wt,u:ui,alpha},ctx)=>{
  const M=STD[model],{x,y}=sortedPairs(ctx,xi,yi),n=x.length,k=M.names.length;if(n<=k)return warn('Not enough calibration points.');if(M.pos&&x.some(v=>v<=0))return warn('This model needs all concentrations > 0.');
  if(M.ty&&y.some(v=>v<=0))return warn('The log–log model needs all signals > 0 (blank-subtract carefully or pick another model).');
  const W=(xv,yv)=>({none:1,'1/x':1/Math.max(Math.abs(xv),1e-12),'1/x2':1/Math.max(xv*xv,1e-24),'1/y':1/Math.max(Math.abs(yv),1e-12),'1/y2':1/Math.max(yv*yv,1e-24)})[wt];
  const w=x.map((v,i)=>W(v,y[i]));let p,pcov,dof,s2,yf=M.yf;
  if(M.lsq){const X=x.map((v,i)=>M.lsq(v).map(c=>c*Math.sqrt(w[i]))),yy=y.map((v,i)=>(M.ty?M.ty(v):v)*Math.sqrt(w[i])),r=Mx.lstsq(X,yy);if(!r)return warn('Singular fit.');p=r.beta;dof=r.df;s2=r.sse/dof;pcov=r.cov.map(row=>row.map(v=>v*s2))}
  else{const ids=x.map((_,i)=>i),f=(i,q)=>Math.sqrt(w[i])*M.nl.f(x[i],q),yw=y.map((v,i)=>v*Math.sqrt(w[i])),r=runFit(f,M.nl.init(x,y),ids,yw);if(!r)return warn('Calibration fit failed to converge.');p=r.p;dof=r.dof;s2=r.c/dof;pcov=r.cov||p.map(()=>p.map(()=>NaN))}
  const fit=x.map(v=>yf(v,p)),st=fitStats(y,fit,k),sres=Math.sqrt(y.reduce((a,v,i)=>a+(v-fit[i])**2,0)/Math.max(dof,1)),tc=Mx.tcrit(alpha,dof);
  const lo0=x[0],hi0=x[n-1],span=hi0-lo0;
  const inv=(y0)=>{const a=M.pos?lo0/50:lo0-span,b=M.pos?hi0*50:hi0+span,N=600,xs=Array.from({length:N+1},(_,i)=>M.pos?a*Math.pow(b/a,i/N):a+(b-a)*i/N),fv=xs.map(v=>yf(v,p)-y0),roots=[];
    for(let i=0;i<N;i++){if(!Number.isFinite(fv[i])||!Number.isFinite(fv[i+1]))continue;if(fv[i]===0)roots.push(xs[i]);else if(fv[i]*fv[i+1]<0){let l=xs[i],h=xs[i+1];for(let q=0;q<60;q++){const m=(l+h)/2;(yf(m,p)-y0)*fv[i]>0?l=m:h=m}roots.push((l+h)/2)}}
    if(!roots.length)return NaN;const inside=roots.filter(r=>r>=lo0&&r<=hi0);return inside.length?inside[0]:roots.sort((r1,r2)=>Math.abs(r1-(lo0+hi0)/2)-Math.abs(r2-(lo0+hi0)/2))[0]};
  const ci=(x0,y0)=>{const h=Math.max(Math.abs(x0)*1e-5,1e-9),fp=(yf(x0+h,p)-yf(x0-h,p))/(2*h);if(!fp||!Number.isFinite(fp))return NaN;
    const g=p.map((pj,j)=>{const e=Math.max(Math.abs(pj)*1e-6,1e-9),q1=[...p],q2=[...p];q1[j]+=e;q2[j]-=e;return(yf(x0,q1)-yf(x0,q2))/(2*e)});let v=0;for(let i=0;i<k;i++)for(let j=0;j<k;j++)v+=g[i]*pcov[i][j]*g[j];
    const sy2=s2/W(x0,y0);return tc*Math.sqrt(Math.max(0,(sy2+v))/(fp*fp))};
  const back=x.map((xv,i)=>inv(y[i]));
  let unkHtml='',outCols=[],marks=[];
  if(ui>=0){const U=ctx.vals(ui),rows=[],cc=new Array(U.length).fill(NaN),lo=cc.slice(),hi=cc.slice();let q=0;
    U.forEach((y0,i)=>{if(!Number.isFinite(y0))return;q++;const x0=inv(y0);if(Number.isFinite(x0)){const e=ci(x0,y0);cc[i]=x0;lo[i]=x0-e;hi[i]=x0+e;marks.push({x:x0,y:y0,label:'U'+q})}
      const flag=!Number.isFinite(x0)?'out of range':(x0<lo0||x0>hi0)?'extrapolated':'ok';rows.push([`U${q}`,F(y0),Number.isFinite(x0)?F(x0,6):'—',Number.isFinite(x0)?`${F(x0-ci(x0,y0),5)} … ${F(x0+ci(x0,y0),5)}`:'—',flag])});
    unkHtml=H('Unknown samples')+T(['Sample','Signal','Concentration',`${100*(1-alpha)}% CI`,'Flag'],rows);outCols=[{name:'Conc (calc)',d:cc},{name:'Conc lower',d:lo},{name:'Conc upper',d:hi}]}
  const lod=model==='linear'?KVrows([['LOD (3.3·s/slope)',F(3.3*sres/p[1],5)],['LOQ (10·s/slope)',F(10*sres/p[1],5)]]):'';
  function KVrows(r){return r}
  const gx=M.pos?grid(Math.log10(lo0),Math.log10(hi0),300).map(v=>Math.pow(10,v)):grid(lo0,hi0,300);
  return{html:`<div class="eq">${M.label}${wt!=='none'?'  ·  weights '+wt:''}</div>`+paramTable(M.names,p,pcov.map((r,i)=>Math.sqrt(Math.abs(r[i]))),dof,alpha)+KV([['N',n],['R²',F(st.r2,6)],['Residual SD (s)',F(sres)],...(lod||[])])+
    H('Back-calculated standards')+T(['Known','Signal','Back-calc','Recovery %'],x.map((xv,i)=>[F(xv,5),F(y[i]),F(back[i],5),Number.isFinite(back[i])?F(back[i]/xv*100,4):'—']))+unkHtml,
    curves:[{x:gx,y:gx.map(v=>yf(v,p)),label:'Calibration'}],marks,cols:outCols}});

// ---------- Repeated-measures ANOVA ----------
def('rmanova','Statistics','Repeated-Measures ANOVA',[cols('cols','Condition columns (one row per subject)','y'),ALPHA],({cols:cs,alpha},ctx)=>{
  const V=cs.map(c=>ctx.vals(c)),nAll=Math.max(...V.map(v=>v.length)),rows=[];for(let i=0;i<nAll;i++)if(V.every(v=>Number.isFinite(v[i])))rows.push(i);
  const k=cs.length,n=rows.length;if(k<2||n<3)return warn('Need at least 2 condition columns and 3 complete subjects.');
  const Y=rows.map(i=>V.map(v=>v[i])),gm=Mx.mean(Y.flat()),cm=V.map((_,j)=>Mx.mean(Y.map(r=>r[j]))),sm=Y.map(r=>Mx.mean(r));
  const ssC=n*Mx.sum(cm.map(m=>(m-gm)**2)),ssS=k*Mx.sum(sm.map(m=>(m-gm)**2)),ssT=Mx.sum(Y.flat().map(v=>(v-gm)**2)),ssE=ssT-ssC-ssS,dfC=k-1,dfE=(n-1)*(k-1),msC=ssC/dfC,msE=ssE/dfE,Fv=msC/msE,p=Mx.fsf(Fv,dfC,dfE);
  const S=Array.from({length:k},(_,a)=>Array.from({length:k},(_,b)=>Mx.sum(Y.map(r=>(r[a]-cm[a])*(r[b]-cm[b])))/(n-1))),rm=S.map(r=>Mx.mean(r)),g0=Mx.mean(rm),Sc=S.map((r,a)=>r.map((v,b)=>v-rm[a]-rm[b]+g0)),
    tr=Sc.reduce((a,r,i)=>a+r[i],0),tr2=Mx.sum(Sc.flat().map(v=>v*v)),egg=Math.min(1,Math.max(1/(k-1),tr*tr/((k-1)*tr2))),ehf=Math.min(1,(n*(k-1)*egg-2)/((k-1)*(n-1-(k-1)*egg)));
  const pgg=Mx.fsf(Fv,egg*dfC,egg*dfE),phf=Mx.fsf(Fv,ehf*dfC,ehf*dfE),pw=[];
  for(let a=0;a<k;a++)for(let b=a+1;b<k;b++){const d=Y.map(r=>r[a]-r[b]),md=Mx.mean(d),sd=Mx.sd(d),t=md/(sd/Math.sqrt(n)),pb=Math.min(1,Mx.tp2(t,n-1)*k*(k-1)/2),q=Math.abs(md)/Math.sqrt(msE/n),pt=1-Mx.ptukey(q,k,dfE);pw.push([`${ctx.name(cs[a])} − ${ctx.name(cs[b])}`,F(md),F(t),PV(pb),F(q),PV(pt),pt<alpha?'Yes':'No'])}
  return{html:H('Within-subjects ANOVA')+T(['Source','SS','df','MS','F','Prob>F'],[['Conditions',F(ssC),dfC,F(msC),F(Fv),PV(p)],['Subjects',F(ssS),n-1,F(ssS/(n-1)),'',''],['Error',F(ssE),dfE,F(msE),'',''],['Total',F(ssT),n*k-1,'','','']])+
    H('Sphericity corrections')+T(['Correction','ε','df (cond, error)','Prob>F'],[['None (assumed)','1',`${dfC}, ${dfE}`,PV(p)],['Greenhouse–Geisser',F(egg,4),`${F(egg*dfC,4)}, ${F(egg*dfE,4)}`,PV(pgg)],['Huynh–Feldt',F(ehf,4),`${F(ehf*dfC,4)}, ${F(ehf*dfE,4)}`,PV(phf)]])+KV([['Subjects',n],['Partial η²',F(ssC/(ssC+ssE),4)]])+
    H('Condition means')+T(['Condition','Mean','SD'],cs.map((c,j)=>[ctx.name(c),F(cm[j]),F(Mx.sd(Y.map(r=>r[j])))]))+
    H('Pairwise comparisons')+T(['Comparison','Mean diff','paired t','Bonferroni p','Tukey q','Tukey p','Significant'],pw)}});

// ---------- Welch ANOVA + Games–Howell ----------
def('welch','Statistics','Welch ANOVA + Games–Howell',[cols('cols','Group columns','y'),ALPHA],({cols:cs,alpha},ctx)=>{
  const g=cs.map(c=>Mx.clean(ctx.vals(c))),k=g.length;if(k<2||g.some(a=>a.length<2))return warn('Need at least two groups with two values each.');
  const n=g.map(a=>a.length),m=g.map(Mx.mean),v=g.map(Mx.variance),w=n.map((ni,i)=>ni/v[i]),Wt=Mx.sum(w),mw=Mx.sum(w.map((wi,i)=>wi*m[i]))/Wt,A=Mx.sum(w.map((wi,i)=>wi*(m[i]-mw)**2))/(k-1),
    lam=Mx.sum(w.map((wi,i)=>(1-wi/Wt)**2/(n[i]-1))),B=1+2*(k-2)/(k*k-1)*lam,Fv=A/B,df2=(k*k-1)/(3*lam),p=Mx.fsf(Fv,k-1,df2),gh=[];
  for(let i=0;i<k;i++)for(let j=i+1;j<k;j++){const d=m[i]-m[j],se=Math.sqrt(v[i]/n[i]+v[j]/n[j]),df=se**4/((v[i]/n[i])**2/(n[i]-1)+(v[j]/n[j])**2/(n[j]-1)),q=Math.abs(d)/se*Math.SQRT2,pg=1-Mx.ptukey(q,k,df);gh.push([`${ctx.name(cs[i])} − ${ctx.name(cs[j])}`,F(d),F(se),F(df,4),PV(pg),pg<alpha?'Yes':'No'])}
  return{html:KV([['Welch F',F(Fv)],['df1',k-1],['df2',F(df2,5)],['Prob>F',PV(p)],['Conclusion',p<alpha?'At least one mean differs (unequal variances allowed)':'No significant difference']])+H('Group summary')+T(['Group','N','Mean','SD'],g.map((a,i)=>[ctx.name(cs[i]),n[i],F(m[i]),F(Math.sqrt(v[i]))]))+H('Games–Howell post-hoc')+T(['Comparison','Mean diff','SE','df','Adj. p','Significant'],gh)}});

// ---------- Dunnett ----------
def('dunnett','Statistics','Dunnett Test (vs control)',[col('ctrl','Control group column','y'),cols('cols','All group columns (including control)','y'),ALPHA],({ctrl,cols:cs,alpha},ctx)=>{
  cs=cs.filter(c=>c!==ctrl);if(!cs.length)return warn('Select the treatment columns as well.');const g0=Mx.clean(ctx.vals(ctrl)),G=cs.map(c=>Mx.clean(ctx.vals(c))),all=[g0,...G],kt=all.length,N=Mx.sum(all.map(a=>a.length)),dfW=N-kt;
  const ssw=Mx.sum(all.map(a=>{const m=Mx.mean(a);return Mx.sum(a.map(v=>(v-m)**2))})),mse=ssw/dfW,m0=Mx.mean(g0),mc=cs.length,rhos=G.map(a=>a.length/(a.length+g0.length)),rho=Mx.mean(rhos.map(r=>Math.min(.99,r))),tcrit=Mx.qdunnett(1-alpha,mc,dfW,rho);
  const rows=G.map((a,i)=>{const d=Mx.mean(a)-m0,se=Math.sqrt(mse*(1/a.length+1/g0.length)),t=d/se,p=1-Mx.pdunnett(Math.abs(t),mc,dfW,rho);return[`${ctx.name(cs[i])} − ${ctx.name(ctrl)}`,F(d),F(se),F(t),PV(p),`${F(d-tcrit*se,4)} … ${F(d+tcrit*se,4)}`,p<alpha?'Yes':'No']});
  return{html:KV([['Control',ctx.name(ctrl)],['Treatments',mc],['Pooled MSE',F(mse)],['df (error)',dfW],['Dunnett critical |t|',F(tcrit,4)]])+T(['Comparison','Mean diff','SE','t','Adj. p','Simultaneous CI','Significant'],rows)}});

// ---------- Butterworth IIR ----------
function bwSections(type,fc,fs,order){const w0=2*Math.PI*fc/fs,cs=Math.cos(w0),sn=Math.sin(w0),secs=[];
  for(let k=1;k<=Math.floor(order/2);k++){const Q=1/(2*Math.sin(Math.PI*(2*k-1)/(2*order))),al=sn/(2*Q);let b0,b1;if(type==='lp'){b0=(1-cs)/2;b1=1-cs}else{b0=(1+cs)/2;b1=-(1+cs)}const a0=1+al;secs.push([b0/a0,b1/a0,b0/a0,-2*cs/a0,(1-al)/a0])}
  if(order%2){const K=Math.tan(w0/2);let b0,b1;if(type==='lp'){b0=K/(1+K);b1=b0}else{b0=1/(1+K);b1=-b0}secs.push([b0,b1,0,(K-1)/(1+K),0])}return secs}
function sosRun(secs,x){let y=x.slice();for(const[b0,b1,b2,a1,a2]of secs){let z1=0,z2=0;y=y.map(v=>{const o=b0*v+z1;z1=b1*v-a1*o+z2;z2=b2*v-a2*o;return o})}return y}
function sosFiltfilt(secs,x,zero){if(!zero)return sosRun(secs,x);const n=x.length,pad=Math.min(n-1,60),ext=[];
  for(let i=pad;i>=1;i--)ext.push(2*x[0]-x[i]);x.forEach(v=>ext.push(v));for(let i=1;i<=pad;i++)ext.push(2*x[n-1]-x[n-1-i]);
  let y=sosRun(secs,ext).reverse();y=sosRun(secs,y).reverse();return y.slice(pad,pad+n)}
def('butter','Signal','Butterworth IIR Filter',[col('x','X (time) column','x'),col('y','Signal column','y'),sel('type','Type',[['lp','Low-pass'],['hp','High-pass'],['bp','Band-pass'],['bs','Band-stop']],'lp'),num('f1','Cutoff 1 (frequency units)',8,0.5),num('f2','Cutoff 2 (band filters)',30,0.5),num('order','Order',4,1),chk('zero','Zero-phase (forward-backward)',true)],({x:xi,y:yi,type,f1,f2,order,zero},ctx)=>{
  const{x,y,rows}=pairs(ctx,xi,yi),d=[];for(let i=1;i<x.length;i++)d.push(x[i]-x[i-1]);const fs=1/Mx.median(d);order=Math.max(1,Math.min(10,Math.round(order)));
  const lo=Math.min(f1,f2),hi=Math.max(f1,f2);if(Math.max(f1,type==='bp'||type==='bs'?f2:0)>=fs/2)return warn(`Cutoff must be below the Nyquist frequency (${F(fs/2)}).`);
  let o;if(type==='lp')o=sosFiltfilt(bwSections('lp',f1,fs,order),y,zero);else if(type==='hp')o=sosFiltfilt(bwSections('hp',f1,fs,order),y,zero);
  else if(type==='bp')o=sosFiltfilt([...bwSections('hp',lo,fs,order),...bwSections('lp',hi,fs,order)],y,zero);
  else{const a=sosFiltfilt(bwSections('lp',lo,fs,order),y,zero),b=sosFiltfilt(bwSections('hp',hi,fs,order),y,zero);o=a.map((v,i)=>v+b[i])}
  return{html:KV([['Sampling frequency',F(fs)],['Nyquist',F(fs/2)],['Order',order],['Phase',zero?'zero-phase (effective order ×2)':'causal']]),cols:[{name:ctx.name(yi,true)+'_iir_'+type,d:place(rows,o,ctx.nrows)}]}});

// ---------- STFT spectrogram ----------
def('stft','Signal','Spectrogram (STFT)',[col('x','X (time) column','x'),col('y','Signal column','y'),num('win','Window length (points)',128,16),num('ov','Overlap (%)',75,5),chk('db','Amplitude in dB',false)],({x:xi,y:yi,win,ov,db},ctx)=>{
  const{x,y}=pairs(ctx,xi,yi),n=y.length,d=[];for(let i=1;i<n;i++)d.push(x[i]-x[i-1]);const dt=Mx.median(d);win=Math.min(Mx.pow2(Math.round(win)),Mx.pow2(n));
  if(n<win)return warn('Signal shorter than the window.');const step=Math.max(1,Math.round(win*(1-Math.min(95,Math.max(0,ov))/100))),W=Array.from({length:win},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(win-1))),sw=Mx.sum(W),frames=[],tc=[];
  for(let s=0;s+win<=n;s+=step){const seg=y.slice(s,s+win),m=Mx.mean(seg),{re,im}=Mx.fft(seg.map((v,i)=>(v-m)*W[i]),new Array(win).fill(0)),amp=[];for(let k=0;k<=win/2;k++){const a=2*Math.hypot(re[k],im[k])/sw;amp.push(db?20*Math.log10(a+1e-12):a)}frames.push(amp);tc.push(x[s+(win>>1)])}
  const fr=Array.from({length:win/2+1},(_,k)=>k/(win*dt));
  return{html:KV([['Window',win],['Hop',step],['Frames',frames.length],['Frequency bins',fr.length],['Δf',F(1/(win*dt))],['Δt (hop)',F(step*dt)]]),sheet:{name:'Spectrogram',isMatrix:true,xv:tc,yv:fr,cols:frames.map((a,j)=>({name:Mx.fmt(tc[j],4),d:a})),plot:'heat'}}});

// ---------- Matrix → XYZ ----------
def('mat2xyz','Multivariate','Convert Matrix to XYZ',[cols('cols','Matrix columns','y')],({cols:cs},ctx)=>{
  const sh=ctx.sheet,nr=Math.max(...cs.map(c=>sh.cols[c].d.length)),X=[],Y=[],Z=[];
  cs.forEach((c,j)=>{const xv=sh.isMatrix&&sh.xv?sh.xv[c]:(Number.isFinite(+sh.cols[c].name)&&sh.cols[c].name!==''?+sh.cols[c].name:j+1);for(let r=0;r<nr;r++){const z=sh.cols[c].d[r];if(typeof z==='number'&&Number.isFinite(z)){X.push(xv);Y.push(sh.isMatrix&&sh.yv?sh.yv[r]:r+1);Z.push(z)}}});
  return{html:`<p>${Z.length} XYZ points extracted into a new sheet.</p>`,sheet:{name:'MatrixXYZ',cols:[{name:'X',des:'X',d:X},{name:'Y',des:'Y',d:Y},{name:'Z',des:'Z',d:Z}]}}});
