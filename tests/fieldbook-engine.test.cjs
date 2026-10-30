const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../field-research.js'),P=require('../field-protocol.js'),E=require('../fieldbook-engine.js');
const trial=R.trialDesign({treatments:['Đối chứng','WASI 3,2 × 1,5 m','Hàng dày (giả định)'],blocks:4,seed:'QA',plotWidthM:20,plotLengthM:30});
const columns=[...E.HEADERS];
function row(p,changes={}){
 return {plot_id:p.plot_id,block:p.block,treatment_id:p.treatment_id,year:2027,visit_date:'2027-09-20',variable:'plant_height',unit:'cm',sampled_trees:5,plot_mean:123.5,instrument_method:'thước mét',water_m3:'',labor_hours:'',field_notes:'',...changes};
}
const csvRows=arr=>R.csvEncode(columns,arr.map(p=>columns.map(h=>p[h]??'')));
const parse=arr=>E.parse(csvRows(arr),trial,R.csvParse);
test('V6 blank fieldbook has no fabricated measurements',()=>{
 const template=P.measurementTemplate(trial,R.csvEncode,2027);
 const parsed=R.csvParse(template);assert.equal(parsed.rows.length,trial.plots.length*3);
 assert.throws(()=>E.parse(template,trial,R.csvParse),/Chưa có phép đo nào/);
});
test('valid plot-level observation round-trips CSV preserving original fields',()=>{
 const records=parse([row(trial.plots[0],{field_notes:'mưa nhẹ, tán khỏe'})]);
 assert.equal(records.length,1);assert.equal(records[0].sampled_trees,5);
 const copy=E.parse(E.csv(records,R.csvEncode),trial,R.csvParse);assert.deepEqual(copy,records);
});
test('a partially filled template row fails rather than silently disappearing',()=>{
 assert.throws(()=>parse([row(trial.plots[0],{plot_mean:''})]),/đang điền dở/);
 assert.throws(()=>parse([row(trial.plots[0],{visit_date:''})]),/đang điền dở/);
});
test('reject unknown plot and mismatched RCBD metadata',()=>{
 assert.throws(()=>parse([row(trial.plots[0],{plot_id:'UNKNOWN'})]),/mã lô/);
 assert.throws(()=>parse([row(trial.plots[0],{block:4})]),/block/);
 assert.throws(()=>parse([row(trial.plots[0],{treatment_id:'T99'})]),/treatment_id/);
});
test('reject duplicate plot-date-variable even across blocks',()=>{
 const p=trial.plots[0],r=row(p);
 assert.throws(()=>parse([r,r]),/trùng lô/);
});
test('validate ISO dates and measured calendar year',()=>{
 assert.equal(E.dayValid('2028-02-29'),true);
 assert.equal(E.dayValid('2027-02-29'),false);
 assert.equal(E.dayValid('2027-02-30'),false);
 assert.throws(()=>parse([row(trial.plots[0],{visit_date:'2027-02-30'})]),/ngày đo/);
 assert.throws(()=>parse([row(trial.plots[0],{visit_date:'2028-09-20'})]),/ngày đo/);
});
test('measurement unit must match known variable',()=>{
 assert.throws(()=>parse([row(trial.plots[0],{unit:'m'})]),/đơn vị/);
 assert.throws(()=>parse([row(trial.plots[0],{variable:'cherry_weight'})]),/không được hỗ trợ/);
});
test('sample tree count must be integer, plot_mean must be finite',()=>{
 assert.throws(()=>parse([row(trial.plots[0],{sampled_trees:2.5})]),/số cây/);
 assert.throws(()=>parse([row(trial.plots[0],{sampled_trees:0})]),/số cây/);
 assert.throws(()=>parse([row(trial.plots[0],{plot_mean:'NaN'})]),/số hợp lệ/);
});
test('soil moisture pct bounded 0-100 and other readings bounded',()=>{
 assert.throws(()=>parse([row(trial.plots[0],{variable:'soil_moisture',unit:'pct',plot_mean:110})]),/giới hạn/);
 assert.equal(parse([row(trial.plots[0],{variable:'soil_moisture',unit:'pct',plot_mean:35})])[0].plot_mean,35);
});
test('exclude control characters and enormous free text',()=>{
 assert.throws(()=>parse([row(trial.plots[0],{field_notes:'x'.repeat(501)})]),/500/);
 assert.throws(()=>parse([row(trial.plots[0],{instrument_method:'A\u0001B'})]),/điều khiển/);
});
test('summaries average PLOT MEANS unweighted by number of sampled trees',()=>{
 const [a,b]=trial.plots.filter(p=>p.treatment_id==='T01').slice(0,2);
 const obs=parse([row(a,{sampled_trees:2,plot_mean:100}),row(b,{sampled_trees:80,plot_mean:200})]);
 const s=E.summarize(obs,trial);
 assert.equal(s.length,1);assert.equal(s[0].mean_of_plot_means,150);
 assert.equal(s[0].sampled_trees_total,82);assert.equal(s[0].plot_count,2);
 assert.equal(s[0].expected_plots,4);assert.equal(s[0].complete,false);
});
test('multi-visit measurements are kept separate and never treated as replications',()=>{
 const p=trial.plots[0];
 const obs=parse([row(p,{visit_date:'2027-04-10',plot_mean:80}),row(p,{visit_date:'2027-09-20',plot_mean:130})]);
 const s=E.summarize(obs,trial);assert.equal(s.length,2);
 assert.equal(s[0].visit_date,'2027-04-10');assert.equal(s[1].visit_date,'2027-09-20');
});
test('all replicated plots complete only with one entry per block same date and variable',()=>{
 const observations=parse(trial.plots.filter(p=>p.treatment_id==='T01').map((p,i)=>row(p,{plot_mean:100+i*10})));
 const s=E.summarize(observations,trial);
 assert.equal(s[0].plot_count,4);assert.equal(s[0].complete,true);
});
test('formula-like field notes are safely exported through shared CSV formatter',()=>{
 const p=trial.plots[0],obs=parse([row(p,{field_notes:'  =HYPERLINK(1,2)'})]);
 const csv=E.csv(obs,R.csvEncode);assert.ok(csv.includes("'  =HYPERLINK"));
});
