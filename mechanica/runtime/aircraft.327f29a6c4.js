import * as T from '#three';
import {makeBuilder,TAU,bladeGeometry} from '#geometry';
import {subgroup,place,offsets,loft,panel,rod,ellipsoid,wheel,frameRing,fanEngine,propeller} from '#vehicle-kit';
const PI=Math.PI;
// 无倒角方块直接用 BoxGeometry，避免零倒角圆角曲线产生零长度边和零法线。
function cube(B,g,w,h,d,mat,pos=[0,0,0]){return B.mesh(g,new T.BoxGeometry(w,h,d),mat,pos);}
// LatheGeometry 在末端轮廓点给出零或非单位法线，按末段切线补回并统一为单位法线（与 vehicle-kit 的机轮处理一致）。
function latheEndNormals(mesh){
 const normals=mesh.geometry.attributes.normal,points=mesh.geometry.parameters.points,last=points.length-1,a=points[last-1],b=points[last],normal=new T.Vector2(b.y-a.y,a.x-b.x).normalize(),segments=mesh.geometry.parameters.segments;
 for(let i=0;i<=segments;i++){const index=i*points.length+last;if(normals.getX(index)===0&&normals.getY(index)===0&&normals.getZ(index)===0){const phi=i*TAU/segments;normals.setXYZ(index,normal.x*Math.sin(phi),normal.y,normal.x*Math.cos(phi));}}
 const v=new T.Vector3();for(let i=0;i<normals.count;i++){v.fromBufferAttribute(normals,i).normalize();normals.setXYZ(i,v.x,v.y,v.z);}
 return mesh;
}
// 两款战斗机共用外形构造。截面、曲面和内部补全只用于网页观察。
function fighterWingSkin(B,g,stations,z0,z1,u0,u1,sign,mat,origin=new T.Vector3(),cut=true){
 const first=g.children.length;airlinerWingSkin(B,g,stations,z0,z1,u0,u1,sign,mat,origin,cut);for(const mesh of g.children.slice(first))mesh.name=mesh.name==='airliner-wing-skin'?'fighter-wing-skin':'fighter-wing-edge';
}
function fighterProfile(B,g,shape,thickness,mat,pos=[0,0,0]){
 const geo=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:20,steps:1});geo.translate(0,0,-thickness/2);return B.mesh(g,geo,mat,pos);
}
function fighterTail(B,L,span,y,mat,bodyTop){
 const horizontal=B.part('tailplane','水平尾翼','HORIZONTAL TAIL','有厚度的左右尾翼接入尾部，圆滑翼尖与机身相连。',[2.1,.6,0]);
 const stations=[[.08,L*.31,L*.48,y,.105],[span*.55,L*.35,L*.485,y+.015,.075],[span*.87,L*.385,L*.47,y+.03,.045],[span,L*.425,L*.44,y+.035,.012]];
 for(const sign of [-1,1])fighterWingSkin(B,horizontal,stations,.08,span,0,1,sign,mat);
 const fin=B.part('fin','垂直尾翼与方向舵','VERTICAL TAIL','圆滑垂直尾翼接入机身，方向舵沿后缘固定轴转动。',[2.4,1.5,0]),hingeX=L*.445,h=span*.84;
 const shape=new T.Shape();shape.moveTo(L*.30,y-.13);shape.quadraticCurveTo(L*.345,y+.22,L*.365,y+h*.65);shape.quadraticCurveTo(L*.375,y+h,hingeX,y+h);shape.lineTo(hingeX,y-.13);shape.closePath();fighterProfile(B,fin,shape,.085,mat).name='fighter-fixed-fin';
 // 方向舵下缘抬到尾锥顶面以上 .012，前缘离固定垂尾后缘 .0038（小于接触容差 .004），偏转时不切入机身和垂尾。
 const y0=bodyTop+.012,rudder=subgroup(fin,[hingeX,y0,0]);rudder.name='fighter-rudder-hinge';const moving=new T.Shape(),Y=v=>y-.13+v-y0;moving.moveTo(.0038,0);moving.lineTo(.0038,Y(h+.13));moving.quadraticCurveTo(L*.025,Y(h+.13),L*.034,Y(h*.87));moving.quadraticCurveTo(L*.052,Y(h*.35),L*.043,0);moving.closePath();fighterProfile(B,rudder,moving,.078,mat).name='fighter-rudder';
 return {rudder,horizontal,fin};
}
// 机轮：wheel() 的两侧轮毂盖原本只靠螺栓相连，这里补一段轮毂筒接到辐条；固定短轴只顶到轮毂盖外侧并留 .003 间隙，转动时不穿过轮毂。
function aircraftWheel(B,parent,center,r,width,name){
 // wheel() 的轮胎截面在内圈开口，补一圈轮辋筒把胎圈、辐条和轮毂筒连成一体。
 const w=subgroup(parent,center);w.name=name;wheel(B,w,r,width);B.cylinder(w,r*.18,width*1.06,'dark',[0,0,0],'z');B.tube(w,r*.68,r*.62,width,'alloy',[0,0,0],'z');return w;
}
function wheelStub(B,g,center,r,width,side,toZ,mat='steel'){
 // side 为短轴从轮心伸出的方向（±1），toZ 为短轴另一端所在支柱的 z。
 const face=center[2]+side*(width*.53+.03+.003),len=Math.abs(toZ-face);B.cylinder(g,r*.10,len,mat,[center[0],center[1],(face+toZ)/2],'z');
}
// 战斗机主起落架：支柱位于测试固定的翼下连接点，机轮装在支柱内侧短轴上，轮胎与支柱、舱门之间留出间隙。
function fighterGear(B,g,x,y,zStrut,r,width,top,inboard,mat){
 const strutR=.043,zw=zStrut+inboard*(width*.53+.045+strutR);
 rod(B,g,[x,top,zStrut],[x,y-.02,zStrut],strutR);B.cylinder(g,.065,(top-y)*.43,'alloy',[x,y+(top-y)*.66,zStrut]);rod(B,g,[x+.25,top-.03,zStrut],[x,y+(top-y)*.45,zStrut],.022,'chrome');
 wheelStub(B,g,[x,y,zw],r,width,-inboard,zStrut);
 const door=new T.Shape();door.moveTo(-.13,top);door.lineTo(.15,top);door.quadraticCurveTo(.21,(top+y)*.5,.15,y+r*.35);door.lineTo(-.13,y+r*.35);door.closePath();fighterProfile(B,g,door,.025,mat,[x,0,zStrut-inboard*(strutR+.0125+.0005)]);
 return aircraftWheel(B,g,[x,y,zw],r,width,'fighter-wheel');
}
// 尾轮：竖直支柱位于测试固定的尾段连接点，下端分叉夹住机轮，两侧短轴接到轮毂盖外侧。
function tailWheel(B,g,x,y,r,width,top){
 const crown=y+r+.035,fork=width*.53+.05;rod(B,g,[x,top,0],[x,crown,0],.032);cube(B,g,.07,.03,2*fork+.03,'steel',[x,crown,0]);
 for(const side of [-1,1]){rod(B,g,[x,crown,side*fork],[x,y,side*fork],.012,'steel');wheelStub(B,g,[x,y,0],r,width,side,side*fork);}
 return aircraftWheel(B,g,[x,y,0],r,width,'fighter-wheel');
}
// 自建螺旋桨：桨毂收在整流锥内，桨叶与桨尖色带沿用 vehicle-kit 的桨叶截面。
function fighterPropeller(B,g,r,n,hubR){
 B.cylinder(g,hubR,.24,'chrome',[.04,0,0],'x');const blade=bladeGeometry(r*.14,r,r*.22,.55);blade.rotateY(PI/2);
 B.instances(g,blade,'black',Array.from({length:n},(_,i)=>({p:[0,0,0],r:[i*TAU/n,0,0]})));
 for(let i=0;i<n;i++){const a=i*TAU/n;const t=panel(B,g,[[-.06,r*.87],[.04,r*.87],[.03,r],[-.04,r]],.015,'ceramic',[0,0,0],'xy');t.rotation.set(a,PI/2,0);}
}
// 舱内透明件统一材质：低金属度、低粗糙度、浅色调，保证能看到座舱内部。
function clearGlass(mesh,color,opacity){Object.assign(mesh.material,{transparent:true,opacity,depthWrite:false,metalness:.04,roughness:.05});mesh.material.color.setHex(color);if('clearcoat'in mesh.material){mesh.material.clearcoat=1;mesh.material.clearcoatRoughness=.04;}return mesh;}
// 贴在曲面上的标识层，用多边形偏移避免与蒙皮闪烁。
function decal(mesh,k=1){Object.assign(mesh.material,{polygonOffset:true,polygonOffsetFactor:-k,polygonOffsetUnits:-k});return mesh;}
// 活动翼面铰链支座：放在展向缝隙中央，前端接固定翼面后梁，后端包住铰链轴；缝隙两侧各留 .003，活动翼面偏转时不碰支座。
function hingeBracket(B,g,stations,z,sign,uFix,uHinge,mat='alloy',dz=.010){
 const [,le,te,,th]=airlinerWingSection(stations,z),a=airlinerWingPoint(stations,z,uFix-.02,0,sign),b=airlinerWingPoint(stations,z,uHinge+.025,0,sign),h=airlinerWingPoint(stations,z,uHinge,0,sign),bulge=2.6*Math.sqrt(uHinge)*(1-uHinge);
 return cube(B,g,b.x-a.x,th*bulge*.45,dz,mat,[(a.x+b.x)/2,h.y,sign*z]);
}
export function buildFighter(materials,radial=false){
 const B=makeBuilder(materials),L=radial?11.0:9.83,span=radial?12.42:11.28,cy=1.65,R=radial?.83:.52,mat=radial?'olive':'airframe';
 const sections=radial?[[-L*.24,.80,.74,cy],[-2.0,.82,.74,cy],[-1.2,.79,.69,cy],[-.4,.73,.63,cy],[.6,.64,.54,cy],[1.5,.53,.43,cy+.02],[2.6,.38,.29,cy+.04],[3.6,.25,.18,cy+.08],[4.5,.13,.09,cy+.12],[L*.49,.035,.03,cy+.15]]:[[-L*.24,.54,.51,cy],[-1.8,.56,.52,cy],[-1.1,.54,.48,cy],[-.4,.50,.43,cy],[.5,.45,.37,cy],[1.5,.37,.29,cy+.025],[2.6,.27,.19,cy+.065],[3.6,.17,.11,cy+.10],[4.4,.08,.055,cy+.13],[L*.49,.025,.024,cy+.15]];
 const glassXs=radial?[-1.14,-.96,-.70,-.2,.32,.64,.85]:[-1.16,-1.02,-.72,-.28,.20,.58,.86];
 const widths=radial?[.035,.32,.46,.46,.43,.32,.035]:[.025,.25,.36,.375,.34,.23,.025],heights=radial?[.025,.25,.56,.59,.55,.36,.025]:[.025,.26,.48,.55,.49,.31,.025];
 const canopySections=glassXs.map((x,i)=>{const s=sectionAt(sections,x),a=Math.asin(Math.min(.97,widths[i]/s[2]));return [x,heights[i],widths[i],s[3]+s[1]*Math.cos(a)];});
 const fuselage=B.part('fuselage','机身蒙皮','FUSELAGE','连续截面形成机身，座舱开口内不保留遮挡座椅的实心顶盖。',[0,1.5,-1.8]);loft(B,fuselage,sections,mat,PI/2,PI);
 const roof=new T.Shape();roof.moveTo(sections[0][0],-PI/2);roof.lineTo(sections.at(-1)[0],-PI/2);roof.lineTo(sections.at(-1)[0],PI/2);roof.lineTo(sections[0][0],PI/2);roof.closePath();const opening=new T.Path();
 for(const sign of [1,-1]){const xs=sign>0?glassXs:[...glassXs].reverse();for(const x of xs){const i=glassXs.indexOf(x),s=sectionAt(sections,x),a=sign*Math.asin(widths[i]/s[2]);if(sign>0&&i===0)opening.moveTo(x,a);else opening.lineTo(x,a);}}opening.closePath();roof.holes.push(opening);
 const roofMesh=airlinerBand(B,fuselage,roof,sections,1,mat,.014);roofMesh.name='fighter-cockpit-opening';B.cut(roofMesh);
 const frame=B.part('frame','机身框架与隔框','AIRFRAME','座舱开口前后布置隔框，纵向构件连接前后各段。',[0,-1,-1.4]);for(const x of [-2.12,-1.28,1.10,2.5,3.65]){const [_,ry,rz,y]=sectionAt(sections,x);frameRing(B,frame,x,ry*.94,rz*.94,y);}
 for(const sign of [-1,1])B.path(frame,sections.map(([x,ry,rz,y])=>[x,y-ry*.40,sign*rz*.83]),.018,'alloy');
 const cockpit=B.part('cockpit','飞行员座舱','COCKPIT','座椅、仪表板、操纵杆与脚蹬布置在座舱开口下方。',[0,1.8,1.4]);B.box(cockpit,.66,.09,.54,'dark',[-.05,1.87,0],.04);B.box(cockpit,.12,.59,.48,'black',[.32,2.04,0],.04);B.box(cockpit,.09,.31,.59,'dark',[-.77,2.12,0],.02);rod(B,cockpit,[-.35,1.88,0],[-.42,2.17,0],.018,'black');
 {const a=PI/2+PI*4/48;for(const sign of [-1,1])for(const [k,from]of [[3,[-.30,1.835,sign*.22]],[2,[-.77,1.99,sign*.25]]]){const [x,ry,rz,y]=sections[k];rod(B,cockpit,from,[x,y+ry*Math.cos(a),sign*rz*Math.sin(a)],.016,'alloy');}}
 for(const sign of [-1,1]){rod(B,cockpit,[-.63,1.87,sign*.15],[-.78,1.94,sign*.15],.013,'chrome');B.box(cockpit,.14,.025,.10,'dark',[-.78,1.95,sign*.15],.01);}for(let row=0;row<2;row++)for(let j=0;j<5;j++){const dial=B.cylinder(cockpit,.037,.012,'black',[-.716,2.06+row*.105,(j-2)*.105],'x',.037,20);B.cylinder(cockpit,.030,.014,'glass',dial.position.toArray(),'x',.030,20);}
 const canopy=B.part('canopy',radial?'脊背式座舱盖':'水滴形座舱盖','CANOPY','风挡、透明座舱和边框沿机身开口相接。',[0,2.5,0]);
 const pane=clearGlass(loft(B,canopy,canopySections,'glass',-PI/2,PI),0xa7c3cb,.24);pane.name='fighter-canopy-pane';B.cut(pane);
 for(const sign of [-1,1]){const rim=B.path(canopy,canopySections.map(([x,ry,rz,y])=>[x,y,sign*rz]),.015,mat);rim.name='fighter-canopy-rim';B.cut(rim);}
 for(const i of radial?[1,4]:[1]){const [x,ry,rz,y]=canopySections[i],points=Array.from({length:25},(_,j)=>{const a=-PI/2+j*PI/24;return [x,y+ry*Math.cos(a),rz*Math.sin(a)];});B.cut(B.path(canopy,points,.014,mat));}
 if(radial){const back=[[.60,.34,.32,2.16],[1.1,.31,.29,2.14],[1.8,.26,.23,2.06],[2.5,.15,.16,2.00],[3.3,.025,.07,1.95]];B.cut(loft(B,canopy,back,mat,-PI/2,PI)).name='fighter-dorsal-spine';}
 const engine=B.part('engine',radial?'双排星形发动机':'液冷V形发动机','PISTON ENGINE','发动机通过前部传动轴带动螺旋桨，外形与部件布局用于结构展示。',[-1.5,1.4,1.3]);// 螺旋桨轴只露出在减速器前端与桨毂之间：液冷机从减速器壳的轴孔伸出（径向间隙 .003），星形机从前减速器端面伸出（端面间隙 .003）。
 const propX=radial?-L*.495:-4.80,shaftRear=radial?-L*.455-.18-.003:-4.20,shaftFront=propX+(radial?.145:.10),crank=subgroup(engine,[(shaftRear+shaftFront)/2,cy,0]);crank.name='fighter-crank';B.cylinder(crank,.10,shaftRear-shaftFront,'chrome',[0,0,0],'x');
 if(radial){B.cylinder(engine,.29,.95,'cast',[-L*.404,cy,0],'x');B.cylinder(engine,.22,.36,'cast',[-L*.455,cy,0],'x',.34);
  // 发动机架：曲轴箱后端六根撑杆接到防火墙处机身截面的实际顶点。
  {const [x,ry,rz,y]=sections[0];for(let k=0;k<6;k++){const a=PI/6+k*PI/3;rod(B,engine,[-L*.404+.47,cy+.22*Math.cos(a),.22*Math.sin(a)],[x,y+ry*Math.cos(a),rz*Math.sin(a)],.028,'steel');}}for(let row=0;row<2;row++)for(let i=0;i<9;i++){const a=(i+row*.5)*TAU/9,x=-L*.425+row*.42;const c=B.cylinder(engine,.13,.47,'steel',[x,cy+.44*Math.cos(a),.44*Math.sin(a)]);c.rotation.x=a;for(let f=0;f<5;f++){const ring=B.tube(engine,.15,.12,.015,'dark',[x,cy+(.29+f*.06)*Math.cos(a),(.29+f*.06)*Math.sin(a)],'y');ring.rotation.x=a;}rod(B,engine,[x,cy+.28*Math.cos(a),.28*Math.sin(a)],[x,cy+.65*Math.cos(a),.65*Math.sin(a)],.025,'chrome');}}
 else{const block=B.box(engine,1.8,.40,.72,'cast',[-L*.32,cy,0]),front=new T.Box3().setFromObject(block).min.x;B.tube(engine,.19,.103,.25,'cast',[front-.095,cy,0],'x');for(const s of [-1,1]){B.box(engine,1.9,.19,.20,'dark',[-L*.32,cy+.25,s*.22]);for(let i=0;i<6;i++){const x=-L*.40+i*.31;B.cylinder(engine,.095,.35,'alloy',[x,cy+.15,s*.22]);B.path(engine,[[x,cy+.2,s*.3],[x,cy-.03,s*.54],[x+.18,cy-.12,s*.58]],.04,'hotmetal');}}}
 const cowl=B.part('cowl','发动机整流罩','ENGINE COWLING','圆滑整流罩包围动力舱，剖切后可见发动机。',[-2,1.7,-1]);
 const cowlSec=radial?[[-L*.454,.71,.72,cy],[-L*.44,.80,.79,cy],[-L*.39,.85,.81,cy],[-L*.31,.84,.79,cy],sections[0]]:[[-L*.45,.38,.39,cy],[-L*.425,.50,.46,cy],[-L*.38,.57,.50,cy],[-L*.31,.57,.52,cy],sections[0]];loft(B,cowl,cowlSec,mat,PI/2,PI);B.cut(loft(B,cowl,cowlSec,mat,-PI/2,PI));
 if(radial)B.tube(cowl,.715,.62,.035,'dark',[-L*.454,cy,0],'x');
 const prop=B.part('prop','四叶螺旋桨与桨毂','PROPELLER','螺旋桨与发动机输出轴共轴旋转。',[-2.5,0,0]);place(B,'prop',[propX,cy,0]);
 // 桨径：P-51D 为 Hamilton Standard 24D50 的 11 ft 2 in，P-47D 早期 Curtiss Electric 为 12 ft 2 in。
 fighterPropeller(B,prop,radial?1.854:1.702,4,radial?.30:.14);
 if(!radial){const spinner=B.lathe(prop,[[0,-.204],[.08,-.19],[.20,-.10],[.33,.10],[.385,.374]],'scarlet',[0,0,0],'x');spinner.name='fighter-spinner';latheEndNormals(spinner);}else B.cylinder(prop,.18,.19,'chrome',[-.11,0,0],'x',.06);
 // 最大厚度按相对厚度乘弦长：P-51D 根部 15.1%、翼尖 11.4%，P-47D Seversky S-3 根部 12%、翼尖 5%，中间线性过渡。
 const thick=(z,c)=>c*(radial?.12+(.05-.12)*(z-.23)/(span/2-.23):.151+(.114-.151)*(z-.23)/(span/2-.23));
 const stations=(radial?[[.23,-2.0,1.0,1.25],[.8,-1.86,.99,1.28],[2.8,-1.44,.93,1.42],[5.4,-.77,.66,1.62],[5.98,-.46,.40,1.67],[span/2,-.08,.04,1.69,.018]]:[[.23,-1.90,.72,1.25],[.70,-1.78,.71,1.28],[2.20,-1.50,.65,1.38],[4.70,-.85,.53,1.58],[5.15,-.58,.29,1.65],[span/2,-.14,-.04,1.67,.016]]).map(s=>s.length===5?s:[...s,thick(s[0],s[2]-s[1])]);
 for(const sign of [-1,1]){const g=B.part(sign<0?'wingL':'wingR',sign<0?'左主翼':'右主翼','WING ASSEMBLY','圆滑前缘、厚翼面与向上微抬的圆翼尖连接翼梁和翼肋。',[.4,.4,sign*2.7]);fighterWingSkin(B,g,stations,.23,span/2,0,.76,sign,mat);for(const [a,b]of [[.23,.80],[span/2-.23,span/2]])fighterWingSkin(B,g,stations,a,b,.76,1,sign,mat);
  for(let z=.45;z<span/2-.20;z+=.42){const [,le,te,y,th]=airlinerWingSection(stations,z);cube(B,g,(te-le)*.52,th*.32,.018,'alloy',[(le+te)/2,y,sign*z]);}for(const u of [.30,.62]){const points=stations.map(([z])=>airlinerWingPoint(stations,z,u,0,sign).toArray());B.path(g,points,.018,'alloy');}}
 const flaps=B.part('flaps','副翼与襟翼','CONTROL SURFACES','活动翼面的前缘沿实际连接轴小角度偏转。',[0,1.4,2]),controls=[],part=sign=>B.parts.find(p=>p.id===(sign<0?'wingL':'wingR')).group;
 for(const sign of [-1,1])for(const z of [.80,...stations.map(s=>s[0]).filter(z=>z>.80&&z<span/2-.23),span/2-.23])hingeBracket(B,part(sign),stations,z,sign,.76,.77);
 for(const sign of [-1,1])for(let j=0;j<stations.length-1;j++){const z0=Math.max(.80,stations[j][0])+.008,z1=Math.min(span/2-.23,stations[j+1][0])-.008;if(z1<=z0)continue;const p0=airlinerWingPoint(stations,z0,.77,0,sign),p1=airlinerWingPoint(stations,z1,.77,0,sign),axis=p1.clone().sub(p0).normalize(),g=subgroup(flaps,p0.toArray());g.name='fighter-control-hinge';g.userData.hingeAxis=axis.toArray();fighterWingSkin(B,g,stations,z0,z1,.77,1,sign,mat,p0);controls.push({g,axis,sign});}
 const hingeTop=Math.max(...[0,.25,.5,.75,1].map(t=>{const s=sectionAt(sections,L*(.445+.05*t));return s[3]+s[1];})),emp=fighterTail(B,L,radial?2.05:1.9,cy+.13,mat,hingeTop);
 const landing=B.part('landing','起落架与机轮','LANDING GEAR','主起落架支柱接入主翼，尾轮支柱接入机身尾段。',[0,-1.5,1.4]),wheels=[];
 // 机轮离地：水平姿态（起飞滑跑抬尾姿态）下桨尖离地 .20，主轮 P-51D 为 27 in 光面轮。
 const groundY=cy-(radial?1.854:1.702)-.20,mainR=radial?.30:.343,mainW=radial?.21:.20;
 for(const sign of [-1,1]){const top=airlinerWingSection(stations,1.7)[3];wheels.push(fighterGear(B,landing,-.85,groundY+mainR,sign*1.7,mainR,mainW,top+.015,-sign,mat));}wheels.push(tailWheel(B,landing,L*.41,1.33,.17,.12,cy+.10));
 const fuel=B.part('fuel','翼内油箱与供油管路','FUEL SYSTEM','油箱沿主翼截面收在上下蒙皮内，管路接向动力舱。',[0,-1.2,-2]);for(const sign of [-1,1]){const first=fuel.children.length;fighterWingSkin(B,fuel,stations.map(s=>s.map((v,i)=>i===4?v*.48:v)),.72,1.40,.34,.65,sign,'bronze',new T.Vector3(),false);for(const mesh of fuel.children.slice(first))mesh.userData.tank=true;B.path(fuel,[[-.3,1.19,sign*1.02],[-1,1.45,sign*.5],[-2.5,1.4,sign*.3]],.018,'copper');}
 const cooling=B.part('cooling',radial?'机腹增压与散热通道':'机腹散热器','COOLING SYSTEM','机腹曲面通道包围散热表面，前方保留可见进气口。',[1,-1.2,0]);const coolSec=radial?[[-.90,.16,.29,.93],[-.68,.23,.34,.94],[.8,.21,.30,1.0],[1.8,.10,.17,1.21],[2.0,.025,.09,1.30]]:[[-.67,.15,.26,.98],[-.42,.22,.32,.98],[.55,.21,.30,1.02],[1.18,.13,.22,1.15],[1.45,.025,.11,1.28]];loft(B,cooling,coolSec,mat);
 // 散热片高 .16，两侧角点贴到通道内壁，不再悬空。
 for(let i=0;i<14;i++){const x=-.43+i*.065,s=sectionAt(coolSec,x),half=s[2]*Math.sqrt(1-(.08/s[1])**2)-.0015;cube(B,cooling,.018,.16,2*half,'dark',[x,s[3],0]);}
 const details=B.part('details','接缝、舱口与识别涂装','AIRFRAME DETAILS','接缝随蒙皮曲面排列，外部涂装与表面分区表现装配关系。',[0,1.6,-2.2]);
 for(const x of [1.1,1.9,2.65,3.3]){const s=sectionAt(sections,x),skin=loft(B,details,[[x-.004,s[1]+.004,s[2]+.004,s[3]],[x+.004,s[1]+.004,s[2]+.004,s[3]]],'dark');B.cut(skin);}
 for(const sign of [-1,1]){const x=1.55,s=sectionAt(sections,x),a=sign*PI/2,star=[];for(let i=0;i<10;i++){const t=-PI/2+i*PI/5,r=i%2?.12:.29;star.push([x+r*Math.cos(t),a+sign*r*Math.sin(t)/s[2]]);}const circle=Array.from({length:48},(_,i)=>{const t=i*TAU/48;return [x+.32*Math.cos(t),a+sign*.32*Math.sin(t)/s[2]];});B.cut(decal(airlinerPatch(B,details,circle,sections,'navy',.003),1));B.cut(decal(airlinerPatch(B,details,[[x-.57,a-.10],[x+.57,a-.10],[x+.57,a+.10],[x-.57,a+.10]],sections,'ceramic',.006),2));B.cut(decal(airlinerPatch(B,details,star,sections,'ceramic',.009),3));}
 if(!radial)for(const sign of [-1,1]){const anti=new T.Shape();anti.moveTo(cowlSec[0][0],-.60);anti.lineTo(-1.22,-.60);anti.lineTo(-1.22,.60);anti.lineTo(cowlSec[0][0],.60);anti.closePath();B.cut(airlinerBand(B,details,anti,[...cowlSec,...sections.slice(1)].map(([x,ry,rz,y])=>[x,ry+.007,rz+.007,y]),1,'olive',.003));for(let i=0;i<6;i++){const x=-3.91+i*.29,s=sectionAt(cowlSec,x),z=sign*(s[2]+.015);rod(B,details,[x,cy+.04,z],[x+.13,cy-.02,z+sign*.07],.036,'hotmetal');}}
 const rivets=[];for(const x of [1.1,1.9,2.65,3.3]){const s=sectionAt(sections,x);for(let i=0;i<28;i++){const a=i*TAU/28;const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(0,Math.cos(a)/s[1],Math.sin(a)/s[2]).normalize()),r=new T.Euler().setFromQuaternion(q);rivets.push({p:[x+.025,s[3]+(s[1]+.004)*Math.cos(a),(s[2]+.004)*Math.sin(a)],r:[r.x,r.y,r.z]});}}B.instances(details,new T.CylinderGeometry(.008,.008,.006,8),'dark',rivets);
 return {...B,update(a,e){offsets(B,e);prop.rotation.x=crank.rotation.x=a*2.4;controls.forEach(({g,axis,sign})=>g.quaternion.setFromAxisAngle(axis,.10*Math.sin(a*.4)*sign));emp.rudder.rotation.y=.08*Math.sin(a*.33);wheels.forEach(g=>g.rotation.z=-a*.35);}};
}

// 客机外形共用入口，截面与内部尺寸为网页造型，不能作为制造或气动数据。
function roundedPath(Type,x,y,w,h,r){
 const p=new Type(),l=x-w/2,b=y-h/2;r=Math.min(r,w/2,h/2);
 p.moveTo(l+r,b);p.lineTo(l+w-r,b);p.quadraticCurveTo(l+w,b,l+w,b+r);p.lineTo(l+w,b+h-r);p.quadraticCurveTo(l+w,b+h,l+w-r,b+h);p.lineTo(l+r,b+h);p.quadraticCurveTo(l,b+h,l,b+h-r);p.lineTo(l,b+r);p.quadraticCurveTo(l,b,l+r,b);p.closePath();return p;
}
function sectionAt(sections,x){
 let i=0;while(i<sections.length-2&&x>sections[i+1][0])i++;
 const a=sections[i],b=sections[i+1],t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));return a.map((v,j)=>j?v+(b[j]-v)*t:x);
}
function airlinerSurfaceTriangles(geometry,maxX,maxY){
 // 曲面上的玻璃和门框先细分再弯曲，避免大三角形的弦面沉入蒙皮。
 const names=Object.keys(geometry.attributes),attrs=names.map(k=>geometry.attributes[k]),out=attrs.map(()=>[]),index=geometry.index,count=index?index.count:attrs[0].count;
 const vertex=i=>attrs.map(a=>Array.from({length:a.itemSize},(_,j)=>a.array[i*a.itemSize+j]));
 for(let i=0;i<count;i+=3){const pending=[[0,1,2].map(j=>vertex(index?index.getX(i+j):i+j))];while(pending.length){const tri=pending.pop();let edge=-1,size=1;for(let j=0;j<3;j++){const a=tri[j][0],b=tri[(j+1)%3][0],d=Math.max(Math.abs(a[0]-b[0])/maxX,Math.abs(a[1]-b[1])/maxY);if(d>size){size=d;edge=j;}}if(edge<0){for(const v of tri)v.forEach((a,j)=>out[j].push(...a));continue;}const a=tri[edge],b=tri[(edge+1)%3],c=tri[(edge+2)%3],mid=a.map((v,j)=>v.map((n,k)=>(n+b[j][k])*.5));pending.push([a,mid,c],[mid,b,c]);}}
 const result=new T.BufferGeometry();names.forEach((name,i)=>result.setAttribute(name,new T.Float32BufferAttribute(out[i],attrs[i].itemSize)));geometry.dispose();return result;
}
function airlinerBand(B,g,shape,sections,r,mat,depth=.012){
 // x与圆周弧长定义窗孔，弯曲时保留孔壁。这里的薄层不是在实心蒙皮上贴黑色方块。
 const raw=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:8,steps:1}),straight=sections.every(s=>s.slice(1).every((v,j)=>v===sections[0][j+1])),geo=airlinerSurfaceTriangles(raw,straight?Infinity:.08,.04),p=geo.attributes.position,n=geo.attributes.normal,v=new T.Vector3(),normalMatrix=new T.Matrix3();
 for(let i=0;i<p.count;i++){
  // 截面可带第五项：下半椭圆的竖向半轴，用于机腹上翘的客机尾段与机头。
  const x=p.getX(i),a=p.getY(i)/r,z=p.getZ(i),s=sectionAt(sections,x),R=Math.cos(a)<0&&s.length>4?4:1,ry=s[R]-z,rz=s[2]-z;
  p.setXYZ(i,x,s[3]+ry*Math.cos(a),rz*Math.sin(a));
  // 同时处理直段窗孔与收缩尾段门框，法线使用映射雅可比的逆转置。
  let j=0;while(j<sections.length-2&&x>sections[j+1][0])j++;const lo=sections[j],hi=sections[j+1],dx=hi[0]-lo[0],dry=(hi[R]-lo[R])/dx,drz=(hi[2]-lo[2])/dx,dcy=(hi[3]-lo[3])/dx;
  normalMatrix.set(1,0,0,dcy+dry*Math.cos(a),-ry/r*Math.sin(a),-Math.cos(a),drz*Math.sin(a),rz/r*Math.cos(a),-Math.sin(a)).invert().transpose();
  v.fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();n.setXYZ(i,v.x,v.y,v.z);
 }
 const mesh=B.mesh(g,geo,mat);return mesh;
}
function airlinerPatch(B,g,points,sections,mat,offset=.008){
 const shape=new T.Shape(points.map(p=>new T.Vector2(...p))),geo=airlinerSurfaceTriangles(new T.ShapeGeometry(shape,16),.08,.07),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),a=p.getY(i),s=sectionAt(sections,x),ry=Math.cos(a)<0&&s.length>4?s[4]:s[1];p.setXYZ(i,x,s[3]+(ry+offset)*Math.cos(a),(s[2]+offset)*Math.sin(a));}
 geo.computeVertexNormals();const mesh=B.mesh(g,geo,mat);mesh.material.side=T.DoubleSide;return mesh;
}
function airlinerWingSection(stations,z){
 let i=0;while(i<stations.length-2&&z>stations[i+1][0])i++;
 const a=stations[i],b=stations[i+1],t=(z-a[0])/(b[0]-a[0]);return a.map((v,j)=>j?v+(b[j]-v)*t:z);
}
function airlinerWingPoint(stations,z,u,side,sign){
 const [,le,te,y,thickness]=airlinerWingSection(stations,z),bulge=2.6*Math.sqrt(u)*(1-u);
 return new T.Vector3(le+(te-le)*u,y+.018*(te-le)*Math.sin(PI*u)+side*thickness*.5*bulge,sign*z);
}
function airlinerWingSkin(B,g,stations,z0,z1,u0,u1,sign,mat,origin=new T.Vector3(),cut=true){
 const nz=Math.max(2,Math.ceil((z1-z0)/.18)),nu=24,edges=[];
 for(const side of [-1,1]){
  const pos=[],uv=[],indices=[];
  for(let i=0;i<=nz;i++)for(let j=0;j<=nu;j++){const u=u0+(u1-u0)*j/nu,z=z0+(z1-z0)*i/nz,v=airlinerWingPoint(stations,z,u,side,sign).sub(origin);pos.push(...v.toArray());uv.push(u,z/stations.at(-1)[0]);}
  for(let i=0;i<nz;i++)for(let j=0;j<nu;j++){const a=i*(nu+1)+j,b=a+1,c=a+nu+1,d=c+1;if(side*sign>0)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=B.mesh(g,geo,mat);mesh.name='airliner-wing-skin';if(side>0&&cut)B.cut(mesh);
 }
 // 实际封边连接上下表面，剖切时仍能看到厚度和翼肋。
 const add=(a,b,c)=>{const cross=b.clone().sub(a).cross(c.clone().sub(a));if(cross.lengthSq()>1e-20)edges.push(...a.clone().sub(origin).toArray(),...b.clone().sub(origin).toArray(),...c.clone().sub(origin).toArray());};
 const rim=(az,au,bz,bu,flip)=>{const a=airlinerWingPoint(stations,az,au,1,sign),b=airlinerWingPoint(stations,bz,bu,1,sign),c=airlinerWingPoint(stations,az,au,-1,sign),d=airlinerWingPoint(stations,bz,bu,-1,sign);flip?(add(a,c,b),add(b,c,d)):(add(a,b,c),add(b,d,c));};
 for(let j=0;j<nu;j++){const a=u0+(u1-u0)*j/nu,b=u0+(u1-u0)*(j+1)/nu;rim(z0,a,z0,b,sign<0);rim(z1,a,z1,b,sign>0);}
 for(let i=0;i<nz;i++){const a=z0+(z1-z0)*i/nz,b=z0+(z1-z0)*(i+1)/nz;rim(a,u0,b,u0,sign>0);rim(a,u1,b,u1,sign<0);}
 const edgeGeo=new T.BufferGeometry();edgeGeo.setAttribute('position',new T.Float32BufferAttribute(edges,3));edgeGeo.computeVertexNormals();B.mesh(g,edgeGeo,mat);
}
// 翼下涡扇：短舱、风扇、核心机与喷管。vehicle-kit 的桨叶带固定 .12 后掠偏移，这里按缩小后的短舱取叶尖半径 .76r，
// 叶尖连同偏移离短舱内壁约 .015；出口导流叶片把核心机连到短舱，风扇轴端离核心机前端 .003。
function turbofan(B,g,r,length){
 const outer=B.tube(g,r,r*.89,length,'airframe',[0,0,0],'x',PI/2,PI);B.cut(B.tube(g,r,r*.89,length,'airframe',[0,0,0],'x',-PI/2,PI));
 B.torus(g,r*.94,r*.07,'chrome',[-length*.5,0,0],'x');B.cylinder(g,r*.36,length*.70,'steel',[length*.05,0,0],'x');B.tube(g,r*.75,r*.62,length*.45,'hotmetal',[length*.45,0,0],'x');
 const span=r*(.89-.36)+.004;B.instances(g,new T.BoxGeometry(.02,span,.010),'bronze',Array.from({length:16},(_,i)=>{const a=i*TAU/16,m=r*(.89+.36)/2;return {p:[-length*.22,m*Math.cos(a),m*Math.sin(a)],r:[a,0,0]};}));
 for(let k=0;k<4;k++){const a=PI/4+k*PI/2;rod(B,g,[length*.30,r*.34*Math.cos(a),r*.34*Math.sin(a)],[length*.30,r*.895*Math.cos(a),r*.895*Math.sin(a)],.010,'bronze');}
 const rotor=subgroup(g,[-length*.45,0,0]),blade=bladeGeometry(r*.2,r*.76,r*.25,.7);blade.rotateY(PI/2);
 B.instances(rotor,blade,'titanium',Array.from({length:20},(_,i)=>({p:[0,0,0],r:[i*TAU/20,0,0]})));B.cylinder(rotor,r*.21,r*.30,'steel',[0,0,0],'x');B.cylinder(rotor,r*.20,r*.5,'dark',[-r*.40,0,0],'x',r*.03);
 const shaftEnd=length*.15-.003;B.cylinder(rotor,r*.08,shaftEnd-r*.12,'chrome',[(shaftEnd+r*.12)/2,0,0],'x');
 return {rotor,outer};
}
// 窄轮距前起落架用的紧凑机轮：扁环胎面、轮辋和轮毂筒同轴相接，轮毂端面在 ±width/2。
function compactWheel(B,parent,center,r,width,name){
 const w=subgroup(parent,center);w.name=name;const tire=B.torus(w,r*.8,r*.2,'rubber');tire.scale.z=width*.5/(r*.2);
 B.tube(w,r*.64,r*.22,width*.8,'alloy',[0,0,0],'z');B.cylinder(w,r*.24,width,'dark',[0,0,0],'z');return w;
}
// 客机双轮起落架：支柱落在两轮之间，短轴从支柱伸到各自轮毂外侧并留 .003 间隙，机轮转动时不碰支柱。
function twinGear(B,g,{x,z,y,r,w,spacing,topX=x,topY,compact=false,strutR,sleeveR}){
 const make=compact?compactWheel:aircraftWheel,half=compact?w*.5:w*.53+.03,at=t=>[x+(topX-x)*t,y+(topY-y)*t,z];
 rod(B,g,at(1),at(0),strutR,'chrome');rod(B,g,at(1),at((r+.04)/(topY-y)),sleeveR,'alloy');
 const wheels=[-1,1].map(side=>{const zw=z+side*spacing,face=zw-side*(half+.003);B.cylinder(g,r*.10,Math.abs(face-z),'steel',[x,y,(face+z)/2],'z');return make(B,g,[x,y,zw],r,w,'airliner-wheel');});
 return {wheels,at};
}
export function buildAirliner(materials,classic=false){
 const B=makeBuilder(materials),cy=1.9,mat=classic?'airframe':'porcelain',color=classic?'scarlet':'navy';
 // 机身外形行 [x, 顶高, 底高, 半宽, 中心高]。A320 按 Airbus AC 侧视与俯视图描点（机长 37.57 m 对应 12 个模型单位）；
 // DC-6 中段取道格拉斯尺寸页机身宽 10'5"、高 11'6"，机头与尾锥轮廓为网页造型补全。尾锥中心线随机腹上翘抬高。
 const tail=(end,rows)=>rows.map(([x,t,b,h])=>[x,t,b,h,cy+(x-3.1)/2.9*(end-cy)]);
 const rows=classic?[
  [-6,1.718,1.682,.018],[-5.95,1.86,1.56,.17],[-5.85,1.98,1.46,.29],[-5.7,2.10,1.38,.39],[-5.5,2.24,1.31,.47],[-5.25,2.38,1.26,.54],[-5,2.48,1.235,.585],[-4.7,2.55,1.22,.61],[-4.35,2.58,1.214,.621],[-4,2.586,1.214,.621],
  [1.2,2.586,1.214,.621,cy],[2,2.586,1.25,.621,cy],[2.6,2.586,1.31,.621,cy],[3.1,2.586,1.38,.621,cy],
  ...tail(2.22,[[3.6,2.58,1.48,.57],[4.1,2.56,1.60,.50],[4.6,2.52,1.73,.42],[5.1,2.46,1.87,.33],[5.5,2.40,1.98,.24],[5.8,2.34,2.07,.15],[5.95,2.30,2.13,.08],[6,2.238,2.202,.018]])
 ]:[
  [-6,1.683,1.647,.018],[-5.943,1.782,1.547,.15],[-5.828,1.871,1.459,.23],[-5.714,1.944,1.415,.28],[-5.599,1.995,1.37,.34],[-5.484,2.075,1.341,.38],[-5.37,2.18,1.312,.42],[-5.255,2.28,1.282,.455],[-5.141,2.345,1.267,.50],[-4.854,2.459,1.253,.572],[-4.568,2.518,1.24,.607],[-4.282,2.55,1.238,.625],[-4,2.562,1.238,.631],
  [1.9,2.562,1.238,.631,cy],[2.3,2.562,1.27,.631,cy],[2.6,2.562,1.326,.631,cy],[2.88,2.562,1.37,.631,cy],[3.1,2.562,1.42,.631,cy],
  ...tail(2.28,[[3.45,2.562,1.503,.60],[3.74,2.562,1.562,.53],[4.02,2.562,1.635,.47],[4.31,2.56,1.694,.42],[4.6,2.555,1.782,.37],[4.88,2.545,1.856,.31],[5.17,2.525,1.944,.25],[5.46,2.49,2.032,.19],[5.74,2.415,2.106,.13],[5.86,2.385,2.15,.09],[5.94,2.371,2.194,.06],[6,2.298,2.262,.018]])
 ];
 // 截面 [x, 上半竖向半轴, 横向半轴, 中心高, 下半竖向半轴]，上下两半在最宽处相接。
 const sections=rows.map(([x,t,b,h,c=(t+b)/2])=>[x,t-c,h,c,c-b]),[,ry,rz]=sections.find(s=>s[0]===-4),r=(ry+rz)/2;
 const grow=(list,d)=>list.map(s=>s.map((v,j)=>j===0||j===3?v:v+d)),hullTop=x=>{const s=sectionAt(sections,x);return s[3]+s[1];},hullBottom=x=>{const s=sectionAt(sections,x);return s[3]-s[4];};
 const halfAt=(x,y)=>{const s=sectionAt(sections,x),b=y<s[3]?s[4]:s[1];return s[2]*Math.sqrt(Math.max(0,1-((y-s[3])/b)**2));};
 const hull=B.part('hull','机身蒙皮与舷窗','FUSELAGE','圆滑机头、上翘尾锥与带窗孔的机身蒙皮相接，剖切时移开上部蒙皮。',[0,2,-2]);
 loft(B,hull,sections.map(([x,,z,c,b])=>[x,b,z,c]),mat,PI/2,PI);
 B.cut(loft(B,hull,sections.filter(s=>s[0]<=-4).map(s=>s.slice(0,4)),mat,-PI/2,PI));B.cut(loft(B,hull,sections.filter(s=>s[0]>=3.1).map(s=>s.slice(0,4)),mat,-PI/2,PI));
 // 窗中线保持原模型高度（中心线以上 r·cos1.24），窗带角度按椭圆截面换算。
 const middle=[[-4,ry,rz,cy],[3.1,ry,rz,cy]],windowXs=Array.from({length:classic?20:29},(_,i)=>-3.85+i*(classic?.34:.24)),winY=cy+(classic?.54:.63)*Math.cos(1.24),windowAngle=Math.acos((winY-cy)/ry),b0=windowAngle-.26,b1=Math.min(windowAngle+.22,1.53),windowWidth=classic?.155:.12,windowHeight=classic?.145:.17;
 B.cut(loft(B,hull,middle,mat,-b0,2*b0));
 for(const sign of [-1,1]){
  B.cut(loft(B,hull,middle,mat,sign>0?b1:-PI/2,PI/2-b1));
  const shape=new T.Shape();shape.moveTo(-4,r*b0*sign);shape.lineTo(3.1,r*b0*sign);shape.lineTo(3.1,r*b1*sign);shape.lineTo(-4,r*b1*sign);shape.closePath();
  for(const x of windowXs)shape.holes.push(roundedPath(T.Path,x,sign*r*windowAngle,windowWidth,windowHeight,.035));
  const skin=airlinerBand(B,hull,shape,middle,r,mat);skin.name='airliner-window-band';B.cut(skin);
  for(const x of windowXs){
   const frame=roundedPath(T.Shape,x,sign*r*windowAngle,windowWidth+.025,windowHeight+.025,.043);frame.holes.push(roundedPath(T.Path,x,sign*r*windowAngle,windowWidth,windowHeight,.035));
   const rim=airlinerBand(B,hull,frame,grow(middle,.005),r,'chrome',.006);B.cut(rim);
   const pane=airlinerBand(B,hull,roundedPath(T.Shape,x,sign*r*windowAngle,windowWidth,windowHeight,.035),middle,r,'glass',.003);pane.name='airliner-cabin-window';B.cut(pane);
  }
  const stripe=new T.Shape();stripe.moveTo(-3.95,sign*r*.91);stripe.lineTo(3.05,sign*r*.91);stripe.lineTo(3.05,sign*r*.97);stripe.lineTo(-3.95,sign*r*.97);stripe.closePath();B.cut(airlinerBand(B,hull,stripe,grow(middle,.006),r,color,.004));
 }
 const cockpit=B.part('cockpit','驾驶舱与前风挡','FLIGHT DECK','六块前风挡随机头曲面布置，后方为双座驾驶舱与仪表台。',[-2.2,1.4,1.3]);
 for(const sign of [-1,1]){
  // 座椅立在驾驶舱地板上，座椅底座连到地板顶面。
  B.box(cockpit,.30,.16,.22,'dark',[-4.65,2.03,sign*.23]);B.box(cockpit,.10,.27,.22,'black',[-4.48,2.22,sign*.23]);cube(B,cockpit,.14,1.95-1.7975+.006,.14,'dark',[-4.65,(1.95+1.7975)/2,sign*.23]);
  for(const points of [[[-5.59,.27],[-5.49,.65],[-5.15,.83],[-5.10,.32]],[[-5.10,.36],[-5.12,.88],[-4.84,1.12],[-4.79,.64]],[[-4.76,.67],[-4.80,1.14],[-4.56,1.23],[-4.54,.77]]]){
   const glass=airlinerPatch(B,cockpit,points.map(([x,a])=>[x,sign*a]),sections,'optics',.013);glass.name='airliner-cockpit-pane';B.cut(glass);
   const border=points.map(([x,a])=>{const s=sectionAt(sections,x);return [x,s[3]+(s[1]+.016)*Math.cos(a),sign*(s[2]+.016)*Math.sin(a)];});border.push(border[0]);B.cut(B.path(cockpit,border,.009,mat));
  }
 }
 B.box(cockpit,.17,.25,.70,'screen',[-4.96,2.15,0],.035);cube(B,cockpit,.12,2.03-1.7975+.006,.40,'dark',[-4.96,(2.03+1.7975)/2,0]);
 const frames=B.part('frames','隔框、地板与货舱','FRAMES & DECK','机身隔框贴住蒙皮内侧支承客舱地板，地板从驾驶舱延伸到后舱，下方为货舱。',[0,-1.3,0]);
 // 隔框只布置在上下对称的等截面段，外缘离蒙皮外表面 .008，嵌入 .012 厚窗带内侧而不贴近零厚度上下蒙皮，避免深度冲突透出线条。
 for(let x=-3.9;x<=(classic?1.2:1.9);x+=.31)frameRing(B,frames,x,(ry-.008)/1.014,(rz-.008)/1.014,cy);
 const floor=[];for(const sign of [-1,1])for(let i=0;i<=28;i++){const x=sign<0?-5+i*8.2/28:3.2-i*8.2/28;floor.push([x,sign*halfAt(x,1.77)*.94]);}panel(B,frames,floor,.055,'alloy',[0,1.77,0]);
 const holdEnd=classic?1.8:2.2;B.box(frames,holdEnd+3.4,.29,.72,'dark',[(holdEnd-3.4)/2,1.597,0],.06);
 const cabin=B.part('cabin','客舱座椅与行李架','PASSENGER CABIN','座椅分列中央过道两侧并由支脚立在地板上，上部行李架避开舷窗。',[0,1.5,2]);
 const seatWidth=classic?.16:.13,seats=[],backs=[];
 for(let i=0;i<(classic?16:22);i++)for(const z of (classic?[-.34,-.15,.15,.34]:[-.44,-.29,-.14,.14,.29,.44])){const x=-3.85+i*(classic?.43:.31);seats.push({p:[x,1.91,z]});backs.push({p:[x+.08,2.08,z]});}
 B.instances(cabin,new T.BoxGeometry(.19,.12,seatWidth),classic?'scarlet':'bluepaint',seats).name='airliner-seat-cushions';B.instances(cabin,new T.BoxGeometry(.045,.24,seatWidth),classic?'scarlet':'bluepaint',backs);
 B.instances(cabin,new T.BoxGeometry(.05,1.85-1.7975+.006,seatWidth*.45),'dark',seats.map(s=>({p:[s.p[0],(1.85+1.7975)/2,s.p[2]]})));
 for(const sign of [-1,1])B.box(cabin,7.2,.09,.12,'porcelain',[-.2,2.30,sign*.43],.04);
 // 翼型相对厚度：A320 翼根 15%、翼尖 11%，DC-6 翼根 NACA 23016、翼尖 23012（Selig 翼型使用清单）；展向线性过渡为网页造型补全。
 const tipZ=classic?7.009:5.203,thick=(z,c)=>c*(classic?.16+(.12-.16)*Math.max(0,z-rz)/(tipZ-rz):.15+(.11-.15)*Math.max(0,z-rz)/(tipZ-rz));
 // A320 前后缘按 AC 俯视图（翼尖距中线 16.29 m、翼尖弦 1.64 m），翼尖高度取 AC 离地高度表；DC-6 弦长 228.8/71.3 in、上反角 7°、40% 弦线无后掠。
 const dcChord=z=>2.275-1.566*z/7.009,stations=classic?[...[.24,2.4,5.5,6.85].map(z=>{const c=dcChord(z);return [z,-1.88-.4*c,-1.88+.6*c,1.40+Math.tan(7*PI/180)*z,thick(z,c)];}),(()=>{const c=dcChord(7.009);return [7.009,-1.88-.4*c+.18,-1.88+.6*c-.10,1.40+Math.tan(7*PI/180)*7.009,.02];})()]
  :[[.24,-2.175,-.018],[2.03,-1.177,-.027],[3.6,-.304,.537],[5.203,.589,1.113]].map(([z,le,te])=>[z,le,te,1.45+(1.985-1.45)*(z-.24)/(5.203-.24),thick(z,te-le)]);
 const wings=[-1,1].map(sign=>B.part(sign<0?'wingL':'wingR',sign<0?'左主翼':'右主翼','WING ASSEMBLY','带厚度的曲面机翼连接翼梁与翼肋，后缘为独立活动翼面。',[.4,.4,sign*2.7]));
 const surfaces=[],control=B.part('flaps','襟翼、副翼与扰流板','WING CONTROLS','活动翼面沿实际连接轴偏转，展向缝隙中的铰链支座连接固定翼面。',[.5,1.5,2.4]);
 const regions=classic?[[.24,.66,1],[.66,4.10,.72],[4.10,4.14,1],[4.14,6.85,.74],[6.85,7.009,1]]:[[.24,.70,1],[.70,3.15,.74],[3.15,3.35,1],[3.35,4.95,.76],[4.95,5.203,1]];
 for(const sign of [-1,1]){
  const g=wings[sign<0?0:1];
  for(const [lo,hi,end]of regions){
   const zs=[lo,...stations.map(s=>s[0]).filter(z=>z>lo&&z<hi),hi];
   for(let i=1;i<zs.length;i++)airlinerWingSkin(B,g,stations,zs[i-1],zs[i],0,end===1?1:end-.01,sign,mat);
   if(end===1)continue;
   for(const z of zs)hingeBracket(B,g,stations,z,sign,end-.01,end,'alloy',.012);
   // 活动翼面两端各离支座 .003，偏转时不碰固定翼面和相邻翼面。
   for(let i=1;i<zs.length;i++){const z0=zs[i-1]+.009,z1=zs[i]-.009,origin=airlinerWingPoint(stations,z0,end,0,sign),tip=airlinerWingPoint(stations,z1,end,0,sign),pivot=subgroup(control,origin.toArray()),axis=tip.clone().sub(origin).normalize();pivot.name='airliner-control-hinge';pivot.userData.hingeLength=origin.distanceTo(tip);pivot.userData.hingeAxis=axis.toArray();
    airlinerWingSkin(B,pivot,stations,z0,z1,end,1,sign,mat,origin,false);surfaces.push({pivot,axis});}
  }
  for(let z=.6;z<tipZ-.2;z+=.38){const p=airlinerWingPoint(stations,z,.12,0,sign),q=airlinerWingPoint(stations,z,.62,0,sign);rod(B,g,p.toArray(),q.toArray(),.014,'alloy');}
  B.path(g,[...stations.slice(0,-1).map(([z])=>z),tipZ-.12].map(z=>airlinerWingPoint(stations,z,.32,0,sign).toArray()),.022,'alloy');
  if(!classic){
   // 鲨鳍小翼：翼尖外 1.61 m、顶点离地 6.707 m（AC 俯视图与 Sharklet 离地高度表），根部弯折段为网页造型补全。
   const y0=1.96,yTop=1.985+(6.707-4.067)*12/37.57,lean=5.717-.0175-5.203;
   const winglet=panel(B,g,[[.60,y0],[.66,2.02],[.76,2.12],[.90,2.26],[1.08,2.46],[1.28,2.66],[1.48,yTop-.03],[1.617,yTop],[1.59,yTop-.10],[1.45,2.50],[1.30,2.28],[1.18,2.10],[1.12,2.0],[1.10,y0]],.035,color,[0,0,sign*5.203],'xy');
   const p=winglet.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+sign*lean*Math.sin(PI/2*Math.max(0,Math.min(1,(p.getY(i)-y0)/.45))));winglet.geometry.computeVertexNormals();winglet.name='airliner-winglet';
  }
  for(const z of classic?[1.3,2.6]:[1.25,2.35]){const q=airlinerWingPoint(stations,z,.55,1,sign);B.box(g,.24,.015,.22,'airframe',q.toArray(),.008);}
 }
 const horizontal=B.part('tailplane','水平尾翼','HORIZONTAL TAIL','左右尾翼有渐薄截面，根部穿入机身尾段。',[2.1,.6,0]);
 // A320 平尾半展 6.225 m、翼尖弦 1.24 m、根弦 3.31 m；DC-6 平尾展长 46'6"、根弦 136.1 in、梢弦 53.4 in。平尾高度为网页造型补全。
 const hs=classic?[[.08,4.211,5.564,2.20,.12],[2.773,4.658,5.189,2.30,.035]]:[[.08,4.304,5.361,2.30,.10],[1.988,5.437,5.833,2.434,.035]];
 for(const sign of [-1,1])airlinerWingSkin(B,horizontal,hs,.08,hs.at(-1)[0],0,1,sign,mat);
 const fin=B.part('fin','垂直尾翼与方向舵','VERTICAL TAIL','方向舵绕后掠铰链轴偏转，下缘离开尾锥顶面。',[2.4,1.5,0]);
 // 垂尾顶点：A320 离地 11.996 m（AC 离地高度表），DC-6 全机高 28'5"、顶弦 82.633 in；铰链线与背鳍为网页造型补全。
 const finTop=classic?.299+(28+5/12)*12/(100+7/12):.6864+11.996*12/37.57,hingeTop=new T.Vector3(classic?4.94:5.462,finTop,0),hingeFoot=new T.Vector3(classic?5.08:4.69,classic?2.40:2.50,0);
 const finPoints=classic?[[3.30,2.55],[3.80,2.62],[4.05,2.70],[4.15,2.85],[4.573,finTop-.03],[4.64,finTop],[hingeTop.x,hingeTop.y],[hingeFoot.x,hingeFoot.y]]:[[3.256,2.53],[3.80,2.60],[4.20,2.72],[4.45,2.92],[5.102,finTop-.03],[5.17,finTop],[hingeTop.x,hingeTop.y],[hingeFoot.x,hingeFoot.y]];
 panel(B,fin,finPoints,.065,color,[0,0,0],'xy');
 const rudderAxis=hingeTop.clone().sub(hingeFoot).normalize(),perp=new T.Vector3(rudderAxis.y,-rudderAxis.x,0).multiplyScalar(.0038),rootTE=classic?5.55:5.24;
 let y0=0;for(let i=0;i<=24;i++)y0=Math.max(y0,hullTop(Math.min(hingeFoot.x,hingeTop.x)+(rootTE+.05-Math.min(hingeFoot.x,hingeTop.x))*i/24));y0+=.012;
 const pivotPoint=hingeFoot.clone().lerp(hingeTop,(y0-hingeFoot.y)/(hingeTop.y-hingeFoot.y)),rudder=subgroup(fin,pivotPoint.toArray());rudder.name='airliner-rudder-hinge';rudder.userData.hingeAxis=rudderAxis.toArray();rudder.userData.hingeLength=pivotPoint.distanceTo(hingeTop);
 const local=(x,y)=>[x-pivotPoint.x,y-pivotPoint.y],top=hingeTop.clone().sub(pivotPoint).add(perp);
 panel(B,rudder,[[perp.x,perp.y],[top.x,top.y],...(classic?[local(5.30,finTop),local(5.394,finTop-.04)]:[local(5.60,finTop),local(5.674,finTop-.03)]),local(rootTE,y0)],.06,color,[0,0,0],'xy');
 const gears=B.part('gears','起落架、支柱与舱门','LANDING GEAR','成对机轮夹住支柱并绕各自短轴转动，主支柱接入机翼或发动机短舱，前支柱接入机头下部。',[0,-1.6,1.7]),wheels=[];
 // 地面高度：A320 机身底部离地 1.727 m（AC 离地高度表），DC-6 机身底部离地为网页描点补全。
 const ground=classic?.299:hullBottom(0)-1.727*12/37.57;
 const engineSpec=classic?[[1.471,1.446],[3.151,1.688]]:[[1.837,1.20]];
 if(classic){
  // DC-6：主轮 45.2 in、前轮 44 in，主轮距 296 in，双轮间距 30.75 in；前后轮纵向位置按 DC-6B 尺寸页比例缩放。
  for(const sign of [-1,1]){const ex=airlinerWingSection(stations,1.471)[1]-.60,{wheels:w,at}=twinGear(B,gears,{x:-1.532,z:sign*1.471,y:ground+1.007*.2247,r:.2247,w:.154,spacing:.153,topY:1.446,strutR:.035,sleeveR:.055});wheels.push(...w);rod(B,gears,at(.55),[ex+1.1,1.446-.2145+.02,sign*1.471],.022,'chrome');}
  const {wheels:w,at}=twinGear(B,gears,{x:-5.015,z:0,y:ground+.2188,r:.2188,w:.12,spacing:.14,topY:hullBottom(-5.015)+.06,compact:true,strutR:.035,sleeveR:.05});wheels.push(...w);rod(B,gears,at(.6),[-5.30,hullBottom(-5.30)+.03,0],.02,'chrome');
 }else{
  // A320：主轮 46x17R20、前轮 30x8.8R15，主轮距 7.59 m、主轮对间距 0.93 m、前轮间距 0.50 m、前后轮距 12.64 m、机头到前轮 5.07 m。
  for(const sign of [-1,1]){const ws=airlinerWingSection(stations,1.212),u=(-.56-ws[1])/(ws[2]-ws[1]),topY=airlinerWingPoint(stations,1.212,u,-1,sign).y+.03,{wheels:w,at}=twinGear(B,gears,{x:-.344,z:sign*1.212,y:ground+1.007*.1866,r:.1866,w:.138,spacing:.1485,topX:-.56,topY,strutR:.032,sleeveR:.05});wheels.push(...w);
   const side=airlinerWingSection(stations,.92),su=(-.60-side[1])/(side[2]-side[1]);rod(B,gears,at(.55),[-.60,airlinerWingPoint(stations,.92,su,-1,sign).y+.02,sign*.92],.02,'chrome');}
  const {wheels:w,at}=twinGear(B,gears,{x:-4.381,z:0,y:ground+.1217,r:.1217,w:.0746,spacing:.0799,topY:hullBottom(-4.381)+.06,compact:true,strutR:.026,sleeveR:.04});wheels.push(...w);rod(B,gears,at(.6),[-4.70,hullBottom(-4.70)+.03,0],.016,'chrome');
 }
 const tanks=B.part('tanks','翼内油箱与中央油箱','WING TANKS','油箱位于翼盒与内侧翼段，厚度收在上下翼面之间。',[0,-1.3,-2.2]);for(const sign of [-1,1]){const start=tanks.children.length;airlinerWingSkin(B,tanks,stations.map(s=>s.map((v,i)=>i===4?v*.55:v)),.62,1.62,.34,.66,sign,'bronze',new T.Vector3(),false);for(const mesh of tanks.children.slice(start))mesh.userData.tank=true;}
 const systems=B.part('systems','液压、供电与环境管路','AIRCRAFT SYSTEMS','地板下管路沿货舱顶面连接前后系统舱。',[0,1.2,-2.6]);for(const sign of [-1,1])for(let j=0;j<3;j++)B.path(systems,[[-4,1.65,sign*(.3+j*.07)],[0,1.64,sign*(.3+j*.07)],[3.6,1.75,sign*(.25+j*.045)]],.009,j===0?'copper':'chrome');
 const rotors=[];
 for(const sign of [-1,1])engineSpec.forEach(([z,y],j)=>{
  const ws=airlinerWingSection(stations,z),x=classic?ws[1]-.60:-1.826,id=`engine${sign>0?'R':'L'}${j}`;
  const g=B.part(id,(sign<0?'左':'右')+(classic?(j?'外':'内'):'')+'发动机','ENGINE ASSEMBLY',classic?'星形发动机装在圆滑短舱内，减速器带动三叶螺旋桨，短舱后段接入机翼。':'前置风扇、核心机与喷管组成翼下涡扇，吊架接到主翼下方。',[j?.8:-.8,.8,sign*2.7]);place(B,id,[x,y,sign*z]);
  if(classic){
   // 短舱、气缸与发动机架为网页造型补全；螺旋桨直径 157 in 取自道格拉斯三视图。内侧短舱尾段较长，主起落架支柱接入其中。
   const ns=[[-.56,.245,.245,0],[-.47,.295,.295,0],[.20,.295,.295,0],[.90,.24,.24,0],...(j===0?[[1.45,.17,.17,0],[1.85,.04,.04,0]]:[[1.30,.12,.12,0],[1.55,.03,.03,0]])];
   loft(B,g,ns,'airframe',PI/2,PI);B.cut(loft(B,g,ns,'airframe',-PI/2,PI));B.torus(g,.255,.02,'chrome',[-.55,0,0],'x');
   B.cylinder(g,.20,.08,'dark',[-.50,0,0],'x');B.cylinder(g,.11,.40,'cast',[-.28,0,0],'x');
   for(let row=0;row<2;row++)for(let i=0;i<9;i++){const a=(i+row*.5)*TAU/9,c=B.cylinder(g,.045,.17,'alloy',[-.38+row*.16,.155*Math.cos(a),.155*Math.sin(a)]);c.rotation.x=a;}
   for(let k=0;k<6;k++){const a=k*PI/3;rod(B,g,[-.10,.09*Math.cos(a),.09*Math.sin(a)],[.20,.295*Math.cos(a),.295*Math.sin(a)],.016,'steel');}
   const p=subgroup(g,[-.70,0,0]);p.name='airliner-engine-rotor';propeller(B,p,.78,3);B.cylinder(p,.12,.10,'chrome',[0,0,0],'x');B.cylinder(p,.05,.037,'steel',[.1385,0,0],'x');rotors.push(p);
   for(let i=0;i<12;i++){const a=i*TAU/12;rod(B,g,[.14,.297*Math.cos(a),.297*Math.sin(a)],[.36,.285*Math.cos(a),.285*Math.sin(a)],.007,'dark');}
  }else{
   // CFM56 短舱：进气口距机头 11.19 m、发动机中心距中线 5.75 m、短舱最低点离地 0.577 m（AC 俯视图与离地高度表）；吊架外形为网页造型补全。
   const jet=turbofan(B,g,.327,1.2);jet.rotor.name='airliner-engine-rotor';rotors.push(jet.rotor);
   const w=u=>{const p=airlinerWingPoint(stations,z,u,0,sign);return [p.x-x,p.y-y];};
   const pylon=panel(B,g,[[-.35,.30],[.55,.30],[.80,.22],w(.62),w(.35),w(.03)],.12,'airframe',[0,0,0],'xy');pylon.name='airliner-engine-pylon';B.path(g,[[-.22,.03,.333],[.2,.02,.333],[.55,.02,.333]],.005,'dark');
  }
 });
 const doors=B.part('doors','客舱门与货舱门','DOORS','弯曲舱门边框贴合机身，主门、紧急出口和货舱门分层布置。',[0,1.6,2.8]);
 const door=(x,a,w,h,sign)=>{
  const shape=roundedPath(T.Shape,x,sign*r*a,w,r*h,.035);shape.holes.push(roundedPath(T.Path,x,sign*r*a,w-.028,r*h-.028,.025));const frame=airlinerBand(B,doors,shape,grow(sections,.006),r,'dark',.005);B.cut(frame);
  const handle=decal(airlinerPatch(B,doors,[[x-.05,sign*(a-.04)],[x+.05,sign*(a-.04)],[x+.05,sign*(a+.01)],[x-.05,sign*(a+.01)]],sections,'chrome',.0025),2);B.cut(handle);
 };
 for(const sign of [-1,1]){if(classic){door(-4.1,1.54,.31,.83,sign);door(2.92,1.54,.31,.83,sign);}else{door(-4.40,1.45,.27,.80,sign);door(3.45,1.45,.27,.80,sign);for(const i of [10,11])door(windowXs[i],1.32,.21,.50,sign);}}
 for(const x of classic?[-2.8,2.0]:[-3.39,1.247])door(x,2.08,.62,.48,1);
 return {...B,update(a,e){offsets(B,e);rotors.forEach(g=>g.rotation.x=a*(classic?2.1:1.6));wheels.forEach(g=>g.rotation.z=-a*.3);surfaces.forEach(({pivot,axis})=>pivot.quaternion.setFromAxisAngle(axis,.09*Math.sin(a*.30)));rudder.quaternion.setFromAxisAngle(rudderAxis,.065*Math.sin(a*.28));}};
}
// 直升机的封闭桨叶截面。弦长由根部 chord 线性变到 tipChord，扭转只用于网页外观，不作为翼型或制造数据。
function helicopterBladeGeometry(inner,outer,chord,profileStart=inner,profileEnd=outer,tipChord=chord*.78){
 const pos=[],uv=[],indices=[],n=24,k=20;
 for(let i=0;i<=n;i++){const x=inner+(outer-inner)*i/n,u=(x-profileStart)/(profileEnd-profileStart),w=chord+(tipChord-chord)*u,twist=.07*(1-u);for(let j=0;j<k;j++){const a=j*TAU/k,y=Math.sin(a)*w*.055,z=Math.cos(a)*w*.5;pos.push(x,y*Math.cos(twist)-z*Math.sin(twist),z*Math.cos(twist)+y*Math.sin(twist));uv.push(u,j/k);}}
 for(let i=0;i<n;i++)for(let j=0;j<k;j++){const a=i*k+j,b=i*k+(j+1)%k,c=a+k,d=b+k;indices.push(a,c,b,b,c,d);}
 for(let i=1;i<k-1;i++){indices.push(0,i,i+1);const t=n*k;indices.push(t,t+i+1,t+i);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
// R22 尺寸取自 Robinson R22 POH 第 1-3 页外形尺寸图；A/W 95 尺寸取自 Vortech A/W 95 规格表。机身截面、动力与操纵细节为网页造型补全。
export function buildHelicopter(materials,open=false){
 const B=makeBuilder(materials),length=open?5.3:6.6,tailX=length*.635;
 // 主旋翼半径、尾桨半径与弦长（来源数值）。R22 主轴到尾桨轴 = 总长 8.76 − 主旋翼半径 3.835 − 尾桨半径 0.535 = 4.39 m。
 const mainR=open?5.94/2:3.835,tailR=open?1.016/2:.535,chord=open?7*.0254:7.2*.0254,tipChord=open?chord:7.7*.0254;
 const X=open?0:tailX-4.39,ground=open?.28:.13,height=open?1.96:2.72,headTop=.067,rotorY=ground+height-headTop;
 const kz=.866,sections=[[-2.4,.025,.025,1.02],[-2.32,.21,.23,1.05],[-2.12,.43,.45,1.12],[-1.80,.61,.58,1.19],[-1.35,.68,.65,1.20],[-.80,.64,.61,1.23],[-.35,.58,.51,1.26],[-.15,.52,.39,1.26]].map(([x,ry,rz,cy])=>[x,ry,rz*kz,cy]);
 const halfAt=(x,y)=>{const s=sectionAt(sections,x);return s[2]*Math.sqrt(Math.max(0,1-((y-s[3])/s[1])**2));};
 const panes=[[[-2.25,1.78],[-2.13,.72],[-1.79,.10],[-1.46,.10],[-1.46,1.71],[-2.11,1.96]],[[-1.37,.66],[-.63,.66],[-.37,1.02],[-.37,1.81],[-1.37,1.81]]];
 const at=(x,a,offset=0)=>{const s=sectionAt(sections,x);return [x,s[3]+(s[1]+offset)*Math.cos(a),(s[2]+offset)*Math.sin(a)];};
 // B.box 的倒角向外扩 0.35×倒角半径，减速器顶面按实际外表面计算。
 const gearY=rotorY-.63,gearTop=gearY+.10+.35*.055,base=.66;
 const cabin=B.part('cabin',open?'开放式管架座舱':'双座座舱与机身','CABIN',open?'红色底架、后立柱与 A 形支架连接座椅、主减速器与尾架。':'曲面机身为前风挡和侧门玻璃留出真实开口，下方地板与后部动力支架相连。',[-1.5,.5,-1.7]);
 if(open){
  // A/W 95 开放管架：底架、后立柱和 A 形支架的布置按 Vortech 照片补全，管径与节点位置为网页造型补全。
  for(const sign of [-1,1]){const z=sign*.30;rod(B,cabin,[-.60,base,z],[.65,base,z],.028,'scarlet');rod(B,cabin,[.65,base,z],[.65,1.40,z],.028,'scarlet');
   rod(B,cabin,[-.60,base,z],[X-.155,gearY-.03,sign*.10],.024,'chrome');rod(B,cabin,[.65,1.40,z],[X+.155,gearY-.03,sign*.10],.024,'chrome');
   rod(B,cabin,[-.60,base,z],[-1.02,.80,sign*.20],.022,'chrome');}
  for(const x of [-.60,-.30,.12,.65])rod(B,cabin,[x,base,-.30],[x,base,.30],.025,'chrome');
  rod(B,cabin,[-1.02,.80,-.20],[-1.02,.80,.20],.022,'chrome');
 }else{
  for(const sign of [-1,1]){
   const shape=new T.Shape([[-2.4,0],[-.15,0],[-.15,sign*PI*.63],[-2.4,sign*PI*.63]].map(p=>new T.Vector2(...p)));
   for(const points of panes){const hole=new T.Path(points.map(([x,a])=>new T.Vector2(x,sign*a*.63)));hole.closePath();shape.holes.push(hole);}
   const shell=airlinerBand(B,cabin,shape,sections,.63,'scarlet',.018);shell.name='helicopter-cabin-skin';if(sign>0)B.cut(shell);
   const stripe=airlinerPatch(B,cabin,[[-2.32,sign*2.04],[-.17,sign*1.97],[-.17,sign*2.09],[-2.32,sign*2.16]],sections,'porcelain',.005);if(sign>0)B.cut(stripe);
   const door=[[-1.4,.62],[-.60,.62],[-.30,1.0],[-.30,2.38],[-1.4,2.38],[-1.4,.62]];B.cut(B.path(cabin,door.map(([x,a])=>at(x,sign*a,.008)),.008,'dark'));
   for(const x of [-1.36,-.34])B.cut(B.box(cabin,.055,.09,.014,'chrome',at(x,sign*1.95,.012),.006));
   B.cut(B.box(cabin,.09,.025,.014,'chrome',at(-.55,sign*1.94,.012),.006));
   // 后部开放动力支架与座舱底部相连，不用实心壳体填住发动机。
   rod(B,cabin,[-.25,.80,sign*.18],[.68,.65,sign*.35],.027,'chrome');rod(B,cabin,[.68,.65,sign*.35],[-.22,1.72,sign*.30],.027,'chrome');
  }
  // 座舱地板沿机身内轮廓取形，边缘接到蒙皮。
  const floor=[];for(const sign of [-1,1])for(let i=0;i<=20;i++){const x=sign<0?-1.85+i*1.45/20:-.40-i*1.45/20;floor.push([x,sign*halfAt(x,.70)]);}panel(B,cabin,floor,.035,'dark',[0,.70,0]);
  loft(B,cabin,[[-.26,.24,.36,1.62],[.30,.18,.25,1.65],[.67,.10,.18,1.65]],'scarlet',-PI/2,PI);
  for(const z of [-.13,.13])B.cylinder(cabin,.055,.025,'lamp',[-2.30,.91,z],'x');
 }
 const canopy=B.part('canopy',open?'仪表柱与仪表盒':'前风挡与侧门玻璃',open?'INSTRUMENT POD':'WINDSCREEN',open?'A/W 95 为无风挡开放座舱，仪表盒装在脚踏横杆的立柱顶端。':'左右前风挡与侧门玻璃嵌入机身开口，边框沿同一曲面贴合。',[-2,1.8,0]);
  if(open){rod(B,canopy,[-1.02,.80,0],[-1.00,1.20,0],.020,'dark');}
 else for(const sign of [-1,1])for(const points of panes){
  const glass=airlinerPatch(B,canopy,points.map(([x,a])=>[x,sign*a]),sections,'optics',.001);glass.name='helicopter-window';glass.material.transparent=true;glass.material.opacity=.62;glass.material.depthWrite=false;glass.material.metalness=.16;glass.material.roughness=.16;B.cut(glass);
  const edge=points.map(([x,a])=>at(x,sign*a,.009));edge.push(edge[0]);B.cut(B.path(canopy,edge,.016,'dark'));
 }
 const seats=B.part('seats',open?'座椅与操纵杆':'双座座椅与仪表台','FLIGHT CONTROLS','座椅、脚蹬与操纵杆围绕仪表板布置。',[ -1.1,1.6,1.2]);
 // A/W 95 座椅紧靠主轴前方（照片），整组座椅与操纵件相对 R22 布局后移并抬到底架高度。
 const cockpit=subgroup(seats,open?[.55,base-.55,0]:[0,0,0]),floorY=open?.55:.7175;
 const panelG=subgroup(open?canopy:cockpit,open?[-1.00,1.20,0]:[-1.73,1.07,0]),sw=open?.40:.34,ps=open?.12:.08;
 for(const z of open?[0]:[-.235,.235]){
  B.box(cockpit,.45,.12,sw,'black',[-1.04,.83,z],.07);const back=B.box(cockpit,.12,.54,sw,'black',[-.81,1.13,z],.065);back.rotation.z=-.12;B.box(cockpit,.42,.80-floorY,sw-.10,'dark',[-1.04,(.80+floorY)/2-.005,z],.01);
  B.path(cockpit,[[-.79,1.37,z-.13],[-.96,1.06,z+.12],[-1.18,.91,z+.13]],.018,'navy');B.box(cockpit,.06,.025,.045,'chrome',[-1.1,.91,z],.009);
  for(const side of [-1,1]){rod(B,cockpit,[-1.57,.69,z+side*ps],[-1.68,.81,z+side*ps],.014,'chrome');rod(B,cockpit,[-1.68,.81,z+side*(ps-.04)],[-1.68,.81,z+side*(ps+.04)],.018,'black');}
 }
 B.box(panelG,.06,open?.18:.35,open?.22:.43,'dark',[0,0,0],.03);panelG.rotation.z=-.14;
 const gauges=open?[[-.05,.03],[.05,.03]]:[[-.14,.09],[0,.09],[.14,.09],[-.14,-.055],[0,-.055],[.14,-.055]];
 for(const [z,y]of gauges){B.cylinder(panelG,.040,.012,'black',[.036,y,z],'x');B.torus(panelG,.040,.005,'chrome',[.045,y,z],'x');rod(B,panelG,[.043,y,z],[.046,y+.020,z+.011],.003,'porcelain');}
 B.box(panelG,.015,.040,open?.12:.26,'screen',[.039,open?-.055:-.13,0],.005);
 if(open){rod(B,cockpit,[-1.15,.55,0],[-1.30,1.0,0],.018,'chrome');B.cylinder(cockpit,.028,.12,'black',[-1.30,1.05,0]);rod(B,cockpit,[-.94,.57,-.30],[-1.18,.90,-.30],.018,'dark');}
 else{B.box(cockpit,.10,.19,.14,'dark',[-1.735,.805,0],.02);rod(B,cockpit,[-1.31,.71,0],[-1.27,1.18,0],.018,'chrome');rod(B,cockpit,[-1.27,1.18,-.235],[-1.27,1.18,.235],.018,'chrome');for(const sign of [-1,1])rod(B,cockpit,[-1.27,1.18,sign*.235],[-1.34,1.22,sign*.235],.025,'black');rod(B,cockpit,[-.94,.71,-.05],[-1.18,.90,-.05],.018,'dark');}
 const tail=B.part('tail',open?'开放式三角尾架':'尾梁与安定面','TAIL BOOM',open?'三根纵向管与交叉撑杆形成开放尾架，中央留出尾传动轴。':'收缩尾梁连接垂直和水平安定面，尾旋翼位于侧面。',[2,1,-1]);
 if(open){
  const rings=[.35,1.10,1.85,2.60,tailX].map(x=>{const u=(x-.35)/(tailX-.35),w=.31*(1-u)+.025*u,y=1.29+(1.6-1.29)*x/tailX;return [[x,y+.11*(1-u),-w],[x,y+.11*(1-u),w],[x,y-.37*(1-u)-.035,0]];});
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<3;j++){rod(B,tail,rings[i][j],rings[i+1][j],.018,'alloy');rod(B,tail,rings[i][j],rings[i+1][(j+1)%3],.012,'chrome');}
  for(const ring of rings)for(let j=0;j<3;j++)rod(B,tail,ring[j],ring[(j+1)%3],.014,'alloy');
  for(const [j,z]of [[0,-.30],[1,.30]])rod(B,tail,rings[0][j],[.65,1.40,z],.020,'chrome');rod(B,tail,rings[0][2],[.65,base,0],.020,'chrome');
 }else{
  loft(B,tail,[[.20,.24,.24,1.60],[.74,.19,.19,1.60],[2.2,.12,.12,1.60],[tailX,.065,.065,1.60]],'scarlet');
  panel(B,tail,[[3.82,1.58],[4.13,2.28],[4.28,2.28],[4.30,1.12],[4.12,1.12]],.038,'scarlet',[0,0,0],'xy');
  const stabilizer=subgroup(tail,[-.55,0,0]);for(const sign of [-1,1]){panel(B,stabilizer,[[3.48,sign*.05],[3.66,sign*.72],[3.98,sign*.72],[3.89,sign*.05]],.035,'scarlet',[0,1.55,0]);panel(B,stabilizer,[[3.68,1.55],[3.78,1.77],[3.94,1.77],[3.98,1.55]],.022,'porcelain',[0,0,sign*.70],'xy');}
  B.path(tail,[[.6,1.60,.191],[2.0,1.60,.133],[tailX,1.60,.066]],.012,'porcelain');
  B.path(tail,[[4.15,1.13,0],[4.35,.92,0],[4.53,.94,0]],.018,'chrome');
 }
 const shaft=B.part('tailshaft','尾传动轴与支承','TAIL DRIVE SHAFT','尾传动轴沿尾部中心通道连接后部齿箱。',[1.8,-.9,.9]);
 const driveStart=new T.Vector3(.15,open?1.30:1.60,0),driveEnd=new T.Vector3(tailX,1.60,0),driveAxis=driveEnd.clone().sub(driveStart).normalize(),shaftRod=subgroup(shaft);shaftRod.name='helicopter-tail-shaft';rod(B,shaftRod,driveStart.toArray(),driveEnd.toArray(),.025,'chrome');
 for(const x of [.6,1.7,2.8]){const u=(x-driveStart.x)/(tailX-driveStart.x),p=driveStart.clone().lerp(driveEnd,u),support=subgroup(shaft,p.toArray());support.name='helicopter-shaft-bearing';const ring=B.tube(support,.060,.029,.055,'bronze',[0,0,0],'y');ring.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),driveAxis);if(open){const t=(x-.35)/(tailX-.35),w=.31*(1-t)+.025*t,y=1.29+.31*x/tailX+.11*(1-t);for(const sign of [-1,1])rod(B,shaft,[p.x,p.y,sign*.058],[x,y,sign*w],.012,'alloy');}}
 const power=B.part('power','发动机、皮带与减速传动','POWERPLANT','发动机、外露散热片和皮带轮围绕主传动支架分层布置。',[0,-1.2,-1.6]);
 B.box(power,.60,.30,.46,'cast',[.12,.83,0],.06);
 if(open){for(const z of [-.15,.15]){B.cylinder(power,.105,.29,'alloy',[.13,1.10,z]);for(let i=0;i<7;i++)B.cylinder(power,.125,.012,'dark',[.13,.98+i*.035,z]);B.cylinder(power,.025,.08,'ceramic',[.13,1.28,z]);}}
 else for(const sign of [-1,1])for(const x of [-.05,.28]){B.cylinder(power,.12,.32,'alloy',[x,.99,sign*.30],'z');for(let i=0;i<6;i++)B.tube(power,.13,.09,.015,'dark',[x,.99,sign*(.22+i*.035)],'z');rod(B,power,[x,1.11,sign*.36],[x+.08,1.26,sign*.24],.015,'black');}
 // 皮带轮：下轮在发动机输出端，上轮带动主减速器；位置为网页造型补全。
 const pulleys=open?[[X,.90,.13],[X,gearY,.20]]:[[.30,1.18,.18],[.30,1.73,.28]],pz=open?.34:.30;
 for(const [i,[x,y,r]]of pulleys.entries()){B.cylinder(power,r,.10,'dark',[x,y,pz],'z');B.torus(power,r,.012,'chrome',[x,y,pz+.065]);const z0=open?(i?.155:.20):pz-.06;B.cylinder(power,.055,pz+.08-z0,'chrome',[x,y,(z0+pz+.08)/2],'z');}
 const [[x0,y0,r0],[x1,y1,r1]]=pulleys;B.path(power,[[x0-r0,y0,pz+.06],[x1-r1,y1,pz+.06],[x1,y1+r1,pz+.06],[x1+r1,y1,pz+.06],[x0+r0,y0,pz+.06],[x0,y0-r0,pz+.06],[x0-r0,y0,pz+.06]],.020,'rubber');
 // 主减速器与支柱；减速器顶面以上只有转动主轴，减速器顶面与主轴下端留 .003 间隙。
 rod(B,power,[X,open?.95:1.65,0],[X,gearY-.09,0],open?.05:.065,open?'scarlet':'chrome');B.box(power,.31,.20,.31,'alloy',[X,gearY,0],.055);
 if(!open){const yb=1.80,yt=gearTop-.005-.35*.07;B.box(power,.42,yt-yb,.36,'scarlet',[X+.04,(yt+yb)/2,0],.07);for(let i=0;i<5;i++)cube(B,power,.012,.10,.012,'dark',[X-.02+i*.026,yt-.16,.18]);}
 const mast=B.part('mast','主轴、旋翼头与变距拉杆','ROTOR HEAD','转动主轴从减速器顶面伸出，穿过导向套筒和控制环接到旋翼头，变距拉杆随旋翼头同步转动。',[0,1.8,1.2]);
 B.tube(mast,.12,.068,rotorY-.4575-gearTop,'alloy',[X,(gearTop+rotorY-.4575)/2,0],'y');
 const hub=subgroup(mast,[X,rotorY,0]);hub.name='main-rotor-hub';const shaftL=rotorY-gearTop-.003;B.cylinder(hub,.065,shaftL,'chrome',[0,-shaftL/2,0]);B.cylinder(hub,.15,.12,'steel');B.box(hub,.72,.10,.15,'alloy',[0,0,0],.025);
 for(const sign of [-1,1]){B.cylinder(hub,.065,.18,'chrome',[sign*.30,0,0],'x');B.bolts(hub,[[sign*.32,.055,0]],'y',.026);}
 const blades=B.part('blades','双叶主旋翼','MAIN ROTOR','两片有厚度的桨叶围绕同一根主轴旋转，前后缘与桨尖均封闭。',[0,2.7,0]);place(B,'blades',[X,rotorY,0]);
 for(const sign of [-1,1]){const blade=subgroup(blades);blade.name='helicopter-main-blade-assembly';blade.rotation.y=sign<0?PI:0;B.mesh(blade,helicopterBladeGeometry(.27,mainR-.14,chord,.27,mainR,tipChord),'dark').name='helicopter-main-blade';B.mesh(blade,helicopterBladeGeometry(mainR-.14,mainR,chord,.27,mainR,tipChord),'porcelain');}
 const swash=B.part('swash','控制环与操纵连杆','SWASHPLATE','固定环坐在导向套筒上并由推拉杆接到减速器，转动环随旋翼转动并连接变距拉杆。',[1.5,1.2,1.4]);
 B.tube(swash,.27,.10,.055,'bronze',[X,rotorY-.43,0],'y');
 const ringY=rotorY-.354,ring=subgroup(swash,[X,ringY,0]);ring.name='helicopter-rotating-ring';B.tube(ring,.265,.10,.055,'chrome',[0,0,0],'y');
 for(const sign of [-1,1]){
  const lower=[sign*.20,0,sign*.10],upper=[sign*.32,rotorY-ringY,sign*.10],link=subgroup(ring);link.name='helicopter-pitch-link-'+sign;rod(B,link,lower,upper,.014,'chrome');B.cylinder(ring,.032,.055,'bronze',lower,'z');
  rod(B,hub,[sign*.32,0,0],[sign*.32,0,sign*.10],.026,'steel');
  rod(B,swash,[X-.12,rotorY-.4575+.003,sign*.08],[X-.12,gearTop-.01,sign*.08],.012,'steel');
 }
 // 固定环与转动环之间的滚珠半嵌固定环，顶面与转动环下表面留 .003 间隙。
 const balls=Array.from({length:20},(_,i)=>({p:[X+.19*Math.cos(i*TAU/20),rotorY-.4025+.006,.19*Math.sin(i*TAU/20)]}));B.instances(swash,new T.SphereGeometry(.012,8,6),'steel',balls);
 const tr=B.part('tailrotor',open?'双叶尾旋翼、尾部齿箱与垂尾':'双叶尾旋翼与尾部齿箱','TAIL ROTOR','尾旋翼在横向输出轴上转动，齿箱与尾传动轴端部接合。',[2,.5,1.9]);place(B,'tailrotor',[tailX,1.60,.17]);B.cylinder(tr,.11,.30,'alloy',[0,0,-.06],'z');B.cylinder(tr,.075,.16,'alloy',[-.06,0,-.17],'x');
 if(open)panel(B,tr,[[-.02,-.42],[.16,-.42],[.30,.30],[.24,.46],[.06,.46],[-.02,.10]],.022,'porcelain',[0,0,-.17],'xy');
 const tailSpin=subgroup(tr,[0,0,.13]);tailSpin.name='helicopter-tail-rotor';
 for(const sign of [-1,1]){const blade=subgroup(tailSpin);blade.name='helicopter-tail-blade-assembly';blade.rotation.z=sign<0?PI:0;const geo=helicopterBladeGeometry(.065,tailR,.12);geo.rotateX(PI/2);B.mesh(blade,geo,'black');}
 B.cylinder(tailSpin,.075,.06,'chrome',[0,0,0],'z');B.cylinder(tailSpin,.03,.037,'chrome',[0,0,-.0185],'z');B.bolts(tailSpin,[[0,0,.04]],'z',.022);
 const skids=B.part('skids','滑橇式起落架','SKID LANDING GEAR','左右滑橇通过横向支柱连接机身底部。',[0,-1.2,0]);
 if(open){
  // A/W 95：宽度 1.75 m 取滑橇外缘；红色外撇支腿按照片补全。
  const sy=ground+.038,sz=1.75/2-.03;
  for(const sign of [-1,1]){B.path(skids,[[-1.15,sy+.11],[-1.09,sy+.035],[-1.0,sy],[-.5,sy],[.5,sy],[.95,sy],[1.02,sy+.02],[1.05,sy+.06]].map(([x,y])=>[x,y,sign*sz]),.03,'alloy');for(const [x0,x1]of [[-.60,-.80],[.65,.80]])rod(B,skids,[x0,base,sign*.30],[x1,sy,sign*sz],.026,'scarlet');}
 }else{
  // R22：滑橇外缘宽 1.93 m，滑橇前端距尾桨后缘 6.58 m（POH 第 1-3 页）；支柱与横管位置按外形图量取补全。
  const sy=ground+.046,sz=1.93/2-.038;
  for(const sign of [-1,1]){B.path(skids,[[X-1.62,sy+.10],[X-1.55,sy+.035],[X-1.44,sy],[X-.8,sy],[X,sy],[X+.70,sy],[X+.75,sy+.012],[X+.78,sy+.035]].map(([x,y])=>[x,y,sign*sz]),.038,'alloy');for(const [x,y]of [[X-.85,.53],[X+.42,.65]]){rod(B,skids,[x,y,sign*.36],[x+.10,sy,sign*sz],.035,'chrome');B.tube(skids,.046,.039,.12,'dark',[x+.10,sy,sign*sz],'x');}}
  for(const [x,y]of [[X-.85,.53],[X+.42,.65]])rod(B,skids,[x,y,-.36],[x,y,.36],.035,'chrome');
 }
 const plumbing=B.part('plumbing','油箱、排气与冷却管路','AUXILIARY SYSTEMS','油箱和排气分置动力舱两侧，避开主轴和尾部传动通道。',[0,.8,-2]);
 for(const sign of [-1,1]){B.box(plumbing,.42,.28,.25,'alloy',[.25,1.43,sign*.34],.07);B.cylinder(plumbing,.035,.025,'chrome',[.25,1.585,sign*.34]);B.path(plumbing,[[.2,.86,sign*.3],[.63,.70,sign*.38],[.85,.50,sign*.35]],.035,'hotmetal');B.path(plumbing,[[.2,1.30,sign*.34],[.41,1.12,sign*.29],[.14,.87,sign*.24]],.014,'black');}
 return {...B,update(a,e){offsets(B,e);blades.rotation.y=hub.rotation.y=ring.rotation.y=a*1.8;tailSpin.rotation.z=-a*6.2;}};
}
