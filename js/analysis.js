'use strict';
// Analysis library. Each def: {id, group, label, fields, run(args, ctx)} -> {html, cols, curves, marks, sheet}
const A={defs:{},order:[]};
const F=Mx.fmt,PV=Mx.fmtP;
const T=(head,rows)=>`<table class="rt"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const KV=rows=>T(['Quantity','Value'],rows);
const H=s=>`<h4>${s}</h4>`;
const col=(k,label,role)=>({t:'col',k,label,role}),cols=(k,label,role)=>({t:'cols',k,label,role}),
  num=(k,label,def,step)=>({t:'num',k,label,def,step}),sel=(k,label,opts,def)=>({t:'sel',k,label,opts,def}),
  chk=(k,label,def)=>({t:'chk',k,label,def}),txt=(k,label,def)=>({t:'txt',k,label,def});
function def(id,group,label,fields,run){A.defs[id]={id,group,label,fields,run};A.order.push(id)}
const ALPHA=num('alpha','Significance level α',0.05,0.01);
const full=n=>new Array(n).fill(NaN);
function pairs(ctx,xi,yi){const X=ctx.vals(xi),Y=ctx.vals(yi),x=[],y=[],rows=[];
  for(let i=0;i<Math.max(X.length,Y.length);i++)if(Number.isFinite(X[i])&&Number.isFinite(Y[i])){x.push(X[i]);y.push(Y[i]);rows.push(i)}
  return{x,y,rows}}
function sortedPairs(ctx,xi,yi){const p=pairs(ctx,xi,yi),idx=p.x.map((_,i)=>i).sort((a,b)=>p.x[a]-p.x[b]);
  return{x:idx.map(i=>p.x[i]),y:idx.map(i=>p.y[i]),rows:idx.map(i=>p.rows[i])}}
const place=(rows,vals,n)=>{const o=full(n);rows.forEach((r,i)=>o[r]=vals[i]);return o};
const grid=(lo,hi,n=300)=>Array.from({length:n+1},(_,i)=>lo+(hi-lo)*i/n);
function colname(ctx,ci){return ctx.name(ci)}
function warn(msg){return{html:`<p class="err">${msg}</p>`}}

// ===================== BUILT-IN FIT MODELS =====================
const rngx=x=>Math.max(...x)-Math.min(...x)||1;
const MODELS={
  exp:{label:'Exponential  a·e^(b·x)',names:['a','b'],f:(x,p)=>p[0]*Math.exp(p[1]*x),
    init:(x,y)=>{const q=x.map((v,i)=>[v,y[i]]).filter(r=>r[1]>0);let s=[y[0]||1,1/rngx(x)];if(q.length>2){const l=Mx.lstsq(q.map(r=>[1,r[0]]),q.map(r=>Math.log(r[1])));if(l)s=[Math.exp(l.beta[0]),l.beta[1]]}return[s]}},
  expgrow:{label:'Exponential growth  y0 + A·e^(x/t)',names:['y0','A','t'],f:(x,p)=>p[0]+p[1]*Math.exp(x/p[2]),
    init:(x,y)=>[[Math.min(...y),(y[y.length-1]-y[0])/2||1,rngx(x)/2]]},
  expdec1:{label:'Exponential decay  y0 + A·e^(−x/t)',names:['y0','A','t'],f:(x,p)=>p[0]+p[1]*Math.exp(-x/p[2]),
    init:(x,y)=>{const yl=y[y.length-1];return[[yl,y[0]-yl,rngx(x)/3],[yl,y[0]-yl,rngx(x)/10]]}},
  expdec2:{label:'Biexponential decay  y0 + A1·e^(−x/t1) + A2·e^(−x/t2)',names:['y0','A1','t1','A2','t2'],f:(x,p)=>p[0]+p[1]*Math.exp(-x/p[2])+p[3]*Math.exp(-x/p[4]),
    init:(x,y)=>{const yl=y[y.length-1],a=y[0]-yl,r=rngx(x);return[[yl,a/2,r/20,a/2,r/3],[yl,a*.7,r/50,a*.3,r/5]]}},
  power:{label:'Power  a·x^b',names:['a','b'],f:(x,p)=>p[0]*Math.pow(x,p[1]),
    init:(x,y)=>{const q=x.map((v,i)=>[v,y[i]]).filter(r=>r[0]>0&&r[1]>0);if(q.length>2){const l=Mx.lstsq(q.map(r=>[1,Math.log(r[0])]),q.map(r=>Math.log(r[1])));if(l)return[[Math.exp(l.beta[0]),l.beta[1]]]}return[[1,1]]}},
  log:{label:'Logarithmic  a + b·ln(x)',names:['a','b'],f:(x,p)=>p[0]+p[1]*Math.log(x),
    init:(x,y)=>{const q=x.map((v,i)=>[v,y[i]]).filter(r=>r[0]>0);const l=Mx.lstsq(q.map(r=>[1,Math.log(r[0])]),q.map(r=>r[1]));return[l?l.beta:[0,1]]}},
  gauss:{label:'Gaussian  y0 + A·e^(−(x−xc)²/2w²)',names:['y0','A','xc','w'],f:(x,p)=>p[0]+p[1]*Math.exp(-((x-p[2])**2)/(2*p[3]*p[3])),
    init:(x,y)=>{const mn=Math.min(...y),mxv=Math.max(...y),k=y.indexOf(mxv);return[[mn,mxv-mn,x[k],rngx(x)/8],[mn,mxv-mn,x[k],rngx(x)/20]]}},
  lorentz:{label:'Lorentzian  y0 + A·w²/((x−xc)²+w²)',names:['y0','A','xc','w'],f:(x,p)=>p[0]+p[1]*p[3]*p[3]/((x-p[2])**2+p[3]*p[3]),
    init:(x,y)=>{const mn=Math.min(...y),mxv=Math.max(...y),k=y.indexOf(mxv);return[[mn,mxv-mn,x[k],rngx(x)/10],[mn,mxv-mn,x[k],rngx(x)/30]]}},
  boltz:{label:'Boltzmann sigmoid  A2 + (A1−A2)/(1+e^((x−x0)/dx))',names:['A1','A2','x0','dx'],f:(x,p)=>p[1]+(p[0]-p[1])/(1+Math.exp((x-p[2])/p[3])),
    init:(x,y)=>{const r=rngx(x),m=(Math.min(...x)+Math.max(...x))/2,up=y[y.length-1]>y[0];return[[y[0],y[y.length-1],m,(up?-1:1)*r/10],[y[0],y[y.length-1],m,(up?1:-1)*r/10]]}},
  logistic4:{label:'4-parameter logistic  D + (A−D)/(1+(x/C)^B)',names:['A','D','C','B'],f:(x,p)=>p[1]+(p[0]-p[1])/(1+Math.pow(x/p[2],p[3])),
    init:(x,y)=>{const q=x.filter(v=>v>0);const m=Math.sqrt(Math.min(...q)*Math.max(...q))||1;return[[y[0],y[y.length-1],m,1],[y[0],y[y.length-1],m,-1],[y[0],y[y.length-1],m,2]]}},
  hill:{label:'Hill  Vmax·x^n/(k^n+x^n)',names:['Vmax','k','n'],f:(x,p)=>p[0]*Math.pow(x,p[2])/(Math.pow(Math.abs(p[1]),p[2])+Math.pow(x,p[2])),
    init:(x,y)=>[[Math.max(...y),(Math.min(...x)+Math.max(...x))/2||1,1],[Math.max(...y),Math.max(...x)/4||1,2]]},
  mm:{label:'Michaelis–Menten  Vmax·x/(Km+x)',names:['Vmax','Km'],f:(x,p)=>p[0]*x/(p[1]+x),init:(x,y)=>[[Math.max(...y)*1.2,Math.max(...x)/3||1]]},
  langmuir:{label:'Langmuir  Qm·K·x/(1+K·x)',names:['Qm','K'],f:(x,p)=>p[0]*p[1]*x/(1+p[1]*x),init:(x,y)=>[[Math.max(...y)*1.2,1/(Math.max(...x)/3||1)]]},
  sine:{label:'Sine  y0 + A·sin(2π·x/T + φ)',names:['y0','A','T','phi'],f:(x,p)=>p[0]+p[1]*Math.sin(2*Math.PI*x/p[2]+p[3]),
    init:(x,y)=>{const m=Mx.mean(y),a=(Math.max(...y)-Math.min(...y))/2;let cr=0;for(let i=1;i<y.length;i++)if((y[i-1]-m)*(y[i]-m)<0)cr++;const T=cr>0?2*rngx(x)/cr:rngx(x);return[0,Math.PI/2,Math.PI,1.5*Math.PI].map(ph=>[m,a,T,ph])}}
};
A.MODELS=MODELS;
function runFit(f,starts,x,y){let best=null;for(const s of starts){let r;try{r=Mx.lm(f,s,x,y)}catch(e){continue}if(r.p.every(Number.isFinite)&&(!best||r.c<best.c))best=r}return best}
function fitStats(y,fit,k){const n=y.length,yb=Mx.mean(y);let sse=0,sst=0;for(let i=0;i<n;i++){sse+=(y[i]-fit[i])**2;sst+=(y[i]-yb)**2}const r2=1-sse/sst;
  return{n,sse,sst,r2,adj:n>k?1-(1-r2)*(n-1)/(n-k):NaN,rmse:Math.sqrt(sse/Math.max(n-k,1)),dof:n-k}}
function paramTable(names,p,se,dof,alpha=0.05){const tc=dof>0?Mx.tcrit(alpha,dof):NaN;
  return T(['Parameter','Value','Std. Error','t','Prob>|t|',`${100*(1-alpha)}% LCL`,`${100*(1-alpha)}% UCL`],
    names.map((n,i)=>{const t=p[i]/se[i];return[n,F(p[i],8),F(se[i],5),F(t,4),PV(Mx.tp2(t,dof)),F(p[i]-tc*se[i],6),F(p[i]+tc*se[i],6)]}))}
function gofTable(s,extra=[]){return KV([['N',s.n],['Degrees of freedom',s.dof],['Residual sum of squares',F(s.sse)],['Reduced χ²',F(s.sse/Math.max(s.dof,1))],['RMSE',F(s.rmse)],['R²',F(s.r2,6)],['Adj. R²',F(s.adj,6)],['AIC',F(s.n*Math.log(s.sse/s.n)+2*(s.n-s.dof),6)],['BIC',F(s.n*Math.log(s.sse/s.n)+(s.n-s.dof)*Math.log(s.n),6)],...extra])}

// ===================== DESCRIPTIVE / NORMALITY =====================
def('descr','Statistics','Descriptive Statistics',[cols('cols','Columns','y'),ALPHA],({cols:cs,alpha},ctx)=>{
  const st=cs.map(ci=>{const v=Mx.clean(ctx.vals(ci)),s=Mx.sorted(v),n=v.length,m=Mx.mean(v),sd=Mx.sd(v),sem=sd/Math.sqrt(n),tc=n>1?Mx.tcrit(alpha,n-1):NaN;
    return[n,Mx.sum(v),m,sd,sem,m-tc*sem,m+tc*sem,Mx.variance(v),sd/m*100,Mx.skew(v),Mx.kurt(v),s[0],Mx.quantile(s,.25),Mx.quantile(s,.5),Mx.quantile(s,.75),s[n-1],s[n-1]-s[0]]});
  const L=['N','Sum','Mean','Standard Deviation','SE of Mean',`Mean ${100*(1-alpha)}% LCL`,`Mean ${100*(1-alpha)}% UCL`,'Variance','CV (%)','Skewness','Kurtosis (excess)','Minimum','Q1','Median','Q3','Maximum','Range'];
  return{html:T(['Statistic',...cs.map(c=>ctx.name(c))],L.map((l,i)=>[l,...st.map(r=>i===0?r[0]:F(r[i]))]))}});
def('normal','Statistics','Normality Test & Q-Q Plot',[col('y','Data column','y'),ALPHA],({y,alpha},ctx)=>{
  const raw=ctx.vals(y),rows=[],v=[];raw.forEach((a,i)=>{if(Number.isFinite(a)){rows.push(i);v.push(a)}});
  const n=v.length;if(n<8)return warn('Need at least 8 values.');
  const m=Mx.mean(v),sd=Math.sqrt(v.reduce((s,a)=>s+(a-m)**2,0)/n);
  const sk=v.reduce((s,a)=>s+((a-m)/sd)**3,0)/n,ku=v.reduce((s,a)=>s+((a-m)/sd)**4,0)/n-3,jb=n/6*(sk*sk+ku*ku/4),p=Mx.chi2sf(jb,2);
  const sv=Mx.sorted(v),sd1=Mx.sd(v);let a2=-n;for(let i=0;i<n;i++){const z1=Mx.normcdf((sv[i]-m)/sd1),z2=Mx.normcdf((sv[n-1-i]-m)/sd1);a2-=(2*i+1)/n*(Math.log(Math.max(z1,1e-300))+Math.log(Math.max(1-z2,1e-300)))}
  const as=a2*(1+.75/n+2.25/(n*n)),adp=as>=.6?Math.exp(1.2937-5.709*as+.0186*as*as):as>=.34?Math.exp(.9177-4.279*as-1.38*as*as):as>=.2?1-Math.exp(-8.318+42.796*as-59.938*as*as):1-Math.exp(-13.436+101.14*as-223.73*as*as);
  const order=v.map((_,i)=>i).sort((a,b)=>v[a]-v[b]),th=new Array(n),sm=new Array(n);
  order.forEach((idx,r)=>{th[r]=Mx.norminv((r+1-.375)/(n+.25));sm[r]=v[idx]});
  const l=Mx.lstsq(th.map(t=>[1,t]),sm),corr=Math.sqrt(Math.max(0,1-l.sse/sm.reduce((s,a)=>s+(a-Mx.mean(sm))**2,0)));
  return{html:KV([['N',n],['Skewness',F(sk)],['Excess kurtosis',F(ku)],['Jarque–Bera statistic',F(jb)],['Prob > χ²(2)',PV(p)],['Anderson–Darling A²*',F(as)],['Anderson–Darling p',PV(adp)],['Q-Q correlation',F(corr,5)],
    ['Decision',Math.min(p,adp)>alpha?`Cannot reject normality at α=${alpha}`:`Reject normality at α=${alpha}`]])+'<p class="note">Q-Q plot data added to sheet: plot Sample Quantile vs Theoretical Quantile as scatter.</p>',
    cols:[{name:'Theoretical Quantile',d:th},{name:'Sample Quantile',d:sm}],plot:{type:'scatter',series:[[0,1,'Q-Q']],xl:'Theoretical quantile',yl:'Sample quantile'}}});

// ===================== HYPOTHESIS TESTS =====================
def('ttest1','Statistics','One-Sample t-Test',[col('y','Data column','y'),num('mu','Test mean μ₀',0),ALPHA],({y,mu,alpha},ctx)=>{
  const v=Mx.clean(ctx.vals(y)),n=v.length,m=Mx.mean(v),se=Mx.sd(v)/Math.sqrt(n),t=(m-mu)/se,df=n-1,tc=Mx.tcrit(alpha,df);
  return{html:KV([['N',n],['Mean',F(m)],['SD',F(Mx.sd(v))],['SE',F(se)],['H₀ mean',F(mu)],['t',F(t)],['df',df],['Prob>|t|',PV(Mx.tp2(t,df))],[`${100*(1-alpha)}% CI of mean`,`${F(m-tc*se)} … ${F(m+tc*se)}`],['Conclusion',Mx.tp2(t,df)<alpha?'Mean differs from μ₀':'No significant difference']])}});
def('ttest2','Statistics','Two-Sample t-Test',[col('a','Sample 1','y'),col('b','Sample 2','y'),sel('eq','Variance assumption',[['welch','Unequal (Welch)'],['pooled','Equal (pooled)']],'welch'),ALPHA],({a,b,eq,alpha},ctx)=>{
  const u=Mx.clean(ctx.vals(a)),w=Mx.clean(ctx.vals(b)),n1=u.length,n2=w.length,m1=Mx.mean(u),m2=Mx.mean(w),v1=Mx.variance(u),v2=Mx.variance(w);
  let se,df;if(eq==='pooled'){df=n1+n2-2;const sp=((n1-1)*v1+(n2-1)*v2)/df;se=Math.sqrt(sp*(1/n1+1/n2))}else{se=Math.sqrt(v1/n1+v2/n2);df=se**4/((v1/n1)**2/(n1-1)+(v2/n2)**2/(n2-1))}
  const d=m1-m2,t=d/se,p=Mx.tp2(t,df),tc=Mx.tcrit(alpha,df),Fv=Math.max(v1,v2)/Math.min(v1,v2),pF=Math.min(1,2*Mx.fsf(Fv,(v1>=v2?n1:n2)-1,(v1>=v2?n2:n1)-1));
  return{html:T(['','Sample 1','Sample 2'],[['Column',ctx.name(a),ctx.name(b)],['N',n1,n2],['Mean',F(m1),F(m2)],['SD',F(Math.sqrt(v1)),F(Math.sqrt(v2))],['SE',F(Math.sqrt(v1/n1)),F(Math.sqrt(v2/n2))]])+
    KV([['Difference of means',F(d)],['t',F(t)],['df',F(df,5)],['Prob>|t|',PV(p)],[`${100*(1-alpha)}% CI of difference`,`${F(d-tc*se)} … ${F(d+tc*se)}`],['F-test of variances (F, p)',`${F(Fv)}, ${PV(pF)}`],['Conclusion',p<alpha?'Means differ significantly':'No significant difference']])}});
def('ttestp','Statistics','Paired t-Test',[col('a','Sample 1','y'),col('b','Sample 2','y'),ALPHA],({a,b,alpha},ctx)=>{
  const A1=ctx.vals(a),B1=ctx.vals(b),d=[];for(let i=0;i<Math.min(A1.length,B1.length);i++)if(Number.isFinite(A1[i])&&Number.isFinite(B1[i]))d.push(A1[i]-B1[i]);
  const n=d.length,m=Mx.mean(d),se=Mx.sd(d)/Math.sqrt(n),t=m/se,df=n-1,tc=Mx.tcrit(alpha,df);
  return{html:KV([['Pairs',n],['Mean difference',F(m)],['SD of differences',F(Mx.sd(d))],['SE',F(se)],['t',F(t)],['df',df],['Prob>|t|',PV(Mx.tp2(t,df))],[`${100*(1-alpha)}% CI`,`${F(m-tc*se)} … ${F(m+tc*se)}`]])}});
def('anova1','Statistics','One-Way ANOVA',[cols('cols','Group columns (each column = group)','y'),ALPHA],({cols:cs,alpha},ctx)=>{
  const g=cs.map(c=>Mx.clean(ctx.vals(c))),k=g.length,N=g.reduce((s,a)=>s+a.length,0),gm=Mx.sum(g.map(Mx.sum))/N;
  if(k<2)return warn('Select at least two columns.');
  const ssb=g.reduce((s,a)=>s+a.length*(Mx.mean(a)-gm)**2,0),ssw=g.reduce((s,a)=>{const m=Mx.mean(a);return s+a.reduce((q,v)=>q+(v-m)**2,0)},0),dfb=k-1,dfw=N-k,msb=ssb/dfb,msw=ssw/dfw,Fv=msb/msw,p=Mx.fsf(Fv,dfb,dfw);
  const pw=[];for(let i=0;i<k;i++)for(let j=i+1;j<k;j++){const d=Mx.mean(g[i])-Mx.mean(g[j]),se=Math.sqrt(msw*(1/g[i].length+1/g[j].length)),t=d/se,pr=Math.min(1,Mx.tp2(t,dfw)*k*(k-1)/2);pw.push([`${ctx.name(cs[i])} − ${ctx.name(cs[j])}`,F(d),F(se),F(t),PV(pr),pr<alpha?'Yes':'No'])}
  const tk=[];for(let i=0;i<k;i++)for(let j=i+1;j<k;j++){const d=Mx.mean(g[i])-Mx.mean(g[j]),q=Math.abs(d)/Math.sqrt(msw/2*(1/g[i].length+1/g[j].length)),pt=1-Mx.ptukey(q,k,dfw);tk.push([`${ctx.name(cs[i])} − ${ctx.name(cs[j])}`,F(d),F(q),PV(pt),pt<alpha?'Yes':'No'])}
  return{html:H('ANOVA table')+T(['Source','SS','df','MS','F','Prob>F'],[['Between groups',F(ssb),dfb,F(msb),F(Fv),PV(p)],['Within groups',F(ssw),dfw,F(msw),'',''],['Total',F(ssb+ssw),N-1,'','','']])+
    H('Group means')+T(['Group','N','Mean','SD','SE'],g.map((a,i)=>[ctx.name(cs[i]),a.length,F(Mx.mean(a)),F(Mx.sd(a)),F(Mx.sd(a)/Math.sqrt(a.length))]))+
    H('Tukey HSD post-hoc')+T(['Comparison','Mean diff','q','Adj. p','Significant'],tk)+H('Bonferroni post-hoc')+T(['Comparison','Mean diff','SE','t','Adj. p','Significant'],pw)+`<p class="note">${p<alpha?'At least one group mean differs.':'No evidence group means differ.'}</p>`}});
def('mwu','Statistics','Mann–Whitney U Test',[col('a','Sample 1','y'),col('b','Sample 2','y'),ALPHA],({a,b,alpha},ctx)=>{
  const u=Mx.clean(ctx.vals(a)),w=Mx.clean(ctx.vals(b)),n1=u.length,n2=w.length,N=n1+n2,{r,tie}=Mx.rank([...u,...w]);
  const R1=Mx.sum(r.slice(0,n1)),U1=R1-n1*(n1+1)/2,U2=n1*n2-U1,U=Math.min(U1,U2),mu=n1*n2/2,sg=Math.sqrt(n1*n2/12*((N+1)-tie/(N*(N-1)))),z=(Math.abs(U-mu)-.5)/sg,p=2*(1-Mx.normcdf(Math.max(0,z)));
  return{html:KV([['N₁ / N₂',`${n1} / ${n2}`],['Median 1 / 2',`${F(Mx.median(u))} / ${F(Mx.median(w))}`],['U statistic',F(U)],['z (continuity corrected)',F(z)],['Prob (two-sided, asymptotic)',PV(p)],['Conclusion',p<alpha?'Distributions differ':'No significant difference']])}});
def('kruskal','Statistics','Kruskal–Wallis Test',[cols('cols','Group columns','y'),ALPHA],({cols:cs,alpha},ctx)=>{
  const g=cs.map(c=>Mx.clean(ctx.vals(c))),all=g.flat(),N=all.length,{r,tie}=Mx.rank(all);let pos=0,s=0;
  g.forEach(a=>{const R=Mx.sum(r.slice(pos,pos+a.length));pos+=a.length;s+=R*R/a.length});
  let Hs=12/(N*(N+1))*s-3*(N+1);Hs/=1-tie/(N**3-N);const p=Mx.chi2sf(Hs,g.length-1);
  return{html:KV([['Groups',g.length],['N',N],['H',F(Hs)],['df',g.length-1],['Prob>χ²',PV(p)],['Conclusion',p<alpha?'Groups differ':'No significant difference']])}});
def('chisq','Statistics','Chi-Square Test of Independence',[cols('cols','Contingency table columns (counts)','y')],({cols:cs},ctx)=>{
  const M=cs.map(c=>ctx.vals(c).filter(Number.isFinite)),r=Math.min(...M.map(a=>a.length)),c=M.length;if(r<2||c<2)return warn('Need at least a 2×2 table of counts.');
  const rt=Array.from({length:r},(_,i)=>Mx.sum(M.map(m=>m[i]))),ct=M.map(m=>Mx.sum(m.slice(0,r))),N=Mx.sum(rt);let x2=0;
  for(let i=0;i<r;i++)for(let j=0;j<c;j++){const e=rt[i]*ct[j]/N;x2+=(M[j][i]-e)**2/e}const df=(r-1)*(c-1);
  return{html:KV([['Table',`${r} × ${c}`],['N',N],['χ²',F(x2)],['df',df],['Prob>χ²',PV(Mx.chi2sf(x2,df))],['Cramér’s V',F(Math.sqrt(x2/(N*Math.min(r-1,c-1))))]])}});
def('corr','Statistics','Correlation Matrix',[cols('cols','Columns','y'),sel('m','Method',[['pearson','Pearson'],['spearman','Spearman rank']],'pearson')],({cols:cs,m},ctx)=>{
  const V=cs.map(c=>ctx.vals(c)),k=cs.length,R=[],P=[];
  for(let i=0;i<k;i++){R.push([]);P.push([]);for(let j=0;j<k;j++){let a=[],b=[];for(let q=0;q<Math.min(V[i].length,V[j].length);q++)if(Number.isFinite(V[i][q])&&Number.isFinite(V[j][q])){a.push(V[i][q]);b.push(V[j][q])}
    if(m==='spearman'){a=Mx.rank(a).r;b=Mx.rank(b).r}const n=a.length,ma=Mx.mean(a),mb=Mx.mean(b);let sab=0,sa=0,sb=0;for(let q=0;q<n;q++){sab+=(a[q]-ma)*(b[q]-mb);sa+=(a[q]-ma)**2;sb+=(b[q]-mb)**2}
    const r=i===j?1:sab/Math.sqrt(sa*sb);R[i].push(r);P[i].push(i===j?0:(n>2?Mx.tp2(r*Math.sqrt((n-2)/(1-r*r)),n-2):NaN))}}
  const heat=v=>`style="background:rgba(${v>0?'31,111,235':'229,72,77'},${Math.abs(v)*.5})"`;
  return{html:H(m==='spearman'?'Spearman ρ':'Pearson r')+`<table class="rt"><thead><tr><th></th>${cs.map(c=>`<th>${ctx.name(c)}</th>`).join('')}</tr></thead><tbody>${R.map((r,i)=>`<tr><td>${ctx.name(cs[i])}</td>${r.map(v=>`<td ${heat(v)}>${F(v,4)}</td>`).join('')}</tr>`).join('')}</tbody></table>`+
    H('p-values')+T(['',...cs.map(c=>ctx.name(c))],P.map((r,i)=>[ctx.name(cs[i]),...r.map(PV)]))}});

// ===================== REGRESSION & FITTING =====================
def('linreg','Fitting','Linear Regression',[col('x','X column','x'),col('y','Y column','y'),chk('band','Add 95% confidence band to graph',true),chk('pband','Add 95% prediction band to graph',false),chk('resid','Output residuals column',false),ALPHA],({x:xi,y:yi,band,pband,resid,alpha},ctx)=>{
  const{x,y,rows}=pairs(ctx,xi,yi),n=x.length;if(n<3)return warn('Need at least 3 points.');
  const mx=Mx.mean(x),my=Mx.mean(y);let Sxx=0,Sxy=0,Syy=0;for(let i=0;i<n;i++){Sxx+=(x[i]-mx)**2;Sxy+=(x[i]-mx)*(y[i]-my);Syy+=(y[i]-my)**2}
  const b=Sxy/Sxx,a=my-b*mx,df=n-2,sse=Syy-b*Sxy,s2=sse/df,seb=Math.sqrt(s2/Sxx),sea=Math.sqrt(s2*(1/n+mx*mx/Sxx)),r2=1-sse/Syy,tc=Mx.tcrit(alpha,df),Fv=(Syy-sse)/s2;
  const fit=x.map(v=>a+b*v),lo=Math.min(...x),hi=Math.max(...x),gx=grid(lo,hi,100),curves=[{x:gx,y:gx.map(v=>a+b*v),label:'Linear fit'}];
  const bandf=(v,extra)=>tc*Math.sqrt(s2*(extra+1/n+(v-mx)**2/Sxx));
  if(band){curves.push({x:gx,y:gx.map(v=>a+b*v+bandf(v,0)),label:'Conf. upper',dash:true},{x:gx,y:gx.map(v=>a+b*v-bandf(v,0)),label:'Conf. lower',dash:true})}
  if(pband){curves.push({x:gx,y:gx.map(v=>a+b*v+bandf(v,1)),label:'Pred. upper',dash:true,dot:true},{x:gx,y:gx.map(v=>a+b*v-bandf(v,1)),label:'Pred. lower',dash:true,dot:true})}
  const out=resid?[{name:'Residual',d:place(rows,y.map((v,i)=>v-fit[i]),ctx.nrows)}]:[];
  return{html:`<div class="eq">y = ${F(a,6)} ${b<0?'−':'+'} ${F(Math.abs(b),6)}·x</div>`+
    paramTable(['Intercept','Slope'],[a,b],[sea,seb],df,alpha)+KV([['N',n],['Pearson r',F(Sxy/Math.sqrt(Sxx*Syy),6)],['R²',F(r2,6)],['Adj. R²',F(1-(1-r2)*(n-1)/df,6)],['RMSE (s)',F(Math.sqrt(s2))]])+
    H('ANOVA')+T(['','df','SS','MS','F','Prob>F'],[['Model',1,F(Syy-sse),F(Syy-sse),F(Fv),PV(Mx.fsf(Fv,1,df))],['Error',df,F(sse),F(s2),'',''],['Total',n-1,F(Syy),'','','']]),curves,cols:out}});
def('polyreg','Fitting','Polynomial Regression',[col('x','X column','x'),col('y','Y column','y'),num('order','Polynomial order',2,1),chk('resid','Output residuals column',false),ALPHA],({x:xi,y:yi,order,resid,alpha},ctx)=>{
  order=Math.max(1,Math.min(9,Math.round(order)));const{x,y,rows}=pairs(ctx,xi,yi),n=x.length;if(n<=order+1)return warn('Not enough points for this order.');
  const s=Math.max(...x.map(Math.abs))||1,X=x.map(v=>Array.from({length:order+1},(_,k)=>Math.pow(v/s,k))),r=Mx.lstsq(X,y);if(!r)return warn('Singular matrix.');
  const s2=r.sse/r.df,p=r.beta.map((c,k)=>c/s**k),se=r.cov.map((row,k)=>Math.sqrt(row[k]*s2)/s**k),f=v=>p.reduce((a,c,k)=>a+c*v**k,0),st=fitStats(y,x.map(f),order+1);
  const gx=grid(Math.min(...x),Math.max(...x),300);
  return{html:`<div class="eq">y = ${p.map((c,k)=>`${F(c,5)}${k?'·x'+(k>1?'^'+k:''):''}`).join(' + ')}</div>`+paramTable(p.map((_,k)=>'a'+k),p,se,r.df,alpha)+gofTable(st),
    curves:[{x:gx,y:gx.map(f),label:`Poly order ${order}`}],cols:resid?[{name:'Residual',d:place(rows,y.map((v,i)=>v-f(x[i])),ctx.nrows)}]:[]}});
def('mlr','Fitting','Multiple Linear Regression',[col('y','Dependent (Y)','y'),cols('xs','Independent variables','x'),chk('out','Output predicted & residual columns',true),ALPHA],({y:yi,xs,out,alpha},ctx)=>{
  xs=xs.filter(c=>c!==yi);const Y=ctx.vals(yi),Xs=xs.map(c=>ctx.vals(c)),rows=[],X=[],y=[];
  for(let i=0;i<Y.length;i++)if(Number.isFinite(Y[i])&&Xs.every(c=>Number.isFinite(c[i]))){rows.push(i);y.push(Y[i]);X.push([1,...Xs.map(c=>c[i])])}
  const n=y.length,k=X[0]?.length;if(!k||n<=k)return warn('Not enough complete rows.');const r=Mx.lstsq(X,y);if(!r)return warn('Singular matrix (collinear variables).');
  const s2=r.sse/r.df,se=r.cov.map((row,i)=>Math.sqrt(row[i]*s2)),st=fitStats(y,r.fit,k),Fv=((st.sst-st.sse)/(k-1))/s2;
  return{html:paramTable(['Intercept',...xs.map(c=>ctx.name(c))],r.beta,se,r.df,alpha)+gofTable(st,[['F',F(Fv)],['Prob>F',PV(Mx.fsf(Fv,k-1,r.df))]]),
    cols:out?[{name:'Predicted',d:place(rows,r.fit,ctx.nrows)},{name:'Residual',d:place(rows,y.map((v,i)=>v-r.fit[i]),ctx.nrows)}]:[]}});
def('nlfit','Fitting','Nonlinear Curve Fit',[col('x','X column','x'),col('y','Y column','y'),
  {t:'sel',k:'model',label:'Function',opts:()=>[...Object.entries(MODELS).map(([k,m])=>[k,m.label]),['custom','Custom expression…']],def:'gauss'},
  txt('expr','Custom expression in x (params auto-detected)','a*exp(-b*x)+c'),txt('init','Initial values (e.g. a=1,b=0.5) – optional',''),txt('fix','Fixed parameters (e.g. y0=0) – optional',''),txt('bounds','Bounds name=lo:hi (e.g. A=0:100, w=0:) – optional',''),{t:'sel',k:'wt',label:'Weighting',opts:[['none','None'],['err','1/σ² from error column'],['y','1/y (statistical)'],['y2','1/y²'],['x','1/x'],['x2','1/x²']],def:'none'},{...col('errc','Error column σ (for 1/σ² weighting)','y'),none:true,noneLabel:'(none)',def:-1},chk('band','Add confidence band to graph',false),chk('resid','Output residuals column (+ residual plot)',false),ALPHA],
  ({x:xi,y:yi,model,expr,init,fix,bounds,wt,errc,band,resid,alpha},ctx)=>{
  const{x,y,rows}=sortedPairs(ctx,xi,yi);let names,f,starts,label,eq='';
  if(model==='custom'){
    try{names=Mx.exprParams(expr);const fn=Mx.compile(expr,['x',...names]);f=(v,p)=>fn(v,...p);fn(1,...names.map(()=>1));label='Custom';eq='y = '+expr}catch(e){return warn('Invalid expression: '+e.message)}
    if(!names.length)return warn('Expression has no fit parameters.');starts=[names.map(()=>1)];
  }else{const M=MODELS[model];names=M.names;f=M.f;starts=M.init(x,y);label=M.label.split('  ')[0];eq=M.label.split('  ')[1]||''}
  if(init.trim()){const o=Object.fromEntries(init.split(/[,;]/).map(s=>s.split('=').map(t=>t.trim())).filter(a=>a.length===2));starts=[names.map((n,i)=>o[n]!==undefined?+o[n]:starts[0][i])]}
  const kv=t=>Object.fromEntries((t||'').split(/[,;]/).map(u=>u.split('=').map(w=>w.trim())).filter(q=>q.length===2&&q[0]&&q[1]!==''));
  const fixM=kv(fix),bnd={};Object.entries(kv(bounds)).forEach(([k,v])=>{const [lo,hi]=v.split(':');bnd[k]=[lo===''||lo===undefined?null:+lo,hi===''||hi===undefined?null:+hi]});
  const free=names.map((n,i)=>i).filter(i=>fixM[names[i]]===undefined);
  if(!free.length)return warn('All parameters are fixed.');
  if(x.length<=free.length)return warn('Not enough points for this model.');
  const full=pf=>names.map((n,i)=>{if(fixM[n]!==undefined)return +fixM[n];let v=pf[free.indexOf(i)];const b=bnd[n];if(b){if(b[0]!==null&&v<b[0])v=b[0];if(b[1]!==null&&v>b[1])v=b[1]}return v});
  const f2=(v,pf)=>f(v,full(pf)),st0=starts.map(s0=>free.map(i=>s0[i]));let wv=x.map(()=>1);
  if(wt==='err'){if(!(errc>=0))return warn('Choose an error column for 1/σ² weighting.');const E=ctx.vals(errc);wv=rows.map(r=>1/Math.max(E[r]**2,1e-300))}else if(wt!=='none')wv=x.map((v,i)=>({y:1/Math.max(Math.abs(y[i]),1e-12),y2:1/Math.max(y[i]**2,1e-24),x:1/Math.max(Math.abs(v),1e-12),x2:1/Math.max(v*v,1e-24)})[wt]);
  const swt=wv.map(Math.sqrt),r0=wt==='none'?runFit(f2,st0,x,y):runFit((i,pf)=>swt[i]*f2(x[i],pf),st0,x.map((_,i)=>i),y.map((v,i)=>v*swt[i]));if(!r0)return warn('Fit failed to converge. Try initial values.');
  const pv=full(r0.p),se=names.map((n,i)=>free.includes(i)?r0.se[free.indexOf(i)]:NaN),shown=names.map((n,i)=>free.includes(i)?n:n+' (fixed)');
  const fit=x.map(v=>f(v,pv)),st=fitStats(y,fit,free.length),gx=grid(x[0],x[x.length-1],400),fn=names.filter((_,i)=>free.includes(i));
  return{html:`<div class="eq">${eq||label}</div>`+paramTable(shown,pv,se,r0.dof,alpha)+gofTable(st,[['Iterations',r0.it]])+
    (r0.cov?H('Parameter correlation')+T(['',...fn],fn.map((n,i)=>[n,...fn.map((_,j)=>F(r0.cov[i][j]/Math.sqrt(r0.cov[i][i]*r0.cov[j][j]),3))])):''),
    curves:(()=>{const cu=[{x:gx,y:gx.map(v=>f(v,pv)),label}];if(band&&r0.cov){const tc=Mx.tcrit(alpha,r0.dof),bnd=gx.map(v=>{const g0=free.map((_,j)=>{const h=Math.max(Math.abs(r0.p[j])*1e-6,1e-8),a=r0.p.slice(),b=r0.p.slice();a[j]+=h;b[j]-=h;return(f2(v,a)-f2(v,b))/(2*h)});let q=0;for(let i=0;i<g0.length;i++)for(let j=0;j<g0.length;j++)q+=g0[i]*r0.cov[i][j]*g0[j];return tc*Math.sqrt(Math.max(0,q))});cu.push({x:gx,y:gx.map((v,i)=>f(v,pv)+bnd[i]),label:'Conf. upper',dash:true},{x:gx,y:gx.map((v,i)=>f(v,pv)-bnd[i]),label:'Conf. lower',dash:true})}return cu})(),cols:resid?[{name:'Residual',d:place(rows,y.map((v,i)=>v-fit[i]),ctx.nrows)}]:[],plot:resid?{type:'scatter',series:[[{col:xi},0,'Residuals']],xl:'X',yl:'Residual'}:undefined}});

// ===================== PEAKS & BASELINE =====================
function findPeaks(x,y,thr,minDist=0){
  const n=y.length,rg=Math.max(...y)-Math.min(...y),pk=[];
  for(let i=1;i<n-1;i++){if(!(y[i]>y[i-1]&&y[i]>=y[i+1]))continue;
    let l=i,lm=y[i];while(l>0&&y[l-1]<=y[i]){l--;lm=Math.min(lm,y[l])}
    let r=i,rm=y[i];while(r<n-1&&y[r+1]<=y[i]){r++;rm=Math.min(rm,y[r])}
    const leftBounded=l>0,rightBounded=r<n-1,prom=y[i]-Math.max(leftBounded?lm:-Infinity,rightBounded?rm:-Infinity,(!leftBounded&&!rightBounded)?Math.min(...y):-Infinity);
    if(prom<thr*rg)continue;
    const half=y[i]-prom/2;let a=i;while(a>0&&y[a]>half)a--;let b=i;while(b<n-1&&y[b]>half)b++;
    const xa=y[a]===y[a+1]||a===i?x[a]:x[a]+(half-y[a])/(y[a+1]-y[a])*(x[a+1]-x[a]),xb=b===i||y[b]===y[b-1]?x[b]:x[b-1]+(half-y[b-1])/(y[b]-y[b-1])*(x[b]-x[b-1]);
    pk.push({i,x:x[i],y:y[i],prom,fwhm:Math.abs(xb-xa),left:xa,right:xb})}
  pk.sort((a,b)=>b.prom-a.prom);const keep=[];for(const p of pk)if(!keep.some(q=>Math.abs(q.x-p.x)<minDist))keep.push(p);return keep.sort((a,b)=>a.x-b.x)}
function sgSmooth(x,y,w,ord){const h=Math.floor(w/2);return y.map((_,i)=>Mx.locpoly(x,y,i,h,ord)[0])}
def('peakfind','Peaks & Baseline','Find Peaks',[col('x','X column','x'),col('y','Y column','y'),num('thr','Min prominence (% of range)',5,1),num('smooth','Pre-smoothing window (0 = none)',0,2),num('dist','Min separation in X units',0,0.1)],({x:xi,y:yi,thr,smooth,dist},ctx)=>{
  const{x,y}=sortedPairs(ctx,xi,yi);if(x.length<5)return warn('Not enough data.');
  const ys=smooth>2?sgSmooth(x,y,smooth,2):y,pk=findPeaks(x,ys,thr/100,dist);
  return{html:pk.length?T(['#','Center (x)','Height (y)','Prominence','FWHM','Area (≈)'],pk.map((p,k)=>[k+1,F(p.x),F(p.y),F(p.prom),F(p.fwhm),F(p.prom*p.fwhm*1.0645)])):'<p class="note">No peaks found – lower the prominence threshold.</p>',
    marks:pk.map((p,k)=>({x:p.x,y:p.y,label:String(k+1)}))}});
def('peakfit','Peaks & Baseline','Multi-Peak Fit',[col('x','X column','x'),col('y','Y column','y'),sel('shape','Peak function',[['gauss','Gaussian'],['lorentz','Lorentzian']],'gauss'),num('n','Number of peaks (0 = auto)',0,1),num('thr','Auto min prominence (%)',8,1),ALPHA],({x:xi,y:yi,shape,n,thr,alpha},ctx)=>{
  const{x,y}=sortedPairs(ctx,xi,yi);if(x.length<8)return warn('Not enough data.');
  const ys=sgSmooth(x,y,Math.max(5,Math.floor(x.length/60)*2+1),2);let pk=findPeaks(x,ys,thr/100);if(n>0)pk=pk.sort((a,b)=>b.prom-a.prom).slice(0,n).sort((a,b)=>a.x-b.x);
  if(!pk.length)return warn('No peaks detected – lower the threshold or set the number of peaks.');
  const K=pk.length,g=shape==='gauss',pf=g?(v,A,c,w)=>A*Math.exp(-((v-c)**2)/(2*w*w)):(v,A,c,w)=>A*w*w/((v-c)**2+w*w);
  const f=(v,p)=>{let s=p[0];for(let k=0;k<K;k++)s+=pf(v,p[1+3*k],p[2+3*k],p[3+3*k]);return s};
  const y0=Math.min(...ys),p0=[y0];pk.forEach(p=>p0.push(p.y-y0,p.x,Math.max(p.fwhm,rngx(x)/200)/(g?2.3548:2)));
  const r=Mx.lm(f,p0,x,y,300);if(!r.p.every(Number.isFinite))return warn('Fit failed.');
  const names=['y0'];for(let k=0;k<K;k++)names.push(`A${k+1}`,`xc${k+1}`,`w${k+1}`);r.p.forEach((v,i)=>{if(i>0&&i%3===0)r.p[i]=Math.abs(v)});
  const st=fitStats(y,x.map(v=>f(v,r.p)),r.p.length),gx=grid(x[0],x[x.length-1],600),peaks=[];
  for(let k=0;k<K;k++){const A_=r.p[1+3*k],c=r.p[2+3*k],w=r.p[3+3*k];peaks.push({A:A_,c,w,fwhm:g?2.3548*w:2*w,area:g?A_*w*Math.sqrt(2*Math.PI):A_*Math.PI*w})}
  const tot=Mx.sum(peaks.map(p=>p.area));
  return{html:paramTable(names,r.p,r.se,r.dof,alpha)+H('Peak summary')+T(['Peak','Center','Height','FWHM','Area','Area %'],peaks.map((p,k)=>[k+1,F(p.c),F(p.A),F(p.fwhm),F(p.area),F(p.area/tot*100,4)]))+gofTable(st),
    curves:[{x:gx,y:gx.map(v=>f(v,r.p)),label:'Peak fit'},...peaks.map((p,k)=>({x:gx,y:gx.map(v=>r.p[0]+pf(v,p.A,p.c,p.w)),label:`Peak ${k+1}`,dash:true}))],marks:peaks.map((p,k)=>({x:p.c,y:r.p[0]+p.A,label:String(k+1)}))}});
def('baseline','Peaks & Baseline','Baseline Correction',[col('x','X column','x'),col('y','Y column','y'),sel('m','Method',[['poly','Iterative polynomial (peak-clipping)'],['ends','Linear through endpoints'],['min','Rolling minimum envelope']],'poly'),num('order','Polynomial order / end points / window',3,1)],({x:xi,y:yi,m,order},ctx)=>{
  const{x,y,rows}=sortedPairs(ctx,xi,yi),n=x.length;if(n<5)return warn('Not enough data.');let bl;
  if(m==='poly'){const s=Math.max(...x.map(Math.abs))||1,X=x.map(v=>Array.from({length:order+1},(_,k)=>Math.pow(v/s,k)));let w=[...y];for(let it=0;it<60;it++){const r=Mx.lstsq(X,w);if(!r)return warn('Singular polynomial fit.');bl=r.fit;w=w.map((v,i)=>Math.min(v,bl[i]))}}
  else if(m==='ends'){const k=Math.max(1,Math.min(Math.floor(n/4),Math.round(order))),x0=Mx.mean(x.slice(0,k)),y0=Mx.mean(y.slice(0,k)),x1=Mx.mean(x.slice(n-k)),y1=Mx.mean(y.slice(n-k));bl=x.map(v=>y0+(y1-y0)*(v-x0)/(x1-x0))}
  else{const w=Math.max(3,Math.round(order)*10),h=w>>1,mn=y.map((_,i)=>Math.min(...y.slice(Math.max(0,i-h),i+h+1)));bl=mn.map((_,i)=>{const s=mn.slice(Math.max(0,i-h),i+h+1);return Mx.mean(s)})}
  return{html:`<p>Baseline subtracted using <b>${m}</b> method.</p>`,cols:[{name:'Baseline',d:place(rows,bl,ctx.nrows)},{name:'Corrected',d:place(rows,y.map((v,i)=>v-bl[i]),ctx.nrows)}],curves:[{x,y:bl,label:'Baseline',dash:true}]}});

// ===================== SIGNAL PROCESSING =====================
def('smooth','Signal','Smooth',[col('x','X column','x'),col('y','Y column','y'),sel('m','Method',[['sma','Adjacent averaging'],['sg','Savitzky–Golay'],['gauss','Gaussian'],['median','Median filter'],['lowess','LOESS (local quadratic)'],['fft','FFT low-pass'],['percentile','Percentile filter (order = percentile %)'],['binomial','Binomial']],'sg'),num('w','Window (points)',9,2),num('ord','Polynomial order (S-G)',2,1)],({x:xi,y:yi,m,w,ord},ctx)=>{
  const{x,y,rows}=pairs(ctx,xi,yi),n=y.length,h=Math.max(1,Math.floor(w/2));let o;
  if(m==='sma')o=y.map((_,i)=>Mx.mean(y.slice(Math.max(0,i-h),i+h+1)));
  else if(m==='median')o=y.map((_,i)=>Mx.median(y.slice(Math.max(0,i-h),i+h+1)));
  else if(m==='gauss'){const s=h/2||1;o=y.map((_,i)=>{let a=0,b=0;for(let j=Math.max(0,i-3*h);j<=Math.min(n-1,i+3*h);j++){const k=Math.exp(-((j-i)**2)/(2*s*s));a+=k*y[j];b+=k}return a/b})}
  else if(m==='lowess')o=y.map((_,i)=>{const lo=Math.max(0,i-h),hi=Math.min(n-1,i+h),d=Math.max(Math.abs(x[lo]-x[i]),Math.abs(x[hi]-x[i]))||1;const X=[],Y=[],W=[];
    for(let j=lo;j<=hi;j++){const u=Math.abs(x[j]-x[i])/d,wt=Math.pow(1-u**3,3)||1e-6;W.push(Math.sqrt(wt));X.push([1,x[j]-x[i],(x[j]-x[i])**2].map(v=>v*Math.sqrt(wt)));Y.push(y[j]*Math.sqrt(wt))}
    const r=Mx.lstsq(X.map(r=>r.map((v,k)=>v)),Y);return r?r.beta[0]:y[i]});
  else if(m==='percentile')o=y.map((_,i)=>Mx.quantile(Mx.sorted(y.slice(Math.max(0,i-h),i+h+1)),Math.min(1,Math.max(0,ord/100))));
  else if(m==='binomial'){const K=Math.max(1,Math.round(w))-1,wt=[1];for(let k=0;k<K;k++){const nx=[1];for(let j=1;j<wt.length;j++)nx.push(wt[j-1]+wt[j]);nx.push(1);wt.splice(0,wt.length,...nx)}const ws=Mx.sum(wt),hh=Math.floor(wt.length/2);o=y.map((_,i)=>{let a=0,b=0;for(let j=0;j<wt.length;j++){const q=Math.min(n-1,Math.max(0,i+j-hh));a+=wt[j]*y[q];b+=wt[j]}return a/b})}
  else if(m==='fft'){const N=Mx.pow2(2*n),pad=[...y,...y.slice().reverse()],f=Mx.fft(Float64Array.from([...pad,...new Array(N-pad.length).fill(0)]),new Float64Array(N)),cut=Math.max(1,Math.floor(N/(2*Math.max(2,w))));for(let k=0;k<N;k++){const kk=k<=N/2?k:N-k;if(kk>cut){f.re[k]=0;f.im[k]=0}}o=Array.from(Mx.ifft(f.re,f.im).re).slice(0,n)}
  else o=sgSmooth(x,y,w,ord);
  return{html:`<p>Smoothed with ${m} (window ${w}).</p>`,cols:[{name:ctx.name(yi,true)+'_smooth',d:place(rows,o,ctx.nrows)}]}});
def('fft','Signal','FFT (Spectrum)',[col('x','X (time) column — optional spacing','x'),col('y','Signal column','y'),sel('win','Window',[['none','None'],['hann','Hann'],['hamming','Hamming'],['blackman','Blackman']],'hann'),chk('detrend','Remove mean',true)],({x:xi,y:yi,win,detrend},ctx)=>{
  const y=Mx.clean(ctx.vals(yi)),X=Mx.clean(ctx.vals(xi)),n=y.length;if(n<8)return warn('Need at least 8 points.');
  const d=[];for(let i=1;i<X.length;i++)d.push(X[i]-X[i-1]);const dt=xi!==yi&&d.length?Mx.median(d):1,m=detrend?Mx.mean(y):0;
  const W=Array.from({length:n},(_,i)=>win==='hann'?.5-.5*Math.cos(2*Math.PI*i/(n-1)):win==='hamming'?.54-.46*Math.cos(2*Math.PI*i/(n-1)):win==='blackman'?.42-.5*Math.cos(2*Math.PI*i/(n-1))+.08*Math.cos(4*Math.PI*i/(n-1)):1),sw=Mx.sum(W);
  const N=Mx.pow2(n),re=new Float64Array(N);y.forEach((v,i)=>re[i]=(v-m)*W[i]);const{re:R,im:I}=Mx.fft(re),half=N/2,fr=[],am=[],po=[],ph=[];
  for(let k=0;k<=half;k++){const mag=Math.hypot(R[k],I[k]);fr.push(k/(N*dt));am.push((k===0||k===half?1:2)*mag/sw);po.push(mag*mag/(sw*sw));ph.push(Math.atan2(I[k],R[k]))}
  let kmax=1;for(let k=1;k<=half;k++)if(am[k]>am[kmax])kmax=k;
  return{html:KV([['Samples',n],['Sample spacing Δt',F(dt)],['FFT length',N],['Frequency resolution',F(1/(N*dt))],['Nyquist frequency',F(1/(2*dt))],['Dominant frequency',F(fr[kmax])],['Dominant period',F(1/fr[kmax])]]),
    cols:[{name:'Frequency',d:fr,des:'X'},{name:'Amplitude',d:am},{name:'Power',d:po},{name:'Phase',unit:'rad',d:ph}]}});
def('filter','Signal','FIR Filter (Low/High/Band-pass)',[col('x','X (time) column','x'),col('y','Signal column','y'),sel('type','Filter type',[['lp','Low-pass'],['hp','High-pass'],['bp','Band-pass'],['bs','Band-stop']],'lp'),num('f1','Cutoff 1 (frequency units)',1,0.1),num('f2','Cutoff 2 (band filters)',2,0.1),num('taps','Filter taps (odd)',51,2)],({x:xi,y:yi,type,f1,f2,taps},ctx)=>{
  const{x,y,rows}=pairs(ctx,xi,yi),d=[];for(let i=1;i<x.length;i++)d.push(x[i]-x[i-1]);const dt=Mx.median(d),fs=1/dt,N=Math.max(3,Math.round(taps)|1),M=(N-1)/2;
  const lp=fc=>{const c=fc/fs;return Array.from({length:N},(_,i)=>{const t=i-M;return(t===0?2*c:Math.sin(2*Math.PI*c*t)/(Math.PI*t))*(.54-.46*Math.cos(2*Math.PI*i/(N-1)))})},nm=h=>{const s=Mx.sum(h);return h.map(v=>v/s)};
  let h;const lo=Math.min(f1,f2),hi=Math.max(f1,f2);if(type==='lp')h=nm(lp(f1));else if(type==='hp'){h=nm(lp(f1)).map(v=>-v);h[M]+=1}else{const a=lp(hi),b=lp(lo);h=a.map((v,i)=>v-b[i]);if(type==='bs'){h=h.map(v=>-v);h[M]+=1}}
  if(f1>=fs/2||f2>=fs/2&&(type==='bp'||type==='bs'))return warn(`Cutoff must be below the Nyquist frequency (${F(fs/2)}).`);
  const o=y.map((_,i)=>{let s=0;for(let k=0;k<N;k++){let j=i+k-M;j=j<0?0:j>=y.length?y.length-1:j;s+=h[k]*y[j]}return s});
  return{html:KV([['Sampling frequency',F(fs)],['Nyquist',F(fs/2)],['Taps',N],['Window','Hamming'],['Phase','zero-phase (symmetric)']]),cols:[{name:ctx.name(yi,true)+'_'+type,d:place(rows,o,ctx.nrows)}]}});
def('deriv','Signal','Differentiate',[col('x','X column','x'),col('y','Y column','y'),sel('ord','Order',[['1','First derivative'],['2','Second derivative']],'1'),num('w','Smoothing window (S-G, 0 = finite differences)',0,2)],({x:xi,y:yi,ord,w},ctx)=>{
  const{x,y,rows}=sortedPairs(ctx,xi,yi),n=x.length;let o;
  if(w>=5)o=y.map((_,i)=>{const c=Mx.locpoly(x,y,i,Math.floor(w/2),Math.max(2,+ord+1));return ord==='1'?c[1]:2*(c[2]||0)});
  else if(ord==='1')o=y.map((_,i)=>{const a=Math.max(0,i-1),b=Math.min(n-1,i+1);return(y[b]-y[a])/(x[b]-x[a])});
  else o=y.map((_,i)=>{if(i===0||i===n-1)return NaN;const h1=x[i]-x[i-1],h2=x[i+1]-x[i];return 2*((y[i+1]-y[i])/h2-(y[i]-y[i-1])/h1)/(h1+h2)});
  return{html:`<p>${ord==='1'?'First':'Second'} derivative computed.</p>`,cols:[{name:`d${ord==='2'?'²':''}${ctx.name(yi,true)}/dx${ord==='2'?'²':''}`,d:place(rows,o,ctx.nrows)}]}});
def('integ','Signal','Integrate (Area under curve)',[col('x','X column','x'),col('y','Y column','y'),txt('from','From X (blank = start)',''),txt('to','To X (blank = end)','')],({x:xi,y:yi,from,to},ctx)=>{
  const{x,y,rows}=sortedPairs(ctx,xi,yi);let acc=0;const cum=x.map((_,i)=>i?(acc+=(y[i]+y[i-1])/2*(x[i]-x[i-1])):0);
  const a=from===''?-Infinity:+from,b=to===''?Infinity:+to;let area=0,abs=0;for(let i=1;i<x.length;i++)if(x[i-1]>=a&&x[i]<=b){const s=(y[i]+y[i-1])/2*(x[i]-x[i-1]);area+=s;abs+=Math.abs(s)}
  return{html:KV([['Integration range',`${F(Math.max(a,x[0]))} … ${F(Math.min(b,x[x.length-1]))}`],['Area (trapezoid)',F(area)],['Absolute area',F(abs)],['Peak max y',F(Math.max(...y))]]),cols:[{name:'Cumulative integral',d:place(rows,cum,ctx.nrows)}]}});
def('interp','Signal','Interpolate / Resample',[col('x','X column','x'),col('y','Y column','y'),sel('m','Method',[['linear','Linear'],['spline','Cubic spline']],'spline'),num('n','Number of output points',200,10)],({x:xi,y:yi,m,n},ctx)=>{
  let{x,y}=sortedPairs(ctx,xi,yi);const ux=[],uy=[];x.forEach((v,i)=>{if(!ux.length||v>ux[ux.length-1]){ux.push(v);uy.push(y[i])}});if(ux.length<3)return warn('Need at least 3 distinct X values.');
  const f=m==='spline'?Mx.spline(ux,uy):Mx.linterp(ux,uy),gx=grid(ux[0],ux[ux.length-1],Math.max(2,Math.round(n))-1);
  return{html:`<p>${gx.length} points interpolated (${m}).</p>`,cols:[{name:'Interp X',d:gx,des:'X'},{name:'Interp Y',d:gx.map(f)}]}});
def('normalize','Signal','Normalize / Rescale',[col('y','Column','y'),sel('m','Method',[['minmax','Min–max (0 to 1)'],['max','Divide by maximum'],['z','Z-score'],['area','Unit area (needs X)'],['center','Subtract mean']],'minmax'),col('x','X column (for area)','x')],({y:yi,m,x:xi},ctx)=>{
  const v=ctx.vals(yi),c=Mx.clean(v);let f;const lo=Math.min(...c),hi=Math.max(...c),mu=Mx.mean(c),sd=Mx.sd(c);
  if(m==='minmax')f=a=>(a-lo)/(hi-lo||1);else if(m==='max')f=a=>a/hi;else if(m==='z')f=a=>(a-mu)/sd;else if(m==='center')f=a=>a-mu;
  else{const{x,y}=sortedPairs(ctx,xi,yi);let s=0;for(let i=1;i<x.length;i++)s+=(y[i]+y[i-1])/2*(x[i]-x[i-1]);f=a=>a/s}
  return{html:`<p>Normalized (${m}).</p>`,cols:[{name:ctx.name(yi,true)+'_norm',d:v.map(a=>Number.isFinite(a)?f(a):NaN)}]}});

// ===================== MULTIVARIATE / DATA =====================
def('hist','Multivariate','Frequency Counts (Histogram data)',[col('y','Data column','y'),num('bins','Number of bins (0 = Sturges)',0,1)],({y,bins},ctx)=>{
  const v=Mx.clean(ctx.vals(y)),n=v.length,k=bins>0?Math.round(bins):Math.ceil(Math.log2(n)+1),lo=Math.min(...v),hi=Math.max(...v),w=(hi-lo)/k||1,cnt=new Array(k).fill(0);
  v.forEach(a=>cnt[Math.min(k-1,Math.floor((a-lo)/w))]++);let c=0;const cum=cnt.map(q=>(c+=q)/n*100);
  return{html:KV([['N',n],['Bins',k],['Bin width',F(w)],['Mode bin center',F(lo+(cnt.indexOf(Math.max(...cnt))+.5)*w)]]),cols:[{name:'Bin Center',d:cnt.map((_,i)=>lo+(i+.5)*w),des:'X'},{name:'Count',d:cnt},{name:'Cumulative %',d:cum}]}});
def('pca','Multivariate','Principal Component Analysis',[cols('cols','Variables','y'),chk('std','Standardize (use correlation matrix)',true)],({cols:cs,std},ctx)=>{
  const V=cs.map(c=>ctx.vals(c)),rows=[];for(let i=0;i<Math.max(...V.map(a=>a.length));i++)if(V.every(a=>Number.isFinite(a[i])))rows.push(i);
  const k=cs.length,n=rows.length;if(k<2||n<k)return warn('Need at least 2 variables and enough complete rows.');
  const mu=V.map(a=>Mx.mean(rows.map(i=>a[i]))),sd=V.map((a,j)=>std?Mx.sd(rows.map(i=>a[i]))||1:1),Z=rows.map(i=>V.map((a,j)=>(a[i]-mu[j])/sd[j]));
  const C=Array.from({length:k},(_,a)=>Array.from({length:k},(_,b)=>Z.reduce((s,r)=>s+r[a]*r[b],0)/(n-1))),e=Mx.jacobi(C),tot=Mx.sum(e.vals);let acc=0;
  const scores=e.vecs.map(vec=>Z.map(r=>r.reduce((s,v,j)=>s+v*vec[j],0)));
  return{html:H('Eigenvalues')+T(['PC','Eigenvalue','% Variance','Cumulative %'],e.vals.map((v,i)=>[`PC${i+1}`,F(v),F(v/tot*100,4),F((acc+=v)/tot*100,4)]))+H('Loadings (eigenvectors)')+T(['Variable',...e.vals.map((_,i)=>'PC'+(i+1))],cs.map((c,j)=>[ctx.name(c),...e.vecs.map(v=>F(v[j],4))])),
    cols:[...scores.slice(0,Math.min(k,4)).map((s,i)=>({name:`PC${i+1}`,d:place(rows,s,ctx.nrows)})),{name:'Component #',d:e.vals.map((_,i)=>i+1),des:'X'},{name:'Eigenvalue',d:e.vals}],plot:{type:'linesym',series:[[Math.min(k,4),Math.min(k,4)+1,'Scree plot']],xl:'Component',yl:'Eigenvalue'}}});
def('kmeans','Multivariate','K-Means Clustering',[cols('cols','Variables','y'),num('k','Number of clusters',3,1),chk('std','Standardize',true)],({cols:cs,k,std},ctx)=>{
  const V=cs.map(c=>ctx.vals(c)),rows=[];for(let i=0;i<Math.max(...V.map(a=>a.length));i++)if(V.every(a=>Number.isFinite(a[i])))rows.push(i);
  k=Math.round(k);const n=rows.length;if(n<k||k<1)return warn('Not enough rows for that many clusters.');
  const mu=V.map(a=>Mx.mean(rows.map(i=>a[i]))),sd=V.map(a=>std?Mx.sd(rows.map(i=>a[i]))||1:1),P=rows.map(i=>V.map((a,j)=>(a[i]-mu[j])/sd[j]));
  let seed=12345;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647,d2=(a,b)=>a.reduce((s,v,j)=>s+(v-b[j])**2,0);
  let C=[P[Math.floor(rnd()*n)]];while(C.length<k){const D=P.map(p=>Math.min(...C.map(c=>d2(p,c)))),tot=Mx.sum(D);let r=rnd()*tot,i=0;while(i<n-1&&(r-=D[i])>0)i++;C.push(P[i])}
  let lab=new Array(n).fill(0);for(let it=0;it<100;it++){let ch=false;P.forEach((p,i)=>{let b=0,bd=Infinity;C.forEach((c,q)=>{const d=d2(p,c);if(d<bd){bd=d;b=q}});if(lab[i]!==b){lab[i]=b;ch=true}});
    C=C.map((c,q)=>{const m=P.filter((_,i)=>lab[i]===q);return m.length?c.map((_,j)=>Mx.mean(m.map(p=>p[j]))):c});if(!ch)break}
  const wss=Mx.sum(P.map((p,i)=>d2(p,C[lab[i]])));
  return{html:KV([['Clusters',k],['Observations',n],['Within-cluster SS',F(wss)]])+T(['Cluster','Size',...cs.map(c=>ctx.name(c))],C.map((c,q)=>[q+1,lab.filter(l=>l===q).length,...c.map((v,j)=>F(v*sd[j]+mu[j]))])),cols:[{name:'Cluster',d:place(rows,lab.map(l=>l+1),ctx.nrows)}]}});
def('xyz2mat','Multivariate','Convert XYZ to Matrix (IDW gridding)',[col('x','X column','x'),col('y','Y column','y'),col('z','Z column','y'),num('nx','Columns (X points)',40,1),num('ny','Rows (Y points)',40,1),num('pw','IDW power',2,0.5)],({x:xi,y:yi,z:zi,nx,ny,pw},ctx)=>{
  const X=ctx.vals(xi),Y=ctx.vals(yi),Z=ctx.vals(zi),P=[];for(let i=0;i<X.length;i++)if(Number.isFinite(X[i])&&Number.isFinite(Y[i])&&Number.isFinite(Z[i]))P.push([X[i],Y[i],Z[i]]);
  if(P.length<3)return warn('Need at least 3 XYZ triplets.');nx=Math.max(2,Math.round(nx));ny=Math.max(2,Math.round(ny));
  const x0=Math.min(...P.map(p=>p[0])),x1=Math.max(...P.map(p=>p[0])),y0=Math.min(...P.map(p=>p[1])),y1=Math.max(...P.map(p=>p[1])),xv=grid(x0,x1,nx-1),yv=grid(y0,y1,ny-1);
  const mat=xv.map(gx=>yv.map(gy=>{let a=0,b=0;for(const p of P){const d=Math.hypot(p[0]-gx,p[1]-gy);if(d<1e-12)return p[2];const w=1/d**pw;a+=w*p[2];b+=w}return a/b}));
  return{html:`<p>Matrix ${ny} × ${nx} created in a new sheet from ${P.length} points.</p>`,sheet:{name:'Matrix',isMatrix:true,xv,yv,cols:mat.map((c,j)=>({name:F(xv[j],4),d:c}))}}});
