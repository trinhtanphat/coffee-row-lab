/* CoffeeRow Lab V4 — conservative RCBD one-year ANOVA + longitudinal descriptive analyses.
  No invented observations, no causal claims from missing blocks or pooled repeated years. */
(function(root,factory){const lib=factory();if(typeof module==='object'&&module.exports)module.exports=lib;if(root)root.CoffeeStatistics=lib;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const avg=a=>a.reduce((s,n)=>s+n,0)/a.length;
function checkYear(records,design,year){
 if(!design||!Array.isArray(design.plots)||!Array.isArray(records))throw Error('Thiếu thiết kế và nhật ký quan sát');
 const y=Number(year);
 if(!Number.isInteger(y)||y<2000||y>2100)throw Error('Năm không hợp lệ');
 const plots=design.plots,keys=new Set(plots.map(p=>p.plot_id));
 const yearRows=records.filter(r=>Number(r.year)===y);
 const seen=new Set();
 for(const row of yearRows){
  if(!keys.has(row.plot_id))throw Error('Không tìm thấy mã lô trong thiết kế: '+row.plot_id);
  if(seen.has(row.plot_id))throw Error('Lô trùng bản ghi trong năm: '+row.plot_id);
  seen.add(row.plot_id);
  if(!Number.isFinite(Number(row.yield_kg_ha))||Number(row.yield_kg_ha)<0)throw Error('Năng suất phải là số kg nhân/ha không âm');
 }
 const missing=plots.filter(p=>!seen.has(p.plot_id)).map(p=>p.plot_id);
 const complete=missing.length===0 && yearRows.length===plots.length;
 return {year:y,rows:yearRows,complete,missing,found:yearRows.length,expected:plots.length};
}
function rcbdAnova(records,design,year){
 const yearData=checkYear(records,design,year);
 if(!yearData.complete)return {status:'incomplete',...yearData,reason:'Thiếu '+yearData.missing.length+' lô; không tính ANOVA RCBD với thiết kế chưa đầy đủ.'};
 const treatments=design.treatments.map((t,i)=>({id:'T'+String(i+1).padStart(2,'0'),label:t}));
 const blocks=design.blocks,t=treatments.length;
 if(t<2||blocks<3)throw Error('RCBD cần ít nhất 2 nghiệm thức, 3 khối');
 const byPlot=new Map(yearData.rows.map(r=>[r.plot_id,Number(r.yield_kg_ha)]));
 const observed=design.plots.map(p=>({...p,value:byPlot.get(p.plot_id)}));
 const grand=avg(observed.map(r=>r.value));
 const treatmentMeans=treatments.map(({id,label})=>({id,label,mean:avg(observed.filter(r=>r.treatment_id===id).map(r=>r.value))}));
 const blockMeans=Array.from({length:blocks},(_,i)=>({block:i+1,mean:avg(observed.filter(r=>r.block===i+1).map(r=>r.value))}));
 const sst=observed.reduce((s,r)=>s+(r.value-grand)**2,0);
 const ssTreat=blocks*treatmentMeans.reduce((s,m)=>s+(m.mean-grand)**2,0);
 const ssBlock=t*blockMeans.reduce((s,m)=>s+(m.mean-grand)**2,0);
 const tr=new Map(treatmentMeans.map(m=>[m.id,m.mean])), bl=new Map(blockMeans.map(m=>[m.block,m.mean]));
 const residuals=observed.map(r=>r.value-tr.get(r.treatment_id)-bl.get(r.block)+grand);
 const ssError=residuals.reduce((s,r)=>s+r*r,0);
 const dfTreatment=t-1,dfBlock=blocks-1,dfError=(t-1)*(blocks-1),dfTotal=t*blocks-1;
 const msTreatment=ssTreat/dfTreatment,msBlock=ssBlock/dfBlock,msError=ssError/dfError;
 // If all cells are exactly determined by block+treatment (zero residual), F cannot be estimated.
 const small=1e-12*Math.max(1,sst);
 const degenerate=ssError<=small;
 const ft=degenerate?null:msTreatment/msError;
 const fb=degenerate?null:msBlock/msError;
 return {status:degenerate?'zero-residual':'complete',year:Number(year),expected:yearData.expected,
  treatmentMeans,blockMeans,grandMean:grand,
  table:[
   {source:'Nghiệm thức',ss:ssTreat,df:dfTreatment,ms:msTreatment,f:ft},
   {source:'Khối',ss:ssBlock,df:dfBlock,ms:msBlock,f:fb},
   {source:'Sai số',ss:ssError,df:dfError,ms:msError,f:null},
   {source:'Tổng',ss:sst,df:dfTotal,ms:null,f:null}
  ],residuals,degenerate,
  note:degenerate?'Sai số dư gần bằng 0; không tính F hay suy diễn ý nghĩa thống kê.':'Thống kê F cho từng năm, giả định hiệu ứng cộng và sai số độc lập, phương sai đồng nhất, phân phối gần chuẩn. Chưa tính p-value, CI hoặc so sánh nhiều cặp.'};
}
function blockedDifference(records,design,year,treatmentA,treatmentB){
 if(!design?.treatments||treatmentA===treatmentB)throw Error('Chọn hai nghiệm thức khác nhau');
 const valid=design.treatments.map((t,i)=>'T'+String(i+1).padStart(2,'0'));
 if(!valid.includes(treatmentA)||!valid.includes(treatmentB))throw Error('Nghiệm thức không tồn tại');
 const data=checkYear(records,design,year),map=new Map(data.rows.map(r=>[r.plot_id,r.yield_kg_ha]));
 const differences=[];
 for(let b=1;b<=design.blocks;b++){
  const a=design.plots.find(p=>p.block===b&&p.treatment_id===treatmentA),bb=design.plots.find(p=>p.block===b&&p.treatment_id===treatmentB);
  if(map.has(a.plot_id)&&map.has(bb.plot_id))differences.push({block:b,difference:map.get(bb.plot_id)-map.get(a.plot_id)});
 }
 const n=differences.length,mean=n?avg(differences.map(r=>r.difference)):null;
 const sd=n>1?Math.sqrt(differences.reduce((s,r)=>s+(r.difference-mean)**2,0)/(n-1)):null;
 return {year:Number(year),pairs:n,expectedPairs:design.blocks,meanDifference:mean,sdDifference:sd,
  status:n===design.blocks?'complete':'partial',differences};
}
function timeSeries(records,design){
 const years=[...new Set(records.map(r=>Number(r.year)))].sort((a,b)=>a-b);
 const result=[];
 for(const y of years){for(let t=0;t<design.treatments.length;t++){
  const id='T'+String(t+1).padStart(2,'0'),subset=records.filter(r=>r.year===y&&r.treatment_id===id);
  if(!subset.length)continue;
  result.push({year:y,treatment_id:id,treatment:design.treatments[t],n:subset.length,
   meanYieldKgHa:avg(subset.map(r=>r.yield_kg_ha)),complete:subset.length===design.blocks});
 }}
 return result;
}
return {checkYear,rcbdAnova,blockedDifference,timeSeries};
});
