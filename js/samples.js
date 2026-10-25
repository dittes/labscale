'use strict';
// Sample datasets for trying out the app.
const SAMPLES=(()=>{
  let seed=20260;const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const nrm=(m=0,s=1)=>m+s*Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
  const lin=(a,b,n)=>Array.from({length:n},(_,i)=>a+(b-a)*i/(n-1));
  const g=(x,A,c,w)=>A*Math.exp(-((x-c)**2)/(2*w*w));
  const r4=v=>+v.toFixed(4);
  return{
    spectrum:{label:'Raman spectrum (3 peaks + baseline)',make:()=>{const x=lin(100,300,401);return{name:'Spectrum',cols:[{name:'Raman Shift',unit:'cm⁻¹',des:'X',d:x},{name:'Intensity',unit:'a.u.',des:'Y',d:x.map(v=>r4(5+.05*(v-100)+g(v,40,150,6)+g(v,100,190,5)+g(v,60,240,8)+nrm(0,1.2)))}]}}},
    kinetics:{label:'Decay kinetics with error bars',make:()=>{const t=lin(0,30,31);return{name:'Kinetics',cols:[{name:'Time',unit:'min',des:'X',d:t},{name:'Concentration',unit:'mM',des:'Y',d:t.map(v=>r4(2+8*Math.exp(-v/6)+nrm(0,.18)))},{name:'Error',unit:'mM',des:'E',d:t.map(()=>r4(.15+rnd()*.15))}]}}},
    dose:{label:'Dose–response curve',make:()=>{const x=Array.from({length:13},(_,i)=>+Math.pow(10,-3+i*.5).toPrecision(4));return{name:'DoseResponse',cols:[{name:'Concentration',unit:'µM',des:'X',d:x},{name:'Response',unit:'%',des:'Y',d:x.map(v=>r4(4+96/(1+Math.pow(1.5/v,1.2))+nrm(0,2.5)))},{name:'SD',unit:'%',des:'E',d:x.map(()=>r4(2+rnd()*3))}]}}},
    groups:{label:'Four treatment groups (ANOVA / box plot)',make:()=>({name:'Groups',cols:[['Control',10,2],['Drug A',12,2.2],['Drug B',14,2],['Drug C',10.5,3]].map(([n,m,s])=>({name:n,unit:'mg/L',des:'Y',d:Array.from({length:20},()=>r4(nrm(m,s)))}))})},
    regression:{label:'Multiple regression (X1, X2, X3 → Y)',make:()=>{const n=40,x1=Array.from({length:n},()=>r4(rnd()*10)),x2=Array.from({length:n},()=>r4(rnd()*5)),x3=Array.from({length:n},()=>r4(rnd()*20));
      return{name:'Regression',cols:[{name:'X1',des:'X',d:x1},{name:'X2',des:'X',d:x2},{name:'X3',des:'X',d:x3},{name:'Y',des:'Y',d:x1.map((v,i)=>r4(3+2*v-1.5*x2[i]+.5*x3[i]+nrm(0,1.2)))}]}}},
    xyz:{label:'Scattered XYZ points (grid to matrix)',make:()=>{const n=180,x=Array.from({length:n},()=>r4(rnd()*6-3)),y=Array.from({length:n},()=>r4(rnd()*6-3));return{name:'XYZ',cols:[{name:'X',des:'X',d:x},{name:'Y',des:'Y',d:y},{name:'Z',des:'Z',d:x.map((v,i)=>r4(Math.sin(v)*Math.cos(y[i])+nrm(0,.03)))}]}}},
    surface:{label:'Matrix: sin(r)/r surface (heatmap, contour, 3D)',make:()=>{const xv=lin(-9,9,45).map(r4),yv=xv.slice();return{name:'Surface',isMatrix:true,xv,yv,cols:xv.map((x,j)=>({name:String(x),des:'Y',d:yv.map(y=>{const r=Math.hypot(x,y);return r4(r<1e-9?1:Math.sin(r)/r)})}))}}},
    polar:{label:'Polar curves (cardioid, rose)',make:()=>{const t=Array.from({length:73},(_,i)=>i*5);return{name:'Polar',cols:[{name:'Angle',unit:'deg',des:'X',d:t},{name:'Cardioid',des:'Y',d:t.map(a=>r4(1+Math.cos(a*Math.PI/180)))},{name:'Rose',des:'Y',d:t.map(a=>r4(Math.abs(2*Math.sin(2*a*Math.PI/180))))}]}}},
    templog:{label:'Temperature log with timestamps (date axis)',make:()=>{const t0=Date.UTC(2024,2,1,0,0),n=96,t=Array.from({length:n},(_,i)=>t0+i*36e5);return{name:'TempLog',cols:[{name:'Time',des:'X',fmt:'date',d:t},{name:'Temperature',unit:'°C',des:'Y',d:t.map((v,i)=>r4(15+6*Math.sin(2*Math.PI*(i-9)/24)+i*.03+nrm(0,.4)))},{name:'Humidity',unit:'%',des:'Y',d:t.map((v,i)=>r4(60-12*Math.sin(2*Math.PI*(i-9)/24)+nrm(0,1.5)))}]}}},
    calib:{label:'Calibration standards + unknown samples',make:()=>{const x=[0.5,1,2,5,10,20,50,100],y=x.map(v=>r4(0.02+0.085*v+nrm(0,0.15)));return{name:'Calibration',cols:[{name:'Concentration',unit:'µg/mL',des:'X',d:x},{name:'Absorbance',des:'Y',d:y},{name:'Unknown',des:'Y',d:[0.35,2.4,5.1,0.9,7.7,12]}]}}},
    dose2:{label:'Two dose-response curves (control vs drug)',make:()=>{const x=Array.from({length:12},(_,i)=>+Math.pow(10,-3+i*.5).toPrecision(3));return{name:'DoseCompare',cols:[{name:'Dose',unit:'µM',des:'X',d:x},{name:'Control',des:'Y',d:x.map(v=>r4(2+98/(1+Math.pow(0.8/v,1.1))+nrm(0,2.2)))},{name:'Drug',des:'Y',d:x.map(v=>r4(2+98/(1+Math.pow(4/v,1.1))+nrm(0,2.2)))}]}}},
    repeated:{label:'Repeated measures (8 subjects × 4 time points)',make:()=>{const subj=Array.from({length:8},()=>nrm(0,2));return{name:'RepeatedMeasures',cols:[['Baseline',0],['Week 1',1],['Week 4',3],['Week 8',4]].map(([n,e])=>({name:n,des:'Y',d:subj.map(s=>r4(10+s+e+nrm(0,.8)))}))}}},
    signal:{label:'Noisy signal: 5 Hz + 23 Hz (FFT, filters)',make:()=>{const t=lin(0,2,512);return{name:'Signal',cols:[{name:'Time',unit:'s',des:'X',d:t.map(v=>r4(v))},{name:'Amplitude',des:'Y',d:t.map(v=>r4(Math.sin(2*Math.PI*5*v)+.5*Math.sin(2*Math.PI*23*v)+nrm(0,.3)))}]}}}
  };
})();
