/* CoffeeRow Lab V9: authenticated integrity for portable browser research backups.
   SHA-256 detects accidental or unauthorized changes; it does not certify field measurements
   or authenticate a signer (no MAC/signatures/passwords). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CoffeeBackup=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const MAGIC='coffeerow-verified-backup',MAX_BYTES=3200000;
function canonical(value){
 let nodes=0;
 function write(v,depth){
  if(++nodes>100000||depth>35)throw Error('Cấu trúc JSON quá sâu hoặc quá lớn');
  if(v===null)return 'null';
  if(typeof v==='string')return JSON.stringify(v);
  if(typeof v==='number'){if(!Number.isFinite(v))throw Error('JSON có giá trị số không hợp lệ');return JSON.stringify(v)}
  if(typeof v==='boolean')return v?'true':'false';
  if(Array.isArray(v)){if(v.length>10000)throw Error('Mảng dữ liệu quá lớn');return '['+v.map(x=>write(x,depth+1)).join(',')+']'}
  if(typeof v==='object'){
   const keys=Object.keys(v).sort();
   if(keys.some(k=>k==='__proto__'||k==='constructor'||k==='prototype'))throw Error('JSON chứa khóa không an toàn');
   return '{'+keys.map(k=>JSON.stringify(k)+':'+write(v[k],depth+1)).join(',')+'}';
  }
  throw Error('Kiểu dữ liệu JSON không được hỗ trợ');
 }
 return write(value,0);
}
function sizeCheck(text){
 if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Tệp sao lưu vượt giới hạn 3,2 MB');
}
async function digest(project,cryptoImpl){
 const serialized=canonical(project);sizeCheck(serialized);
 const algo=cryptoImpl?.subtle;
 if(!algo||typeof algo.digest!=='function')throw Error('Trình duyệt chưa hỗ trợ Web Crypto SHA-256 trên kết nối an toàn');
 const bytes=await algo.digest('SHA-256',new TextEncoder().encode(serialized));
 return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
async function packageProject(project,cryptoImpl){
 if(!project||typeof project!=='object'||project.format!=='coffeerow-research-project'||project.version!==4)throw Error('Không đúng định dạng dự án CoffeeRow Lab');
 const checksum=await digest(project,cryptoImpl);
 const pack={format:MAGIC,version:1,algorithm:'SHA-256',checksum,project};
 sizeCheck(canonical(pack));
 return pack;
}
async function verifyBackup(payload,cryptoImpl){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Tệp JSON không hợp lệ');
 // Legacy projects have no cryptographic integrity assertion: keep compatibility.
 if(payload.format==='coffeerow-research-project'&&payload.version===4){
  sizeCheck(canonical(payload));
  return {project:payload,verified:false,legacy:true,checksum:null};
 }
 if(payload.format!==MAGIC||payload.version!==1||payload.algorithm!=='SHA-256')throw Error('Định dạng bản sao lưu không được hỗ trợ');
 if(!/^[a-f0-9]{64}$/.test(payload.checksum??''))throw Error('Mã SHA-256 không hợp lệ');
 if(!payload.project||payload.project.format!=='coffeerow-research-project'||payload.project.version!==4)throw Error('Thiếu dự án gốc');
 sizeCheck(canonical(payload));
 const actual=await digest(payload.project,cryptoImpl);
 if(actual!==payload.checksum)throw Error('SHA-256 không khớp: dữ liệu đã thay đổi hoặc bị hỏng. Chưa khôi phục bất kỳ dữ liệu nào.');
 return {project:payload.project,verified:true,legacy:false,checksum:actual};
}
return {canonical,digest,packageProject,verifyBackup,MAX_BYTES};
});
