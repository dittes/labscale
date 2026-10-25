'use strict';
// Numerical core: descriptive stats, special functions, distributions, linear algebra, FFT, splines, Levenberg-Marquardt.
const Mx={};
Mx.sum=a=>{let s=0;for(const v of a)s+=v;return s};
Mx.mean=a=>a.length?Mx.sum(a)/a.length:NaN;
Mx.variance=a=>{const n=a.length;if(n<2)return NaN;const m=Mx.mean(a);let s=0;for(const v of a)s+=(v-m)*(v-m);return s/(n-1)};
Mx.sd=a=>Math.sqrt(Mx.variance(a));
Mx.clean=a=>Array.from(a).filter(Number.isFinite);
Mx.sorted=a=>Float64Array.from(a).sort();
Mx.quantile=(s,q)=>{if(!s.length)return NaN;const p=(s.length-1)*q,b=Math.floor(p);return s[b]+(s[Math.min(b+1,s.length-1)]-s[b])*(p-b)};
Mx.median=a=>Mx.quantile(Mx.sorted(a),.5);
Mx.min=a=>{let m=Infinity;for(const v of a)if(v<m)m=v;return m};
Mx.max=a=>{let m=-Infinity;for(const v of a)if(v>m)m=v;return m};
Mx.rank=a=>{ // average ranks for ties, returns ranks + tie-term sum(t^3-t)
  const idx=a.map((v,i)=>i).sort((i,j)=>a[i]-a[j]),r=new Array(a.length);let tie=0;
  for(let i=0;i<idx.length;){let j=i;while(j+1<idx.length&&a[idx[j+1]]===a[idx[i]])j++;const rk=(i+j)/2+1;for(let k=i;k<=j;k++)r[idx[k]]=rk;const t=j-i+1;tie+=t*t*t-t;i=j+1}
  return{r,tie};
};
Mx.skew=a=>{const n=a.length;if(n<3)return NaN;const m=Mx.mean(a),s=Mx.sd(a);return n/((n-1)*(n-2))*Mx.sum(a.map(v=>((v-m)/s)**3))};
Mx.kurt=a=>{const n=a.length;if(n<4)return NaN;const m=Mx.mean(a),s=Mx.sd(a);return n*(n+1)/((n-1)*(n-2)*(n-3))*Mx.sum(a.map(v=>((v-m)/s)**4))-3*(n-1)**2/((n-2)*(n-3))};

// ---- special functions ----
const LG=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
Mx.gammaln=x=>{if(x<.5)return Math.log(Math.PI/Math.abs(Math.sin(Math.PI*x)))-Mx.gammaln(1-x);x-=1;let a=LG[0];const t=x+7.5;for(let i=1;i<9;i++)a+=LG[i]/(x+i);return .5*Math.log(2*Math.PI)+(x+.5)*Math.log(t)-t+Math.log(a)};
Mx.gamma=x=>Math.exp(Mx.gammaln(x))*(x<0&&Math.floor(x)%2?-1:1);
function betacf(a,b,x){const F=1e-300;const qab=a+b,qap=a+1,qam=a-1;let c=1,d=1-qab*x/qap;if(Math.abs(d)<F)d=F;d=1/d;let h=d;
  for(let m=1;m<=300;m++){const m2=2*m;let aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<F)d=F;c=1+aa/c;if(Math.abs(c)<F)c=F;d=1/d;h*=d*c;
    aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<F)d=F;c=1+aa/c;if(Math.abs(c)<F)c=F;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<3e-15)break}return h}
Mx.betai=(a,b,x)=>{if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(Mx.gammaln(a+b)-Mx.gammaln(a)-Mx.gammaln(b)+a*Math.log(x)+b*Math.log(1-x));return x<(a+1)/(a+b+2)?bt*betacf(a,b,x)/a:1-bt*betacf(b,a,1-x)/b};
Mx.gammp=(a,x)=>{if(x<=0)return 0;const gln=Mx.gammaln(a);
  if(x<a+1){let ap=a,sum=1/a,del=sum;for(let n=0;n<1000;n++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*1e-16)break}return sum*Math.exp(-x+a*Math.log(x)-gln)}
  let b=x+1-a,c=1e300,d=1/b,h=d;for(let i=1;i<1000;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<1e-15)break}
  return 1-Math.exp(-x+a*Math.log(x)-gln)*h};
Mx.erf=x=>x<0?-Mx.gammp(.5,x*x):Mx.gammp(.5,x*x);
Mx.normcdf=z=>.5*(1+Mx.erf(z/Math.SQRT2));
Mx.norminv=p=>{ // Acklam
  if(p<=0)return-Infinity;if(p>=1)return Infinity;
  const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],
  b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572],
  c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],
  d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
  let q,r;if(p<.02425){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  if(p>1-.02425){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  q=p-.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)};
Mx.tcdf=(t,df)=>{const p=.5*Mx.betai(df/2,.5,df/(df+t*t));return t>0?1-p:p};
Mx.tp2=(t,df)=>Mx.betai(df/2,.5,df/(df+t*t)); // two-sided p
Mx.tinv=(p,df)=>{let lo=-1e4,hi=1e4;for(let i=0;i<200;i++){const m=(lo+hi)/2;if(Mx.tcdf(m,df)<p)lo=m;else hi=m}return(lo+hi)/2};
Mx.tcrit=(alpha,df)=>Mx.tinv(1-alpha/2,df);
Mx.fsf=(f,d1,d2)=>f<=0?1:Mx.betai(d2/2,d1/2,d2/(d2+d1*f));
Mx.chi2sf=(x,k)=>x<=0?1:1-Mx.gammp(k/2,x/2);

// ---- linear algebra ----
Mx.solve=(A,b)=>{const n=b.length,M=A.map((r,i)=>[...r,b[i]]);
  for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r;if(Math.abs(M[p][i])<1e-300)return null;[M[i],M[p]]=[M[p],M[i]];
    for(let r=i+1;r<n;r++){const f=M[r][i]/M[i][i];for(let c=i;c<=n;c++)M[r][c]-=f*M[i][c]}}
  const x=Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=M[i][n];for(let c=i+1;c<n;c++)s-=M[i][c]*x[c];x[i]=s/M[i][i]}return x};
Mx.inv=A=>{const n=A.length,M=A.map((r,i)=>[...r,...Array.from({length:n},(_,j)=>+(i===j))]);
  for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r;if(Math.abs(M[p][i])<1e-300)return null;[M[i],M[p]]=[M[p],M[i]];
    const d=M[i][i];for(let c=0;c<2*n;c++)M[i][c]/=d;
    for(let r=0;r<n;r++)if(r!==i){const f=M[r][i];if(f)for(let c=0;c<2*n;c++)M[r][c]-=f*M[i][c]}}
  return M.map(r=>r.slice(n))};
// least squares y ~ X*beta ; X is array of rows
Mx.lstsq=(X,y)=>{const n=X.length,k=X[0].length;
  const A=Array.from({length:k},(_,i)=>Array.from({length:k},(_,j)=>{let s=0;for(let r=0;r<n;r++)s+=X[r][i]*X[r][j];return s}));
  const b=Array.from({length:k},(_,i)=>{let s=0;for(let r=0;r<n;r++)s+=X[r][i]*y[r];return s});
  const Ai=Mx.inv(A);if(!Ai)return null;const beta=Ai.map(row=>row.reduce((s,v,j)=>s+v*b[j],0));
  const fit=X.map(r=>r.reduce((s,v,j)=>s+v*beta[j],0));let sse=0;for(let i=0;i<n;i++)sse+=(y[i]-fit[i])**2;
  return{beta,cov:Ai,fit,sse,df:n-k};};
Mx.jacobi=S=>{ // eigen decomposition of symmetric matrix
  const n=S.length,A=S.map(r=>[...r]),V=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
  for(let sweep=0;sweep<100;sweep++){let off=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)off+=A[i][j]**2;if(off<1e-22)break;
    for(let p=0;p<n;p++)for(let q=p+1;q<n;q++){if(Math.abs(A[p][q])<1e-300)continue;
      const th=(A[q][q]-A[p][p])/(2*A[p][q]),t=Math.sign(th||1)/(Math.abs(th)+Math.sqrt(th*th+1)),c=1/Math.sqrt(t*t+1),s=t*c;
      for(let k=0;k<n;k++){const a=A[k][p],b=A[k][q];A[k][p]=c*a-s*b;A[k][q]=s*a+c*b}
      for(let k=0;k<n;k++){const a=A[p][k],b=A[q][k];A[p][k]=c*a-s*b;A[q][k]=s*a+c*b}
      for(let k=0;k<n;k++){const a=V[k][p],b=V[k][q];V[k][p]=c*a-s*b;V[k][q]=s*a+c*b}}}
  const ord=A.map((_,i)=>i).sort((i,j)=>A[j][j]-A[i][i]);
  return{vals:ord.map(i=>A[i][i]),vecs:ord.map(i=>V.map(r=>r[i]))}};

// ---- FFT (radix-2) ----
Mx.fft=(re,im)=>{const n=re.length;re=Float64Array.from(re);im=Float64Array.from(im||new Float64Array(n));
  for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
  for(let len=2;len<=n;len<<=1){const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang);
    for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const a=i+k,b=i+k+len/2,tr=re[b]*cr-im[b]*ci,ti=re[b]*ci+im[b]*cr;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr}}}
  return{re,im}};
Mx.pow2=n=>{let p=1;while(p<n)p<<=1;return p};

// ---- interpolation ----
Mx.spline=(x,y)=>{ // natural cubic spline; x ascending
  const n=x.length,h=[],al=[],l=[1],mu=[0],z=[0],c=new Array(n).fill(0),b=[],d=[];
  for(let i=0;i<n-1;i++)h[i]=x[i+1]-x[i];
  for(let i=1;i<n-1;i++)al[i]=3/h[i]*(y[i+1]-y[i])-3/h[i-1]*(y[i]-y[i-1]);
  for(let i=1;i<n-1;i++){l[i]=2*(x[i+1]-x[i-1])-h[i-1]*mu[i-1];mu[i]=h[i]/l[i];z[i]=(al[i]-h[i-1]*z[i-1])/l[i]}
  for(let j=n-2;j>=0;j--){c[j]=z[j]-mu[j]*c[j+1];b[j]=(y[j+1]-y[j])/h[j]-h[j]*(c[j+1]+2*c[j])/3;d[j]=(c[j+1]-c[j])/(3*h[j])}
  return q=>{let i=Math.max(0,Math.min(n-2,Mx.bsearch(x,q)));const t=q-x[i];return y[i]+b[i]*t+c[i]*t*t+d[i]*t*t*t}};
Mx.bsearch=(x,q)=>{let lo=0,hi=x.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(x[m]<=q)lo=m;else hi=m}return lo};
Mx.linterp=(x,y)=>q=>{const n=x.length;if(n===1)return y[0];const i=Math.max(0,Math.min(n-2,Mx.bsearch(x,q)));return y[i]+(y[i+1]-y[i])*(q-x[i])/(x[i+1]-x[i])};

// local polynomial fit around index i (x may be non-uniform). returns coefficients in (x-x[i]).
Mx.locpoly=(x,y,i,half,order)=>{
  const lo=Math.max(0,i-half),hi=Math.min(x.length-1,i+half),k=Math.min(order,hi-lo),X=[],Y=[];
  for(let j=lo;j<=hi;j++){const t=x[j]-x[i],row=[];for(let p=0;p<=k;p++)row.push(Math.pow(t,p));X.push(row);Y.push(y[j])}
  const r=Mx.lstsq(X,Y);return r?r.beta:[y[i],0,0]};

// ---- expression compiler for user-defined functions ----
Mx.ALIAS={ln:Math.log,log:Math.log10,sgn:Math.sign,pi:Math.PI,e:Math.E,erf:Mx.erf,gamma:Mx.gamma,gammaln:Mx.gammaln,normcdf:Mx.normcdf,step:v=>v>=0?1:0,sinc:v=>v===0?1:Math.sin(Math.PI*v)/(Math.PI*v)};
const MATHN=Object.getOwnPropertyNames(Math).filter(n=>!(n in Mx.ALIAS)&&/^[a-z]/i.test(n)&&typeof Math[n]!=='undefined');
Mx.compile=(expr,vars)=>{
  const src=expr.replace(/\^/g,'**');
  const aliasN=Object.keys(Mx.ALIAS);
  const fn=new Function(...MATHN,...aliasN,...vars,`return (${src});`);
  const base=[...MATHN.map(n=>Math[n]),...aliasN.map(n=>Mx.ALIAS[n])];
  return(...v)=>fn(...base,...v);
};
Mx.exprParams=expr=>{
  const reserved=new Set([...MATHN,...Object.keys(Mx.ALIAS),'x','Math']);const out=[];
  expr=expr.replace(/\d+\.?\d*(e[+-]?\d+)?|\.\d+/gi,'0');
  for(const m of expr.matchAll(/[A-Za-z_]\w*(?!\w)\s*(\()?/g)){const nm=m[0].replace(/\s*\($/,'').trim();if(m[1]||reserved.has(nm)||out.includes(nm))continue;out.push(nm)}
  return out};

// ---- Levenberg-Marquardt ----
Mx.lm=(f,p0,x,y,iters=500)=>{
  let p=[...p0],lam=1e-3;const n=x.length,k=p.length;
  const cost=q=>{let s=0;for(let i=0;i<n;i++){const e=y[i]-f(x[i],q);s+=e*e}return Number.isFinite(s)?s:Infinity};
  let c=cost(p),it=0;
  const jac=q=>x.map(xi=>q.map((pj,j)=>{const h=Math.max(1e-8,Math.abs(pj)*1e-6),qq=[...q];qq[j]+=h;return(f(xi,qq)-f(xi,q))/h}));
  for(;it<iters;it++){
    const J=jac(p),r=x.map((xi,i)=>y[i]-f(xi,p));
    const A=Array.from({length:k},(_,i)=>Array.from({length:k},(_,j)=>{let s=0;for(let m=0;m<n;m++)s+=J[m][i]*J[m][j];return s}));
    const g=Array.from({length:k},(_,i)=>{let s=0;for(let m=0;m<n;m++)s+=J[m][i]*r[m];return s});
    let ok=false,done=false;
    for(let t=0;t<14;t++){
      const Ad=A.map((row,i)=>row.map((v,j)=>i===j?v+lam*(v||1)+1e-14:v)),d=Mx.solve(Ad,g);
      if(!d){lam*=10;continue}
      const q=p.map((v,i)=>v+d[i]),cq=cost(q);
      if(cq<c){const rel=(c-cq)/(c||1);p=q;c=cq;lam=Math.max(lam/5,1e-12);ok=true;if(rel<1e-13)done=true;break}
      lam*=5}
    if(!ok||done)break}
  // covariance
  let cov=null,se=p.map(()=>NaN);
  try{const J=jac(p),A=Array.from({length:k},(_,i)=>Array.from({length:k},(_,j)=>{let s=0;for(let m=0;m<n;m++)s+=J[m][i]*J[m][j];return s})),Ai=Mx.inv(A);
    if(Ai&&n>k){const s2=c/(n-k);cov=Ai.map(r=>r.map(v=>v*s2));se=cov.map((r,i)=>Math.sqrt(Math.abs(r[i])))}}catch(e){}
  return{p,c,it,cov,se,dof:n-k};
};

// ---- number formatting ----
Mx.fmt=(v,p=6)=>{if(v===null||v===undefined||!Number.isFinite(v))return Number.isNaN(v)||v===undefined||v===null?'—':(v>0?'∞':'-∞');
  const a=Math.abs(v);if(a!==0&&(a>=1e7||a<1e-4))return v.toExponential(Math.max(p-1,1));return String(+v.toPrecision(p))};
Mx.fmtP=p=>!Number.isFinite(p)?'—':p<1e-4?'<0.0001':Mx.fmt(p,4);

// ---- studentized range (Tukey HSD) ----
Mx.fastPhi=z=>{const x=Math.abs(z)/Math.SQRT2,t=1/(1+0.3275911*x),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return z>=0?.5*(1+y):.5*(1-y)};
Mx.ptukey=(q,k,df)=>{
  if(!(q>0))return 0;
  const W=qq=>{const N=160,a=-8,h=16/N;let s=0;for(let i=0;i<=N;i++){const z=a+i*h,d=Math.max(0,Mx.fastPhi(z)-Mx.fastPhi(z-qq));s+=Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)*Math.pow(d,k-1)*(i===0||i===N?1:i%2?4:2)}return k*s*h/3};
  if(df>=1500)return Math.min(1,W(q));
  const lc=Math.log(2)+(df/2)*Math.log(df/2)-Mx.gammaln(df/2),sd=1/Math.sqrt(2*df),lo=Math.max(1e-4,1-8*sd),hi=1+8*sd,N=160,h=(hi-lo)/N;let s=0;
  for(let i=0;i<=N;i++){const t=lo+i*h,f=Math.exp(lc+(df-1)*Math.log(t)-df*t*t/2);s+=f*W(q*t)*(i===0||i===N?1:i%2?4:2)}
  return Math.min(1,s*h/3)};

// ---- dates (stored as UTC milliseconds) ----
Mx.parseDate=str=>{str=String(str).trim();let m,y,mo,d,h=0,mi=0,se=0;
  if((m=str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?\s*Z?$/))){y=+m[1];mo=+m[2];d=+m[3];h=+(m[4]||0);mi=+(m[5]||0);se=+(m[6]||0)}
  else if((m=str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/))){d=+m[1];mo=+m[2];y=+m[3];h=+(m[4]||0);mi=+(m[5]||0);se=+(m[6]||0)}
  else return NaN;
  if(mo<1||mo>12||d<1||d>31||h>23||mi>59||se>59)return NaN;const t=Date.UTC(y,mo-1,d,h,mi,se);return new Date(t).getUTCDate()===d?t:NaN};
Mx.formatDate=ms=>{if(!Number.isFinite(ms))return'';const d=new Date(ms),p=n=>String(n).padStart(2,'0'),day=`${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())}`;
  if(ms%864e5===0)return day;return`${day} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}${ms%6e4?':'+p(d.getUTCSeconds()):''}`};
const formatDate=Mx.formatDate,parseDate=Mx.parseDate;

// ---- Dunnett multiple-comparison distribution ----
Mx.pdunnett=(t,m,df,rho)=>{if(!(t>0))return 0;const sr=Math.sqrt(rho),sq=Math.sqrt(1-rho);
  const inner=ts=>{const N=120,h=16/N;let s=0;for(let i=0;i<=N;i++){const z=-8+i*h,p=Mx.fastPhi((ts-sr*z)/sq)-Mx.fastPhi((-ts-sr*z)/sq);s+=Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)*Math.pow(Math.max(0,p),m)*(i===0||i===N?1:i%2?4:2)}return s*h/3};
  if(df>=1500)return Math.min(1,inner(t));
  const lc=Math.log(2)+(df/2)*Math.log(df/2)-Mx.gammaln(df/2),sd=1/Math.sqrt(2*df),lo=Math.max(1e-4,1-8*sd),hi=1+8*sd,N=120,h=(hi-lo)/N;let s=0;
  for(let i=0;i<=N;i++){const u=lo+i*h;s+=Math.exp(lc+(df-1)*Math.log(u)-df*u*u/2)*inner(t*u)*(i===0||i===N?1:i%2?4:2)}
  return Math.min(1,s*h/3)};
Mx.qdunnett=(p,m,df,rho)=>{let lo=0,hi=12;for(let i=0;i<40;i++){const mid=(lo+hi)/2;Mx.pdunnett(mid,m,df,rho)<p?lo=mid:hi=mid}return(lo+hi)/2};

// ---- large-data decimation ----
Mx.lttb=(P,n)=>{const N=P.length;if(n>=N||n<3)return P;const out=[P[0]],bs=(N-2)/(n-2);let a=0;
  for(let i=0;i<n-2;i++){const s=Math.floor((i+1)*bs)+1,e=Math.min(N,Math.floor((i+2)*bs)+1),ns=Math.floor((i+2)*bs)+1,ne=Math.min(N,Math.floor((i+3)*bs)+1);let ax=0,ay=0,cnt=0;
    for(let j=ns;j<ne;j++){ax+=P[j][0];ay+=P[j][1];cnt++}if(!cnt){ax=P[N-1][0];ay=P[N-1][1];cnt=1}ax/=cnt;ay/=cnt;
    let best=-1,bi=s;for(let j=s;j<e;j++){const ar=Math.abs((P[a][0]-ax)*(P[j][1]-P[a][1])-(P[a][0]-P[j][0])*(ay-P[a][1]));if(ar>best){best=ar;bi=j}}out.push(P[bi]);a=bi}
  out.push(P[N-1]);return out};
Mx.dedupe=(P,res=1)=>{const seen=new Set(),o=[];for(const p of P){const k=Math.round(p[0]/res)+':'+Math.round(p[1]/res);if(!seen.has(k)){seen.add(k);o.push(p)}}return o};

// ---- Shapiro–Wilk (Royston 1995, algorithm AS R94) ----
Mx.shapiro=x=>{const n=x.length;if(n<3||n>5000)return null;const y=Mx.sorted(x),poly=(c,t)=>c.reduce((s,v,i)=>s+v*Math.pow(t,i),0),n2=Math.floor(n/2),a=new Array(n2+1).fill(0);
  if(n===3)a[1]=Math.SQRT1_2;else{const an25=n+.25,m=[0];let summ2=0;for(let i=1;i<=n2;i++){m[i]=Mx.norminv((i-.375)/an25);summ2+=m[i]*m[i]}summ2*=2;const ss=Math.sqrt(summ2),rsn=1/Math.sqrt(n);
    const c1=[0,.221157,-.147981,-2.07119,4.434685,-2.706056],c2=[0,.042981,-.293762,-1.752461,5.682633,-3.582633];const a1=poly(c1,rsn)-m[1]/ss;let i1,fac;
    if(n>5){i1=3;const a2=-m[2]/ss+poly(c2,rsn);fac=Math.sqrt((summ2-2*m[1]**2-2*m[2]**2)/(1-2*a1*a1-2*a2*a2));a[2]=a2}else{i1=2;fac=Math.sqrt((summ2-2*m[1]**2)/(1-2*a1*a1))}
    a[1]=a1;for(let i=i1;i<=n2;i++)a[i]=-m[i]/fac}
  let s=0;for(let i=1;i<=n2;i++)s+=a[i]*(y[n-i]-y[i-1]);const mean=Mx.mean(y);let ss=0;for(const v of y)ss+=(v-mean)**2;if(!ss)return null;const w=Math.min(1,s*s/ss);let p;
  if(n===3){p=Math.max(0,6/Math.PI*(Math.asin(Math.sqrt(w))-Math.PI/3))}
  else{const yy=Math.log(1-w),xx=Math.log(n);let m_,s_;if(n<=11){const gm=-2.273+.459*n;if(yy>=gm)return{w,p:1e-99};const y2=-Math.log(gm-yy);m_=poly([.544,-.39978,.025054,-6.714e-4],n);s_=Math.exp(poly([1.3822,-.77857,.062767,-.0020322],n));p=1-Mx.normcdf((y2-m_)/s_)}
    else{m_=poly([-1.5861,-.31082,-.083751,.0038915],xx);s_=Math.exp(poly([-.4803,-.082676,.0030302],xx));p=1-Mx.normcdf((yy-m_)/s_)}}
  return{w,p}};

// ---- Nelder–Mead simplex minimiser ----
Mx.nelder=(f,x0,opt={})=>{const n=x0.length,step=opt.step||x0.map(v=>Math.abs(v)*.1||.1),maxit=opt.maxit||2000,tol=opt.tol||1e-10;let S=[x0.slice()];for(let i=0;i<n;i++){const p=x0.slice();p[i]+=step[i];S.push(p)}let F=S.map(f);
  for(let it=0;it<maxit;it++){const o=F.map((_,i)=>i).sort((a,b)=>F[a]-F[b]);S=o.map(i=>S[i]);F=o.map(i=>F[i]);if(Math.abs(F[n]-F[0])<tol*(Math.abs(F[0])+tol))break;
    const c=Array(n).fill(0);for(let i=0;i<n;i++)for(let j=0;j<n;j++)c[j]+=S[i][j]/n;const pt=(t)=>c.map((v,j)=>v+t*(S[n][j]-v)),xr=pt(-1),fr=f(xr);
    if(fr<F[0]){const xe=pt(-2),fe=f(xe);if(fe<fr){S[n]=xe;F[n]=fe}else{S[n]=xr;F[n]=fr}}else if(fr<F[n-1]){S[n]=xr;F[n]=fr}else{const xc=pt(fr<F[n]?-.5:.5),fc=f(xc);if(fc<Math.min(fr,F[n])){S[n]=xc;F[n]=fc}else for(let i=1;i<=n;i++){S[i]=S[0].map((v,j)=>v+.5*(S[i][j]-v));F[i]=f(S[i])}}}
  return{x:S[0],f:F[0]}};
Mx.hessianSE=(f,x)=>{const n=x.length,h=x.map(v=>Math.max(Math.abs(v)*1e-4,1e-6)),H=Array.from({length:n},()=>Array(n).fill(0)),f0=f(x);
  for(let i=0;i<n;i++)for(let j=i;j<n;j++){const p=(a,b)=>{const q=x.slice();q[i]+=a*h[i];q[j]+=b*h[j];return f(q)};H[i][j]=H[j][i]=i===j?(p(1,0)-2*f0+p(-1,0))/(h[i]**2):(p(1,1)-p(1,-1)-p(-1,1)+p(-1,-1))/(4*h[i]*h[j])}
  const inv=Mx.inv(H);return inv?inv.map((r,i)=>Math.sqrt(Math.abs(r[i]))):x.map(()=>NaN)};

// ---- non-central t and F ----
Mx.pnct=(t,df,delta)=>{const sd=1/Math.sqrt(2*df),lo=Math.max(1e-5,1-9*sd),hi=1+9*sd,lc=Math.log(2)+(df/2)*Math.log(df/2)-Mx.gammaln(df/2),N=240,h=(hi-lo)/N;let s=0;
  for(let i=0;i<=N;i++){const u=lo+i*h;s+=Math.exp(lc+(df-1)*Math.log(u)-df*u*u/2)*Mx.normcdf(t*u-delta)*(i===0||i===N?1:i%2?4:2)}return Math.min(1,Math.max(0,s*h/3))};
Mx.pncf=(x,d1,d2,lam)=>{let s=0;const half=lam/2,z=d1*x/(d1*x+d2);let w=Math.exp(-half);for(let j=0;j<400;j++){s+=w*Mx.betai(d1/2+j,d2/2,z);w*=half/(j+1);if(w<1e-14&&j>half)break}return Math.min(1,s)};

// ---- distribution helpers ----
Mx.fsfInv=(p,d1,d2)=>{let lo=0,hi=1e4;for(let i=0;i<200;i++){const m=(lo+hi)/2;Mx.fsf(m,d1,d2)>p?lo=m:hi=m}return(lo+hi)/2};
Mx.chi2inv=(p,k)=>{let lo=0,hi=1e4;for(let i=0;i<200;i++){const m=(lo+hi)/2;Mx.chi2sf(m,k)>1-p?lo=m:hi=m}return(lo+hi)/2};
Mx.kolmSF=l=>{if(l<=0)return 1;let s=0;for(let k=1;k<=100;k++){const t=2*(k%2?1:-1)*Math.exp(-2*k*k*l*l);s+=t;if(Math.abs(t)<1e-12)break}return Math.min(1,Math.max(0,s))};
Mx.digamma=x=>{let r=0;while(x<6){r-=1/x;x++}const f=1/(x*x);return r+Math.log(x)-.5/x-f*(1/12-f*(1/120-f*(1/252-f*(1/240-f/132))))};
Mx.trigamma=x=>{let r=0;while(x<6){r+=1/(x*x);x++}const f=1/(x*x);return r+1/x+f/2+1/(x*x*x)*(1/6-f*(1/30-f*(1/42-f/30)))};

// ---- inverse FFT ----
Mx.ifft=(re,im)=>{const n=re.length,r=Mx.fft(re,Float64Array.from(im||new Float64Array(n),v=>-v));return{re:Float64Array.from(r.re,v=>v/n),im:Float64Array.from(r.im,v=>-v/n)}};
