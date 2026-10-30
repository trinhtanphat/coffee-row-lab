const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto').webcrypto;
const B=require('../verified-backup.js');
function sample(){return {format:'coffeerow-research-project',version:4,trial:{treatments:['Đối chứng','WASI 3,2 × 1,5 m'],blocks:3,seed:'2026',plotWidthM:20,plotLengthM:30},
 observations_csv:null,observations_synthetic:true,terrain_csv:null,fieldbook_csv:null}}
test('SHA-256 known vector and canonical key order',async()=>{
 const a={b:2,a:{z:3,c:4}},b={a:{c:4,z:3},b:2};
 assert.equal(B.canonical(a),B.canonical(b));
 const known=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('abc')); assert.equal(Buffer.from(known).toString('hex'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 const hash=await B.digest(a,crypto);assert.equal(hash.length,64);assert.equal(hash,await B.digest(b,crypto));
});
test('pack and verify stable project losslessly with SHA-256',async()=>{
 const orig=sample(),p=await B.packageProject(orig,crypto),res=await B.verifyBackup(p,crypto);
 assert.equal(p.algorithm,'SHA-256');assert.equal(p.version,1);assert.deepEqual(res.project,orig);
 assert.equal(res.verified,true);assert.equal(res.legacy,false);assert.equal(res.checksum,p.checksum);
});
test('tampering measurement values is rejected without restoring',async()=>{
 const p=await B.packageProject(sample(),crypto);p.project.trial.plotWidthM=100;
 await assert.rejects(()=>B.verifyBackup(p,crypto),/không khớp/);
});
test('tampering the synthetic provenance flag is rejected',async()=>{
 const p=await B.packageProject(sample(),crypto);p.project.observations_synthetic=false;
 await assert.rejects(()=>B.verifyBackup(p,crypto),/không khớp/);
});
test('legacy backup is explicitly unverified yet accepted',async()=>{
 const old=sample();const res=await B.verifyBackup(old,crypto);
 assert.equal(res.verified,false);assert.equal(res.legacy,true);assert.equal(res.project,old);
});
test('unknown wrapper version and malformed checksum are rejected',async()=>{
 const p=await B.packageProject(sample(),crypto);
 await assert.rejects(()=>B.verifyBackup({...p,version:2},crypto),/không được hỗ trợ/);
 await assert.rejects(()=>B.verifyBackup({...p,checksum:'x'},crypto),/không hợp lệ/);
 await assert.rejects(()=>B.verifyBackup({...p,algorithm:'MD5'},crypto),/không được hỗ trợ/);
});
test('canonical rejects dangerous keys, unsupported values and excessive depth',()=>{
 assert.throws(()=>B.canonical(JSON.parse('{"__proto__":{"a":1}}')),/không an toàn/);
 assert.throws(()=>B.canonical({bad:Infinity}),/không hợp lệ/);
 let x={};for(let i=0;i<40;i++)x={x};
 assert.throws(()=>B.canonical(x),/quá sâu/);
});
test('backup under 3.2 MB byte limit, not merely JS character count',async()=>{
 const payload=sample();payload.notes='ấ'.repeat(1200000);
 await assert.rejects(()=>B.packageProject(payload,crypto),/3,2 MB/);
});
test('missing crypto support fails closed for new verification',async()=>{
 await assert.rejects(()=>B.packageProject(sample(),null),/Web Crypto/);
 const legacy=await B.verifyBackup(sample(),null);assert.equal(legacy.verified,false);
});
