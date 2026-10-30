/* CoffeeRow Lab V7: validated plot-level field measurement notebooks.
   A tree is a subsample, never an independent experimental replicate. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CoffeeFieldbook=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const VARIABLES=Object.freeze({
 plant_height:{label:'Chiều cao cây',unit:'cm',minimum:0,maximum:3000},
 canopy_diameter:{label:'Đường kính tán',unit:'cm',minimum:0,maximum:3000},
 soil_moisture:{label:'Độ ẩm đất',unit:'pct',minimum:0,maximum:100}
});
const HEADERS=Object.freeze(['plot_id','block','treatment_id','year','visit_date','variable','unit','sampled_trees','plot_mean','instrument_method','water_m3','labor_hours','field_notes']);
function requiredNumber(value,label){if(value===null||value===undefined||String(value).trim()===''||!Number.isFinite(Number(value)))throw Error(label+' không phải số hợp lệ');return Number(value)}
function dayValid(day){
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const date=new Date(day+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;
}
function textField(value,label,max){const str=String(value??'');if(str.length>max||/[\x00-\x08\x0b\x0e-\x1f]/.test(str))throw Error(label+' tối đa '+max+' ký tự và không chứa ký tự điều khiển');return str;}
function parse(csv,trial,csvParser){
 if(!trial?.plots?.length||!Array.isArray(trial.treatments))throw Error('Chưa có thiết kế lô hợp lệ');
 if(typeof csvParser!=='function')throw Error('Thiếu trình đọc CSV');
 const parsed=csvParser(csv);
 for(const h of HEADERS.slice(0,9))if(!parsed.headers.includes(h))throw Error('CSV thiếu cột '+h);
 const plots=new Map(trial.plots.map(p=>[p.plot_id,p])),seen=new Set(),records=[];
 for(let i=0;i<parsed.rows.length;i++){
  const r=parsed.rows[i],line=i+2;
  // Entirely blank observation slot from the official downloadable template: skip.
  if(r.plot_mean===''&&r.visit_date===''&&r.sampled_trees===''&&!r.water_m3&&!r.labor_hours&&!r.instrument_method&&!r.field_notes)continue;
  if(r.plot_mean===''||r.visit_date===''||r.sampled_trees==='')throw Error('Dòng '+line+': một phép đo đang điền dở (cần ngày, số cây mẫu và trung bình lô)');
  const p=plots.get(r.plot_id);if(!p)throw Error('Dòng '+line+': không tìm thấy mã lô '+r.plot_id);
  const block=requiredNumber(r.block,'block dòng '+line);if(!Number.isInteger(block)||block!==p.block)throw Error('Dòng '+line+': block không khớp thiết kế');
  if(r.treatment_id!==p.treatment_id)throw Error('Dòng '+line+': treatment_id không khớp thiết kế');
  const year=requiredNumber(r.year,'year dòng '+line);if(!Number.isInteger(year)||year<2000||year>2100)throw Error('Dòng '+line+': năm không hợp lệ');
  if(!dayValid(r.visit_date)||Number(r.visit_date.slice(0,4))!==year)throw Error('Dòng '+line+': ngày đo không hợp lệ hoặc khác năm khai báo');
  const variable=VARIABLES[r.variable];if(!variable)throw Error('Dòng '+line+': biến đo không được hỗ trợ: '+r.variable);
  if(r.unit!==variable.unit)throw Error('Dòng '+line+': đơn vị '+r.unit+' phải là '+variable.unit);
  const trees=requiredNumber(r.sampled_trees,'sampled_trees dòng '+line);
  if(!Number.isInteger(trees)||trees<1||trees>10000)throw Error('Dòng '+line+': số cây lấy mẫu không hợp lệ');
  const mean=requiredNumber(r.plot_mean,'plot_mean dòng '+line);
  if(mean<variable.minimum||mean>variable.maximum)throw Error('Dòng '+line+': giá trị trung bình lô ngoài giới hạn kiểm tra đầu vào');
  function optNumber(key){if(r[key]===undefined||r[key]==='')return null;const v=requiredNumber(r[key],key);if(v<0||v>10000000)throw Error('Dòng '+line+': '+key+' phải không âm và trong phạm vi');return v;}
  const instrument=textField(r.instrument_method,'instrument_method',160);
  const notes=textField(r.field_notes,'field_notes',500);
  const key=p.plot_id+'|'+year+'|'+r.visit_date+'|'+r.variable;
  if(seen.has(key))throw Error('Dòng '+line+': trùng lô, ngày và biến đo '+key);
  seen.add(key);
  records.push({plot_id:p.plot_id,block:p.block,treatment_id:p.treatment_id,treatment:p.treatment,
   year,visit_date:r.visit_date,variable:r.variable,unit:r.unit,sampled_trees:trees,plot_mean:mean,
   instrument_method:instrument,water_m3:optNumber('water_m3'),labor_hours:optNumber('labor_hours'),field_notes:notes});
 }
 if(!records.length)throw Error('Chưa có phép đo nào: hãy điền ngày, số cây mẫu và trung bình lô');
 return records;
}
function csv(records,encoder){
 if(!Array.isArray(records)||typeof encoder!=='function')throw Error('Thiếu dữ liệu hoặc bộ xuất CSV');
 return encoder(HEADERS,records.map(r=>HEADERS.map(k=>r[k]??'')));
}
function summarize(records,trial){
 if(!Array.isArray(records)||!trial?.plots?.length)throw Error('Thiếu dữ liệu');
 const groups=new Map();
 for(const r of records){
  const key=r.year+'|'+r.visit_date+'|'+r.variable+'|'+r.treatment_id;
  if(!groups.has(key))groups.set(key,{year:r.year,visit_date:r.visit_date,variable:r.variable,treatment_id:r.treatment_id,treatment:r.treatment,plots:new Set(),values:[],treeCounts:0});
  const g=groups.get(key);g.plots.add(r.plot_id);g.values.push(r.plot_mean);g.treeCounts+=r.sampled_trees;
 }
 const out=[...groups.values()].map(g=>({
  year:g.year,visit_date:g.visit_date,variable:g.variable,variable_label:VARIABLES[g.variable].label,unit:VARIABLES[g.variable].unit,
  treatment_id:g.treatment_id,treatment:g.treatment,plot_count:g.plots.size,expected_plots:trial.blocks,
  sampled_trees_total:g.treeCounts,complete:g.plots.size===trial.blocks,
  mean_of_plot_means:g.values.reduce((s,v)=>s+v,0)/g.values.length,
  min_plot_mean:Math.min(...g.values),max_plot_mean:Math.max(...g.values)
 }));
 return out.sort((a,b)=>a.visit_date.localeCompare(b.visit_date)||a.variable.localeCompare(b.variable)||a.treatment_id.localeCompare(b.treatment_id));
}
return {VARIABLES,HEADERS,dayValid,parse,csv,summarize};
});