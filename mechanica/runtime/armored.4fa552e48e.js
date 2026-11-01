import * as T from '#three';
import {makeBuilder,TAU} from '#geometry';
import {subgroup,place,offsets,panel,rod} from '#vehicle-kit';
import {trackAssembly} from '#mechanism-kit';
const PI=Math.PI;
// 装甲车辆外观与通用行走机构。炮塔和长柱均为封闭外形，不制作武器、弹药、观瞄或防护系统。
// 模型单位为米。整车全长、全宽、全高只取自博物馆或军方公开页面（出处见批次 sources.md），其余尺寸为网页补全。
export const ARMOR_SOURCE={
 // 澳大利亚陆军 M1A2 SEPv3 规格页（General Characteristics）：长 9.7 m，宽 3.7 m，高 3.09 m。用户 2026-10-29 定整套改用此来源。
 abrams:{length:9.7,width:3.7,height:3.09},
 // 丹麦坦克博物馆 Leopard 2A4：车体 7.67 m，炮向 12 点 9.61 m，宽 3.7 m，高 2.83 m（含未建模的高射机枪架）。
 leopard2:{length:9.61,hull:7.67,width:3.70,height:2.83,heightIncludesUnmodeledMount:true},
 // 图森军用车辆博物馆 M2 Bradley：长 21 ft 6 in，宽 11 ft 10 in，高 9 ft 9 in。
 ifv:{length:258*.0254,width:142*.0254,height:117*.0254}
};
// 网页补全的布置参数。R 为主动轮与诱导轮节圆半径，N 为主动轮齿数，n 为单侧履带板数。
const SPEC={
 abrams:{paint:'sand',xr:-3.66,xf:4.26,R:.46,N:15,n:73,hw:.3175,rw:.31,nW:7,dw:.68,rollers:[-1.70,-.34,1.02],rr:.155,gh:.10,clear:.46,yD:1.60,glacisX:2.35,lowFront:.80,lowRear:.30,frontDrive:false,skirtN:6,
  eng:-1.65,engZ:0,trans:-2.85,cool:-3.02,coolN:19,tools:[-.70,.40],
  tur:{x:.25,z:0,h:.66,lower:[[-2.30,-1.08],[1.25,-1.14],[1.90,-.58],[1.90,.58],[1.25,1.14],[-2.30,1.08]],upper:[[-2.22,-1.00],[1.10,-1.04],[1.68,-.50],[1.68,.50],[1.10,1.04],[-2.22,1.00]],brackets:[-1.60,-.90,-.20],eyes:[-1.16,-.76]},
  ring:[.95,.80],bar:{y:.36,r:.086,mant:[.46,.40,.60],bands:4,step:.68,mat:'steel'},
  hatches:[{x:-.35,z:.52,r:.24,top:true},{x:-.35,z:-.50,r:.22,ring:.025}],sensors:[[.95,.62,.30,.11,.26],[.40,-.74,.26,.11,.24]]},
 leopard2:{paint:'olive',xr:-3.61,xf:3.87,R:.46,N:15,n:75,hw:.3175,rw:.31,nW:7,dw:.70,rollers:[-1.75,-.35,1.05],rr:.155,gh:.10,clear:.48,yD:1.62,glacisX:2.95,lowFront:.75,lowRear:.30,frontDrive:false,skirtN:7,
  eng:-1.90,engZ:0,trans:-2.95,cool:-3.00,coolN:19,tools:[-.70,.40],
  tur:{x:.20,z:0,h:.76,lower:[[-2.05,-1.12],[1.55,-1.12],[1.80,-.80],[1.80,.80],[1.55,1.12],[-2.05,1.12]],upper:[[-2.00,-1.08],[1.50,-1.08],[1.74,-.78],[1.74,.78],[1.50,1.08],[-2.00,1.08]],brackets:[-.60,0,.60],eyes:[-1.70,-1.30]},
  ring:[.95,.80],bar:{y:.42,r:.086,mant:[.50,.46,.62],bands:4,step:.68,mat:'steel'},
  hatches:[{x:-.55,z:.50,r:.24,ring:.08},{x:-.55,z:-.50,r:.22,ring:.05}],sensors:[[1.05,.62,.34,.14,.30],[-.05,.72,.24,.18,.24]]},
 ifv:{paint:'olive',xr:-2.952,xf:3.353,R:.40,N:16,n:76,hw:.2665,rw:.29,nW:6,dw:.67,rollers:[-1.34,0,1.34],rr:.14,gh:.09,clear:.45,yD:2.06,glacisX:2.10,lowFront:.70,lowRear:.20,frontDrive:true,skirtN:5,
  eng:1.45,engZ:.30,trans:2.50,cool:1.80,coolN:8,tools:[-1.60,-.40],
  tur:{x:.40,z:-.16,h:.74,lower:[[-.95,-.68],[.70,-.68],[1.05,-.36],[1.05,.36],[.70,.68],[-.95,.68]],upper:[[-.82,-.56],[.60,-.56],[.88,-.30],[.88,.30],[.60,.56],[-.82,.56]],brackets:[-.46,.20],eyes:[-.78,-.60]},
  ring:[.66,.54],bar:{y:.37,r:.055,mant:[.40,.26,.34],bands:2,step:.44,mat:'dark'},
  hatches:[{x:-.30,z:.20,r:.23,top:true}],sensors:[[.30,-.34,.26,.13,.22],[-.42,-.30,.22,.10,.20]]}
};
// 履带板厚度一半（含倒角外扩），由 mechanism-kit 的履带板尺寸 0.055 与倒角 0.008 得到。
const ST=.055/2+.008*.35,BUSH_DEPTH=.0423,BUSH_R=.025;
function faceted(B,g,low,high,y0,y1,mat){
 const positions=[],indices=[],n=low.length;
 function face(points){const start=positions.length/3;for(const p of points)positions.push(...p);for(let j=1;j<points.length-1;j++)indices.push(start,start+j,start+j+1);}
 face(low.map(([x,z])=>[x,y0,z]).reverse());face(high.map(([x,z])=>[x,y1,z]));
 for(let i=0;i<n;i++){const j=(i+1)%n;face([[low[i][0],y0,low[i][1]],[low[j][0],y0,low[j][1]],[high[j][0],y1,high[j][1]],[high[i][0],y1,high[i][1]]]);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const m=B.mesh(g,geo,mat);m.material.side=T.DoubleSide;return m;
}
// 与线段 a→b 平行、向左侧加厚 t 的四边形截面。
function slab(a,b,t){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),nx=-dy/l*t,ny=dx/l*t;return[a,b,[b[0]+nx,b[1]+ny],[a[0]+nx,a[1]+ny]];}
// 螺栓头朝外：右侧沿 +z，左侧把实例整体绕 y 轴转半圈，不使用负缩放。
function sideBolts(B,g,points,side,size){const meshes=B.bolts(g,side>0?points:points.map(([x,y,z])=>[-x,y,-z]),'z',size);if(side<0)meshes.forEach(m=>m.rotation.y=PI);return meshes;}
// 双轮盘负重轮、诱导轮或托带轮：胶圈、轮盘与带孔轮毂分开构造，轮毂孔套在固定轴上。
function dualWheel(B,g,ro,hw,paint,band,hubR,bore,out){
 const w=.49*hw;
 for(const s of [-1,1]){const z=s*.385*hw;B.tube(g,ro,ro-band,w,'rubber',[0,0,z],'z');B.tube(g,ro-band,hubR,w*.46,paint,[0,0,z],'z');B.tube(g,hubR,bore,w*.92,'steel',[0,0,z],'z');
  if(s===out){const size=Math.min(.012,(hubR-bore)/4),rb=(hubR+bore)/2;sideBolts(B,g,Array.from({length:6},(_,i)=>[rb*Math.cos(i*TAU/6),rb*Math.sin(i*TAU/6),s*(z*s+w*.46)]),s,size);}}
}
// 主动轮齿圈：齿位于相邻履带板铰接衬套之间，齿顶低于履带板内表面。
function sprocketRing(N,rRoot,rTip,phase,bore,depth,wRoot,wTip){
 const s=new T.Shape(),alpha=TAU/N,pts=[];
 for(let k=0;k<N;k++){const c=phase+k*alpha,tr=wRoot/rRoot,tt=wTip/rTip;
  for(const [r,a]of [[rRoot,c-alpha/2],[rRoot,c-alpha/4-tr/2],[rRoot,c-tr],[rTip,c-tt],[rTip,c+tt],[rRoot,c+tr],[rRoot,c+alpha/4+tr/2]])pts.push(new T.Vector2(r*Math.cos(a),r*Math.sin(a)));}
 s.setFromPoints(pts);const hole=new T.Path();hole.absarc(0,0,bore,0,TAU,true);s.holes.push(hole);
 const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:32,steps:1});geo.translate(0,0,-depth/2);return geo;
}
function vertexBox(groups){const box=new T.Box3(),v=new T.Vector3(),m=new T.Matrix4(),im=new T.Matrix4();for(const g of groups)g.traverse(o=>{if(!o.isMesh)return;for(let k=0;k<(o.isInstancedMesh?o.count:1);k++){m.copy(o.matrixWorld);if(o.isInstancedMesh){o.getMatrixAt(k,im);m.multiply(im);}const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(m));}});return box;}
export function armorPose(a){return{travel:a*.31,yaw:.28*Math.sin(a*.17),hatch:.48+.16*Math.sin(a*.21),ramp:.65+.17*Math.sin(a*.18)};}
export function buildArmored(materials,kind='abrams'){
 if(!['abrams','leopard2','ifv'].includes(kind))throw new RangeError('不支持的装甲车辆展品。');
 const S=SPEC[kind],SRC=ARMOR_SOURCE[kind],B=makeBuilder(materials),ifv=kind==='ifv',abrams=kind==='abrams',paint=S.paint,tracks=[],wheels=[],turretParts=[],hatches=[],toned=[];
 const {xr,xf,R,hw,yD,clear,glacisX}=S,p=TAU*R/S.N,half=(S.n*p-TAU*R)/4,alpha=p/R,GI=ST+S.gh+.0005;
 // 横向布置：侧裙外表面加螺栓头为来源全宽的一半。
 const zU=SRC.width/2-.0622,zSi=zU+.003,zT=zSi-.03-hw,zB=zT-hw-.04;
 const ySp=2*R+.08+.0678+.03,yW=.08+ST+.0015+S.rw,yI=R+.08,yRoll=2*R+.08-ST-.0015-S.rr,floorTop=clear+.04,yLR=clear+S.lowRear+(ifv?-.08:.02),yNL=ySp-.08;
 const drive=S.frontDrive?half:-half,idler=-drive,turretAnchor=[S.tur.x,yD+.041,S.tur.z];
 const glacisY=x=>ySp+.10+(xf-x)/(xf-glacisX)*(yD-ySp-.10);
 function part(id,name,desc,offset){return B.part(id,name,'VEHICLE STRUCTURE',desc,offset);}
 function turretPart(id,name,desc,offset){const g=part(id,name,desc,offset);place(B,id,turretAnchor);turretParts.push(g);return g;}
 // ── 车体：底板、下侧壁、前后斜板、履带上方翼板、上侧壁与前上斜板，内部为空腔。
 const hull=part('hull','车体壳体与履带翼板','底板、侧壁、前后斜板和履带上方翼板围成空腔，侧裙挂在上侧壁外。',[0,-.9,-.6]);
 const lower=subgroup(hull);toned.push([lower,.86]);
 B.box(lower,xf-S.lowFront-xr-S.lowRear,.04,2*zB,paint,[(xf-S.lowFront+xr+S.lowRear)/2,clear+.02,0],.006);
 const belly=[[xr,yLR],[xr+S.lowRear,clear],[xf-S.lowFront,clear],[xf,yNL],[xf,ySp],[xr,ySp]];
 for(const s of [-1,1])panel(B,lower,belly,.04,paint,[0,0,s*(zB-.02)],'xy');
 panel(B,lower,slab([xf-S.lowFront,clear],[xf,yNL],.05),2*zB,paint,[0,0,0],'xy');
 panel(B,lower,slab([xr,yLR],[xr+S.lowRear,clear],.05),2*zB,paint,[0,0,0],'xy');
 B.box(lower,.06,ySp-yNL+.02,2*zB,paint,[xf-.03,(ySp+yNL)/2-.01,0],.006);
 for(const s of [-1,1]){B.box(hull,xf-xr,.04,zU-zB+.04,paint,[(xf+xr)/2,ySp+.02,s*(zB-.04+zU)/2],.006);panel(B,hull,[[xr,ySp],[xf,ySp],[xf,ySp+.10],[glacisX,yD],[xr,yD]],.045,paint,[0,0,s*(zU-.0225)],'xy');}
 panel(B,hull,slab([xf,ySp+.10],[glacisX,yD],.06),2*zU,paint,[0,0,0],'xy');
 B.box(hull,.06,.16,2*zU,paint,[xf-.03,ySp+.04,0],.006);
 if(!ifv){B.box(hull,.06,yD-ySp+.04,2*zU,paint,[xr+.03,(yD+ySp)/2-.02,0],.006);B.box(lower,.06,ySp-yLR,2*zB,paint,[xr+.03,(ySp+yLR)/2,0],.006);}
 // ── 上盖：后部平台与炮塔座区，可单独移开。
 const roof=part('roof','车体上盖','上盖可以移开，露出通用动力和设备展示空间。',[0,1.8,-.4]);
 B.cut(B.box(roof,glacisX-xr,.05,2*zU,paint,[(glacisX+xr)/2,yD-.025,0],.006));
 // ── 悬挂与轴端（固定件）：扭杆座、摆臂、负重轮轴、托带轮短轴、诱导轮与主动轮轴。
 const suspension=part('suspension','摆臂、扭杆座与轴端','每个负重轮轴经摆臂接到车体侧壁扭杆座，托带轮、诱导轮和主动轮轴端固定在侧壁上。',[0,.4,-1.6]);
 const roadX=Array.from({length:S.nW},(_,j)=>-(S.nW-1)*S.dw/2+j*S.dw);
 for(const s of [-1,1]){
  for(const x of roadX){const len=zT+.55*hw-zB,ax=x+.30*Math.sign(idler);B.cylinder(suspension,.045,len,'steel',[x,yW,s*(zB+len/2)],'z');B.cylinder(suspension,.06,.10,'cast',[ax,yW+.17,s*(zB+.05)],'z');rod(B,suspension,[ax,yW+.17,s*(zB+.05)],[x,yW,s*(zB+.05)],.04,'cast');}
  for(const x of S.rollers){const len=zT+.55*hw-zB;B.cylinder(suspension,.035,len,'steel',[x,yRoll,s*(zB+len/2)],'z');B.box(suspension,.16,.12,.06,'cast',[x,yRoll,s*(zB+.03)],.01);}
  {const len=zT+.55*hw-zB;B.cylinder(suspension,.05,len,'steel',[idler,yI,s*(zB+len/2)],'z');B.box(suspension,.34,.22,.10,'cast',[idler,yI,s*(zB+.05)],.015);}
  {const len=zT+.50*hw-zB;B.cylinder(suspension,.06,len,'steel',[drive,yI,s*(zB+len/2)],'z');}
 }
 // ── 履带与轮系。履带板加中央导齿和两侧铰接衬套，同一材质在合并时保持单一网格。
 const bushGeo=new T.CylinderGeometry(BUSH_R,BUSH_R,.22*hw-.006,10).rotateX(PI/2),guideGeo=new T.BoxGeometry(.075,S.gh,.18*hw),beta=Math.atan2(p/2,R-BUSH_DEPTH);
 const arcStart=S.frontDrive?[PI/2,2*half]:[-PI/2,4*half+PI*R],phase=arcStart[0]+arcStart[1]/R-beta+alpha/2;
 for(const s of [-1,1]){
  const belt=part(s<0?'track0':'track1',s<0?'左履带链':'右履带链','各履带板沿闭合路径连续循环，中央导齿从双轮盘之间通过，铰接衬套与主动轮齿交错。',[0,-.25,s*1.7]);
  const t=trackAssembly(B,belt,s*zT,half,R,2*hw,S.n,'dark');tracks.push(t);
  for(const shoe of t.shoes){B.instances(shoe,guideGeo,'dark',[{p:[0,-(ST+S.gh/2-.003),0]}]);B.instances(shoe,bushGeo,'dark',[{p:[p/2,-BUSH_DEPTH,.82*hw]},{p:[p/2,-BUSH_DEPTH,-.82*hw]}]);}
  const wheelPart=part(s<0?'wheels0':'wheels1',s<0?'左侧轮系':'右侧轮系','双轮盘负重轮、诱导轮、托带轮和主动轮分别绕固定轴心转动。',[0,.25,s*2.2]);
  for(const x of roadX){const g=subgroup(wheelPart,[x,yW,s*zT]);g.name='armor-road-wheel';dualWheel(B,g,S.rw,hw,paint,.05,.10,.0465,s);wheels.push({g,r:S.rw,center:g.position.clone(),road:true,side:s});toned.push([g,.84]);}
  {const g=subgroup(wheelPart,[idler,yI,s*zT]);g.name='armor-idler';dualWheel(B,g,R-ST-.0015,hw,paint,.05,.12,.0515,s);wheels.push({g,r:R,center:g.position.clone(),road:false,side:s});toned.push([g,.84]);}
  {const g=subgroup(wheelPart,[drive,yI,s*zT]);g.name='armor-drive-wheel';const hubR=R-GI-.04,depth=.22*hw-.004;B.tube(g,hubR,.0615,1.42*hw,paint,[0,0,0],'z');
   const geo=sprocketRing(S.N,R-.13,R-ST-.016,phase,.0615,depth,R>.42?.05:.042,.02);for(const z of [-.82*hw,.82*hw])B.mesh(g,geo,'steel',[0,0,z]);
   B.cylinder(g,.09,.03,'steel',[0,0,s*(.93*hw+.015)],'z');sideBolts(B,g,Array.from({length:8},(_,i)=>[(hubR-.05)*Math.cos(i*TAU/8),(hubR-.05)*Math.sin(i*TAU/8),s*.71*hw]),s,.014);
   wheels.push({g,r:R,center:g.position.clone(),road:false,side:s,teeth:S.N});toned.push([g,.84]);}
  for(const x of S.rollers){const g=subgroup(wheelPart,[x,yRoll,s*zT]);g.name='armor-return-roller';dualWheel(B,g,S.rr,hw,paint,.035,.07,.0365,s);wheels.push({g,r:S.rr,center:g.position.clone(),road:false,side:s});}
 }
 // ── 分段侧裙：内表面贴上侧壁，下缘在负重轮轴心附近；主动轮一端不遮挡，便于观察齿与履带啮合。
 const skirts=[];for(const s of [-1,1]){
  const g=part(s<0?'skirt0':'skirt1',s<0?'左侧分段侧裙':'右侧分段侧裙','分段侧裙挂在上侧壁外侧，上缘铰链杆贯通各段，厚度与分段为网页补全。',[0,1.0,s*1.7]);
  const n=S.skirtN,x0=S.frontDrive?idler-R*.5:drive+R+.03,x1=S.frontDrive?drive-R-.03:xf-.35,w=(x1-x0)/n,y0=yW+.02,y1=ySp+.20,tones=[subgroup(g),subgroup(g)];toned.push([tones[1],.93]);
  for(let j=0;j<n;j++){const a=x0+j*w+.006,b=x0+(j+1)*w-.006,front=j===n-1,heavy=kind==='leopard2'&&j>=n-2,t=heavy?.07:.05,zc=s*(zSi+.05-t/2);
   let pts=[[a,y0],[b,y0],[b,y1],[a,y1]];
   if(heavy){pts=[[a,y1],[a,y0]];for(let k=1;k<=6;k++)pts.push([a+(b-a)*k/6,y0+(k%2?.06:0)]);pts.push([b,y1]);}
   if(front&&!heavy)pts=[[a,y0],[b-.22,y0],[b,y0+.22],[b,y1],[a,y1]];
   panel(B,tones[j%2],pts,t,paint,[0,0,zc],'xy');sideBolts(B,tones[j%2],[[a+(b-a)*.25,y1-.06,s*(zSi+.05)],[a+(b-a)*.75,y1-.06,s*(zSi+.05)]],s,.02);}
  B.cylinder(g,.022,x1-x0,'dark',[(x0+x1)/2,y1-.03,s*zU],'x');skirts.push(g);}
 // ── 车内设备（封闭外形）。
 const engine=part('engine',abrams?'涡轮式动力包外形':'活塞式动力包外形','动力包采用通用封闭外形，用支座放在车体底板上。',[-1.6,1.0,.8]);const ex=S.eng,ez=S.engZ;
 if(abrams){const ey=floorTop+.40;B.cylinder(engine,.32,1.18,'steel',[ex,ey,ez],'x');for(const x of [ex-.55,ex+.55]){B.cylinder(engine,.38,.10,'cast',[x,ey,ez],'x');B.box(engine,.12,.06,.50,'cast',[x,floorTop+.03,ez],.01);}for(let i=0;i<12;i++){const a=i*TAU/12;rod(B,engine,[ex-.5,ey+.32*Math.sin(a),ez+.32*Math.cos(a)],[ex+.5,ey+.32*Math.sin(a),ez+.32*Math.cos(a)],.016,'bronze');}}
 else{const ey=floorTop+.30;B.box(engine,1.12,.37,.79,'steel',[ex,ey,ez],.03);for(const x of [ex-.42,ex+.42])B.box(engine,.12,.13,.60,'cast',[x,floorTop+.06,ez],.01);for(const side of [-1,1]){const cover=B.box(engine,.96,.18,.24,'dark',[ex,ey+.24,ez+side*.24],.02);cover.rotation.x=side*.16;for(let j=0;j<6;j++)B.cylinder(engine,.033,.06,'steel',[ex-.40+j*.16,ey+.35,ez+side*.24]);}}
 const transmission=part('transmission','封闭传动箱与侧传动外形','传动箱经横向输出轴连到两侧侧传动壳，侧传动壳贴在车体下侧壁外。',[-1.4,-.5,1.1]);
 {const ty=Math.max(yI,floorTop+.20),tx=S.trans;B.box(transmission,.53,.40,.88,'cast',[tx,ty,0],.03);for(const s of [-1,1]){const len=zB-.44+.01;B.cylinder(transmission,.08,len,'steel',[drive,yI,s*(.44+len/2-.005)],'z');B.cylinder(transmission,.17,.06,'cast',[drive,yI,s*(zB+.03)],'z');}B.bolts(transmission,[[tx-.18,ty+.20,-.31],[tx+.18,ty+.20,-.31],[tx-.18,ty+.20,.31],[tx+.18,ty+.20,.31]],'y',.023);}
 const cooling=part('cooling','散热格栅与风扇','平台格栅压在上盖上，风扇护圈和固定轴吊在上盖下方。',[-1.5,1.6,-.4]),fans=[];const coolX=S.cool,fanY=yD-.05-.16;
 {const span=(S.coolN-1)*.062;for(let i=0;i<S.coolN;i++)B.box(cooling,.025,.045,1.38,'dark',[coolX-span/2+i*.062,yD+.0225,0],.002);for(const z of [-.71,.71])B.box(cooling,span+.08,.05,.04,'dark',[coolX,yD+.025,z],.004);}
 for(const z of [-.35,.35]){const fan=subgroup(cooling,[coolX,fanY,z]);B.tube(cooling,.27,.24,.07,'steel',[coolX,fanY+.02,z],'y');B.cylinder(fan,.07,.06,'dark',[0,0,0]);B.instances(fan,new T.BoxGeometry(.22,.018,.07),'steel',Array.from({length:8},(_,i)=>{const a=i*TAU/8;return{p:[.11*Math.cos(a),0,.11*Math.sin(a)],r:[0,-a+.3,0]};}));fans.push(fan);
  B.cylinder(cooling,.025,yD-.05-fanY+.01,'steel',[coolX,(yD-.05+fanY)/2,z]);for(const a of [0,PI/2,PI,1.5*PI])B.box(cooling,.04,yD-.05-(fanY+.055)+.01,.04,'steel',[coolX+.255*Math.cos(a),(yD-.05+fanY+.055)/2,z+.255*Math.sin(a)],0);}
 // ── 炮塔座圈与外形炮塔。
 const ring=part('slew','炮塔座圈与固定座','座圈固定在上盖上，外形炮塔底面与座圈顶面保留 1 毫米间隙转动。',[0,1.1,-.6]);
 B.tube(ring,S.ring[0],S.ring[1],.04,'steel',[turretAnchor[0],yD+.02,turretAnchor[2]],'y');B.tube(ring,S.ring[0]+.08,S.ring[0],.015,'steel',[turretAnchor[0],yD+.0075,turretAnchor[2]],'y');
 B.bolts(ring,Array.from({length:24},(_,i)=>[turretAnchor[0]+(S.ring[0]+.04)*Math.cos(i*TAU/24),yD+.015,turretAnchor[2]+(S.ring[0]+.04)*Math.sin(i*TAU/24)]),'y',.012);
 const turret=turretPart('turret',ifv?'小型偏置封闭炮塔':'封闭炮塔外形','封闭实体保留外部轮廓，没有内部武器、装填或火控机构。',[0,2.1,-.4]);
 const {lower:tl,upper:tu,h:th}=S.tur;
 const sideZ=(x,y)=>{const lz=tl[0][1]+(tl[1][1]-tl[0][1])*(x-tl[0][0])/(tl[1][0]-tl[0][0]),uz=tu[0][1]+(tu[1][1]-tu[0][1])*(x-tu[0][0])/(tu[1][0]-tu[0][0]);return -(lz+(uz-lz)*y/th);};
 B.cut(faceted(B,turret,tl,tu,0,th,paint));
 for(let i=0;i<tu.length;i++){const j=(i+1)%tu.length;rod(B,turret,[tu[i][0],th+.004,tu[i][1]],[tu[j][0],th+.004,tu[j][1]],.007,'dark');}
 for(const s of [-1,1]){for(const x of S.tur.brackets){const y=th*.55,z=s*(sideZ(x,y)+.005);B.box(turret,.23,.08,.03,'dark',[x,y,z],.012);sideBolts(B,turret,[[x-.06,y,s*(sideZ(x,y)+.02)],[x+.06,y,s*(sideZ(x,y)+.02)]],s,.014);}
  const [e0,e1]=S.tur.eyes,ez=s*.40;B.path(turret,[[e0,th-.01,ez],[e0,th+.09,ez],[e1,th+.09,ez],[e1,th-.01,ez]],.014,'steel');}
 const barrel=turretPart('dummybarrel','封闭长柱外形','长柱是不可发射的实心展示外形，没有枪膛、弹药和后坐机构。',[1.8,1.5,.6]);
 const hatchPart=turretPart('hatches','顶部舱盖与铰链','圆形舱盖围绕固定边缘铰轴缓慢打开，铰轴穿过固定铰座。',[-.3,2.8,1.1]);
 const sensors=turretPart('sensors','观察窗与封闭设备盒','外部观察窗和设备盒为封闭外形，不构成可用火控系统。',[.8,2.5,-1.0]);
 for(const [x,z,sx,sh,sz]of S.sensors){B.box(sensors,sx,sh,sz,'dark',[x,th+sh/2-.005,z],.02);B.box(sensors,.012,sh*.45,sz*.7,'glass',[x+sx/2+.004,th+sh*.55,z],.004);}
 const basket=turretPart('basket',abrams?'后部网状储物架':'侧面储物箱与后框','外部储物件、框条与网格表现车体外观细节。',[-1.5,2.2,.8]);
 if(abrams){const xa=tl[0][0]+.10,xb=tl[0][0]-.55;for(const z of [-.98,.98]){for(const y of [.12,.60])rod(B,basket,[xa,y,z],[xb,y,z],.025,'steel');rod(B,basket,[xb,.12,z],[xb,.60,z],.025,'steel');}for(const y of [.12,.60])rod(B,basket,[xb,y,-.98],[xb,y,.98],.025,'steel');for(let i=0;i<15;i++)rod(B,basket,[xb,.12,-.84+i*.12],[xb,.60,-.84+i*.12],.008,'dark');for(let i=0;i<5;i++)rod(B,basket,[xb,.20+i*.09,-.98],[xb,.20+i*.09,.98],.008,'dark');for(let i=0;i<6;i++)rod(B,basket,[xa-.05-i*.08,.12,-.98],[xa-.05-i*.08,.12,.98],.008,'dark');}
 else{const bx=ifv?-.38:-1.45,bl=ifv?.73:1.10;for(const s of [-1,1]){const zc=s*(sideZ(bx,.255)+.105);B.box(basket,bl,.31,.23,paint,[bx,.255,zc],.035);B.box(basket,bl+.08,.04,.27,'dark',[bx,.43,zc],.008);}}
 // ── 车尾：主战坦克为格栅与排气外形，步兵战车为底铰尾门。
 const rearPart=part('rear',ifv?'尾部舱门与底铰链':'后部散热面与排气外形',ifv?'尾门通过底部横向铰轴连接车体，开启后露出通用乘员空间。':'格栅、外部罩壳与封闭排气端面安装在车尾。',[-1.9,.5,-.8]);let ramp=null;
 if(ifv){const yc=yLR+.07,oz=.90,ht=yD-.10-(yc+.05);place(B,'rear',[xr-.068,yc,0]);
  for(const s of [-1,1])B.box(hull,.06,yD-yLR,zU-oz,paint,[xr+.03,(yD+yLR)/2,s*(oz+zU)/2],.006);B.box(hull,.06,yD-(yc+.05+ht)+.01,2*oz,paint,[xr+.03,yD-(yD-(yc+.05+ht)+.01)/2,0],.006);B.box(lower,.06,yc-.05-yLR+.03,2*oz,paint,[xr+.03,yLR+(yc-.05-yLR+.03)/2-.03,0],.006);
  for(const z of [-.80,-.28,.28,.80]){B.tube(rearPart,.065,.0465,.10,'steel',[0,0,z],'z');B.box(rearPart,.064,.05,.08,'steel',[.033,-.075,z],0);}
  ramp=subgroup(rearPart);ramp.name='ifv-ramp-hinge';B.box(ramp,.08,ht,1.74,paint,[-.008,.075+ht/2,0],.025);B.cylinder(ramp,.045,1.78,'steel',[0,0,0],'z');for(const z of [-.54,0,.54])B.tube(ramp,.065,.0465,.10,paint,[0,0,z],'z');
  for(const z of [-.62,.62])B.path(ramp,[[-.05,ht*.55,z],[-.10,ht*.55,z],[-.10,ht*.75,z],[-.05,ht*.75,z]],.020,'dark');B.box(ramp,.02,.21,.35,'glass',[-.056,ht*.78,0],.006);}
 else{for(let j=0;j<18;j++)B.box(rearPart,.035,.36,.035,'dark',[xr-.0175,yD-.28,-.92+j*.108],.003);for(const z of [-.63,.63]){B.box(rearPart,.13,.26,.33,'cast',[xr-.065,yD-.62,z],.02);B.box(rearPart,.018,.14,.23,'black',[xr-.137,yD-.62,z],.008);}}
 const cabin=part('cabin','车内通用设备与乘员座','空置座椅、仪表和设备盒放在底板上，仅用于观察车辆空间分配。',[-1.2,1.7,1.0]);
 if(ifv){for(const s of [-1,1])for(let j=0;j<3;j++){const x=-2.30+j*.57;B.box(cabin,.43,.42,.34,'dark',[x,floorTop+.21,s*(zB-.04-.25)],.03);B.box(cabin,.43,.50,.07,'black',[x,floorTop+.62,s*(zB-.04-.035)],.03);}B.box(cabin,.40,.43,.42,'cast',[.33,floorTop+.215,.55],.04);B.box(cabin,.30,.19,.04,'screen',[.33,floorTop+.40,.34],.01);}
 else{const x=xf-1.30;B.box(cabin,.30,.28,.30,'cast',[x,floorTop+.14,0],.02);B.box(cabin,.48,.12,.38,'dark',[x,floorTop+.33,0],.03);B.box(cabin,.09,.40,.38,'black',[x-.26,floorTop+.55,0],.03);B.box(cabin,.18,.18,.30,'screen',[x+.40,floorTop+.40,0],.01);B.box(cabin,.10,.30,.10,'cast',[x+.40,floorTop+.15,0],.01);}
 const tools=part('tools','外部工具、牵引环与缆线','外部固定工具、牵引环和缆线贴附在车体表面。',[-1,1.5,1.7]);
 for(const s of [-1,1]){const yr=ifv?ySp+.06:(yLR+ySp)/2,zr=ifv?1.06:.75*zB;B.torus(tools,.10,.022,'steel',[xf+.02,ySp-.02,s*.75*zB],'x');B.torus(tools,.10,.022,'steel',[xr-.02,yr,s*zr],'x');
  const [t0,t1]=S.tools,zt=s*(zU-.16);rod(B,tools,[t0,yD+.026,zt],[t1,yD+.026,zt],.026,'wood');B.box(tools,.24,.05,.13,'steel',[t1+.12,yD+.025,zt],.01);}
 B.path(tools,[[xr+.25,yD-.004,-1.30],[xr+.55,yD+.025,-1.34],[xr+.85,yD+.025,-1.26],[xr+1.10,yD-.004,-1.30]],.025,'dark');
 const lights=part('lights','灯具、防护框与尾灯','前灯和细保护框装在前上斜板上，尾灯贴在车尾板上。',[1.7,1.0,1]);
 for(const s of [-1,1]){const x=xf-.32,gy=glacisY(x),z=s*(zU-.32);B.box(lights,.13,.15,.23,'dark',[x,gy+.065,z],.02);B.box(lights,.014,.10,.17,'lamp',[x+.068,gy+.07,z],.006);B.path(lights,[[x-.14,glacisY(x-.14)-.005,z-.15],[x+.10,glacisY(x+.10)+.22,z-.15],[x+.10,glacisY(x+.10)+.22,z+.15],[x-.14,glacisY(x-.14)-.005,z+.15]],.014,'steel');
  B.box(lights,.05,.10,.16,'dark',[xr-.02,yD-.16,s*(zU-.25)],.01);B.box(lights,.012,.07,.12,'lamp',[xr-.048,yD-.16,s*(zU-.25)],.004);}
 const fittings=part('fittings','外壳螺钉、扶手与驾驶员舱盖','外壳紧固件、扶手和关闭的驾驶员舱盖固定在车体表面。',[0,2.0,-1.8]);
 for(const s of [-1,1])B.bolts(fittings,Array.from({length:14},(_,i)=>[xr+.20+i*(glacisX-.15-xr-.20)/13,yD+.004,s*(zU-.06)]),'y',.02);
 for(const z of [-1.0,1.0])B.path(fittings,[[xr+.30,yD-.004,z],[xr+.30,yD+.10,z],[xr+.58,yD+.10,z],[xr+.58,yD-.004,z]],.016,'dark');
 {const x=(glacisX+xf)/2+.10,gy=glacisY(x);B.cylinder(fittings,.28,.05,paint,[x,gy+.01,ifv?.70:0]);B.cylinder(fittings,.30,.02,'dark',[x,gy-.004,ifv?.70:0]);}
 // ── 依来源全长与全高确定长柱长度和指挥塔座圈高度（其余外形构造完毕后实测）。
 B.root.updateMatrixWorld(true);const box=vertexBox([B.root]);
 const {y:by,r:bR,mant,bands,step,mat:bMat}=S.bar,front=tl[2][0]-(tl[2][0]-tu[2][0])*by/th,barStart=front+mant[0]*.35;
 const barEnd=ifv?xf-.06-turretAnchor[0]:box.min.x+SRC.length-.025-turretAnchor[0];
 B.box(barrel,mant[0],mant[1],mant[2],paint,[front+mant[0]*.15,by,0],.06);B.cylinder(barrel,bR,barEnd-barStart,bMat,[(barStart+barEnd)/2,by,0],'x');for(let i=0;i<bands;i++)B.cylinder(barrel,bR*1.22,.085,'dark',[barStart+.52+i*step,by,0],'x');
 const cap=B.cylinder(barrel,bR*1.03,.025,'black',[barEnd+.0125,by,0],'x');cap.name='closed-vehicle-display-end';cap.userData.closedDisplay=true;
 // 舱盖先在铰轴处构造并实测其高度；带 top 标记的指挥塔座圈高度使关闭舱盖顶点等于来源全高。
 for(const H of S.hatches){const hx=H.x-H.r-.022,h=subgroup(hatchPart,[hx,th,H.z]);h.name='armor-hatch-hinge';
  B.cylinder(h,H.r,.045,paint,[H.r+.022,.0225,0]);B.cylinder(h,.02,.36,'steel',[0,0,0],'z');for(const dz of [-.07,.07])B.box(h,.13,.04,.05,'steel',[.035,.02,dz],0);
  B.path(h,[[H.r-.07,.044,-.07],[H.r-.07,.085,-.07],[H.r+.10,.085,-.07],[H.r+.10,.044,-.07]],.014,'dark');
  B.root.updateMatrixWorld(true);const lidTop=vertexBox([h]).max.y-(turretAnchor[1]+th);
  const ringH=H.top?SRC.height+box.min.y-(turretAnchor[1]+th+.002+lidTop):H.ring,hy=th+ringH+.002;h.position.y=hy;
  B.tube(hatchPart,H.r,H.r-.05,ringH,'dark',[H.x,th+ringH/2,H.z],'y');
  for(const dz of [-.15,.15]){B.tube(hatchPart,.03,.0215,.04,'steel',[hx,hy,H.z+dz],'z');B.box(hatchPart,.05,hy-.015-th,.04,'dark',[hx,(th-.01+hy-.025)/2,H.z+dz],0);}
  hatches.push(h);}
 // ── 表面：哑光涂装与铸造纹理、下部与轮系的尘土色调、履带金属降低反光。
 const grain=materials.sand?.roughnessMap||null;
 B.root.traverse(o=>{if(!o.isMesh)return;const k=o.userData.materialKey,m=o.material;if(k===paint){m.roughness=.80;m.metalness=.03;if(grain&&!m.roughnessMap){m.roughnessMap=grain;m.bumpMap=grain;m.bumpScale=.004;}}else if(k==='dark'&&String(o.userData.part).startsWith('track')){m.roughness=.72;m.metalness=.55;}else if(k==='rubber')m.roughness=.92;});
 for(const [g,f]of toned)g.traverse(o=>{if(o.isMesh&&o.userData.materialKey===paint)o.material.color.multiplyScalar(f);});
 function update(a,e){offsets(B,e);const q=armorPose(a);tracks.forEach(t=>t.update(q.travel));wheels.forEach(({g,r})=>g.rotation.z=-q.travel/r);turretParts.forEach(g=>g.rotation.y=q.yaw);hatches.forEach(h=>h.rotation.z=q.hatch);if(ramp)ramp.rotation.z=q.ramp;fans.forEach(g=>g.rotation.y=a*.8);}
 return{...B,update,inspection:{displayOnly:true,kind,tracks,wheels,turretParts,turretAnchor,hatches,ramp,cap,roadWheelsPerSide:S.nW,source:SRC,sprocketTeeth:S.N,shoePitch:p,trackZ:zT,trackHalfWidth:hw}};
}
