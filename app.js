'use strict';
/** CoffeeRow Lab v1 — geometry-only, non-agronomic planning calculator. */
const PRESETS = Object.freeze({
  traditional:{row:3,plant:3,label:'Trồng truyền thống · 3,0 × 3,0 m'},
  wasi:{row:3.2,plant:1.5,label:'Mô hình WASI · 3,2 × 1,5 m'},
  dense:{row:3.5,plant:0.8,label:'Giả định hàng dày · 3,5 × 0,8 m'}
});
function validNumber(value,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):min}
function computeMetrics({area=2,row=3.2,plant=1.5,service=12}={}){
  const a=validNumber(area,0.1,10000),r=validNumber(row,2,6),p=validNumber(plant,0.5,4),s=validNumber(service,0,35);
  const density=10000/(r*p), netArea=a*(1-s/100), treeCount=Math.floor(netArea*10000/(r*p));
  return {area:a,row:r,plant:p,service:s,density,netArea,treeCount};
}
if(typeof module!=='undefined'&&module.exports){module.exports={computeMetrics,PRESETS,validNumber}}
if(typeof document!=='undefined'){
const $=id=>document.getElementById(id);
const area=$('area'),row=$('rowSpace'),plant=$('plantSpace'),service=$('service'),slope=$('slope');
const fmtInt=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0});
const fmtDec=new Intl.NumberFormat('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtOne=new Intl.NumberFormat('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1});
const NS='http://www.w3.org/2000/svg';
function svgElement(tag,attrs){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e}
function buildHero(){
 const g=$('rows');if(!g)return;
 for(let d=0;d<12;d++){const t=d/11,y=223+Math.pow(t,1.65)*360,spread=(y-195)/410,scale=.19+t*1.15;
  for(let lane=-7;lane<=7;lane++){let x=338+lane*(19+spread*104);if(x<-42||x>705)continue;
    let use=svgElement('use',{href:'#bush',transform:'translate('+x.toFixed(1)+' '+y.toFixed(1)+') scale('+scale.toFixed(2)+')',opacity:(.82+t*.18).toFixed(2)});g.appendChild(use)}
 }}
function renderMap(metrics){
 const svg=$('fieldSvg'),w=760,h=354,pixelsPerMeter=22;svg.textContent='';
 const defs=svgElement('defs',{}),gradient=svgElement('radialGradient',{id:'coffeeCanopy',cx:'32%',cy:'28%',r:'73%'});
 gradient.append(svgElement('stop',{offset:'0%', 'stop-color':'#8bac65'}),svgElement('stop',{offset:'50%','stop-color':'#477343'}),svgElement('stop',{offset:'100%','stop-color':'#204a2b'}));defs.append(gradient);svg.append(defs);
 svg.append(svgElement('rect',{width:w,height:h,fill:'#c9d2b0'}));
 for(let y=0;y<h;y+=23)svg.append(svgElement('line',{x1:0,y1:y,x2:w,y2:y,stroke:'#bcc8a1','stroke-width':1,opacity:.28}));
 const gap=metrics.row*pixelsPerMeter,step=metrics.plant*pixelsPerMeter;
 for(let y=20,ri=0;y<h-8;y+=gap,ri++){
  svg.append(svgElement('rect',{x:0,y:y-15,width:w,height:30,fill:ri%2?'#a9b78d':'#b1bf93',opacity:.4}));
  svg.append(svgElement('line',{x1:0,y1:y,x2:w,y2:y,stroke:'#919e68','stroke-width':2,'stroke-dasharray':'7 13',opacity:.52}));
  for(let x=21+(ri%2)*step*.22;x<w-10;x+=step){
   const radius=Math.min(13,Math.max(6.8,step*.3));
   svg.append(svgElement('ellipse',{cx:x+2,cy:y+3,rx:radius+2,ry:radius*.7,fill:'#354b35',opacity:.2}));
   svg.append(svgElement('circle',{cx:x,cy:y,r:radius,fill:'url(#coffeeCanopy)'}));
   if(radius>9)svg.append(svgElement('circle',{cx:x-radius*.25,cy:y-radius*.25,r:radius*.16,fill:'#b0cd88',opacity:.8}));
  }
 }
 // Reference dimension, schematic (no claim of scale to property perimeter).
 svg.append(svgElement('rect',{x:615,y:11,width:131,height:26,rx:3,fill:'#f4f7ed',opacity:.94}));
 const tx=svgElement('text',{x:681,y:28,'text-anchor':'middle',fill:'#446344','font-size':10,'font-family':'sans-serif','font-weight':'bold'});tx.textContent='SƠ ĐỒ MINH HỌA';svg.append(tx);
}
function readInputs(){return computeMetrics({area:area.value,row:row.value,plant:plant.value,service:service.value})}
function update(){
 const m=readInputs();const slopeValue=validNumber(slope.value,0,25);
 $('rowOutput').textContent=fmtOne.format(m.row)+' m';$('plantOutput').textContent=fmtOne.format(m.plant)+' m';
 $('serviceOutput').textContent=m.service+'%';$('slopeOutput').textContent=slopeValue+'°';
 $('density').textContent=fmtInt.format(Math.round(m.density));
 $('count').textContent=fmtInt.format(m.treeCount);$('netArea').textContent=fmtDec.format(m.netArea);
 const key=Object.keys(PRESETS).find(k=>Math.abs(PRESETS[k].row-m.row)<.051&&Math.abs(PRESETS[k].plant-m.plant)<.051);
 $('mapTitle').textContent=key?PRESETS[key].label:'Bố trí tùy chỉnh · '+fmtOne.format(m.row)+' × '+fmtOne.format(m.plant)+' m';
 const note=$('slopeNotice');note.classList.remove('warning');
 if(slopeValue>=10){note.classList.add('warning');note.textContent='Độ dốc '+slopeValue+'°: nằm ngoài giới hạn dưới 10° theo quy trình WASI được công nhận năm 2021 [05]. Không dùng mô phỏng để quyết định cơ giới hóa.'}
 else if(slopeValue>=8){note.classList.add('warning');note.textContent='Độ dốc '+slopeValue+'°: cần kỹ sư khảo sát hướng hàng theo đồng mức, nguy cơ xói mòn và giới hạn an toàn của máy. Quy trình WASI 2021 [05] còn yêu cầu diện tích >2 ha và những điều kiện tái canh khác.'}
 else{note.textContent='Độ dốc '+slopeValue+'°: vẫn cần khảo sát đất, hệ thống thoát nước, hướng hàng và thông số máy. Phần hình học không chứng minh khả năng cơ giới hóa.'}
 renderMap(m);return m;
}
for(const el of [area,row,plant,service,slope])el.addEventListener('input',update);
document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>{
 const p=PRESETS[btn.dataset.preset];if(!p)return;row.value=p.row;plant.value=p.plant;update();row.dispatchEvent(new Event('input',{bubbles:true}));$('phong-thi-nghiem').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}));
$('reset').addEventListener('click',()=>{area.value=2;row.value=3.2;plant.value=1.5;service.value=12;slope.value=5;update();row.dispatchEvent(new Event('input',{bubbles:true}))});
$('export').addEventListener('click',()=>{
 const m=update();const rows=[
 ['Chỉ tiêu','Giá trị','Đơn vị','Ghi chú'],
 ['Diện tích tổng',m.area,'ha','Người dùng nhập'],['Khoảng cách hàng',m.row,'m','Người dùng nhập'],['Khoảng cách cây',m.plant,'m','Người dùng nhập'],
 ['Đất hạ tầng',m.service,'%','Giả định'],['Độ dốc',Number(slope.value),'độ','Cần khảo sát thực tế'],
 ['Mật độ lý thuyết',m.density.toFixed(2),'cây/ha','10000/(hàng×cây)'],['Diện tích trồng hữu hiệu',m.netArea.toFixed(3),'ha','Chưa tính địa hình'],
 ['Số cây ước tính',m.treeCount,'cây','Làm tròn xuống'],['Cơ sở tham chiếu','https://wasi.org.vn/wp-content/uploads/2021/11/QUYET-DINH-CONG-NHAN-TBKT-QUY-TRINH-TAI-CANH-THEO-HUONG-CO-GIOI-HOA.pdf','','Quy trình WASI 2021: dốc <10°, diện tích >2 ha, các điều kiện khác; không phải khuyến cáo đầu tư']
 ];
 const csv='\ufeff'+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='coffeerow-phuong-an-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
buildHero();update();
}