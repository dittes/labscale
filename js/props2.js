'use strict';
// Extra graph properties: axis style, legend, palettes, annotations, templates, series extras, flip-through, plus ribbon entries for new graph types.
const PALS={'Default':PALETTE,'Soft 10':['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac'],'Okabe–Ito (colour-blind safe)':['#0072B2','#D55E00','#009E73','#E69F00','#CC79A7','#56B4E9','#F0E442','#000000'],
  'Pastel':['#a6cee3','#b2df8a','#fb9a99','#fdbf6f','#cab2d6','#ffff99','#8dd3c7','#bebada'],'Dark':['#1b9e77','#d95f02','#7570b3','#e7298a','#66a61e','#e6ab02','#a6761d','#666666'],'Grays':['#000000','#555555','#888888','#aaaaaa','#cccccc'],
  'Warm':['#7f0000','#b30000','#d7301f','#ef6548','#fc8d59','#fdbb84'],'Cool':['#08306b','#08519c','#2171b5','#4292c6','#6baed6','#9ecae1'],'Viridis (discrete)':['#440154','#414487','#2a788e','#22a884','#7ad151','#fde725']};
const allPalettes=()=>({...PALS,...Object.fromEntries((P.palettes||[]).map(p=>[p.name,p.colors]))});
const TPL_KEYS=['fs','font','legend','legendFrame','lfs','gridx','gridy','minor','connect','cmap','levels','xs','ys','yrs','bins','normal','cbar','fillmap','contour','speed','xtickdir','ytickdir','xticklen','yticklen','xrot','xfmt','yfmt','xdec','ydec','topaxis','rightaxis','errtype','cellLabels','clabels'];
const SER_KEYS=['color','symbol','size','lw','dash','axis','open'];

const _graphProps=graphProps;
graphProps=function(){let h=_graphProps();const g=curGraph();if(!g||g.type==='multi'||!h)return h;return h.replace(/<\/div>\s*$/,extraSections(g)+'</div>')};
function extraSections(g){
  const sh=sheetById(g.sheetId),gv=k=>getPath(g,k),cart=!['pie','doughnut','polar','radar','heat','contour','kde2d','surf3d','wire3d','scat3d','traj3d','bars3d','ribbon3d','wall3d'].includes(g.type)&&!(GX[g.type]);
  const T=(l,k,t='text',x='')=>`<div class="r"><label>${l}</label><input type="${t==='num'||t==='numn'?'number':'text'}" step="any" data-k="${k}" data-t="${t}" value="${esc(gv(k)??'')}" ${x}></div>`;
  const S=(l,k,opts)=>`<div class="r"><label>${l}</label><select data-k="${k}" data-t="str">${opts.map(([v,t])=>`<option value="${esc(v)}" ${String(gv(k)??opts[0][0])===String(v)?'selected':''}>${esc(t)}</option>`).join('')}</select></div>`;
  const C=(l,k)=>`<div class="r"><label>${l}</label><input type="checkbox" data-k="${k}" data-t="bool" ${gv(k)?'checked':''}></div>`;
  const sec=(n,b)=>`<details data-sec="${n}" ${openSec.has(n)?'open':''}><summary>${n}</summary><div class="body">${b}</div></details>`;
  const colOpt=(v,none)=>(none?`<option value="-1" ${v==null||v<0?'selected':''}>${none}</option>`:'')+sh.cols.map((c,i)=>`<option value="${i}" ${v===i?'selected':''}>${esc(L(i)+': '+(c.name||''))}</option>`).join('');
  let o='';
  if(cart){
    o+=sec('Axis style',`<div class="note">Bottom axis</div>${S('Tick direction','xtickdir',[['out','Out'],['in','In'],['both','Both'],['none','None']])}${T('Tick length','xticklen','num')}${T('Label rotation °','xrot','num')}${S('Number format','xfmt',[['auto','Auto'],['fixed','Fixed'],['sci','Scientific'],['eng','Engineering'],['pct','Percent'],['int','Integer']])}${T('Decimals','xdec','num')}${T('Special ticks at','xticks','text','placeholder="0, 5, 10"')}${T('…labels','xticklabels','text','placeholder="Low, Mid, High"')}
      <div class="r two"><label>Axis break</label><input type="number" step="any" data-k="xbreak.0" data-t="numn" placeholder="from" value="${g.xbreak?.[0]??''}"><input type="number" step="any" data-k="xbreak.1" data-t="numn" placeholder="to" value="${g.xbreak?.[1]??''}"></div>
      <div class="note">Left axis</div>${S('Tick direction','ytickdir',[['out','Out'],['in','In'],['both','Both'],['none','None']])}${T('Tick length','yticklen','num')}${S('Number format','yfmt',[['auto','Auto'],['fixed','Fixed'],['sci','Scientific'],['eng','Engineering'],['pct','Percent'],['int','Integer']])}${T('Decimals','ydec','num')}${T('Special ticks at','yticks')}${T('…labels','yticklabels')}
      <div class="r two"><label>Axis break</label><input type="number" step="any" data-k="ybreak.0" data-t="numn" placeholder="from" value="${g.ybreak?.[0]??''}"><input type="number" step="any" data-k="ybreak.1" data-t="numn" placeholder="to" value="${g.ybreak?.[1]??''}"></div>
      ${C('Ticks on top edge','topaxis')}${C('Ticks on right edge','rightaxis')}
      <div class="note">Top X axis (tick “Top X axis” on a series below)</div>${T('Title','axes.T.label')}${S('Scale','axes.T.scale',[['linear','Linear'],['log10','Log10'],['ln','Ln']])}
      <div class="r two"><label>Range</label><input type="number" step="any" data-k="axes.T.min" data-t="numn" placeholder="auto" value="${g.axes?.T?.min??''}"><input type="number" step="any" data-k="axes.T.max" data-t="numn" placeholder="auto" value="${g.axes?.T?.max??''}"></div>`);
    o+=sec('Series options',g.series.map((s,i)=>`<div class="sr"><b class="note">${esc(sh.cols[s.y]?.name||'Y')}</b>
      <div class="r"><label>Top X axis</label><input type="checkbox" data-k="series.${i}.xaxis" data-t="tb" ${s.xaxis==='T'?'checked':''}></div>
      <div class="r two"><label>Rows</label><input type="number" min="1" data-k="series.${i}.r0" data-t="numn" placeholder="from" value="${s.r0??''}"><input type="number" min="1" data-k="series.${i}.r1" data-t="numn" placeholder="to" value="${s.r1??''}"></div>
      <div class="r"><label>Only rows where</label><select data-k="series.${i}.filt.col" data-t="int">${colOpt(s.filt?.col,'(all rows)')}</select></div>
      ${s.filt&&s.filt.col>=0?`<div class="r"><label>equals</label><input type="text" data-k="series.${i}.filt.val" data-t="str" value="${esc(s.filt.val??'')}"></div>`:''}</div>`).join('')+`<div class="r"><button data-act2="flipPrev">◀ Prev column</button><button data-act2="flipNext">Next column ▶</button></div><div class="note">Flip the first series through the worksheet's Y columns.</div>`);
  }
  if(cart&&['scatter','linesym','cscatter'].includes(g.type))o+=sec('Point styling by column',g.series.map((s,i)=>`<div class="sr"><b class="note">${esc(sh.cols[s.y]?.name||'series')}</b><div class="r"><label>Colour by</label><select data-k="series.${i}.cby" data-t="int">${colOpt(s.cby,'(none)')}</select></div>${s.cby>=0?`<div class="r"><label>Colour map</label><select data-k="cmap" data-t="str">${Object.keys(CMAPS).map(k=>`<option ${g.cmap===k||(!g.cmap&&k==='viridis')?'selected':''}>${k}</option>`).join('')}</select></div><div class="r"><label>Treat as categories</label><input type="checkbox" data-k="series.${i}.ccat" data-t="bool" ${s.ccat?'checked':''}></div>`:''}<div class="r"><label>Size by</label><select data-k="series.${i}.sby" data-t="int">${colOpt(s.sby,'(none)')}</select></div>${s.sby>=0?`<div class="r two"><label>Size range (px)</label><input type="number" step="1" data-k="series.${i}.smin" data-t="num" value="${s.smin??4}"><input type="number" step="1" data-k="series.${i}.smax" data-t="num" value="${s.smax??22}"></div>`:''}<div class="r"><label>Symbol by</label><select data-k="series.${i}.shby" data-t="int">${colOpt(s.shby,'(none)')}</select></div></div>`).join('')+`<div class="r"><label>Legend</label><select data-k="modLeg" data-t="str">${[['tl','Top left'],['tr','Top right'],['bl','Bottom left'],['br','Bottom right'],['none','Hidden']].map(([v,l])=>`<option value="${v}" ${(g.modLeg||'tl')===v?'selected':''}>${l}</option>`).join('')}</select></div>`);
  if(cart)o+=sec('Trendlines and point labels',g.series.map((s,i)=>`<div class="sr"><b class="note">${esc(sh.cols[s.y]?.name||'series')}</b><div class="r"><label>Trendline</label><select data-k="series.${i}.trend" data-t="str">${TRENDS.map(([v,l])=>`<option value="${v}" ${(s.trend||'')===v?'selected':''}>${l}</option>`).join('')}</select></div>${s.trend?`<div class="r"><label>Show equation, R²</label><input type="checkbox" data-k="series.${i}.trendEq" data-t="bool" ${s.trendEq?'checked':''}></div>`:''}<div class="r"><label>Label points with</label><select data-k="series.${i}.lblcol" data-t="int">${colOpt(s.lblcol,'(none)')}</select></div><div class="r"><label>Show in legend</label><input type="checkbox" data-k="series.${i}.legHide" data-t="nbool" ${s.legHide?'':'checked'}></div></div>`).join(''));
  o+=sec('Objects',`<div class="note">Show or hide individual graph elements.</div>`+g.series.map((s,i)=>`<div class="r"><label class="note"><input type="checkbox" data-k="series.${i}.hide" data-t="nbool" ${s.hide?'':'checked'}> ${esc(sh.cols[s.y]?.name||'series')}</label></div>`).join('')+(g.curves||[]).map((c,i)=>`<div class="r"><label class="note"><input type="checkbox" data-k="curves.${i}.hide" data-t="nbool" ${c.hide?'':'checked'}> curve: ${esc(c.label||'fit')}</label></div>`).join('')+(g.shapes||[]).map((c,i)=>`<div class="r"><label class="note"><input type="checkbox" data-k="shapes.${i}.hide" data-t="nbool" ${c.hide?'':'checked'}> shape: ${c.t}</label></div>`).join('')+((g.marks||[]).length?`<div class="r"><label class="note"><input type="checkbox" data-k="hideMarks" data-t="nbool" ${g.hideMarks?'':'checked'}> peak markers</label></div>`:''))
  o+=sec('Legend & performance',`${C('Legend frame','legendFrame')}${T('Legend font size','lfs','num')}<div class="r"><button data-act2="legendReset">Reset legend position</button></div><div class="note">Drag the legend on the graph to move it.</div>${C('Speed mode (decimate large series)','speed')}${T('…above N points','speedN','num')}`);
  // type-specific
  const t=g.type;let ts='';
  if(['interval','meanbar'].includes(t))ts+=S('Error bars show','errtype',[['sd','Standard deviation'],['sem','Standard error'],['ci95','95% CI']]);
  if(['heat','contour','kde2d'].includes(t))ts+=C('Cell value labels','cellLabels')+C('Contour line labels','clabels');
  if(t==='vector')ts+=T('Arrow length (px)','vscale','num');
  if(['pareto','radialbar','bullet','radar'].includes(t))ts+=`<div class="r"><label>Label column</label><select data-k="labelCol" data-t="idx">${colOpt(g.labelCol,'(1, 2, 3…)')}</select></div>`;
  if(['sankey','chord','network','edgebundle'].includes(t))ts+=`<div class="r"><label>Source</label><select data-k="sankeySrc" data-t="int">${colOpt(g.sankeySrc)}</select></div><div class="r"><label>Target</label><select data-k="sankeyDst" data-t="int">${colOpt(g.sankeyDst)}</select></div><div class="note">The Y column holds the flow values.</div>`;
  if(['cscatter','cline','parallel'].includes(t))ts+=S('Colormap','cmap',Object.keys(CMAPS).map(k=>[k,k]));
  if(typeof GALLERY_HELP!=='undefined'&&GALLERY_HELP[t])ts+=`<div class="note">${GALLERY_HELP[t]}</div>`;
  if(['dotplot','mac','pie3d','column3d','tilemap','heatdendro','durov','forest','manhattan','andrews','cluster','trellis','ellipse','piper','tetra','variability','map','schoeller','stiff','sunburst','circpack','treemap','spiralbar'].includes(t)&&!['sunburst','circpack','treemap'].includes(t))ts+=`<div class="r"><label>Group column</label><select data-k="labelCol" data-t="idx">${colOpt(g.labelCol,'(none)')}</select></div>`;
  if(t==='map')ts+=S('Projection','proj',[['equirect','Equirectangular'],['mercator','Mercator'],['mollweide','Mollweide']])+C('Zoom to data','mapfit')+S('Colormap','cmap',Object.keys(CMAPS).map(k=>[k,k]));
  if(t==='isosurface')ts+=T('Iso level','iso','num')+T('Second iso level (optional)','iso2','num')+S('Colormap','cmap',Object.keys(CMAPS).map(k=>[k,k]));
  if(t==='pie3d')ts+=T('Thickness','p3h','num')+T('Explode','pexp','num');
  if(t==='polarquiver')ts+=T('Arrow length (fraction of radius)','qscale','num')+S('Colormap','cmap',Object.keys(CMAPS).map(k=>[k,k]));
  if(t==='tilemap')ts+=S('Colormap','cmap',Object.keys(CMAPS).map(k=>[k,k]));
  if(t==='heatdendro')ts+=C('Standardise rows (z-score)','zrow')+S('Colormap','cmap',Object.keys(CMAPS).map(k=>[k,k]));
  if(['pie3d','column3d','waterfall3d','isosurface'].includes(t))ts+=T('Azimuth (°)','az','num')+T('Elevation (°)','el','num');
  if(t==='forest')ts+=T('Null value (reference line)','fnull','num');
  if(t==='fishbone')ts+=T('Effect text','fishEffect');
  if(t==='inset')ts+=T('Inset X from','ix0','num')+T('Inset X to','ix1','num');
  if(t==='tetra')ts+=T('Azimuth (°)','az','num')+T('Elevation (°)','el','num');
  if(t==='spiralbar')ts+=T('Turns','turns','num')+S('Colormap','cmap',Object.keys(CMAPS).map(k=>[k,k]));
  if(t==='streamline')ts+=T('Seeds per axis','seeds','num');
  if(['contourprofile','imageprofile'].includes(t))ts+=T('Profile at X','profX','num')+T('Profile at Y','profY','num');
  if(ts)o+=sec('Type options',ts);
  // palettes / style
  const pals=allPalettes();
  o+=sec('Colours & style',`<div class="r"><label>Palette</label><select id="palSel">${Object.keys(pals).map(n=>`<option>${esc(n)}</option>`).join('')}</select><button data-act2="palApply">Apply</button></div>
    <div class="r"><button data-act2="symCycle">Cycle symbols</button><button data-act2="symSame">Same symbol</button><button data-act2="dashCycle">Cycle line styles</button></div>
    <div class="r"><label>Selected pts</label><input type="color" id="ptCol" value="#dc2626"><button data-act2="ptColor">Colour ${(g.sel||[]).length||0} selected</button><button data-act2="ptClear">Clear</button></div><div class="r"><button data-act2="palEdit">Edit palettes…</button></div>`);
  if(cart)o+=sec('Annotations',`<div class="note">Use <b>✎ Draw</b> in the graph toolbar (pick a shape, drag on the plot; “Select” moves shapes).</div>`+(g.shapes||[]).map((s,i)=>`<div class="sr ${g.selShape===i?'selsh':''}"><div class="r"><b>${s.t}</b><button data-act2="shapeSel" data-i="${i}">select</button><button data-act2="shapeDel" data-i="${i}">✕</button></div><div class="r"><input type="color" data-k="shapes.${i}.color" data-t="str" value="${s.color||'#dc2626'}"><input type="number" min="0.5" step=".5" data-k="shapes.${i}.lw" data-t="num" value="${s.lw||2}" title="Line width"></div>${['rect','ellipse'].includes(s.t)?`<div class="r"><label>Fill</label><input type="color" data-k="shapes.${i}.fill" data-t="str" value="${s.fill||'#ffffff'}"><label class="note"><input type="checkbox" data-k="shapes.${i}.fillOn" data-t="fillon"> on</label></div>`:''}${s.t==='text'?`<div class="r"><input type="text" data-k="shapes.${i}.text" data-t="str" value="${esc(s.text||'')}"><input type="number" data-k="shapes.${i}.fs" data-t="num" value="${s.fs||12}" style="width:50px;flex:none"></div>`:''}${['line','arrow','rect','ellipse'].includes(s.t)?`<div class="r"><label class="note"><input type="checkbox" data-k="shapes.${i}.dash" data-t="bool" ${s.dash?'checked':''}> dashed</label></div>`:''}</div>`).join(''));
  const tpls=P.templates||[];
  o+=sec('Templates',`<div class="r"><input type="text" id="tplName" placeholder="template name"><button data-act2="tplSave">Save</button></div>${tpls.map((tp,i)=>`<span class="tag">${esc(tp.name)}<button data-act2="tplApply" data-i="${i}" title="Apply">⇥</button><button data-act2="tplDel" data-i="${i}">✕</button></span>`).join('')||'<div class="note">Save this graph\'s style, axes and series formatting, then apply it to other graphs.</div>'}`);
  return o}

function applyShapesEdit(g){}
function initProps2(){
  const el=$('#props');
  el.addEventListener('click',e=>{const b=e.target.closest('[data-act2]');if(!b)return;const g=curGraph();if(!g)return;const i=+b.dataset.i,a=b.dataset.act2;snap();
    switch(a){
      case'palApply':{const pal=allPalettes()[$('#palSel').value];g.series.forEach((s,k)=>s.color=pal[k%pal.length]);break}
      case'descDlg':descriptionDialog();return;case'legDlg':legendDialog();return;case'symCycle':g.series.forEach((s,k)=>s.symbol=SYMBOLS[k%6]);break;case'symSame':g.series.forEach(s=>s.symbol='circle');break;case'dashCycle':g.series.forEach((s,k)=>s.dash=['','dash','dot','dashdot'][k%4]);break;
      case'ptColor':{const col=$('#ptCol').value;(g.sel||[]).forEach(p=>{const s=g.series.find(q=>q.y===p.y);if(!s)return;s.pts=s.pts||{};s.pts[p.row]={...(s.pts[p.row]||{}),color:col}});break}
      case'ptClear':g.series.forEach(s=>delete s.pts);break;
      case'legendReset':g.legendPos=null;break;
      case'flipPrev':case'flipNext':flipColumn(g,a==='flipNext'?1:-1);break;
      case'shapeSel':g.selShape=i;g.selSet=[i];break;case'shapeDel':g.shapes.splice(i,1);g.selShape=-1;break;
      case'tplSave':{const name=($('#tplName').value||'').trim();if(!name){alert('Name the template first.');return}P.templates=(P.templates||[]).filter(t=>t.name!==name);P.templates.push({name,props:Object.fromEntries(TPL_KEYS.filter(k=>g[k]!==undefined).map(k=>[k,JSON.parse(JSON.stringify(g[k]))])),series:g.series.map(s=>Object.fromEntries(SER_KEYS.filter(k=>s[k]!==undefined).map(k=>[k,s[k]]))),axes:g.axes?JSON.parse(JSON.stringify(g.axes)):undefined,shapes:g.shapes?JSON.parse(JSON.stringify(g.shapes)):undefined,xbreak:g.xbreak,ybreak:g.ybreak,type:g.type});flash('Template saved');break}
      case'tplApply':{const tp=P.templates[i];if(!tp)return;Object.assign(g,JSON.parse(JSON.stringify(tp.props)));if(tp.axes)g.axes=JSON.parse(JSON.stringify(tp.axes));g.series.forEach((s,k)=>Object.assign(s,tp.series[k%tp.series.length]||{}));flash('Template applied');break}
      case'tplDel':P.templates.splice(i,1);break;
      case'palEdit':palEditDialog();return}
    dirty();redrawGraph(true)});
  // extra data types in the properties handler
  el.addEventListener('change',e=>{const t=e.target;if(t.dataset.t==='fillon'){const g=curGraph(),k=t.dataset.k.split('.');g.shapes[+k[1]].fill=t.checked?($(`[data-k="shapes.${k[1]}.fill"]`).value):'';redrawGraph();dirty()}});
  document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select')||document.querySelector('dialog[open]'))return;const g=curGraph();if(!g||g.selShape==null||g.selShape<0||!g.shapes||!g.shapes[g.selShape])return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();snap();g.shapes.splice(g.selShape,1);g.selShape=-1;dirty();redrawGraph(true)}});
  chart.onShape=()=>{dirty();renderProps()};
  chart.onEditPoint=(k,p)=>{const g=curGraph(),sh=g&&sheetById(g.sheetId);if(!sh)return;
    if(k==='start'){snap();return}
    if(k==='move'){const s=p.s;sh.cols[s.y].d[p.row]=+p.y.toPrecision(10);if(s.x!=null&&s.x>=0)sh.cols[s.x].d[p.row]=+p.x.toPrecision(10);return}
    if(k==='end'){dirty();dataChanged(sh.id);if(P.act&&P.act.t==='sheet')renderBody();return}
    if(k==='add'){snap();const n=NR(sh),s=p.s;sh.cols[s.y].d[n]=+p.y.toPrecision(10);if(s.x!=null&&s.x>=0)sh.cols[s.x].d[n]=+p.x.toPrecision(10);dirty();dataChanged(sh.id);redrawGraph();flash('Point added to row '+(n+1))}};
  // toolbar extras
  $('#gShape').onchange=e=>{chart.shapeTool=e.target.value;setGraphMode('shape')};
  chart.shapeTool='pointer';
  $('#gImg').onclick=()=>$('#imgIn').click();
  $('#imgIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';const g=curGraph();if(!f||!g)return;const url=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(f)});
    const im=await new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.src=url}),sc=Math.min(1,700/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=im.width*sc;cv.height=im.height*sc;cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);const src=cv.toDataURL('image/jpeg',.85);
    if(!chart.ax)return;const R=chart.R;snap();g.shapes=g.shapes||[];g.shapes.push({t:'image',src,x0:chart.ax.unmap(R.x+R.w*.55),y0:chart.ay.unmap(R.y+R.h*.1),x1:chart.ax.unmap(R.x+R.w*.9),y1:chart.ay.unmap(R.y+R.h*.1+R.w*.35*cv.height/cv.width)});dirty();redrawGraph(true)};
  $('#gPrev').onclick=()=>{const g=curGraph();if(g){snap();flipColumn(g,-1);redrawGraph(true)}};$('#gNext').onclick=()=>{const g=curGraph();if(g){snap();flipColumn(g,1);redrawGraph(true)}};
  $('#gPtAdd')&&0;
}
function flipColumn(g,dir){const sh=sheetById(g.sheetId),s=g.series[0];if(!s)return;const cand=sh.cols.map((c,i)=>i).filter(i=>!NONY.includes(sh.cols[i].des)&&i!==s.x);if(!cand.length)return;let k=cand.indexOf(s.y);k=(k+dir+cand.length)%cand.length;s.y=cand[k];g.yl=unitLbl(sh.cols[s.y],'Y');flash(`Showing ${sh.cols[s.y].name||L(s.y)}`)}
function palEditDialog(){dialog({title:'Colour Palettes',sheet:{cols:[]},ok:'Save palette',hint:'Create or replace a palette from hex colours, separated by commas. Saved palettes appear in every graph\'s palette list.',fields:[{t:'txt',k:'name',label:'Palette name',def:'My palette'},{t:'txt',k:'cols',label:'Colours (hex)',def:'#1f77b4, #ff7f0e, #2ca02c, #d62728'},{t:'sel',k:'del',label:'…or delete a saved palette',def:'',opts:[['','(none)'],...(P.palettes||[]).map(p=>[p.name,p.name])]}],
  onOk:a=>{snap();if(a.del){P.palettes=P.palettes.filter(p=>p.name!==a.del);dirty();renderProps();return}const cols=a.cols.split(/[,\s]+/).filter(c=>/^#[0-9a-f]{3,6}$/i.test(c));if(cols.length<2)return alert('Give at least two valid hex colours.');P.palettes=(P.palettes||[]).filter(p=>p.name!==a.name);P.palettes.push({name:a.name,colors:cols});dirty();renderProps()}})}

// ---- ribbon: new graph types ----
const tx=(t,l,ic)=>[l,ic,()=>plotCmd(t)];
RIB.Plot.push(['More 2D',[tx('errband','Error band','E±'),tx('cscatter','Colour scatter','cs'),tx('cline','Colour line','cl'),tx('lollipop','Lollipop','lol'),tx('drop','Drop lines','drp'),tx('stack100','100% stack','100'),tx('floatcol','Floating col','flt'),tx('sarea','Stacked area','SA'),tx('sarea100','100% area','S%'),tx('doughnut','Doughnut','◎')]]);
RIB.Plot.push(['Statistical',[tx('interval','Interval','CI'),tx('meanbar','Mean bar','μ±'),tx('swarm','Beeswarm','bee'),tx('colscatter','Column scatter','cols'),tx('ba','Bland–Altman','BA'),tx('pareto','Pareto','Par'),tx('scatmat','Scatter matrix','SPM'),tx('marginal','Marginal hist.','Mrg'),tx('ridge','Ridgeline','Rdg'),tx('pyramid','Pyramid','Pyr'),tx('qc','QC X̄/R','QC')]]);
RIB.Plot.push(['Specialized+',[tx('candle','Candlestick','Cndl'),tx('ohlc','OHLC','OHLC'),tx('vector','Vector','vec'),tx('windrose','Wind rose','Wind'),tx('radialbar','Radial bar','RB'),tx('smith','Smith','Smth'),tx('ternary','Ternary','Tern'),tx('parallel','Parallel','‖'),tx('sankey','Sankey','Snky'),tx('bullet','Bullet','Bul'),tx('kde2d','2D density','KDE²')]]);
RIB.Plot.push(['3D+',[tx('bars3d','3D bars','3Db'),tx('ribbon3d','3D ribbon','3Dr'),tx('wall3d','3D wall','3Dw'),tx('traj3d','3D trajectory','3Dt')]]);
