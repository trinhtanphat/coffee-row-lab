/* CoffeeRow Lab V8 — integrated, offline reproducible research dossier
   Harvest and fieldbook measurements have different observational units and are NEVER pooled. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CoffeeDossier=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
function validate(input){
 const {trial,harvest=[],fieldbook=[],statistics,quality,fieldEngine}=input??{};
 if(!trial?.plots?.length||!trial?.treatments?.length)throw Error('Chưa có thiết kế thí nghiệm');
 if(!Array.isArray(harvest)||!Array.isArray(fieldbook)||!statistics?.rcbdAnova||!quality?.review||!fieldEngine?.summarize)throw Error('Thiếu dữ liệu hoặc module nghiên cứu');
 if(harvest.length>5000||fieldbook.length>5000)throw Error('Tối đa 5.000 bản ghi cho mỗi loại dữ liệu');
 const ids=new Map(trial.plots.map(p=>[p.plot_id,p]));
 const uniqueH=new Set(),uniqueF=new Set();
 for(const record of harvest){
  const p=ids.get(record.plot_id),key=record.plot_id+'|'+record.year;
  if(!p||p.block!==record.block||p.treatment_id!==record.treatment_id)throw Error('Dữ liệu thu hoạch không khớp mã lô');
  if(uniqueH.has(key))throw Error('Dữ liệu thu hoạch bị trùng lô/năm');uniqueH.add(key);
  if(!Number.isFinite(Number(record.yield_kg_ha))||Number(record.yield_kg_ha)<0)throw Error('Năng suất thu hoạch không hợp lệ');
 }
 for(const record of fieldbook){
  const p=ids.get(record.plot_id),key=record.plot_id+'|'+record.visit_date+'|'+record.variable;
  if(!p||p.block!==record.block||p.treatment_id!==record.treatment_id)throw Error('Nhật ký không khớp mã lô');
  if(uniqueF.has(key))throw Error('Nhật ký trùng lô/ngày/chỉ tiêu');uniqueF.add(key);
  const variable=fieldEngine.VARIABLES[record.variable];
  if(!variable||record.unit!==variable.unit)throw Error('Chỉ tiêu hoặc đơn vị đo không hợp lệ');
  if(!Number.isFinite(Number(record.plot_mean))||record.plot_mean<variable.minimum||record.plot_mean>variable.maximum)throw Error('Trung bình lô không hợp lệ');
  if(!Number.isInteger(Number(record.sampled_trees))||Number(record.sampled_trees)<1||Number(record.sampled_trees)>10000)throw Error('Số cây mẫu không hợp lệ');
  if(!fieldEngine.dayValid(record.visit_date)||Number(String(record.visit_date).slice(0,4))!==Number(record.year))throw Error('Ngày đo hoặc năm không hợp lệ');
 }
 return {trial,harvest,fieldbook,statistics,quality,fieldEngine};
}
function review(input){
 const d=validate(input),q=d.quality.review({trial:d.trial,records:d.harvest,synthetic:!!input.harvestSynthetic});
 const fieldRows=d.fieldEngine.summarize(d.fieldbook,d.trial);
 const fieldDates=[...new Set(d.fieldbook.map(r=>r.visit_date))].sort();
 const years=[...new Set([...q.years,...d.fieldbook.map(r=>r.year)])].sort((a,b)=>a-b);
 const pairedYears=years.map(year=>{
  const harvestIds=new Set(d.harvest.filter(r=>r.year===year).map(r=>r.plot_id));
  const notebookIds=new Set(d.fieldbook.filter(r=>r.year===year).map(r=>r.plot_id));
  const shared=[...harvestIds].filter(id=>notebookIds.has(id)).length;
  return {year,harvestPlots:harvestIds.size,fieldbookPlots:notebookIds.size,bothPlots:shared,
   totalPlots:d.trial.plots.length};
 });
 const completeFieldGroups=fieldRows.filter(r=>r.complete).length;
 const protocol=input.protocol&&typeof input.protocol==='object'?input.protocol:null;
 return {version:8,trialPlots:d.trial.plots.length,harvestRecords:d.harvest.length,fieldRecords:d.fieldbook.length,
  years,fieldDates,quality:q,fieldGroups:fieldRows,completeFieldGroups,pairedYears,
  status:!d.harvest.length&&!d.fieldbook.length?'empty':
    !d.harvest.length?'only-fieldbook':!d.fieldbook.length?'only-harvest':'both-available',
  harvestSynthetic:!!input.harvestSynthetic,protocolPresent:!!protocol,
  notice:'Bảng chung chỉ kiểm đếm các lô có hồ sơ trong cùng năm. Không suy diễn quan hệ nhân quả hoặc gộp hai bộ dữ liệu vào một phép ANOVA.'};
}
function csv(reviewData,encoder){
 const headers=['year','plots_in_design','plots_with_harvest','plots_with_field_measurements','plots_with_both','harvest_data_synthetic'];
 return encoder(headers,reviewData.pairedYears.map(r=>[r.year,r.totalPlots,r.harvestPlots,r.fieldbookPlots,r.bothPlots,reviewData.harvestSynthetic?'YES':'NO']));
}
function html(input){
 const d=validate(input),s=review(input),esc=d.quality.escapeHTML;
 if(typeof esc!=='function'||typeof d.quality.reportHTML!=='function')throw Error('Thiếu module xuất báo cáo an toàn');
 const basic=d.quality.reportHTML({trial:d.trial,records:d.harvest,statistics:d.statistics,quality:s.quality,sourceVersion:'8.0.0',generatedAt:input.generatedAt})
 .replace('<title>Báo cáo CoffeeRow Lab V5</title>','<title>Báo cáo CoffeeRow Lab V8</title>');
 const table=(cols,rows)=>'<table><thead><tr>'+cols.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+
 rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 const provenance=s.harvestSynthetic?'THU HOẠCH: VÍ DỤ TỔNG HỢP, KHÔNG PHẢI SỐ LIỆU THỰC':'THU HOẠCH: DỮ LIỆU NGƯỜI DÙNG NHẬP, CHƯA KIỂM CHỨNG ĐỘC LẬP';
 const section='<section><h2>7. Hồ sơ đo đạc cấp lô (V7/V8)</h2>'+
 '<p class="flag">'+esc(provenance)+'. NHẬT KÝ: dữ liệu do người dùng nhập, nguồn chưa được kiểm chứng; cũng có thể là dữ liệu thử nghiệm. Không tự công nhận số đo thực địa.</p>'+
 '<p>Nhật ký: '+esc(s.fieldRecords)+' phép đo / '+esc(s.fieldDates.length)+' ngày; '+esc(s.completeFieldGroups)+' / '+esc(s.fieldGroups.length)+' nhóm đo đủ số lô theo khối.</p>'+
 (s.fieldGroups.length?table(['Ngày','Chỉ tiêu','Đơn vị','Nghiệm thức','Số lô','Tổng cây lấy mẫu','Trung bình các trung bình lô','Min','Max'],
 s.fieldGroups.map(r=>[r.visit_date,r.variable_label,r.unit,r.treatment,r.plot_count+'/'+r.expected_plots,r.sampled_trees_total,
 Number(r.mean_of_plot_means).toFixed(2),Number(r.min_plot_mean).toFixed(2),Number(r.max_plot_mean).toFixed(2)])):
 '<p>Chưa có nhật ký đo đạc cấp lô được nhập.</p>')+'</section>'+
 '<section><h2>8. Đối chiếu số lô có hồ sơ theo năm</h2>'+
 (s.pairedYears.length?table(['Năm','Lô thiết kế','Có thu hoạch','Có nhật ký','Có cả hai'],
 s.pairedYears.map(r=>[r.year,r.totalPlots,r.harvestPlots,r.fieldbookPlots,r.bothPlots])):'<p>Chưa có năm quan sát.</p>')+
 '<p>'+esc(s.notice)+'</p></section>'+
 '<section><h2>9. Phương pháp và dữ liệu nguồn</h2><p>Phân tích ANOVA ở trên chỉ áp dụng dữ liệu thu hoạch có đủ lô theo từng năm. Các chỉ tiêu sinh trưởng chỉ được tổng hợp mô tả theo ngày × nghiệm thức, coi lô là đơn vị thực nghiệm và số cây trong lô là mẫu phụ. Không chạy kiểm định đo lặp hoặc kết luận hiệu quả kiểu Brazil nếu chưa có dữ liệu và chuyên gia kiểm chứng.</p></section>'+
 '<section><h2>10. Thông tin kế hoạch thí điểm</h2>'+
 (input.protocol&&typeof input.protocol==='object'?
 table(['Trường','Giá trị'],[['Tên điểm',input.protocol.siteName??''],['Khu vực',input.protocol.region??''],['Giống',input.protocol.variety??''],['Năm bắt đầu',input.protocol.startYear??''],['Phương pháp đo',input.protocol.method??''],['Checklist tự khai báo',Object.values(input.protocol.checks??{}).filter(v=>v===true).length+'/8 mục đã đánh dấu']]):
 '<p>Chưa có kế hoạch thí điểm được nhập.</p>')+
 '<p>Thông tin trên do người dùng khai báo, không phải phê duyệt thực địa hoặc chứng nhận phương pháp.</p></section>';
 if(!basic.endsWith('</body></html>'))throw Error('Định dạng báo cáo nền không được hỗ trợ');
 return basic.slice(0,-'</body></html>'.length)+section+'</body></html>';
}
return {validate,review,csv,html};
});