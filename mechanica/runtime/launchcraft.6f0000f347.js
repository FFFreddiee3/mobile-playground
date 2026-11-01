import * as T from '#three';
import {makeBuilder,TAU} from '#geometry';
import {subgroup,offsets,panel,rod,ellipsoid} from '#vehicle-kit';
import {solarPanel,blanketBox,dish} from '#orbital-kit';
const PI=Math.PI;
// 公开总体构型的网页几何。喷管、舱内设备与连接件不提供工作参数或制造接口。
function shell(B,g,r,y0,y1,mat='porcelain'){
 for(const [start,cut]of [[PI,false],[0,true]]){const m=B.tube(g,r,r-.018,y1-y0,mat,[0,(y0+y1)/2,0],'y',start,PI);if(cut)B.cut(m);}
 for(const y of [y0,y1]){B.torus(g,r,.012,'alloy',[0,y,0],'y');B.bolts(g,Array.from({length:20},(_,i)=>[r*Math.sin(i*TAU/20),y,r*Math.cos(i*TAU/20)]),'y',.011);}
}
function tank(B,g,r,y,h,mat){B.cylinder(g,r,h-.24,mat,[0,y,0]);for(const s of [-1,1])ellipsoid(B,g,[r,.12,r],[0,y+s*(h-.24)/2,0],mat);}
function nozzle(B,g,r,h,pos){
 const n=subgroup(g,pos);n.name='engine-nozzle';
 B.lathe(n,[[r,0],[r*.92,h*.17],[r*.48,h*.62],[r*.25,h*.82],[r*.3,h],[r*.16,h],[r*.20,h*.81],[r*.43,h*.6],[r*.87,h*.15],[r*.95,0]],'hotmetal');
 B.cylinder(n,r*.25,h*.32,'steel',[0,h*1.09,0]);
 for(let j=0;j<6;j++)B.torus(n,r*(.29+.11*j),r*.025,'bronze',[0,h*(.83-.11*j),0],'y');
 for(let j=0;j<3;j++){const a=j*TAU/3;rod(B,n,[r*.28*Math.cos(a),h,r*.28*Math.sin(a)],[r*.65*Math.cos(a),h*.4,r*.65*Math.sin(a)],r*.045,'steel');}
 // 喷管没有独立运动，把静态网格移到同一总成内，仍保留发动机中心节点。
 n.updateMatrix();for(const mesh of [...n.children]){mesh.applyMatrix4(n.matrix);g.add(mesh);}
 return n;
}
function ringElectronics(B,g,r,y,n=8){for(let i=0;i<n;i++){const a=i*TAU/n,c=subgroup(g,[r*Math.sin(a),y,r*Math.cos(a)]);c.rotation.y=a;blanketBox(B,c,.13,.16,.09,[0,0,0],'foil');B.box(c,.09,.09,.008,'circuit',[0,0,.051],0);}}
function seats(B,g,n,y,z=0,pitch=.40){for(let i=0;i<n;i++){const x=(i-(n-1)/2)*pitch,s=subgroup(g,[x,y,z]);B.box(s,.31,.07,.4,'navy',[0,0,0]);const back=B.box(s,.31,.51,.07,'ceramic',[0,.24,-.16]);back.rotation.x=-.18;B.box(s,.21,.15,.07,'dark',[0,.54,-.20]);for(const a of [-.10,.10])rod(B,s,[a,.46,-.11],[a*.4,.04,.14],.012,'black');rod(B,s,[-.13,-.04,0],[-.13,-.18,-.12],.024);rod(B,s,[.13,-.04,0],[.13,-.18,-.12],.024);}}

// 星舰按SpaceX官网总高124米、直径9米、超重型助推器72米、星舰52米归一化，1单位=10米。
const SHIP_NOSE=[[.45,0],[.45,.30],[.425,.56],[.36,.83],[.25,1.06],[.12,1.21],[0,1.25]];
function profileAt(profile,h){if(h<=profile[0][1])return {r:profile[0][0],slope:0};let j=profile.findIndex(p=>p[1]>=h);if(j<1)j=profile.length-1;const lo=profile[j-1],hi=profile[j],slope=(hi[0]-lo[0])/(hi[1]-lo[1]);return {r:lo[0]+slope*(h-lo[1]),slope};}
// 低细分旋转体用于数量多的发动机，减少移动端三角形。
function lowLathe(B,g,points,mat,pos=[0,0,0],segments=24){return B.mesh(g,new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),segments),mat,pos);}
function seams(B,g,r,ys,t=.0035,mat='chrome'){const geo=new T.TorusGeometry(r,t,4,64);return B.instances(g,geo,mat,ys.map(y=>({p:[0,y,0],r:[PI/2,0,0]})));}
// 发动机外形：喷管出口在局部y=0，顶端在y=H与推力板接触。海平面型与真空型只改变扩张段比例。
function engine(B,g,E,H,pos,kind='sl'){
 const n=subgroup(g,pos);n.name='engine-nozzle';
 const P=kind==='vac'?[[0,H*.70],[E*.20,H*.70],[E*.95,0],[E,0],[E*.80,H*.24],[E*.48,H*.52],[E*.24,H*.70],[E*.30,H*.78],[E*.34,H*.92],[E*.38,H],[0,H]]
  :kind==='f1'?[[0,H*.55],[E*.45,H*.55],[E*.95,0],[E,0],[E*.92,H*.20],[E*.70,H*.45],[E*.50,H*.58],[E*.55,H*.66],[E*.62,H*.86],[E*.66,H],[0,H]]
  :[[0,H*.62],[E*.33,H*.62],[E*.92,0],[E,0],[E*.86,H*.25],[E*.62,H*.48],[E*.42,H*.62],[E*.46,H*.72],[E*.54,H*.88],[E*.58,H],[0,H]];
 lowLathe(B,n,P,'hotmetal');
 const ring=kind==='vac'?.24:kind==='f1'?.50:.42,ringY=kind==='vac'?.70:kind==='f1'?.56:.62;B.mesh(n,new T.TorusGeometry(E*ring,E*.07,4,24),'bronze',[0,H*ringY,0],[PI/2,0,0]);
 for(const s of [-1,1])B.mesh(n,new T.CylinderGeometry(E*.13,E*.13,H*.26,8),'steel',[s*E*(kind==='vac'?.42:.62),H*.86,0]);
 n.updateMatrix();for(const mesh of [...n.children]){mesh.applyMatrix4(n.matrix);g.add(mesh);}
 return n;
}
function hexTiles(B,g,rows,radius){
 const R=.0296,pitch=Math.sqrt(3)*R,geo=new T.CylinderGeometry(R*.97,R*.97,.0100,6);geo.rotateX(PI/2);geo.translate(0,0,-.0038);
 const out=[],q=new T.Quaternion(),qx=new T.Quaternion(),e=new T.Euler(),X=new T.Vector3(1,0,0),Y=new T.Vector3(0,1,0);
 for(const {y,r,slope,row}of rows){const n=Math.max(3,Math.floor(PI*r/pitch)),tilt=Math.atan(-slope);for(let i=0;i<n;i++){const a=-PI/2+(i+.25+(row&1)*.5)*PI/n;q.setFromAxisAngle(Y,a).multiply(qx.setFromAxisAngle(X,-tilt));e.setFromQuaternion(q,'XYZ');out.push({p:[(r+radius)*Math.sin(a),y,(r+radius)*Math.cos(a)],r:[e.x,e.y,e.z]});}}
 return B.instances(g,geo,'black',out);
}
export function buildStarship(materials){
 const B=makeBuilder(materials),r=.45,base=.06,boosterTop=6.90,shipBottom=7.20,barrelTop=11.15;
 const booster=B.part('booster','超重型助推器外壁','SUPER HEAVY','不锈钢环带焊接成下级箭体，顶部有前封头，外壁可剖开观察内部。',[-1.6,-.3,-.7]);shell(B,booster,r,base,boosterTop,'steel');
 seams(B,booster,r+.001,Array.from({length:42},(_,i)=>.22+i*.16));lowLathe(B,booster,[[0,boosterTop+.075],[.20,boosterTop+.06],[.36,boosterTop+.03],[r-.018,boosterTop-.01],[r-.018,boosterTop-.04],[0,boosterTop-.02]],'steel',[0,0,0],48);
 const lowerTanks=B.part('booster-tanks','助推器内部贮箱','BOOSTER TANKS','下部大容器与上部容器沿纵轴排列，外壁贴合箭体内壁。',[1.5,0,.5]);tank(B,lowerTanks,.430,2.30,3.70,'alloy');tank(B,lowerTanks,.430,5.525,2.55,'bronze');
 const engines=B.part('booster-engines','33台猛禽发动机','BOOSTER ENGINES','外圈20台、中圈10台、中心3台，顶端连接推力板。',[0,-1.8,0]);
 B.cylinder(engines,.432,.04,'dark',[0,.31,0]);for(const [count,rad,phase]of [[20,.375,0],[10,.23,.5],[3,.085,.25]])for(let i=0;i<count;i++){const a=(i+phase)*TAU/count;engine(B,engines,.057,.29,[rad*Math.sin(a),0,rad*Math.cos(a)]);}
 const grid=B.part('gridfins','四片栅格舵','GRID FINS','格栅舵板绕径向转轴转动，转轴座固定在助推器上部外壁。',[-1.3,1.0,1.3]),fins=[];
 for(let i=0;i<4;i++){const a=PI/4+i*PI/2,mount=subgroup(grid,[0,6.55,0]);mount.rotation.y=a;B.box(mount,.16,.10,.065,'dark',[0,0,.4675],.01);
  const hinge=subgroup(mount,[0,0,.506]);hinge.name='starship-grid-hinge';B.cylinder(hinge,.024,.03,'steel',[0,0,.015],'z');
  for(const x of [-.24,.24])B.box(hinge,.025,.04,.50,'titanium',[x,0,.28],0);for(const z of [.03,.53])B.box(hinge,.505,.04,.025,'titanium',[0,0,z],0);
  for(let j=1;j<8;j++)B.box(hinge,.012,.036,.49,'titanium',[-.24+j*.06,0,.28],0);for(let j=1;j<8;j++)B.box(hinge,.47,.036,.012,'titanium',[0,0,.03+j*.0625],0);fins.push(hinge);}
 const inter=B.part('hotstage','通风级间环','VENTED INTERSTAGE','上下环框与斜撑组成透空级间段，连接助推器顶部与星舰尾部。',[0,.8,-1.5]);for(const y of [boosterTop+.015,shipBottom-.015])B.tube(inter,r,r-.022,.03,'steel',[0,y,0],'y');for(let i=0;i<32;i++){const a=i*TAU/32;rod(B,inter,[(r-.011)*Math.sin(a),boosterTop+.02,(r-.011)*Math.cos(a)],[(r-.011)*Math.sin(a+.12),shipBottom-.02,(r-.011)*Math.cos(a+.12)],.010,'steel');}
 const ship=B.part('ship','星舰不锈钢船体','SHIP STRUCTURE','上级船体、鼻锥与尾部接口保持共同纵轴。',[1.8,1.2,-.8]);shell(B,ship,r,shipBottom,barrelTop,'steel');
 for(const [start,cut]of [[PI,false],[0,true]]){const m=B.lathe(ship,SHIP_NOSE,'steel',[0,barrelTop,0],'y',start,PI);if(cut)B.cut(m);}
 seams(B,ship,r+.001,Array.from({length:26},(_,i)=>7.32+i*.15));
 const shield=B.part('tiles','迎风面隔热瓦','THERMAL TILES','六边形隔热瓦紧密排布在迎风半侧，鼻部瓦片随轮廓倾斜。',[0,1.5,1.7]);
 const rows=[];for(let row=-9;row<100;row++){const y=7.64+row*.046,h=y-barrelTop,p=h>0?profileAt(SHIP_NOSE,h):{r,slope:0};rows.push({y,r:p.r,slope:p.slope,row});}hexTiles(B,shield,rows,.008);
 const shipTanks=B.part('ship-tanks','星舰内部贮箱','SHIP TANKS','下部与上部容器沿纵轴排列，外壁贴合船体内壁。',[-1.5,1.4,.2]);tank(B,shipTanks,.430,8.60,2.20,'alloy');tank(B,shipTanks,.430,10.325,1.05,'bronze');
 const six=B.part('ship-engines','三台海平面与三台真空发动机','SHIP ENGINES','中心三台海平面发动机与外圈三台大喷管真空发动机连接尾部推力板。',[0,1.2,-2]);B.cylinder(six,.432,.04,'dark',[0,shipBottom+.22,0]);
 for(let i=0;i<3;i++){const a=i*TAU/3;engine(B,six,.06,.29,[.12*Math.sin(a),shipBottom+.20-.29,.12*Math.cos(a)]);engine(B,six,.10,.38,[.29*Math.sin(a+PI/3),shipBottom+.20-.38,.29*Math.cos(a+PI/3)],'vac');}
 const flaps=B.part('flaps','前后四片襟翼','CONTROL FLAPS','两对襟翼位于船体两侧，围绕沿船体轮廓的根部铰轴偏转。',[1.8,2,1.2]),hinges=[];
 const nose0=profileAt(SHIP_NOSE,11.50-barrelTop).r,nose1=profileAt(SHIP_NOSE,11.95-barrelTop).r,noseTilt=Math.atan2(nose0-nose1,.45);
 const flapDefs=[{y:8.10,x:r+.045,tilt:0,len:1.30,shape:[[.02,-.62],[.40,-.66],[.36,.40],[.02,.66]]},{y:11.725,x:(nose0+nose1)/2+.065,tilt:noseTilt,len:Math.hypot(.45,nose0-nose1),shape:[[.02,-.22],[.26,-.20],[.20,.12],[.02,.23]]}];
 for(const d of flapDefs)for(const side of [-1,1]){const mount=subgroup(flaps,[side*d.x,d.y,0]);mount.rotation.set(0,side<0?PI:0,d.tilt);const reach=d.tilt?.09:.07;for(const k of [-.32,.32])B.box(mount,reach-.027,.07,.05,'steel',[-(reach+.027)/2,k*d.len,0],0);
  const h=subgroup(mount);h.name='starship-flap-hinge';B.mesh(h,new T.CylinderGeometry(.025,.025,d.len,24,25),'chrome');panel(B,h,d.shape,.028,'steel',[0,0,0],'xy');panel(B,h,d.shape.map(([x,y])=>[Math.max(x,.035),y*.94]),.008,'black',[0,0,.017*side],'xy');hinges.push({h,side});}
 const equipment=B.part('equipment','船内设备与任务舱','EQUIPMENT','前部隔板承载环形设备盒和任务舱环形结构。',[1.4,2.5,-.2]);B.cylinder(equipment,.432,.03,'titanium',[0,10.92,0]);ringElectronics(B,equipment,.31,11.015);B.tube(equipment,.39,.33,.30,'titanium',[0,11.085,0],'y');
 const raceway=B.part('raceway','外部线槽与安装接头','RACEWAY','线缆槽、接头和接口支座沿背风侧布置。',[-1.5,.5,-1.4]);for(const [y,h]of [[3.55,6.50],[9.35,3.50]]){B.box(raceway,.055,h,.042,'alloy',[0,y,-.462],.008);for(let k=0;k<9;k++)B.box(raceway,.09,.025,.06,'dark',[0,y-h*.46+k*h*.115,-.463],.004);}for(const y of [1.1,6.2,8.0,10.6])B.cylinder(raceway,.045,.07,'chrome',[.30,y,-.34],'z');
 function update(a,e){offsets(B,e);for(let i=0;i<fins.length;i++)fins[i].rotation.z=.07*Math.sin(a*.4+i);for(const {h,side}of hinges)h.rotation.y=.14*Math.sin(a*.35)*side;}
 return {...B,update,inspection:{engineCount:33,shipEngineCount:6,boosterTop,interstageTop:shipBottom,shipBottom,noseTop:barrelTop+1.25,diameter:2*r,flapHinges:hinges.map(h=>h.h),gridHinges:fins}};
}

// 土星五号按NASA新闻参考资料归一化，1单位=10米：S-IC 138英尺、S-II 81.5英尺、S-IVB 58.5英尺、仪器环3英尺、飞船部分82英尺，总高363英尺。
export function buildSaturn(materials){
 const B=makeBuilder(materials),r=.50292,inner=r-.018,fins=[PI/4,3*PI/4,5*PI/4,7*PI/4];
 const s1=B.part('sic','S-IC一级结构','S-IC STRUCTURE','白色蒙皮、底部隔热板、发动机整流罩和环框形成一级外形。',[-1.4,-.5,-1]);shell(B,s1,r,.62,4.20);for(const [y,h]of [[.96,.60],[3.87,.42]])for(let i=0;i<48;i++){const a=i*TAU/48;B.box(s1,.018,h,.015,'airframe',[r*Math.sin(a),y,r*Math.cos(a)],0);}
 B.cylinder(s1,inner+.002,.04,'dark',[0,.60,0]);
 for(const a of fins){const g=subgroup(s1,[.417*Math.sin(a),0,.417*Math.cos(a)]);for(const [st,cut]of [[PI,false],[0,true]]){const m=B.mesh(g,new T.LatheGeometry([[.215,.10],[.215,.40],[.16,.70],[.09,.95],[.035,1.02],[.03,1.02],[.08,.94],[.15,.69],[.20,.40],[.20,.10]].map(p=>new T.Vector2(...p)),16,st,PI),'porcelain');if(cut)B.cut(m);}}
 const markings=B.part('markings','黑白识别条与稳定翼','ROLL MARKINGS','四片稳定翼位于发动机整流罩外侧，黑白纵向条带按45度分区。',[-1.4,.4,1.2]);
 for(const a of fins){const g=subgroup(markings);g.rotation.y=a-PI/2;B.tube(g,r+.005,r-.001,.77,'black',[0,1.02,0],'y',PI/4,PI/4);B.tube(g,r+.005,r-.001,.47,'black',[0,3.96,0],'y',PI/4,PI/4);
  const f=subgroup(markings);f.rotation.y=a-PI/2;panel(B,f,[[.55,.80],[.95,.24],[.95,.10],[.61,.10]],.025,'porcelain',[0,0,0],'xy');}
 const tanks1=B.part('tanks1','一级分隔贮箱','S-IC TANKS','上部氧化剂容器和下部燃料容器沿纵轴排列，外壁贴合箭体内壁。',[1.4,0,.5]);tank(B,tanks1,inner-.001,1.65,1.78,'bronze');tank(B,tanks1,inner-.001,3.25,1.36,'alloy');
 const f1=B.part('f1','五台F-1发动机','F-1 CLUSTER','中央一台与外侧四台构成一级五机布局，顶端连接底部隔热板。',[0,-1.7,0]);engine(B,f1,.185,.579,[0,0,0],'f1');for(const a of fins)engine(B,f1,.185,.579,[.417*Math.sin(a),0,.417*Math.cos(a)],'f1');
 const inter=B.part('interstage','一二级间段','INTERSTAGE','环形级间筒连接相邻级，内侧有纵向加强结构。',[0,.8,-1.5]);shell(B,inter,r,4.20,4.75,'porcelain');for(let i=0;i<36;i++){const a=i*TAU/36;rod(B,inter,[(inner-.006)*Math.sin(a),4.23,(inner-.006)*Math.cos(a)],[(inner-.006)*Math.sin(a),4.72,(inner-.006)*Math.cos(a)],.008,'alloy');}
 const s2=B.part('sii','S-II二级结构','S-II STRUCTURE','二级与一级直径相同，底部推力板承接五台J-2发动机。',[1.5,1.3,-1]);shell(B,s2,r,4.75,6.68);B.cylinder(s2,inner+.002,.03,'dark',[0,4.765,0]);for(const y of [4.90,6.48])for(let i=0;i<44;i++){const a=i*TAU/44;rod(B,s2,[r*Math.sin(a),y-.12,r*Math.cos(a)],[r*Math.sin(a),y+.12,r*Math.cos(a)],.005,'airframe');}
 const tanks2=B.part('tanks2','二级容器与共同隔板','S-II TANKS','下部氧化剂容器与上部燃料容器通过共同隔板区域分隔。',[-1.5,1.6,.8]);tank(B,tanks2,inner-.001,5.22,.65,'alloy');tank(B,tanks2,inner-.001,6.05,.99,'bronze');
 const j2=B.part('j2','五台J-2二级发动机','S-II J-2 ENGINES','二级五台喷管朝向相同，悬挂在级间段内的推力板下方。',[0,1.3,1.7]);for(const [x,z]of [[0,0],[-.23,-.23],[-.23,.23],[.23,-.23],[.23,.23]])engine(B,j2,.10,.34,[x,4.75-.34,z]);
 const transition=B.part('transition','三级后级间段','S-IVB AFT INTERSTAGE','锥形级间段连接二级和三级的不同直径，表面按象限涂黑白方块。',[0,2.0,-1.3]);const cone=[[r,0],[.33,.58],[.313,.58],[r-.018,0]];for(const [st,cut]of [[PI,false],[0,true]]){const m=B.lathe(transition,cone,'porcelain',[0,6.68,0],'y',st,PI);if(cut)B.cut(m);}
 // 四个象限：A全黑，B上黑下白，C上白下黑，D全白。
 for(const [q,hi,lo]of [[0,true,true],[1,true,false],[2,false,true]]){for(const [on,y0,y1]of [[hi,.29,.58],[lo,0,.29]]){if(!on)continue;const ra=r+(.33-r)*y0/.58,rb=r+(.33-r)*y1/.58;B.mesh(transition,new T.LatheGeometry([[ra+.003,y0],[rb+.003,y1]].map(p=>new T.Vector2(...p)),16,fins[q]-PI/4,PI/2),'black',[0,6.68,0]);}}
 const s3=B.part('sivb','S-IVB三级结构','S-IVB STRUCTURE','较细的三级箭体底部推力板承接单台J-2，顶端连接仪器环。',[1.4,2.2,.7]);shell(B,s3,.33,7.26,8.47);B.cylinder(s3,.313,.03,'dark',[0,7.285,0]);for(let i=0;i<24;i++){const a=i*TAU/24;rod(B,s3,[.333*Math.sin(a),7.27,.333*Math.cos(a)],[.333*Math.sin(a),7.60,.333*Math.cos(a)],.005,'airframe');}
 const tanks3=B.part('tanks3','三级内部贮箱','S-IVB TANKS','两个轴向容器分配三级内部空间，外壁贴合箭体内壁。',[-1.3,2.4,-.5]);tank(B,tanks3,.311,7.56,.50,'alloy');tank(B,tanks3,.311,8.08,.63,'bronze');
 const single=B.part('singlej2','三级单台J-2发动机','S-IVB ENGINE','单台发动机与三级中心轴重合，位于锥形级间段内。',[0,2,1.8]);engine(B,single,.10,.34,[0,7.27-.34,0]);
 const iu=B.part('iu','仪器环与控制设备','INSTRUMENT UNIT','圆周设备安装在三级顶端的薄环内。',[0,3.0,-1.6]);B.tube(iu,.33,.26,.09,'porcelain',[0,8.52,0],'y');ringElectronics(B,iu,.275,8.52,10);
 const sla=B.part('sla','飞船适配段四片蒙皮','SPACECRAFT ADAPTER','四片锥形蒙皮下径21英尺8英寸、上径12英尺10英寸，包围登月舱。',[0,3.2,1.5]);for(let i=0;i<4;i++){const m=B.lathe(sla,[[.33,0],[.196,.855],[.180,.855],[.314,0]],'porcelain',[0,8.565,0],'y',i*PI/2,PI/2-.008);if(i<2)B.cut(m);}
 const lm=B.part('lunar','登月舱与支承架','LUNAR MODULE','折叠的支腿、下降级和上升级占据适配段内部。',[1.5,3.3,0]);blanketBox(B,lm,.36,.25,.36,[0,8.82,0],'goldfoil');B.box(lm,.27,.29,.26,'foil',[0,9.08,0]);for(const x of [-1,1])for(const z of [-1,1]){rod(B,lm,[x*.14,8.9,z*.14],[x*.25,8.67,z*.25],.012);B.cylinder(lm,.04,.014,'dark',[x*.25,8.66,z*.25]);rod(B,lm,[x*.25,8.66,z*.25],[x*.215,8.585,z*.215],.010,'alloy');}
 const service=B.part('service','阿波罗服务舱','SERVICE MODULE','服务舱围绕中央轴安装设备、外部喷口和热控表面。',[-1.3,3.8,.5]);shell(B,service,.196,9.42,10.00,'alloy');for(let i=0;i<8;i++){const a=i*TAU/8;B.box(service,.065,.43,.01,i%2?'foil':'airframe',[.19*Math.sin(a),9.70,.19*Math.cos(a)],.004).rotation.y=a;}
 const command=B.part('command','指令舱与防热底部','COMMAND MODULE','锥形返回舱与服务舱上端连接。',[0,4.1,-1.2]);B.lathe(command,[[.196,0],[.19,.055],[.09,.27],[.05,.30],[0,.31]],'chrome',[0,10.00,0]);B.cylinder(command,.196,.025,'black',[0,10.0,0]);
 const tower=B.part('tower','逃逸塔外部结构','ESCAPE TOWER','四根长杆连接塔顶外罩和指令舱上方。',[0,4.6,.8]);for(let i=0;i<4;i++){const a=i*PI/2;rod(B,tower,[.115*Math.sin(a),10.18,.115*Math.cos(a)],[.047*Math.sin(a),10.73,.047*Math.cos(a)],.008,'porcelain');}B.cylinder(tower,.055,.29,'porcelain',[0,10.855,0]);B.cylinder(tower,.055,.06426,'porcelain',[0,11.03213,0],'y',0);
 return {...B,update:(a,e)=>offsets(B,e),inspection:{stage1Engines:5,stage2Engines:5,stage3Engines:1,interfaces:[4.20,4.75,6.68,7.26,8.47,8.565,9.42,10.00],finAngles:fins}};
}

// 联盟号按ESA联盟TMA资料归一化，1单位=1.6米：服务舱长2.26米、基本直径2.15米、最大直径2.72米，返回舱长2.24米、直径2.17米，轨道舱长2.98米、直径2.26米，太阳翼总跨度10.6米、面积10平方米。
export function buildSoyuz(materials){
 const B=makeBuilder(materials),rs=.672,rd=.678,ro=.706,smBase=-2.20,smTop=-.79,dmBase=-.946,dmTop=.454,omBase=.454,omCenter=.454+ro,omTop=.454+2*ro,dockTop=2.316;
 const skirt=y=>.85-(.85-rs)*(y-smBase)/.28;
 const service=B.part('service','仪器推进舱外壳','SERVICE MODULE','服务舱由下部扩口推进段、圆柱仪器段和上部过渡段组成，后部安装太阳翼。',[0,-1.3,-.8]);
 for(const [st,cut]of [[PI,false],[0,true]]){const m=B.lathe(service,[[.85,smBase],[rs,smBase+.28],[rs-.018,smBase+.28],[.832,smBase]],'airframe',[0,0,0],'y',st,PI);if(cut)B.cut(m);}
 shell(B,service,rs,smBase+.28,-1.10,'airframe');for(const [st,cut]of [[PI,false],[0,true]]){const m=B.lathe(service,[[rs,-1.10],[.705,-.95],[.705,smTop],[.690,smTop],[.690,-.95],[rs-.018,-1.10]],'airframe',[0,0,0],'y',st,PI);if(cut)B.cut(m);}
 for(let i=0;i<24;i++){const a=i*TAU/24;rod(B,service,[(rs+.006)*Math.sin(a),-1.86,(rs+.006)*Math.cos(a)],[(rs+.006)*Math.sin(a),-1.16,(rs+.006)*Math.cos(a)],.011,'chrome');}
 B.cylinder(service,skirt(-2.12)-.018,.02,'dark',[0,-2.12,0]);B.tube(service,.692,.55,.012,'dark',[0,dmBase-.006,0],'y');
 const main=B.part('mainengine','主发动机外部喷管','MAIN ENGINE','后部主发动机喷管与船体纵轴重合，顶端连接后封板。',[0,-2,0]);engine(B,main,.09,.22,[0,-2.13-.22,0]);
 const equipment=B.part('equipment','舱内设备与容器','EQUIPMENT','球形容器坐落在推进段底板上，设备盒安装在仪器段隔板上。',[1.3,-1.0,0]);B.cylinder(equipment,rs-.017,.02,'titanium',[0,-1.85,0]);B.cylinder(equipment,rs-.017,.02,'titanium',[0,-1.25,0]);
 for(const x of [-.32,.32])for(const z of [-.28,.28]){ellipsoid(B,equipment,[.19,.23,.19],[x,-1.61,z],'foil');rod(B,equipment,[x,-1.40,z],[x,-1.26,z],.02,'titanium');}ringElectronics(B,equipment,.44,-1.16,8);
 const descent=B.part('descent','返回舱蒙皮','DESCENT MODULE','钟形返回舱底部嵌入服务舱上部过渡段，顶部舱口连接轨道舱。',[-1.4,.3,.7]);
 const dmProfile=[[rd,-.92],[.676,-.80],[.645,-.55],[.58,-.20],[.49,.10],[.40,.32],[.34,.42],[.32,dmTop],[.30,.43],[.32,.40],[.38,.30],[.47,.09],[.56,-.20],[.625,-.55],[.656,-.80],[.658,-.92]];
 for(const [start,cut]of [[PI,false],[0,true]]){const m=B.lathe(descent,dmProfile,'foil',[0,0,0],'y',start,PI);if(cut)B.cut(m);}B.torus(descent,rd,.012,'steel',[0,-.92,0],'y');B.tube(descent,.32,.26,.11,'airframe',[0,dmTop,0],'y');
 const heat=B.part('heatshield','返回舱防热底部','HEAT SHIELD','宽底部与返回舱周缘接合，落在服务舱过渡段支承环上。',[0,-.6,1.5]);B.lathe(heat,[[0,dmBase],[.66,dmBase],[rd,-.940],[rd,-.918],[0,-.93]],'dark');
 const crew=B.part('crew','三人座椅与仪表','CREW CABIN','三套座椅并排安装在舱底地板上，仪表板位于乘员前上方。',[1.5,.4,-.5]);B.cylinder(crew,.656,.02,'alloy',[0,-.85,0]);seats(B,crew,3,-.66,0,.34);
 B.box(crew,.70,.17,.11,'dark',[0,-.06,.25]);for(const x of [-.22,0,.22])B.box(crew,.17,.11,.015,'screen',[x,-.06,.31],.003);for(const x of [-.30,.30])rod(B,crew,[x,-.14,.25],[x,-.84,.25],.016,'titanium');
 const orbital=B.part('orbital','球形轨道舱','ORBITAL MODULE','前部球形空间经舱口通道连接返回舱，顶部连接对接机构。',[0,1.5,-1.3]);B.mesh(orbital,new T.SphereGeometry(ro,48,28,PI,PI),'foil',[0,omCenter,0]);B.cut(B.mesh(orbital,new T.SphereGeometry(ro,48,28,0,PI),'foil',[0,omCenter,0]));B.tube(orbital,.31,.24,.10,'airframe',[0,omTop-.04,0],'y');
 const habitat=B.part('habitat','轨道舱设备与舱口','ORBITAL INTERIOR','设备架立在舱内隔板上，侧面舱口嵌在球壳上。',[-1.5,1.2,.8]);B.cylinder(habitat,ro-.0015,.03,'alloy',[0,omCenter-.10,0]);for(const s of [-1,1])blanketBox(B,habitat,.16,.37,.36,[s*.39,omCenter-.085+.185,0],'foil');B.tube(habitat,.23,.17,.06,'airframe',[0,omCenter+.12,ro-.02],'z');B.cylinder(habitat,.17,.02,'dark',[0,omCenter+.12,ro+.005],'z');
 const docking=B.part('docking','对接机构与探杆','DOCKING INTERFACE','对接环框、机构筒和探杆保持共同轴线。',[0,2.0,.8]);B.cylinder(docking,.20,dockTop-omTop-.06,'dark',[0,(omTop+dockTop-.06)/2,0]);B.tube(docking,.31,.20,.06,'airframe',[0,dockTop-.03,0],'y');B.cylinder(docking,.025,.44,'chrome',[0,dockTop+.14,0]);ellipsoid(B,docking,[.06,.055,.06],[0,dockTop+.38,0],'alloy');B.bolts(docking,Array.from({length:12},(_,i)=>[.26*Math.sin(i*TAU/12),dockTop,.26*Math.cos(i*TAU/12)]),'y',.016);
 const span=3.3125,boom=.1715,panelW=.60,chord=.81,gap=.02,wings=[];
 for(const side of [-1,1]){const g=B.part(side<0?'solar0':'solar1',side<0?'左太阳翼':'右太阳翼','SOLAR ARRAY','四块电池板经根部支杆连接服务舱，两翼总跨度10.6米。',[side*1.6,0,0]),mount=subgroup(g,[side*rs,-1.70,0]);mount.rotation.y=side<0?PI:0;B.box(mount,.06,.10,.12,'titanium',[0,0,0],0);
  const hinge=subgroup(mount);hinge.name='soyuz-solar-hinge';rod(B,hinge,[.03,0,0],[boom,0,0],.025);
  for(let j=0;j<4;j++){const p=subgroup(hinge,[boom+panelW/2+j*(panelW+gap),0,0]);solarPanel(B,p,panelW,chord,6,8);if(j)for(const z of [-.25,.25])B.box(hinge,gap+.02,.03,.06,'titanium',[boom+j*(panelW+gap)-gap/2,0,z],0);}wings.push(hinge);}
 const antennas=B.part('antennas','交会天线与传感器','RENDEZVOUS','交会天线支杆从轨道舱球壳伸出，服务舱侧面安装传感器杆。',[1.2,1.7,1.3]);const ka=.87,kp=[ro*Math.sin(ka),omCenter+ro*Math.cos(ka),0];rod(B,antennas,kp.map((v,i)=>v*(i===1?1:.92)+(i===1?-.02:0)),[.95,omCenter+.75,0],.015);B.cylinder(antennas,.03,.11,'titanium',[.95,omCenter+.75,.045],'z');dish(B,antennas,.23,[.95,omCenter+.75,0]);for(const s of [-1,1])rod(B,antennas,[s*.45,-1.4,-.45],[s*.88,-1.5,-.70],.012);
 const thrusters=B.part('thrusters','姿态控制外部组件','ATTITUDE HARDWARE','小型喷口成组安装在服务舱圆柱段外侧。',[-1.3,-1.2,1.1]);for(let i=0;i<8;i++){const a=(i+.5)*TAU/8;B.cylinder(thrusters,.04,.15,'dark',[rs*Math.sin(a),-1.80,rs*Math.cos(a)],'y',.065);}
 B.root.traverse(o=>{if(o.material&&o.userData.materialKey==='foil'&&['descent','orbital','habitat'].includes(o.userData.part)&&!o.isInstancedMesh){o.material.color.setHex(0x8d978b);o.material.metalness=.25;o.material.roughness=.62;}});
 return {...B,update:(a,e)=>offsets(B,e),inspection:{modules:['service','descent','orbital'],wings,smBase,smTop,dmBase,dmTop,omBase,omTop,dockTop,span,unit:1.6}};
}

// 龙飞船按SpaceX官网总高8.1米、直径4米归一化，1单位约2.44米；返回舱与后备舱高度分配为网页补全。
const DRAGON_OUTER=[[.82,-.10],[.82,.04],[.79,.35],[.69,.67],[.53,1.03],[.34,1.45],[.30,1.63]],DRAGON_INNER=[[.80,-.10],[.80,.04],[.77,.33],[.67,.65],[.51,1.01],[.32,1.43],[.28,1.63]];
const radiusAt=(profile,y)=>{const pts=[...profile].sort((a,b)=>a[1]-b[1]);if(y<=pts[0][1])return pts[0][0];for(let i=1;i<pts.length;i++)if(y<=pts[i][1]){const a=pts[i-1],b=pts[i];return a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]);}return pts.at(-1)[0];};
export function buildDragon(materials){
 const B=makeBuilder(materials),r=.82,trunkBase=-1.37,trunkTop=-.13,capTop=1.63;
 const trunk=B.part('trunk','非加压后备舱','TRUNK','后备舱承力筒连接返回舱，外表面一半为太阳能电池、一半为散热器。',[0,-1.4,-1.0]);shell(B,trunk,r,trunkBase,trunkTop,'airframe');for(const y of [trunkBase+.04,-.75,trunkTop-.05])B.torus(trunk,r,.017,'alloy',[0,y,0],'y');
 const solar=B.part('solar','贴体太阳能电池','BODY SOLAR ARRAY','电池片覆盖后备舱的一半，不使用外伸太阳翼。',[-1.3,-.8,1.2]),cells=[],wires=[];for(let j=0;j<20;j++)for(let k=0;k<15;k++){const a=-PI/2+(j+.5)*PI/20,y=-1.30+(k+.5)*1.10/15;cells.push({p:[(r+.007)*Math.sin(a),y,(r+.007)*Math.cos(a)],r:[0,a,0]});wires.push({p:[(r+.0145)*Math.sin(a),y,(r+.0145)*Math.cos(a)],r:[0,a,0]});}B.instances(solar,new T.BoxGeometry(.105,.066,.012),'solar',cells);B.instances(solar,new T.BoxGeometry(.004,.060,.004),'bronze',wires);
 const radiator=B.part('radiator','半圆散热表面与尾部鳍片','RADIATOR & FINS','另一半热控面与尾部四片鳍片沿筒体分布。',[1.4,-1,.2]);for(let j=0;j<24;j++){const a=PI/2+(j+.5)*PI/24,gr=subgroup(radiator,[r*Math.sin(a),-.75,r*Math.cos(a)]);gr.rotation.y=a;B.box(gr,.08,1.0,.015,'porcelain',[0,0,0],.002);B.box(gr,.005,.94,.02,'chrome',[0,0,.01],0);}
 for(let j=0;j<4;j++){const g=subgroup(radiator);g.rotation.y=j*PI/2;panel(B,g,[[.80,-1.33],[1.06,-1.37],[.88,-.55],[.80,-.55]],.02,'airframe',[0,0,0],'xy');}
 const frame=B.part('frame','返回舱承架与压力壳','PRESSURE STRUCTURE','内部环框贴合舱壁，纵向支杆连接上下环框。',[0,.2,-1.5]),rings=[[-.07,0],[.40,0],[1.0,0],[1.58,0]].map(([y])=>[y,radiusAt(DRAGON_INNER,y)-.012]);for(const [y,rad]of rings)B.torus(frame,rad,.025,'titanium',[0,y,0],'y');for(let j=0;j<8;j++){const a=j*TAU/8,[y0,r0]=rings[0],[y1,r1]=rings[3];rod(B,frame,[r0*Math.sin(a),y0,r0*Math.cos(a)],[r1*Math.sin(a),y1,r1*Math.cos(a)],.015,'alloy');}
 const capsule=B.part('capsule','白色返回舱外壳','CAPSULE','锥形返回舱具有圆弧肩部和侧面舱口。',[-1.5,.4,-.8]);for(const [st,cut]of [[PI,false],[0,true]]){const m=B.lathe(capsule,[...DRAGON_OUTER,...[...DRAGON_INNER].reverse()],'porcelain',[0,0,0],'y',st,PI);if(cut)B.cut(m);}
 const heat=B.part('heatshield','返回防热大底','HEAT SHIELD','弧形防热底部安装在返回舱下缘，下沿嵌入后备舱顶端。',[0,-.4,1.7]);B.lathe(heat,[[0,-.21],[.45,-.20],[.78,-.14],[.82,-.10],[.81,-.075],[0,-.15]],'dark');
 const docking=B.part('docking','前端对接机构外形','DOCKING RING','前端环框位于可翻转鼻锥内部。',[0,1.7,.8]);B.tube(docking,.29,.21,.13,'titanium',[0,1.67,0],'y');B.bolts(docking,Array.from({length:12},(_,i)=>[.25*Math.sin(i*TAU/12),1.735,.25*Math.cos(i*TAU/12)]),'y',.016);
 const hingeZ=-.355,nose=B.part('nose','翻转鼻锥','HINGED NOSE CONE','鼻锥绕后侧铰轴打开，露出前端对接口。',[1.2,1.9,-.2]);for(const x of [-.10,.10])B.box(nose,.04,.05,.061,'steel',[x,capTop-.026,-.3005],0);
 const hinge=subgroup(nose,[0,capTop,hingeZ]);hinge.name='dragon-nose-hinge';const pin=B.mesh(hinge,new T.CylinderGeometry(.022,.022,.30,24,30),'chrome',[0,0,0],[0,0,PI/2]);pin.name='dragon-nose-pin';
 B.lathe(hinge,[[.315,0],[.305,.11],[.26,.21],[.16,.29],[0,.321]],'porcelain',[0,0,-hingeZ]);for(const x of [-.035,.035])rod(B,hinge,[x,0,0],[x,.02,.05],.012,'steel');
 const crew=B.part('crew','四人座椅与舱内承架','CREW SEATING','四套座椅安装在舱底地板上，带固定头枕和约束带。',[1.7,.6,-.3]);B.cylinder(crew,.74,.02,'alloy',[0,-.12,0]);seats(B,crew,4,.04,-.04,.34);
 const controls=B.part('controls','触摸显示与面板','CREW DISPLAYS','三块显示面板安装在乘员前方，面板两端固定在舱壁。',[0,1.3,1.4]);B.box(controls,1.10,.32,.09,'dark',[0,.79,.28]);for(const x of [-.33,0,.33])B.box(controls,.29,.23,.01,'screen',[x,.8,.333],.008);for(let i=0;i<9;i++)B.cylinder(controls,.014,.014,'chrome',[-.43+i*.106,.61,.337],'z');
 const windows=B.part('windows','舷窗与侧面舱门','WINDOWS & HATCH','两扇侧舷窗和舱门舷窗沿返回舱外表面安装。',[-1.4,.8,1.1]);for(const s of [-1,1]){const g=subgroup(windows,[s*.61,.77,.25]);g.rotation.y=s*.95;B.box(g,.22,.22,.04,'dark',[0,0,0]);B.box(g,.18,.18,.012,'glass',[0,0,.03],.045);}B.tube(windows,.24,.21,.045,'airframe',[0,.38,-.79],'z');B.cylinder(windows,.21,.02,'porcelain',[0,.38,-.82],'z');B.tube(windows,.095,.073,.025,'dark',[0,.45,-.835],'z');B.cylinder(windows,.073,.012,'glass',[0,.45,-.84],'z');
 const systems=B.part('systems','电源与环境设备','CABIN SYSTEMS','设备盒、通风管和下部供电模块固定在舱底地板与环框之间。',[1.4,-.2,-1.4]);for(const x of [-.42,.42]){blanketBox(B,systems,.24,.25,.45,[x,.015,-.38],'foil');B.path(systems,[[x,.13,-.35],[x,.54,-.40],[x*.95,.99,-.22]],.028,'alloy');}for(let i=0;i<4;i++)B.box(systems,.25,.07,.24,'circuit',[(i%2?1:-1)*.25,-.075,(i<2?1:-1)*.30],.005);
 const pods=B.part('pods','外部推进舱与小喷口','EXTERNAL PODS','四组外部罩壳各含两台逃逸发动机喷口，沿返回舱下侧分布。',[-1.5,-.3,-1.5]);for(let i=0;i<4;i++){const a=i*PI/2+PI/4,g=subgroup(pods,[.73*Math.sin(a),.19,.73*Math.cos(a)]);g.rotation.y=a;ellipsoid(B,g,[.12,.32,.12],[0,0,0],'porcelain');for(const x of [-.055,.055])B.cylinder(g,.028,.09,'dark',[x,-.14,.10],'z',.045);}
 const chutes=B.part('parachutes','上部回收设备盒','RECOVERY EQUIPMENT','两具减速伞与四具主伞的收纳包固定在前部隔板上。',[0,2.2,-1.1]);B.cylinder(chutes,rings[2][1],.025,'titanium',[0,1.0,0]);for(const x of [-.21,.21])blanketBox(B,chutes,.26,.22,.26,[x,1.1225,-.15],'foil');
 function update(a,e){offsets(B,e);hinge.rotation.x=-1.05-.18*Math.sin(a*.25);}
 return {...B,update,inspection:{noseHinge:hinge,trunkTop,capsuleBottom:trunkTop,solarCells:cells.length,trunkBase,noseTop:capTop+.321,diameter:2*r}};
}
