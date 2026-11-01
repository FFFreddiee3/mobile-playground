import * as T from '#three';
import {makeBuilder,TAU} from '#geometry';
import {subgroup,offsets,panel,rod} from '#vehicle-kit';
const PI=Math.PI;

// 全部相机用同一比例：35.9毫米传感器宽度对应0.82模型单位。卡口内径、法兰距、片幅与机身外形尺寸按下表换算。
// 代表型号只作比例依据，不使用品牌标识。机身内部构件、按键位置、镜头结构与机构细节为网页补全。
export const CAMERA_MM=.82/35.9;
export const CAMERA_SPECS={
 mirrorless:{model:'Sony α7 IV',mount:'Sony E',throat:46.1,flange:18,body:[131.3,96.4,79.8],format:[35.9,23.9]},
 dslr:{model:'Canon EOS 5D Mark IV',mount:'Canon EF',throat:54,ringOuter:65,flange:44,body:[150.7,116.4,75.9],format:[36,24]},
 filmslr:{model:'Nikon F3',mount:'Nikon F',throat:44,flange:46.5,body:[148.5,96.5,65.5],format:[36,24],filmWidth:34.975,perfPitch:4.75,perf:[2.794,1.854],perfEdge:2.01},
 cinema:{model:'Blackmagic Pocket Cinema Camera 6K Pro',mount:'Canon EF',throat:54,ringOuter:65,flange:44,format:[23.10,12.99],nd:[0,2,4,6]}
};
// 机身外形布局（模型单位）。左侧外壳、镜头光轴和握柄位置受既有测试约束，宽度向握柄一侧按机身宽度补足。
const LAYOUT={
 mirrorless:{xL:-1.40,xR:1.60,gripIn:.86,gripFront:.74,cavity:[.94,1.40],rearZ:-.60,hood:.40,topY:.77},
 dslr:{xL:-1.50,xR:1.94,gripIn:.90,gripFront:.84,cavity:[.94,1.78],rearZ:-.70,hood:.865,topY:.77},
 filmslr:{xL:-1.50,xR:1.89,gripIn:1.40,gripFront:.62,cavity:null,rearZ:-.66,hood:.41,topY:.77},
 cinema:{xL:-1.46,xR:1.58,gripIn:1.02,gripFront:.94,cavity:[1.16,1.44],rearZ:-.70,hood:0,topY:1.18}
};
export const CAMERA_AXIS=[-.23,.02];
export const CAMERA_MOUNT_FACE=.7075;

// 曝光时序：反光镜先抬起，快门开放后关闭，反光镜回落，最后过片。
export function cameraExposure(a){
 const cycle=a/TAU,n=Math.floor(cycle),p=cycle-n,smooth=T.MathUtils.smoothstep;
 return {mirror:smooth(p,.22,.30)*(1-smooth(p,.60,.68)),open:smooth(p,.33,.37)*(1-smooth(p,.53,.57)),feed:n+smooth(p,.74,.95),lever:Math.sin(PI*smooth(p,.72,.98))};
}
// 胶片机横走帘幕：前帘收卷后后帘展开，过片时两帘同时复位。返回两帘展开比例。
export function filmCurtains(a){
 const cycle=a/TAU,p=cycle-Math.floor(cycle),smooth=T.MathUtils.smoothstep,reset=smooth(p,.74,.95);
 const first=1-smooth(p,.37,.43),second=smooth(p,.47,.53);
 return {first:first+(1-first)*reset,second:second*(1-reset)};
}
// 反光镜几何：铰轴位于对焦屏下后方，镜面中心与传感器、对焦屏光程相等。
export function reflexGeometry(kind){
 const s=CAMERA_SPECS[kind],zS=CAMERA_MOUNT_FACE-s.flange*CAMERA_MM,hingeZ=zS+.1275,hingeY=CAMERA_AXIS[1]+.32,axisZ=hingeZ+.32,screenY=CAMERA_AXIS[1]+(axisZ-zS);
 return {zS,hingeZ,hingeY,axisZ,screenY,length:.83,thickness:.015,width:.86};
}

export function buildCamera(materials,kind='mirrorless'){
 if(!['mirrorless','dslr','filmslr','cinema'].includes(kind))throw new RangeError('不支持的相机类型。');
 const B=makeBuilder(materials),[cx,cy]=CAMERA_AXIS,film=kind==='filmslr',cinema=kind==='cinema',reflex=kind==='dslr'||film,digital=!film;
 const S=CAMERA_SPECS[kind],Lk=LAYOUT[kind],MM=CAMERA_MM,zM=CAMERA_MOUNT_FACE,throatR=S.throat/2*MM,ringR=S.ringOuter?S.ringOuter/2*MM:throatR+.135,zS=zM-S.flange*MM;
 const {xL,xR,topY}=Lk,shellBottom=cinema?-.94:-.84,shellFront=.638,shellInner=.462,rearZ=Lk.rearZ,rearBack=rearZ-.05-.035*.35,rearInner=rearZ+.05+.035*.35;
 const frameTop=cinema?1.12:.72,frameBottom=cinema?-.91:-.83,frameRight=film?1.38:cinema?1.10:Lk.gripIn-.06,bulkZ=.45,bottomPlateY=cinema?-.91:-.84,bottomTop=bottomPlateY+.06+.00875,reflexG=reflex?reflexG0(kind):null;
 function reflexG0(k){return reflexGeometry(k);}
 let sensorPivot=null,hinge=null,mirrorPivot=null,ndWheel=null,fan=null,lever=null,sprocket=null;const spools=[],blades=[],curtains=[];
 // 相机自己的细颗粒表面随该模型释放，不改变其他模型的共用材质。
 const grainData=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const h=Math.sin(x*127.1+y*311.7)*43758.5453,v=150+Math.floor((h-Math.floor(h))*85),i=(y*128+x)*4;grainData[i]=grainData[i+1]=grainData[i+2]=v;grainData[i+3]=255;}
 const grain=new T.DataTexture(grainData,128,128);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(9,9);grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;
 // 涂装外壳为细颗粒半哑光黑漆，握柄为低反光橡胶皮纹。
 function finish(mesh,grip=false){mesh.material.color.setHex(grip?0x111416:0x1c2024);mesh.material.metalness=grip?.015:.18;mesh.material.roughness=grip?.89:.49;mesh.material.roughnessMap=grain;mesh.material.bumpMap=grain;mesh.material.bumpScale=grip?.007:.002;return mesh;}
 // 内部骨架为压铸镁合金本色，偏灰、半哑光。
 function magnesium(mesh){mesh.material.color.setHex(0x8f979c);mesh.material.metalness=.55;mesh.material.roughness=.46;return mesh;}
 // 光学玻璃半透明并带镀膜反光。
 function opticalFinish(mesh){const material=mesh.material;material.color.setHex(0x23423e);material.roughness=.075;material.metalness=.12;material.clearcoat=.65;material.clearcoatRoughness=.04;material.envMapIntensity=.8;material.transparent=true;material.opacity=.26;material.depthWrite=false;return mesh;}
 const ext=(b,w,h)=>Math.min(b,w/3,h/3)*.35;
 // 水平板，可带矩形开口（五棱镜穿过顶盖与骨架上板）。
 function plate(g,x0,x1,z0,z1,y,th,mat,hole=null,bevel=0){
  const s=new T.Shape();s.moveTo(x0,-z1);s.lineTo(x1,-z1);s.lineTo(x1,-z0);s.lineTo(x0,-z0);s.closePath();
  if(hole){const h=new T.Path();h.moveTo(hole[0],-hole[2]);h.lineTo(hole[0],-hole[3]);h.lineTo(hole[1],-hole[3]);h.lineTo(hole[1],-hole[2]);h.closePath();s.holes.push(h);}
  const geo=new T.ExtrudeGeometry(s,{depth:th-2*bevel,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1,curveSegments:4});geo.rotateX(-PI/2);geo.translate(0,y-th/2+bevel,0);return B.mesh(g,geo,mat);
 }
 function viewfinderShell(group,height){
  const outer=()=>{const shape=new T.Shape();shape.moveTo(-.46,0);shape.lineTo(-.46,height*.60);shape.quadraticCurveTo(-.45,height*.88,-.36,height);shape.lineTo(.36,height);shape.quadraticCurveTo(.45,height*.88,.46,height*.60);shape.lineTo(.46,0);return shape;};
  const section=outer(),inner=height-.08;section.lineTo(.38,0);section.lineTo(.38,inner*.59);section.quadraticCurveTo(.37,inner*.88,.31,inner);section.lineTo(-.31,inner);section.quadraticCurveTo(-.37,inner*.88,-.38,inner*.59);section.lineTo(-.38,0);section.closePath();
  const add=(shape,z,depth,name)=>{const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:3,steps:1,curveSegments:24});geo.translate(cx,.79,z);const mesh=finish(B.mesh(group,geo,'black'));mesh.name=name;B.cut(mesh);return mesh;};
  add(section,-.56,1.02,'camera-viewfinder-walls');const front=outer();front.closePath();add(front,.46,.04,'camera-viewfinder-front');
  const rear=outer();rear.lineTo(.22,0);rear.lineTo(.22,.27);rear.lineTo(-.22,.27);rear.lineTo(-.22,0);rear.closePath();add(rear,-.60,.04,'camera-viewfinder-rear');
 }
 // 取景器罩顶面高度由同一截面几何求得，热靴底座直接坐在该面上。
 const hoodTop=cinema?null:(()=>{const shape=new T.Shape(),h=Lk.hood;shape.moveTo(-.46,0);shape.lineTo(-.46,h*.60);shape.quadraticCurveTo(-.45,h*.88,-.36,h);shape.lineTo(.36,h);shape.quadraticCurveTo(.45,h*.88,.46,h*.60);shape.lineTo(.46,0);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:.04,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:3,steps:1,curveSegments:24});geo.translate(cx,.79,0);geo.computeBoundingBox();const top=geo.boundingBox.max.y;geo.dispose();return top;})();

 // 01 骨架：镁合金前隔板（带卡口通孔）、上下板与两侧立板。
 const frame=B.part('frame','镁合金骨架','MAGNESIUM CHASSIS','压铸镁合金前隔板承接镜头卡口，上下板与两侧立板围成机身承力框。',[0,-1.2,0]);
 const prismHole=reflex?[cx-.40,cx+.40,reflexG.axisZ-.48,reflexG.axisZ+.36]:null;
 const fw=frameRight-(xL+.10);
 magnesium(B.box(frame,fw-.02,frameTop-frameBottom-.10,.03,'alloy',[(xL+.10+frameRight)/2,(frameTop+frameBottom)/2,bulkZ],.01,[[cx-(xL+.10+frameRight)/2,cy-(frameTop+frameBottom)/2,.64]]));
 for(const [y,hole]of [[frameTop,prismHole],[frameBottom,null]])magnesium(plate(frame,xL+.10,frameRight,-.50,bulkZ+.0185,y,.10,'alloy',hole));
 for(const x of [xL+.145,frameRight-.045])magnesium(B.box(frame,.09,frameTop-frameBottom+.10,.95,'alloy',[x,(frameTop+frameBottom)/2,-.03],.01));
 if(reflex){// 反光镜箱：两侧壁与底板，侧壁顶面承托对焦屏。
  const g=reflexG,z0=zS+.085,z1=bulkZ-.015,h=g.screenY-.01-(cy-.47),yc=cy-.47+h/2;
  for(const s of [-1,1])magnesium(B.box(frame,.03,h,z1-z0,'alloy',[cx+s*.47,yc,(z0+z1)/2],0));
  magnesium(B.box(frame,.97,.03,z1-z0,'alloy',[cx,cy-.485,(z0+z1)/2],0));
  // 侧壁通过支撑板连到骨架下板与前隔板。
  for(const s of [-1,1])magnesium(B.box(frame,.03,cy-.47-frameBottom,.30,'alloy',[cx+s*.47,(cy-.47+frameBottom)/2,(z0+z1)/2],0));
 }

 // 02 前壳与握柄。
 const body=B.part('body','前部外壳与握柄','FRONT SHELL & GRIP','前面板留有镜头通孔，握柄内为电池仓，上方实心部分形成电池仓顶。',[0,.4,1.1]);
 const shellR=xR-(film?.03:.10),top=cinema?1.18:.76;
 const outline=new T.Shape();outline.moveTo(xL+.11,shellBottom);outline.lineTo(shellR-.23,shellBottom);outline.quadraticCurveTo(shellR,shellBottom,shellR,shellBottom+.26);outline.lineTo(shellR,top-.27);
 outline.quadraticCurveTo(shellR,top,shellR-.24,top);
 if(cinema)outline.lineTo(xL+.16,top);
 else if(film){outline.lineTo(cx+.50,top);outline.lineTo(cx+.41,1.10);outline.lineTo(cx-.40,1.10);outline.lineTo(cx-.54,top);outline.lineTo(xL+.16,top);}
 else if(reflex){outline.quadraticCurveTo(cx+.88,top+.06,cx+.57,top+.06);outline.quadraticCurveTo(cx+.43,1.42,cx+.19,1.50);outline.lineTo(cx-.24,1.50);outline.quadraticCurveTo(cx-.44,1.46,cx-.58,top+.06);outline.lineTo(xL+.16,top);}
 else{outline.lineTo(cx+.56,top);outline.quadraticCurveTo(cx+.51,1.00,cx+.39,1.12);outline.lineTo(cx-.36,1.12);outline.quadraticCurveTo(cx-.46,1.00,cx-.54,top);outline.lineTo(xL+.16,top);}
 outline.quadraticCurveTo(xL,top,xL,top-.17);outline.lineTo(xL,shellBottom+.19);outline.quadraticCurveTo(xL,shellBottom,xL+.11,shellBottom);outline.closePath();
 const opening=new T.Path();opening.absarc(cx,cy,.63,0,TAU,true);outline.holes.push(opening);
 const shell=new T.ExtrudeGeometry(outline,{depth:.14,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:3,steps:1,curveSegments:48});shell.translate(0,0,.48);B.cut(finish(B.mesh(body,shell,'black'),film));
 // 握柄沿前后方向有连续曲面。下段包围电池仓，上段实心作仓顶并承托快门按钮。
 const gripTop=cinema?1.04:.70,gripBottom=cinema?-.90:-.84,split=film?null:.45;
 function gripShape(withCavity){
  const s=new T.Shape(),a=Lk.gripIn,b=xR,f=Lk.gripFront;
  if(film){s.moveTo(a,-.49);s.lineTo(b-.10,-.49);s.quadraticCurveTo(b,-.46,b,-.30);s.lineTo(b,f-.20);s.quadraticCurveTo(b,f,b-.15,f);s.lineTo(a,f);s.closePath();}
  else{s.moveTo(a,-.48);s.lineTo(b-.26,-.48);s.quadraticCurveTo(b,-.44,b,-.18);s.lineTo(b-.02,f-.18);s.quadraticCurveTo(b-.06,f,b-.30,f);s.quadraticCurveTo(b-.52,f,b-.58,f-.19);s.lineTo(a-.02,.28);s.quadraticCurveTo(a+.07,.06,a,-.08);s.closePath();}
  if(withCavity&&Lk.cavity){const c=new T.Path(),[lo,hi]=Lk.cavity;c.moveTo(lo,-.34);c.lineTo(lo,.26);c.lineTo(hi,.26);c.lineTo(hi,-.34);c.closePath();s.holes.push(c);}
  return s;
 }
 const gripPieces=split===null?[[gripTop,gripTop-gripBottom,false]]:[[split,split-gripBottom,true],[gripTop,gripTop-split,false]];
 for(const [yTop,depth,cav]of gripPieces){const geo=new T.ExtrudeGeometry(gripShape(cav),{depth:depth-.044,bevelEnabled:true,bevelSize:.022,bevelThickness:.022,bevelSegments:3,curveSegments:24,steps:1});geo.rotateX(PI/2);geo.translate(0,yTop-.022,0);const g=finish(B.mesh(body,geo,'rubber'),true);g.name='camera-sculpted-grip';B.cut(g);}
 const bottomDepth=.50-(rearInner+.01);
 B.cut(finish(B.box(body,shellR-xL-.04,.12,bottomDepth,'black',[(xL+shellR)/2,bottomPlateY,(.50+rearInner+.01)/2],.025)));
 const sideH=top-shellBottom-.04,side=B.box(body,bottomDepth,sideH,.10,'black',[xL+.064,(top+shellBottom)/2,(.50+rearInner+.01)/2],.04,cinema?[[(.50+rearInner+.01)/2+.01,-.15-(top+shellBottom)/2,.24]]:[]);side.rotation.y=PI/2;side.name='camera-left-shell';B.cut(finish(side));
 if(cinema){B.cut(B.tube(body,.245,.225,.06,'dark',[xL-.02,-.15,-.01],'x'));for(const dy of [-.16,-.08,0,.08,.16]){const width=2*Math.sqrt(.22**2-dy**2);B.cut(B.box(body,.018,.016,width,'dark',[xL-.05,-.15+dy,-.01],.003));}}
 // 前面板对焦辅助灯与镜头释放按钮。
 for(const x of [xL+.22,cx+.85]){B.cylinder(body,.045,.02,'dark',[x,.36,.647],'z');B.box(body,.042,.006,.004,'alloy',[x,.36,.659],.001);}
 B.cylinder(body,.075,.042,'dark',[cx+.82,-.30,.657],'z');B.box(body,.012,.07,.005,'porcelain',[cx+.82,-.30,.6805],.002);
 if(!cinema&&!reflex)viewfinderShell(body,Lk.hood);

 // 03 后壳。
 const rear=B.part('rear',film?'后盖与压片板':'后盖与操作按键','REAR SHELL',film?'铰接后盖内侧的压片板把胶片压在片门导轨上。':'后盖、目镜和控制按钮围绕显示屏排列。',[0,.3,-1.25]);
 const rearTop=cinema?1.12:.74,rearBottom=shellBottom+.04;
 B.cut(finish(B.box(rear,xR-.04-xL,rearTop-rearBottom,.10,'black',[(xL+xR-.04)/2,(rearTop+rearBottom)/2,rearZ],.035)));
 if(!cinema){// 目镜：贴在取景器罩后板的橡胶眼罩与目镜玻璃。
  const eyeY=.79+.135,depth=film?.18:reflex?.20:.40,z0=-.608;
  B.box(rear,.57,.36,depth-.02,'rubber',[cx,eyeY,z0-depth/2],.07);B.box(rear,.32,.20,.012,'optics',[cx,eyeY,z0-depth+.004],.025);
 }
 if(digital){
  const buttons=cinema?[[1.10,.48],[1.12,.12],[1.10,-.57]]:[[xR-.50,.48],[xR-.48,.12],[xR-.50,-.57],[xL+.27,.66],[xL+.62,.66]];
  for(const [x,y]of buttons)B.cylinder(rear,.07,.04,'rubber',[x,y,rearBack-.019],'z');
  const dx=cinema?1.1:xR-.50;B.cylinder(rear,.20,.05,'dark',[dx,-.20,rearBack-.024],'z');B.cylinder(rear,.07,.06,'rubber',[dx,-.20,rearBack-.078],'z');
  const ticks=[];for(let i=0;i<24;i++){const a=i*TAU/24;ticks.push({p:[dx+.18*Math.cos(a),-.20,rearBack-.0485],r:[0,0,a]});}B.instances(rear,new T.BoxGeometry(.018,.012,.012),'alloy',ticks);
 }else{// 压片板经两根弹片连接后盖内侧。
  B.box(rear,1.10,.62,.02,'steel',[cx,cy,zS-.0046-.0114],.004);
  for(const s of [-1,1])B.box(rear,.06,.06,rearInner-(zS-.0245)+.002,'steel',[cx+s*.42,cy,(rearInner+zS-.0245)/2],0);
 }

 // 04 顶盖、拨轮与热靴。
 const controls=B.part('controls','顶部拨轮与热靴','TOP CONTROLS','快门按钮、模式拨轮和热靴分别安装在顶盖上。',[.6,1.3,0]);
 const coverX0=xL+.13,coverX1=xR-.27,coverZ0=rearInner-.04,coverZ1=.46;
 const topCover=plate(controls,coverX0,coverX1,coverZ0,coverZ1,topY,.12,film?'dark':'black',reflex?[cx-.47,cx+.47,-.57,.45]:null,.012);topCover.name='camera-top-cover';
 if(film){topCover.material.color.setHex(0x1d2023);topCover.material.metalness=.35;topCover.material.roughness=.42;topCover.material.roughnessMap=grain;topCover.material.bumpMap=grain;topCover.material.bumpScale=.002;}else finish(topCover);
 topCover.geometry.computeBoundingBox();const coverTop=topCover.geometry.boundingBox.max.y;
 const shift=xR-1.60;
 for(const [x,z,r]of [[1.14+shift,.35,.17],[.75+shift*.6,-.25,.24],[-1.05,-.18,.18]]){
  B.cylinder(controls,r,.10,'dark',[x,topY+.14,z],'y');const knurl=[];for(let i=0;i<32;i++){const a=i*TAU/32;knurl.push({p:[x+r*Math.cos(a),topY+.14,z+r*Math.sin(a)],r:[0,-a,0]});}
  B.instances(controls,new T.BoxGeometry(.015,.07,.025),film?'dark':'black',knurl);
  const collar=topY+.09-coverTop+.006;B.cylinder(controls,r*.72,collar,'dark',[x,coverTop-.006+collar/2,z],'y');
 }
 B.cylinder(controls,.12,.025,'chrome',[1.14+shift,topY+.2025,.35],'y');
 const shoeY=cinema?coverTop:hoodTop;
 for(const x of [-.45,.08]){const rail=B.box(controls,.035,.065,.38,'chrome',[x,shoeY+.05645,-.07],.005);rail.name='camera-hotshoe-rail';}
 const shoeBase=B.box(controls,.58,.018,.34,'dark',[-.185,shoeY+.0111,-.07],.006);shoeBase.name='camera-hotshoe-base';

 // 05 卡口：不锈钢卡口环，内径与外径按公开数值换算。
 const mount=B.part('mount',film?'三爪镜头卡口环':'镜头卡口与电气触点','LENS MOUNT',film?'三爪卡口环固定在前隔板前方，胶片机为机械连动，不设电气触点。':'卡口环内径与法兰距按公开数值换算，触点排列在卡口下方内侧。',[0,0,1.4]);
 const ringDepth=zM-shellFront;B.tube(mount,ringR,throatR,ringDepth,'chrome',[cx,cy,(zM+shellFront)/2],'z').name='camera-mount-ring';
 B.bolts(mount,Array.from({length:6},(_,i)=>[cx+(throatR+ringR)/2*Math.cos(PI/6+i*TAU/6),cy+(throatR+ringR)/2*Math.sin(PI/6+i*TAU/6),zM+.0075]),'z',.016);
 B.cylinder(mount,.018,.006,kind==='dslr'||cinema?'scarlet':'porcelain',[cx+(throatR+ringR)/2*Math.cos(1.2),cy+(throatR+ringR)/2*Math.sin(1.2),zM+.003],'z');
 if(digital){
  const pins=kind==='mirrorless'?10:8,span=.09*pins/2;
  B.tube(mount,throatR+.01,throatR-.05,.04,'black',[cx,cy,.62],'z',-PI/2-span-.06,2*span+.12);
  for(let i=0;i<pins;i++){const a=-PI/2-span+(i+.5)*2*span/pins;B.cylinder(mount,.012,.030,'gold',[cx+(throatR-.025)*Math.cos(a),cy+(throatR-.025)*Math.sin(a),.655],'z');}
 }

 // 06 传感器（数码）：活动或固定承载板、钢珠导轨、底板和立柱。
 let sensorFace=null;
 if(digital){
  const sensor=B.part('sensor',cinema?'Super 35传感器与固定支承':reflex?'全画幅传感器与固定支承':'全画幅传感器与防抖移动支承','IMAGE SENSOR',kind==='mirrorless'?'传感器承载板经四颗钢珠贴在固定底板上，可在平面内微移。':'矩形传感器与其支承结构位于法兰距对应的成像面。',[0,-.5,-.9]);
  sensorPivot=subgroup(sensor,[cx,cy,zS-.052]);sensorPivot.name='camera-sensor-carrier';
  B.box(sensorPivot,1.05,.78,.08,'dark',[0,0,0],.015);
  const size=S.format,width=.820*size[0]/35.9;
  sensorFace=B.mesh(sensorPivot,new T.BoxGeometry(width,width*size[1]/size[0],.018),'optics',[0,0,.043]);sensorFace.userData.sensorSizeMm=size;sensorFace.name='camera-sensor-face';
  const carrierBack=zS-.052-.04-.00525,baseFront=carrierBack-.021,baseZ=baseFront-.02-.0035;
  B.box(sensor,1.10,.86,.04,'alloy',[cx,cy,baseZ],.01);
  for(const x of [-.40,.40])for(const y of [-.30,.30])B.mesh(sensor,new T.SphereGeometry(.0098,12,8),'steel',[cx+x,cy+y,(carrierBack+baseFront)/2]);
  for(const x of [-.40,.40]){rod(B,sensor,[cx+x,cy+.43,baseZ],[cx+x,frameTop-.045,baseZ],.025,'titanium');rod(B,sensor,[cx+x,cy-.43,baseZ],[cx+x,frameBottom+.045,baseZ],.025,'titanium');}
 }

 // 07 快门：数码机为纵走叶片，胶片机为横走钛箔帘幕绕在两侧卷鼓上。
 if(!cinema){
  const shutter=B.part('shutter',film?'横走式焦平面快门':'焦平面快门与叶片','FOCAL PLANE SHUTTER',film?'两道钛箔帘幕分别绕在片门两侧的卷鼓上，前帘收卷后后帘展开。':'快门叶片位于传感器前方，叶片分层错开，开启时向上叠起。',[-1.2,1.0,.3]);
  const z0=zS+.012,z1=reflex?zS+.085:bulkZ-.015-.0035,zc=(z0+z1)/2;
  const curtain=subgroup(shutter,[cx,cy,0]);curtain.name='camera-shutter-carrier';
  if(film){
   for(const s of [-1,1]){B.cylinder(shutter,.03,.66,'titanium',[cx+s*.47,cy,zS+.055],'y');for(const y of [-.345,.345])B.box(shutter,.08,.05,.06,'dark',[cx+s*.47,cy+y,zS+.055],.004);}
   for(const y of [-.345,.345])B.box(shutter,1.0,.05,.02,'dark',[cx,cy+y,zS+.075],.004);
   for(let i=0;i<2;i++){const drum=i?-1:1,g=subgroup(curtain,[drum*.438,0,zS+.052+i*.006]),plateMesh=B.box(g,.876,.62,.004,'titanium',[-drum*.438,0,0],.001);plateMesh.material.color.setHex(0x2a2d31);plateMesh.material.metalness=.75;plateMesh.material.roughness=.38;g.name='film-shutter-curtain-'+i;curtains.push(g);}
  }else{
   for(const s of [-1,1])B.box(shutter,.07,.98,z1-z0,'dark',[cx+s*.53,cy+.13,zc],.004);
   B.box(shutter,1.13,.05,z1-z0,'dark',[cx,cy-.385,zc],.004);B.box(shutter,1.13,.05,z1-z0,'dark',[cx,cy+.645,zc],.004);
   for(let i=0;i<6;i++){const blade=subgroup(curtain,[0,-.28+i*.112,zS+.03+i*.0025]);B.box(blade,.982,.115,.002,'dark',[0,0,0],.0006);blade.name='camera-shutter-blade-'+i;blades.push(blade);}
  }
 }

 // 08 主板（数码）。
 if(digital){
  const electronics=B.part('electronics','主板与柔性线缆','PROCESSOR BOARD','电路板经铜柱固定在后壳内侧，柔性线缆连到传感器底板。',[-1.5,-.4,-1.1]);
  const boardZ=kind==='mirrorless'?-.33:-.52,boardBack=boardZ-.02-.007;
  B.box(electronics,1.94,1.32,.04,'circuit',[-.27,-.04,boardZ],.02);
  for(const [x,y,w,h]of [[-.1,-.05,.48,.48],[-.76,.27,.26,.16],[-.70,-.39,.34,.23],[.35,.40,.24,.18],[.40,-.38,.20,.25]]){
   B.box(electronics,w,h,.075,'black',[x,y,boardBack-.0375+.003],.01);
   for(const s of [-1,1])for(let i=0;i<8;i++)B.box(electronics,.014,.035,.013,'chrome',[x-w*.4+i*w*.8/7,y+s*(h/2+.012),boardBack-.006],0);
  }
  for(const [x,y]of [[-1.12,.52],[.58,.52],[-1.12,-.62],[.58,-.62]]){const len=boardBack-rearInner+.004;B.cylinder(electronics,.03,len,'copper',[x,y,(boardBack+rearInner)/2],'z');}
  const baseZ=zS-.052-.04-.00525-.021-.0235,flexTop=cy-.45;
  B.path(electronics,[[cx,flexTop+.02,baseZ],[cx,flexTop-.08,baseZ-.03],[cx,-.62,(baseZ+boardZ)/2],[cx,-.62,boardZ+.025],[cx,-.66,boardZ]],.012,'copper');
 }

 // 09 电池。
 const battery=B.part('battery',film?'测光电池与底部电池仓':'电池与握柄内仓','BATTERY PACK',film?'两枚扣式电池装在底部电池仓内。':'电池位于握柄下段内仓，顶部触点接到仓顶。',[1.7,-.8,0]);
 if(digital){
  const [lo,hi]=Lk.cavity,bw=Math.min(hi-lo-.06,.62),bx=(lo+hi)/2,bh=split-.06-bottomTop,battTop=bottomTop+bh+.0082,ch=split-battTop-.0021;
  B.box(battery,bw,bh,.52,'dark',[bx,bottomTop+bh/2+.004,-.04],.012);B.box(battery,bw*.7,bh*.5,.006,'porcelain',[bx,bottomTop+bh*.5,.226],.003);
  for(let i=0;i<4;i++)B.box(battery,.045,ch,.07,'gold',[bx-.09+i*.06,(battTop+split)/2,-.04],.003);
 }else{
  B.tube(battery,.13,.10,.06,'dark',[.55,bottomTop+.03,.25],'y');for(let i=0;i<2;i++)B.cylinder(battery,.095,.02,'chrome',[.55,bottomTop+.012+i*.022,.25],'y');
 }

 // 10 显示屏（数码）。
 if(digital){
  const screen=B.part('screen',kind==='dslr'?'固定显示屏':cinema?'翻转显示屏与铰链':'可调显示屏与铰链','CAMERA DISPLAY','显示屏连接后盖或铰链支承。',[-1.3,.0,-1.6]);
  if(kind==='dslr'){const z=rearBack-.074+.001;B.box(screen,1.95,1.22,.12,'black',[-.37,-.06,z],.04);B.box(screen,1.73,1.03,.008,'screen',[-.37,-.06,z-.075],.015);}
  else if(cinema){hinge=subgroup(screen,[-.25,.95,rearBack-.067]);hinge.name='camera-display-hinge';B.cylinder(hinge,.065,1.95,'chrome',[0,0,0],'x');B.box(hinge,2.00,1.24,.12,'black',[0,-.68,-.075],.04);B.box(hinge,1.80,1.05,.008,'screen',[0,-.68,-.151],.015);}
  else{hinge=subgroup(screen,[xL+.05,-.06,rearBack-.067]);hinge.name='camera-display-hinge';B.cylinder(hinge,.065,1.05,'chrome',[0,0,0],'y');B.box(hinge,1.95,1.22,.12,'black',[.98,0,-.075],.04);B.box(hinge,1.73,1.03,.008,'screen',[.98,0,-.151],.015);for(let i=0;i<4;i++)B.box(hinge,.006,.94,.004,'navy',[.21+i*.50,0,-.157],0);}
 }

 // 11 镜头外筒：后端法兰贴在卡口面，卡口爪伸入卡口内径。
 const lens=B.part('barrel','镜头外筒与卡口','LENS BARREL','镜筒后端法兰贴合机身卡口面，卡口爪与后组镜片伸入卡口内径。',[0,.8,1.9]);
 const barrelProfile=[[.68,zM],[.68,zM+.045],[.64,zM+.075],[.64,1.40],[.626,1.44],[.626,1.92],[.65,1.97],[.65,2.33],[.70,2.40],[.70,2.50],[.57,2.50],[.57,zM],[.68,zM]];
 for(const [start,cut]of [[PI,false],[0,true]]){const mesh=B.lathe(lens,barrelProfile,'black',[cx,cy,0],'z',start,PI);mesh.material.color.setHex(0x181b1e);mesh.material.metalness=.28;mesh.material.roughness=.32;if(cut)B.cut(mesh);}
 for(const z of [.80,1.22,2.05]){const ring=B.tube(lens,.651,.57,.035,'dark',[cx,cy,z],'z');ring.material.roughness=.35;}
 B.tube(lens,.705,.565,.035,'dark',[cx,cy,2.49],'z');B.tube(lens,.687,.65,.012,'alloy',[cx,cy,2.514],'z');
 B.tube(lens,.651,.638,.24,'rubber',[cx,cy,1.04],'z');const fixedGrip=[];for(let i=0;i<72;i++){const a=i*TAU/72;fixedGrip.push({p:[cx+.653*Math.cos(a),cy+.653*Math.sin(a),1.04],r:[0,0,a]});}B.instances(lens,new T.BoxGeometry(.014,.018,.22),'rubber',fixedGrip);
 for(let i=0;i<11;i++){const a=(i-5)*.12;const mark=B.box(lens,.009,.003,i%5===0?.045:.024,'porcelain',[cx+.6415*Math.sin(a),cy+.6415*Math.cos(a),1.30],0);mark.rotation.z=-a;}
 B.box(lens,.014,.006,.11,'scarlet',[cx,cy+.642,1.38],.002);
 B.tube(lens,throatR-.004,throatR-.06,.035,'chrome',[cx,cy,zM-.0175],'z');B.tube(lens,.575,throatR-.06,.02,'chrome',[cx,cy,zM+.01],'z');
 opticalFinish(B.lathe(lens,[[0,-.03],[(throatR-.059)*.6,-.022],[throatR-.059,0],[throatR-.059,.02],[0,.026]],'optics',[cx,cy,zM-.0],'z'));
 opticalFinish(B.lathe(lens,[[0,-.035],[.34,-.025],[.5685,0],[.5685,.045],[.28,.06],[0,.065]],'optics',[cx,cy,2.45],'z'));

 // 12 对焦环（旋转）与 13 移动镜组。
 const focus=B.part('focus','对焦环与橡胶纹','FOCUS RING','对焦环套在镜筒外，内径与镜筒保持小间隙，转动时带动内部镜组前后移动。',[0,1.6,1.1]),focusRing=subgroup(focus,[cx,cy,1.70]);focusRing.name='camera-focus-ring';B.tube(focusRing,.67,.629,.34,'rubber',[0,0,0],'z');
 const grip=[];for(let i=0;i<72;i++){const a=i*TAU/72;grip.push({p:[.676*Math.cos(a),.676*Math.sin(a),0],r:[0,0,a]});}B.instances(focusRing,new T.BoxGeometry(.012,.024,.32),'rubber',grip);
 const optic=B.part('optics','光学镜片与移动镜框','OPTICAL ELEMENTS','多组曲面镜片沿光轴排列，镜框外缘沿镜筒内壁滑动。',[1.5,.2,1.8]),moving=subgroup(optic,[cx,cy,0]);moving.name='camera-moving-optics';
 for(const [z,r]of [[.97,.43],[1.23,.47],[1.94,.49],[2.30,.53]]){
  opticalFinish(B.lathe(moving,[[0,-.035],[r*.6,-.025],[r,0],[r,.045],[r*.5,.06],[0,.065]],'optics',[0,0,z],'z'));
  B.tube(moving,.5675,r-.004,.06,'dark',[0,0,z+.02],'z');
 }

 // 14 光圈：固定环与九片分层叶片。
 const aperture=B.part('aperture','光圈叶片与支承环','IRIS DIAPHRAGM','九片叶片分层叠放在支承环前方，各绕外缘枢轴转动形成可变通光孔。',[-1.4,-.6,1.9]),iris=subgroup(aperture,[cx,cy,1.53]),leaves=[];
 B.tube(iris,.5675,.43,.02,'steel',[0,0,0],'z');
 for(let i=0;i<9;i++){const a=i*TAU/9,g=subgroup(iris,[.50*Math.cos(a),.50*Math.sin(a),.012+i*.0035]);g.name='camera-iris-leaf-'+i;panel(B,g,[[0,0],[-.33,-.06],[-.36,.10],[-.08,.19]],.003,'dark',[0,0,0],'xy');leaves.push({g,a});}

 // 15 外部接口与挂环。
 const fittings=B.part('fittings','连接口与肩带挂环','PORTS & FITTINGS','接口盖、肩带挂环和三脚架接口分布在机身周围。',[-1.7,-.8,-.4]);
 if(film){B.tube(fittings,.07,.026,.04,'chrome',[xL-.02,.18,0],'x');B.cylinder(fittings,.023,.02,'dark',[xL-.045,.18,0],'x');}else for(const y of cinema?[.52,.86]:[-.45,-.06,.35])B.box(fittings,.04,.27,.39,'rubber',[xL-.015,y,-.08],.02);
 for(const [x,y]of [[xL-.10,cinema?.95:.62],[xR-.02+.10,.55]])B.torus(fittings,.10,.024,'chrome',[x,y,-.13],'z');
 B.tube(fittings,.11,.055,.05,'chrome',[cx,bottomPlateY-.06-.00875-.02,0],'y');

 // 16-17 反光镜与五棱镜（单反）。
 if(reflex){
  const g=reflexG;
  const mirror=B.part('mirror','反光镜与翻转支承','REFLEX MIRROR','铰轴位于对焦屏下后方，反光镜先抬起贴近对焦屏，快门随后开放，曝光结束后回落。',[-1.3,.6,.8]);
  mirrorPivot=subgroup(mirror,[cx,g.hingeY,g.hingeZ]);mirrorPivot.name='camera-reflex-mirror';
  B.cylinder(mirror,.02,.91,'chrome',[cx,g.hingeY,g.hingeZ],'x');
  const glass=B.box(mirrorPivot,g.width,g.length-.024,g.thickness,'chrome',[0,-.024-(g.length-.024)/2,-g.thickness/2],.003);glass.name='camera-mirror-glass';
  for(const s of [-1,1]){B.tube(mirrorPivot,.04,.022,.05,'dark',[s*.40,0,0],'x');B.box(mirrorPivot,.05,.05,.02,'dark',[s*.40,-.052,-.01],.004);}
  const prism=B.part('prism','五棱镜与对焦屏','PENTAPRISM & FOCUSING SCREEN','对焦屏到镜面中心的距离等于传感器到镜面中心的距离，五棱镜把对焦屏影像转到目镜。',[0,1.4,-.3]);
  const y0=g.screenY+.01,zf=g.axisZ+.276;
  opticalFinish(panel(B,prism,[[0,0],[0,.30],[.22,.58],[.70,.56],[.66,.30],[.552,0]],.62,'optics',[cx,y0,zf],'yz')).material.opacity=.45;
  B.box(prism,.96,.02,.552,'ceramic',[cx,g.screenY,g.axisZ],.004);
  viewfinderShell(prism,Lk.hood);
  // 五棱镜由两侧卡箍固定到取景器罩。
  for(const s of [-1,1])B.box(prism,.07,.10,.30,'dark',[cx+s*.345,.80,g.axisZ],0);
 }

 // 胶片机：暗盒、收片轴、输片齿轮、胶片与过片杆。
 if(film){
  const reels=B.part('reels','胶卷暗盒与收片轴','FILM REELS','供片暗盒与收片轴位于片门两侧，输片齿轮与收片轴只在过片阶段转动。',[1.4,-.7,-.4]);
  const cassette=subgroup(reels,[-1.03,cy,zS]);cassette.name='film-spool-0';B.cylinder(cassette,.23,.98,'black',[0,0,0],'y');B.cylinder(cassette,.045,1.13,'chrome',[0,0,0],'y');for(const y of [-.49,.49])B.cylinder(cassette,.24,.03,'titanium',[0,y,0],'y');spools.push(cassette);
  const takeup=subgroup(reels,[1.04,cy,zS]);takeup.name='film-spool-1';B.cylinder(takeup,.19,.86,'dark',[0,0,0],'y');B.cylinder(takeup,.045,1.13,'chrome',[0,0,0],'y');for(const y of [-.45,.45])B.cylinder(takeup,.23,.035,'titanium',[0,y,0],'y');spools.push(takeup);
  // 暗盒轴和收片轴的上下端插在骨架板的轴套内。
  for(const [x,len]of [[-1.03,1.13],[1.04,1.13]])for(const s of [-1,1]){const yEnd=cy+s*len/2,yPlate=s>0?frameTop-.05:frameBottom+.05;B.tube(reels,.07,.047,Math.abs(yPlate-yEnd)+.03,'steel',[x,(yEnd+yPlate)/2,zS],'y');}
  sprocket=subgroup(reels,[.55,cy,zS-.004-.101]);sprocket.name='film-sprocket';B.cylinder(sprocket,.10,.80,'steel',[0,0,0],'y');
  for(const s of [-1,1]){const yEnd=cy+s*.40,yPlate=s>0?frameTop-.05:bottomTop,y0=yEnd+s*.002,y1=yPlate+s*.01;B.tube(reels,.06,.026,Math.abs(y1-y0),'steel',[.55,(y0+y1)/2,zS-.105],'y');const a0=s*.40,a1=yPlate-s*.002-cy;B.cylinder(sprocket,.024,Math.abs(a1-a0),'chrome',[0,(a0+a1)/2,0],'y');}
  const filmPart=B.part('film','胶片、片门与导轨','PERFORATED FILM','35毫米胶片跨过片门，齿孔间距与胶片宽度按标准换算，片门开口为36×24毫米。',[0,.2,-1.4]);
  const fw2=S.filmWidth*MM/2,pitch=S.perfPitch*MM,pw=S.perf[0]*MM,ph=S.perf[1]*MM,py=fw2-S.perfEdge*MM-ph/2,x0=-1.03+.23+.002,x1=1.04-.19-.002;
  const strip=new T.Shape();strip.moveTo(x0,cy-fw2);strip.lineTo(x1,cy-fw2);strip.lineTo(x1,cy+fw2);strip.lineTo(x0,cy+fw2);strip.closePath();
  for(const y of [-py,py])for(let x=x0+.06;x<x1-.06;x+=pitch){const hole=new T.Path();hole.moveTo(x-pw/2,cy+y-ph/2);hole.lineTo(x+pw/2,cy+y-ph/2);hole.lineTo(x+pw/2,cy+y+ph/2);hole.lineTo(x-pw/2,cy+y+ph/2);hole.closePath();strip.holes.push(hole);}
  const geo=new T.ExtrudeGeometry(strip,{depth:.004,bevelEnabled:false,steps:1});const filmMesh=B.mesh(filmPart,geo,'bronze',[0,0,zS-.004]);filmMesh.name='film-strip';filmMesh.material.color.setHex(0x6b3a1c);filmMesh.material.metalness=.05;filmMesh.material.roughness=.35;
  const gw=36*MM,gh=24*MM,gate=new T.Shape();gate.moveTo(cx-.54,cy-.36);gate.lineTo(cx+.54,cy-.36);gate.lineTo(cx+.54,cy+.36);gate.lineTo(cx-.54,cy+.36);gate.closePath();const gh2=new T.Path();gh2.moveTo(cx-gw/2,cy-gh/2);gh2.lineTo(cx-gw/2,cy+gh/2);gh2.lineTo(cx+gw/2,cy+gh/2);gh2.lineTo(cx+gw/2,cy-gh/2);gh2.closePath();gate.holes.push(gh2);
  const gateMesh=B.mesh(filmPart,new T.ExtrudeGeometry(gate,{depth:.02,bevelEnabled:false,steps:1}),'black',[0,0,zS+.002]);gateMesh.name='film-gate';gateMesh.userData.gateMm=[36,24];
  for(const y of [-.29,.29])B.box(filmPart,1.12,.02,.002,'steel',[cx,cy+y,zS+.0012],0);
  for(const y of [-.43,.43])B.box(filmPart,1.12,.03,.03,'steel',[cx,cy+y,zS-.003],0);
  for(const s of [-1,1])B.box(filmPart,.04,.86,.04,'dark',[cx+s*.545,cy,zS+.022],0);
  for(const s of [-1,1])B.box(filmPart,.06,.06,bulkZ-.015-(zS+.042),'dark',[cx+s*.53,cy+s*.42,(bulkZ-.015+zS+.042)/2],0);
  const advance=B.part('advance','过片杆与传动轴','FILM ADVANCE','顶部过片杆绕固定轴转动，与收片轴、输片齿轮在过片阶段配合。',[1.4,1.2,0]);
  const lx=xR-.42,lz=-.10,ly=1.01;B.cylinder(advance,.05,ly-.037-coverTop+.004,'steel',[lx,(coverTop-.004+ly-.037)/2,lz],'y');
  lever=subgroup(advance,[lx,ly,lz]);lever.name='film-advance-lever';B.cylinder(lever,.13,.07,'chrome',[0,0,0],'y');rod(B,lever,[0,.04,0],[-.50,.04,.06],.045,'alloy');B.box(lever,.21,.09,.17,'rubber',[-.53,.04,.064],.03);
 }

 // 电影机：四档ND滤镜轮、散热、导轨与遮光斗、外置存储。
 if(cinema){
  const nd=B.part('nd','四档ND滤镜与选择机构','ND FILTER SELECTOR','四个滤镜位置位于卡口与传感器之间，由选择轮切换，选择机构为网页补全。',[1.5,1.3,.3]);
  const wz=.05;ndWheel=subgroup(nd,[cx+.44,cy,wz]);ndWheel.name='cinema-nd-wheel';const shape=new T.Shape();shape.absarc(0,0,.78,0,TAU,false);
  for(let i=0;i<4;i++){const a=PI+i*TAU/4,x=.44*Math.cos(a),y=.44*Math.sin(a),hole=new T.Path();hole.absarc(x,y,.31,0,TAU,true);shape.holes.push(hole);const filter=B.cylinder(ndWheel,.3075,.012,i?'glass':'optics',[x,y,.009],'z');filter.userData.ndFilter=i;filter.userData.ndStops=S.nd[i];if(i)filter.material.opacity=.55+.12*i,filter.material.transparent=true;}
  const geo=new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:false,steps:1,curveSegments:32});B.mesh(ndWheel,geo,'dark');B.cylinder(ndWheel,.07,.07,'chrome',[0,0,.009],'z');
  const bz0=wz+.009+.035+.002;B.tube(nd,.11,.072,bulkZ-.015-bz0,'dark',[cx+.44,cy,(bz0+bulkZ-.015)/2],'z');B.tube(nd,.11,.072,.03,'dark',[cx+.44,cy,wz+.009-.035-.002-.015],'z');
  rod(B,nd,[cx+.44,cy-.11,wz-.043],[cx+.44,frameBottom+.05,wz-.043],.02,'dark');
  const cooler=B.part('cooling','散热鳍片与冷却风扇','CAMERA COOLING','鳍片底座坐在骨架下板上，风扇靠近左侧通风口。',[-1.6,-.8,-.2]);
  const finY0=frameBottom+.05;B.box(cooler,.36,.03,.36,'titanium',[-1.0,finY0+.015,-.26],0);
  for(let i=0;i<12;i++)B.box(cooler,.015,.62,.36,'titanium',[-1.165+i*.03,finY0+.03+.31,-.26],0);
  B.cylinder(cooler,.06,.03,'dark',[-1.185,-.30,-.26],'x');
  fan=subgroup(cooler,[-1.232,-.30,-.26]);fan.name='cinema-cooling-fan';B.cylinder(fan,.06,.06,'dark',[0,0,0],'x');for(let i=0;i<7;i++){const a=i*TAU/7;const b=B.box(fan,.012,.13,.06,'alloy',[0,.125*Math.cos(a),.125*Math.sin(a)],.004);b.rotation.x=a;b.rotation.y=.35;}
  const rig=B.part('rig','提手、导轨与遮光斗','CAMERA RIG','底座夹座穿过双导轨，导轨前端支架托住遮光斗，顶部提手连到顶盖。',[0,-1.6,0]);
  B.box(rig,2.95,.13,1.65,'dark',[0,-1.05,.28],.03);for(const z of [-.35,.50]){const clamp=B.box(rig,1.90,.22,.18,'dark',[0,-1.20,z],.018,[[-.71,-.04,.0575],[.71,-.04,.0575]]);clamp.name='cinema-rail-clamp';B.bolts(rig,[[-.40,-1.075,z],[.40,-1.075,z]],'y',.027);}
  for(const x of [-.71,.71])B.cylinder(rig,.055,4.2,'titanium',[x,-1.24,.85],'z');for(const z of [-.35,.40])rod(B,rig,[.05,1.20,z],[.05,1.67,z],.06,'dark');rod(B,rig,[.05,1.67,-.35],[.05,1.67,.75],.10,'rubber');
  // 遮光斗：导轨前端夹座、两根立柱、后部圆孔挡板和四块斜面板。
  const mz=2.62,mc=B.box(rig,1.90,.22,.14,'dark',[0,-1.20,mz],.018,[[-.71,-.04,.0575],[.71,-.04,.0575]]);mc.name='cinema-mattebox-clamp';
  const boxBottom=cy-.62;for(const s of [-1,1])rod(B,rig,[cx+s*.50,-1.09,mz],[cx+s*.50,boxBottom-.01,mz],.035,'dark');
  B.box(rig,1.30,.04,.20,'dark',[cx,boxBottom-.02,mz+.03],.008);
  const back=new T.Shape();back.moveTo(-.80,-.62);back.lineTo(.80,-.62);back.lineTo(.80,.62);back.lineTo(-.80,.62);back.closePath();const bh=new T.Path();bh.absarc(0,0,.725,0,TAU,true);back.holes.push(bh);
  B.mesh(rig,new T.ExtrudeGeometry(back,{depth:.02,bevelEnabled:false,curveSegments:48}),'black',[cx,cy,mz-.06]);
  const d=.62,quad=(a,b,c,e)=>{const g=new T.BufferGeometry(),p=[...a,...b,...c,...e];g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex([0,1,2,0,2,3,0,2,1,0,3,2]);g.computeVertexNormals();return g;};
  const R0=[.80,.62],R1=[1.02,.78],z0=mz-.04,z1=mz-.04+d,P=(sx,sy,R,z)=>[cx+sx*R[0],cy+sy*R[1],z];
  for(const [s1,s2]of [[[-1,1],[1,1]],[[1,1],[1,-1]],[[1,-1],[-1,-1]],[[-1,-1],[-1,1]]]){const m=B.mesh(rig,quad(P(...s1,R0,z0),P(...s2,R0,z0),P(...s2,R1,z1),P(...s1,R1,z1)),'black');m.material.side=T.DoubleSide;m.name='cinema-mattebox-panel';}
  for(const [s1,s2]of [[[-1,1],[1,1]],[[1,-1],[-1,-1]]])B.box(rig,2.06,.03,.03,'dark',[cx,cy+s1[1]*R1[1],z1],.005);
  B.box(rig,2.06,.02,.42,'black',[cx,cy+R1[1]+.01,z1+.20],.006);
  const recorder=B.part('recorder','外置存储与线缆','EXTERNAL RECORDING','存储盒通过侧支架固定在机身左侧，线缆接到机身接口。',[-1.9,.4,-.8]);
  B.box(recorder,.23,.96,.66,'dark',[xL-.24,.28,-.10],.045);B.box(recorder,.014,.52,.44,'airframe',[xL-.37,.28,-.10],.01);B.box(recorder,.14,.30,.30,'dark',[xL-.07,.28,-.10],.01);
  B.path(recorder,[[xL-.20,-.18,-.10],[xL-.30,-.40,-.30],[xL-.10,-.55,-.40],[xL+.03,-.55,-.40]],.025,'rubber');
 }

 const dispose=B.disposal;let disposed=false;
 function disposal(after){if(after){after.then(()=>disposal(),()=>disposal());return;}if(disposed)return;disposed=true;dispose();grain.dispose();}
 const inspection={kind,spec:S,zS,throatR,ringR,mountFace:zM,reflex:reflexG,sensorFace};
 return {...B,disposal,inspection,update(a,e){
  offsets(B,e);const pose=cameraExposure(a);
  if(sensorPivot){sensorPivot.position.x=cx+(kind==='mirrorless'?.009*Math.sin(a*.45):0);sensorPivot.position.y=cy+(kind==='mirrorless'?.007*Math.sin(a*.37):0);}
  if(hinge){if(cinema)hinge.rotation.x=.12+.06*Math.sin(a*.18);else hinge.rotation.y=.13*(1+Math.sin(a*.18));}
  focusRing.rotation.z=.20*Math.sin(a*.30);moving.position.z=.045*Math.sin(a*.30);
  if(film){const c=filmCurtains(a);curtains[0].scale.x=Math.max(.02,c.first);curtains[1].scale.x=Math.max(.02,c.second);spools[0].rotation.y=-pose.feed*PI*.9;spools[1].rotation.y=-pose.feed*PI*1.1;sprocket.rotation.y=-pose.feed*PI*1.6;lever.rotation.y=pose.lever*.95;}
  else{const open=reflex?pose.open:(1-Math.cos(a*.70))*.5;blades.forEach((g,i)=>g.position.y=-.28+i*.112+open*(.70-i*.09));}
  if(mirrorPivot)mirrorPivot.rotation.x=-PI/4-pose.mirror*PI/4;
  if(ndWheel){const cycle=a/TAU,n=Math.floor(cycle);ndWheel.rotation.z=(n+T.MathUtils.smoothstep(cycle-n,.72,.92))*PI/2;fan.rotation.x=a*2;}
  leaves.forEach(({g,a:base})=>g.rotation.z=base+.12+.24*Math.sin(a*.25));
 }};
}
