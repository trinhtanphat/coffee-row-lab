/* CoffeeRow Lab V5 — data QA and self-contained HTML report, local-only */
(()=>{'use strict';
const Q=window.CoffeeQuality,S=window.CoffeeStatistics,R=window.CoffeeResearch,V=window.CoffeeFieldV3;
if(!Q||!S||!R||!V||!document.getElementById('v5Findings'))return;
const $=id=>document.getElementById(id);
let audit=null;
function elt(tag,cls,text){
 const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;
}
function download(filename,content,mime){
 const u=URL.createObjectURL(new Blob([content],{type:mime}));const a=elt('a');a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),1200);
}
function refresh(){
 try{
  const trial=V.trial,records=V.observations;
  if(!trial)return;
  audit=Q.review({trial,records,synthetic:V.isSynthetic});
  $('v5Years').textContent=audit.years.length+' năm';
  $('v5Records').textContent=String(audit.received);
  $('v5Complete').textContent=audit.periods.filter(p=>p.complete).length+'/'+audit.periods.length;
  $('v5Issues').textContent=String(audit.findings.length);
  const summary=$('v5Summary');summary.classList.toggle('warn',audit.status!=='ready-for-descriptive');
  summary.textContent=audit.synthetic?'ĐÂY LÀ DỮ LIỆU VÍ DỤ TỔNG HỢP — KHÔNG PHẢI SỐ ĐO THỰC ĐỊA. Chỉ dùng kiểm thử giao diện.':audit.status==='empty'?'Chưa có dữ liệu: có thể dùng mẫu tổng hợp có nhãn để thử giao diện.'
   :audit.status==='invalid'?'Có lỗi dữ liệu cần xử lý trước khi đánh giá.':
    audit.status==='incomplete'?'Có năm thiếu lô. ANOVA sẽ không chạy cho năm đó.':
    audit.status==='review-needed'?'Đủ lô theo năm nhưng có chỉ số cần kiểm tra.':
    'Đủ lô theo các năm đã nhập để lập thống kê mô tả. Không có nghĩa dữ liệu đã được xác minh độc lập.';
  const list=$('v5Findings');list.replaceChildren();
  if(!audit.findings.length){
   list.append(elt('p','v5-small','Không phát hiện cảnh báo trong các phép kiểm tra hiện tại. Cần xác minh dữ liệu thực địa độc lập.'))
  }else for(const f of audit.findings.slice(0,75)){
   const box=elt('div','v5-finding '+f.severity);
   box.append(elt('h4',null,f.title),elt('p',null,f.detail));list.append(box);
  }
  const coverage=$('v5Coverage');coverage.replaceChildren();
  if(!audit.periods.length)coverage.append(elt('p','v5-small','Chưa có năm thu hoạch để đánh giá độ đầy đủ theo khối.'));
  else for(const p of audit.periods){
   const box=elt('div','v5-year');box.append(elt('strong',null,String(p.year)),elt('small',null,p.found+'/'+p.expected+' lô'));
   const b=elt('div','v5-blocks');
   for(const block of p.blocks)b.append(elt('span',block.found===block.expected?'':'partial','B'+block.block+' '+block.found+'/'+block.expected));
   box.append(b);coverage.append(box);
  }
 }catch(e){$('v5Summary').textContent='Lỗi kiểm tra dữ liệu: '+e.message;audit=null}
}
$('v5ExportQuality').addEventListener('click',()=>{
 if(!audit)return;
 download('coffeerow-data-quality.csv',Q.asCSV(audit,R.csvEncode),'text/csv;charset=utf-8');
});
$('v5ExportReport').addEventListener('click',()=>{
 try{
  if(!audit||!V.trial)throw Error('Thiếu thiết kế dữ liệu');
  const html=Q.reportHTML({trial:V.trial,records:V.observations,quality:audit,statistics:S});
  download('coffeerow-research-quality-report-v5.html',html,'text/html;charset=utf-8');
  $('v5Summary').textContent='Đã tạo báo cáo HTML. Mở tệp vừa tải và chọn In → Lưu PDF nếu cần.';
 }catch(e){$('v5Summary').textContent='Không thể tạo báo cáo: '+e.message}
});
window.addEventListener('coffeefield-data-change',refresh);
refresh();
})();