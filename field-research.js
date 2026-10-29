/* CoffeeRow Lab V3 — isolated, testable field research helpers. No network or hidden storage. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CoffeeResearch=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
function csvParse(input){
 if(typeof input!=='string'||input.length>3_000_000)throw Error('CSV trống hoặc vượt 3 MB');
 const source=input.replace(/^\uFEFF/,'');let rows=[],row=[],part='',inside=false;
 for(let i=0;i<source.length;i++){
  const ch=source[i];
  if(ch==='"'){if(inside&&source[i+1]==='"'){part+='"';i++;}else if(!inside&&part==='')inside=true;else if(inside)inside=false;else throw Error('Dấu nháy CSV sai quy tắc');}
  else if(ch===','&&!inside){row.push(part.trim());part='';}
  else if((ch==='\r'||ch==='\n')&&!inside){if(ch==='\r'&&source[i+1]==='\n')i++;row.push(part.trim());part='';if(row.some(c=>c!==''))rows.push(row);row=[];}
  else part+=ch;
 }
 if(inside)throw Error('Dấu nháy CSV chưa đóng');
 row.push(part.trim());if(row.some(c=>c!==''))rows.push(row);
 if(!rows.length)throw Error('CSV rỗng');
 if(rows.length>5001)throw Error('CSV tối đa 5.000 dòng dữ liệu');
 const headers=rows.shift().map(x=>x.toLowerCase());
 if(new Set(headers).size!==headers.length)throw Error('CSV có cột tên trùng nhau');
 if(rows.some(r=>r.length!==headers.length))throw Error('Các dòng CSV phải có cùng số cột');
 return {headers,rows:rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])))};
}
function csvEscape(value){let cell=String(value??'');const t=cell.trimStart();if(typeof value==='string'&&['=','+','-','@'].includes(t[0])&&!Number.isFinite(Number(t)))cell="'"+cell;return '"'+cell.replace(/"/g,'""')+'"'}
function csvEncode(headers,rows){return '\ufeff'+[headers,...rows].map(r=>r.map(csvEscape).join(',')).join('\r\n')+'\r\n'}
function numeric(v,name){if(v===''||v==null||!Number.isFinite(Number(v)))throw Error(name+' phải là số hợp lệ');return Number(v)}
function buildGrid(csv){
 const {headers,rows}=csvParse(csv);
 for(const k of ['x_m','z_m','elevation_m'])if(!headers.includes(k))throw Error('Thiếu cột '+k);
 if(rows.length<9||rows.length>1024)throw Error('Bản đồ cao độ cần 9–1.024 điểm lưới');
 const points=rows.map((row,i)=>{
 const x=numeric(row.x_m,'x_m dòng '+(i+2)),z=numeric(row.z_m,'z_m dòng '+(i+2)),h=numeric(row.elevation_m,'elevation_m dòng '+(i+2));
 if(Math.abs(x)>1000000||Math.abs(z)>1000000||Math.abs(h)>10000)throw Error('Tọa độ hoặc cao độ vượt giới hạn số học');
 return {x,z,h};
 });
 const xs=[...new Set(points.map(p=>p.x))].sort((a,b)=>a-b),zs=[...new Set(points.map(p=>p.z))].sort((a,b)=>a-b);
 if(xs.length<3||zs.length<3||xs.length>32||zs.length>32||xs.length*zs.length!==points.length)throw Error('Điểm phải phủ đầy lưới chữ nhật 3×3 đến 32×32');
 const stepX=(xs.at(-1)-xs[0])/(xs.length-1),stepZ=(zs.at(-1)-zs[0])/(zs.length-1);
 if(stepX<=0||stepZ<=0)throw Error('Bước lưới không hợp lệ');
 const approx=(a,b)=>Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(a),Math.abs(b));
 if(!xs.every((v,i)=>approx(v,xs[0]+stepX*i))||!zs.every((v,i)=>approx(v,zs[0]+stepZ*i)))throw Error('Dữ liệu cao độ cần lưới cách đều trên hai trục');
 const dict=new Map();
 for(const point of points){const k=point.x+'|'+point.z;if(dict.has(k))throw Error('Có tọa độ lặp '+k);dict.set(k,point.h);}
 const values=[];
 for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length;i++){const k=xs[i]+'|'+zs[j];if(!dict.has(k))throw Error('Thiếu điểm tại '+k);values.push(dict.get(k))}
 let maxSlope=0;
 for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length;i++){
 const val=values[j*xs.length+i];
 if(i+1<xs.length)maxSlope=Math.max(maxSlope,Math.atan(Math.abs(values[j*xs.length+i+1]-val)/stepX)*180/Math.PI);
 if(j+1<zs.length)maxSlope=Math.max(maxSlope,Math.atan(Math.abs(values[(j+1)*xs.length+i]-val)/stepZ)*180/Math.PI);
 }
 const minH=Math.min(...values),maxH=Math.max(...values),center=(minH+maxH)/2;
 return {xCount:xs.length,zCount:zs.length,x0:xs[0],z0:zs[0],dx:stepX,dz:stepZ,widthM:xs.at(-1)-xs[0],lengthM:zs.at(-1)-zs[0],values,minH,maxH,center,maxSlopeDeg:maxSlope};
}
function gridElevation(grid,u,v){
 // u,v in [0,1], bilinear within actual uploaded grid; no georeferencing.
 const px=Math.max(0,Math.min(grid.xCount-1,u*(grid.xCount-1))),pz=Math.max(0,Math.min(grid.zCount-1,v*(grid.zCount-1)));
 const x0=Math.floor(px),z0=Math.floor(pz),x1=Math.min(grid.xCount-1,x0+1),z1=Math.min(grid.zCount-1,z0+1);
 const tx=px-x0,tz=pz-z0,nx=grid.xCount,g=grid.values;
 const a=g[z0*nx+x0],b=g[z0*nx+x1],c=g[z1*nx+x0],d=g[z1*nx+x1];
 return (a*(1-tx)+b*tx)*(1-tz)+(c*(1-tx)+d*tx)*tz;
}
function sampleTerrainCSV(){
 const headers=['x_m','z_m','elevation_m'];const rows=[];
 for(let j=0;j<9;j++)for(let i=0;i<9;i++){
  const x=i*15,z=j*15,h=520+z*.075+x*.018+1.5*Math.sin(i*.75)*Math.cos(j*.8);
  rows.push([x,z,h.toFixed(3)]);
 }
 return csvEncode(headers,rows);
}
function rng(seed){
 let h=2166136261>>>0;for(const c of String(seed)){h=Math.imul(h^c.charCodeAt(0),16777619)}
 return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
}
function treatmentsFromText(s){
 const arr=String(s).split(/[\n;]/).map(v=>v.trim()).filter(Boolean);
 if(arr.length<2||arr.length>6)throw Error('Cần từ 2 đến 6 nghiệm thức');
 if(arr.some(t=>t.length>70))throw Error('Tên nghiệm thức quá dài (tối đa 70 ký tự)');
 if(new Set(arr.map(t=>t.toLocaleLowerCase('vi'))).size!==arr.length)throw Error('Tên nghiệm thức bị trùng');
 return arr;
}
function trialDesign(input={}){
 const treatments=Array.isArray(input.treatments)?input.treatments:treatmentsFromText(input.treatments??'Đối chứng\nWASI 3,2 × 1,5 m\nHàng dày (giả định)');
 if(treatments.length<2||treatments.length>6||new Set(treatments).size!==treatments.length)throw Error('Nghiệm thức không hợp lệ');
 const blocks=Number(input.blocks??4);if(!Number.isInteger(blocks)||blocks<3||blocks>8)throw Error('Số khối lặp từ 3 đến 8');
 const plotWidthM=numeric(input.plotWidthM??20,'Chiều rộng lô'),plotLengthM=numeric(input.plotLengthM??30,'Chiều dài lô');
 if(plotWidthM<5||plotWidthM>200||plotLengthM<5||plotLengthM>200)throw Error('Kích thước lô từ 5–200 m');
 const rand=rng(input.seed??2026),plots=[];
 for(let b=1;b<=blocks;b++){
  const order=[...treatments.keys()];
  for(let i=order.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
  for(let p=1;p<=order.length;p++){const t=order[p-1];
    plots.push({plot_id:'B'+String(b).padStart(2,'0')+'-P'+String(p).padStart(2,'0'),block:b,position:p,treatment_id:'T'+String(t+1).padStart(2,'0'),treatment:treatments[t],plot_area_m2:plotWidthM*plotLengthM,plot_width_m:plotWidthM,plot_length_m:plotLengthM,seed:String(input.seed??2026)})
  }
 }
 return {plots,blocks,treatments,seed:String(input.seed??2026),plotWidthM,plotLengthM,totalPlotAreaM2:plots.length*plotWidthM*plotLengthM};
}
function observationTemplate(design){
 return csvEncode(['plot_id','year','harvest_kg','harvest_area_m2','irrigation_m3','labor_hours','notes'],
 design.plots.map(p=>[p.plot_id,2027,'',p.plot_area_m2,'','','']));
}
function parseObservations(csv,design){
 const data=csvParse(csv);
 for(const key of ['plot_id','year','harvest_kg','harvest_area_m2'])if(!data.headers.includes(key))throw Error('Thiếu cột '+key);
 const lookup=new Map(design.plots.map(p=>[p.plot_id,p]));const seen=new Set(),records=[];
 for(let i=0;i<data.rows.length;i++){
  const row=data.rows[i];if(!row.harvest_kg)continue; // blank template rows are not observations
  const p=lookup.get(row.plot_id);if(!p)throw Error('Mã lô không thuộc thiết kế: '+row.plot_id);
  const year=numeric(row.year,'year');if(!Number.isInteger(year)||year<2000||year>2100)throw Error('Năm không hợp lệ');
  const key=p.plot_id+'|'+year;if(seen.has(key))throw Error('Dòng trùng mã lô/năm '+key);seen.add(key);
  const harvestKg=numeric(row.harvest_kg,'harvest_kg'),areaM2=numeric(row.harvest_area_m2,'harvest_area_m2');
  if(harvestKg<0||areaM2<=0||areaM2>p.plot_area_m2)throw Error('Năng suất/diện tích thu hoạch phải hợp lệ và không vượt diện tích lô');
  const waterM3=row.irrigation_m3?numeric(row.irrigation_m3,'irrigation_m3'):null;
  const laborHours=row.labor_hours?numeric(row.labor_hours,'labor_hours'):null;
  if(waterM3!==null&&waterM3<0||laborHours!==null&&laborHours<0)throw Error('Nước tưới và giờ công không thể âm');
  records.push({...p,year,harvest_kg:harvestKg,harvest_area_m2:areaM2,irrigation_m3:waterM3,labor_hours:laborHours,yield_kg_ha:harvestKg/areaM2*10000,notes:row.notes||''});
 }
 if(!records.length)throw Error('Không có bản ghi thu hoạch hợp lệ. Vui lòng điền harvest_kg trước khi nhập.');
 return records;
}
function summarizeObservations(records){
 const groups=new Map();
 for(const r of records){const key=r.year+'|'+r.treatment_id;if(!groups.has(key))groups.set(key,{year:r.year,treatment_id:r.treatment_id,treatment:r.treatment,yields:[],plots:new Set(),water:[],labor:[]});
 const g=groups.get(key);g.yields.push(r.yield_kg_ha);g.plots.add(r.plot_id);if(r.irrigation_m3!==null)g.water.push(r.irrigation_m3);if(r.labor_hours!==null)g.labor.push(r.labor_hours)}
 return [...groups.values()].map(g=>({year:g.year,treatment:g.treatment,treatment_id:g.treatment_id,observations:g.yields.length,plots:g.plots.size,
 meanYieldKgHa:g.yields.reduce((a,b)=>a+b,0)/g.yields.length,
 minYieldKgHa:Math.min(...g.yields),maxYieldKgHa:Math.max(...g.yields),
 meanWaterM3:g.water.length?g.water.reduce((a,b)=>a+b,0)/g.water.length:null,
 meanLaborHours:g.labor.length?g.labor.reduce((a,b)=>a+b,0)/g.labor.length:null
 })).sort((a,b)=>a.year-b.year||a.treatment_id.localeCompare(b.treatment_id));
}
return {csvParse,csvEncode,buildGrid,gridElevation,sampleTerrainCSV,trialDesign,treatmentsFromText,observationTemplate,parseObservations,summarizeObservations};
});
