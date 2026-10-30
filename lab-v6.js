/* V6 pilot checklist — local form state, explicit file exports, no network */
(()=>{'use strict';
const P=window.CoffeeProtocol,R=window.CoffeeResearch,V=window.CoffeeFieldV3;
if(!P||!R||!V||!document.getElementById('v6CheckItems'))return;
const $=id=>document.getElementById(id),state=Object.create(null);
for(const item of P.CHECKS)state[item.id]=false;
function snapshot(){
 return P.normalize({siteName:$('v6Site').value,region:$('v6Region').value,variety:$('v6Variety').value,
   startYear:$('v6Year').value,method:$('v6Method').value,checks:state});
}
function restore(value){
 const v=P.normalize(value);
 $('v6Site').value=v.siteName;$('v6Region').value=v.region;$('v6Variety').value=v.variety;
 $('v6Year').value=v.startYear;$('v6Method').value=v.method;
 for(const item of P.CHECKS)state[item.id]=v.checks[item.id];
 for(const c of document.querySelectorAll('#v6CheckItems input[type=checkbox]'))c.checked=state[c.value];
 refresh();return v;
}
window.CoffeeFieldV6={snapshot,restore,validate:P.normalize};
function refresh(){
 try{
 const a=P.assess(snapshot(),V.trial);
 $('v6Count').textContent=a.completed+'/'+a.total;
 $('v6Status').textContent=a.readyToReview?'Hồ sơ đã đủ mục để gửi chuyên gia xem lại':a.completed+'/'+a.total+' mục đã ghi nhận';
 $('v6Warning').textContent=a.details.length?a.details.join(' · '):
 a.missing.length?'Chưa kiểm tra: '+a.missing.map(c=>c.title).join(' · '):
 'Đã điền checklist và thông tin nền. Chưa xác minh điều kiện nông học hay an toàn máy tại thực địa.';
 }catch(e){$('v6Warning').textContent='Vui lòng kiểm tra đầu vào: '+e.message}
}
const list=$('v6CheckItems');
for(const item of P.CHECKS){
 const label=document.createElement('label');label.className='v6-check';
 const cb=document.createElement('input');cb.type='checkbox';cb.value=item.id;cb.checked=false;
 cb.addEventListener('change',()=>{state[item.id]=cb.checked;refresh()});
 const span=document.createElement('span'),head=document.createElement('strong'),help=document.createElement('small');
 head.textContent=item.title;help.textContent=item.detail;span.append(head,help);label.append(cb,span);list.append(label);
}
function download(filename,content,mime){
 const url=URL.createObjectURL(new Blob([content],{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function action(fn){try{const trial=V.trial;if(!trial)throw Error('Chưa tạo sơ đồ phân lô');fn(trial)}catch(e){$('v6Warning').textContent='Không thể xuất tài liệu: '+e.message}}
$('v6ProtocolReport').addEventListener('click',()=>action(trial=>download('coffeerow-ke-hoach-thi-diem-v6.html',P.report(snapshot(),trial),'text/html;charset=utf-8')));
$('v6Fieldbook').addEventListener('click',()=>action(trial=>download('coffeerow-nhat-ky-do-dac-trong.csv',P.measurementTemplate(trial,R.csvEncode,snapshot().startYear),'text/csv;charset=utf-8')));
$('v6Metadata').addEventListener('click',()=>action(trial=>download('coffeerow-metadata-thi-diem.csv',P.metadataCSV(snapshot(),trial,R.csvEncode),'text/csv;charset=utf-8')));
for(const id of ['v6Site','v6Region','v6Variety','v6Year','v6Method'])$(id).addEventListener('input',refresh);
window.addEventListener('coffeefield-data-change',refresh);
refresh();
})();