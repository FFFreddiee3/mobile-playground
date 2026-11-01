import * as T from '#three';
import {makeBuilder,TAU,bladeGeometry} from '#geometry';
import {subgroup,offsets,panel,rod,ellipsoid} from '#vehicle-kit';
import {trackPose,circleJoint} from '#mechanism-kit';
const PI=Math.PI;
const rot=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
// 凸包：销耳板、连杆板等外形由销孔圆与安装边的点集求得。
function hull(points){const p=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lower=[],upper=[];for(const q of p){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),q)<=0)lower.pop();lower.push(q);}for(const q of p.reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),q)<=0)upper.pop();upper.push(q);}return lower.slice(0,-1).concat(upper.slice(0,-1));}
const circle=(c,r,n=20)=>Array.from({length:n},(_,i)=>[c[0]+r*Math.cos(i*TAU/n),c[1]+r*Math.sin(i*TAU/n)]);
// xy 轮廓沿 z 拉伸成板，z 为板中面。
function slab(B,g,points,t,mat,z=0,holes=[]){const shape=new T.Shape(points.map(p=>new T.Vector2(...p)));for(const [x,y,r]of holes){const h=new T.Path();h.absarc(x,y,r,0,TAU,true);shape.holes.push(h);}const geo=new T.ExtrudeGeometry(shape,{depth:t,bevelEnabled:false,curveSegments:24,steps:1});geo.translate(0,0,z-t/2);return B.mesh(g,geo,mat);}
// 沿板件上缘折线外移一个管半径的油管。
function pipeAlong(B,g,line,r,z,mat='steel'){const pts=line.map((p,i)=>{const a=line[Math.max(0,i-1)],b=line[Math.min(line.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);return[p[0]-dy/l*(r+.0005),p[1]+dx/l*(r+.0005),z];});for(let i=0;i<pts.length-1;i++)rod(B,g,pts[i],pts[i+1],r,mat);for(const p of pts.slice(1,-1))B.mesh(g,new T.SphereGeometry(r,12,8),mat,p);}
// 绕 z 轴的回转实体，profile 为 [半径, 轴向] 闭合轮廓（含内孔）。
function revolve(B,g,profile,mat,pos=[0,0,0],segments=32){const geo=new T.LatheGeometry([...profile,profile[0]].map(p=>new T.Vector2(p[0],p[1])),segments).rotateX(PI/2);return B.mesh(g,geo,mat,pos);}
// 两端销孔中心距固定的刚性杆，局部 +Y 指向远端销；在不转动的平面坐标中设置，销轴方向保持为局部 z。
function rigidLink(B,parent,length){const g=subgroup(parent),v=new T.Vector3(),up=new T.Vector3(0,1,0);return{group:g,length,set(a,b){g.position.set(...a);v.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);g.quaternion.setFromUnitVectors(up,v.normalize());}};}
// 沿两点方向放置的长方板。
function beam(B,g,a,b,h,d,mat,z=0,bevel=.003){const m=B.box(g,Math.hypot(b[0]-a[0],b[1]-a[1]),h,d,mat,[(a[0]+b[0])/2,(a[1]+b[1])/2,z],bevel);m.rotation.z=Math.atan2(b[1]-a[1],b[0]-a[0]);return m;}
function tintModel(B,table){B.root.traverse(o=>{const t=o.material&&table[o.userData.materialKey];if(!t)return;o.material.color.setHex(t[0]);o.material.metalness=t[1];o.material.roughness=t[2];});}

// 挖掘机比例取自 Caterpillar 320 液压挖掘机技术规格书（5.7 m 动臂对应模型 2.35）。见 sources.md。
const EXC_S=2.35/5.7;
export const EXCAVATOR={scale:EXC_S,ground:.044,half:3.65*EXC_S/2,teeth:11,shoes:46,trackZ:2.38*EXC_S/2,shoeWidth:.79*EXC_S,
 q0:[.28,.78],bcBase:[.638,.598],bcRod:[1.119,-.135],acBase:[1.411,.355],acRod:[-.376,.138],kcBase:[.601,.185],d:[-.331,.068],ear:[.127,.262],
 boom:2.35,stick:1.7,rocker:.35,coupler:.48,linkZ:.26,twinZ:.27,
 cylinders:[{r:.031,stroke:1.260*EXC_S,z:-.27},{r:.036,stroke:1.504*EXC_S,z:.22},{r:.031,stroke:1.104*EXC_S,z:.22}]};
// 链轮节圆按 11 齿与 46 节履带的整数啮合求得，节距沿闭合路径等分。
EXCAVATOR.r=4*EXCAVATOR.teeth*EXCAVATOR.half/(TAU*(EXCAVATOR.shoes-EXCAVATOR.teeth));
for(const c of EXCAVATOR.cylinders)c.barrel=c.stroke+.08;
export function excavatorPose(a){
 const E=EXCAVATOR,yaw=.28*Math.sin(a*.18),b=.819+.228*Math.sin(a*.39),s=-1.199+.273*Math.sin(a*.39+3.756),k=-1.569+.596*Math.sin(a*.39+2.71);
 const q0=E.q0,q1=add(q0,rot([E.boom,0],b)),q2=add(q1,rot([E.stick,0],s));
 const d=add(q2,rot(E.d,s)),ear=add(q2,rot(E.ear,k)),joint=circleJoint(d,ear,E.rocker,E.coupler);
 return{yaw,b,s,k,q0,q1,q2,d,ear,joint,cylinders:[[E.bcBase,add(q0,rot(E.bcRod,b))],[add(q0,rot(E.acBase,b)),add(q1,rot(E.acRod,s))],[add(q1,rot(E.kcBase,s)),joint]]};
}
// 履带节：外侧履带板与三道齿，内侧两条链轨节，前端套筒与下一节链轨重叠形成铰接。
function crawlerTrack(B,parent,z,half,r,n,width,mat){
 const length=4*half+TAU*r,pitch=length/n,shoes=[];
 const plateGeo=new T.BoxGeometry(pitch*.965,.005,width),grouserGeo=new T.BoxGeometry(.007,.011,width*.99),bushGeo=new T.CylinderGeometry(.0125,.0125,.075,12).rotateX(PI/2);// 衬套夹在两片链板内侧之间，端面各留0.0015间隙，不穿过相邻履带板的链板。

 const railGeo=new T.ExtrudeGeometry(new T.Shape([[-(pitch/2-.001),.020],[pitch/2-.001,.020],[pitch/2-.012,-.034],[-(pitch/2-.012),-.034]].map(p=>new T.Vector2(...p))),{depth:.022,bevelEnabled:false,steps:1});railGeo.translate(0,0,-.011);
 for(let i=0;i<n;i++){const g=new T.Bone();g.userData.part=parent.userData.part;g.name='track-shoe';parent.add(g);
  B.mesh(g,plateGeo,mat,[0,.0225,0]);for(const x of [-.3*pitch,0,.3*pitch])B.mesh(g,grouserGeo,mat,[x,.0305,0]);for(const zz of [-.05,.05])B.mesh(g,railGeo,mat,[0,0,zz]);B.mesh(g,bushGeo,mat,[pitch/2,0,0]);shoes.push(g);}
 function update(distance){shoes.forEach((g,i)=>{const p=trackPose(i*pitch+distance,half,r);g.position.set(p.x,p.y+r+.08,z);g.rotation.z=p.angle;});}
 const batch={parent,bones:shoes,half,r,z};(B.rigidBatches??=[]).push(batch);update(0);return{shoes,update,pitch,length,r,half,z,batch};
}
const ROLLER=[[.0155,-.073],[.052,-.073],[.052,-.063],[.040,-.063],[.040,-.037],[.030,-.037],[.030,.037],[.040,.037],[.040,.063],[.052,.063],[.052,.073],[.0155,.073]];
const CARRIER=[[.0125,-.075],[.042,-.075],[.042,-.064],[.032,-.064],[.032,-.037],[.026,-.037],[.026,.037],[.032,.037],[.032,.064],[.042,.064],[.042,.075],[.0125,.075]];
const IDLER=[[.0315,-.08],[.09,-.08],[.09,-.063],[.115,-.063],[.115,-.03],[.132,-.03],[.132,.03],[.115,.03],[.115,.063],[.09,.063],[.09,.08],[.0315,.08]];
// 链轮盘体，轮毂朝车体内侧伸向行走减速器。
const sprocketProfile=side=>{const p=[[.0315,-.070],[.090,-.070],[.090,-.025],[.112,-.025],[.112,.025],[.0315,.025]];return side>0?p:p.map(([r,z])=>[r,-z]).reverse();};
// 空心缸筒油缸：接口与套件 hydraulicCylinder 相同（group 在缸底销、tip 在杆端销、局部 +Y 指向杆端）。
// 缸筒为带缸底的管，缸口导向套留 0.0015 径向间隙；活塞杆与活塞固定在杆端，随销距在缸膛内滑动，不穿过缸底或导向套。
// stroke 为规格书行程；销距须在 [barrel+.075, barrel+.045+stroke] 内，活塞两端各留至少 0.0015。
function hollowCylinder(B,parent,barrelLength,r,stroke){const g=subgroup(parent),tip=subgroup(g),ram=subgroup(tip),bore=r*.62,rodR=r*.47,rodLength=stroke+.105;
 B.cylinder(g,r*.65,r*2.2,'steel',[0,0,0],'z',r*.65,24);B.tube(g,r*.77,r*.35,r*2.3,'chrome',[0,0,0],'z');B.cylinder(g,r,.03,'orangepaint',[0,.015,0],'y',r,32);
 B.tube(g,r,bore,barrelLength-.03,'orangepaint',[0,(barrelLength+.03)/2,0],'y');B.tube(g,bore,rodR+.0015,.03,'steel',[0,barrelLength-.015,0],'y');
 for(const y of [.06,barrelLength-.035])B.tube(g,r*1.13,r,.055,'dark',[0,y,0],'y');B.path(g,[[r+.0125,.10,0],[r+.0125,barrelLength-.10,0]],.012,'black');
 B.cylinder(tip,r*.66,r*2.2,'steel',[0,0,0],'z',r*.66,24);B.tube(tip,r*.77,r*.35,r*2.3,'chrome',[0,0,0],'z');
 B.cylinder(ram,rodR,rodLength-r*.5,'chrome',[0,-(rodLength+r*.5)/2,0],'y',rodR,24);B.cylinder(ram,bore-.0015,.01,'steel',[0,-rodLength+.005,0],'y',bore-.0015,24);
 const v=new T.Vector3(),up=new T.Vector3(0,1,0);
 return{group:g,ram,tip,barrelLength,stroke,rodLength,set(a,b){g.position.set(...a);v.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=v.length();g.quaternion.setFromUnitVectors(up,v.normalize());tip.position.set(0,length,0);}};}
// 油缸耳环宽 2.3r，耳板与耳环端面留 0.0015 间隙。
const lug=(r,t=.015)=>r*1.15+.0015+t/2;
export function buildExcavator(materials){
 const B=makeBuilder(materials),E=EXCAVATOR,wheels=[],tracks=[],r=E.r,half=E.half,yc=.08+r;
 // 下部底架：中心架、两侧箱形履带架、驱动马达壳、导向轮叉与支重轮支架。
 const base=B.part('undercarriage','下部底架与履带架','UNDERCARRIAGE','中心架连接两侧箱形履带架，行走马达、导向轮叉和支重轮支架都固定在履带架上。',[0,-.9,0]);
 B.box(base,.84,.13,.80,'dark',[0,.3043,0],.02);for(const z of [-.415,.415])B.box(base,.84,.05,.07,'dark',[0,.2355,z],.004);
 const rollerX=Array.from({length:8},(_,i)=>-.57+i*1.14/7);
 for(const side of [-1,1]){const zc=side*E.trackZ;
  B.box(base,1.20,.058,.155,'dark',[.01,.2395,zc],.002);B.box(base,.06,.058,.191,'dark',[.58,.2395,zc],.004);
  for(const x of rollerX){for(const s of [-1,1])B.box(base,.056,.075,.014,'dark',[x,.1775,zc+s*.0825],.004);B.cylinder(base,.014,.177,'steel',[x,.1555,zc],'z',.014,16);}
  for(const x of [-.30,.30]){B.box(base,.05,.075,.028,'dark',[x,.2975,zc-side*.0915],.004);B.cylinder(base,.011,.1845,'steel',[x,.3136,zc-side*.01425],'z',.011,16);}
  for(const s of [-1,1])B.box(base,.25,.05,.014,'dark',[.675,yc,zc+s*.0895],.004);B.cylinder(base,.030,.191,'steel',[half,yc,zc],'z',.03,24);
  B.cylinder(base,.115,.0885,'dark',[-half,yc,zc-side*.11575],'z');B.cylinder(base,.03,.19,'steel',[-half,yc,zc-side*.065],'z',.03,24);B.box(base,.175,.06,.086,'dark',[-.6725,.30,zc-side*.117],.004);
  B.bolts(base,Array.from({length:10},(_,i)=>[-half+.085*Math.cos(i*TAU/10),yc+.085*Math.sin(i*TAU/10),zc-side*.161]),'z',.008);
 }
 for(const side of [-1,1]){
  const belt=B.part(side<0?'track0':'track1',side<0?'左履带链':'右履带链','TRACK CHAIN','46节链轨与三齿履带板沿闭合路径循环，套筒落在链轮齿间。',[0,-.25,side*1.4]);tracks.push(crawlerTrack(B,belt,side*E.trackZ,half,r,E.shoes,E.shoeWidth,'cast'));
  const rollers=B.part(side<0?'rollers0':'rollers1',side<0?'左行走轮系':'右行走轮系','TRAVEL WHEELS','后部链轮、前部导向轮、8个支重轮与2个托链轮绕固定轴转动。',[0,.2,side*1.9]),zc=side*E.trackZ;
  const sprocket=subgroup(rollers,[-half,yc,zc]);sprocket.name='excavator-sprocket';revolve(B,sprocket,sprocketProfile(side),'dark',[0,0,0],40);
  const tooth=new T.ExtrudeGeometry(new T.Shape([[.108,-.22],[.135,-.17],[.148,-.08],[.148,.08],[.135,.17],[.108,.22]].map(([q,a])=>new T.Vector2(q*Math.cos(a),q*Math.sin(a)))),{depth:.05,bevelEnabled:false,steps:1});tooth.translate(0,0,-.025);
  const phase=-PI/2+(4*half+PI*r)/r;B.instances(sprocket,tooth,'cast',Array.from({length:E.teeth},(_,k)=>({p:[0,0,0],r:[0,0,phase+k*TAU/E.teeth]})));wheels.push({g:sprocket,r});
  const idler=subgroup(rollers,[half,yc,zc]);idler.name='excavator-idler';revolve(B,idler,IDLER,'dark',[0,0,0],48);wheels.push({g:idler,r});
  for(const x of rollerX){const g=subgroup(rollers,[x,.1555,zc]);g.name='excavator-roller';revolve(B,g,ROLLER,'dark');wheels.push({g,r:.040});}
  for(const x of [-.30,.30]){const g=subgroup(rollers,[x,.3136,zc]);g.name='excavator-carrier';revolve(B,g,CARRIER,'dark');wheels.push({g,r:.032});}
 }
 const slew=B.part('slew','回转支承','SLEW BEARING','外圈螺栓固定在中心架上，上部平台在内圈上方绕中心回转。',[0,.9,0]);B.tube(slew,.26,.19,.0812,'steel',[0,.4099,0],'y');B.tube(slew,.30,.25,.02,'dark',[0,.3793,0],'y');B.bolts(slew,Array.from({length:24},(_,i)=>[.275*Math.sin(i*TAU/24),.392,.275*Math.cos(i*TAU/24)]),'y',.008);
 // 上部平台：平台底板、动臂座、动臂缸支座和尾部配重（尾部回转半径 2830 mm）。
 const upper=B.part('platform','上部平台、动臂座与配重','UPPER CARRIAGE','平台底板承托驾驶室、发动机舱和油箱，前端动臂座和油缸支座与底板焊成一体，尾部配重按规格书回转半径布置。',[-1.5,1.0,-.5]);
 B.box(upper,1.33,.088,1.146,'orangepaint',[-.04,.4975,0],.003);B.box(upper,.18,.088,.68,'orangepaint',[.69,.4975,0],.003);
 const arc=Array.from({length:13},(_,i)=>{const t=-.503+i*1.006/12;return[-1.16*Math.cos(t),1.16*Math.sin(t)];});panel(B,upper,[[-.69,-.565],...arc,[-.69,.565]],.4726,'orangepaint',[0,.7137,0],'xz');
 for(const z of [-.1408,.1408])slab(B,upper,[[.08,.53],[.48,.53],[.40,.74],[.34,.83],[.28,.855],[.20,.82],[.14,.74]],.018,'orangepaint',z);
 B.cylinder(upper,.032,.32,'steel',E.q0.concat(0),'z',.032,24);for(const z of [-.159,.159])B.cylinder(upper,.045,.02,'steel',[...E.q0,z],'z',.045,24);
 for(const zc of [-.27,.27])for(const z of [zc-lug(.031),zc+lug(.031)])slab(B,upper,hull(circle(E.bcBase,.042).concat([[.56,.53],[.72,.53]])),.015,'orangepaint',z);
 // 驾驶室（左前）
 const cab=B.part('cab','驾驶室框架与玻璃','OPERATOR CAB','左前驾驶室的立柱、顶板、门框与四面玻璃安装在平台底板上，顶高按规格书2960 mm。',[-1.2,1.5,-1.0]),cabTop=1.265;
 B.box(cab,.68,.03,.395,'dark',[.12,.555,-.3755],.006);for(const x of [-.205,.445])for(const z of [-.555,-.195])B.box(cab,.03,cabTop-.57-.03,.03,'dark',[x,(cabTop+.57)/2-.015,z],.006);
 B.box(cab,.70,.03,.415,'dark',[.12,cabTop-.015,-.3755],.01);B.box(cab,.66,.10,.006,'dark',[.12,.62,-.566],.004);B.box(cab,.66,.10,.006,'dark',[.12,.62,-.183],.004);B.box(cab,.006,.10,.36,'dark',[.452,.62,-.368],.003);
 B.box(cab,.62,.55,.008,'glass',[.12,.95,-.566],.003);B.box(cab,.62,.55,.008,'glass',[.12,.95,-.183],.003);B.box(cab,.008,.58,.35,'glass',[.452,.96,-.368],.003);B.box(cab,.03,.62,.35,'dark',[-.205,.94,-.368],.004);
 B.box(cab,.012,.012,.36,'black',[.458,1.10,-.368],.002);rod(B,cab,[.30,.68,-.574],[.30,1.12,-.574],.006,'chrome');B.box(cab,.10,.025,.012,'lamp',[.40,cabTop-.045,-.57],.003);
 const control=B.part('controls','座椅、操纵台与显示器','CAB CONTROLS','座椅与两侧操纵台固定在驾驶室地板上，操纵手柄位于扶手前端。',[-1.6,1.7,.2]);
 B.box(control,.20,.06,.20,'black',[.06,.62,-.368],.01);B.box(control,.06,.24,.20,'black',[-.06,.78,-.368],.012);B.box(control,.06,.02,.04,'dark',[.05,.60,-.368],.003);
 for(const z of [-.50,-.235]){B.box(control,.24,.10,.06,'dark',[.08,.62,z],.008);rod(B,control,[.16,.67,z],[.17,.74,z],.007,'black');}B.box(control,.012,.08,.10,'screen',[.40,.80,-.24],.003);rod(B,control,[.36,.57,-.24],[.40,.76,-.24],.006,'dark');
 // 动力舱与油箱（右前）
 const power=B.part('power','发动机舱、油箱与扶手','POWER & TANKS','发动机罩、散热格栅和排气管位于配重前方，右前侧为液压油箱和燃油箱，顶部扶手按规格书高度布置。',[1.3,1.3,-1.0]);
 B.box(power,.47,.48,1.12,'orangepaint',[-.455,.78,0],.03);for(let i=0;i<9;i++)B.box(power,.012,.30,.006,'dark',[-.62+i*.035,.80,-.563],.002);B.cylinder(power,.022,.16,'hotmetal',[-.40,1.10,.30]);B.cylinder(power,.03,.02,'dark',[-.40,1.03,.30]);
 B.box(power,.36,.46,.37,'orangepaint',[-.02,.77,.375],.02);B.box(power,.38,.38,.37,'orangepaint',[.36,.73,.375],.02);B.cylinder(power,.03,.03,'dark',[.36,.935,.40]);
 for(const z of [.52])for(const [a,b]of [[[-.15,1.0,z],[-.15,1.26,z]],[[.50,.92,z],[.50,1.26,z]],[[-.15,1.26,z],[.50,1.26,z]]])rod(B,power,a,b,.008,'dark');
 // 液压阀块与软管（不随动臂转动的部分止于动臂座侧板）
 const hoses=B.part('hoses','主控阀与平台软管','VALVE & HOSES','主控阀固定在动臂座后方，平台软管沿动臂座两侧板接到油缸与动臂管路接头。',[-1.1,1.7,-1.7]);B.box(hoses,.15,.12,.20,'dark',[-.105,.60,0],.01);
 for(let i=0;i<4;i++){const z=-.06+i*.04,side=z<0?-1:1;B.path(hoses,[[-.06,.64,z],[.05,.70,z*.9],[.16,.70,side*.13],[.22,.66,side*.1497]],.009,'black');}
 // 工作装置：动臂（香蕉形箱梁）、斗杆、铲斗。
 const boom=B.part('boom','弯曲动臂与销座','BOOM','箱形动臂根部套在平台动臂座销轴上，腹部横向销座连接两根动臂缸，背部支座连接斗杆缸，前端叉板夹住斗杆根部。',[1.2,1.4,-.6]);
 const boomTop=[[.05,.075],[.40,.14],[1.00,.24],[1.45,.28],[1.85,.20],[2.10,.10]];slab(B,boom,[[.05,-.07],[.35,-.095],[.80,-.105],[1.10,-.07],[1.45,.02],[1.80,-.005],[2.02,-.03],...boomTop.slice().reverse()],.26,'orangepaint');
 B.tube(boom,.065,.0335,.26,'steel',[0,0,0],'z');for(const z of [-.105,.105])slab(B,boom,hull(circle([2.35,0],.075).concat([[1.95,-.06],[1.95,.14]])),.05,'orangepaint',z);
 B.cylinder(boom,.035,.28,'steel',[2.35,0,0],'z',.035,24);for(const z of [-.146,.146])B.cylinder(boom,.05,.012,'steel',[2.35,0,z],'z',.05,24);
 B.cylinder(boom,.03,.4358,'steel',[...E.bcRod,0],'z',.03,24);for(const zc of [-.27,.27]){const sg=Math.sign(zc),outer=.27+lug(.031)+.0075;for(const z of [zc-lug(.031),zc+lug(.031)])slab(B,boom,hull(circle(E.bcRod,.04).concat([[1.03,-.07],[1.21,-.05]])),.015,'orangepaint',z);B.box(boom,.12,.04,outer-.125,'orangepaint',[1.12,-.085,sg*(outer+.125)/2],.004);}
 for(const z of [.1696,.2704])slab(B,boom,hull(circle(E.acBase,.045).concat([[1.30,.25],[1.38,.24]])),.015,'orangepaint',z);B.box(boom,.065,.11,.158,'orangepaint',[1.3325,.275,.199],.004);
 for(const z of [-.05,.05])pipeAlong(B,boom,boomTop.slice(1,5),.012,z);
 const stick=B.part('stick','斗杆与连杆座','STICK','斗杆根部套在动臂端销上，尾端耳座连接斗杆缸活塞杆，上方支座连接铲斗缸，前端设导向连杆座和铲斗销孔。',[1.8,1.1,.8]);
 slab(B,stick,[[.06,-.06],[.40,-.105],[1.0,-.09],[1.55,-.06],[1.64,-.035],[1.64,.035],[1.50,.075],[1.0,.10],[.62,.13],[.30,.17],[-.05,.215],[-.30,.235],[-.44,.215],[-.46,.17],[-.30,.10],[-.12,.03],[-.055,-.05]],.157,'orangepaint',0,[[0,0,.0365]]);
 B.tube(stick,.07,.0365,.157,'steel',[0,0,0],'z');B.tube(stick,.055,.0315,.157,'steel',[1.7,0,0],'z');
 for(const z of [.1696,.2704])slab(B,stick,hull(circle(E.acRod,.045).concat([[-.44,.24],[-.31,.25]])),.015,'orangepaint',z);B.box(stick,.13,.06,.208,'orangepaint',[-.375,.225,.174],.004);
 const kc=[1.7+0,0];for(const z of [.1753,.2647])slab(B,stick,hull(circle(E.kcBase,.04).concat([[.50,.12],[.58,.11]])),.015,'orangepaint',z);B.box(stick,.075,.07,.202,'orangepaint',[.5275,.135,.171],.004);
 const dS=add([E.stick,0],E.d);B.box(stick,.08,.06,.1143,'orangepaint',[dS[0],-.01,.12715],.004);B.box(stick,.06,.068,.0714,'orangepaint',[dS[0],.034,.22],.003);B.cylinder(stick,.03,.0714,'steel',[...dS,.22],'z',.03,24);
 for(const z of [-.04,.04])pipeAlong(B,stick,[[1.45,.0775],[1.0,.10],[.62,.13],[.30,.17],[.10,.1957]],.010,z);
 const bucket=B.part('bucket','铲斗、侧板与斗齿','BUCKET','铲斗顶板上的两对耳板分别连接斗杆销与动力连杆，弧形背板、侧板、刃板和五个斗齿组成斗体。',[2.3,-.2,.6]);
 const shell=[[-.06,.05],[.12,.19],[.26,.30],[.40,.34],[.53,.26],[.58,.12],[.565,.02]],side=[...shell,[.40,-.03],[.15,-.05],[.02,-.06]];
 for(let i=0;i<shell.length-1;i++)beam(B,bucket,shell[i],shell[i+1],.014,.467,'orangepaint');for(const z of [-.2405,.2405])slab(B,bucket,side,.014,'orangepaint',z);
 B.box(bucket,.05,.022,.495,'steel',[.565,.01,0],.004);for(let i=0;i<5;i++)slab(B,bucket,[[.53,-.006],[.60,-.016],[.655,-.006],[.60,.03],[.53,.026]],.045,'steel',-.19+i*.095);
 B.cylinder(bucket,.030,.21,'steel',[0,0,0],'z',.03,24);for(const z of [-.09,.09])slab(B,bucket,hull(circle([0,0],.055).concat([[-.06,.05],[.12,.19],[.09,.21]])),.02,'orangepaint',z);
 B.box(bucket,.09,.08,.1036,'orangepaint',[.127,.222,.22],.004);B.cylinder(bucket,.03,.1064,'steel',[...E.ear,.22],'z',.03,24);
 // 油缸：动臂缸两根（规格书“Two Boom Cylinders”），斗杆缸与铲斗缸各一根；缸径、行程按规格书。
 const hydraulics=B.part('hydraulics','动臂缸、斗杆缸与铲斗缸','HYDRAULIC CYLINDERS','缸筒与活塞杆同轴，两端耳环夹在销耳板之间，伸缩量由两端销距决定并保持在规格书行程以内。',[1.1,2.0,1.1]);
 const cylinders=E.cylinders.map(c=>hollowCylinder(B,hydraulics,c.barrel,c.r,c.stroke)),twin=hollowCylinder(B,hydraulics,E.cylinders[0].barrel,E.cylinders[0].r,E.cylinders[0].stroke);
 const linkage=B.part('linkage','铲斗导向连杆与动力连杆','BUCKET LINKAGE','导向连杆两片夹住铲斗缸耳环，动力连杆两片在外侧连接铲斗耳座，四连杆按固定销距闭合。',[2,1.9,-1.0]);
 const rocker=rigidLink(B,linkage,E.rocker),coupler=rigidLink(B,linkage,E.coupler);
 for(const z of [-.0852,.0052])slab(B,rocker.group,hull(circle([0,0],.03).concat(circle([0,E.rocker],.03))),.016,'dark',z);
 for(const z of [-.1027,.0227])slab(B,coupler.group,hull(circle([0,0],.03).concat(circle([0,E.coupler],.03))),.016,'dark',z);for(const z of [-.1157,.0357])B.cylinder(coupler.group,.018,.01,'steel',[0,0,z],'z',.018,16);
 const yawQ=new T.Quaternion(),angleQ=new T.Quaternion(),zaxis=new T.Vector3(0,0,1),yaxis=new T.Vector3(0,1,0),v=new T.Vector3();
 const upperParts=[upper,cab,control,power,hoses,hydraulics,linkage];
 const world=(p,yaw,z=0)=>[p[0]*Math.cos(yaw)+z*Math.sin(yaw),p[1],-p[0]*Math.sin(yaw)+z*Math.cos(yaw)];
 tintModel(B,{orangepaint:[0xe8a91c,.04,.42],dark:[0x25272a,.45,.52],cast:[0x4a4641,.72,.62],black:[0x121315,0,.72]});
 function update(a,e){offsets(B,e);const p=excavatorPose(a);yawQ.setFromAxisAngle(yaxis,p.yaw);upperParts.forEach(g=>g.quaternion.copy(yawQ));
  for(const [g,point,angle]of [[boom,p.q0,p.b],[stick,p.q1,p.s],[bucket,p.q2,p.k]]){v.set(...world(point,p.yaw));g.position.add(v);g.quaternion.copy(yawQ).multiply(angleQ.setFromAxisAngle(zaxis,angle));}
  p.cylinders.forEach(([from,to],i)=>cylinders[i].set([...from,E.cylinders[i].z],[...to,E.cylinders[i].z]));twin.set([...p.cylinders[0][0],E.twinZ],[...p.cylinders[0][1],E.twinZ]);
  rocker.set([...p.d,E.linkZ],[...p.joint,E.linkZ]);coupler.set([...p.joint,E.linkZ],[...p.ear,E.linkZ]);
  const travel=a*.27;tracks.forEach(t=>t.update(travel));wheels.forEach(({g,r})=>g.rotation.z=-travel/r);}
 // 平台软管组在建造时先于工作装置创建，部件目录按原有顺序排列（软管组在最后）。
 const order=['undercarriage','track0','rollers0','track1','rollers1','slew','platform','cab','controls','power','boom','stick','bucket','hydraulics','linkage','hoses'];B.parts.sort((x,y)=>order.indexOf(x.id)-order.indexOf(y.id));
 return{...B,update,inspection:{boom,stick,bucket,cylinders,twin,rocker,coupler,tracks,wheels,world,upperParts}};
}
// 蒸汽机车比例取自 BR Standard Class 2 2-6-0（Great Central Railway 保存 78018、78019），三动轴总轴距 13'9" 对应模型 3.2。见 sources.md。
const LOCO_S=3.2/(4.191);
export const LOCOMOTIVE={scale:LOCO_S,axleY:.78,driverR:.762*LOCO_S,leadR:.457*LOCO_S,tenderR:.5017*LOCO_S,wheelZ:.853,crank:.3048*LOCO_S,rod:2.29,pistonOffset:.57,
 coupled:[-1.6,0,1.6],lead:1.6+2.591*LOCO_S,tender:[1.6+2.591*LOCO_S-13.437*LOCO_S+3.962*LOCO_S,0,1.6+2.591*LOCO_S-13.437*LOCO_S],
 bore:.4191*LOCO_S/2,barrel:[2.5795,3.1245],rodZ:1.0085,front:4.68,length:16.218*LOCO_S,height:3.899*LOCO_S,width:2.591*LOCO_S};
LOCOMOTIVE.rail=LOCOMOTIVE.axleY-LOCOMOTIVE.driverR;LOCOMOTIVE.tender[1]=(LOCOMOTIVE.tender[0]+LOCOMOTIVE.tender[2])/2;
export function locomotivePose(a,side=0){const L=LOCOMOTIVE,angle=a+side*PI/2,r=L.crank,l=L.rod,x=r*Math.cos(angle),y=r*Math.sin(angle);return{angle,x,y,slider:x+Math.sqrt(l*l-y*y),rodLength:l};}
// 车轮：外圈轮箍带内侧轮缘，轮心、辐条、轮毂与配重。o 为朝车外的 z 方向。
function tyre(B,g,R,o,width,mat='steel'){const h=width/2,p=[[R-.06,-h],[R+.022,-h],[R+.022,-h+.02],[R,-h+.028],[R-.004,h],[R-.06,h]];revolve(B,g,(o>0?p:p.map(([r,z])=>[r,-z]).reverse()),mat,[0,0,0],56);}
function spokedWheel(B,g,R,o,{spokes,hub,width,weight=0}){tyre(B,g,R,o,width);B.tube(g,R-.058,R-.105,width*.75,'gearpaint',[0,0,0],'z');B.cylinder(g,hub,width*1.3,'gearpaint',[0,0,0],'z',hub,32);
 for(let i=0;i<spokes;i++){const t=(i+.5)*TAU/spokes;rod(B,g,[hub*.85*Math.cos(t),hub*.85*Math.sin(t),0],[(R-.095)*Math.cos(t),(R-.095)*Math.sin(t),0],R*.034,'gearpaint');}
 if(weight)slab(B,g,[...Array.from({length:9},(_,i)=>{const t=PI-weight+i*weight/4;return[(R-.10)*Math.cos(t),(R-.10)*Math.sin(t)];}),...Array.from({length:9},(_,i)=>{const t=PI+weight-i*weight/4;return[(R*.5)*Math.cos(t),(R*.5)*Math.sin(t)];})],width*.6,'gearpaint');}
export function buildLocomotive(materials){
 const B=makeBuilder(materials),L=LOCOMOTIVE,drivers=[],smallWheels=[],motions=[],links=[],W=L.wheelZ,Y=L.axleY,rc=L.crank;
 // 主车架：两片内侧板框，动轴处开轴箱导槽，前后缓冲梁、拖钩梁和走行板。
 const frame=B.part('frame','主车架、走行板与缓冲梁','MAIN FRAMES','两片内侧板框在三根动轴处开导槽容纳轴箱，前缓冲梁、后拖钩梁和两侧走行板固定在板框上。',[0,-.9,-.6]);
 const notch=x=>[[x-.13,.62],[x-.13,.93],[x+.13,.93],[x+.13,.62]];
 for(const z of [-.6,.6])slab(B,frame,[[-2.85,.62],...notch(-1.6),...notch(0),...notch(1.6),[2.4,.62],[2.5,.66],[4.40,.66],[4.40,1.40],[-2.85,1.40]],.028,'dark',z);
 B.box(frame,.08,.45,1.978,'scarlet',[4.44,1.175,0],.006);B.box(frame,.08,.50,1.978,'scarlet',[-2.86,1.15,0],.006);B.box(frame,.10,.21,1.172,'dark',[2.85,.555,0],.004);
 for(const z of [-.6643,.6643]){B.cylinder(frame,.065,.18,'dark',[4.57,1.003,z],'x',.065,24);B.cylinder(frame,.15,.02,'steel',[4.67,1.003,z],'x',.15,32);B.cylinder(frame,.065,.18,'dark',[-2.99,1.003,z],'x',.065,24);}
 for(const o of [-1,1]){B.box(frame,5.95,.02,.489,'black',[1.425,1.41,o*.7445],0);B.box(frame,5.95,.09,.014,'black',[1.425,1.375,o*.982],0);}
 // 轴箱与板簧：轴箱坐在板框导槽内，内孔套住半轴，板簧挂在轴箱下方。
 const suspension=B.part('suspension','轴箱与钢板弹簧','AXLE BOXES','六只轴箱嵌在板框导槽内套住动轴，下挂叠板弹簧两端吊在板框底边。',[0,.8,-1.4]);
 for(const x of L.coupled)for(const z of [-.6,.6]){slab(B,suspension,[[x-.13,.63],[x+.13,.63],[x+.13,.93],[x-.13,.93]],.09,'cast',z,[[x,Y,.0865]]);B.box(suspension,.10,.05,.07,'dark',[x,.605,z],.003);
  for(let i=0;i<5;i++)B.box(suspension,.50-i*.06,.014,.07,'steel',[x,.573-i*.014,z],.002);for(const s of [-1,1])rod(B,suspension,[x+s*.24,.578,z],[x+s*.24,.63,z],.012,'steel');}
 // 动轮：两侧各三只，每只带半轴、曲柄销与挡圈；两侧曲柄相差四分之一圈。
 for(let side=0;side<2;side++){const o=side===0?1:-1,g=B.part(side===0?'drivers0':'drivers1',side===0?'右侧三只动轮':'左侧三只动轮','DRIVING WHEELS','三只动轮各带半根车轴和曲柄销，联动杆使三轴同步，两侧曲柄相差四分之一圈。',[0,-.2,o*1.5]);
  for(const x of L.coupled){const w=subgroup(g,[x,Y,o*W]);w.name='loco-driver';spokedWheel(B,w,L.driverR,o,{spokes:16,hub:.14,width:.107,weight:.65});
   B.cylinder(w,.085,W-.001,'steel',[0,0,-o*(W-.001)/2],'z',.085,48);B.cylinder(w,.10,.1045,'gearpaint',[rc,0,o*.02225],'z',.10,32);
   const face=.9275-W,pin=(a,b,r)=>B.cylinder(w,r,b-a,'steel',[rc,0,o*(a+b)/2],'z',r,32);
   if(x===0){pin(face,1.025-W,.0505);pin(1.025-W,1.035-W,.075);}else if(x>0){pin(face,.9605-W,.0505);pin(.9605-W,.9705-W,.075);}else{pin(face,.9595-W,.07);pin(.9595-W,.9925-W,.0505);pin(.9925-W,1.0025-W,.075);}
   drivers.push({g:w,x,z:o*W,side});}}
 // 联动杆：每侧两段，前段在内层、后段在外层，于中间曲柄销处叠合。
 const coupling=B.part('coupling','分段联动杆','COUPLING RODS','每侧两段定长联动杆套在三只曲柄销上，前段在内层、后段在外层，于中间曲柄销叠合。',[0,.4,1.9]);
 for(let side=0;side<2;side++)for(let j=0;j<2;j++){const o=side===0?1:-1,link=rigidLink(B,coupling,1.6),dz=o*(j===1?-.016:.016);
  for(const y of [0,1.6])B.tube(link.group,.085,.052,.03,'steel',[0,y,dz],'z');B.box(link.group,.065,1.45,.026,'steel',[0,.8,dz],.004);links.push({side,x:-1.6+j*1.6,link});}
 // 汽缸：缸筒、前后缸盖、阀室、滑板与吊架，鞍座把汽缸固定在板框外侧。
 const cylinders=B.part('cylinders','汽缸、阀室与滑板','CYLINDERS & GUIDES','缸筒内径按规格16.5英寸，前后缸盖封闭缸筒，上方阀室、后方滑板和吊架把十字头导向到走行板下。',[1.4,.5,-1]);
 const [c0,c1]=L.barrel;
 for(const o of [-1,1]){const z=o*L.rodZ;B.tube(cylinders,.19,L.bore,c1-c0,'cast',[(c0+c1)/2,Y,z],'x');B.tube(cylinders,.205,.0335,.02,'cast',[c0-.01,Y,z],'x');B.cylinder(cylinders,.205,.02,'cast',[c1+.01,Y,z],'x',.205,48);
  B.bolts(cylinders,Array.from({length:12},(_,i)=>[c1+.0225,Y+.18*Math.sin(i*TAU/12),z+.18*Math.cos(i*TAU/12)]),'x',.010);
  B.cylinder(cylinders,.10,c1+.02-(c0-.02),'cast',[(c0+c1)/2,Y+.29,z],'x',.10,40);for(const x of [c0-.0275,c1+.0275])B.cylinder(cylinders,.11,.015,'dark',[x,Y+.29,z],'x',.11,40);
  B.box(cylinders,.46,.24,.23,'cast',[2.85,.78,o*.715],.004);B.box(cylinders,c0-.02-1.95,.03,.06,'chrome',[(1.95+c0-.02)/2,Y+.1105,z],0);B.box(cylinders,.03,1.40-(Y+.0955),.065,'dark',[1.935,(1.40+Y+.0955)/2,o*1.0075],0);}
 // 十字头、活塞杆与活塞：十字头销到活塞中心0.57。
 const pistons=B.part('pistons','活塞、活塞杆与十字头','PISTONS & CROSSHEADS','十字头沿上方滑板往复，活塞杆穿过后缸盖把活塞推到缸筒内，十字头销连接主连杆小端。',[1.5,1.0,1.2]);
 const rods=B.part('mainrods','主连杆','CONNECTING RODS','主连杆大端套在中间动轮曲柄销最外层，小端夹在十字头两片侧板之间。',[0,1.4,-1.7]);
 for(let side=0;side<2;side++){const o=side===0?1:-1,z=o*L.rodZ,piston=subgroup(pistons);piston.name='loco-crosshead';
  B.cylinder(piston,.02,.061,'steel',[0,0,0],'z',.02,24);for(const s of [-1,1])B.box(piston,.1345,.139,.014,'steel',[-.03275,.0245,s*.0235],0);B.box(piston,.1345,.049,.061,'steel',[-.03275,.0695,0],0);
  B.cylinder(piston,.032,.504,'chrome',[.288,0,0],'x',.032,32);B.cylinder(piston,L.bore-.0015,.06,'steel',[L.pistonOffset,0,0],'x',L.bore-.0015,48);
  const link=rigidLink(B,rods,L.rod);B.tube(link.group,.09,.052,.03,'steel',[0,0,0],'z');B.tube(link.group,.035,.0215,.03,'steel',[0,L.rod,0],'z');slab(B,link.group,[[-.0375,.085],[.0375,.085],[.0275,L.rod-.03],[-.0275,L.rod-.03]],.026,'steel');
  motions.push({side,z,piston,link});}
 // 锅炉、烟管、火箱、烟箱
 const boiler=B.part('boiler','锅炉筒体与包覆','BOILER','锅炉筒体后接火箱、前接烟箱，外包覆和箍带包住筒体。',[0,1.7,-1.2]),bY=2.22;
 for(const st of [0,PI]){const m=B.tube(boiler,.50,.47,3.10,'gearpaint',[1.0,bY,0],'x',st,PI);if(st===0)B.cut(m);}for(const x of [-.30,.45,1.25,2.05])B.torus(boiler,.502,.006,'dark',[x,bY,0],'x');
 const tubes=B.part('tubes','烟管与管板','SMOKE TUBES','烟管两端插在火箱管板和烟箱管板上，热烟气由火箱经烟管进入烟箱。',[0,2.0,.9]),tubePositions=[];
 for(let y=-3;y<=3;y++)for(let z=-3;z<=3;z++)if(y*y+z*z<10)tubePositions.push({p:[1.0,bY+y*.13,z*.13]});B.instances(tubes,new T.CylinderGeometry(.028,.028,3.04,12).rotateZ(PI/2),'steel',tubePositions);for(const x of [-.535,2.535])B.cylinder(tubes,.47,.03,'steel',[x,bY,0],'x',.47,64);
 const firebox=B.part('firebox','火箱与后板','FIREBOX','火箱夹在后部板框之间并由支架托住，后板伸进驾驶室，设炉门和水表。',[-1.5,1.6,0]);
 B.box(firebox,1.2,1.27,.94,'gearpaint',[-1.15,1.585,0],.02);B.cylinder(firebox,.50,1.2,'gearpaint',[-1.15,bY,0],'x',.50,64);for(const o of [-1,1])B.box(firebox,.10,.10,.116,'dark',[-1.15,1.0,o*.528],0);
 B.box(firebox,.02,.22,.30,'dark',[-1.76,1.62,0],.004);for(const z of [-.18,.18])B.cylinder(firebox,.012,.20,'glass',[-1.765,2.05,z],'y',.012,12);
 const smokebox=B.part('smokebox','烟箱、鞍座与烟囱','SMOKEBOX','烟箱坐在板框间的鞍座上，前门、门把和烟囱装在烟箱上。',[1.8,1.5,-.8]);
 B.tube(smokebox,.53,.50,.85,'black',[2.975,bY,0],'x');B.box(smokebox,.70,.80,1.172,'black',[2.97,1.40,0],.004);
 B.lathe(smokebox,[[.001,.05],[.30,.04],[.46,.012],[.49,0]],'black',[3.40,bY,0],'x');B.tube(smokebox,.53,.46,.03,'black',[3.415,bY,0],'x');B.cylinder(smokebox,.03,.08,'steel',[3.48,bY,0],'x',.03,16);
 for(const y of [bY-.30,bY+.30])B.box(smokebox,.03,.04,.42,'steel',[3.44,y,-.20],.003);
 B.lathe(smokebox,[[.13,0],[.165,.03],[.13,.10],[.125,.38],[.155,.43],[.165,L.rail+L.height-2.70]],'black',[2.98,2.70,0]);
 // 汽包、安全阀、汽笛、给水管与扶手
 const fittings=B.part('fittings','汽包、安全阀与外部管路','BOILER FITTINGS','汽包和安全阀坐在锅炉与火箱顶部，给水管沿走行板通到锅炉前部止回阀，扶手杆由立柱固定在包覆上。',[0,2.6,0]);
 B.cylinder(fittings,.17,.30,'gearpaint',[.95,2.80,0],'y',.17,48);ellipsoid(B,fittings,[.17,.08,.17],[.95,2.95,0],'gearpaint');for(const z of [-.09,.09])B.cylinder(fittings,.045,.20,'bronze',[-1.0,2.78,z],'y',.045,24);B.cylinder(fittings,.03,.20,'bronze',[-1.45,2.80,0],'y',.03,16);
 for(const o of [-1,1]){B.path(fittings,[[-1.56,1.44,o*.62],[-.6,1.44,o*.62],[1.6,1.44,o*.62],[1.85,1.8,o*.56],[1.95,bY,o*.505]],.02,'bronze');B.cylinder(fittings,.04,.08,'bronze',[1.95,bY,o*.53],'z',.04,16);
  rod(B,fittings,[-.4,2.40,o*.56],[2.5,2.40,o*.56],.012,'chrome');for(const x of [-.3,.7,1.7,2.45])rod(B,fittings,[x,2.40,o*.56],[x,2.38,o*.465],.008,'chrome');
  B.box(fittings,.25,.20,.20,'gearpaint',[.83,1.52,o*.70],.01);}
 // 驾驶室
 const cab=B.part('cab','驾驶室','CAB','驾驶室地板压在板框上，前板开口让火箱后部伸入，侧板开窗，顶棚覆盖操纵位置。',[-1.7,2.0,-1.0]);
 B.box(cab,1.09,.04,1.90,'dark',[-2.305,1.42,0],0);for(const o of [-1,1]){B.box(cab,.21,.04,.47,'dark',[-1.655,1.42,o*.715],0);
  B.box(cab,1.30,.71,.03,'gearpaint',[-2.20,1.795,o*.935],.004);B.box(cab,.20,.78,.03,'gearpaint',[-1.65,2.54,o*.935],.004);B.box(cab,.15,.78,.03,'gearpaint',[-2.775,2.54,o*.935],.004);B.box(cab,1.30,.30,.03,'gearpaint',[-2.20,2.78,o*.935],.004);B.box(cab,.95,.48,.008,'glass',[-2.225,2.39,o*.935],.002);
  B.box(cab,.03,1.49,.45,'gearpaint',[-1.565,2.185,o*.725],.004);B.cylinder(cab,.10,.006,'glass',[-1.582,2.55,o*.72],'x',.10,32);}
 B.box(cab,.03,.21,1.00,'gearpaint',[-1.565,2.825,0],.004);B.box(cab,1.45,.04,2.0,'black',[-2.225,2.95,0],.02);
 // 煤水车：内侧板框、轴箱、地板、水柜、煤仓与牵引杆。
 const tender=B.part('tender','煤水车与牵引连接','TENDER','煤水车板框托住水柜和煤仓，三根车轴的轴箱嵌在板框导槽内，牵引杆连接机车后拖钩梁。',[-2,0,-1]),tr=L.tenderR,tY=L.rail+tr;
 for(const z of [-.6,.6])slab(B,tender,[[-7.56,.66],...L.tender.slice().sort((a,b)=>a-b).flatMap(x=>[[x-.12,.66],[x-.12,.78],[x+.12,.78],[x+.12,.66]]),[-3.13,.66],[-3.13,1.12],[-7.56,1.12]],.028,'dark',z);
 for(const x of L.tender)for(const z of [-.6,.6])slab(B,tender,[[x-.12,.45],[x+.12,.45],[x+.12,.78],[x-.12,.78]],.09,'cast',z,[[x,tY,.0765]]);
 B.box(tender,4.43,.04,1.94,'dark',[-5.345,1.14,0],0);B.box(tender,.08,.30,1.94,'scarlet',[-7.54,1.01,0],.004);B.box(tender,.08,.30,1.94,'dark',[-3.17,1.01,0],.004);
 for(const z of [-.6643,.6643]){B.cylinder(tender,.065,.122,'dark',[-7.641,1.003,z],'x',.065,24);B.cylinder(tender,.15,.02,'steel',[-7.692,1.003,z],'x',.15,32);}
 for(const o of [-1,1])B.box(tender,4.43,1.29,.04,'gearpaint',[-5.345,1.805,o*.95],.004);B.box(tender,.04,1.29,1.86,'gearpaint',[-7.54,1.805,0],.004);B.box(tender,2.52,.04,1.86,'gearpaint',[-6.26,2.43,0],.004);B.box(tender,1.83,.04,1.86,'dark',[-4.085,1.88,0],.004);B.box(tender,.04,1.04,1.86,'gearpaint',[-3.15,1.68,0],.004);B.box(tender,.04,.55,1.86,'gearpaint',[-5.02,2.175,0],.004);
 B.cylinder(tender,.12,.08,'dark',[-7.0,2.49,0],'y',.12,32);rod(B,tender,[-2.90,1.0,0],[-3.13,1.0,0],.045,'steel');
 const heap=new T.ExtrudeGeometry(new T.Shape([[-5.0,1.90],[-3.17,1.90],[-3.17,2.05],[-3.6,2.30],[-4.5,2.40],[-5.0,2.40]].map(p=>new T.Vector2(...p))),{depth:1.86,bevelEnabled:false,steps:1});heap.translate(0,0,-.93);B.mesh(tender,heap,'black');
 for(let i=0;i<24;i++){const x=-4.85+(i%6)*.28,z=-.75+Math.floor(i/6)*.5,top=x>-3.6?2.30-(x+3.6)*.58:x>-4.5?2.40-(x+4.5)*.111:2.40;ellipsoid(B,tender,[.08,.05,.07],[x,top,z],'black');}
 // 前导轮与煤水车轮对：整根轮对转动；导轮转向架架体固定在前横撑上。
 const pilot=B.part('pilot','前导轮与煤水车轮对','CARRYING WHEELS','前导轮对装在转向架轴箱内，煤水车三根轮对装在板框轴箱内，轮对与动轮按同一线速度滚动。',[0,-.4,1.8]);
 for(const [x,r,hub]of [[L.lead,L.leadR,.10],...L.tender.map(x=>[x,tr,.10])]){const w=subgroup(pilot,[x,L.rail+r,0]);w.name='loco-carrying-wheelset';B.cylinder(w,x>0?.07:.075,2*W,'steel',[0,0,0],'z',x>0?.07:.075,48);
  for(const o of [-1,1]){const g=subgroup(w,[0,0,o*W]);spokedWheel(B,g,r,o,{spokes:10,hub,width:.107});}smallWheels.push({g:w,r});}
 const lY=L.rail+L.leadR;for(const z of [-.70,.70]){slab(B,pilot,[[L.lead-.09,lY-.10],[L.lead+.09,lY-.10],[L.lead+.09,lY+.10],[L.lead-.09,lY+.10]],.05,'cast',z,[[L.lead,lY,.0715]]);B.box(pilot,L.lead-.09-2.90+.002,.06,.04,'dark',[(2.90+L.lead-.09+.002)/2,.55,z],0);}B.box(pilot,.10,.07,1.44,'dark',[2.9515,.485,0],0);
 tintModel(B,{gearpaint:[0x1d2a24,.18,.42],black:[0x101113,.1,.62],cast:[0x2d3236,.55,.5]});
 function update(a,e){offsets(B,e);drivers.forEach(({g,side})=>g.rotation.z=a+side*PI/2);smallWheels.forEach(({g,r})=>g.rotation.z=a*L.driverR/r);
  links.forEach(({side,x,link})=>{const p=locomotivePose(a,side),z=side===0?.96:-.96;link.set([x+p.x,Y+p.y,z],[x+1.6+p.x,Y+p.y,z]);});
  motions.forEach(({side,z,piston,link})=>{const p=locomotivePose(a,side);piston.position.set(p.slider,Y,z);link.set([p.x,Y+p.y,z],[p.slider,Y,z]);});}
 return{...B,update,inspection:{drivers,motions,links,smallWheels}};
}

// ROV 外廓取自 MBARI Doc Ricketts（长12英尺、宽6英尺、高7英尺），模型 1 单位 = 1 m；机械臂臂展参照 TechnipFMC Titan 4（1922 mm）。见 sources.md。
export const ROV={length:12*.3048,width:6*.3048,height:7*.3048,reach:1.922,frameX:1.65,frameZ:.75,bottom:.34,top:1.55,shoulder:[1.75,.62,.55]};
// 方管：截面0.06，按两端中心线给出，不倒角以保证接触面准确。
function tubeX(B,g,x0,x1,y,z,mat='alloy',s=.06){B.box(g,x1-x0,s,s,mat,[(x0+x1)/2,y,z],0);}
function tubeY(B,g,x,y0,y1,z,mat='alloy',s=.06){B.box(g,s,y1-y0,s,mat,[x,(y0+y1)/2,z],0);}
function tubeZ(B,g,x,y,z0,z1,mat='alloy',s=.06){B.box(g,s,s,z1-z0,mat,[x,y,(z0+z1)/2],0);}
// 导管推进器：局部 +x 为推力轴。导管、端环、电机舱与四根定子支杆固定，桨毂贴着电机舱端面转动。
function ductedThruster(B,g){B.tube(g,.27,.235,.27,'dark',[0,0,0],'x');for(const t of [-.145,.145])B.torus(g,.25,.018,'chrome',[t,0,0],'x');
 B.cylinder(g,.07,.3335,'titanium',[.21325,0,0],'x',.07,40);for(let k=0;k<4;k++){const a=k*TAU/4+PI/4;rod(B,g,[.30,.064*Math.sin(a),.064*Math.cos(a)],[.145,.25*Math.sin(a),.25*Math.cos(a)],.01,'steel');}
 const rotor=subgroup(g);rotor.name='rov-propeller';B.cylinder(rotor,.036,.09,'chrome',[0,0,0],'x',.036,32);B.cylinder(rotor,.036,.085,'chrome',[-.0875,0,0],'x',.008,32);
 const blade=bladeGeometry(.03,.175,.07,.55);blade.rotateY(PI/2);B.instances(rotor,blade,'black',Array.from({length:4},(_,i)=>({p:[0,0,0],r:[i*TAU/4,0,0]})));return rotor;}
export function buildROV(materials){
 const B=makeBuilder(materials),R=ROV,rotors=[],arms=[],X=R.frameX,Z=R.frameZ;
 const frame=B.part('frame','开式承力框架','FRAME','铝方管纵梁、立柱和上下横梁组成开式框架，上层横梁托住浮力块，下层横梁托住设备舱和液压站。',[0,-.8,-1]);
 for(const z of [-Z,Z]){tubeX(B,frame,-X,X,R.bottom,z);tubeX(B,frame,-X,X,R.top,z);for(const x of [-1.62,-.60,.60,1.62])tubeY(B,frame,x,R.bottom-.03,R.top+.03,z);}
 for(const x of [-1.62,-1.0,-.30,.30,1.62])tubeZ(B,frame,x,R.bottom,-Z,Z);for(const x of [-1.62,-1.15,-.60,.60,1.15,1.62])tubeZ(B,frame,x,R.top,-Z,Z);
 // 浮力块：四块围出中央开口，垂直推进器的水流经开口上下通过。
 const float=B.part('buoyancy','顶部浮力块','BUOYANCY','四块浮力材料压在上层横梁上，围出中央开口给两台垂直推进器通流，外形决定整机长、宽、高。',[0,1.2,0]),fy=R.top+.03,fh=R.height-fy;
 const fb=(w,d,x,z)=>B.box(float,w-.021,fh-.021,d-.021,'orangepaint',[x,fy+fh/2,z],.03);// 倒角向外长0.0105，尺寸先减去，外廓即为来源尺寸。
 fb(R.length/2-.58,R.width,(.58+R.length/2)/2,0);fb(R.length/2-.58,R.width,-(.58+R.length/2)/2,0);for(const o of [-1,1])fb(1.16,R.width/2-.30,0,o*(.30+R.width/2)/2);
 const skid=B.part('skid','底部工具橇','TOOL SKID','两根滑橇经立柱挂在下层纵梁下，三道横梁承托样品架和探测头。',[0,-1.1,0]);
 for(const z of [-Z,Z]){B.box(skid,3.50,.06,.08,'alloy',[0,.03,z],0);for(const x of [-1.62,-.60,.60,1.62])tubeY(B,skid,x,.06,R.bottom-.03,z);}for(const x of [-1.2,.40,1.40])B.box(skid,.06,.06,1.58,'alloy',[x,.09,0],0);
 const pressure=B.part('pressure','钛合金耐压舱','PRESSURE HOUSINGS','两只圆筒耐压舱带半球端盖，用抱箍坐在下层横梁上。',[-1.3,.2,-1.0]);
 for(const z of [-.42,.42]){B.cylinder(pressure,.18,1.0,'titanium',[-.75,.62,z],'x',.18,48);for(const x of [-1.25,-.25])ellipsoid(B,pressure,[.12,.18,.18],[x,.62,z],'titanium');for(const x of [-1.0,-.30]){B.box(pressure,.08,.10,.30,'dark',[x,.42,z],0);B.tube(pressure,.19,.178,.05,'dark',[x,.62,z],'x');}B.cylinder(pressure,.03,.06,'bronze',[-1.40,.62,z],'x',.03,16);}
 const hydraulics=B.part('hydraulics','液压动力站与软管','HYDRAULIC PACK','电机、泵、补偿器和阀块组成液压站，坐在下层横梁上，软管通到两只机械臂底座。',[1.3,.5,-1]);
 B.cylinder(hydraulics,.14,.40,'steel',[.25,.60,0],'x',.14,48);B.box(hydraulics,.06,.10,.20,'dark',[.30,.42,0],0);B.cylinder(hydraulics,.10,.12,'dark',[.51,.60,0],'x',.10,32);B.cylinder(hydraulics,.08,.26,'steel',[.15,.87,0],'y',.08,32);B.box(hydraulics,.30,.15,.36,'dark',[.32,.8175,0],.004);
 for(const o of [-1,1])for(const dz of [.05,.15]){const z=o*dz,end=[R.shoulder[0]-.1115,.41,o*R.shoulder[2]+(dz-.1)*.4*o];B.path(hydraulics,[[.40,.88,z],[.80,.72,o*(.10+dz)],[1.35,.46,o*.42],end],.012,'black');}
 // 推进器：四台水平矢量布置，两台垂直穿过浮力块开口。
 const thrusters=B.part('thrusters','六台导管推进器','DUCTED THRUSTERS','四台水平推进器斜置在框架四角，两台垂直推进器挂在中部，均由支架连到上层横梁。',[0,.6,1.4]);
 for(const [x,z,yaw]of [[1.15,.45,3*PI/4],[1.15,-.45,-3*PI/4],[-1.15,.45,PI/4],[-1.15,-.45,-PI/4]]){const g=subgroup(thrusters,[x,1.20,z]);g.name='rov-thruster';g.rotation.y=yaw;rotors.push(ductedThruster(B,g));B.box(thrusters,.06,R.top-.03-1.46-.0005,.06,'alloy',[x,(1.46+R.top-.03-.0005)/2,z],0);}
 for(const x of [-.28,.28]){const g=subgroup(thrusters,[x,1.375,0]);g.name='rov-thruster';g.rotation.z=PI/2;rotors.push(ductedThruster(B,g));const o=Math.sign(x);B.box(thrusters,.0295,.15,.10,'alloy',[o*(.54+.01475),1.475,0],0);}
 // 相机：固定云台座挂在前上横梁，云台绕竖轴摆动。
 const cameras=B.part('cameras','前向相机与云台','CAMERA PAN','云台座挂在前上横梁下，相机和叉架绕竖轴左右摆动。',[1.6,1.2,0]);
 B.box(cameras,.16,.03,.14,'alloy',[1.73,R.top-.03+.015,0],0);B.cylinder(cameras,.06,.10,'dark',[1.75,1.47,0],'y',.06,32);
 const cameraGimbal=subgroup(cameras,[1.75,1.42,0]);cameraGimbal.name='rov-camera-pan';B.cylinder(cameraGimbal,.11,.0185,'dark',[0,-.01075,0],'y',.11,40);for(const s of [-1,1])slab(B,cameraGimbal,hull(circle([0,-.12],.05).concat([[-.06,-.02],[.06,-.02]])),.015,'dark',s*.0975);
 B.cylinder(cameraGimbal,.09,.30,'dark',[0,-.12,0],'x',.09,40);B.cylinder(cameraGimbal,.07,.01,'optics',[.155,-.12,0],'x',.07,40);
 const lights=B.part('lights','工作照明','WORK LIGHTS','两盏灯挂在前上横梁，两盏灯装在前立柱，均朝前照明。',[1.5,1.5,1]);
 for(const o of [-1,1]){B.box(lights,.05,.15,.04,'alloy',[1.675,1.475,o*.45],0);B.cylinder(lights,.07,.16,'dark',[1.76,1.40,o*.45],'x',.07,32);B.cylinder(lights,.055,.01,'lamp',[1.845,1.40,o*.45],'x',.055,32);
  B.box(lights,.05,.06,.12,'alloy',[1.675,.95,o*.72],0);B.cylinder(lights,.07,.16,'dark',[1.76,.95,o*.68],'x',.07,32);B.cylinder(lights,.055,.01,'lamp',[1.845,.95,o*.68],'x',.055,32);}
 const navigation=B.part('navigation','避碰声呐、测速与测高','NAVIGATION','前方声呐装在浮力块顶面，测速探头和测高计挂在下层横梁下方。',[-1.4,1.1,1]);
 B.cylinder(navigation,.10,.12,'dark',[1.50,R.height+.06,0],'y',.10,32);ellipsoid(B,navigation,[.10,.06,.10],[1.50,R.height+.12,0],'dark');B.cylinder(navigation,.08,.10,'dark',[-.30,R.bottom-.08,0],'y',.08,32);
 for(let i=0;i<4;i++){const a=i*TAU/4+PI/4;B.cylinder(navigation,.025,.03,'black',[-.30+.045*Math.cos(a),R.bottom-.145,.045*Math.sin(a)],'y',.025,16);}B.cylinder(navigation,.03,.06,'dark',[1.62,R.bottom-.06,.20],'y',.03,16);B.cylinder(navigation,.05,.20,'dark',[-1.55,R.height+.10,.70],'y',.05,16);
 // 机械臂：底座固定在前下横梁，肩部偏航、肩俯仰、肘、腕转和夹爪，相邻构件之间留0.0015间隙。
 for(const side of [-1,1]){const id=side<0?'arm0':'arm1',z0=side*R.shoulder[2],part=B.part(id,side<0?'左采样机械臂':'右采样机械臂','MANIPULATOR','底座、肩部转台、上臂、前臂、腕部和夹爪依次铰接，臂展参照7功能钛合金机械臂。',[1.6,.2,side*1.5]);
  B.box(part,.21,.06,.24,'titanium',[1.755,R.bottom,z0],0);B.cylinder(part,.11,R.shoulder[1]-.1715-(R.bottom+.03),'titanium',[R.shoulder[0],(R.shoulder[1]-.1715+R.bottom+.03)/2,z0],'y',.11,48);
  const shoulder=subgroup(part,[R.shoulder[0],R.shoulder[1],z0]),upper=subgroup(shoulder),elbow=subgroup(upper,[.78,0,0]),fore=subgroup(elbow),wrist=subgroup(fore,[.72,0,0]),jaws=[];shoulder.name='rov-shoulder';elbow.name='rov-elbow';wrist.name='rov-wrist';
  B.cylinder(shoulder,.11,.02,'titanium',[0,-.16,0],'y',.11,48);for(const s of [-1,1])slab(B,shoulder,hull(circle([0,0],.07).concat([[-.07,-.15],[.07,-.15]])),.015,'titanium',s*.0975);
  B.cylinder(upper,.065,.177,'titanium',[0,0,0],'z',.065,40);B.box(upper,.66,.09,.12,'titanium',[.38,0,0],.004);for(const s of [-1,1])slab(B,upper,hull(circle([.78,0],.055).concat([[.68,-.045],[.68,.045]])),.015,'titanium',s*.0555);
  B.cylinder(fore,.055,.093,'titanium',[0,0,0],'z',.055,40);B.box(fore,.6735,.08,.09,'titanium',[.38175,0,0],0);
  B.cylinder(wrist,.045,.13,'steel',[.065,0,0],'x',.045,32);for(const s of [-1,1])slab(B,wrist,hull(circle([.18,0],.025).concat([[.10,-.04],[.10,.04]])),.015,'steel',s*.0355);B.cylinder(wrist,.012,.086,'chrome',[.18,0,0],'z',.012,16);
  for(const s of [-1,1]){const j=subgroup(wrist,[.18,0,0]);j.name='rov-jaw';slab(B,j,[[-.02,-.018],[.04,-.022],[.25,-.006],[.26,.014],[.04,.02],[-.02,.018]],.025,'steel',s*.014,[[0,0,.0135]]);jaws.push({j,s});}
  arms.push({shoulder,upper,elbow,fore,wrist,jaws,side});}
 // 样品架：托板坐在滑橇横梁上，中心立轴穿过转盘内孔。
 const samples=B.part('samples','样品转盘与托板','SAMPLE TRAY','托板跨在滑橇两道横梁上，中心立轴承托转盘，十二只采样管绕立轴转动。',[1.2,-.5,1.2]);
 B.box(samples,1.0,.02,.80,'dark',[.90,.13,0],0);B.cylinder(samples,.03,.16,'steel',[.90,.22,0],'y',.03,24);
 const carousel=subgroup(samples,[.90,0,0]);carousel.name='rov-carousel';B.tube(carousel,.32,.0315,.02,'steel',[0,.1515,0],'y');for(let i=0;i<12;i++){const a=i*TAU/12;B.tube(carousel,.045,.035,.13,'ceramic',[.24*Math.sin(a),.2265,.24*Math.cos(a)],'y');}B.tube(carousel,.30,.18,.012,'steel',[0,.2795,0],'y');
 const tether=B.part('tether','脐带终端与弯曲限制器','TETHER','脐带终端坐在后部浮力块顶面，弯曲限制器把脐带向上引出。',[0,1.7,-.8]);
 B.box(tether,.30,.06,.24,'steel',[-1.25,R.height+.03,0],0);B.cylinder(tether,.07,.22,'bronze',[-1.25,R.height+.17,0],'y',.07,32);B.path(tether,[[-1.25,R.height+.28,0],[-1.27,R.height+.50,0],[-1.40,R.height+.72,0],[-1.62,R.height+.84,0]],.045,'black');
 // 浮力材料是哑光复合泡沫，不按金属漆处理；颜色沿用材质库。
 float.traverse(o=>{if(o.isMesh){o.material.metalness=0;o.material.roughness=.9;}});
 function update(a,e){offsets(B,e);rotors.forEach((g,i)=>g.rotation.x=a*(i%2?-2.0:2.0));cameraGimbal.rotation.y=.17*Math.sin(a*.35);
  for(const arm of arms){arm.shoulder.rotation.y=arm.side*(.06+.06*Math.sin(a*.27));arm.upper.rotation.z=-.22+.12*Math.sin(a*.4+arm.side);arm.fore.rotation.z=.45+.22*Math.sin(a*.4+.7);arm.wrist.rotation.x=.2*Math.sin(a*.3);arm.jaws.forEach(({j,s})=>j.rotation.z=s*(.15+.13*Math.sin(a*.55)));}carousel.rotation.y=a*.13;}
 return{...B,update,inspection:{rotors,arms,carousel,cameraGimbal}};
}
