/* CoffeeRow Lab V7 UI — only browser-side CSV and JSON processing */
(()=>{'use strict';
const E=window.CoffeeFieldbook,R=window.CoffeeResearch,V=window.CoffeeFieldV3;
if(!E||!R||!V||!document.getElementById('v7Rows'))return;
const $=id=>document.getElementById(id);
const fmt=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2});
let records=[],summary=[],trialSignature='';
function signature(){return JSON.stringify(V.trial?.plots??[])}
function status(text,error=false){$('v7ImportStatus').textContent=text;$('v7ImportStatus').classList.toggle('error',error)}
function render(){
 summary=E.summarize(records,V.trial);
 $('v7Count').textContent=String(records.length);$('v7Groups').textContent=String(summary.length);
 $('v7Complete').textContent=String(summary.filter(s=>s.complete).length);
 const tbody=$('v7Rows');tbody.textContent='';
 if(!records.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=6;cell.textContent='Chưa có số liệu đo.';row.append(cell);tbody.append(row);return}
 for(const row of summary){
  const tr=document.createElement('tr');
  const values=[row.visit_date,row.variable_label,row.treatment,
   row.plot_count+'/'+row.expected_plots+(row.complete?'':' (thiếu)'),
   fmt.format(row.mean_of_plot_means)+' '+row.unit,
   fmt.format(row.min_plot_mean)+'–'+fmt.format(row.max_plot_mean)+' '+row.unit];
  for(let i=0;i<values.length;i++){const td=document.createElement('td');td.textContent=values[i];if(i===3&&!row.complete)td.className='v7-incomplete';tr.append(td)}
  tbody.append(tr);
 }
}
function setRecords(next){
 records=next.slice();trialSignature=signature();render();
 status('Đang dùng '+records.length+' phép đo cấp lô · '+summary.length+' nhóm ngày/biến/nghiệm thức. Số cây mẫu không tính là khối lặp độc lập.');
}
function clear(){
 records=[];trialSignature=signature();render();status('Nhật ký đã trống. Tải biểu mẫu V6 để nhập số liệu thực địa.');
}
function download(name,content,type){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
window.CoffeeFieldV7={
 get records(){return records.slice()},
 snapshotCsv(){return records.length?E.csv(records,R.csvEncode):null},
 validateCsv(value,trial){return E.parse(value,trial,R.csvParse)},
 restoreValidated(rows){if(!Array.isArray(rows))throw Error('Dữ liệu nhật ký đã kiểm tra không hợp lệ');setRecords(rows)}
};
$('v7Import').addEventListener('change',async ev=>{
 const file=ev.target.files?.[0];if(!file)return;
 try{
  if(file.size>3000000)throw Error('Tệp lớn hơn 3 MB');
  const parsed=E.parse(await file.text(),V.trial,R.csvParse);
  if(records.length&&!window.confirm('Nhập CSV sẽ thay thế nhật ký đang mở. Hãy lưu JSON dự án trước nếu cần. Tiếp tục?'))return;
  setRecords(parsed);
 }catch(e){status('Không thể nhập CSV: '+e.message,true)}
 finally{ev.target.value=''}
});
$('v7Clear').addEventListener('click',()=>{if(records.length&&!window.confirm('Xóa nhật ký đo đạc hiện tại khỏi phiên?'))return;clear()});
$('v7ExportRaw').addEventListener('click',()=>{
 if(!records.length){status('Chưa có dữ liệu để xuất.',true);return}
 download('coffeerow-measurements-validated.csv',E.csv(records,R.csvEncode),'text/csv;charset=utf-8');
});
$('v7ExportSummary').addEventListener('click',()=>{
 if(!summary.length){status('Chưa có thống kê để xuất.',true);return}
 const headers=['year','visit_date','variable','unit','treatment_id','treatment','plot_count','expected_plots','sampled_trees_total','complete','mean_of_plot_means','min_plot_mean','max_plot_mean'];
 download('coffeerow-measurements-summary.csv',R.csvEncode(headers,summary.map(r=>headers.map(k=>r[k]??''))),'text/csv;charset=utf-8');
});
window.addEventListener('coffeefield-data-change',()=>{
 const current=signature();if(current!==trialSignature){if(records.length)status('Phân lô đã thay đổi: nhật ký cũ đã được gỡ để tránh nhầm mã lô. Hãy tải bản lưu cũ nếu cần.');records=[];trialSignature=current;render()}
});
trialSignature=signature();render();
})();