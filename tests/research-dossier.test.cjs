const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../field-research.js'),F=require('../fieldbook-engine.js'),Q=require('../field-audit.js'),S=require('../field-statistics.js'),D=require('../research-dossier.js');
const trial=R.trialDesign({treatments:['Đối chứng','WASI 3,2 × 1,5 m','Hàng dày'],blocks:4,seed:'V8',plotWidthM:20,plotLengthM:30});
function samples(){
 const p=trial.plots,harvest=p.map((plot,i)=>({...plot,year:2028,harvest_kg:70+i*2,harvest_area_m2:600,yield_kg_ha:(70+i*2)/600*10000}));
 const fieldbook=p.slice(0,5).map((plot,i)=>({...plot,year:2028,visit_date:'2028-09-20',variable:'plant_height',unit:'cm',sampled_trees:5,plot_mean:100+i*4}));
 return {harvest,fieldbook};
}
function data(overrides={}){
 const {harvest,fieldbook}=samples();
 return {trial,harvest,fieldbook,statistics:S,quality:Q,fieldEngine:F,...overrides};
}
test('V8 identifies all plots, shared plot years and incomplete independent fieldbook groups',()=>{
 const a=D.review(data());
 assert.equal(a.status,'both-available');assert.equal(a.harvestRecords,12);assert.equal(a.fieldRecords,5);
 assert.deepEqual(a.years,[2028]);assert.equal(a.pairedYears[0].bothPlots,5);
 assert.equal(a.pairedYears[0].harvestPlots,12);assert.equal(a.pairedYears[0].fieldbookPlots,5);
 assert.ok(a.fieldGroups.length>0);
});
test('fieldbook-only report never fabricates harvest or ANOVA',()=>{
 const a=D.review(data({harvest:[]}));
 assert.equal(a.status,'only-fieldbook');assert.equal(a.pairedYears[0].harvestPlots,0);
 const html=D.html(data({harvest:[]}));
 assert.match(html,/Chưa có dữ liệu đo/);assert.match(html,/ANOVA/);assert.match(html,/Nhật ký: 5 phép đo/);
});
test('harvest-only and empty project reports are supported',()=>{
 const a=D.review(data({fieldbook:[]})),b=D.review(data({harvest:[],fieldbook:[]}));
 assert.equal(a.status,'only-harvest');assert.equal(b.status,'empty');
 assert.match(D.html(data({fieldbook:[]})),/Chưa có nhật ký đo đạc cấp lô/);
 assert.match(D.html(data({harvest:[],fieldbook:[]})),/Chưa có năm quan sát/);
});
test('integrated HTML report is self-contained, escaped and marked synthetic',()=>{
 const html=D.html(data({harvestSynthetic:true,generatedAt:'2026-10-30T00:00:00Z'}));
 assert.ok(html.startsWith('<!doctype html>'));assert.match(html,/<title>Báo cáo CoffeeRow Lab V8<\/title>/);
 assert.match(html,/VÍ DỤ TỔNG HỢP/);assert.match(html,/Hồ sơ đo đạc cấp lô/);
 assert.match(html,/Đối chiếu số lô có hồ sơ theo năm/);
 assert.doesNotMatch(html,/<script/i);assert.doesNotMatch(html,/<iframe/i);
});
test('unsafe treatment text is escaped in integrated report',()=>{
 const badTrial=R.trialDesign({treatments:['<img src=x onerror=alert(1)>','Đối chứng'],blocks:3});
 const html=D.html({...data(),trial:badTrial,harvest:[],fieldbook:[]});
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<img src=x/);
});
test('mismatching plot IDs and metadata are rejected before report',()=>{
 const a=data();a.fieldbook[0].plot_id='UNKNOWN';assert.throws(()=>D.review(a),/Nhật ký không khớp/);
 const b=data();b.harvest[0].treatment_id='T99';assert.throws(()=>D.review(b),/thu hoạch không khớp/);
});
test('duplicate records are rejected, including plot-date-measure variable collision',()=>{
 const a=data();a.fieldbook.push({...a.fieldbook[0]});assert.throws(()=>D.review(a),/trùng lô/);
 const b=data();b.harvest.push({...b.harvest[0]});assert.throws(()=>D.review(b),/trùng lô\/năm/);
});
test('measurement unit, range, tree count and dates are validated in merged dossier',()=>{
 const a=data();a.fieldbook[0].unit='m';assert.throws(()=>D.review(a),/Chỉ tiêu hoặc đơn vị/);
 const b=data();b.fieldbook[0].plot_mean=9000;assert.throws(()=>D.review(b),/Trung bình lô/);
 const c=data();c.fieldbook[0].sampled_trees=0;assert.throws(()=>D.review(c),/Số cây mẫu/);
 const d=data();d.fieldbook[0].visit_date='2028-02-30';assert.throws(()=>D.review(d),/Ngày đo/);
});
test('coverage CSV accurately reports years without claiming causation',()=>{
 const a=D.review(data({harvestSynthetic:true})),csv=D.csv(a,R.csvEncode);
 const parsed=R.csvParse(csv);
 assert.equal(parsed.rows[0].plots_with_both,'5');
 assert.equal(parsed.rows[0].harvest_data_synthetic,'YES');
 assert.equal(parsed.rows[0].plots_in_design,'12');
});
test('different-year measurements are not matched as same-year observations',()=>{
 const x=data();x.fieldbook=x.fieldbook.map(r=>({...r,year:2029,visit_date:'2029-09-20'}));
 const a=D.review(x);assert.deepEqual(a.years,[2028,2029]);
 assert.deepEqual(a.pairedYears.map(p=>p.bothPlots),[0,0]);
});

test('protocol metadata is included in report without trusting HTML strings',()=>{const html=D.html(data({harvest:[],fieldbook:[],protocol:{siteName:'<img src=x onerror=1>',region:'Tây Nguyên',variety:'Robusta',startYear:2027,method:'Cân nhân',checks:{site:true,care:true}}}));assert.match(html,/Thông tin kế hoạch thí điểm/);assert.match(html,/&lt;img src=x onerror=1&gt;/);assert.match(html,/2\/8 mục/);assert.doesNotMatch(html,/<img src=x/)});
