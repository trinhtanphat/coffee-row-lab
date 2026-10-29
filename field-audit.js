/* CoffeeRow Lab V5 — reproducible data quality review and safe self-contained research report */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CoffeeQuality=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function review(input={}){
 const trial=input.trial,records=input.records||[],synthetic=!!input.synthetic;
 if(!trial||!Array.isArray(trial.plots)||!Array.isArray(trial.treatments))throw Error('Thiếu thiết kế thí nghiệm');
 if(!Array.isArray(records))throw Error('Bản ghi phải là mảng');
 const findings=[],periods=[],expected=trial.plots.length;
 const plotMap=new Map(trial.plots.map(p=>[p.plot_id,p]));
 const years=[...new Set(records.map(r=>Number(r.year)))].filter(Number.isFinite).sort((a,b)=>a-b);
 const add=(severity,key,title,detail)=>findings.push({severity,key,title,detail});
 if(synthetic)add('warning','synthetic','Dữ liệu tổng hợp','Các số liệu mô phỏng không đại diện kết quả ngoài thực địa.');
 if(!records.length)add('warning','no-observations','Chưa có dữ liệu thu hoạch','Hãy nhập số liệu cà phê nhân theo lô, năm và diện tích thu hoạch.');
 const checked=new Set(),areaMap=new Map();
 for(const r of records){
  if(!plotMap.has(r.plot_id)){add('error','unknown-plot','Mã lô không tồn tại',String(r.plot_id));continue}
  const key=r.plot_id+'|'+r.year;
  if(checked.has(key))add('error','duplicate','Bản ghi trùng','Mã lô và năm trùng: '+key);checked.add(key);
  if(!Number.isFinite(Number(r.yield_kg_ha))||Number(r.yield_kg_ha)<0)add('error','invalid-yield','Giá trị không hợp lệ',key);
  if(Number(r.harvest_kg)===0)add('review','zero-harvest','Năng suất bằng 0',key+' — kiểm tra nguyên nhân và phương pháp ghi chép.');
  if(Number(r.yield_kg_ha)>12000)add('review','high-yield','Kiểm tra đơn vị',key+' có >12.000 kg nhân/ha; ngưỡng này chỉ để cảnh báo lỗi nhập liệu, không phải giới hạn sinh học.');
  const area=Number(r.harvest_area_m2);
  if(!Number.isFinite(area)||area<=0||area>plotMap.get(r.plot_id).plot_area_m2)add('error','invalid-area','Diện tích không hợp lệ',key);
  const known=areaMap.get(r.plot_id);
  if(known!==undefined&&Math.abs(known-area)>1e-6)add('review','changing-area','Diện tích thu hoạch thay đổi',r.plot_id+' có diện tích thu hoạch khác nhau giữa các năm. Kiểm tra lý do.');
  else if(known===undefined)areaMap.set(r.plot_id,area);
 }
 for(const y of years){
  const rows=records.filter(r=>Number(r.year)===y),present=new Set(rows.map(r=>r.plot_id));
  const missing=trial.plots.filter(p=>!present.has(p.plot_id)).map(p=>p.plot_id);
  const blocks=[];
  for(let b=1;b<=trial.blocks;b++){
   const sub=trial.plots.filter(p=>p.block===b);
   blocks.push({block:b,found:sub.filter(p=>present.has(p.plot_id)).length,expected:sub.length});
  }
  periods.push({year:y,found:rows.length,expected,complete:missing.length===0&&rows.length===expected,missing,blocks});
  if(missing.length)add('warning','missing-year','Thiếu lô năm '+y,rows.length+'/'+expected+' lô, thiếu: '+missing.join(', '));
 }
 const allComplete=periods.length>0&&periods.every(p=>p.complete);
 const errors=findings.filter(f=>f.severity==='error').length;
 const warnings=findings.filter(f=>f.severity==='warning').length;
 const reviews=findings.filter(f=>f.severity==='review').length;
 return {version:5,years,expectedPlots:expected,received:records.length,periods,findings,counts:{errors,warnings,reviews},
  status:errors?'invalid':!records.length?'empty':!allComplete?'incomplete':reviews?'review-needed':'ready-for-descriptive',
  synthetic};
}
function asCSV(audit,encoder){
 const headers=['severity','code','title','detail'];
 return encoder(headers,audit.findings.map(f=>[f.severity,f.key,f.title,f.detail]));
}
function reportHTML(input){
 const {trial,records,statistics,quality,generatedAt,sourceVersion='5.0.0'}=input;
 if(!trial||!quality||!Array.isArray(records)||!statistics)throw Error('Chưa có dữ liệu thiết kế để lập báo cáo');
 const safe=escapeHTML;const stamp=generatedAt??new Date().toISOString();
 const table=(heads,rows)=>'<table><thead><tr>'+heads.map(h=>'<th>'+safe(h)+'</th>').join('')+'</tr></thead><tbody>'+
 rows.map(r=>'<tr>'+r.map(v=>'<td>'+safe(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 const totals=quality.periods.map(p=>[p.year,p.found,p.expected,p.complete?'Đủ':'Thiếu '+p.missing.length]);
 const findings=quality.findings.map(f=>[f.severity,f.title,f.detail]);
 const years=quality.years;
 const anova=[];
 for(const year of years){
  const a=statistics.rcbdAnova(records,trial,year);
  if(a.status==='complete'||a.status==='zero-residual'){
   anova.push('<h3>ANOVA RCBD — '+safe(year)+'</h3>'+
    table(['Thành phần','SS','df','MS','F'],a.table.map(r=>[r.source,
     Number(r.ss).toFixed(2),r.df,r.ms==null?'—':Number(r.ms).toFixed(2),r.f==null?'—':Number(r.f).toFixed(3)]))+
    '<p>'+safe(a.note)+'</p>');
  }else anova.push('<p>ANOVA năm '+safe(year)+' không thực hiện vì thiếu '+safe(a.missing.length)+' lô.</p>');
 }
 const summary=statistics.timeSeries(records,trial);
 const sub=summary.length?table(['Năm','Nghiệm thức','Số lô','Trung bình kg nhân/ha','Đủ khối?'],
 summary.map(r=>[r.year,r.treatment,r.n,r.meanYieldKgHa.toFixed(1),r.complete?'Có':'Không'])):'<p>Chưa có dữ liệu đo.</p>';
 const sty='body{max-width:920px;margin:30px auto;padding:20px;color:#223d2d;font:14px/1.7 Arial,sans-serif}header{border-bottom:4px solid #225336;padding-bottom:20px}h1{font-size:31px}h2{margin-top:38px;font-size:22px}h3{font-size:17px}table{width:100%;border-collapse:collapse;margin:16px 0 25px;font-size:12px}th,td{padding:9px;border:1px solid #d9e3d7;text-align:left;vertical-align:top}th{background:#e8f0e6}.flag{padding:14px;background:#fff0d9;border-left:4px solid #bc8d51}small{color:#687d6b}.meta{display:flex;gap:25px;flex-wrap:wrap}footer{margin-top:55px;border-top:1px solid #ccc;padding-top:20px}@media print{body{margin:0;max-width:none}h2,h3{break-after:avoid}table{break-inside:avoid}}';
 return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Báo cáo CoffeeRow Lab V5</title><style>'+sty+'</style></head><body>'+
 '<header><small>COFFEEROW LAB · V'+safe(sourceVersion)+' · BÁO CÁO TẠO TẠI TRÌNH DUYỆT</small><h1>Báo cáo kiểm soát dữ liệu nghiên cứu cà phê</h1><div class="meta"><span>Thời điểm: '+safe(stamp)+'</span><span>Lô thiết kế: '+safe(trial.plots.length)+'</span><span>Bản ghi: '+safe(records.length)+'</span></div></header>'+
 '<p class="flag"><b>NGUỒN DỮ LIỆU: '+(quality.synthetic?'VÍ DỤ TỔNG HỢP, KHÔNG PHẢI SỐ ĐO THỰC':'NGƯỜI DÙNG NHẬP — CHƯA ĐƯỢC KIỂM CHỨNG ĐỘC LẬP')+'</b>. Báo cáo không tự chứng minh hiệu quả nông học hoặc ý nghĩa thống kê.</p>'+
 '<h2>1. Thiết kế</h2><p>'+safe(trial.treatments.length)+' nghiệm thức; '+safe(trial.blocks)+' khối; lô '+safe(trial.plotWidthM)+' × '+safe(trial.plotLengthM)+' m. Seed '+safe(trial.seed)+'.</p>'+
 table(['Mã','Nghiệm thức'],trial.treatments.map((t,i)=>['T'+String(i+1).padStart(2,'0'),t]))+
 '<h2>2. Mức độ đầy đủ theo năm</h2>'+table(['Năm','Số bản ghi','Số lô cần','Trạng thái'],totals)+
 '<h2>3. Kiểm soát chất lượng</h2>'+(findings.length?table(['Mức độ','Cảnh báo','Mô tả'],findings):'<p>Không phát hiện cảnh báo theo các quy tắc kiểm tra sơ bộ. Không đồng nghĩa dữ liệu đã được xác minh.</p>')+
 '<h2>4. Tóm tắt năng suất</h2>'+sub+'<h2>5. ANOVA theo năm</h2>'+anova.join('')+
 '<h2>6. Giới hạn</h2><p>ANOVA theo năm yêu cầu dữ liệu đầy đủ từng lô, giả định hiệu ứng cộng và sai số độc lập, phương sai đồng nhất, phân phối gần chuẩn. Chưa tính p-value, khoảng tin cậy hoặc điều chỉnh so sánh nhiều cặp. Không xem nhiều năm của một lô là những mẫu độc lập. Cần kiểm tra thực địa và phản biện chuyên môn trước khi ra quyết định.</p>'+
 '<footer><small>Nguồn phương pháp: NIST Engineering Statistics Handbook (Randomized Block Designs); Penn State STAT 503 (Blocking). Báo cáo xuất hoàn toàn phía trình duyệt, không chứa script hoặc liên kết theo dõi.</small></footer></body></html>';
}
return {escapeHTML,review,asCSV,reportHTML};
});