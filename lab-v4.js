/* CoffeeRow Lab V4 — statistical UI and explicit project file portability */
(()=>{
'use strict';
const S=window.CoffeeStatistics,V=window.CoffeeFieldV3,R=window.CoffeeResearch;
if(!S||!V||!R||!document.getElementById('v4Year'))return;
const $=id=>document.getElementById(id);
const num=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2});
const colors=['#42835b','#c39a5e','#5999a6','#9b77b9','#ad7187','#8a9d53'];
let current=null;
const fmt=x=>x==null||!Number.isFinite(x)?'—':num.format(x);
function element(tag,attrs={},content){
 const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
 if(content!==undefined)e.textContent=String(content);
 return e;
}
function cell(tag,value){
 const n=document.createElement(tag);n.textContent=String(value);return n;
}
function status(text,warning=false){$('v4AnovaState').textContent=text;$('v4AnovaState').classList.toggle('warn',warning)}
function fillSelect(select,labels,selected){
 select.replaceChildren();
 for(const [value,text] of labels){const e=document.createElement('option');e.value=value;e.textContent=text;select.append(e)}
 if(selected&&labels.some(([v])=>v===selected))select.value=selected;
}
function renderTrend(points,trial){
 const svg=$('v4TrendChart'),legend=$('v4TrendLegend');svg.replaceChildren();legend.replaceChildren();
 const w=690,h=370,left=68,right=24,top=30,bottom=48;
 if(!points.length){svg.append(element('text',{x:w/2,y:h/2,'text-anchor':'middle',fill:'#76947a','font-size':15},'Chưa có số liệu theo năm'));return}
 const years=[...new Set(points.map(p=>p.year))].sort((a,b)=>a-b);
 const max=Math.max(1,...points.map(p=>p.meanYieldKgHa)),high=max*1.14;
 const x=year=>left+(w-left-right)*(years.length===1?.5:(years.indexOf(year)/(years.length-1)));
 const y=value=>top+(h-top-bottom)*(1-value/high);
 for(let tick=0;tick<=4;tick++){
  const val=high*tick/4,py=y(val);
  svg.append(element('line',{x1:left,y1:py,x2:w-right,y2:py,stroke:'#e0e8df'}));
  svg.append(element('text',{x:left-9,y:py+4,'font-size':11,'text-anchor':'end',fill:'#728b76'},fmt(val)));
 }
 for(const year of years)svg.append(element('text',{x:x(year),y:h-19,'text-anchor':'middle','font-size':11,fill:'#708976'},year));
 const label=element('text',{x:12,y:17,'font-size':10,fill:'#69876d'},'Năng suất trung bình (kg nhân/ha)');svg.append(label);
 for(let i=0;i<trial.treatments.length;i++){
  const id='T'+String(i+1).padStart(2,'0'),group=points.filter(p=>p.treatment_id===id).sort((a,b)=>a.year-b.year);
  const color=colors[i%colors.length];
  const tag=document.createElement('span'),dot=document.createElement('i');dot.style.background=color;
  tag.append(dot,document.createTextNode(id+' · '+trial.treatments[i]));legend.append(tag);
  for(let j=1;j<group.length;j++){
   // Only connect truly adjacent recorded calendar years to avoid hiding missing data.
   if(group[j].year-group[j-1].year!==1)continue;
   svg.append(element('line',{x1:x(group[j-1].year),y1:y(group[j-1].meanYieldKgHa),x2:x(group[j].year),y2:y(group[j].meanYieldKgHa),
    stroke:color,'stroke-width':2.8,'stroke-dasharray':(!group[j].complete||!group[j-1].complete)?'5 5':'none'}));
  }
  for(const p of group){
   const mark=element('circle',{cx:x(p.year),cy:y(p.meanYieldKgHa),r:6,fill:p.complete?color:'#fff',stroke:color,'stroke-width':2.4});
   const title=element('title',{},p.treatment+' · '+p.year+': '+fmt(p.meanYieldKgHa)+' kg/ha · '+p.n+'/'+trial.blocks+' khối');
   mark.append(title);svg.append(mark);
  }
 }
}
function calculatePair(){
 const trial=V.trial,rows=V.observations,year=Number($('v4Year').value);
 if(!trial||!rows.length||!year)return;
 const a=$('v4TreatmentA').value,b=$('v4TreatmentB').value;
 if(a===b){$('v4Pairs').textContent='Chọn hai nghiệm thức khác nhau';$('v4DiffValue').textContent='—';return}
 try{
  const d=S.blockedDifference(rows,trial,year,a,b);
  $('v4Pairs').textContent=d.pairs+'/'+d.expectedPairs+' khối có đủ cặp A/B';
  $('v4DiffValue').textContent=d.meanDifference==null?'—':(d.meanDifference>=0?'+':'')+fmt(d.meanDifference)+' kg/ha';
  $('v4DiffInfo').textContent=(d.status==='complete'?'Đủ các cặp theo khối. ':'So sánh chỉ dựa trên các khối đủ cặp. ')+
    'B − A; SD chênh lệch = '+fmt(d.sdDifference)+' kg/ha. Đây là thống kê mô tả.';
 }catch(err){$('v4Pairs').textContent=err.message;$('v4DiffValue').textContent='—'}
}
function refresh(){
 const trial=V.trial,rows=V.observations,years=[...new Set(rows.map(r=>String(r.year)))].sort();
 const existing=$('v4Year').value;
 fillSelect($('v4Year'),years.map(y=>[y,y]),existing);
 $('v4NoData').hidden=!!rows.length;$('v4Analysis').hidden=!rows.length;
 if(!trial||!rows.length){current=null;renderTrend([],trial||{treatments:[]});return}
 const treatments=trial.treatments.map((t,i)=>['T'+String(i+1).padStart(2,'0'),t]);
 const oldA=$('v4TreatmentA').value,oldB=$('v4TreatmentB').value;
 fillSelect($('v4TreatmentA'),treatments,oldA);
 fillSelect($('v4TreatmentB'),treatments,oldB||treatments[1]?.[0]);
 if($('v4TreatmentA').value===$('v4TreatmentB').value&&treatments.length>1)$('v4TreatmentB').value=treatments[1][0];
 const y=Number($('v4Year').value);
 current=S.rcbdAnova(rows,trial,y);
 const table=$('v4AnovaRows');table.replaceChildren();
 if(current.status==='incomplete'){
  status('Chưa đủ dữ liệu cho RCBD năm '+y+': '+current.found+'/'+current.expected+' lô. Thiếu '+current.missing.join(', ')+'. Không chạy ANOVA.',true);
 }else{
  status((V.isSynthetic?'DỮ LIỆU VÍ DỤ TỔNG HỢP — KHÔNG PHẢI THỰC ĐỊA. ':'')+
    'Năm '+y+': '+current.expected+' lô đầy đủ, '+(current.degenerate?'không thể ước lượng F do sai số dư gần 0.':'đã phân rã phương sai. Không kết luận khác biệt có ý nghĩa khi chưa kiểm tra giả định.')+
    ' '+current.note,!!V.isSynthetic||current.degenerate);
  for(const part of current.table){
   const tr=document.createElement('tr');
   for(const c of [part.source,fmt(part.ss),part.df,fmt(part.ms),fmt(part.f)])tr.append(cell('td',c));
   table.append(tr);
  }
 }
 renderTrend(S.timeSeries(rows,trial),trial);
 calculatePair();
}
$('v4Year').addEventListener('change',refresh);
$('v4TreatmentA').addEventListener('change',calculatePair);
$('v4TreatmentB').addEventListener('change',calculatePair);
window.addEventListener('coffeefield-data-change',refresh);
$('v4ExportAnova').addEventListener('click',()=>{
 if(!current||current.status==='incomplete'){status('Thiếu dữ liệu; không thể xuất ANOVA. Hãy nhập đầy đủ các lô cho năm được chọn.',true);return}
 const table=current.table;
 const cols=['year','source','sum_squares','df','mean_squares','f_statistic','synthetic_example'];
 const csv=R.csvEncode(cols,table.map(t=>[current.year,t.source,t.ss,t.df,t.ms??'',t.f??'',V.isSynthetic?'yes':'no']));
 download('coffeerow-rcbd-anova-'+current.year+'.csv',csv,'text/csv;charset=utf-8');
});
function download(name,content,type){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function note(text){$('v4ProjectStatus').textContent=text}
$('v4Save').addEventListener('click',async()=>{
 try{
  const pack=await window.CoffeeBackup.packageProject(V.snapshotProject(),window.crypto);
  download('coffeerow-research-project-v9-verified.json',JSON.stringify(pack,null,2),'application/json');
  note('Đã xuất JSON có mã SHA-256: '+pack.checksum.slice(0,16)+'… (không gửi dữ liệu ra máy chủ).');
 }catch(e){note('Không thể xuất dự án: '+e.message)}
});
$('v4RestoreFile').addEventListener('change',async event=>{
 const f=event.target.files?.[0];if(!f)return;
 try{
  if(f.size>3200000)throw Error('Tệp lớn hơn 3,2 MB');
  const data=JSON.parse(await f.text());
  const checked=await window.CoffeeBackup.verifyBackup(data,window.crypto);
  if((V.observations.length||(window.CoffeeFieldV7?.records?.length??0)>0)&&!window.confirm('Khôi phục sẽ thay thế dữ liệu nghiên cứu đang mở. Tiếp tục?'))return;
  const result=V.restoreProject(checked.project);
  note('Đã khôi phục bản lưu: '+result.plots+' lô, '+result.observations+' bản ghi, địa hình: '+(result.terrain?'có':'không')+'. '+(checked.verified?'SHA-256 hợp lệ: '+checked.checksum.slice(0,16)+'…':'Định dạng cũ chưa có kiểm tra SHA-256.'));
 }catch(e){note('Lỗi khôi phục: '+e.message)}
 finally{event.target.value=''}
});
$('v4SampleData').addEventListener('click',()=>{
 try{if(V.loadDemo())note('Đang dùng ví dụ TỔNG HỢP hai năm, không phải kết quả thu hoạch thật. Có thể xuất JSON nhưng luôn kèm nhãn SYNTHETIC.')}
 catch(e){note(e.message)}
});
refresh();
})();
