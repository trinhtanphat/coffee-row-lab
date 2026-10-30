const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../field-protocol.js'),R=require('../field-research.js');
function makeTrial(){return R.trialDesign({treatments:['Đối chứng','WASI 3,2 × 1,5 m','Hàng dày (giả định)'],blocks:4,seed:'2026',plotWidthM:20,plotLengthM:30})}
test('all V6 field-checklist items are unique and unconfirmed by default',()=>{
 const x=P.normalize({});assert.equal(P.CHECKS.length,8);assert.equal(new Set(P.CHECKS.map(i=>i.id)).size,8);
 assert.ok(P.CHECKS.every(c=>x.checks[c.id]===false));assert.equal(P.assess(x,makeTrial()).readyToReview,false);
});
test('pilot form requires full checklist and site metadata for documentation readiness',()=>{
 const checks=Object.fromEntries(P.CHECKS.map(c=>[c.id,true]));
 const a=P.assess({siteName:'Lô A',region:'Tây Nguyên',variety:'Robusta',method:'Cân nhân, quy đổi kg/ha',startYear:2027,checks},makeTrial());
 assert.equal(a.readyToReview,true);assert.equal(a.completed,8);assert.equal(a.details.length,0);
});
test('checkbox strings are never misread as confirmed',()=>{
 const checks=Object.fromEntries(P.CHECKS.map(c=>[c.id,'true']));
 assert.equal(P.assess({checks},makeTrial()).completed,0);
});
test('V6 fieldbook CSV has only blank observations and one plot row for each variable',()=>{
 const trial=makeTrial(),csv=P.measurementTemplate(trial,R.csvEncode,2028),data=R.csvParse(csv);
 assert.equal(data.rows.length,trial.plots.length*3);
 assert.ok(data.rows.every(r=>r.plot_mean===''&&r.visit_date===''&&r.year==='2028'));
 assert.equal(new Set(data.rows.map(r=>r.plot_id)).size,trial.plots.length);
});
test('V6 metadata export includes seeded allocation and unapproved checks',()=>{
 const trial=makeTrial(),csv=P.metadataCSV({siteName:'Thí điểm 1',startYear:2027},trial,R.csvEncode),data=R.csvParse(csv);
 assert.equal(data.rows.find(r=>r.field==='site_name').value,'Thí điểm 1');
 assert.equal(data.rows.find(r=>r.field==='check_site').value,'NO');
});
test('HTML form output is escaped, self-contained and clearly disclaims certification',()=>{
 const trial=R.trialDesign({treatments:['<script>alert(1)</script>','Control'],blocks:3});
 const html=P.report({siteName:'<img src=x onerror=alert(1)>',region:'A & B',method:'Cân nhân'},trial);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/CHƯA HOÀN TẤT|Chưa hoàn tất|chưa được xác nhận/);
 assert.match(html,/KHÔNG PHẢI CHỨNG NHẬN/);
});
test('wrong year and too-long/untrusted site metadata is rejected',()=>{
 assert.throws(()=>P.normalize({startYear:1999}),/Năm/);
 assert.throws(()=>P.normalize({siteName:'x'.repeat(121)}),/120/);
 assert.equal(P.normalize({siteName:null}).siteName,'');
});
test('protocol snapshot normalize preserves only known checkbox IDs and core fields',()=>{
 const inp={siteName:' Trạm 1 ',region:'Tây Nguyên',startYear:2026,checks:{site:true,malicious:true}};
 const cleaned=P.normalize(inp);assert.equal(cleaned.siteName,'Trạm 1');
 assert.equal(cleaned.checks.site,true);assert.equal('malicious' in cleaned.checks,false);
 assert.equal(Object.keys(cleaned.checks).length,8);
});
