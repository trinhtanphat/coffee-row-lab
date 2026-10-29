const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../field-research.js');
test('CSV quoted fields, BOM, embedded comma and escaped quotes',()=>{
 const data=R.csvParse('\ufeffx_m,z_m,elevation_m,notes\r\n0,0,5,"a,b"\r\n1,0,6,"quoted ""word"""\r\n');
 assert.equal(data.rows.length,2);assert.equal(data.rows[0].notes,'a,b');assert.equal(data.rows[1].notes,'quoted "word"');
});
test('CSV field count, duplicate headers and invalid quoting are rejected',()=>{
 assert.throws(()=>R.csvParse('a,a\n1,2'),/trùng/);
 assert.throws(()=>R.csvParse('x,y\n1'),/cùng số cột/);
 assert.throws(()=>R.csvParse('a,b\n"x,y'),/nháy/);
});
test('terrain sample parses rectangular grid and elevation interpolates',()=>{
 const grid=R.buildGrid(R.sampleTerrainCSV());assert.equal(grid.xCount,9);assert.equal(grid.zCount,9);
 assert.ok(grid.maxH>grid.minH);assert.ok(grid.maxSlopeDeg>0);
 assert.equal(R.gridElevation(grid,0,0),grid.values[0]);
 assert.equal(R.gridElevation(grid,1,1),grid.values.at(-1));
 assert.ok(Number.isFinite(R.gridElevation(grid,.37,.64)));
});
test('terrain import supports 3×3 grid and bilinear interpolation',()=>{
 let csv='x_m,z_m,elevation_m\n';
 for(let j=0;j<3;j++)for(let i=0;i<3;i++)csv+=i*5+','+j*5+','+(100+i*2+j*4)+'\n';
 const grid=R.buildGrid(csv);
 assert.equal(grid.xCount,3);assert.equal(grid.zCount,3);assert.equal(R.gridElevation(grid,.5,.5),106);
 assert.equal(R.gridElevation(grid,.25,.25),103);
});
test('terrain import rejects missing, duplicate, irregular coordinates and giant samples',()=>{
 assert.throws(()=>R.buildGrid('x_m,z_m,elevation_m\n0,0,0'),/9/);
 let csv='x_m,z_m,elevation_m\n';
 for(let j=0;j<3;j++)for(let i=0;i<3;i++)csv+=i+','+j+','+i+'\n';
 assert.throws(()=>R.buildGrid(csv.replace('2,2,2','2,2,not_a_number')),/số/);
 assert.throws(()=>R.buildGrid(csv.replace('2,2,2','1,2,2')),/lưới|lặp/);
 let irr='x_m,z_m,elevation_m\n';
 for(let j=0;j<3;j++)for(let i=0;i<3;i++)irr+=(i===2?4:i)+','+j+',1\n';
 assert.throws(()=>R.buildGrid(irr),/cách đều/);
});
test('RCBD deterministic, unique plot IDs and each treatment once per block',()=>{
 const d=R.trialDesign({treatments:['T1','T2','T3'],blocks:4,seed:'2026',plotWidthM:20,plotLengthM:30});
 const same=R.trialDesign({treatments:['T1','T2','T3'],blocks:4,seed:'2026',plotWidthM:20,plotLengthM:30});
 assert.deepEqual(d,same);assert.equal(d.plots.length,12);assert.equal(d.totalPlotAreaM2,7200);
 assert.equal(new Set(d.plots.map(p=>p.plot_id)).size,12);
 for(let b=1;b<=4;b++)assert.deepEqual(d.plots.filter(p=>p.block===b).map(p=>p.treatment).sort(),['T1','T2','T3']);
});
test('RCBD varied seed, validates treatments and required replicates',()=>{
 const a=R.trialDesign({blocks:4,seed:'one'}),b=R.trialDesign({blocks:4,seed:'very-different'});
 assert.notDeepEqual(a.plots.map(p=>p.treatment),b.plots.map(p=>p.treatment));
 assert.throws(()=>R.treatmentsFromText('same\nsame'),/trùng/);
 assert.throws(()=>R.trialDesign({blocks:2}),/3 đến 8/);
});
test('blank template exports all plot IDs and no invented yield data',()=>{
 const d=R.trialDesign();const parsed=R.csvParse(R.observationTemplate(d));
 assert.equal(parsed.rows.length,d.plots.length);
 assert.equal(parsed.rows.every(p=>p.harvest_kg===''),true);
});
test('real observations are transformed to kg per hectare with metadata',()=>{
 const d=R.trialDesign({treatments:['Control','Row'],blocks:3,seed:'fixed'});
 const p=d.plots[0],headers=['plot_id','year','harvest_kg','harvest_area_m2','irrigation_m3','labor_hours','notes'];
 const csv=R.csvEncode(headers,[[p.plot_id,2028,30,300,2.5,5,'field measured']]);
 const records=R.parseObservations(csv,d),summaries=R.summarizeObservations(records);
 assert.equal(records[0].yield_kg_ha,1000);assert.equal(summaries[0].meanYieldKgHa,1000);
 assert.equal(summaries[0].meanLaborHours,5);
});
test('observations reject invalid area, year, duplicate plot-year, unknown plot',()=>{
 const d=R.trialDesign(),p=d.plots[0],head=['plot_id','year','harvest_kg','harvest_area_m2'];
 const make=rows=>R.csvEncode(head,rows);
 assert.throws(()=>R.parseObservations(make([[p.plot_id,2028,20,999999]]),d),/vượt/);
 assert.throws(()=>R.parseObservations(make([[p.plot_id,2028,20,200],[p.plot_id,2028,30,200]]),d),/trùng/);
 assert.throws(()=>R.parseObservations(make([['BAD',2028,20,200]]),d),/không thuộc/);
 assert.throws(()=>R.parseObservations(make([[p.plot_id,1999,20,200]]),d),/Năm/);
});

test('Vietnamese decimal commas in treatment labels are preserved',()=>{const names=R.treatmentsFromText('Đối chứng 3 × 3 m\nWASI 3,2 × 1,5 m\nHàng dày (giả định)');assert.equal(names.length,3);assert.equal(names[1],'WASI 3,2 × 1,5 m')});

test('CSV exports neutralize spreadsheet formula injection in string labels',()=>{const csv=R.csvEncode(['treatment','yield'],[['=HYPERLINK(\"https://example.com\")',-4],['@SUM(1,1)',2]]);assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes("'@SUM"));assert.ok(csv.includes('"-4"'))});
