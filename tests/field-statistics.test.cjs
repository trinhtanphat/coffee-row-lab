const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../field-research.js'),S=require('../field-statistics.js');
function fixture(){
 const design=R.trialDesign({treatments:['T-A','T-B','T-C'],blocks:4,seed:'stat-test',plotWidthM:20,plotLengthM:30});
 const noise=[[-20,0,20],[15,-10,-5],[5,10,-15],[0,0,0]];
 const records=design.plots.map(p=>{
  const t=Number(p.treatment_id.slice(1))-1,b=p.block-1;
  return {...p,year:2028,yield_kg_ha:1000+b*200+t*100+noise[b][t],harvest_kg:0,harvest_area_m2:600};
 });
 return {design,records};
}
test('RCBD full block ANOVA sums of squares and df agree with independent hand calculation',()=>{
 const {design,records}=fixture(),a=S.rcbdAnova(records,design,2028);
 assert.equal(a.status,'complete');assert.equal(a.expected,12);
 assert.equal(a.grandMean,1400);
 const [tr,block,error,total]=a.table;
 assert.ok(Math.abs(tr.ss-80000)<1e-8);assert.equal(tr.df,2);assert.equal(tr.ms,40000);assert.equal(tr.f,160);
 assert.equal(block.ss,600000);assert.equal(block.df,3);assert.equal(block.ms,200000);assert.equal(block.f,800);
 assert.ok(Math.abs(error.ss-1500)<1e-7);assert.equal(error.df,6);assert.ok(Math.abs(error.ms-250)<1e-8);
 assert.ok(Math.abs(total.ss-681500)<1e-8);assert.equal(total.df,11);
 assert.ok(Math.abs(tr.ss+block.ss+error.ss-total.ss)<1e-8);
});
test('RCBD refuses ANOVA with missing plots and lists missing identifiers',()=>{
 const {design,records}=fixture(),missing=records.pop();
 const a=S.rcbdAnova(records,design,2028);
 assert.equal(a.status,'incomplete');assert.deepEqual(a.missing,[missing.plot_id]);assert.equal(a.found,11);
 assert.equal(a.table,undefined);
});
test('RCBD rejects duplicate plot/year and unknown plots',()=>{
 const {design,records}=fixture();
 assert.throws(()=>S.rcbdAnova([...records,records[0]],design,2028),/trùng/);
 assert.throws(()=>S.rcbdAnova([...records,{...records[0],plot_id:'BAD'}],design,2028),/Không tìm thấy/);
});
test('RCBD zero residual does not report spurious infinite F',()=>{
 const {design,records}=fixture();
 for(const row of records){row.yield_kg_ha=1000+(row.block-1)*200+(Number(row.treatment_id.slice(1))-1)*100}
 const a=S.rcbdAnova(records,design,2028);
 assert.equal(a.status,'zero-residual');assert.equal(a.table[0].f,null);
});
test('paired contrast adjusts by matching the block and returns sample sd',()=>{
 const {design,records}=fixture(),r=S.blockedDifference(records,design,2028,'T01','T03');
 assert.equal(r.status,'complete');assert.equal(r.pairs,4);assert.equal(r.expectedPairs,4);
 assert.ok(Math.abs(r.meanDifference-200)<1e-9);
 assert.ok(r.sdDifference>0);
});
test('paired contrast permits incomplete pairs but marks partial and never claims full',()=>{
 const {design,records}=fixture();
 const filtered=records.filter(r=>!(r.block===1&&r.treatment_id==='T03'));
 const diff=S.blockedDifference(filtered,design,2028,'T01','T03');
 assert.equal(diff.status,'partial');assert.equal(diff.pairs,3);assert.equal(diff.expectedPairs,4);
});
test('per-year time series does not pool years into falsely independent replicates',()=>{
 const {design,records}=fixture();
 const next=records.map(r=>({...r,year:2029,yield_kg_ha:r.yield_kg_ha+100}));
 const series=S.timeSeries([...records,...next],design);
 assert.equal(series.length,6);assert.equal(series.filter(s=>s.year===2028).length,3);
 assert.ok(series.every(s=>s.complete));
 const selected=series.find(s=>s.year===2029&&s.treatment_id==='T01');
 assert.ok(selected.meanYieldKgHa>series.find(s=>s.year===2028&&s.treatment_id==='T01').meanYieldKgHa);
});
test('empty and invalid year input yields no fake results',()=>{
 const {design,records}=fixture();
 assert.throws(()=>S.rcbdAnova(records,design,1999),/Năm/);
 assert.equal(S.checkYear([],design,2028).found,0);
 assert.throws(()=>S.blockedDifference(records,design,2028,'T01','T01'),/khác nhau/);
});
