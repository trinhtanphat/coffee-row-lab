const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../field-research.js'),S=require('../field-statistics.js'),Q=require('../field-audit.js');
function data(){
 const trial=R.trialDesign({treatments:['Đối chứng','Hàng WASI','Hàng dày'],blocks:4,plotWidthM:20,plotLengthM:30,seed:'lab'});
 const records=trial.plots.map(p=>({...p,year:2028,harvest_kg:180,harvest_area_m2:600,yield_kg_ha:3000}));
 return {trial,records};
}
test('audit recognizes complete verified-shape observations without scientific certification',()=>{
 const {trial,records}=data(),a=Q.review({trial,records});
 assert.equal(a.status,'ready-for-descriptive');assert.equal(a.received,12);assert.equal(a.periods[0].complete,true);
 assert.equal(a.periods[0].blocks.length,4);assert.equal(a.counts.errors,0);
});
test('missing plot blocks statistical completeness without silently imputing results',()=>{
 const {trial,records}=data();records.pop();
 const a=Q.review({trial,records});
 assert.equal(a.status,'incomplete');assert.equal(a.periods[0].missing.length,1);
 assert.equal(a.periods[0].blocks.reduce((s,b)=>s+b.found,0),11);
});
test('synthetic example provenance is preserved as explicit warning',()=>{
 const {trial,records}=data();const a=Q.review({trial,records,synthetic:true});
 assert.ok(a.findings.some(f=>f.key==='synthetic'));assert.equal(a.synthetic,true);
});
test('zero yields and high values are for manual review, not hard deletion',()=>{
 const {trial,records}=data();records[0].harvest_kg=0;records[0].yield_kg_ha=0;records[1].yield_kg_ha=15000;
 const a=Q.review({trial,records});
 assert.equal(a.status,'review-needed');assert.ok(a.findings.some(f=>f.key==='zero-harvest'));assert.ok(a.findings.some(f=>f.key==='high-yield'));
});
test('changed harvested area is signaled when plot is measured across years',()=>{
 const {trial,records}=data();const second=records.map(r=>({...r,year:2029}));
 second[0].harvest_area_m2=500;
 const a=Q.review({trial,records:[...records,...second]});
 assert.equal(a.periods.length,2);assert.ok(a.findings.some(f=>f.key==='changing-area'));
});
test('invalid observations flagged (external injected records)',()=>{
 const {trial,records}=data();records[0].yield_kg_ha=-1;
 records.push({...records[1],plot_id:'UNKNOWN',year:2029});
 const a=Q.review({trial,records});
 assert.equal(a.status,'invalid');assert.ok(a.findings.some(f=>f.key==='unknown-plot'));assert.ok(a.findings.some(f=>f.key==='invalid-yield'));
});
test('HTML report escapes dangerous values and includes real provenance',()=>{
 const trial=R.trialDesign({treatments:['<img src=x onerror=alert(1)>','A & B'],blocks:3});
 const records=trial.plots.map(p=>({...p,year:2028,harvest_kg:0,harvest_area_m2:600,yield_kg_ha:3000}));
 const audit=Q.review({trial,records,synthetic:false});
 const html=Q.reportHTML({trial,records,quality:audit,statistics:S,generatedAt:'2026-10-29T00:00:00Z'});
 assert.ok(html.startsWith('<!doctype html>'));assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<img src=x/);assert.doesNotMatch(html,/<script/i);
 assert.match(html,/CHƯA ĐƯỢC KIỂM CHỨNG ĐỘC LẬP/);assert.match(html,/ANOVA RCBD/);
});
test('HTML report contains incomplete warning and avoids invalid ANOVA conclusions',()=>{
 const {trial,records}=data();records.pop();
 const audit=Q.review({trial,records,synthetic:true});
 const report=Q.reportHTML({trial,records,quality:audit,statistics:S});
 assert.match(report,/VÍ DỤ TỔNG HỢP/);assert.match(report,/không thực hiện vì thiếu 1 lô/);
});
test('CSV findings export contains provenance and valid consistent cells',()=>{
 const {trial,records}=data(),audit=Q.review({trial,records,synthetic:true});
 const parsed=R.csvParse(Q.asCSV(audit,R.csvEncode));
 assert.equal(parsed.rows[0].code,'synthetic');
 assert.ok(parsed.headers.includes('detail'));
});
test('report refuses missing data and escapes HTML special characters',()=>{
 assert.throws(()=>Q.reportHTML({}),/Chưa có/);
 assert.equal(Q.escapeHTML('<>&"\''),'&lt;&gt;&amp;&quot;&#39;');
});
