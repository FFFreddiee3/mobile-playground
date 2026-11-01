import * as T from '#three';
import {makeBuilder,TAU} from '#geometry';
import {subgroup,offsets,panel,rod,ellipsoid} from '#vehicle-kit';
const PI=Math.PI;
// 不可发射的外观展品。全为封闭实体与装饰件，没有枪膛、击发、闭锁或供弹机构。
// 坐标只用于网页造型，不对应口径、原厂尺寸、材料强度或制造公差。
// 整体长高比等外形关系取自公开照片的目测比例（来源见 arms/sources.md），不是制造尺寸。
function part(B,id,name,desc,offset){return B.part(id,name,'EXTERIOR DISPLAY',desc,offset);}
function solidBar(B,g,x0,x1,y,r=.06,z=0){const m=B.cylinder(g,r,x1-x0,'dark',[(x0+x1)/2,y,z],'x');m.name='solid-display-bar';m.userData.solidDisplay=true;return m;}
// 封闭端片的后端面与实心柱前端面共面贴合，前端不留任何开口。
function endCap(B,g,x,y,r,z=0){const m=B.cylinder(g,r,.028,'black',[x,y,z],'x');m.name='closed-display-end';m.userData.closedDisplay=true;return m;}
// 小型外观铆钉统一使用暗色表面，避免大型镀铬螺栓的玩具感。
function sideFasteners(B,g,positions,size=.023){for(const side of [-1,1])B.instances(g,new T.CylinderGeometry(size,size*.92,.018,16).rotateX(PI/2),'dark',positions.map(([x,y,z])=>({p:[x,y,side*z]})));}
function silhouette(B,g,points,depth,mat='dark',z=0,holes=[],bevel=.012){
 const shape=new T.Shape(points.map(p=>new T.Vector2(...p)));shape.closePath();
 for(const points of holes){const hole=new T.Path(points.map(p=>new T.Vector2(...p)));hole.closePath();shape.holes.push(hole);}
 const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel*2/3,bevelSegments:3,steps:1,curveSegments:8});geometry.translate(0,0,-depth/2);
 const mesh=B.mesh(g,geometry,mat,[0,0,z]);mesh.name='beveled-exterior-profile';return mesh;
}
function railDetail(B,g,x,y,length,width=.19){B.box(g,length,.045,width,'dark',[x,y,0],.009);B.instances(g,new T.BoxGeometry(.038,.025,width+.025),'dark',Array.from({length:Math.floor(length/.073)},(_,i)=>({p:[x-length/2+.04+i*.073,y+.03,0]})));}
function sightTower(B,g,x,y){for(const z of [-.065,.065]){rod(B,g,[x-.10,y,z],[x-.035,y+.25,z],.022,'dark');rod(B,g,[x+.10,y,z],[x+.025,y+.25,z],.022,'dark');}B.box(g,.13,.045,.19,'dark',[x,y+.27,0],.008);B.box(g,.018,.095,.018,'dark',[x,y+.31,0],.004);}

function gripTexture(B,g,x,y,z,w=.30,h=.65){
 const diamonds=[];for(let i=0;i<8;i++)for(let j=0;j<6;j++)diamonds.push({p:[x+(i-3.5)*w/9,y+(j-2.5)*h/7,z],r:[0,0,PI/4]});
 B.instances(g,new T.BoxGeometry(w/14,h/24,.009),'black',diamonds);
}
// 提把的全部网格命名为 carry-handle，便于比例检查把提把与机匣顶面分开测量。
function carryHandle(B,g,points){const tube=B.path(g,points,.036,'dark');tube.name='carry-handle';for(const p of [points[0],points.at(-1)])B.cylinder(g,.055,.12,'steel',p,'z').name='carry-handle';}
function sightPair(B,g,positions){for(const [x,y]of positions){B.box(g,.12,.065,.17,'dark',[x,y,0],.012);B.box(g,.022,.06,.04,'steel',[x,y+.05,0],.004);}}
function displayGuard(B,g,x,y,w=.44,h=.31){B.path(g,[[x-w/2,y+.06,0],[x-w/2,y-h*.65,0],[x,y-h,0],[x+w/2,y-h*.65,0],[x+w/2,y+.06,0]],.025,'dark');}
function ribbed(B,g,x,y,z,n,step,height,mat='black'){B.instances(g,new T.BoxGeometry(step*.42,height,.024),mat,Array.from({length:n},(_,i)=>({p:[x+i*step,y,z]})));}
// 每个展品按照片中的表面观感统一调整同一材质键的颜色、金属度和粗糙度，合并网格后仍保持一致。
function applyFinish(B,palette){B.root.traverse(o=>{if(!o.isMesh)return;const f=palette[o.userData.materialKey];if(!f)return;const m=o.material;if(f.color!==undefined)m.color.setHex(f.color);if(f.metalness!==undefined)m.metalness=f.metalness;if(f.roughness!==undefined)m.roughness=f.roughness;});}
function finish(B,inspection={},palette={}){
 applyFinish(B,palette);
 function update(a,e){offsets(B,e);const turn=.16*Math.sin(a*.22);for(const p of B.parts)p.group.rotation.y=turn;}
 return{...B,update,inspection:{displayOnly:true,...inspection}};
}
// 以下三个辅助函数只供手枪展品使用：带曲线的整体外形、罩壳圆角截面和握把面板压纹。
function curvedProfile(B,g,shape,depth,mat,z=0,bevel=.012,curveSegments=6){const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel*2/3,bevelSegments:3,steps:1,curveSegments});geometry.translate(0,0,-depth/2);const mesh=B.mesh(g,geometry,mat,[0,0,z]);mesh.name='beveled-exterior-profile';return mesh;}
// 罩壳截面：两侧平直、上缘两角倒圆，沿长度方向拉伸后前段按比例收窄。只是一整块封闭实体。
function pistolCover(B,g,length,halfWidth,bottom,top,corner,x,mat='steel',narrow=.10,bevel=.012){
 const s=new T.Shape(),a=halfWidth;s.moveTo(-a,bottom);s.lineTo(a,bottom);s.lineTo(a,top-corner);s.absarc(a-corner,top-corner,corner,0,PI/2,false);s.lineTo(-a+corner,top);s.absarc(-a+corner,top-corner,corner,PI/2,PI,false);s.lineTo(-a,bottom);
 const depth=length-2*bevel,geometry=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,steps:3,curveSegments:8});geometry.translate(0,0,-depth/2);geometry.rotateY(PI/2);
 const pos=geometry.attributes.position,half=length/2,taper=half*.42;for(let i=0;i<pos.count;i++){const px=pos.getX(i);if(px>taper)pos.setZ(i,pos.getZ(i)*(1-narrow*Math.min(1,(px-taper)/(half-taper))));}
 geometry.computeVertexNormals();const mesh=B.mesh(g,geometry,mat,[x,0,0]);mesh.name='rounded-cover';return mesh;
}
// 握把面板压纹：按握把倾角排列的低矮菱形凸点，螺钉周围留出菱形平面区域。
function checkeredPanel(B,g,cx,cy,shear,w,h,z,side,screws){
 const dr=.0145,dh=.008*side,corners=[[dr,0],[0,dr],[-dr,0],[0,-dr]],verts=[];for(let i=0;i<4;i++){const p=corners[i],q=corners[(i+1)%4];verts.push(...(side>0?[p[0],p[1],-.004,q[0],q[1],-.004]:[q[0],q[1],.004,p[0],p[1],.004]),0,0,dh);}
 const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(verts,3));geometry.computeVertexNormals();const items=[];
 for(let v=-h/2+.035;v<=h/2-.035;v+=.029)for(let u=-w/2+.03;u<=w/2-.03+1e-9;u+=.029){if(screws.some(([su,sv])=>Math.abs(u-su)/.075+Math.abs(v-sv)/.11<1))continue;items.push({p:[cx+u+shear*v,cy+v,z]});}
 B.instances(g,geometry,'black',items);
}
// 外形参考：IWM FIR 541 馆藏照片（M1911A1 型，左侧照片按罩壳顶线校正倾斜后量取整体比例）。
// 省略后部击锤与握把保险尾片，护圈内部保持空置，不表现任何操作件或开口。
export function buildDisplayPistol(materials){
 const B=makeBuilder(materials);
 const frame=part(B,'frame','握持框架','框架前段薄护面与护圈前缘连贯，握把前后缘按照片倾角后倾，后部下端为外凸弧形外壳。',[-.7,-.5,-.4]);
 const f=new T.Shape();f.moveTo(.53,.312);f.lineTo(.53,.29);f.lineTo(.10,.268);f.lineTo(-.29,.258);f.lineTo(-.30,.22);f.quadraticCurveTo(-.33,.08,-.415,.02);f.lineTo(-.499,-.145);f.lineTo(-.558,-.349);f.lineTo(-.596,-.50);f.quadraticCurveTo(-.604,-.548,-.59,-.552);f.lineTo(-1.07,-.526);f.quadraticCurveTo(-1.13,-.515,-1.131,-.45);f.quadraticCurveTo(-1.132,-.39,-1.105,-.335);f.lineTo(-1.021,-.145);f.lineTo(-.939,.059);f.quadraticCurveTo(-.915,.15,-.93,.22);f.lineTo(-.95,.312);f.lineTo(.53,.312);
 curvedProfile(B,frame,f,.28,'dark',0,.02);B.box(frame,1.45,.03,.32,'black',[-.205,.30,0],.004).name='cover-frame-seam';
 const slide=part(B,'slide','上部金属罩壳','上缘倒圆、两侧平直的封闭罩壳，前段略收窄，后部竖向压纹凸出表面。',[0,.9,-.3]);pistolCover(B,slide,1.91,.165,.312,.648,.075,.02);for(const side of [-1,1])ribbed(B,slide,-.80,.47,side*.186,8,.045,.22,'dark');
 const bar=part(B,'barrel','实心前部外形柱','封闭实体仅用于外形展示，内部没有通孔。',[1.0,.35,0]);solidBar(B,bar,-.16,.995,.46,.105);
 const cap=part(B,'cap','封闭端面','深色实心端面贴合外形柱前端。',[1.4,.15,0]);endCap(B,cap,1.009,.46,.107);
 const panelShape=new T.Shape(),pw=.28,ph=.735,pr=.045;panelShape.moveTo(-pw/2+pr,-ph/2);panelShape.lineTo(pw/2-pr,-ph/2);panelShape.absarc(pw/2-pr,-ph/2+pr,pr,-PI/2,0,false);panelShape.lineTo(pw/2,ph/2-pr);panelShape.absarc(pw/2-pr,ph/2-pr,pr,0,PI/2,false);panelShape.lineTo(-pw/2+pr,ph/2);panelShape.absarc(-pw/2+pr,ph/2-pr,pr,PI/2,PI,false);panelShape.lineTo(-pw/2,-ph/2+pr);panelShape.absarc(-pw/2+pr,-ph/2+pr,pr,PI,PI*1.5,false);
 const cx=-.7425,cy=-.145,shear=.30,panelPoints=panelShape.getPoints(3).map(p=>[cx+p.x+shear*p.y,cy+p.y]),screws=[[0,.30],[0,-.30]];
 for(const side of [-1,1]){const g=part(B,side<0?'grip0':'grip1',side<0?'左握把面板':'右握把面板','深棕色圆角木质面板随握把后倾，菱形网格压纹在两颗螺钉周围留出平面区域。',[0,-.4,side*.75]);silhouette(B,g,panelPoints,.045,'wood',side*.172,[],.01);checkeredPanel(B,g,cx,cy,shear,pw,ph,side*(.2012+.0025),side,screws);B.bolts(g,screws.map(([u,v])=>[cx+u+shear*v,cy+v,side*.214]),'z',.024);}
 const guard=part(B,'guard','外部护圈','圆润的环形外轮廓连接框架前段和握把前缘，内部为空，没有扳机。',[.6,-.6,.2]);
 const gs=new T.Shape();gs.moveTo(.042,.275);gs.lineTo(.022,.15);gs.quadraticCurveTo(.012,.034,-.08,.033);gs.lineTo(-.33,.034);gs.quadraticCurveTo(-.40,.036,-.41,.09);gs.lineTo(-.34,.275);gs.lineTo(.042,.275);
 const hole=new T.Path();hole.moveTo(-.004,.262);hole.lineTo(-.004,.13);hole.quadraticCurveTo(-.006,.074,-.06,.074);hole.lineTo(-.25,.074);hole.quadraticCurveTo(-.285,.076,-.29,.12);hole.lineTo(-.29,.262);hole.lineTo(-.004,.262);gs.holes.push(hole);
 curvedProfile(B,guard,gs,.15,'dark',0,.005);
 const sights=part(B,'sights','顶部外形附件','前后两处低矮固定附件贴合罩壳顶面。',[0,1.2,.6]);B.box(sights,.075,.045,.11,'dark',[-.745,.68,0],.008);B.box(sights,.11,.028,.03,'dark',[.85,.672,0],.006);
 const rear=part(B,'rear','后端装饰盖','平面后盖贴合罩壳后端，不包含击发组件。',[-1.15,.4,.1]);pistolCover(B,rear,.03,.13,.345,.61,.06,-.946,'dark',0,.008);
 const base=part(B,'base','握把底部收边','握把底部的实心收边条，与框架下缘相接。',[0,-1.1,0]);silhouette(B,base,[[-1.075,-.522],[-.59,-.548],[-.585,-.585],[-1.07,-.56]],.30,'dark',0,[],.008);
 const panels=part(B,'panels','侧面饰条','框架两侧握把上方的平直封闭饰条，形成表面层次。',[0,.1,1.0]);for(const side of [-1,1])B.cut(B.box(panels,.50,.045,.012,'cast',[-.66,.265,side*.158],.006));
 const rail=part(B,'rail','前部下缘饰条','平滑饰条贴合框架前段下缘，仅表现外部轮廓。',[.5,-.8,-.6]);B.box(rail,.42,.03,.24,'dark',[.32,.262,0],.006).rotation.z=.047;
 return finish(B,{kind:'pistol'},{steel:{color:0x3d4144,metalness:.55,roughness:.66},dark:{color:0x373b3e,metalness:.5,roughness:.7},wood:{color:0x5b3523,roughness:.55},black:{roughness:.75},cast:{color:0x33373a,metalness:.45,roughness:.7}});
}
// 外形参考：IWM FIR 10707 馆藏照片（No 4 Mk 1 (T) 型，带镜筒与贴腮木块）。
export function buildDisplayBoltRifle(materials){
 const B=makeBuilder(materials);
 const stock=part(B,'stock','木质长枪托外形','圆角木质外形连接后部肩托、贴腮木块与前部护木。',[-1.0,-.7,-.3]);silhouette(B,stock,[[-2.65,-.30],[-2.65,-.78],[-1.91,-.62],[-1.34,-.22],[-.75,-.24],[.20,-.16],[.22,.02],[-1.35,.04],[-1.64,-.17]],.30,'wood',0,[],.03);silhouette(B,stock,[[-2.42,-.28],[-1.80,-.20],[-1.82,-.10],[-2.36,-.13]],.20,'wood',0,[],.02);
 const butt=part(B,'butt','肩托后部金属板','深色金属后板贴合木质肩托末端。',[-1.8,-.5,.1]);B.box(butt,.075,.52,.37,'dark',[-2.69,-.54,0],.035);ribbed(B,butt,-2.72,-.54,.194,1,.02,.36,'black');
 const body=part(B,'body','封闭上部外壳','上部为封闭展示实体，没有可用内部机构。',[0,.8,-.5]);B.box(body,1.3,.27,.30,'dark',[-.63,.10,0],.04);B.cylinder(body,.16,1.04,'steel',[-.63,.18,0],'x');
 const bar=part(B,'barrel','长实心前部外形柱','长实体沿外形轴线伸出，不含枪膛与通孔。',[1.7,.4,0]);solidBar(B,bar,-.13,2.57,.18,.073);for(const x of [.10,1.0,2.13])B.cylinder(bar,.09,.10,'dark',[x,.18,0],'x');
 const cap=part(B,'cap','封闭前端','前端实心盖贴合长柱外形。',[2.4,.1,.2]);endCap(B,cap,2.584,.18,.077);
 const hand=part(B,'handguard','前部木质护罩','下部护木与覆盖长柱上方的木质上护罩组合，前方只露出短段金属外形。',[1.1,-.4,.8]);silhouette(B,hand,[[-.03,-.13],[1.98,-.09],[2.15,.06],[2.08,.17],[.10,.18]],.26,'wood',0,[],.025);silhouette(B,hand,[[.04,.17],[1.98,.165],[2.0,.235],[1.96,.262],[.06,.272]],.15,'wood',0,[],.02);
 const scope=part(B,'scope','封闭光学外形件','细长镜筒、两端扩口和反光端片组成观察附件外形。',[0,1.4,.2]);B.cylinder(scope,.095,.50,'dark',[-.53,.58,0],'x');B.cylinder(scope,.14,.16,'dark',[-.20,.58,0],'x',.105);B.cylinder(scope,.10,.14,'dark',[-.85,.58,0],'x',.125);B.cylinder(scope,.132,.008,'optics',[-.116,.58,0],'x');B.cylinder(scope,.115,.008,'optics',[-.924,.58,0],'x');B.cylinder(scope,.045,.10,'black',[-.55,.70,0]);B.cylinder(scope,.045,.08,'black',[-.55,.58,.12],'z');
 const rings=part(B,'mount','镜筒外部支架','两副固定抱箍连接上部外壳与封闭镜筒。',[0,1.1,-.7]);for(const x of [-.74,-.34]){B.tube(rings,.115,.095,.07,'steel',[x,.58,0],'x');B.box(rings,.14,.20,.20,'dark',[x,.38,0]);}
 const guard=part(B,'guard','空置外部护圈','护圈仅保留轮廓，内部没有击发构件。',[-.7,-.9,.6]);displayGuard(B,guard,-.90,-.12,.47,.30);
 const handle=part(B,'handle','固定侧面装饰柄','侧柄为固定外观件，不具有上膛或闭锁动作。',[-.4,.4,1.0]);rod(B,handle,[-.79,.16,.14],[-.80,-.03,.38],.035,'steel');ellipsoid(B,handle,[.073,.065,.073],[-.80,-.03,.39],'dark');
 const bands=part(B,'bands','护罩外部箍带','深色金属带包住上下木质护罩。',[.9,.8,-.7]);for(const x of [.35,1.55]){B.box(bands,.06,.44,.37,'steel',[x,.065,0],.025);B.box(bands,.035,.30,.39,'dark',[x,.065,0],.01);}
 const sling=part(B,'sling','背带环与吊环','前后小环贴合木质外形底面，为外观展示附件。',[-.5,-1.1,-.4]);for(const [x,y]of [[-2.25,-.78],[1.5,-.18]]){B.torus(sling,.085,.016,'steel',[x,y,0],'x');rod(B,sling,[x,y+.06,0],[x,y+.13,0],.022,'dark');}
 const pins=part(B,'pins','外部紧固件','表面螺钉与饰板分开显示。',[0,-.2,1.3]);sideFasteners(B,pins,[[-1.37,-.13,.177],[-1.88,-.40,.177],[-.18,.04,.17]],.025);
 return finish(B,{kind:'boltrifle'},{wood:{color:0x8f6045,roughness:.5},steel:{color:0x43484c,metalness:.7,roughness:.42},dark:{color:0x26292c,metalness:.6,roughness:.5}});
}
// 外形参考：DVIDS 9150181 博物馆库房照片（M4A1，不计消音外形件）。机匣叠高按照片降低。
export function buildDisplayRifle(materials){
 const B=makeBuilder(materials);
 const body=part(B,'body','主外壳','上下分层的封闭外壳，侧面带凸台、压线与圆角。',[-.8,.4,-.7]);
 silhouette(B,body,[[-1.10,.25],[-1.10,.52],[-.92,.585],[-.23,.585],[.25,.56],[.27,.25],[.10,.22],[-.37,.22],[-.49,.25]],.26);
 silhouette(B,body,[[-1.09,.25],[-.42,.25],[.17,.23],[.13,.07],[-.28,.05],[-.45,.12],[-.88,.12]],.245);
 for(const z of [-.14,.14]){B.box(body,.48,.10,.017,'cast',[-.24,.42,z],.02);B.box(body,.60,.021,.018,'black',[-.57,.25,z],.004);B.cylinder(body,.049,.026,'dark',[-.91,.19,z],'z');}
 const stock=part(B,'stock','骨架肩托','带镂空轮廓、贴腮面和橡胶后垫的肩托外形。',[-1.7,-.3,.4]);
 B.cylinder(stock,.105,.83,'dark',[-1.48,.39,0],'x');
 silhouette(B,stock,[[-2.45,.54],[-1.67,.51],[-1.55,.38],[-1.75,.20],[-2.33,-.26],[-2.48,-.24]],.25,'black',0,[[[-2.32,.28],[-2.27,-.08],[-1.87,.23]]]);
 B.box(stock,.087,.79,.30,'rubber',[-2.50,.14,0],.03);B.box(stock,.70,.10,.28,'black',[-2.07,.50,0],.035);
 for(const z of [-.14,.14])B.box(stock,.37,.045,.018,'dark',[-2.16,.31,z],.012);
 const cover=part(B,'cover','后部顶盖','封闭顶盖与尾部装饰翼保持分层轮廓。',[0,1,-.6]);B.cut(B.box(cover,.77,.075,.27,'dark',[-.66,.56,0],.024));B.box(cover,.20,.07,.38,'black',[-1.04,.53,0],.015);
 const fore=part(B,'handguard','圆弧防滑护罩','两半圆弧护罩与密集环向凸纹组成前部握持区。',[1,.6,.7]);
 B.cylinder(fore,.174,1.02,'black',[.73,.41,0],'x',.198);for(let i=0;i<13;i++)B.torus(fore,.187-i*.0018,.013,'black',[.28+i*.075,.41,0],'x');
 for(const x of [.20,1.28])B.cylinder(fore,.20,.06,'dark',[x,.41,0],'x');
 for(const z of [-.177,.177])B.box(fore,.95,.014,.01,'dark',[.72,.41,z],.003);
 const bar=part(B,'barrel','实心前部外形柱','阶梯状实心柱体，仅表现前部外轮廓。',[1.6,.1,0]);solidBar(B,bar,1.25,2.20,.41,.052);B.cylinder(bar,.074,.15,'dark',[1.38,.41,0],'x');B.cylinder(bar,.062,.32,'dark',[1.91,.41,0],'x');
 const cap=part(B,'cap','封闭端套','前端封闭，周围短槽以浅表压纹表示。',[2.2,.3,.2]);B.cylinder(cap,.075,.25,'dark',[2.29,.41,0],'x');endCap(B,cap,2.43,.41,.076);for(let i=0;i<6;i++){const a=i*TAU/6;B.box(cap,.14,.009,.018,'black',[2.29,.41+.075*Math.cos(a),.075*Math.sin(a)],.004).rotation.x=a;}
 const grip=part(B,'grip','倾斜握把','后倾聚合物握把带压纹和底部收边。',[.2,-1,.6]);silhouette(B,grip,[[-.94,.15],[-.68,.13],[-.74,0],[-.90,-.47],[-1.17,-.41],[-1.06,-.04]],.23,'black');for(const z of [-.124,.124])gripTexture(B,grip,-.93,-.17,z,.17,.30);
 const lower=part(B,'lowerblock','弧形封闭外形块','弧形下挂块为实心展示件，表面压筋与底缘分开表现。',[0,-1.1,0]);
 silhouette(B,lower,[[-.30,.08],[.10,.08],[.12,-.20],[.25,-.58],[.15,-.72],[-.19,-.65],[-.30,-.30]],.20,'cast');
 for(const z of [-.112,.112])for(const x of [-.20,-.09,.02])B.path(lower,[[x,-.02,z],[x+.01,-.30,z],[x+.11,-.55,z]],.012,'dark');B.box(lower,.39,.045,.24,'dark',[-.02,-.69,0],.012).rotation.z=-.2;
 const guard=part(B,'guard','空置护圈','护圈保留外部轮廓，内部为空。',[.3,-.7,-.8]);displayGuard(B,guard,-.50,.07,.38,.23);
 const rail=part(B,'rail','顶部导条','连续横纹导条与主壳顶部贴合。',[0,1.3,-.1]);railDetail(B,rail,-.51,.62,1.16);
 const sights=part(B,'sights','提把与前部轮廓附件','顶部带镂空提把，前方三角形附件形成清楚的侧面轮廓。',[0,1.8,.6]);silhouette(B,sights,[[-1.02,.64],[-.88,.93],[-.13,.93],[.05,.69],[.03,.63]],.17,'dark',0,[[[-.83,.72],[-.20,.72],[-.27,.83],[-.78,.83]]]);B.box(sights,.15,.07,.24,'black',[-.91,.965,0],.012);sightTower(B,sights,1.34,.45);
 const panels=part(B,'panels','侧面饰板','短压条、圆形凸台与封闭饰板形成左右不同的外部层次。',[-.6,.5,1.2]);B.box(panels,.43,.13,.028,'dark',[-.17,.40,.164],.02);B.cylinder(panels,.062,.095,'dark',[-.86,.40,.17],'z');B.box(panels,.17,.04,.04,'dark',[-.93,.19,-.17],.014).rotation.z=-.3;
 const sling=part(B,'attachments','背带吊环','前后外部吊环与壳体连接。',[-1,.2,-1.3]);for(const [x,y,z]of [[-2.30,.02,-.142],[1.30,.25,-.12]])B.torus(sling,.055,.012,'dark',[x,y,z],'z');
 const pins=part(B,'pins','外部铆钉与端片','小尺寸暗色端片分布在外壳连接位置。',[0,-.3,1.5]);sideFasteners(B,pins,[[-1.01,.19,.138],[-.39,.19,.138],[.12,.33,.145]],.022);
 return finish(B,{kind:'rifle',style:'M4 exterior'},{dark:{color:0x2b2e30,metalness:.35,roughness:.6},black:{roughness:.75},cast:{color:0x34393d,roughness:.62}});
}
function displayBipod(B,parent,x,y,width=.50,height=1.05){const hinges=[];for(const side of [-1,1]){const g=subgroup(parent,[x,y,side*.12]);g.name='display-bipod';rod(B,g,[0,0,0],[-.13,-height,side*width],.035,'dark');rod(B,g,[-.13,-height*.60,side*width*.60],[-.16,-height,side*width],.024,'chrome');B.box(g,.22,.045,.19,'dark',[-.13,-height,side*width],.008);B.cylinder(g,.06,.08,'steel',[0,0,0],'z');hinges.push(g);}return hinges;}
// 外形参考：DVIDS 4846113 白底照片（M249 左侧）。肩托段与握把下垂按照片缩短。
export function buildDisplayLMG(materials){
 const B=makeBuilder(materials);
 const body=part(B,'body','分层主外壳','侧面带加强折边与阶梯过渡的封闭金属外壳。',[-.6,.4,-.7]);silhouette(B,body,[[-1.12,.14],[-1.12,.57],[-.92,.66],[.45,.58],[.60,.42],[.43,.18],[-.08,.10]],.34);B.box(body,1.10,.15,.28,'cast',[-.34,.09,0],.025);
 const cover=part(B,'cover','顶部罩板与导条','拱起的顶盖、端部圆轴与短导条组成顶部层次。',[0,1.4,-.4]);B.cut(B.box(cover,1.38,.11,.37,'dark',[-.30,.66,0],.035));railDetail(B,cover,-.34,.73,.94,.22);for(const x of [-.96,.37])B.cylinder(cover,.057,.41,'dark',[x,.62,0],'z');
 const stock=part(B,'stock','聚合物肩托','折面肩托、抬高贴腮面与后垫连接主壳后端。',[-1.8,-.2,0]);silhouette(B,stock,[[-2.25,.52],[-1.72,.51],[-1.13,.43],[-1.13,.18],[-1.48,.12],[-2.14,-.12],[-2.28,-.10]],.29,'black');B.box(stock,.08,.65,.34,'rubber',[-2.30,.20,0],.026);for(const z of [-.158,.158])B.box(stock,.50,.035,.018,'dark',[-1.99,.36,z],.01);
 const bar=part(B,'barrel','实心阶梯外形柱','前部实心柱以不同粗细段表现外轮廓。',[1.4,.4,.5]);solidBar(B,bar,.40,2.46,.47,.062);for(const x of [.51,1.32,1.72])B.cylinder(bar,.087,.10,'dark',[x,.47,0],'x');solidBar(B,bar,.48,1.61,.23,.055);
 const cap=part(B,'cap','封闭前端','圆角端套与实心端盖连接。',[2.2,.1,0]);B.cylinder(cap,.092,.24,'dark',[2.56,.47,0],'x',.070);endCap(B,cap,2.694,.47,.093);
 const grip=part(B,'grip','压纹握把','斜握把具有宽底缘和细小表面纹理。',[-.4,-1,.7]);silhouette(B,grip,[[-.98,.06],[-.70,.06],[-.76,-.12],[-.92,-.49],[-1.18,-.42]],.24,'black');for(const z of [-.13,.13])gripTexture(B,grip,-.97,-.20,z,.17,.26);
 const top=part(B,'topblock','下挂封闭外形盒','橄榄色下挂外形盒与主壳相接，内部为实心展示几何。',[0,-1.4,.6]);B.box(top,.78,.63,.41,'olive',[-.05,-.25,0],.065);B.box(top,.84,.06,.46,'black',[-.05,.08,0],.018);for(const z of [-.214,.214]){B.box(top,.53,.30,.012,'olive',[-.05,-.27,z],.038);for(const x of [-.33,.23])B.box(top,.026,.48,.025,'dark',[x,-.25,z],.007);}
 const guard=part(B,'guard','空置外护圈','护圈内部为空，仅保留外部轮廓。',[-.2,-.7,-.7]);displayGuard(B,guard,-.51,.045,.42,.26);
 const handle=part(B,'handle','折起式外部提把','偏置提把与圆角握持套形成上部轮廓。',[.9,1.2,-.8]);carryHandle(B,handle,[[.48,.47,.17],[.57,.87,.17],[.98,.95,.17]]);B.cylinder(handle,.062,.43,'rubber',[.80,.93,.17],'x').name='carry-handle';for(let i=0;i<7;i++)B.torus(handle,.063,.008,'black',[.61+i*.058,.93,.17],'x');
 const bipod=part(B,'bipod','双脚展示支架','两个支脚与前部横向支座连接。',[1.2,-.9,1]);const feet=displayBipod(B,bipod,1.43,.18,.48,.95);
 const band=part(B,'bands','前部聚合物护罩','带纵向凸纹的圆角护罩包围前部实心外形。',[1.1,.5,-1]);silhouette(B,band,[[.45,.42],[1.38,.42],[1.44,.31],[1.33,.02],[.51,-.02],[.41,.10]],.34,'black');for(const z of [-.181,.181])for(const y of [.08,.18,.28])B.box(band,.79,.026,.025,'black',[.92,y,z],.01);for(const x of [.48,1.37])B.cylinder(band,.092,.44,'dark',[x,.33,0],'z');
 const sights=part(B,'sights','顶部轮廓附件','后部小附件与前方高轮廓附件分开排列。',[.4,1.6,1]);sightPair(B,sights,[[-.97,.757]]);sightTower(B,sights,1.72,.51);
 const pads=part(B,'panels','侧面层板','带折角的侧面层板和压线贴合主壳。',[-.6,.4,1.5]);for(const z of [-.185,.185]){silhouette(B,pads,[[-1.02,.50],[.29,.50],[.40,.35],[.32,.22],[-.95,.22]],.018,'cast',z);B.box(pads,.85,.024,.024,'dark',[-.34,.38,z*1.1],.008);}
 const pins=part(B,'pins','表面铆钉与端片','暗色小铆钉保留独立展开能力。',[-.4,-.3,-1.4]);sideFasteners(B,pins,[[-.98,.30,.21],[-.67,.30,.21],[-.16,.30,.21],[.29,.30,.21]],.021);
 return finish(B,{kind:'lmg',feet,style:'M249 exterior'},{dark:{color:0x2c3033,metalness:.45,roughness:.6},black:{roughness:.74},cast:{color:0x363d42,roughness:.62}});
}
// 外形参考：DVIDS 4845949 白底照片（M240B 左侧）。机匣叠高、提把与握把按照片降低。
export function buildDisplayGPMG(materials){
 const B=makeBuilder(materials);
 const body=part(B,'body','通用机枪封闭壳体','平直侧面的封闭金属壳体与下部支架连接。',[-.5,.5,-.8]);B.box(body,1.73,.30,.46,'dark',[-.36,.58,0],.04);B.box(body,1.30,.06,.36,'steel',[-.40,.43,0],.02);
 const cover=part(B,'cover','顶部罩壳与提把','独立封闭罩壳、横纹导条和低位提把定义上部轮廓。',[0,1.4,-.3]);B.cut(B.box(cover,1.59,.06,.49,'dark',[-.36,.75,0],.03));railDetail(B,cover,-.48,.80,1.12,.26);carryHandle(B,cover,[[.48,.66,.22],[.58,.92,.22],[1.03,.92,.22]]);B.cylinder(cover,.066,.44,'rubber',[.83,.92,.22],'x').name='carry-handle';
 const stock=part(B,'stock','后部聚合物肩托','宽后板、末端竖向凸纹和中间连接段组成肩托外形。',[-1.7,.1,.4]);silhouette(B,stock,[[-2.40,.05],[-2.40,.64],[-2.09,.70],[-1.66,.56],[-1.26,.56],[-1.14,.42],[-1.68,.33]],.31,'black');B.box(stock,.065,.66,.34,'rubber',[-2.44,.35,0],.03);for(const z of [-.168,.168])ribbed(B,stock,-2.34,.36,z,5,.035,.34,'black');
 const jacket=part(B,'jacket','纵纹前部护罩','聚合物前罩以纵向压纹表现外表，前部仍为实心展示柱。',[1.4,.5,.4]);solidBar(B,jacket,.35,2.67,.64,.067);silhouette(B,jacket,[[.31,.70],[1.35,.70],[1.47,.56],[1.36,.28],[.37,.26]],.32,'black');for(const z of [-.176,.176])for(const y of [.35,.46,.57])B.box(jacket,.88,.025,.022,'black',[.87,y,z],.009);for(const x of [.34,1.40,2.18])B.cylinder(jacket,.093,.08,'dark',[x,.64,0],'x');solidBar(B,jacket,.36,1.62,.30,.055);
 const cap=part(B,'cap','封闭前端套','实心端套没有枪膛或通孔。',[2.2,.2,0]);B.cylinder(cap,.11,.27,'dark',[2.77,.64,0],'x');endCap(B,cap,2.921,.64,.111);
 const grip=part(B,'grip','外部握把','外部握把仅提供展品轮廓。',[-.6,-.6,.7]);silhouette(B,grip,[[-.99,.44],[-.70,.44],[-.69,.20],[-.82,-.10],[-1.09,-.06]],.26,'black');for(const s of [-1,1])gripTexture(B,grip,-.91,.16,s*.14,.18,.38);
 const guard=part(B,'guard','空置外护圈','护圈内部没有击发组件。',[-.2,-.7,-.7]);displayGuard(B,guard,-.47,.36,.44,.30);
 const mount=part(B,'mount','展台转动座与托架','叉形托架、横销与中央立柱连接封闭壳体和下方展台。',[0,-.7,-.8]);for(const z of [-.33,.33]){B.box(mount,.60,.18,.12,'steel',[-.05,.30,z]);rod(B,mount,[-.05,-.26,z],[-.05,.25,z],.045,'dark');}B.cylinder(mount,.16,.26,'dark',[-.05,-.35,0]);B.cylinder(mount,.07,.82,'steel',[-.05,.325,0],'z');B.cylinder(mount,.07,.60,'steel',[-.05,-.02,0]);
 const tripod=part(B,'tripod','三脚展示支架','三个支脚连接中央座，作为外观展台的支承结构。',[0,-1.3,.2]);const legs=[];for(let i=0;i<3;i++){const a=i*TAU/3+PI/3,p=[-.05+.95*Math.cos(a),-1.22,.95*Math.sin(a)];rod(B,tripod,[-.05,-.45,0],p,.045,'dark');rod(B,tripod,[-.05,-.56,0],[(p[0]-.05)/2,-.84,p[2]/2],.025,'steel');B.box(tripod,.27,.05,.20,'dark',p,.01);legs.push(p);}B.cylinder(tripod,.18,.14,'steel',[-.05,-.49,0]);
 const side=part(B,'sideblock','侧面封闭饰板','偏置封闭饰板与主壳表面相接。',[-.7,.3,1.4]);silhouette(B,side,[[-.68,.71],[-.20,.71],[-.13,.62],[-.21,.45],[-.63,.45],[-.73,.55]],.045,'dark',.28);B.box(side,.44,.026,.06,'black',[-.43,.69,.30],.008);
 const sights=part(B,'sights','固定上方附件','固定小附件与前部外罩相接。',[.4,1.7,.9]);sightPair(B,sights,[[-.96,.855]]);sightTower(B,sights,2.20,.70);
 const panelPart=part(B,'panels','侧面保护盖片','金属表面盖片沿壳体两侧布置，上下两排圆头铆钉。',[-.6,.6,-1.4]);for(const s of [-1,1]){silhouette(B,panelPart,[[-1.13,.71],[.32,.71],[.39,.60],[.26,.45],[-1.11,.45]],.024,'cast',s*.25);B.box(panelPart,1.22,.027,.02,'dark',[-.43,.48,s*.275],.007);}sideFasteners(B,panelPart,[[-1.05,.62,.28],[-.70,.62,.28],[-.37,.62,.28],[.02,.62,.28],[-.95,.52,.28],[-.60,.52,.28],[-.25,.52,.28],[.10,.52,.28]],.018);
 const collars=part(B,'collars','外部支座与箍带','外形连接座和细箍围绕前段排列。',[1.2,1.1,-.7]);for(const x of [.30,1.44,2.24])B.cylinder(collars,.10,.08,'dark',[x,.64,0],'x');B.box(collars,.21,.16,.27,'steel',[.39,.43,0],.02);
 const pins=part(B,'pins','表面紧固件','小型螺钉保持独立可展开。',[0,-.5,1.5]);sideFasteners(B,pins,[[-1.03,.57,.28],[-.35,.57,.28],[.31,.57,.28]],.024);
 return finish(B,{kind:'gpmg',legs},{dark:{color:0x2c3033,metalness:.45,roughness:.6},steel:{color:0x5f666b,metalness:.7,roughness:.5},black:{roughness:.74},cast:{color:0x343a3f,roughness:.62}});
}
// 外形参考：ACC 2000508249 官方照片（GAU-2 外观）只用于定性特征；未找到可量取整件比例的官方侧视照片，整体比例保持原网页造型。
export function buildDisplayRotary(materials){
 const B=makeBuilder(materials);
 const body=part(B,'body','封闭后部壳体','圆筒后壳仅为外观展示基体，没有可用内部传动或供弹机构。',[-1,.4,-.6]);B.cylinder(body,.43,1.36,'dark',[-.65,.56,0],'x');B.cylinder(body,.48,.12,'steel',[-1.36,.56,0],'x');for(let i=0;i<12;i++){const a=i*TAU/12;B.box(body,.94,.045,.035,'steel',[-.67,.56+.43*Math.sin(a),.43*Math.cos(a)],.005).rotation.x=-a;}
 const cluster=part(B,'cluster','六根实心外形柱','六根封闭柱体围绕中心线排列，转动只用于展示外形。',[1.6,.3,.7]),rotor=subgroup(cluster,[0,.56,0]);rotor.name='display-rotor';const caps=[];for(let i=0;i<6;i++){const a=i*TAU/6,y=.29*Math.sin(a),z=.29*Math.cos(a);solidBar(B,rotor,.06,2.41,y,.062,z);caps.push(endCap(B,rotor,2.424,y,.064,z));for(const x of [.19,1.12,2.28])B.cylinder(rotor,.074,.06,'steel',[x,y,z],'x');}
 const front=part(B,'front-ring','前部外形环架','前环架用六根短支承保持柱体外观的周向分布。',[2.1,.7,-.2]);B.tube(front,.43,.35,.12,'steel',[2.25,.56,0],'x');for(let i=0;i<6;i++){const a=i*TAU/6;rod(B,front,[2.25,.56+.29*Math.sin(a),.29*Math.cos(a)],[2.25,.56+.40*Math.sin(a),.40*Math.cos(a)],.025,'dark');}
 // 后环架贴合后壳前端面；中心轴伸入后壳，两段轴套与六根柱体外缘相切，柱组转动时只贴合不穿插。
 const rear=part(B,'rear-ring','后部外形环与轴心','后环架与封闭后壳连接，中央轴和两段轴套为装饰实体。',[.6,.9,-1]);B.tube(rear,.45,.36,.12,'steel',[.09,.56,0],'x');B.cylinder(rear,.10,2.38,'steel',[1.14,.56,0],'x');B.cylinder(rear,.14,.10,'dark',[2.33,.56,0],'x');B.cylinder(rear,.2275,.83,'dark',[.655,.56,0],'x');B.cylinder(rear,.2275,1.06,'dark',[1.70,.56,0],'x');
 const motor=part(B,'motor','外部电机罩壳','封闭电机罩与外形支架相接，不包含工作电路或传动参数。',[-.8,1.1,1.2]);B.cylinder(motor,.20,.89,'cast',[-.74,.89,.54],'x');for(let i=0;i<14;i++)B.cylinder(motor,.217,.023,'dark',[-1.13+i*.057,.89,.54],'x');B.cylinder(motor,.23,.06,'steel',[-1.22,.89,.54],'x');
 const cradle=part(B,'cradle','外部叉形托架','两侧托架与底座连接，只承托展品外形。',[0,-.9,-.9]);for(const z of [-.55,.55]){panel(B,cradle,[[-.90,-.07],[.44,-.07],[.47,.48],[.30,.57],[-.61,.30]],.10,'steel',[0,0,z],'xy');B.cylinder(cradle,.12,.08,'dark',[.11,.40,z*1.10],'z');}B.box(cradle,1.18,.14,1.20,'dark',[-.22,-.13,0]);
 const base=part(B,'base','展示立柱与底盘','宽底盘和立柱形成可拆解展示支座。',[0,-1.5,.1]);B.cylinder(base,.13,.85,'steel',[-.24,-.57,0]);B.cylinder(base,.27,.12,'dark',[-.24,-.99,0]);B.cylinder(base,.65,.10,'dark',[-.24,-1.10,0]);B.bolts(base,Array.from({length:8},(_,i)=>[-.24+.48*Math.sin(i*TAU/8),-1.04,.48*Math.cos(i*TAU/8)]),'y',.035);
 const handles=part(B,'handles','后部双握把','两根固定握把与后壳装饰板连接，没有控制电路。',[-1.8,.3,.5]);for(const z of [-.30,.30]){rod(B,handles,[-1.40,.66,z],[-1.68,.66,z],.04,'steel');rod(B,handles,[-1.68,.34,z],[-1.68,.91,z],.07,'black');for(let i=0;i<9;i++)B.cylinder(handles,.075,.012,'dark',[-1.68,.39+i*.055,z]);}
 const cover=part(B,'panels','侧面封闭罩板','独立侧罩与封闭主体形成分层外观。',[-.6,1.4,-1.2]);for(const s of [-1,1])B.cut(B.box(cover,.79,.35,.045,'cast',[-.65,.55,s*.46],.04));
 const cable=part(B,'cables','外部装饰线束','线束只表现外部走向，不是可用电气连接。',[-1.0,.6,1.6]);B.path(cable,[[-1.12,.99,.53],[-1.47,1.12,.53],[-1.64,.97,.15],[-1.45,.59,.09]],.023,'black');B.path(cable,[[-.40,.89,.52],[-.07,1.05,.48],[.25,.83,.34]],.022,'rubber');
 const panelRear=part(B,'rear-panel','后部端板与饰环','后部端板由同轴封闭圆片和外环组成。',[-1.9,.4,-.5]);B.cylinder(panelRear,.40,.075,'cast',[-1.46,.56,0],'x');B.torus(panelRear,.34,.022,'chrome',[-1.51,.56,0],'x');
 const pins=part(B,'pins','环架与罩板紧固件','后壳饰环和后环架端面上的表面紧固细节独立可选。',[.7,1.3,1]);B.bolts(pins,Array.from({length:12},(_,i)=>[-1.295,.56+.455*Math.sin(i*TAU/12),.455*Math.cos(i*TAU/12)]),'x',.016);B.bolts(pins,Array.from({length:12},(_,i)=>[.155,.56+.405*Math.sin(i*TAU/12),.405*Math.cos(i*TAU/12)]),'x',.020);
 const frontPivot=subgroup(front,[0,.56,0]);frontPivot.name='display-front-ring';for(const m of [...front.children])if(m!==frontPivot){m.position.y-=.56;frontPivot.add(m);}B.bolts(frontPivot,Array.from({length:12},(_,i)=>[2.315,.40*Math.sin(i*TAU/12),.40*Math.cos(i*TAU/12)]),'x',.020);
 applyFinish(B,{steel:{color:0x6a7177,metalness:.72,roughness:.46},dark:{color:0x2b2f33,metalness:.6,roughness:.5},cast:{color:0x3a4249,roughness:.62}});
 function update(a,e){offsets(B,e);rotor.rotation.x=frontPivot.rotation.x=a*.38;}
 return{...B,update,inspection:{displayOnly:true,kind:'rotarygun',rotor,frontPivot,caps}};
}
