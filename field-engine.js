/* CoffeeRow Lab v2 | Pure scenario math. Results are not agronomic recommendations. */
(function(root, factory) {
  const api=factory();
  if (typeof module==='object' && module.exports) module.exports=api;
  if (root) root.CoffeeFieldEngine=api;
})(typeof window!=='undefined'?window:null, function(){
  'use strict';
  const finite=(v,fallback)=>Number.isFinite(Number(v))&&v!==''&&v!==null?Number(v):fallback;
  const clamp=(v,lo,hi,fallback=lo)=>Math.max(lo,Math.min(hi,finite(v,fallback)));
  const round=(v,places=2)=>Number(v.toFixed(places));
  function design(input={}){
    const areaHa=clamp(input.areaHa,0.1,10000,2);
    const rowM=clamp(input.rowM,2,6,3.2);
    const plantM=clamp(input.plantM,0.5,4,1.5);
    const infrastructurePct=clamp(input.infrastructurePct,0,35,12);
    const slopeDeg=clamp(input.slopeDeg,0,25,5);
    const canopyM=clamp(input.canopyM,0.5,4,1.7);
    const machineM=clamp(input.machineM,0.6,4.5,1.2);
    const safetyMarginM=clamp(input.safetyMarginM,0,1.5,0.3);
    const headlandM=clamp(input.headlandM,1,25,6);
    const turningRadiusM=clamp(input.turningRadiusM,0.5,15,3);
    const orientation=input.orientation==='downslope'?'downslope':'contour';
    const netHa=areaHa*(1-infrastructurePct/100);
    const densityHa=10000/(rowM*plantM);
    const estimatedTrees=Math.floor(netHa*densityHa);
    const squareSideM=Math.sqrt(netHa*10000);
    const rowCount=Math.floor(squareSideM/rowM);
    const treesPerRow=Math.floor(squareSideM/plantM);
    const schematicTrees=rowCount*treesPerRow;
    const nominalCorridorM=rowM-canopyM;
    const clearanceNeededM=machineM+2*safetyMarginM;
    const corridorPass=nominalCorridorM>=clearanceNeededM;
    const turningDiameterM=2*turningRadiusM;
    const turningPass=headlandM>=turningDiameterM;
    const scopePass=slopeDeg<10 && areaHa>2;
    // The official WASI specification has additional replanting, soil and disease criteria.
    const slopeWarning=slopeDeg>=10?'outside-wasi-slope':'needs-site-review';
    return {areaHa,rowM,plantM,infrastructurePct,slopeDeg,canopyM,machineM,
      safetyMarginM,headlandM,turningRadiusM,orientation,netHa,densityHa,estimatedTrees,
      squareSideM,rowCount,treesPerRow,schematicTrees,
      lateralPipeM:rowCount*squareSideM,
      nominalCorridorM,clearanceNeededM,corridorPass,turningDiameterM,turningPass,
      scopePass,slopeWarning};
  }
  function irrigation(input={},d=design(input)){
    const emitterPerTree=Math.round(clamp(input.emitterPerTree,1,8,2));
    const emitterLph=clamp(input.emitterLph,0.5,16,4);
    const hours=clamp(input.hours,0.1,20,2);
    const litersPerTree=emitterPerTree*emitterLph*hours;
    const totalLiters=d.estimatedTrees*litersPerTree;
    const totalM3=totalLiters/1000;
    // System volume assumes all trees irrigated simultaneously and ignores pressure, losses and zones.
    const instantaneousLph=d.estimatedTrees*emitterPerTree*emitterLph;
    return {emitterPerTree,emitterLph,hours,litersPerTree,totalLiters,totalM3,instantaneousLph,lateralPipeM:d.lateralPipeM};
  }
  function economics(input={},d=design(input)){
    const yieldKgPerHa=clamp(input.yieldKgPerHa,0,15000,3000);
    const priceVndPerKg=clamp(input.priceVndPerKg,0,1000000,100000);
    const capexVndPerHa=clamp(input.capexVndPerHa,0,5000000000,220000000);
    const annualOpexVndPerHa=clamp(input.annualOpexVndPerHa,0,5000000000,115000000);
    const years=Math.round(clamp(input.years,1,25,7));
    const annualRevenue=d.netHa*yieldKgPerHa*priceVndPerKg;
    const annualCost=d.netHa*annualOpexVndPerHa;
    const initialInvestment=d.netHa*capexVndPerHa;
    const annualNet=annualRevenue-annualCost;
    const cashflows=Array.from({length:years+1},(_,year)=>({
      year, cumulativeNet:-initialInvestment+year*annualNet,
      annualNet:year===0?-initialInvestment:annualNet
    }));
    const simplePaybackYears=annualNet>0?initialInvestment/annualNet:null;
    const horizonNet=cashflows[cashflows.length-1].cumulativeNet;
    return {yieldKgPerHa,priceVndPerKg,capexVndPerHa,annualOpexVndPerHa,years,
      annualRevenue,annualCost,initialInvestment,annualNet,cashflows,simplePaybackYears,horizonNet};
  }
  function evaluate(input={}){
    const d=design(input);return {design:d,irrigation:irrigation(input,d),economics:economics(input,d)};
  }
  return {design,irrigation,economics,evaluate,clamp,round};
});
