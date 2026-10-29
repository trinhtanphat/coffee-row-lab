/* CoffeeRow Lab V2 | zero-dependency orbitable perspective field renderer */
(()=>{
'use strict';
if(!document.getElementById('terrainCanvas') || !window.CoffeeFieldEngine) return;
const E=window.CoffeeFieldEngine, el=id=>document.getElementById(id);
const n=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}), whole=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0});
const money=v=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(v/1e6)+' tr';
const ids={area:'area',row:'rowSpace',plant:'plantSpace',service:'service',slope:'slope'};
const inputs={area:el(ids.area),row:el(ids.row),plant:el(ids.plant),service:el(ids.service),slope:el(ids.slope),
 orientation:el('v2Orientation'),canopy:el('v2Canopy'),machine:el('v2MachineWidth'),margin:el('v2Margin'),headland:el('v2Headland'),turning:el('v2TurnRadius'),
 count:el('v2EmitterCount'),rate:el('v2EmitterRate'),hours:el('v2WaterHours'),
 yield:el('v2Yield'),price:el('v2Price'),capex:el('v2Capex'),opex:el('v2Opex'),years:el('v2Years')};
const canvas=el('terrainCanvas'),ctx=canvas.getContext('2d',{alpha:false});
const camera={yaw:.71,pitch:.65,zoom:1},flags={pipes:true,route:true,playing:false,progress:0};
let current=null,dragging=false,lastPoint=null,lastTime=0,animationId=0;
function read(){return {
 areaHa:inputs.area.value,rowM:inputs.row.value,plantM:inputs.plant.value,
 infrastructurePct:inputs.service.value,slopeDeg:inputs.slope.value,
 orientation:inputs.orientation.value,canopyM:inputs.canopy.value,machineM:inputs.machine.value,
 safetyMarginM:inputs.margin.value,headlandM:inputs.headland.value,turningRadiusM:inputs.turning.value,
 emitterPerTree:inputs.count.value,emitterLph:inputs.rate.value,hours:inputs.hours.value,
 yieldKgPerHa:inputs.yield.value,priceVndPerKg:inputs.price.value,
 capexVndPerHa:Number(inputs.capex.value)*1000000,annualOpexVndPerHa:Number(inputs.opex.value)*1000000,
 years:inputs.years.value
};}
function update(){
 current=E.evaluate(read());
 const d=current.design,i=current.irrigation,e=current.economics;
 el('v2SceneLabel').textContent=n.format(d.areaHa)+' ha · '+(d.orientation==='contour'?'theo đồng mức':'dọc đường dốc')+' · '+n.format(d.slopeDeg)+'°';
 el('v2Corridor').textContent=n.format(d.nominalCorridorM)+' m';
 el('v2CorridorDesc').textContent=(d.corridorPass?'Đạt':'Không đạt')+' phép so sánh rộng: cần '+n.format(d.clearanceNeededM)+' m (thiết bị + khoảng hở).';
 el('v2Corridor').classList.toggle('v2-bad',!d.corridorPass);
 el('v2Turning').textContent=d.turningPass?'Đủ theo giả định':'Thiếu theo giả định';
 el('v2TurningDesc').textContent='Đầu hàng '+n.format(d.headlandM)+' m; đường kính quay giả định '+n.format(d.turningDiameterM)+' m.';
 el('v2Turning').classList.toggle('v2-bad',!d.turningPass);
 el('v2Wasi').textContent=d.scopePass?'Đạt kiểm tra sơ bộ':'Chưa đạt kiểm tra sơ bộ';
 el('v2WasiDesc').textContent='Dốc '+n.format(d.slopeDeg)+'° '+(d.slopeDeg<10?'✓':'✗')+' (< 10°); diện tích '+n.format(d.areaHa)+' ha '+(d.areaHa>2?'✓':'✗')+' (> 2 ha). Chưa xét điều kiện đất, bệnh và tái canh.';
 el('v2Wasi').classList.toggle('v2-bad',!d.scopePass);
 const risk=d.slopeDeg>=10?'Độ dốc từ 10° trở lên nằm ngoài phạm vi quy trình WASI 2021 [05]. '
  :d.orientation==='downslope'?'Hàng dọc đường dốc có thể làm tăng rủi ro xói mòn: cần thiết kế bảo vệ đất theo khảo sát. ':'';
 el('v2ModelWarning').textContent=risk+'Mô hình phối cảnh lý tưởng, không lấy dữ liệu độ cao thực (DEM) và không đánh giá an toàn thiết bị.';
 el('v2TotalWater').textContent=n.format(i.totalM3)+' m³';
 el('v2WaterTree').textContent=n.format(i.litersPerTree)+' lít';
 el('v2WaterFlow').textContent=n.format(i.instantaneousLph/1000)+' m³/h';
 el('v2PipeLength').textContent=whole.format(i.lateralPipeM)+' m';
 el('v2Revenue').textContent=money(e.annualRevenue);
 el('v2AnnualNet').textContent=money(e.annualNet);
 el('v2CapexOut').textContent=money(e.initialInvestment);
 el('v2AnnualNet').style.color=e.annualNet<0?'#ad6745':'#2b5735';
 el('v2Payback').textContent='Hoàn vốn đơn giản: '+(e.simplePaybackYears===null?'không đạt':n.format(e.simplePaybackYears)+' năm');
 drawEconomicChart(e);paint();
}
function svgNode(tag,attrs={},value){
 const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [key,val] of Object.entries(attrs))node.setAttribute(key,String(val));
 if(value!==undefined)node.textContent=String(value);
 return node;
}
function drawEconomicChart(e){
 const svg=el('v2Cashflow');svg.textContent='';
 const w=760,h=260,padL=73,padR=30,padT=21,padB=42;
 const values=e.cashflows.map(d=>d.cumulativeNet/1e6);
 let vMin=Math.min(...values,0),vMax=Math.max(...values,0);
 let padding=Math.max(1,(vMax-vMin)*.1);vMin-=padding;vMax+=padding;
 const px=year=>padL+(w-padL-padR)*(year/e.years);
 const py=v=>padT+(h-padT-padB)*(1-(v-vMin)/(vMax-vMin));
 for(let j=0;j<=4;j++){
   const v=vMin+(vMax-vMin)*j/4,y=py(v);
   svg.append(svgNode('line',{x1:padL,x2:w-padR,y1:y,y2:y,stroke:'#e1e9df','stroke-width':1}));
   svg.append(svgNode('text',{x:padL-10,y:y+4,'text-anchor':'end','font-size':11,fill:'#79907a'},n.format(v)));
 }
 const zy=py(0);
 svg.append(svgNode('line',{x1:padL,x2:w-padR,y1:zy,y2:zy,stroke:'#ae9272','stroke-width':1.8,'stroke-dasharray':'5 5'}));
 const points=e.cashflows.map(d=>px(d.year)+','+py(d.cumulativeNet/1e6)).join(' ');
 svg.append(svgNode('polyline',{points,fill:'none',stroke:'#3b8751','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'}));
 e.cashflows.forEach((d,j)=>{
   const x=px(d.year),y=py(d.cumulativeNet/1e6);
   svg.append(svgNode('circle',{cx:x,cy:y,r:4,fill:y<zy?'#c58b54':'#3c8751',stroke:'#fff','stroke-width':1.5}));
   if(e.years<=10||j===0||j===e.years||j%Math.ceil(e.years/7)===0){
     svg.append(svgNode('text',{x,y:h-17,'text-anchor':'middle','font-size':11,fill:'#69846d'},d.year));
   }
 });
 svg.append(svgNode('text',{x:(padL+w-padR)/2,y:h-2,'text-anchor':'middle','font-size':11,fill:'#78917b'},'Năm theo giả định ổn định'));
}
function resize(){
 const rect=canvas.getBoundingClientRect();if(!rect.width)return;
 const dpr=Math.min(2,window.devicePixelRatio||1),width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
 ctx.setTransform(dpr,0,0,dpr,0,0);
 return {w:rect.width,h:rect.height};
}
function paint(){
 if(!current)return;
 const size=resize();if(!size)return;
 const w=size.w,h=size.h,d=current.design;
 const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#d8e5e2');grad.addColorStop(.65,'#e8e8d5');grad.addColorStop(1,'#bdcbaf');
 ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 const baseScale=Math.min(w/155,h/146)*camera.zoom;
 const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
 function ground(x,z){return Math.tan(d.slopeDeg*Math.PI/180)*z}
 function project(x,y,z){
   const rx=x*cy-z*sy,rz=x*sy+z*cy;
   return {x:w*.5+rx*baseScale,y:h*.57+(rz*sp-y*cp)*baseScale,depth:rz*cp+y*sp};
 }
 function pos(x,z,yExtra=0){return project(x,ground(x,z)+yExtra,z)}
 function polygon(points,color,stroke=null){
   if(points.length<3)return;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
   for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
   ctx.closePath();ctx.fillStyle=color;ctx.fill();
   if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.6;ctx.stroke()}
 }
 const tiles=[];const cuts=16,step=100/cuts;
 for(let x=-50;x<50;x+=step)for(let z=-50;z<50;z+=step){
   const pts=[pos(x,z),pos(x+step,z),pos(x+step,z+step),pos(x,z+step)];
   const depth=pts.reduce((a,p)=>a+p.depth,0)/4;
   const shade= Math.round(105+((z+50)/100)*19+Math.sin(x/9+z/7)*5);
   tiles.push({pts,depth,color:'rgb('+Math.round(shade*.80)+','+Math.round(shade*1.29)+','+Math.round(shade*.76)+')'});
 }
 tiles.sort((a,b)=>a.depth-b.depth);
 for(const tile of tiles)polygon(tile.pts,tile.color,'#a2b58b55');
 // Draw representative access headlands along both ends of the rows.
 const hl=Math.min(16,Math.max(2,d.headlandM/d.squareSideM*100));
 const bands=d.orientation==='contour'
   ?[[-50,-50+hl],[50-hl,50]]
   :[[-50,-50+hl],[50-hl,50]];
 for(const [a,b] of bands){
  const pts=d.orientation==='contour'
    ?[pos(a,-50,.05),pos(b,-50,.05),pos(b,50,.05),pos(a,50,.05)]
    :[pos(-50,a,.05),pos(50,a,.05),pos(50,b,.05),pos(-50,b,.05)];
  polygon(pts,'#c5b58dba');
 }
 function drawLine(coords,stroke,width=2,dash=[]){
   if(coords.length<2)return;ctx.save();ctx.beginPath();coords.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
   ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.restore();
 }
 // Sample geometry is capped to remain fast and is NOT a full tree placement plan.
 const logicalRowStep=d.rowM/d.squareSideM*100,logicalPlantStep=d.plantM/d.squareSideM*100;
 const nr=Math.min(17,Math.max(3,Math.floor((100-2*hl)/Math.max(logicalRowStep,.01))));
 const np=Math.min(41,Math.max(6,Math.floor((100-2*hl)/Math.max(logicalPlantStep,.01))));
 const start=-48+hl,end=48-hl;
 const rows=[];
 for(let r=0;r<nr;r++){
   const cross=-43+(86*(r+.5)/nr);
   const coords=[];const trees=[];
   for(let k=0;k<np;k++){
     const along=start+(end-start)*(k+.5)/np;
     const x=d.orientation==='contour'?along:cross;
     const z=d.orientation==='contour'?cross:along;
     trees.push({x,z});
   }
   for(let s=0;s<=25;s++){
     const along=start+(end-start)*s/25;
     coords.push(d.orientation==='contour'?pos(along,cross,.15):pos(cross,along,.15));
   }
   rows.push({cross,coords,trees});
 }
 if(flags.pipes){
  for(const row of rows){drawLine(row.coords,'#43aabc',Math.max(1.1,baseScale*.36));
   for(let k=0;k<row.trees.length;k+=Math.max(1,Math.ceil(np/25))){
    const t=row.trees[k],p=pos(t.x,t.z,.2);ctx.fillStyle='#91e0e2';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1.5,baseScale*.55),0,Math.PI*2);ctx.fill();
   }
  }
 }
 let routePath=[];
 if(flags.route){
  const routeCoord= nr>=2?(rows[Math.floor(nr/2)].cross+rows[Math.min(nr-1,Math.floor(nr/2)+1)].cross)/2:0;
  for(let i=0;i<=45;i++){
   const along=start+(end-start)*i/45;
   routePath.push(d.orientation==='contour'?pos(along,routeCoord,.7):pos(routeCoord,along,.7));
  }
  drawLine(routePath,'#f7e1a5',Math.max(2,baseScale*.64),[11,8]);
 }
 const instances=[];
 for(const row of rows)for(const t of row.trees){
   const anchor=pos(t.x,t.z,.2);instances.push({anchor,x:t.x,z:t.z,depth:anchor.depth});
 }
 instances.sort((a,b)=>a.depth-b.depth);
 const canopyRadius=Math.max(2.7,Math.min(10,baseScale*(d.canopyM/d.rowM)*1.15));
 for(const tree of instances){
   const p=tree.anchor;
   const raised=pos(tree.x,tree.z,Math.max(1.5,d.canopyM*.8));
   const rad=canopyRadius*(.85+.2*Math.sin((tree.x+tree.z)*.21));
   ctx.strokeStyle='#6a5936';ctx.lineWidth=Math.max(.8,rad*.17);
   ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(raised.x,raised.y);ctx.stroke();
   ctx.fillStyle='#234d2e';ctx.beginPath();ctx.ellipse(raised.x+rad*.2,raised.y+rad*.55,rad*.95,rad*.49,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#477a43';ctx.beginPath();ctx.arc(raised.x,raised.y,rad,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#71a05d';ctx.beginPath();ctx.arc(raised.x-rad*.27,raised.y-rad*.33,rad*.43,0,Math.PI*2);ctx.fill();
 }
 // A generic service utility symbol. NOT a claim of mechanized coffee harvesting.
 if(flags.route&&routePath.length){
  const q=Math.max(0,Math.min(1,flags.progress));
  const idx=Math.round(q*(routePath.length-1));const at=routePath[idx];
  ctx.save();ctx.translate(at.x,at.y-3);ctx.rotate(d.orientation==='contour'?(-camera.yaw*.22):(camera.yaw*.22));
  ctx.fillStyle='#e7bd56';ctx.strokeStyle='#405342';ctx.lineWidth=1.5;
  ctx.fillRect(-10,-7,20,14);ctx.strokeRect(-10,-7,20,14);
  ctx.fillStyle='#305e64';ctx.fillRect(-5,-5,10,8);ctx.fillStyle='#1c3026';
  ctx.fillRect(-12,-8,4,5);ctx.fillRect(-12,3,4,5);ctx.fillRect(8,-8,4,5);ctx.fillRect(8,3,4,5);
  ctx.restore();
 }
 ctx.fillStyle='#22402ad8';ctx.fillRect(13,13,Math.min(w-26,247),46);
 ctx.fillStyle='#dbe9cb';ctx.font='700 11px Manrope, sans-serif';ctx.fillText('FIELD TWIN  /  MÔ PHỎNG TƯƠNG ĐỐI',24,32);
 ctx.font='10px Manrope, sans-serif';ctx.fillStyle='#bad0b7';ctx.fillText('Góc '+n.format(camera.yaw*180/Math.PI)+'° · độ dốc '+n.format(d.slopeDeg)+'°',24,49);
}
function frame(now){
 if(!flags.playing)return;
 const dt=Math.min(.08,(now-(lastTime||now))/1000);lastTime=now;
 flags.progress=(flags.progress+dt*.13)%1;
 paint();animationId=requestAnimationFrame(frame);
}
function setPlaying(v){
 flags.playing=v;el('v2Play').textContent=v?'❚❚ Tạm dừng mô phỏng':'▶ Chạy mô phỏng thiết bị';
 if(v){cancelAnimationFrame(animationId);lastTime=0;animationId=requestAnimationFrame(frame)}
 else {cancelAnimationFrame(animationId);paint()}
}
canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;dragging=true;lastPoint={x:event.clientX,y:event.clientY};canvas.classList.add('dragging');canvas.setPointerCapture(event.pointerId)});
canvas.addEventListener('pointermove',event=>{
 if(!dragging||!lastPoint)return;
 const dx=event.clientX-lastPoint.x,dy=event.clientY-lastPoint.y;
 camera.yaw+=dx*.008;camera.pitch=E.clamp(camera.pitch-dy*.005,.2,1.30,.65);
 lastPoint={x:event.clientX,y:event.clientY};paint();
});
function stopDrag(){dragging=false;lastPoint=null;canvas.classList.remove('dragging')}
canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);canvas.addEventListener('lostpointercapture',stopDrag);
canvas.addEventListener('wheel',event=>{event.preventDefault();camera.zoom=E.clamp(camera.zoom*(event.deltaY<0?1.08:.92),.55,2.1,1);paint()},{passive:false});
el('v2ResetCamera').addEventListener('click',()=>{camera.yaw=.71;camera.pitch=.65;camera.zoom=1;paint()});
el('v2Pipes').addEventListener('change',event=>{flags.pipes=event.target.checked;paint()});
el('v2MachineRoute').addEventListener('change',event=>{flags.route=event.target.checked;paint()});
el('v2Play').addEventListener('click',()=>setPlaying(!flags.playing));
el('v2SavePng').addEventListener('click',()=>{paint();const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='coffeerow-field-twin.png';document.body.append(a);a.click();a.remove()});
el('v2DownloadJson').addEventListener('click',()=>{
 const payload={version:2,createdAt:new Date().toISOString(),scope:'Educational scenario — not an engineering plan',inputs:read(),...current,
 source:'https://wasi.org.vn/wp-content/uploads/2021/11/QUYET-DINH-CONG-NHAN-TBKT-QUY-TRINH-TAI-CANH-THEO-HUONG-CO-GIOI-HOA.pdf'};
 const uri=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=uri;a.download='coffeerow-scenario-v2.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),1000);
});
el('v2ResetEconomics').addEventListener('click',()=>{
 inputs.yield.value='3000';inputs.price.value='100000';inputs.capex.value='220';inputs.opex.value='115';inputs.years.value='7';update();
});
Object.values(inputs).forEach(node=>node?.addEventListener('input',update));
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>paint()).observe(canvas);
else window.addEventListener('resize',paint);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&flags.playing)setPlaying(false)});
update();
})();
