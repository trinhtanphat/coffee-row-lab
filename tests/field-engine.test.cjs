const test=require('node:test');
const assert=require('node:assert/strict');
const {design,irrigation,economics,evaluate}=require('../field-engine.js');
test('WASI nominal geometry: density and modeled plot',()=>{
 const d=design({areaHa:2,rowM:3.2,plantM:1.5,infrastructurePct:12,slopeDeg:5});
 assert.ok(Math.abs(d.densityHa-2083.3333)<.01);
 assert.equal(d.estimatedTrees,3666);
 assert.ok(Math.abs(d.netHa-1.76)<1e-9);
});
test('WASI 2021 is limited to slope under 10 degrees and area above 2ha',()=>{
 assert.equal(design({areaHa:2,slopeDeg:5}).scopePass,false);
 assert.equal(design({areaHa:2.1,slopeDeg:9.99}).scopePass,true);
 assert.equal(design({areaHa:3,slopeDeg:10}).scopePass,false);
 assert.equal(design({areaHa:3,slopeDeg:15}).slopeWarning,'outside-wasi-slope');
});
test('corridor check is a basic dimension screen, not a safety certification',()=>{
 assert.equal(design({rowM:3.2,canopyM:1.7,machineM:1.2,safetyMarginM:.3}).corridorPass,false);
 assert.equal(design({rowM:3.8,canopyM:1.4,machineM:1.2,safetyMarginM:.3}).corridorPass,true);
});
test('turning room compares diameter with assumed headland',()=>{
 assert.equal(design({headlandM:6,turningRadiusM:3}).turningPass,true);
 assert.equal(design({headlandM:5,turningRadiusM:3}).turningPass,false);
});
test('orientation is restricted to two known values',()=>{
 assert.equal(design({orientation:'downslope'}).orientation,'downslope');
 assert.equal(design({orientation:'arbitrary'}).orientation,'contour');
});
test('irrigation volume dimensions are consistent',()=>{
 const d=design();const i=irrigation({emitterPerTree:2,emitterLph:4,hours:2},d);
 assert.equal(i.litersPerTree,16);
 assert.equal(i.totalLiters,d.estimatedTrees*16);
 assert.ok(Math.abs(i.totalM3-58.656)<1e-9);
 assert.equal(i.instantaneousLph,d.estimatedTrees*8);
});
test('economic cashflow respects annual inputs and initial investment',()=>{
 const d=design({areaHa:1,infrastructurePct:0});
 const e=economics({yieldKgPerHa:1000,priceVndPerKg:1000,capexVndPerHa:100000,annualOpexVndPerHa:200000,years:3},d);
 assert.equal(e.annualRevenue,1000000);
 assert.equal(e.annualCost,200000);
 assert.equal(e.annualNet,800000);
 assert.equal(e.initialInvestment,100000);
 assert.equal(e.cashflows[0].cumulativeNet,-100000);
 assert.equal(e.cashflows[3].cumulativeNet,2300000);
});
test('nonprofitable scenario does not claim payback',()=>{
 const e=economics({yieldKgPerHa:0,priceVndPerKg:0,annualOpexVndPerHa:1000000});
 assert.equal(e.simplePaybackYears,null);
 assert.ok(e.horizonNet<0);
});
test('bounded inputs do not generate NaN',()=>{
 const e=evaluate({rowM:'',plantM:'garbage',areaHa:Infinity,emitterLph:Infinity,years:0,capexVndPerHa:'x'});
 assert.ok(Number.isFinite(e.design.densityHa));assert.ok(Number.isFinite(e.irrigation.totalM3));
 assert.ok(Number.isFinite(e.economics.horizonNet));assert.equal(e.economics.years,1);
});
test('estimated lateral pipe length scales with planting area and spacing',()=>{
 const small=design({areaHa:2,rowM:3.2});
 const big=design({areaHa:4,rowM:3.2});
 assert.ok(big.lateralPipeM>small.lateralPipeM);
 assert.ok(small.rowCount>0);
});
