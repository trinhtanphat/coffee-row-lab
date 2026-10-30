/* CoffeeRow Lab V8: integrated local-only dossier export */
(()=>{'use strict';
const D=window.CoffeeDossier,Q=window.CoffeeQuality,S=window.CoffeeStatistics,F=window.CoffeeFieldbook,
 V=window.CoffeeFieldV3,V7=window.CoffeeFieldV7,R=window.CoffeeResearch;
if(!D||!Q||!S||!F||!V||!V7||!R||!document.getElementById('v8Rows'))return;
const $=id=>document.getElementById(id);
let last=null;
function params(){return {trial:V.trial,harvest:V.observations,fieldbook:V7.records,harvestSynthetic:V.isSynthetic,
 protocol:window.CoffeeFieldV6?.snapshot?.()??null,quality:Q,statistics:S,fieldEngine:F}}
function make(tag,text){const el=document.createElement(tag);el.textContent=String(text);return el}
function redraw(){
 try{
  const p=params();last=D.review(p);
  $('v8Plots').textContent=String(last.trialPlots);
  $('v8Harvest').textContent=String(last.harvestRecords);
  $('v8Field').textContent=String(last.fieldRecords);
  $('v8Groups').textContent=String(last.completeFieldGroups);
  const label=last.harvestSynthetic?'THU HOẠCH VÍ DỤ TỔNG HỢP. ':
    last.harvestRecords?'Thu hoạch do người dùng nhập, chưa xác minh. ':'';
  const descriptions={
   empty:'Chưa có số liệu; có thể xuất báo cáo phương pháp với các cảnh báo.',
   'only-fieldbook':'Có nhật ký đo đạc, chưa có số liệu thu hoạch.',
   'only-harvest':'Có dữ liệu thu hoạch, chưa có nhật ký đo đạc.',
   'both-available':'Đã có cả dữ liệu thu hoạch và nhật ký đo đạc. Bảng đối chiếu chỉ thống kê lô trùng theo năm.'
  };
  $('v8Status').textContent=label+descriptions[last.status];
  const body=$('v8Rows');body.replaceChildren();
  if(!last.pairedYears.length){const row=make('tr',''),cell=make('td','Chưa có dữ liệu theo năm.');cell.colSpan=5;row.append(cell);body.append(row)}
  for(const r of last.pairedYears){const tr=make('tr','');
   for(const v of [r.year,r.totalPlots,r.harvestPlots,r.fieldbookPlots,r.bothPlots])tr.append(make('td',v));
   body.append(tr);
  }
 }catch(e){last=null;$('v8Status').textContent='Không thể tổng hợp hồ sơ: '+e.message}
}
function download(name,content,mime){
 const url=URL.createObjectURL(new Blob([content],{type:mime})),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
}
$('v8Report').addEventListener('click',()=>{
 try{const report=D.html(params());download('coffeerow-integrated-research-dossier-v8.html',report,'text/html;charset=utf-8');
 $('v8Status').textContent='Đã tạo báo cáo HTML tự chứa. Mở và In → Lưu PDF nếu cần.'}
 catch(e){$('v8Status').textContent='Lỗi xuất báo cáo: '+e.message}
});
$('v8CoverageCsv').addEventListener('click',()=>{
 try{const summary=D.review(params());download('coffeerow-plot-coverage-crosscheck.csv',D.csv(summary,R.csvEncode),'text/csv;charset=utf-8');
 $('v8Status').textContent='Đã tạo ma trận kiểm đếm lô theo năm; không phải phép phân tích nhân quả.'}
 catch(e){$('v8Status').textContent='Lỗi xuất CSV: '+e.message}
});
window.addEventListener('coffeefield-data-change',redraw);
window.addEventListener('coffeefield-fieldbook-change',redraw);
redraw();
})();