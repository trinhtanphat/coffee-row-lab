const test = require('node:test');
const assert = require('node:assert/strict');
const {computeMetrics, PRESETS, validNumber} = require('../app.js');
test('3.2 x 1.5 m density matches geometry',()=>{const r=computeMetrics({area:1,row:3.2,plant:1.5,service:0});assert.ok(Math.abs(r.density-2083.3333)<.01);assert.equal(r.treeCount,2083)});
test('infrastructure allowance is applied once',()=>{const r=computeMetrics({area:2,row:3.2,plant:1.5,service:12});assert.ok(Math.abs(r.netArea-1.76)<1e-9);assert.equal(r.treeCount,3666)});
test('traditional preset has 1111 plants/ha approximately',()=>{const r=computeMetrics({area:1,...PRESETS.traditional,service:0});assert.equal(r.treeCount,1111)});
test('dense Brazil scenario is clearly a mathematical example',()=>{const r=computeMetrics({area:1,...PRESETS.dense,service:0});assert.equal(r.treeCount,3571)});
test('invalid values clamped',()=>{const r=computeMetrics({area:-3,row:0,plant:0,service:200});assert.equal(r.area,.1);assert.equal(r.row,2);assert.equal(r.plant,.5);assert.equal(r.service,35)});
test('non finite input is replaced',()=>{assert.equal(validNumber(NaN,2,6),2);assert.equal(validNumber(Infinity,2,6),2)});
