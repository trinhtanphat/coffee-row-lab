/* CoffeeRow Lab V3: local-only terrain grid and reproducible on-farm research tools */
(()=>{
'use strict';
const R=window.CoffeeResearch;
if(!R||!document.getElementById('v3Generate'))return;
const $=id=>document.getElementById(id);
const fmt=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1});
const intFmt=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0});
const state={terrain:null,trial:null,observations:[],summary:[]};
window.CoffeeFieldV3={
 get terrain(){return state.terrain;},
 heightAt(x,z,sideM){
  const t=state.terrain;if(!t)return null;
  const m=Number(sideM)||100;
  return (R.gridElevation(t,(x+50)/100,(z+50)/100)-t.center)*100/m;
 }
};
const publishTerrain=()=>window.dispatchEvent(new Event('coffeefield-v3-update'));
function message(id,text,error=false){
 const node=$(id);node.textContent=text;node.classList.toggle('error',error);
}
function download(name,content,type='text/csv;charset=utf-8'){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importTerrain(csv,isExample=false){
 const t=R.buildGrid(csv);state.terrain=t;
 $('v3TerrainStatus').textContent=isExample?'Dữ liệu mẫu tổng hợp':'Đã nạp CSV (trình duyệt)';
 $('v3TerrainGrid').textContent=t.xCount+' × '+t.zCount+' điểm';
 $('v3TerrainRelief').textContent=fmt.format(t.maxH-t.minH)+' m';
 $('v3TerrainSlope').textContent=fmt.format(t.maxSlopeDeg)+'°';
 message('v3TerrainMessage',(isExample?'Đã bật ví dụ tổng hợp, không phải dữ liệu đo đạc. ':'Đã nhập lưới cao độ. ')+
   'Kích thước thực: '+fmt.format(t.widthM)+' × '+fmt.format(t.lengthM)+' m; đã nội suy và co giãn vào mặt bằng mô phỏng 3D. Không phải bản đồ tọa độ thực.');
 publishTerrain();
}
function resetTerrain(){
 state.terrain=null;$('v3TerrainFile').value='';
 $('v3TerrainStatus').textContent='Chưa tải dữ liệu';
 for(const id of ['v3TerrainGrid','v3TerrainRelief','v3TerrainSlope'])$(id).textContent='—';
 message('v3TerrainMessage','Đã trở về địa hình mặt dốc giả định từ thông số V2.');
 publishTerrain();
}
$('v3TerrainExample').addEventListener('click',()=>{
 try{importTerrain(R.sampleTerrainCSV(),true)}catch(e){message('v3TerrainMessage',e.message,true)}
});
$('v3TerrainSample').addEventListener('click',()=>download('coffeerow-terrain-synthetic-template.csv',R.sampleTerrainCSV()));
$('v3TerrainClear').addEventListener('click',resetTerrain);
$('v3TerrainFile').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{if(file.size>3000000)throw Error('CSV lớn hơn 3 MB');importTerrain(await file.text(),false)}
 catch(e){message('v3TerrainMessage','Không thể nhập địa hình: '+e.message,true)}
});
const palette=[
 ['#e0edd5','#95b888'],['#e3e7ce','#c2c99b'],['#f5e8d0','#dbbb83'],
 ['#d7eae7','#9cbdb5'],['#eedfe4','#d4aabb'],['#e6e2f0','#afa4ca']
];
function make(tag,cls,text){
 const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;
}
function readTrial(){
 return R.trialDesign({
  treatments:R.treatmentsFromText($('v3Treatments').value),
  blocks:Number($('v3Blocks').value),
  plotWidthM:$('v3PlotW').value,plotLengthM:$('v3PlotL').value,
  seed:$('v3Seed').value
 });
}
function renderTrial(t){
 $('v3TrialTitle').textContent=t.treatments.length+' nghiệm thức × '+t.blocks+' khối';
 $('v3TrialArea').textContent=intFmt.format(t.totalPlotAreaM2)+' m²';
 const grid=$('v3TrialGrid'),legend=$('v3TrialLegend');grid.textContent='';legend.textContent='';
 for(let b=1;b<=t.blocks;b++){
  const group=make('div','v3-trial-block');
  group.appendChild(make('div','v3-trial-block-name','KHỐI '+String(b).padStart(2,'0')));
  const plots=make('div','v3-trial-plots');plots.style.setProperty('--plots',String(t.treatments.length));
  for(const p of t.plots.filter(row=>row.block===b)){
   const i=Number(p.treatment_id.slice(1))-1,colour=palette[i];
   const card=make('div','v3-trial-plot');card.style.setProperty('--treatment-color',colour[0]);
   card.style.setProperty('--treatment-border',colour[1]);card.title=p.plot_id+' · '+p.treatment;
   card.append(make('strong',null,p.treatment_id),make('span',null,p.plot_id));
   plots.appendChild(card);
  }
  group.appendChild(plots);grid.appendChild(group);
 }
 for(let i=0;i<t.treatments.length;i++){
  const label=make('span');const dot=make('i');
  dot.style.background=palette[i][0];dot.style.border='1px solid '+palette[i][1];
  label.append(dot,document.createTextNode('T'+String(i+1).padStart(2,'0')+' · '+t.treatments[i]));
  legend.appendChild(label);
 }
}
function resetObservations(){
 state.observations=[];state.summary=[];
 $('v3DataOutput').hidden=true;$('v3DataEmpty').hidden=false;$('v3ObservationFile').value='';
 message('v3DataMessage','Thiết kế lô đã thay đổi. Nhập lại CSV số liệu theo các mã lô hiện hành.');
}
function generateTrial(){
 try{
  const next=readTrial();
  const changed=!state.trial||JSON.stringify(next.plots)!==JSON.stringify(state.trial.plots);
  state.trial=next;renderTrial(next);
  if(changed)resetObservations();
  message('v3TrialMessage','Đã tạo '+next.plots.length+' lô; '+next.treatments.length+' nghiệm thức xuất hiện đúng 1 lần trong mỗi khối. Seed: '+next.seed+'.');
 }catch(e){message('v3TrialMessage','Lỗi thiết kế: '+e.message,true)}
}
$('v3Generate').addEventListener('click',generateTrial);
$('v3ExportLayout').addEventListener('click',()=>{
 if(!state.trial){message('v3TrialMessage','Tạo thiết kế hợp lệ trước khi xuất.',true);return}
 const headers=['plot_id','block','position','treatment_id','treatment','plot_area_m2','plot_width_m','plot_length_m','seed'];
 download('coffeerow-rcbd-layout.csv',R.csvEncode(headers,state.trial.plots.map(p=>headers.map(h=>p[h]))));
});
$('v3ExportTemplate').addEventListener('click',()=>{
 if(!state.trial){message('v3TrialMessage','Tạo thiết kế hợp lệ trước khi xuất.',true);return}
 download('coffeerow-harvest-observation-blank.csv',R.observationTemplate(state.trial));
});
$('v3ObservationFile').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file||!state.trial)return;
 try{
  if(file.size>3000000)throw Error('CSV lớn hơn 3 MB');
  const obs=R.parseObservations(await file.text(),state.trial);
  const summary=R.summarizeObservations(obs);
  state.observations=obs;state.summary=summary;
  const table=$('v3DataRows');table.textContent='';
  for(const entry of summary){
   const row=make('tr');
   for(const value of [entry.year,entry.treatment,entry.plots,fmt.format(entry.meanYieldKgHa),fmt.format(entry.minYieldKgHa),fmt.format(entry.maxYieldKgHa)])row.appendChild(make('td',null,value));
   table.appendChild(row);
  }
  $('v3DataOutput').hidden=false;$('v3DataEmpty').hidden=true;
  $('v3ObservationsCount').textContent=obs.length+' bản ghi đo đạc · '+summary.length+' nhóm năm/nghiệm thức';
  message('v3DataMessage','Đã tổng hợp dữ liệu theo kg nhân/ha. Các trung bình là thống kê mô tả, chưa có kiểm định ý nghĩa thống kê.');
 }catch(e){message('v3DataMessage','Lỗi nhập số liệu: '+e.message,true)}
});
$('v3ExportSummary').addEventListener('click',()=>{
 if(!state.summary.length){message('v3DataMessage','Chưa có số liệu tổng hợp.',true);return}
 const fields=['year','treatment_id','treatment','observations','plots','meanYieldKgHa','minYieldKgHa','maxYieldKgHa','meanWaterM3','meanLaborHours'];
 download('coffeerow-harvest-descriptive-summary.csv',R.csvEncode(fields,state.summary.map(r=>fields.map(f=>r[f]))));
});
generateTrial();
})();
