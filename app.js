
'use strict';
const PRISTINE='<!doctype html>\n'+document.documentElement.outerHTML;
let D=window.CIP_DATA; /* โหลดจาก Google Sheet โดย boot.js */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const num=n=>Math.round(n).toLocaleString('en-US');
const pc=(x,d=1)=>(x*100).toFixed(d)+'%';
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TH_M=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const TH_D=['อา','จ','อ','พ','พฤ','ศ','ส'];
const SC=['#1f4fa3','#d4a72c','#b8374a','#6f95d8'];
const SHORT=['ตรงเวลา','สาย','ไม่ Check in','ไม่ตรงจุด'];
const HIDE_CODE='158';
let isAdmin=false;
let R,N,dInfo,mon0,W,dcZone,dcReg,dcName,dcHide,zoneReg,regions,ptShort,kindShort,plateLC,months;
const weekOf=i=>Math.floor((i+mon0)/7);
const regionOf=z=>z.startsWith('เหนือ')?'เหนือ':z.startsWith('อีสาน')?'อีสาน':z.startsWith('ใต้')?'ใต้':z;
const vis=rows=>rows.filter(r=>!dcHide[r[1]]);
function deriveAll(){
  R=D.rows;N=D.dates.length;
  dInfo=D.dates.map(s=>{const [y,m,d]=s.split('-').map(Number);return {y,m,d,dow:new Date(Date.UTC(y-543,m-1,d)).getUTCDay()}});
  mon0=(dInfo[0].dow+6)%7;W=weekOf(N-1)+1;
  dcZone=D.dcs.map(x=>x.z);dcReg=D.dcs.map(x=>x.r);dcName=D.dcs.map(x=>x.c+' '+x.n);dcHide=D.dcs.map(x=>x.c===HIDE_CODE);
  zoneReg={};D.dcs.forEach(x=>zoneReg[x.z]=x.r);
  regions=[...new Set(D.dcs.map(x=>x.r))];
  ptShort=D.pts.map(s=>s.replace(/^\d+\s*/,''));kindShort=D.kinds.map(s=>s.replace(/^\d+\s*/,''));
  plateLC=D.plates.map((p,i)=>(p+' '+D.vcode[i]).toLowerCase());
  months=[...new Set(dInfo.map(x=>x.y*100+x.m))].map(k=>({k,m:k%100,y:Math.floor(k/100),i0:dInfo.findIndex(x=>x.y*100+x.m===k),i1:N-1-[...dInfo].reverse().findIndex(x=>x.y*100+x.m===k)}));
}
deriveAll();
const fmtD=i=>`${dInfo[i].d} ${TH_M[dInfo[i].m-1]} ${dInfo[i].y}`;
const fmtDs=i=>`${dInfo[i].d} ${TH_M[dInfo[i].m-1]}`;
const hhmm=m=>m==null?'—':String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');

/* ---------- state ---------- */
const F={d0:0,d1:N-1,region:new Set(),zone:new Set(),dc:new Set(),pt:new Set(),kind:new Set(),st:new Set(),shift:new Set(),q:'',fine:'file',target:90};
const fineOf=r=>F.fine==='rule'?r[11]:r[10];
function pass(r,skipSt){
  const dc=r[1];
  if(F.region.size&&!F.region.has(dcReg[dc]))return false;
  if(F.zone.size&&!F.zone.has(dcZone[dc]))return false;
  if(F.dc.size&&!F.dc.has(dc))return false;
  if(F.pt.size&&!F.pt.has(r[2]))return false;
  if(F.kind.size&&!F.kind.has(r[3]))return false;
  if(F.shift.size&&!F.shift.has(r[5]))return false;
  if(!skipSt&&F.st.size&&!F.st.has(r[9]))return false;
  if(F.q&&!plateLC[r[4]].includes(F.q))return false;
  return true;
}
function getRows(d0,d1,skipSt){const o=[];for(let k=0;k<R.length;k++){const r=R[k];if(r[0]>=d0&&r[0]<=d1&&pass(r,skipSt))o.push(r)}return o}
function summ(rows){const s={n:rows.length,s:[0,0,0,0],fine:0,lateSum:0,veh:new Set()};for(const r of rows){s.s[r[9]]++;s.fine+=fineOf(r);if(r[9]===1)s.lateSum+=r[7];s.veh.add(r[4])}s.lateAvg=s.s[1]?s.lateSum/s.s[1]:0;return s}
function groupBy(rows,keyFn){const m=new Map();for(const r of rows){const k=keyFn(r);let a=m.get(k);if(!a){a={n:0,s:[0,0,0,0],fine:0};m.set(k,a)}a.n++;a.s[r[9]]++;a.fine+=fineOf(r)}return m}
let cur,prev,sum,psum,noSt;
function compute(){
  cur=getRows(F.d0,F.d1);sum=summ(cur);noSt=F.st.size?getRows(F.d0,F.d1,true):cur;
  const len=F.d1-F.d0+1,p1=F.d0-1,p0=p1-len+1;
  prev=p0>=0?getRows(p0,p1):null;psum=prev?summ(prev):null;
}
function activeFilterText(){
  const t=[];
  t.push(`${fmtD(F.d0)} – ${fmtD(F.d1)}`);
  if(F.region.size)t.push('ภาค: '+[...F.region].join(', '));
  if(F.zone.size)t.push('โซน: '+[...F.zone].join(', '));
  if(F.dc.size)t.push('DC: '+(F.dc.size>3?F.dc.size+' แห่ง':[...F.dc].map(i=>dcName[i]).join(', ')));
  if(F.pt.size)t.push('ประเภท: '+[...F.pt].map(i=>ptShort[i]).join(', '));
  if(F.kind.size)t.push('ชนิด: '+[...F.kind].map(i=>kindShort[i]).join(', '));
  if(F.st.size)t.push('สถานะ: '+[...F.st].map(i=>SHORT[i]).join(', '));
  if(F.shift.size)t.push('กะ: '+[...F.shift].map(i=>D.shifts[i]).join(', '));
  if(F.q)t.push('ค้นหา: '+F.q);
  t.push('ค่าปรับ: '+(F.fine==='rule'?'ตามกฎ':'ตามไฟล์'));
  return t.join(' · ');
}

/* ---------- charts ---------- */
const CH={};
function mk(key,el,cfg){if(CH[key])CH[key].destroy();const c=typeof el==='string'?document.getElementById(el):el;CH[key]=new Chart(c,cfg);return CH[key]}
function themeCharts(){Chart.defaults.color=css('--mute');Chart.defaults.borderColor=css('--line');Chart.defaults.font.family="'Sarabun','Noto Sans Thai','Leelawadee UI','Tahoma',sans-serif";Chart.defaults.font.size=12}
const hover=(e,els)=>{e.native.target.style.cursor=els.length?'pointer':'default'};
function stackH(key,id,entries,onClick,o={}){
  const ds=SHORT.map((l,k)=>({label:l,data:entries.map(([,a])=>a.n?a.s[k]/a.n*100:0),counts:entries.map(([,a])=>a.s[k]),backgroundColor:SC[k],borderWidth:0,maxBarThickness:o.thick||34}));
  return mk(key,id,{type:'bar',data:{labels:entries.map(e=>e[0]),datasets:ds},options:{indexAxis:'y',maintainAspectRatio:false,animation:{duration:250},onHover:hover,
    onClick:(e,els)=>{if(els.length&&onClick)onClick(els[0].index)},
    scales:{x:{stacked:true,max:100,ticks:{callback:v=>v+'%'}},y:{stacked:true,grid:{display:false},ticks:{autoSkip:false,color:c=>o.tickColor?o.tickColor(c.index):Chart.defaults.color,font:c=>({weight:o.hdr&&o.hdr.has(c.index)?'700':'400'})}}},
    plugins:{legend:{position:'bottom',labels:{boxWidth:10,boxHeight:10}},tooltip:{filter:it=>entries[it.dataIndex][1].n>0,callbacks:{label:c=>`${c.dataset.label}: ${c.parsed.x.toFixed(1)}% (${num(c.dataset.counts[c.dataIndex])})`}}}}});
}

/* ---------- multi-select ---------- */
const MSs=[];
function MS(host,label,optsFn,set,search){
  host.innerHTML=`<button class="ms-b"></button><div class="ms-p">${search?'<input class="ms-s" placeholder="ค้นหา...">':''}<div class="ms-a"><a data-a="all">เลือกทั้งหมด</a><a data-a="none">ล้าง</a></div><div class="ms-l"></div></div>`;
  const btn=host.querySelector('.ms-b'),list=host.querySelector('.ms-l'),inp=host.querySelector('.ms-s');
  const o={refresh(){
    const opts=optsFn(),q=inp?inp.value.trim().toLowerCase():'';
    list.innerHTML=opts.filter(x=>!q||x.t.toLowerCase().includes(q)).map(x=>`<label><input type="checkbox" value="${esc(x.v)}" ${set.has(x.v)?'checked':''}>${esc(x.t)}</label>`).join('')||'<div class="note-s" style="padding:6px">ไม่มีตัวเลือก</div>';
    btn.textContent=label+(set.size?` (${set.size})`:'')+' ▾';btn.classList.toggle('has',set.size>0);
    o.opts=opts;
  }};
  btn.onclick=e=>{e.stopPropagation();const open=!host.classList.contains('open');MSs.forEach(m=>m.host.classList.remove('open'));host.classList.toggle('open',open);if(open&&inp)inp.focus()};
  host.querySelector('.ms-p').onclick=e=>e.stopPropagation();
  list.onchange=e=>{const el=e.target;const x=o.opts.find(z=>String(z.v)===el.value);if(!x)return;el.checked?set.add(x.v):set.delete(x.v);cascade();update()};
  host.querySelector('.ms-a').onclick=e=>{const a=e.target.dataset.a;if(!a)return;if(a==='all')o.opts.forEach(x=>set.add(x.v));else set.clear();cascade();update()};
  if(inp)inp.oninput=()=>o.refresh();
  o.host=host;MSs.push(o);o.refresh();return o;
}
document.addEventListener('click',()=>MSs.forEach(m=>m.host.classList.remove('open')));
function allowedDC(i){return (!F.region.size||F.region.has(dcReg[i]))&&(!F.zone.size||F.zone.has(dcZone[i]))}
function cascade(){
  if(F.region.size)for(const z of [...F.zone])if(!F.region.has(zoneReg[z]))F.zone.delete(z);
  for(const i of [...F.dc])if(!allowedDC(i))F.dc.delete(i);
}
function buildFilters(){
  MS($('#ms-region'),'ภาค',()=>regions.map(v=>({v,t:v})),F.region);
  MS($('#ms-zone'),'โซน',()=>D.zoneOrder.filter(z=>zoneReg[z]&&(!F.region.size||F.region.has(zoneReg[z]))).map(v=>({v,t:v})),F.zone);
  MS($('#ms-dc'),'DC',()=>D.dcs.map((x,i)=>({v:i,t:dcName[i]})).filter(x=>allowedDC(x.v)&&!dcHide[x.v]),F.dc,true);
  MS($('#ms-pt'),'ประเภทรถ',()=>ptShort.map((t,v)=>({v,t})),F.pt);
  MS($('#ms-kind'),'ชนิดรถ',()=>kindShort.map((t,v)=>({v,t})),F.kind);
  MS($('#ms-st'),'สถานะ',()=>SHORT.map((t,v)=>({v,t})),F.st);
  MS($('#ms-shift'),'กะเวลา',()=>D.shifts.map((t,v)=>({v,t:t+' น.'})),F.shift);
  $('#d0').onchange=e=>{F.d0=+e.target.value;if(F.d1<F.d0)F.d1=F.d0;update()};
  $('#d1').onchange=e=>{F.d1=+e.target.value;if(F.d0>F.d1)F.d0=F.d1;update()};
  $('#q').oninput=e=>{F.q=e.target.value.trim().toLowerCase();update()};
  $('#resetBtn').onclick=resetAll;
  $('#fineMode').onchange=e=>{F.fine=e.target.value;update()};
  $('#target').onchange=e=>{F.target=Math.max(0,Math.min(100,+e.target.value||90));update()};
  buildDateUI();
}
function buildDateUI(){
  ['#d0','#d1'].forEach(id=>{$(id).innerHTML=D.dates.map((_,i)=>`<option value="${i}">${fmtD(i)} (${TH_D[dInfo[i].dow]})</option>`).join('')});
  const q=[['ทั้งหมด',0,N-1],...months.map(m=>[TH_M[m.m-1],m.i0,m.i1]),['7 วันล่าสุด',Math.max(0,N-7),N-1],['30 วันล่าสุด',Math.max(0,N-30),N-1]];
  $('#qchips').innerHTML=q.map((x,i)=>`<button class="qc" data-i="${i}">${x[0]}</button>`).join('');
  $('#qchips').onclick=e=>{const b=e.target.closest('.qc');if(!b)return;const x=q[+b.dataset.i];F.d0=x[1];F.d1=x[2];update()};
  $('#qchips')._q=q;
}
function resetAll(){F.d0=0;F.d1=N-1;['region','zone','dc','pt','kind','st','shift'].forEach(k=>F[k].clear());F.q='';$('#q').value='';update()}
function renderFilterUI(){
  $('#d0').value=F.d0;$('#d1').value=F.d1;
  MSs.forEach(m=>m.refresh());
  const q=$('#qchips')._q;$$('#qchips .qc').forEach((b,i)=>b.classList.toggle('on',q[i][1]===F.d0&&q[i][2]===F.d1));
  const chips=[];
  const add=(set,lab,nm)=>set.forEach(v=>chips.push({t:`${lab}: ${nm(v)}`,f:()=>{set.delete(v);cascade();update()}}));
  add(F.region,'ภาค',v=>v);add(F.zone,'โซน',v=>v);add(F.dc,'DC',v=>dcName[v]);add(F.pt,'ประเภท',v=>ptShort[v]);add(F.kind,'ชนิด',v=>kindShort[v]);add(F.st,'สถานะ',v=>SHORT[v]);add(F.shift,'กะ',v=>D.shifts[v]);
  if(F.d0!==0||F.d1!==N-1)chips.push({t:`${fmtDs(F.d0)} – ${fmtDs(F.d1)}`,f:()=>{F.d0=0;F.d1=N-1;update()}});
  const box=$('#chips');box.innerHTML=chips.map((c,i)=>`<span class="chip">${esc(c.t)}<i data-i="${i}">✕</i></span>`).join('');
  box.style.display=chips.length?'flex':'none';
  box.onclick=e=>{const i=e.target.dataset.i;if(i!=null)chips[+i].f()};
  $('#rangeLbl').textContent=`${fmtD(F.d0)} – ${fmtD(F.d1)} · ${num(sum.n)} รายการ`;
}
function toggle(set,v){set.has(v)?set.delete(v):set.add(v);cascade();update()}

/* ---------- png export ---------- */
function download(href,name){const a=document.createElement('a');a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove()}
const stamp=()=>new Date().toISOString().slice(0,10).replace(/-/g,'');
async function exportPNG(el,name,bg){
  if(!isAdmin)return;
  el.classList.add('exporting');
  $$('.pngfoot').forEach(f=>f.textContent='NIMEX Check-in · '+activeFilterText());
  try{
    const cv=await html2canvas(el,{scale:2,backgroundColor:bg||css('--card'),useCORS:true,logging:false});
    download(cv.toDataURL('image/png'),`NIMEX-${name}-${stamp()}.png`);
  }catch(e){alert('สร้างภาพ PNG ไม่สำเร็จ: '+e.message)}
  el.classList.remove('exporting');
}
function addPngButtons(){
  $$('.card .pngbtn').forEach(b=>b.remove());
  if(!isAdmin)return;
  $$('.card[data-png]').forEach(c=>{
    const ch=c.querySelector('.ch');const b=document.createElement('button');b.className='pngbtn';b.title='บันทึกเป็นภาพ PNG';b.textContent='📷';
    b.onclick=()=>exportPNG(c,c.dataset.png);
    let t=ch.querySelector('.tools');if(!t){t=document.createElement('div');t.className='tools';ch.appendChild(t)}t.appendChild(b);
  });
}
/* ---------- exec tab ---------- */
function dlt(v,pv,type,goodUp){
  if(pv==null||!isFinite(pv))return '';
  let d,txt;
  if(type==='pp'){d=(v-pv)*100;txt=`${Math.abs(d).toFixed(1)} จุด`}
  else{if(!pv)return '';d=(v-pv)/pv*100;txt=`${Math.abs(d).toFixed(1)}%`}
  if(Math.abs(d)<0.05)return '<div class="d">— ไม่เปลี่ยนแปลง เทียบช่วงก่อนหน้า</div>';
  const good=goodUp===null?null:(d>0)===goodUp;
  return `<div class="d ${good===null?'':good?'g':'b'}">${d>0?'▲':'▼'} ${txt} เทียบช่วงก่อนหน้า</div>`;
}
function kpiDefs(s,p){
  const r=(s,k)=>s.n?s.s[k]/s.n:0;
  return [
    {l:'จำนวนรายการ Check-in',v:num(s.n),c:'#e8cb68',d:dlt(s.n,p&&p.n,'abs',null)},
    {l:'% ตรงเวลา',v:pc(r(s,0)),c:SC[0],d:dlt(r(s,0),p&&r(p,0),'pp',true)+(s.n?`<div class="d ${r(s,0)*100>=F.target?'g':'b'}">${r(s,0)*100>=F.target?'✓ ถึงเป้า':'✗ ต่ำกว่าเป้า'} ${F.target}%</div>`:'')},
    {l:'% สาย',v:pc(r(s,1)),c:SC[1],d:dlt(r(s,1),p&&r(p,1),'pp',false)+`<div class="d">${num(s.s[1])} รายการ · เฉลี่ย ${s.lateAvg.toFixed(0)} นาที</div>`},
    {l:'% ไม่ Check in',v:pc(r(s,2)),c:SC[2],d:dlt(r(s,2),p&&r(p,2),'pp',false)+`<div class="d">${num(s.s[2])} รายการ</div>`},
    {l:'% Check in ไม่ตรงจุด',v:pc(r(s,3)),c:SC[3],d:dlt(r(s,3),p&&r(p,3),'pp',false)+`<div class="d">${num(s.s[3])} รายการ</div>`},
    {l:'ค่าปรับรวม (บาท)',v:num(s.fine),c:'#e8cb68',d:dlt(s.fine,p&&p.fine,'abs',false)+`<div class="d">${s.veh.size} คัน · เฉลี่ย ${s.n?(s.fine/s.n).toFixed(1):0} บาท/รายการ</div>`}
  ];
}
function renderKPI(){$('#kpis').innerHTML=kpiDefs(sum,psum).map((k,i)=>`<div class="kpi${i===1?' hero1':''}" style="--kc:${k.c}"><div class="l">${k.l}</div><div class="v">${k.v}</div>${k.d}</div>`).join('')}

function buckets(g){
  const out=[];
  if(g==='day'){for(let i=F.d0;i<=F.d1;i++)out.push({l:`${fmtDs(i)} (${TH_D[dInfo[i].dow]})`,i0:i,i1:i})}
  else{const key=g==='week'?weekOf:i=>dInfo[i].y*100+dInfo[i].m;let c=null;
    for(let i=F.d0;i<=F.d1;i++){const k=key(i);if(!c||c.k!==k){c={k,i0:i,i1:i};out.push(c)}c.i1=i}
    out.forEach(b=>b.l=g==='week'?`${fmtDs(b.i0)}–${fmtDs(b.i1)}`:`${TH_M[dInfo[b.i0].m-1]} ${dInfo[b.i0].y}`)}
  return out;
}
function bucketAgg(rows,B){
  const map=new Int16Array(N).fill(-1);B.forEach((b,bi)=>{for(let i=b.i0;i<=b.i1;i++)map[i]=bi});
  const A=B.map(()=>({n:0,s:[0,0,0,0],fine:0}));
  for(const r of rows){const a=A[map[r[0]]];a.n++;a.s[r[9]]++;a.fine+=fineOf(r)}
  return A;
}
function renderTrend(){
  const g=$('#trGran').value,m=$('#trMet').value,B=buckets(g),A=bucketAgg(cur,B);
  const labels=B.map(b=>b.l);let cfg;
  const base={maintainAspectRatio:false,animation:{duration:250},onHover:hover,
    onClick:(e,els)=>{if(els.length){const b=B[els[0].index];F.d0=b.i0;F.d1=b.i1;update()}},
    plugins:{legend:{display:m==='mix'||m==='ontime',position:'bottom',labels:{boxWidth:10,boxHeight:10}}},scales:{x:{grid:{display:false},ticks:{maxRotation:60,autoSkipPadding:10}},y:{beginAtZero:true}}};
  if(m==='ontime'){
    const v=A.map(a=>a.n?a.s[0]/a.n*100:null),mn=Math.min(...v.filter(x=>x!=null),F.target);
    base.scales.y={min:Math.max(0,Math.floor((mn-8)/5)*5),max:100,ticks:{callback:x=>x+'%'}};
    cfg={type:'line',data:{labels,datasets:[
      {label:'% ตรงเวลา',data:v,borderColor:SC[0],backgroundColor:'rgba(30,79,163,.12)',fill:true,tension:.25,pointRadius:B.length>40?2:4,pointHoverRadius:6,spanGaps:true},
      {label:`เป้าหมาย ${F.target}%`,data:B.map(()=>F.target),borderColor:'#c9a227',borderDash:[6,5],pointRadius:0,borderWidth:1.5}]},options:base};
    base.plugins.tooltip={callbacks:{label:c=>c.datasetIndex?c.dataset.label:`% ตรงเวลา: ${c.parsed.y.toFixed(1)}% (${num(A[c.dataIndex].s[0])}/${num(A[c.dataIndex].n)})`}};
  }else if(m==='mix'){
    base.scales.x.stacked=true;base.scales.y={stacked:true,max:100,ticks:{callback:x=>x+'%'}};
    cfg={type:'bar',data:{labels,datasets:SHORT.map((l,k)=>({label:l,data:A.map(a=>a.n?a.s[k]/a.n*100:0),counts:A.map(a=>a.s[k]),backgroundColor:SC[k]}))},options:base};
    base.plugins.tooltip={callbacks:{label:c=>`${c.dataset.label}: ${c.parsed.y.toFixed(1)}% (${num(c.dataset.counts[c.dataIndex])})`}};
  }else{
    const f=m==='fine';
    cfg={type:'bar',data:{labels,datasets:[{label:f?'ค่าปรับ (บาท)':'จำนวนรายการ',data:A.map(a=>f?a.fine:a.n),backgroundColor:f?'#c9a227':'#143a73',borderRadius:3}]},options:base};
    base.plugins.tooltip={callbacks:{label:c=>`${c.dataset.label}: ${num(c.parsed.y)}`}};
  }
  mk('trend','cTrend',cfg);
}
const centerPlugin={id:'center',afterDraw(c){
  const t=c.config.options.centerText;if(!t)return;const {ctx,chartArea:a}=c;const x=(a.left+a.right)/2,y=(a.top+a.bottom)/2;
  ctx.save();ctx.textAlign='center';ctx.fillStyle=css('--ink');ctx.font="700 26px 'Prompt','Sarabun',sans-serif";ctx.fillText(t[0],x,y+4);
  ctx.font="12px 'Sarabun','Noto Sans Thai',sans-serif";ctx.fillStyle=css('--mute');ctx.fillText(t[1],x,y+22);ctx.restore()}};
function renderStatus(){
  const s=summ(noSt),sel=F.st;
  mk('status','cStatus',{type:'doughnut',plugins:[centerPlugin],data:{labels:SHORT,datasets:[{data:s.s,backgroundColor:SC.map((c,i)=>sel.size&&!sel.has(i)?c+'44':c),borderWidth:2,borderColor:css('--card')}]},
    options:{maintainAspectRatio:false,cutout:'62%',onHover:hover,onClick:(e,els)=>{if(els.length)toggle(F.st,els[0].index)},animation:{duration:250},
      centerText:[s.n?pc(s.s[0]/s.n):'—','ตรงเวลา'],
      plugins:{legend:{position:'bottom',labels:{boxWidth:10,boxHeight:10}},tooltip:{callbacks:{label:c=>`${c.label}: ${num(c.parsed)} (${s.n?pc(c.parsed/s.n):'0%'})`}}}}});
}
function pctDelta(a,b,field){return ((a[field]||0)-(b[field]||0))}
function insights(rows,s,p){
  const out=[];if(!s.n)return [{t:'ไม่มีข้อมูลตามตัวกรองที่เลือก'}];
  const ok=s.s[0]/s.n;
  let t=`ภาพรวม: ตรงเวลา ${pc(ok)} จาก ${num(s.n)} รายการ`;
  if(p&&p.n){const d=(ok-p.s[0]/p.n)*100;t+=` — ${d>=0?'ดีขึ้น':'แย่ลง'} ${Math.abs(d).toFixed(1)} จุด เทียบช่วงก่อนหน้า`}
  t+=ok*100>=F.target?` (ถึงเป้า ${F.target}%)`:` (ต่ำกว่าเป้า ${F.target}% อยู่ ${(F.target-ok*100).toFixed(1)} จุด)`;
  out.push({t,c:ok*100>=F.target?SC[0]:SC[2]});
  const prob=s.n-s.s[0];
  if(prob){const mix=[1,2,3].map(k=>[k,s.s[k]]).sort((a,b)=>b[1]-a[1]);
    out.push({t:`รายการไม่ตรงเวลา ${num(prob)} รายการ — ประเภทปัญหาหลักคือ "${SHORT[mix[0][0]]}" ${pc(mix[0][1]/prob,0)} ตามด้วย "${SHORT[mix[1][0]]}" ${pc(mix[1][1]/prob,0)}`,c:SC[1]})}
  const z=[...groupBy(rows,r=>dcZone[r[1]]).entries()].filter(([,a])=>a.n>=50).sort((a,b)=>a[1].s[0]/a[1].n-b[1].s[0]/b[1].n);
  if(z.length>1){const w=z[0],b=z[z.length-1];out.push({t:`โซนต่ำสุด: ${w[0]} (${pc(w[1].s[0]/w[1].n)}) · โซนสูงสุด: ${b[0]} (${pc(b[1].s[0]/b[1].n)})`,c:SC[3]})}
  const d=[...groupBy(rows,r=>r[1]).entries()].filter(([k])=>!dcHide[k]).sort((a,b)=>b[1].fine-a[1].fine);
  if(d.length&&sum.fine){const top5=d.slice(0,5).reduce((x,y)=>x+y[1].fine,0);out.push({t:`ค่าปรับรวม ${num(s.fine)} บาท — DC ที่ถูกปรับสูงสุดคือ ${dcName[d[0][0]]} (${num(d[0][1].fine)} บาท) และ 5 อันดับแรกรวมกันคิดเป็น ${pc(top5/s.fine,0)} ของทั้งหมด`,c:'#c9a227'})}
  const dd=[...groupBy(rows,r=>r[0]).entries()].filter(([,a])=>a.n>=50).sort((a,b)=>a[1].s[0]/a[1].n-b[1].s[0]/b[1].n);
  if(dd.length>1)out.push({t:`วันที่ตรงเวลาต่ำสุด: ${fmtD(dd[0][0])} (${TH_D[dInfo[dd[0][0]].dow]}) ${pc(dd[0][1].s[0]/dd[0][1].n)} · วันที่สูงสุด: ${fmtD(dd[dd.length-1][0])} ${pc(dd[dd.length-1][1].s[0]/dd[dd.length-1][1].n)}`,c:SC[2]});
  const ms=[...groupBy(rows,r=>dInfo[r[0]].y*100+dInfo[r[0]].m).entries()].sort((a,b)=>a[0]-b[0]);
  if(ms.length>1){const a=ms[0],b=ms[ms.length-1];const lab=k=>TH_M[k%100-1];const dd2=(b[1].s[0]/b[1].n-a[1].s[0]/a[1].n)*100;
    out.push({t:`แนวโน้มรายเดือน: ${lab(a[0])} ${pc(a[1].s[0]/a[1].n)} → ${lab(b[0])} ${pc(b[1].s[0]/b[1].n)} (${dd2>=0?'+':''}${dd2.toFixed(1)} จุด)`,c:dd2>=0?SC[0]:SC[2]})}
  const nr=s.s[2]?rows.filter(r=>r[9]===2&&r[11]!==r[10]).length:0;
  return out;
}
function renderInsights(){$('#insights').innerHTML=insights(cur,sum,psum).map(x=>`<li style="--dot:${x.c||'var(--acc)'}">${esc(x.t)}</li>`).join('')}
function renderZone(){
  const m=groupBy(cur,r=>dcZone[r[1]]);
  const list=[...m.entries()].sort((a,b)=>a[1].s[0]/a[1].n-b[1].s[0]/b[1].n);
  $('#zoneWrap').style.height=Math.max(160,list.length*30+70)+'px';
  stackH('zone','cZone',list.map(([z,a])=>[`${z} (${num(a.n)})`,a]),i=>toggle(F.zone,list[i][0]));
}
function renderDC(){
  const met=$('#dcMet').value,N_=+$('#dcN').value,m=groupBy(cur,r=>r[1]);
  const val={ontimeLow:a=>a.s[0]/a.n*100,fine:a=>a.fine,noci:a=>a.s[2]/a.n*100,late:a=>a.s[1]/a.n*100,off:a=>a.s[3]/a.n*100,n:a=>a.n}[met];
  const pct=met!=='fine'&&met!=='n';
  let list=[...m.entries()].filter(([k,a])=>!dcHide[k]&&(!pct||a.n>=30));
  list.sort((a,b)=>met==='ontimeLow'?val(a[1])-val(b[1]):val(b[1])-val(a[1]));list=list.slice(0,N_);
  $('#dcWrap').style.height=Math.max(160,list.length*24+60)+'px';
  const col={fine:'#c9a227',noci:SC[2],late:SC[1],off:SC[3],n:'#143a73'};
  const colors=list.map(([,a])=>met==='ontimeLow'?(val(a)>=F.target?SC[0]:val(a)>=F.target-10?SC[1]:SC[2]):col[met]);
  mk('dc','cDC',{type:'bar',data:{labels:list.map(([i])=>dcName[i]),datasets:[{data:list.map(([,a])=>+val(a).toFixed(1)),backgroundColor:colors,borderRadius:3}]},
    options:{indexAxis:'y',maintainAspectRatio:false,animation:{duration:250},onHover:hover,onClick:(e,els)=>{if(els.length)toggle(F.dc,list[els[0].index][0])},
      scales:{x:{ticks:{callback:v=>pct?v+'%':num(v)}},y:{grid:{display:false},ticks:{autoSkip:false}}},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>{const a=list[c.dataIndex][1];return [`${pct?c.parsed.x.toFixed(1)+'%':num(c.parsed.x)}`,`รายการ ${num(a.n)} · ตรงเวลา ${pc(a.s[0]/a.n)} · ค่าปรับ ${num(a.fine)}`]}}}}}});
}
function hsl(p,a=1){const t=Math.max(0,Math.min(1,(p-.4)/.6)),c1=[192,73,90],c2=[232,203,104],c3=[30,79,163];const [A,B,u]=t<.5?[c1,c2,t*2]:[c2,c3,(t-.5)*2];return `rgba(${A.map((x,i)=>Math.round(x+(B[i]-x)*u)).join(',')},${a})`}
function renderHeat(){
  const cell=Array.from({length:N},()=>({n:0,ok:0}));for(const r of cur){const c=cell[r[0]];c.n++;if(r[9]===0)c.ok++}
  const order=[1,2,3,4,5,6,0];let h=`<div></div>`;
  for(let w=0;w<W;w++){const i=Math.max(0,w*7-mon0);h+=`<div class="lab">${dInfo[i].d}/${dInfo[i].m}</div>`}
  order.forEach((dw,ri)=>{h+=`<div class="lab">${TH_D[dw]}</div>`;
    for(let w=0;w<W;w++){const i=w*7+ri-mon0;
      if(i<0||i>=N){h+=`<div></div>`;continue}
      const c=cell[i],inR=i>=F.d0&&i<=F.d1&&c.n>0;
      h+=inR?`<div class="cell" data-i="${i}" style="background:${hsl(c.ok/c.n)}" title="${fmtD(i)} · ตรงเวลา ${pc(c.ok/c.n)} (${c.ok}/${c.n})"></div>`:`<div class="cell off" title="${fmtD(i)} (นอกช่วง/ไม่มีข้อมูล)"></div>`}});
  const el=$('#hm');el.style.setProperty('--w',W);el.innerHTML=h;
  el.onclick=e=>{const c=e.target.closest('.cell[data-i]');if(c)dayDrawer(+c.dataset.i)};
}
function renderTypes(){
  const gp=groupBy(cur,r=>r[2]),gk=groupBy(cur,r=>r[3]),hd=t=>[t,{n:0,s:[0,0,0,0]}];
  const ep=[...gp.entries()].map(([k,a])=>[`${ptShort[k]} (${num(a.n)})`,a,k]),ek=[...gk.entries()].map(([k,a])=>[`${kindShort[k]} (${num(a.n)})`,a,k]);
  const ent=[hd('— ประเภทรถ —'),...ep.map(e=>[e[0],e[1]]),hd('— ชนิดรถ —'),...ek.map(e=>[e[0],e[1]])];
  const hdr=new Set([0,ep.length+1]);
  $('#typeWrap').style.height=(ent.length*36+80)+'px';
  stackH('type','cType',ent,i=>{if(i>=1&&i<=ep.length)toggle(F.pt,ep[i-1][2]);else if(i>ep.length+1)toggle(F.kind,ek[i-ep.length-2][2])},{hdr,tickColor:i=>hdr.has(i)?'#c9a227':Chart.defaults.color});
}
function renderDist(){
  const L=[[16,30,'16–30 นาที'],[31,60,'31–60 นาที'],[61,120,'1–2 ชม.'],[121,240,'2–4 ชม.'],[241,1e9,'> 4 ชม.']];
  const la=L.map(()=>({n:0,fine:0}));for(const r of cur)if(r[9]===1){const k=L.findIndex(x=>r[7]>=x[0]&&r[7]<=x[1]);if(k>=0){la[k].n++;la[k].fine+=fineOf(r)}}
  mk('late','cLate',{type:'bar',data:{labels:L.map(x=>x[2]),datasets:[{label:'จำนวนรายการสาย',data:la.map(a=>a.n),backgroundColor:SC[1],borderRadius:4,yAxisID:'y'},{label:'ค่าปรับ (บาท)',data:la.map(a=>a.fine),type:'line',borderColor:'#c9a227',backgroundColor:'#c9a227',yAxisID:'y1',tension:.2}]},
    options:{maintainAspectRatio:false,animation:{duration:250},scales:{x:{grid:{display:false}},y:{beginAtZero:true,title:{display:true,text:'รายการ'}},y1:{position:'right',beginAtZero:true,grid:{display:false},title:{display:true,text:'บาท'}}},plugins:{legend:{position:'bottom',labels:{boxWidth:10,boxHeight:10}}}}});
  const O=[[0,3,'< 3 กม.'],[3,5,'3–5 กม.'],[5,10,'5–10 กม.'],[10,20,'10–20 กม.'],[20,1e9,'> 20 กม.']];
  const oa=O.map(()=>0);for(const r of cur)if(r[9]===3&&r[8]!=null){const k=O.findIndex(x=>r[8]>=x[0]&&r[8]<x[1]);if(k>=0)oa[k]++}
  mk('off','cOff',{type:'bar',data:{labels:O.map(x=>x[2]),datasets:[{label:'รายการ',data:oa,backgroundColor:SC[3],borderRadius:4}]},options:{maintainAspectRatio:false,animation:{duration:250},scales:{x:{grid:{display:false}},y:{beginAtZero:true}},plugins:{legend:{display:false}}}});
}
function monthZoneData(){
  const rows=getRows(0,N-1),dcMode=!!(F.region.size||F.zone.size||F.dc.size),mkey=r=>dInfo[r[0]].y*100+dInfo[r[0]].m;
  const kf=dcMode?r=>r[1]:r=>dcZone[r[1]];
  const g=groupBy(rows,r=>kf(r)+'|'+mkey(r)),gz=groupBy(rows,kf),gm=groupBy(rows,mkey);
  const keys=dcMode?[...gz.keys()].filter(k=>!dcHide[k]).sort((a,b)=>a-b):D.zoneOrder.filter(z=>zoneReg[z]&&gz.get(z));
  return {dcMode,keys,label:dcMode?k=>dcName[k]:k=>k,g,gz,gm,rows};
}
function renderMZ(){
  const {dcMode,keys,label,g,gz,gm,rows}=monthZoneData();
  $('#mzTitle').textContent=dcMode?'เทียบรายเดือน × DC (% ตรงเวลา)':'เทียบรายเดือน × โซน (% ตรงเวลา)';
  $('#mzSub').textContent=dcMode?'แสดง DC ตามโซน/ภาค/DC ที่เลือก · ไม่ผูกกับช่วงวันที่ · คลิกแถวเพื่อกรอง DC':'ไม่ผูกกับช่วงวันที่ แต่ใช้ตัวกรองอื่นที่เลือกไว้ · เลือกโซน/ภาคเพื่อดูรายชื่อ DC';
  const cell=a=>a&&a.n?`<td class="num" style="background:${hsl(a.s[0]/a.n,.28)}">${pc(a.s[0]/a.n)}<div class="note-s">${num(a.n)}</div></td>`:'<td class="num">—</td>';
  const dl=(a,b)=>{if(!(a&&b&&a.n&&b.n))return '<td></td>';const d=(b.s[0]/b.n-a.s[0]/a.n)*100;return `<td class="num" style="color:${d>=0?SC[0]:SC[2]};font-weight:600">${d>=0?'▲ +':'▼ '}${d.toFixed(1)} จุด</td>`};
  const fm=months[0].k,lm=months[months.length-1].k;
  let h=`<thead><tr><th>${dcMode?'DC':'โซน'}</th>${months.map(m=>`<th class="num">${TH_M[m.m-1]} ${m.y}</th>`).join('')}<th class="num">รวม</th><th class="num">เดือนล่าสุด vs แรก</th></tr></thead><tbody>`;
  keys.forEach(k=>{h+=`<tr class="cl" data-k="${esc(k)}"><td><b>${esc(label(k))}</b></td>${months.map(m=>cell(g.get(k+'|'+m.k))).join('')}${cell(gz.get(k))}${dl(g.get(k+'|'+fm),g.get(k+'|'+lm))}</tr>`});
  h+=`<tr><td><b>${dcMode?'รวมที่เลือก':'รวมทุกโซน'}</b></td>${months.map(m=>cell(gm.get(m.k))).join('')}${cell(summ0(rows))}${dl(gm.get(fm),gm.get(lm))}</tr></tbody>`;
  const t=$('#mzTbl');t.innerHTML=h;t.onclick=e=>{const r=e.target.closest('tr[data-k]');if(r)dcMode?toggle(F.dc,+r.dataset.k):toggle(F.zone,r.dataset.k)};
}
function summ0(rows){const a={n:rows.length,s:[0,0,0,0]};for(const r of rows)a.s[r[9]]++;return a}
function renderExec(){
  renderKPI();renderTrend();renderStatus();renderZone();renderDC();renderHeat();renderTypes();renderDist();renderMZ();
  $$('#tab-exec .pngfoot').forEach(f=>f.textContent='');
}
/* ---------- data table ---------- */
class DT{
  constructor(host,cols,o={}){this.host=host;this.cols=cols;this.o=Object.assign({pageSize:50,csv:'data'},o);this.sort=o.sort||{k:cols[0].k,dir:-1};this.page=0;this.data=[]}
  set(d){this.data=d;this.page=0;this.doSort();this.render()}
  doSort(){const c=this.cols.find(x=>x.k===this.sort.k)||this.cols[0],dir=this.sort.dir,v=x=>{const y=c.val(x);return y==null?-Infinity:y};
    this.data=[...this.data].sort((a,b)=>{const x=v(a),y=v(b);return x>y?dir:x<y?-dir:0})}
  render(){
    const {cols,sort,o}=this,ps=o.pageSize,tp=Math.max(1,Math.ceil(this.data.length/ps));if(this.page>=tp)this.page=tp-1;
    const sl=this.slice=this.data.slice(this.page*ps,(this.page+1)*ps);
    let h=`<div class="tw"><table class="tbl"><thead><tr>${cols.map(c=>`<th data-k="${c.k}" class="${c.num?'num ':''}${c.k===sort.k?'s':''}" data-d="${sort.dir<0?'▼':'▲'}">${c.l}</th>`).join('')}</tr></thead><tbody>`;
    h+=sl.map((r,i)=>`<tr class="${o.onRow?'cl':''}" data-i="${i}">${cols.map(c=>`<td class="${c.num?'num':''}">${c.fmt?c.fmt(r):esc(c.val(r)??'')}</td>`).join('')}</tr>`).join('');
    h+=`</tbody></table></div><div class="pager"><button class="btn" data-p="-1">‹ ก่อนหน้า</button><span>หน้า ${this.page+1}/${tp} · ${num(this.data.length)} แถว</span><button class="btn" data-p="1">ถัดไป ›</button>${isAdmin?'<button class="btn" data-csv="1">⬇ CSV</button>':''}</div>`;
    this.host.innerHTML=h;
    this.host.onclick=e=>{
      const th=e.target.closest('th[data-k]');if(th){const k=th.dataset.k;this.sort=this.sort.k===k?{k,dir:-this.sort.dir}:{k,dir:-1};this.page=0;this.doSort();this.render();return}
      const pb=e.target.closest('[data-p]');if(pb){this.page=Math.max(0,this.page+ +pb.dataset.p);this.render();return}
      if(e.target.closest('[data-csv]')){this.csv();return}
      const pl=e.target.closest('[data-plate]');if(pl){vehDrawer(+pl.dataset.plate);return}
      const tr=e.target.closest('tr[data-i]');if(tr&&o.onRow)o.onRow(this.slice[+tr.dataset.i]);
    };
  }
  csv(){
    if(!isAdmin)return;
    const q=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
    const lines=[this.cols.map(c=>q(c.l.replace(/<[^>]+>/g,''))).join(',')];
    for(const r of this.data)lines.push(this.cols.map(c=>q(c.csv?c.csv(r):c.val(r))).join(','));
    download(URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'})),`NIMEX-${this.o.csv}-${stamp()}.csv`);
  }
}
const badge=k=>`<span class="badge" style="background:${SC[k]};color:${k===1?'#2a2000':'#fff'}">${SHORT[k]}</span>`;
const plink=p=>`<span class="link" data-plate="${p}">${esc(D.plates[p])}</span>`;
const barCell=(a)=>{const p=a.n?a.s[0]/a.n:0;return `${pc(p)}<span class="mb" style="width:${Math.round(p*60)}px;background:${hsl(p)}"></span>`};

/* ---------- ops tab ---------- */
let opsView='daily',vehFilter='all';
const dtDaily=new DT($('#opsHost'),[
  {k:'d',l:'วันที่',val:r=>r.i,fmt:r=>`${fmtD(r.i)} (${TH_D[dInfo[r.i].dow]})`},
  {k:'n',l:'รายการ',num:1,val:r=>r.n},
  {k:'ok',l:'% ตรงเวลา',num:1,val:r=>r.n?r.s[0]/r.n:0,fmt:barCell},
  {k:'late',l:'สาย',num:1,val:r=>r.s[1]},{k:'no',l:'ไม่ Check in',num:1,val:r=>r.s[2]},{k:'off',l:'ไม่ตรงจุด',num:1,val:r=>r.s[3]},
  {k:'fine',l:'ค่าปรับ (บาท)',num:1,val:r=>r.fine,fmt:r=>num(r.fine)}
],{sort:{k:'d',dir:-1},pageSize:100,csv:'daily',onRow:r=>dayDrawer(r.i)});
dtDaily.cols[0].csv=r=>D.dates[r.i];
function vehAgg(rows){
  const m=new Map();
  for(const r of rows){let a=m.get(r[4]);if(!a){a={p:r[4],n:0,s:[0,0,0,0],fine:0,dc:new Map(),pt:r[2]};m.set(r[4],a)}a.n++;a.s[r[9]]++;a.fine+=fineOf(r);a.dc.set(r[1],(a.dc.get(r[1])||0)+1)}
  return [...m.values()].map(a=>{let b=-1,bc=0;for(const [d,c] of a.dc)if(c>bc){b=d;bc=c}a.main=b;a.iss=a.n-a.s[0];return a});
}
const dtVeh=new DT($('#opsHost'),[
  {k:'p',l:'ทะเบียน',val:a=>D.plates[a.p],fmt:a=>plink(a.p)},
  {k:'c',l:'รหัสรถ',val:a=>D.vcode[a.p]},
  {k:'dc',l:'DC หลัก',val:a=>dcName[a.main]},
  {k:'pt',l:'ประเภท',val:a=>ptShort[a.pt]},
  {k:'n',l:'รายการ',num:1,val:a=>a.n},
  {k:'ok',l:'% ตรงเวลา',num:1,val:a=>a.s[0]/a.n,fmt:barCell},
  {k:'iss',l:'ปัญหารวม',num:1,val:a=>a.iss},
  {k:'late',l:'สาย',num:1,val:a=>a.s[1]},{k:'no',l:'ไม่ Check in',num:1,val:a=>a.s[2]},{k:'off',l:'ไม่ตรงจุด',num:1,val:a=>a.s[3]},
  {k:'fine',l:'ค่าปรับ (บาท)',num:1,val:a=>a.fine,fmt:a=>num(a.fine)}
],{sort:{k:'fine',dir:-1},pageSize:50,csv:'vehicles',onRow:null});
const dtRec=new DT($('#opsHost'),[
  {k:'d',l:'วันที่',val:r=>r[0],fmt:r=>fmtD(r[0]),csv:r=>D.dates[r[0]]},
  {k:'dc',l:'DC',val:r=>dcName[r[1]]},
  {k:'p',l:'ทะเบียน',val:r=>D.plates[r[4]],fmt:r=>plink(r[4])},
  {k:'pt',l:'ประเภท',val:r=>ptShort[r[2]]},{k:'kd',l:'ชนิด',val:r=>kindShort[r[3]]},
  {k:'pl',l:'กำหนด',val:r=>D.shifts[r[5]]},{k:'ci',l:'เวลา Check-in',val:r=>r[6]==null?null:r[6],fmt:r=>hhmm(r[6]),csv:r=>hhmm(r[6])},
  {k:'df',l:'ผลต่าง (นาที)',num:1,val:r=>r[7]},{k:'ds',l:'ระยะห่าง (กม.)',num:1,val:r=>r[8]},
  {k:'st',l:'สถานะ',val:r=>SHORT[r[9]],fmt:r=>badge(r[9])},
  {k:'fn',l:'ค่าปรับ',num:1,val:r=>fineOf(r)}
],{sort:{k:'d',dir:-1},pageSize:100,csv:'records',onRow:null});
function renderOps(){
  $$('#opsSeg button').forEach(b=>b.classList.toggle('on',b.dataset.v===opsView));
  const tools=$('#opsTools'),hint=$('#opsHint');
  const dt={daily:dtDaily,veh:dtVeh,rec:dtRec}[opsView];
  if(opsView==='daily'){
    hint.textContent='คลิกที่แถวเพื่อดูรายละเอียดของวันนั้น (DC ที่มีปัญหา + รายการผิดปกติ) · คลิกหัวคอลัมน์เพื่อเรียงลำดับ';
    tools.innerHTML='';const m=groupBy(cur,r=>r[0]);dtDaily.set([...m.entries()].map(([i,a])=>Object.assign({i},a)));
  }else if(opsView==='veh'){
    hint.textContent='คลิกทะเบียนเพื่อดูประวัติรายคันตลอดช่วงข้อมูล · ใช้ช่องค้นหาด้านบนเพื่อหาทะเบียน/รหัสรถ';
    tools.innerHTML=`<select id="vehF" class="sel"><option value="all">รถทั้งหมด</option><option value="1">มีปัญหา ≥ 1 ครั้ง</option><option value="3">มีปัญหา ≥ 3 ครั้ง</option><option value="5">มีปัญหา ≥ 5 ครั้ง</option></select>`;
    $('#vehF').value=vehFilter;$('#vehF').onchange=e=>{vehFilter=e.target.value;renderOps()};
    let a=vehAgg(vis(cur));if(vehFilter!=='all')a=a.filter(x=>x.iss>=+vehFilter);dtVeh.set(a);
  }else{
    hint.textContent='รายการดิบตามตัวกรอง · คลิกทะเบียนเพื่อดูประวัติรายคัน';tools.innerHTML='';dtRec.set(vis(cur));
  }
}
$('#opsSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;opsView=b.dataset.v;renderOps()};

/* ---------- drawers ---------- */
function openDrawer(title,sub,html,name){
  $('#dTitle').textContent=title;$('#dSub').textContent=sub;$('#dBody').innerHTML=html+'<div class="pngfoot"></div>';
  $('#dPng').onclick=()=>exportPNG($('#dBody'),name,css('--bg'));
  $('#drawer').classList.add('on');$('#back').classList.add('on');
}
function closeDrawer(){$('#drawer').classList.remove('on');if(!$('#modal').classList.contains('on'))$('#back').classList.remove('on')}
$('#dClose').onclick=closeDrawer;$('#back').onclick=()=>{closeDrawer()};
$('#dBody').onclick=e=>{const pl=e.target.closest('[data-plate]');if(pl)vehDrawer(+pl.dataset.plate)};
const miniKpi=(s)=>`<div class="kpis mini" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:12px">${[['รายการ',num(s.n),'#2563eb'],['% ตรงเวลา',s.n?pc(s.s[0]/s.n):'—',SC[0]],['สาย',s.s[1],SC[1]],['ไม่ Check in',s.s[2],SC[2]],['ไม่ตรงจุด',s.s[3],SC[3]],['ค่าปรับ',num(s.fine),'#c9a227']].map(k=>`<div class="kpi" style="--kc:${k[2]};padding:8px 10px"><div class="l">${k[0]}</div><div class="v" style="font-size:20px">${k[1]}</div></div>`).join('')}</div>`;
function dayDrawer(i){
  const rows=getRows(i,i),s=summ(rows);
  const byDC=[...groupBy(rows,r=>r[1]).entries()].filter(([d])=>!dcHide[d]).map(([d,a])=>({d,...a,iss:a.n-a.s[0]})).sort((a,b)=>b.iss-a.iss).slice(0,12);
  const ex=vis(rows).filter(r=>r[9]!==0).sort((a,b)=>dcName[a[1]].localeCompare(dcName[b[1]],'th')||a[9]-b[9]);
  let h=miniKpi(s);
  h+=`<h3 style="margin:14px 0 6px">DC ที่มีปัญหามากสุดของวัน</h3><div class="tw"><table class="tbl"><thead><tr><th>DC</th><th class="num">รายการ</th><th class="num">% ตรงเวลา</th><th class="num">ปัญหา</th><th class="num">ค่าปรับ</th></tr></thead><tbody>${byDC.map(a=>`<tr><td>${esc(dcName[a.d])}</td><td class="num">${a.n}</td><td class="num">${pc(a.s[0]/a.n)}</td><td class="num">${a.iss}</td><td class="num">${num(a.fine)}</td></tr>`).join('')}</tbody></table></div>`;
  h+=`<h3 style="margin:16px 0 6px">รายการผิดปกติ (${ex.length})</h3><div class="tw"><table class="tbl"><thead><tr><th>DC</th><th>ทะเบียน</th><th>สถานะ</th><th class="num">ผลต่าง (นาที)</th><th class="num">ห่าง (กม.)</th><th class="num">ปรับ</th></tr></thead><tbody>${ex.map(r=>`<tr><td>${esc(dcName[r[1]])}</td><td>${plink(r[4])}</td><td>${badge(r[9])}</td><td class="num">${r[7]??'—'}</td><td class="num">${r[8]??'—'}</td><td class="num">${fineOf(r)}</td></tr>`).join('')}</tbody></table></div>`;
  openDrawer(`${fmtD(i)} (วัน${['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'][dInfo[i].dow]})`,'ตามตัวกรองปัจจุบัน (ยกเว้นช่วงวันที่)',h,'day-'+D.dates[i]);
}
function vehDrawer(p){
  const rows=R.filter(r=>r[4]===p&&!dcHide[r[1]]),s=summ(rows),a=vehAgg(rows)[0];
  const worst=new Array(N).fill(-1);const pri=[0,2,3,4];// rank: ok<late<off<no
  const rank=[1,3,2,4];rows.forEach(r=>{const d=r[0];if(worst[d]<0||rank[r[9]]>rank[worst[d]])worst[d]=r[9]});
  let cal='';for(let k=0;k<W*7;k++){const i=k-mon0;if(i<0||i>=N){cal+='<div style="background:transparent"></div>';continue}
    cal+=`<div style="${worst[i]>=0?`background:${SC[worst[i]]}`:''}" title="${fmtD(i)} · ${worst[i]>=0?SHORT[worst[i]]:'ไม่มีรายการ'}"></div>`}
  const ex=rows.filter(r=>r[9]!==0).sort((x,y)=>y[0]-x[0]);
  let h=miniKpi(s)+`<h3 style="margin:14px 0 6px">ปฏิทินสถานะรายวัน</h3><div class="card" style="padding:10px"><div class="cal" style="--w:${W}">${cal}</div>
   <div class="legend">${SHORT.map((l,k)=>`<span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${SC[k]};margin-right:4px"></i>${l}</span>`).join('')}<span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--soft);margin-right:4px"></i>ไม่มีรายการ</span></div></div>
   <h3 style="margin:16px 0 6px">รายการผิดปกติ (${ex.length})</h3><div class="tw"><table class="tbl"><thead><tr><th>วันที่</th><th>DC</th><th>สถานะ</th><th class="num">ผลต่าง (นาที)</th><th class="num">ห่าง (กม.)</th><th class="num">ปรับ</th></tr></thead><tbody>${ex.map(r=>`<tr><td>${fmtD(r[0])}</td><td>${esc(dcName[r[1]])}</td><td>${badge(r[9])}</td><td class="num">${r[7]??'—'}</td><td class="num">${r[8]??'—'}</td><td class="num">${fineOf(r)}</td></tr>`).join('')}</tbody></table></div>
   <div class="note-s" style="margin-top:8px">ประวัติรายคันแสดงทั้งช่วงข้อมูล ไม่ผูกกับตัวกรองด้านบน</div>`;
  openDrawer(`${D.plates[p]} · รหัส ${D.vcode[p]}`,`${dcName[a.main]} · ${ptShort[a.pt]}${a.dc.size>1?' · ใช้งานหลาย DC':''}`,h,'vehicle-'+D.plates[p]);
}

/* ---------- summary report ---------- */
const SECS=[['kpi','ตัวเลขหลัก (KPI)'],['insights','ข้อสังเกตเด่น'],['trend','กราฟแนวโน้ม % ตรงเวลา'],['status','สัดส่วนสถานะ'],['zone','ผลงานรายโซน'],['dcBottom','DC ที่ต้องเร่งปรับปรุง (% ตรงเวลาต่ำสุด 10 อันดับ)'],['dcFine','DC ที่ค่าปรับสูงสุด 10 อันดับ'],['vehicles','รถเสี่ยง 10 อันดับ (ค่าปรับสูงสุด)'],['days','วันที่มีปัญหามากสุด 5 อันดับ'],['monthzone','เทียบรายเดือน × โซน']];
const PRESET={exec:['kpi','insights','trend','status','zone','dcBottom','monthzone'],ops:['kpi','status','dcFine','vehicles','days'],all:SECS.map(s=>s[0])};
const secOn=new Set(PRESET.exec);
function tbl(head,rows,nums){return {html:`<table><thead><tr>${head.map((h,i)=>`<th class="${nums.includes(i)?'num':''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${nums.includes(i)?'num':''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`,text:[head.join(' | '),...rows.map(r=>r.join(' | '))].join('\n')}}
function aggRow(label,a){return [label,num(a.n),pc(a.n?a.s[0]/a.n:0),num(a.s[1]),num(a.s[2]),num(a.s[3]),num(a.fine)]}
const AH=['','รายการ','% ตรงเวลา','สาย','ไม่ Check in','ไม่ตรงจุด','ค่าปรับ (บาท)'];
function reportSections(){
  const o={};
  o.kpi=()=>{const k=kpiDefs(sum,psum);return {html:`<div class="rk">${k.map(x=>`<div style="--kc:${x.c}"><span>${x.l}</span><b>${x.v}</b><span>${x.d.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}</span></div>`).join('')}</div>`,text:k.map(x=>`- ${x.l}: ${x.v}`).join('\n')}};
  o.insights=()=>{const l=insights(cur,sum,psum);return {html:`<ul>${l.map(x=>`<li>${esc(x.t)}</li>`).join('')}</ul>`,text:l.map(x=>'- '+x.t).join('\n')}};
  o.trend=()=>{const g=(F.d1-F.d0)>45?'week':'day',B=buckets(g),A=bucketAgg(cur,B);
    return {html:`<canvas id="rc_trend" height="190"></canvas>`,text:`แนวโน้ม % ตรงเวลา (${g==='week'?'รายสัปดาห์':'รายวัน'}): `+B.map((b,i)=>`${b.l} ${A[i].n?(A[i].s[0]/A[i].n*100).toFixed(1):'-'}%`).join(', '),
      after:()=>mk('r_trend','rc_trend',{type:'line',data:{labels:B.map(b=>b.l),datasets:[{label:'% ตรงเวลา',data:A.map(a=>a.n?a.s[0]/a.n*100:null),borderColor:SC[0],backgroundColor:'rgba(30,79,163,.12)',fill:true,tension:.25,pointRadius:2,spanGaps:true},{label:`เป้าหมาย ${F.target}%`,data:B.map(()=>F.target),borderColor:'#c9a227',borderDash:[6,5],pointRadius:0,borderWidth:1.5}]},
        options:{animation:false,color:'#475569',borderColor:'#e2e8f0',scales:{y:{max:100,ticks:{callback:v=>v+'%'}},x:{grid:{display:false},ticks:{maxRotation:50,autoSkipPadding:12}}},plugins:{legend:{position:'bottom',labels:{boxWidth:10,boxHeight:10}}}}})}};
  o.status=()=>{const s=sum;return {html:`<div class="stk">${SHORT.map((l,k)=>`<div style="width:${s.n?s.s[k]/s.n*100:0}%;background:${SC[k]}"></div>`).join('')}</div><div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px">${SHORT.map((l,k)=>`<span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${SC[k]};margin-right:5px"></i>${l} ${num(s.s[k])} (${s.n?pc(s.s[k]/s.n):'0%'})</span>`).join('')}</div>`,text:SHORT.map((l,k)=>`${l}: ${num(s.s[k])} (${s.n?pc(s.s[k]/s.n):'0%'})`).join(' | ')}};
  o.zone=()=>{const l=[...groupBy(cur,r=>dcZone[r[1]]).entries()].sort((a,b)=>a[1].s[0]/a[1].n-b[1].s[0]/b[1].n);const t=tbl(['โซน',...AH.slice(1)],l.map(([z,a])=>aggRow(z,a)),[1,2,3,4,5,6]);return t};
  o.dcBottom=()=>{const l=[...groupBy(cur,r=>r[1]).entries()].filter(([d,a])=>!dcHide[d]&&a.n>=30).sort((a,b)=>a[1].s[0]/a[1].n-b[1].s[0]/b[1].n).slice(0,10);return tbl(['DC',...AH.slice(1)],l.map(([d,a])=>aggRow(dcName[d],a)),[1,2,3,4,5,6])};
  o.dcFine=()=>{const l=[...groupBy(cur,r=>r[1]).entries()].filter(([d])=>!dcHide[d]).sort((a,b)=>b[1].fine-a[1].fine).slice(0,10);return tbl(['DC',...AH.slice(1)],l.map(([d,a])=>aggRow(dcName[d],a)),[1,2,3,4,5,6])};
  o.vehicles=()=>{const l=vehAgg(vis(cur)).sort((a,b)=>b.fine-a.fine||b.iss-a.iss).slice(0,10);return tbl(['ทะเบียน','DC หลัก','รายการ','สาย','ไม่ Check in','ไม่ตรงจุด','ค่าปรับ (บาท)'],l.map(a=>[D.plates[a.p],dcName[a.main],num(a.n),num(a.s[1]),num(a.s[2]),num(a.s[3]),num(a.fine)]),[2,3,4,5,6])};
  o.days=()=>{const l=[...groupBy(cur,r=>r[0]).entries()].filter(([,a])=>a.n>=50).sort((a,b)=>a[1].s[0]/a[1].n-b[1].s[0]/b[1].n).slice(0,5);return tbl(['วันที่',...AH.slice(1)],l.map(([i,a])=>aggRow(`${fmtD(i)} (${TH_D[dInfo[i].dow]})`,a)),[1,2,3,4,5,6])};
  o.monthzone=()=>{const {dcMode,keys,label,g,gz,gm,rows}=monthZoneData();const f=a=>a&&a.n?pc(a.s[0]/a.n):'—';
    const rws=keys.map(k=>[label(k),...months.map(m=>f(g.get(k+'|'+m.k))),f(gz.get(k))]);rws.push([dcMode?'รวมที่เลือก':'รวมทุกโซน',...months.map(m=>f(gm.get(m.k))),f(summ0(rows))]);
    return tbl([dcMode?'DC':'โซน',...months.map(m=>TH_M[m.m-1]+' '+m.y),'รวม'],rws,months.map((_,i)=>i+1).concat([months.length+1]))};
  return o;
}
function renderReport(){
  const S=reportSections(),parts=[],after=[],txt=[];
  const title=$('#repTitle').value.trim()||'สรุปผลการ Check-in';
  const head=`<h1>${esc(title)}</h1><div class="rs">${esc(activeFilterText())}<br>จำนวน ${num(sum.n)} รายการ · ${sum.veh.size} คัน</div>`;
  txt.push(title,activeFilterText(),`จำนวน ${num(sum.n)} รายการ · ${sum.veh.size} คัน`);
  SECS.filter(s=>secOn.has(s[0])).forEach(([id,label])=>{const r=S[id]();parts.push(`<h2>${esc(label)}</h2>${r.html}`);txt.push('\n## '+label+'\n'+r.text);if(r.after)after.push(r.after)});
  const note=$('#repNote').value.trim();
  if(note){parts.push(`<h2>หมายเหตุ / ข้อเสนอแนะ</h2><div class="note">${esc(note)}</div>`);txt.push('\n## หมายเหตุ / ข้อเสนอแนะ\n'+note)}
  if(!secOn.size)parts.push('<p style="color:#94a3b8">เลือกหัวข้ออย่างน้อย 1 หัวข้อทางซ้าย</p>');
  parts.push(`<div class="foot">ข้อมูล NIMEX Check-in · ค่าปรับ${F.fine==='rule'?'คำนวณตามกฎ':'ตามไฟล์'} · สร้างจาก Dashboard เมื่อ ${new Date().toLocaleDateString('th-TH',{dateStyle:'long'})}</div>`);
  $('#report').innerHTML=`<div class="rh">${head}</div><div class="bd">${parts.slice(0,-1).join('')}</div>${parts[parts.length-1]}`;
  Object.keys(CH).filter(k=>k.startsWith('r_')).forEach(k=>{CH[k].destroy();delete CH[k]});
  after.forEach(f=>f());
  renderReport.text=txt.join('\n');
}
function buildSecList(){
  $('#secList').innerHTML=SECS.map(([id,l])=>`<label><input type="checkbox" data-s="${id}" ${secOn.has(id)?'checked':''}>${l}</label>`).join('');
}
function openModal(){if(!isAdmin)return;buildSecList();$('#modal').classList.add('on');$('#back').classList.add('on');renderReport()}
function closeModal(){$('#modal').classList.remove('on');if(!$('#drawer').classList.contains('on'))$('#back').classList.remove('on')}
$('#sumBtn').onclick=openModal;$('#mClose').onclick=closeModal;
$('#secList').onchange=e=>{const id=e.target.dataset.s;e.target.checked?secOn.add(id):secOn.delete(id);renderReport()};
$$('[data-preset]').forEach(b=>b.onclick=()=>{secOn.clear();PRESET[b.dataset.preset].forEach(x=>secOn.add(x));buildSecList();renderReport()});
$('#repTitle').oninput=renderReport;$('#repNote').oninput=renderReport;
$('#repPng').onclick=async()=>{
  $('#repMsg').textContent='กำลังสร้างภาพ...';
  try{const cv=await html2canvas($('#report'),{scale:2,backgroundColor:'#ffffff',logging:false});download(cv.toDataURL('image/png'),`NIMEX-summary-${stamp()}.png`);$('#repMsg').textContent='ดาวน์โหลดแล้ว ✓'}
  catch(e){$('#repMsg').textContent='ไม่สำเร็จ: '+e.message}
};
$('#repCopy').onclick=async()=>{
  const t=renderReport.text||'';
  try{await navigator.clipboard.writeText(t)}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}
  $('#repMsg').textContent='คัดลอกข้อความแล้ว ✓';
};

/* ---------- app shell ---------- */
let tab='exec';
function setTab(t){tab=t;$('#tab-exec').classList.toggle('hide',t!=='exec');$('#tab-ops').classList.toggle('hide',t!=='ops');$$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));update()}
$$('.tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function update(){
  compute();renderFilterUI();
  if(tab==='exec')renderExec();else renderOps();
  if($('#modal').classList.contains('on'))renderReport();
}
$('#trMet').onchange=renderTrend;$('#trGran').onchange=renderTrend;$('#dcMet').onchange=renderDC;$('#dcN').onchange=renderDC;
$('#themeBtn').onclick=()=>{const d=document.documentElement;d.dataset.theme=d.dataset.theme==='dark'?'light':'dark';themeCharts();update()};
$('#pagepng').onclick=()=>{const el=$('#pageMain');document.body.classList.add('pagemode');$('#pageFoot').classList.remove('hide');exportPNG(el,'dashboard-'+tab,css('--bg')).then(()=>{document.body.classList.remove('pagemode');$('#pageFoot').classList.add('hide')})};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#modal').classList.contains('on'))closeModal();else closeDrawer()}});

/* ---------- admin login ---------- */
const ADMIN_HASH=''; /* ไม่ใช้แล้ว: ตรวจรหัสที่ Apps Script */
function rr(v,a){return (v>>>a)|(v<<(32-a))}
function sha256(s){
  const m=Math.pow,mx=m(2,32);let r='',w=[],ab=s.length*8,hash=[],k=[],pc=0,ic={};
  for(let c=2;pc<64;c++)if(!ic[c]){for(let i=0;i<313;i+=c)ic[i]=c;hash[pc]=(m(c,.5)*mx)|0;k[pc++]=(m(c,1/3)*mx)|0}
  s+='\x80';while(s.length%64-56)s+='\x00';
  for(let i=0;i<s.length;i++){const j=s.charCodeAt(i);if(j>>8)return '';w[i>>2]|=j<<((3-i)%4)*8}
  w[w.length]=((ab/mx)|0);w[w.length]=ab;
  for(let j=0;j<w.length;){const Wd=w.slice(j,j+=16),oh=hash;hash=hash.slice(0,8);
    for(let i=0;i<64;i++){const w15=Wd[i-15],w2=Wd[i-2],a=hash[0],e=hash[4];
      const t1=hash[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&hash[5])^(~e&hash[6]))+k[i]+(Wd[i]=(i<16)?Wd[i]:(Wd[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+Wd[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
      const t2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
      hash=[(t1+t2)|0].concat(hash);hash[4]=(hash[4]+t1)|0}
    for(let i=0;i<8;i++)hash[i]=(hash[i]+oh[i])|0}
  for(let i=0;i<8;i++)for(let j=3;j+1;j--){const b=(hash[i]>>(j*8))&255;r+=((b<16)?'0':'')+b.toString(16)}
  return r;
}
let lgFails=0,lgLock=0;
function setAdmin(on){
  isAdmin=on;document.body.classList.toggle('admin',on);
  if(!on){F.fine='file';$('#fineMode').value='file';F.target=90;$('#target').value=90;['login','upl','modal'].forEach(id=>$('#'+id).classList.remove('on'));$('#back').classList.remove('on');closeDrawer()}
  addPngButtons();update();
}
function openLogin(){$('#lgUser').value='';$('#lgPass').value='';$('#lgErr').textContent='';$('#login').classList.add('on');setTimeout(()=>$('#lgPass').focus(),50)}
function tryLogin(){ /* ตรวจรหัสที่ Apps Script (ADMIN_KEY) */
  const p=$('#lgPass').value;if(!p)return;$('#lgErr').textContent='กำลังตรวจรหัส…';
  window.cipAuth(p).then(ok=>{if(ok){$('#lgErr').textContent='';$('#login').classList.remove('on');setAdmin(true)}else{$('#lgErr').textContent='รหัสไม่ถูกต้อง';$('#lgPass').value=''}})
}
$('#sysBtn').onclick=openLogin;$('#lgClose').onclick=()=>$('#login').classList.remove('on');$('#lgGo').onclick=tryLogin;
$('#lgPass').onkeydown=e=>{if(e.key==='Enter')tryLogin()};$('#lgUser').onkeydown=e=>{if(e.key==='Enter')$('#lgPass').focus()};
$('#logoutBtn').onclick=()=>{setAdmin(false);window.cipLogout()};

/* ---------- dataset build / import ---------- */
const nz=s=>String(s==null?'':s).replace(/\s+/g,' ').trim();
const normH=s=>String(s==null?'':s).toLowerCase().replace(/[\s\-_.]/g,'');
function ruleFine(st,diff){return st===2?100:st===1?(diff<=30?100:diff<=60?200:300):0}
function decodeRecords(d){return d.rows.map(r=>({dc:d.dcs[r[1]].c+' '+d.dcs[r[1]].n,pt:d.pts[r[2]],kind:d.kinds[r[3]],code:d.vcode[r[4]],plate:d.plates[r[4]],date:d.dates[r[0]],plan:d.shifts[r[5]],ci:r[6],diff:r[7],dist:r[8],st:r[9],fine:r[10]}))}
function buildDataset(recs,zmap,baseOrder){
  const dcMap=new Map();recs.forEach(r=>{if(!dcMap.has(r.dc)){const c=r.dc.split(' ')[0];dcMap.set(r.dc,{c,n:r.dc.slice(c.length+1)})}});
  const zo=[...baseOrder];
  const arr=[...dcMap.entries()].map(([s,o])=>{const z=zmap[o.c]||'ไม่ระบุ';if(!zo.includes(z))zo.push(z);return {s,c:o.c,n:o.n,z,r:regionOf(z)}});
  arr.sort((a,b)=>zo.indexOf(a.z)-zo.indexOf(b.z)||a.s.localeCompare(b.s));
  const dcIdx=new Map(arr.map((d,i)=>[d.s,i]));
  const uq=f=>[...new Set(recs.map(f))].sort();
  const pts=uq(r=>r.pt),kinds=uq(r=>r.kind),plates=uq(r=>r.plate),shifts=uq(r=>r.plan);
  const pI=new Map(pts.map((x,i)=>[x,i])),kI=new Map(kinds.map((x,i)=>[x,i])),plI=new Map(plates.map((x,i)=>[x,i])),sI=new Map(shifts.map((x,i)=>[x,i]));
  const vc=new Array(plates.length).fill(0);recs.forEach(r=>{if(r.code)vc[plI.get(r.plate)]=r.code});
  const pd=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y-543,m-1,d)};
  let lo=Infinity,hi=-Infinity;recs.forEach(r=>{const t=pd(r.date);if(t<lo)lo=t;if(t>hi)hi=t});
  const dates=[],dI=new Map();for(let t=lo;t<=hi;t+=864e5){const x=new Date(t),s=`${x.getUTCFullYear()+543}-${String(x.getUTCMonth()+1).padStart(2,'0')}-${String(x.getUTCDate()).padStart(2,'0')}`;dI.set(s,dates.length);dates.push(s)}
  const rows=recs.map(r=>[dI.get(r.date),dcIdx.get(r.dc),pI.get(r.pt),kI.get(r.kind),plI.get(r.plate),sI.get(r.plan),r.ci,r.diff,r.dist,r.st,r.fine,ruleFine(r.st,r.diff)]);
  return {dates,dcs:arr.map(({c,n,z,r})=>({c,n,z,r})),pts,kinds,plates,vcode:vc,shifts,st:D.st,zoneOrder:zo,zmap,rows};
}
const HDR={dc:['DC'],pt:['ประเภทรถ'],kind:['ชนิดรถ'],code:['รหัสรถ'],plate:['ทะเบียนรถ','ทะเบียน'],date:['วันที่'],plan:['กำหนดเวลาเริ่มงาน','กำหนดเวลา'],ci:['เวลา Check-in','เวลาCheckin'],diff:['ผลต่าง (นาที)','ผลต่าง'],dist:['ระยะห่าง (กม.)','ระยะห่าง'],st:['สถานะ'],fine:['ค่าปรับ (บาท)','ค่าปรับ']};
const STMAP={[normH('ตรงเวลา')]:0,[normH('สาย')]:1,[normH('ไม่ Check in')]:2,[normH('Check in ไม่ตรงจุด')]:3};
function toDate(v){
  if(v==null||v==='')return null;let y,m,d;
  if(typeof v==='number'){const o=XLSX.SSF.parse_date_code(v);if(!o)return null;y=o.y;m=o.m;d=o.d}
  else if(v instanceof Date){y=v.getFullYear();m=v.getMonth()+1;d=v.getDate()}
  else{const s=String(v).trim();let a=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if(a){y=+a[1];m=+a[2];d=+a[3]}else{a=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);if(!a)return null;d=+a[1];m=+a[2];y=+a[3]}}
  if(y<2400)y+=543;return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function toMin(v){
  if(v==null||v==='')return null;
  if(typeof v==='number')return Math.round((v%1)*1440)%1440;
  if(v instanceof Date)return v.getHours()*60+v.getMinutes();
  const a=String(v).match(/(\d{1,2}):(\d{2})/);return a?(+a[1])*60+(+a[2]):null;
}
const toNum=v=>{if(v==null||v==='')return null;const n=typeof v==='number'?v:parseFloat(String(v).replace(/,/g,''));return isFinite(n)?n:null};
async function readWB(file){return /\.csv$/i.test(file.name)?XLSX.read(await file.text(),{type:'string'}):XLSX.read(await file.arrayBuffer(),{type:'array'})}
function parseData(wb){
  let name=wb.SheetNames.find(n=>normH(n)===normH('Data Check-In'))||wb.SheetNames[0],rows=null,hi=-1;
  for(const n of [name,...wb.SheetNames]){
    const rs=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:null});
    for(let i=0;i<Math.min(rs.length,15);i++){const h=(rs[i]||[]).map(normH);if(h.includes(normH('ทะเบียนรถ'))&&h.includes(normH('สถานะ'))){rows=rs;hi=i;name=n;break}}
    if(rows)break;
  }
  if(!rows)throw new Error('ไม่พบหัวคอลัมน์ "ทะเบียนรถ" และ "สถานะ" ในไฟล์');
  const hdr=rows[hi].map(normH),col={};
  for(const [k,al] of Object.entries(HDR))for(const a of al){const j=hdr.indexOf(normH(a));if(j>=0){col[k]=j;break}}
  for(const k of ['dc','plate','date','st'])if(col[k]==null)throw new Error('ไม่พบคอลัมน์ที่จำเป็น: '+HDR[k][0]);
  const g=(r,k)=>col[k]==null?null:r[col[k]];
  const recs=[];let skip=0,total=0;
  for(let i=hi+1;i<rows.length;i++){
    const r=rows[i];if(!r||r.every(x=>x==null||x===''))continue;total++;
    const dc=nz(g(r,'dc')),plate=nz(g(r,'plate')),date=toDate(g(r,'date')),st=STMAP[normH(g(r,'st'))];
    if(!dc||!plate||!date||st==null){skip++;continue}
    const ci=toMin(g(r,'ci')),diff=toNum(g(r,'diff')),plan=toMin(g(r,'plan'));
    recs.push({dc,pt:nz(g(r,'pt'))||'ไม่ระบุ',kind:nz(g(r,'kind'))||'ไม่ระบุ',code:Math.round(toNum(g(r,'code'))||0),plate,date,plan:plan==null?'08:00':hhmm(plan),
      ci:diff==null?null:ci,diff:diff==null?null:Math.round(diff),dist:(v=>v==null?null:Math.round(v*100)/100)(toNum(g(r,'dist'))),st,fine:Math.round(toNum(g(r,'fine'))||0)});
  }
  return {recs,skip,total,sheet:name};
}
function parseIndex(wb){
  const rs=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:null});
  let zc=2,start=0;
  for(let i=0;i<Math.min(rs.length,5);i++){const h=(rs[i]||[]).map(normH);const j=h.indexOf('zone');if(j>=0){zc=j;start=i+1;break}}
  const zm={};for(let i=start;i<rs.length;i++){const r=rs[i];if(!r||r[0]==null)continue;const c=nz(r[0]),z=nz(r[zc]);if(/^\d+$/.test(c)&&z)zm[c]=z}
  if(!Object.keys(zm).length)throw new Error('อ่านไฟล์ Index ไม่ได้ (ต้องมีรหัส DC และ Zone)');
  return zm;
}
let pendData=null,pendIdx=null;
const thD=s=>{const [y,m,d]=s.split('-').map(Number);return `${d} ${TH_M[m-1]} ${y}`};
function showInfo(t){const e=$('#upInfo');e.classList.remove('hide');e.textContent=t}
async function onPickData(e){
  pendData=null;const f=e.target.files[0];if(!f)return;
  try{
    const p=parseData(await readWB(f));if(!p.recs.length)throw new Error('ไม่พบรายการที่ใช้ได้ในไฟล์');
    const key=r=>`${r.date}|${r.dc}|${r.plate}|${r.plan}`,ex=new Set(decodeRecords(D).map(key));
    let dup=0;p.recs.forEach(r=>{if(ex.has(key(r)))dup++});
    const ds=p.recs.map(r=>r.date).sort(),dcs=[...new Set(p.recs.map(r=>r.dc))];
    const zm=pendIdx||D.zmap,unk=dcs.filter(s=>!zm[s.split(' ')[0]]);
    pendData=p;
    showInfo(`ชีต: ${p.sheet}\nอ่านได้ ${num(p.recs.length)} รายการ จาก ${num(p.total)} แถว (ข้ามแถวที่ไม่สมบูรณ์ ${num(p.skip)})\nช่วงวันที่: ${thD(ds[0])} – ${thD(ds[ds.length-1])}\nDC ในไฟล์: ${dcs.length} แห่ง\nซ้ำกับข้อมูลเดิม: ${num(dup)} รายการ · ใหม่: ${num(p.recs.length-dup)} รายการ`+(unk.length?`\nDC ที่ยังไม่มีโซน (จะจัดเป็น "ไม่ระบุ"): ${unk.join(', ')}`:''));
  }catch(err){showInfo('ผิดพลาด: '+err.message)}
}
async function onPickIdx(e){
  pendIdx=null;const f=e.target.files[0];if(!f)return;
  try{pendIdx=parseIndex(await readWB(f));showInfo(`อ่านไฟล์ Index ได้ ${Object.keys(pendIdx).length} DC · ${new Set(Object.values(pendIdx)).size} โซน`)}catch(err){showInfo('ผิดพลาด: '+err.message)}
}
function applyDataset(nd){
  D=nd;deriveAll();
  F.d0=0;F.d1=N-1;['region','zone','dc','pt','kind','st','shift'].forEach(k=>F[k].clear());F.q='';$('#q').value='';
  buildDateUI();update();
}
function doImport(){
  if(!pendData&&!pendIdx){$('#upMsg').textContent='กรุณาเลือกไฟล์ก่อน';return}
  const mode=document.querySelector('input[name=upMode]:checked').value,zmap=pendIdx||D.zmap;
  let base=decodeRecords(D),added=0,dup=0;
  if(pendData){
    const nr=pendData.recs;
    if(mode==='replaceAll')base=[];
    else if(mode==='replaceDates'){const ds=new Set(nr.map(r=>r.date));base=base.filter(r=>!ds.has(r.date))}
    const key=r=>`${r.date}|${r.dc}|${r.plate}|${r.plan}`,seen=new Set(base.map(key));
    for(const r of nr){const k=key(r);if(seen.has(k)){dup++;continue}seen.add(k);base.push(r);added++}
  }
  applyDataset(buildDataset(base,zmap,D.zoneOrder));
  $('#upMsg').textContent=`✓ นำเข้าสำเร็จ: เพิ่ม ${num(added)} รายการ${dup?` (ข้ามซ้ำ ${num(dup)})`:''}${pendIdx?' · อัปเดตโซนแล้ว':''} · รวม ${num(D.rows.length)} รายการ`;
  pendData=null;pendIdx=null;$('#upData').value='';$('#upIdx').value='';$('#upInfo').classList.add('hide');
}
function saveHTML(){
  const json=JSON.stringify(D).replace(/<\//g,'<\\/');
  const html=PRISTINE.replace(/(<script id="ds" type="application\/json">)[\s\S]*?(<\/script>)/,(m,a,b)=>a+json+b);
  download(URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),`NIMEX_Checkin_Dashboard_${stamp()}.html`);
  $('#upMsg').textContent='✓ บันทึกไฟล์แดชบอร์ดฉบับอัปเดตแล้ว — ส่งไฟล์นี้ให้ผู้อื่นเพื่อให้เห็นข้อมูลล่าสุด';
}
$('#uplBtn').onclick=()=>{if(isAdmin){$('#upMsg').textContent='';$('#upl').classList.add('on')}};
$('#upClose').onclick=()=>$('#upl').classList.remove('on');
$('#upData').onchange=onPickData;$('#upIdx').onchange=onPickIdx;$('#upGo').onclick=doImport;$('#upSave').onclick=()=>window.cipSave(D);

/* ---------- init ---------- */
themeCharts();buildFilters();addPngButtons();update();

