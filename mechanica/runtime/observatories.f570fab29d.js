import * as T from '#three';
import {makeBuilder,TAU} from '#geometry';
import {subgroup,place,offsets,panel,rod,ellipsoid} from '#vehicle-kit';
import {solarPanel,blanketBox,moduleShell,dish} from '#orbital-kit';
const PI=Math.PI;

// ISS采用八个主太阳翼的经典装配构型，不表示实时在轨配置。
// 网页比例约0.131单位/米：NASA给出桁架长94 m、跨太阳翼端到端109 m、同侧两翼纵向跨度73 m；
// Lockheed Martin给出单翼宽38 ft。舱段仅Unity（18 ft×14 ft）与Harmony（22 ft×14 ft）、Nauka（43 ft）按NASA数字换算，其余沿用原比例。
// 现有测试固定整站原始零件数与合并批次数，这里只调整尺寸、位置与连接，不增减网格。
const ISS_TRUSS_PITCH=1.12,ISS_TRUSS_HALF=.56;
function stationModule(B,g,r,len,pos,axis='z'){
 B.tube(g,r,r-.025,len,'airframe',pos,axis,PI,PI);
 B.cut(B.tube(g,r,r-.025,len,'airframe',pos,axis,0,PI));
 const map=(u,v,t)=>axis==='x'?[pos[0]+t,pos[1]+u,pos[2]+v]:axis==='y'?[pos[0]+u,pos[1]+t,pos[2]+v]:[pos[0]+u,pos[1]+v,pos[2]+t];
 for(const t of [-len/2,len/2]){
  B.cylinder(g,r*.94,.05,'porcelain',map(0,0,t),axis);
  B.tube(g,r*.45,r*.34,.09,'chrome',map(0,0,t*1.03),axis);
  B.cylinder(g,r*.34,.025,'dark',map(0,0,t*1.05),axis);
 }
 for(let j=0;j<=6;j++)B.torus(g,r+.004,.012,'chrome',map(0,0,-len/2+j*len/6),axis);
 // 舱外扶手的支脚从舱壁内侧伸到扶手中心，扶手与舱壁实际相连。
 const k=(r-.008)/(r+.05);
 for(const a of [0,PI/2,PI,PI*1.5]){
  const u=(r+.05)*Math.cos(a),v=(r+.05)*Math.sin(a);
  rod(B,g,map(u,v,-len*.35),map(u,v,len*.35),.012,'bronze');
  for(const t of [-len*.35,0,len*.35])rod(B,g,map(u*k,v*k,t),map(u,v,t),.014,'alloy');
 }
 // 设备机柜沿舱轴贴靠内壁，剖开后可见。
 const w=r*.45,h=r*.36,d=len*.16,v=-(r-.025)+h/2-.006,dims=axis==='x'?[d,w,h]:axis==='y'?[w,d,h]:[w,h,d];
 for(let i=0;i<4;i++)B.box(g,...dims,'navy',map(0,v,-len*.30+i*len*.2),.01);
}
export function buildStation(materials){
 const B=makeBuilder(materials),wings=[],fixedAssemblies=[],P=ISS_TRUSS_PITCH,H=ISS_TRUSS_HALF;
 for(let i=0;i<11;i++){
  const x=(i-5)*P,g=B.part('truss'+i,i===5?'主桁架中央段 S0':'主桁架第'+(i+1)+'段','INTEGRATED TRUSS','纵向管梁和交叉支杆组成主承力结构，各段端面对接。',[(i-5)*.25,1.0,0]);
  for(const y of [1.5,2.05])for(const z of [-.25,.25])rod(B,g,[x-H,y,z],[x+H,y,z],.023,'titanium');
  for(const dx of [-H,0,H]){
   for(const z of [-.25,.25])rod(B,g,[x+dx,1.5,z],[x+dx,2.05,z],.018,'alloy');
   for(const y of [1.5,2.05])rod(B,g,[x+dx,y,-.25],[x+dx,y,.25],.018,'alloy');
  }
  for(const z of [-.25,.25]){rod(B,g,[x-H,1.5,z],[x,2.05,z],.014);rod(B,g,[x,2.05,z],[x+H,1.5,z],.014);}
  for(const y of [1.5,2.05]){rod(B,g,[x-H,y,-.25],[x+H,y,.25],.014);rod(B,g,[x-H,y,.25],[x+H,y,-.25],.014);}
  // 中央段下方的支座落在命运号实验舱顶部；其余各段的设备箱压在下弦横杆上。
  if(i===5)B.box(g,.38,.30,.37,'foil',[x,1.44,0],.02);else B.box(g,.38,.22,.37,'foil',[x,1.62,0],.02);
 }
 // 外侧一对太阳翼越过桁架端部，使端到端跨度符合109 m；转接筒跨过桁架端面。
 for(const [i,x]of [-6.38,-4.57,4.57,6.38].entries()){
  const outer=Math.abs(x)>6,g=B.part('solar'+i,'第'+(i+1)+'组太阳翼','SOLAR ARRAY WINGS','每组两翼经转接筒连接桁架，每翼由中央桅杆和两侧电池毯组成。',[Math.sign(x)*1.2,1.5,0]);
  const pivot=subgroup(g,[x,1.79,0]);pivot.name='station-solar-pivot';
  B.cylinder(pivot,.26,outer?.50:.28,'titanium',[0,0,0],'x');
  for(const s of [-1,1]){
   rod(B,pivot,[0,0,0],[0,0,s*4.80],.025,'titanium');
   for(const dx of [-.39,.39]){const a=subgroup(pivot,[dx,0,s*2.70]);a.name='station-solar-blanket';solarPanel(B,a,.72,4.16,4,24);}
   for(let j=0;j<12;j++){const z=s*(.70+j*.34);rod(B,pivot,[-.08,-.05,z],[.08,.05,z+s*.15],.008,'bronze');}
  }
  wings.push(pivot);fixedAssemblies.push(pivot);
 }
 const main=[
  ['zvezda','星辰号服务舱',.28,1.23,[0,1,-3.0]],
  ['zarya','曙光号功能货舱',.30,1.20,[0,1,-1.69]],
  ['unity','团结号节点舱',.28,.72,[0,1,-.65]],
  ['destiny','命运号实验舱',.33,1.15,[0,1,.35]],
  ['harmony','和谐号节点舱',.28,.88,[0,1,1.43]]
 ];
 for(const [id,name,r,len,pos]of main){const g=B.part(id,name,'PRESSURIZED MODULE','舱段经端部对接环相连，外部包覆与内部设备分层展示。',[pos[0]*.4,-1.2,pos[2]*.5]);stationModule(B,g,r,len,pos);}
 // 侧向舱段端部对接环压入节点舱壁：希望号与哥伦布在和谐号两侧，宁静号与探索号在团结号两侧，科学号在星辰号对地一侧。
 const side=(node,len)=>node+len/2-.03;
 const cross=[['kibo','希望号实验舱',-side(.28,1.30),1.30,1.43,'x'],['columbus','哥伦布实验舱',side(.28,.86),.86,1.43,'x'],['tranquility','宁静号节点舱',-side(.28,.78),.78,-.65,'x'],['quest','探索号气闸舱',side(.28,.66),.66,-.65,'x'],['nauka','科学号实验舱',.74-.86*1.03,1.72,-2.9,'y']];
 for(const [id,name,c,len,z,axis]of cross){const g=B.part(id,name,'SIDE MODULE','侧向舱段经对接环连接节点舱，舱外扶手和接口可分别观察。',axis==='y'?[0,-1.6,z*.4]:[Math.sign(c)*1.7,-.7,z*.4]);stationModule(B,g,.27,len,axis==='y'?[0,c,z]:[c,1,z],axis);}
 const docking=B.part('docking','对接接口与转接舱','DOCKING ADAPTERS','和谐号前端与星辰号后端的接口形成载人及货运飞船的连接位置。',[0,-.2,2]);
 for(const z of [1.43+.44*1.03+.2,-3.0-.615*1.03-.2]){B.cylinder(docking,.18,.40,'airframe',[0,1,z],'z');B.tube(docking,.22,.15,.13,'chrome',[0,1,z+(z>0?.20:-.20)],'z');B.bolts(docking,Array.from({length:12},(_,i)=>[.19*Math.cos(i*TAU/12),1+.19*Math.sin(i*TAU/12),z]),'z',.012);}
 const cx=-side(.28,.78),cupola=B.part('cupola','穹顶舱与观察窗','CUPOLA','穹顶舱装在宁静号对地一侧，由中央窗和六扇周向窗组成七扇窗口。',[-1.5,-1.4,-.7]);
 B.cylinder(cupola,.27,.15,'airframe',[cx,.66,-.65],'y',.21,6);
 B.cylinder(cupola,.16,.02,'glass',[cx,.585,-.65],'y',.16,6);
 for(let i=0;i<6;i++){const a=i*TAU/6;const w=B.box(cupola,.16,.12,.012,'glass',[cx+.205*Math.cos(a),.66,-.65+.205*Math.sin(a)],.005);w.rotation.y=PI/2-a;}
 // NASA《ATCS Team Overview》：S1与P1各一翼主散热器，经热控旋转接头连到桁架，每翼一根散热器横梁承载三块散热器单元，
 // 每块八片白色板，展开23.3×3.4 m；光伏散热器共四块，分别在P4、P6、S4、S6，每块七片板，展开13.6×3.12 m。
 // 三块单元沿横梁并排、主散热器向后水平展开、光伏散热器朝下展开，以及每片板上的管路条数为网页补全。
 const RM=.131,ORU_L=23.3*RM,ORU_W=3.4*RM,PVR_L=13.6*RM,PVR_W=3.12*RM,hrsTube=new T.BoxGeometry(.012,.006,ORU_L/8-.01),pvrTube=new T.BoxGeometry(.012,PVR_L/7-.01,.006);
 for(const [i,s]of [-1,1].entries()){
  const g=B.part('radiator'+i,s<0?'左舷散热器':'右舷散热器','THERMAL RADIATORS','主散热器翼经热控旋转接头连接'+(s<0?'P1':'S1')+'桁架，横梁上三块散热器单元各八片白色板；外侧'+(s<0?'P4与P6':'S4与S6')+'各有一块七片板的光伏散热器。',[s*1.0,2,-1.5]);
  const tilt=-.04,beamZ=-.31;
  const joint=B.cylinder(g,.06,.22,'titanium',[s*1.12,1.5,beamZ],'x');joint.name='station-trrj';
  rod(B,g,[s*.64,1.5,beamZ],[s*2.08,1.5,beamZ],.03,'alloy').name='station-radiator-beam';
  for(let k=0;k<3;k++){const oru=subgroup(g,[s*(1.36+(k-1)*(ORU_W+.02)),1.5,beamZ]);oru.name='station-radiator-oru';oru.rotation.x=tilt;
   for(let j=0;j<8;j++){const z=-.025-ORU_L/16-j*(ORU_L/8-.002);B.box(oru,ORU_W,.022,ORU_L/8,'porcelain',[0,0,z],.004).name='station-hrs-panel';for(const tx of [-.15,-.05,.05,.15])B.mesh(oru,hrsTube,'alloy',[tx,.014,z]);}}
  for(const xc of [4.18,5.30]){const x=s*xc;rod(B,g,[x,1.5,-.25],[x,1.5,.25],.02,'titanium').name='station-pvr-mount';
   for(let j=0;j<7;j++){const y=1.5-.018-PVR_L/14-j*(PVR_L/7-.002);B.box(g,PVR_W,PVR_L/7,.02,'porcelain',[x,y,0],.004).name='station-pvr-panel';for(const tx of [-.1,.1])B.mesh(g,pvrTube,'alloy',[x+tx,y,.013]);}}
  fixedAssemblies.push(g);
 }
 const rus=B.part('rus-solar','俄方舱段太阳翼','RUSSIAN SEGMENT ARRAYS','小型太阳翼经支杆布置在服务舱和功能货舱两侧。',[0,-.5,-2.3]);
 for(const z of [-3.05,-1.7])for(const s of [-1,1]){rod(B,rus,[s*.27,1,z],[s*1.0,1,z],.018);const g=subgroup(rus,[s*1.12,1,z]);solarPanel(B,g,1.45,.38,12,3);}
 fixedAssemblies.push(rus);
 const arm=B.part('arm','空间站机械臂','ROBOTIC ARM','串联关节连接两段长臂，端部随关节运动而保持连接。',[-1.8,1.2,1.6]);
 const shoulder=subgroup(arm,[-.55,1.92,.35]);shoulder.name='station-arm-shoulder';B.cylinder(shoulder,.11,.17,'airframe',[0,0,0],'z');
 const upper=subgroup(shoulder);upper.name='station-arm-upper';rod(B,upper,[0,0,0],[0,1.10,0],.065,'porcelain');const elbow=subgroup(upper,[0,1.10,0]);elbow.name='station-arm-elbow';B.cylinder(elbow,.105,.18,'airframe',[0,0,0],'z');
 rod(B,elbow,[0,0,0],[0,1,0],.055,'porcelain');const wrist=subgroup(elbow,[0,1,0]);B.cylinder(wrist,.11,.18,'dark',[0,0,0]);B.tube(wrist,.14,.09,.10,'chrome',[0,.13,0],'y');
 // 实验平台接在希望号外端，设备箱压在平台上；天线支杆从桁架上弦伸到碟面底部。
 const kiboEnd=-side(.28,1.30)-.65,platform=B.part('platform','外部实验与设备平台','EXTERNAL PAYLOADS','实验平台接在希望号外端，设备箱、天线和通信结构连接舱体或桁架。',[1.7,.8,1.6]);
 B.box(platform,.80,.07,.8,'airframe',[kiboEnd-.38,1,1.43]);for(let i=0;i<4;i++)blanketBox(B,platform,.18,.20,.22,[kiboEnd-.65+i*.18,1.14,1.43]);
 const ant=subgroup(platform,[.30,2.23,-.25]);ant.rotation.x=-.6;dish(B,ant,.24);
 rod(B,platform,[.3,2,-.25],[.3,2.23+.09*Math.sin(.6),-.25+.09*Math.cos(.6)],.025);
 return {...B,fixedAssemblies,update(a,e){offsets(B,e);wings.forEach((g,i)=>g.rotation.x=.12*Math.sin(a*.12+i*.4));shoulder.rotation.z=-.50+.20*Math.sin(a*.18);elbow.rotation.z=.9+.24*Math.sin(a*.22);wrist.rotation.y=a*.12;}};
}

// 韦布网页比例约0.404单位/米。NASA：遮阳板21.2×14.2 m、五层、风筝形、各层互不接触；主镜18块六边形，
// 单块1.32 m，整镜6.6 m（STScI JDox写约6.5 m）；次镜0.74 m，三根近25 ft的可展开支杆，一根竖直，另两根与其成150°；
// STScI衍射图说明主镜给出两条竖直和四条斜向尖峰，所以镜片六边形的上下边水平。
// 支承塔按NASA描述为两段套接的黑色石墨环氧圆管。层间距、膜边下垂、背板分块与平台小件为网页补全。
const WEBB_K=.404,WEBB_SEG=.316,WEBB_HEX=.310,WEBB_MIRROR=[0,1.72,-.85];
function webbKite(scale){
 const L=21.2*WEBB_K/2*scale,W=14.2*WEBB_K/2*scale,corners=[[0,-L],[W,0],[0,L],[-W,0]],outline=[];
 for(let i=0;i<4;i++){const p=corners[i],q=corners[(i+1)%4],dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz);let nx=dz/len,nz=-dx/len;if(nx*(p[0]+q[0])+nz*(p[1]+q[1])<0){nx=-nx;nz=-nz;}
  for(let k=0;k<8;k++){const t=k/8,s=.025*len*4*t*(1-t);outline.push([p[0]+dx*t-nx*s,p[1]+dz*t-nz*s]);}}
 return {corners,outline};
}
export function buildWebb(materials){
 const B=makeBuilder(materials),[MX,MY,MZ]=WEBB_MIRROR,layerY=l=>-.30-l*.14,layerScale=l=>1-(4-l)*.02;
 // 第0组在最上方，对应NASA编号第5层（朝望远镜）；第4组在最下方，对应第1层（朝太阳）。
 for(let layer=0;layer<5;layer++){
  const n=5-layer,g=B.part('shield'+layer,'遮阳板第'+n+'层'+(n===1?'（朝阳面）':n===5?'（朝望远镜）':''),'SUNSHIELD LAYER','风筝形薄膜由四角撑杆分开，各层互不接触，边缘带加强索。',[0,-.65-layer*.36,0]);
  const scale=layerScale(layer),y=layerY(layer),{outline}=webbKite(scale),verts=[0,y+.06,0],idx=[];
  for(const [x,z]of outline)verts.push(x,y,z);
  for(let i=0;i<outline.length;i++)idx.push(0,i+1,(i+1)%outline.length+1);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();const m=B.mesh(g,geo,'foil');m.material.side=T.DoubleSide;m.material.color.setHex(n<=2?0xb3a9c4:0xc4c3cc);m.material.metalness=.72;m.material.roughness=.42;m.userData.sunshieldLayer=layer;m.name='webb-sunshield-membrane';
  for(let i=0;i<outline.length;i++){const p=outline[i],q=outline[(i+1)%outline.length];rod(B,g,[p[0],y,p[1]],[q[0],y,q[1]],.006,'titanium');}
 }
 const booms=B.part('booms','遮阳板撑杆与伸展杆','DEPLOYMENT BOOMS','两根中部伸展杆把遮阳板向两侧拉开，前后托架连接两端，四角撑杆分开五层薄膜。',[0,-.3,1.5]);
 const top=webbKite(layerScale(0)).corners,bottom=webbKite(layerScale(4)).corners,yTop=layerY(0),yBot=layerY(4);
 for(let i=0;i<4;i++){const a=top[i],b=bottom[i];rod(B,booms,[a[0]*1.004,yTop+.02,a[1]*1.004],[b[0]*1.004,yBot-.02,b[1]*1.004],.028,'titanium');}
 for(let i=0;i<4;i++){const b=bottom[i],start=i%2?[Math.sign(b[0])*.62,-.95,0]:[0,-.95,Math.sign(b[1])*.66];rod(B,booms,start,[b[0],yBot-.01,b[1]],.034,'titanium');for(const k of [.35,.7])B.cylinder(booms,.05,.07,'bronze',[start[0]+(b[0]-start[0])*k,-.95+(yBot+.95)*k,start[2]+(b[1]-start[2])*k],i%2?'x':'z');}
 const back=B.part('backplane','主镜背板与支承结构','MIRROR BACKPLANE','中央背板和两侧可折叠背板支承十八块镜片，背后安装科学仪器舱。',[0,.9,-1.6]);
 // 背板外缘收在镜片轮廓之内，只露出上部支杆座和下部塔架接口。
 const centerPlate=[[-.16,1.31],[.16,1.31],[.50,1.11],[.66,1.30],[.79,1.20],[.69,.84],[.69,-.95],[.20,-1.24],[.20,-1.57],[-.20,-1.57],[-.20,-1.24],[-.69,-.95],[-.69,.84],[-.79,1.20],[-.66,1.30],[-.50,1.11]];
 panel(B,back,centerPlate,.08,'dark',[MX,MY,-1.02],'xy').name='webb-backplane-center';
 for(const s of [-1,1]){panel(B,back,[[.80,.78],[1.09,.78],[1.20,.55],[1.20,-.55],[1.09,-.78],[.80,-.78],[.74,-.55],[.74,.55]].map(([x,y])=>[s*x,y]),.08,'dark',[0,MY,-1.02],'xy').name='webb-backplane-wing';for(const y of [-.5,.5])B.cylinder(back,.035,.16,'titanium',[s*.715,MY+y,-1.02],'y');}
 // 三处支杆座：投影上一根竖直向下，另两根与其成150°。
 const mounts=[[1.42,PI/3],[1.42,2*PI/3],[1.50,-PI/2]].map(([r,a])=>[r*Math.cos(a),MY+r*Math.sin(a)]);for(const [x,y]of mounts)B.box(back,.16,.14,.06,'dark',[x,y,-.955],.01);
 B.box(back,.30,.30,.10,'dark',[0,MY,-.93],.02);
 // 平顶六边形镜片：x=1.5s·q，y=√3·s·(r+q/2)，中央空位，外侧两列各三块为可折叠镜翼。
 let segment=0;
 for(let q=-2;q<=2;q++)for(let r=-2;r<=2;r++){
  if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))>2||(!q&&!r))continue;
  const x=1.5*WEBB_SEG*q,y=MY+Math.sqrt(3)*WEBB_SEG*(r+q/2);
  const g=B.part('mirror'+segment,'主镜六边形镜片 '+String(segment+1).padStart(2,'0'),'PRIMARY MIRROR SEGMENT','独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。',[x*.65,.8+(y-MY)*.5,1.4]);
  place(B,'mirror'+segment,[x,y,MZ]);
  const hex=Array.from({length:6},(_,i)=>[WEBB_HEX*Math.cos(i*TAU/6),WEBB_HEX*Math.sin(i*TAU/6)]);
  panel(B,g,hex,.045,'gold',[0,0,.025],'xy').userData.mirrorSegment=segment;
  panel(B,g,hex.map(p=>p.map(v=>v*.94)),.055,'dark',[0,0,-.028],'xy');
  for(let i=0;i<3;i++){const a=PI/2+i*TAU/3;B.cylinder(g,.025,.09,'titanium',[.16*Math.cos(a),.16*Math.sin(a),-.0925],'z');}
  segment++;
 }
 const lower=B.part('tower','可伸展支承塔','DEPLOYABLE TOWER','两段套接的黑色复合材料圆管把光学组件与下方航天器平台隔开。',[0,.4,-2.0]);
 rod(B,lower,[0,-.92,-.50],[0,-.40,-.71],.15,'dark');rod(B,lower,[0,-.46,-.686],[0,.02,-.88],.115,'dark');
 B.box(lower,.72,.20,.30,'dark',[0,.07,-.98],.02);
 const secondary=B.part('secondary','次镜与三根支杆','SECONDARY MIRROR','三根长支杆从背板边缘伸出，把0.74米次镜固定在主镜前方。',[0,1.5,1.5]);
 const SZ=1.75;
 for(const [x,y]of mounts){const a=Math.atan2(y-MY,x);rod(B,secondary,[x,y,-.925],[.195*Math.cos(a),MY+.195*Math.sin(a),SZ+.02],.022,'dark');}
 B.cylinder(secondary,.15,.10,'chrome',[0,MY,SZ],'z');B.tube(secondary,.21,.15,.10,'dark',[0,MY,SZ+.02],'z');
 const instruments=B.part('instruments','科学仪器舱与电子设备','SCIENCE INSTRUMENT MODULE','仪器舱贴在主镜背板后方，通过框架与光学组件相连。',[0,1,-2.8]);
 blanketBox(B,instruments,1.15,1.28,.65,[0,MY+.03,-1.38]);
 for(let i=0;i<4;i++)B.box(instruments,.19,.29,.16,'dark',[-.42+i*.28,MY+.08,-1.78],.02);
 const bus=B.part('bus','航天器平台与隔热板','SPACECRAFT BUS','平台位于遮阳板朝阳一侧，提供供电、通信与姿态控制设备的安装空间。',[0,-1.7,0]);
 blanketBox(B,bus,1.40,.52,1.45,[0,-1.16,0],'goldfoil');
 for(const s of [-1,1]){B.box(bus,.035,.42,1.3,'porcelain',[s*.72,-1.16,0],.015);for(let i=0;i<6;i++)B.box(bus,.015,.035,1.15,'alloy',[s*.743,-1.34+i*.07,0],0);}
 const power=B.part('power','太阳能电池板','SOLAR POWER','单组电池板位于遮阳结构的温暖侧。',[0,-1.4,-1.6]);
 const wing=subgroup(power,[0,-1.52,-2.20]);solarPanel(B,wing,1.1,2.35,8,18);rod(B,power,[0,-1.35,-.70],[0,-1.52,-2.2],.027);
 const antenna=B.part('antenna','通信天线与安装转台','COMMUNICATIONS','通信天线通过转台连接航天器平台。',[1.9,-1,0]);
 const dishPivot=subgroup(antenna,[1.2,-1.2,.4]);dishPivot.name='webb-antenna-gimbal';dish(B,dishPivot,.35);B.cylinder(dishPivot,.05,.14,'titanium',[0,0,.04],'z');rod(B,antenna,[.65,-1.2,.4],[1.2,-1.2,.4],.04);
 const trim=B.part('trim','尾部配平板与边缘支架','AFT MOMENTUM FLAP','尾部配平板经支杆连接后端托架。',[0,.5,-2.4]);
 const aft=bottom[0][1];B.box(trim,1.15,.025,.65,'porcelain',[0,yBot-.01,aft-.33],.02);for(const x of [-.5,.5])rod(B,trim,[0,yBot-.01,aft+.02],[x,yBot-.01,aft-.62],.018);
 return {...B,update(a,e){offsets(B,e);dishPivot.rotation.y=.10*Math.sin(a*.20);}};
}

// 薄膜外表面的低幅褶皱不进入内壁，端面保持共同接口平面。
function creasedTube(B,g,ro,ri,length,pos,start){
 const mesh=B.tube(g,ro,ri,length,'foil',pos,'x',start,PI),old=mesh.geometry,geo=new T.ExtrudeGeometry(old.parameters.shapes,{...old.parameters.options,steps:28});geo.translate(0,0,-length/2);const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,y);if(r<(ro+ri)/2)continue;const t=z/length+.5,a=Math.atan2(y,x),d=.006*Math.sin(PI*t)**2*(.55*Math.sin(13*a+TAU*7*t)+.30*Math.sin(21*a-15*t)+.15*Math.cos(5*a+43*t));p.setXYZ(i,x*(r+d)/r,y*(r+d)/r,z);}
 geo.computeVertexNormals();mesh.geometry=geo;mesh.name='hubble-thermal-skin';return mesh;
}
function piercedInstrument(B,g,points,hole,depth,pos,mat='foil'){
 const shape=new T.Shape(points.map(p=>new T.Vector2(...p)));shape.holes.push(hole);const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1,curveSegments:64});const mesh=B.mesh(g,geo,mat,pos);mesh.name='landsat-instrument-shell';B.cut(mesh);return mesh;
}
function rectangularHole(w,h){const hole=new T.Path();hole.moveTo(-w/2,-h/2);hole.lineTo(-w/2,h/2);hole.lineTo(w/2,h/2);hole.lineTo(w/2,-h/2);hole.closePath();return hole;}
function roundedCover(B,g,w,h,depth,mat,pos){
 const r=.32,shape=new T.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);shape.closePath();
 const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2,curveSegments:20,steps:1});geo.translate(0,0,-depth/2);geo.rotateY(PI/2);const mesh=B.mesh(g,geo,mat,pos);mesh.name='hubble-aperture-cover';return mesh;
}

export function buildHubble(materials){
 const B=makeBuilder(materials),wings=[];
 const tube=B.part('tube','光学镜筒与遮光环','OPTICAL TELESCOPE TUBE','圆筒遮光结构包围前部光路，环向结构连接蒙皮。',[-1.1,.7,0]);
 for(const sign of [-1,1]){const shell=creasedTube(B,tube,.80,.76,3.4,[-1.7,0,0],sign<0?PI:0);if(sign>0)B.cut(shell);}
 for(const x of [-3.38,-2.8,-2.1,-1.4,-.65,-.02]){B.torus(tube,.807,.009,'titanium',[x,0,0],'x');B.tube(tube,.76,.71,.03,'black',[x,0,0],'x');}
 for(let i=0;i<8;i++){const a=i*TAU/8;rod(B,tube,[-3.36,.811*Math.cos(a),.811*Math.sin(a)],[-.04,.811*Math.cos(a),.811*Math.sin(a)],.004,'gold');}
 const aft=B.part('aft','后部仪器舱外壳','AFT SHROUD','后舱包覆科学仪器和服务设备，检修盖按周向分布。',[1.5,.6,0]);
 B.tube(aft,1.10,1.06,3.37,'airframe',[1.965,0,0],'x',PI,PI);B.cut(B.tube(aft,1.10,1.06,3.37,'airframe',[1.965,0,0],'x',0,PI));
 for(const start of [0,PI]){const transition=B.tube(aft,1,.96,.28,'airframe',[.14,0,0],'x',start,PI);transition.geometry=transition.geometry.clone();const p=transition.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,y),radius=.80+.30*(z/.28+.5)-(1-r);p.setXYZ(i,x*radius/r,y*radius/r,z);}transition.geometry.computeVertexNormals();transition.name='hubble-aft-transition';if(start===0)B.cut(transition);}
 B.cylinder(aft,1.10,.08,'airframe',[3.65,0,0],'x');
 for(let i=0;i<12;i++){const a=i*TAU/12;rod(B,aft,[.34,1.112*Math.cos(a),1.112*Math.sin(a)],[3.60,1.112*Math.cos(a),1.112*Math.sin(a)],.012,'titanium');}
 for(const x of [.30,1.18,2.28,3.60])B.torus(aft,1.108,.010,'titanium',[x,0,0],'x');
 const primary=B.part('primary','主镜与中央开孔','PRIMARY MIRROR','主反射镜把入射光反射至前方次镜。',[-.2,-1.4,0]);
 B.lathe(primary,[[.12,-.08],[.31,-.075],[.52,-.05],[.66,-.018],[.66,.035],[.12,.035],[.12,-.08]],'chrome',[-.18,0,0],'x');B.tube(primary,.72,.66,.16,'dark',[-.12,0,0],'x');
 const secondary=B.part('secondary','次镜与支承杆','SECONDARY MIRROR','细支杆把次镜定位在镜筒前部。',[-2.0,1.4,0]);
 B.cylinder(secondary,.14,.13,'chrome',[-2.95,0,0],'x');for(let i=0;i<4;i++){const a=i*TAU/4;rod(B,secondary,[-2.95,0,0],[-2.95,.79*Math.cos(a),.79*Math.sin(a)],.014,'dark');}
 const frame=B.part('frame','内部光学支承框架','OPTICAL SUPPORT','纵向支杆和环形框架保持光学与仪器安装位置。',[0,-.7,-1.7]);
 for(const x of [-.08,.55,1.2,2.2,3.1])B.tube(frame,x<0?.76:.87,x<0?.70:.82,.06,'titanium',[x,0,0],'x');
 for(let i=0;i<8;i++){const a=i*TAU/8;rod(B,frame,[0,.85*Math.cos(a),.85*Math.sin(a)],[3.2,.85*Math.cos(a),.85*Math.sin(a)],.024);}
 const instruments=B.part('instruments','科学仪器与后部设备','SCIENCE INSTRUMENTS','多个独立设备箱安装在后部框架内。',[1.6,-.7,1.4]);
 for(let i=0;i<5;i++){const a=i*TAU/5;const g=subgroup(instruments,[2.05,.51*Math.cos(a),.51*Math.sin(a)]);g.rotation.x=a;blanketBox(B,g,1.2,.34,.40);B.box(g,.50,.07,.30,'dark',[0,.21,0],.02);for(const z of [-.1,.1])rod(B,g,[.15,.24,z],[.15,.325,z],.02,'titanium');}
 const electronics=B.part('electronics','电子设备与储能模块','ELECTRONICS','服务设备、线束和电池模块沿仪器舱布置。',[2.5,1.3,0]);
 for(let i=0;i<6;i++){const g=subgroup(electronics,[.875,.985*Math.cos(i*PI/3),.985*Math.sin(i*PI/3)]);g.rotation.x=i*PI/3;blanketBox(B,g,.46,.15,.34);}for(const z of [-.08,.08])B.path(electronics,[[.875,.93,z],[1.05,.80,z],[1.6,.80,z],[2.0,.74,z]],.016,'copper');
 for(const [i,sign]of [-1,1].entries()){
  const g=B.part('solar'+i,sign<0?'左太阳能电池翼':'右太阳能电池翼','SOLAR ARRAY','两块刚性分板通过径向支承轴连接镜筒，整个翼面绕支承轴转动。',[0,.7,sign*1.8]);
  B.tube(g,.12,.034,.18,'titanium',[.7,0,sign*1.155],'z');const pivot=subgroup(g,[.7,0,sign*1.155]);pivot.name='hubble-solar-pivot';
  const width=(3.7-.12)/2,height=3.7*2.6/7.1,boom=rod(B,pivot,[0,0,0],[0,0,sign*(1.245+height/2)],.034,'titanium');boom.name='hubble-solar-boom';
  const panels=subgroup(pivot,[0,0,sign*1.245]);panels.name='hubble-array-surface';
  for(const side of [-1,1]){const q=subgroup(panels,[side*(.06+width/2),0,0]);q.name='hubble-array-half';solarPanel(B,q,width-.018,height-.018,12,9);q.traverse(o=>{if(o.material&&o.userData.materialKey==='solar'){o.material.color.setHex(0x0a1017);o.material.metalness=.18;o.material.roughness=.44;o.material.clearcoat=.28;o.material.clearcoatRoughness=.32;o.material.envMapIntensity=.62;}});}
  B.box(panels,3.7,.045,.065,'titanium',[0,-.036,0],0);wings.push(pivot);
 }
 const antenna=B.part('antenna','双高增益通信天线','HIGH GAIN ANTENNAS','两副天线通过长支杆避开镜筒。',[1.5,1.5,1.2]),ants=[];
 for(const s of [-1,1]){rod(B,antenna,[2.8,s*1.085,0],[2.8,s*1.75,.45],.035);const p=subgroup(antenna,[2.8,s*1.75,.45]);dish(B,p,.30);B.cylinder(p,.065,.13,'titanium',[0,0,.05],'z');ants.push(p);}
 const door=B.part('door','前部孔径门与铰链','APERTURE DOOR','圆形门通过顶部铰链连接镜筒。',[-1.8,1.5,0]),hinge=subgroup(door,[-3.46,.86,0]);hinge.name='hubble-door-hinge';
 roundedCover(B,hinge,1.68,1.70,.04,'airframe',[0,-.86,0]);roundedCover(B,hinge,1.54,1.56,.006,'porcelain',[-.027,-.86,0]);B.cylinder(hinge,.07,.30,'chrome',[0,0,0],'z');for(const z of [-.10,.10]){rod(B,door,[-3.38,.79,z],[-3.46,.86,z],.022,'titanium');rod(B,hinge,[0,-.05,z],[0,-.17,z*2.2],.018,'titanium');}
 const fixtures=B.part('fixtures','扶手与维修接口','SERVICING FITTINGS','扶手和安装接口位于舱体外部。',[0,-1.4,1.4]);
 for(const x of [.4,1.2,2.0,2.8]){rod(B,fixtures,[x,-1.08,-.22],[x,-1.22,-.22],.02,'bronze');rod(B,fixtures,[x,-1.22,-.22],[x,-1.22,.22],.02,'bronze');rod(B,fixtures,[x,-1.22,.22],[x,-1.08,.22],.02,'bronze');}
 B.root.traverse(o=>{if(o.material&&o.userData.materialKey==='foil'){o.material.color.setHex(0xc5c9c9);o.material.metalness=.86;o.material.roughness=.36;o.material.bumpScale=.016;}});
 return {...B,update(a,e){offsets(B,e);wings.forEach(g=>g.rotation.z=.06*Math.sin(a*.17));hinge.rotation.z=-1.23+.04*Math.sin(a*.2);ants.forEach((g,i)=>g.rotation.y=.12*Math.sin(a*.15+i));}};
}

export function buildLandsat(materials){
 const B=makeBuilder(materials),outline=[[-.52,-.65],[.52,-.65],[.70,-.47],[.70,.47],[.52,.65],[-.52,.65],[-.70,.47],[-.70,-.47]];
 const frame=B.part('frame','卫星平台承力框架','SPACECRAFT STRUCTURE','八角平台连接上部仪器、单侧太阳翼和底部安装环。',[0,-1.3,0]);
 for(const [x,z]of outline)rod(B,frame,[x*.96,-.75,z*.96],[x*.96,.70,z*.96],.030,'titanium');
 for(const y of [-.75,.70]){const plate=panel(B,frame,outline,.09,'alloy',[0,y,0],'xz');plate.name='landsat-octagonal-deck';for(let i=0;i<8;i++){const a=outline[i],b=outline[(i+1)%8];rod(B,frame,[a[0],y,a[1]],[b[0],y,b[1]],.018,'titanium');}}
 const covers=B.part('covers','平台隔热包覆','THERMAL BLANKETS','八块包覆面沿削角平台排列，接缝和安装边分别显示。',[0,0,-1.7]);
 for(let i=0;i<8;i++){const a=outline[i],b=outline[(i+1)%8],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),nx=dz/length,nz=-dx/length,center=[(a[0]+b[0])/2+nx*.005,0,(a[1]+b[1])/2+nz*.005],face=B.box(covers,length-.008,1.31,.025,'goldfoil',center,.004);face.rotation.y=Math.atan2(nx,nz);face.name='landsat-blanket-face';if(center[2]>=0)B.cut(face);for(const y of [-.645,.645])rod(B,covers,[a[0]+nx*.022,y,a[1]+nz*.022],[b[0]+nx*.022,y,b[1]+nz*.022],.005,'titanium');}
 const electronics=B.part('electronics','电子设备与配电组件','AVIONICS','多个设备箱连接平台底板，线束沿框架集中布置。',[-1.5,-.7,0]);
 for(let i=0;i<6;i++){const x=i%2?.32:-.32,z=-.42+Math.floor(i/2)*.42;B.box(electronics,.51,.23,.30,'dark',[x,-.59,z],.02);B.box(electronics,.42,.03,.24,'circuit',[x,-.46,z],.01);}
 for(const x of [-.5,.5])B.path(electronics,[[x,-.52,-.55],[x,.35,-.55],[x,.60,0],[x,.7,.45]],.018,'copper');
 const oli=B.part('oli','OLI-2 光学成像仪','OPERATIONAL LAND IMAGER','多面外罩与矩形遮光口连接平台上部，实际入光通道通至内部观察面。',[-1.2,1.3,.8]);
 const profile=[[-.51,-.37],[.43,-.37],[.51,-.18],[.39,.34],[-.35,.34],[-.51,.10]],shell=piercedInstrument(B,oli,profile,rectangularHole(.60,.34),.98,[-.29,1.13,-.51]);
 const back=panel(B,oli,profile,.022,'foil',[-.29,1.13,-.511],'xy');back.name='landsat-oli-back';
 const sh=new T.Shape([[-.36,-.22],[.36,-.22],[.36,.22],[-.36,.22]].map(p=>new T.Vector2(...p)));sh.holes.push(rectangularHole(.60,.32));const hoodGeo=new T.ExtrudeGeometry(sh,{depth:.61,bevelEnabled:false,steps:1});const hp=hoodGeo.attributes.position;
 for(let i=0;i<hp.count;i++){const x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i),t=z/.61;hp.setXYZ(i,x+Math.sign(x)*.09*t,y+Math.sign(y)*.06*t,z);}hoodGeo.computeVertexNormals();const hood=B.mesh(oli,hoodGeo,'black',[-.29,1.13,.45]);hood.name='landsat-oli-hood';
 B.box(oli,.60,.34,.016,'optics',[-.29,1.13,.35],0);for(const x of [-.62,.10])for(const z of [-.27,.27])B.box(oli,.12,.06,.15,'titanium',[x,.76,z],.005);
 const tirs=B.part('tirs','TIRS-2 热红外传感器','THERMAL INFRARED SENSOR','独立红外仪器通过底脚连接平台，遮光筒内保留入光空间。',[1.4,1.2,.6]);
 const circle=new T.Path();circle.absarc(0,0,.205,0,TAU,true);piercedInstrument(B,tirs,[[-.33,-.38],[.33,-.38],[.33,.30],[.25,.38],[-.25,.38],[-.33,.30]],circle,.76,[.61,1.15,-.50]);
 B.box(tirs,.60,.70,.024,'foil',[.61,1.15,-.51],.01);B.tube(tirs,.235,.195,.54,'black',[.61,1.15,.50],'z');B.cylinder(tirs,.205,.015,'optics',[.61,1.15,.17],'z');B.torus(tirs,.233,.010,'titanium',[.61,1.15,.77],'z');for(const x of [.38,.68])for(const z of [-.28,.18])B.box(tirs,.10,.06,.13,'titanium',[x,.76,z],.005);
 const earth=B.part('earthshield','仪器遮光板与支架','EARTH SHIELD','独立白色板与三角支架位于红外仪器外侧。',[1.2,1.9,-.7]);
 const shield=B.box(earth,1.10,1.05,.025,'porcelain',[1.025,1.42,-.15],.025);shield.rotation.y=PI/2;shield.name='landsat-radiator-screen';rod(B,earth,[.50,.745,-.62],[1.01,1.12,-.62],.023);rod(B,earth,[.50,.745,-.62],[1.01,1.78,-.62],.018);rod(B,earth,[.66,.745,.32],[1.01,1.12,.32],.023);rod(B,earth,[1.0,1.12,.32],[1.0,1.78,.32],.018);
 const power=B.part('power','单侧太阳能电池翼','SOLAR ARRAY','四段电池板通过根部转轴和背部支承连接卫星平台。',[2.2,.7,0]),pivot=subgroup(power,[.80,0,0]);pivot.name='landsat-solar-hinge';
 B.cylinder(pivot,.12,.26,'bronze',[0,0,0],'x');const spar=rod(B,pivot,[.12,-.065,0],[6.12,-.065,0],.025,'titanium');spar.name='landsat-array-spar';
 const yoke=B.box(pivot,.39,.03,1.60,'porcelain',[.295,0,0],.01);yoke.name='landsat-array-yoke';B.cylinder(pivot,.025,.07,'titanium',[.295,-.030,0],'y');
 // 线框图量得根部轭板约0.39、首段约0.74、其余三段约1.58，高1.62，按平台宽度换算。
 const widths=[.74,1.58,1.58,1.58],height=1.62,gap=.05;let edge=.49+gap;
 for(const [i,width]of widths.entries()){const x=edge+width/2,q=subgroup(pivot,[x,0,0]);q.name='landsat-panel-'+i;solarPanel(B,q,width-.018,height-.018,Math.round(width*6.4),10);B.cylinder(pivot,.025,.07,'titanium',[x,-.030,0],'y');for(const z of [-.55,.55]){const hinge=B.cylinder(pivot,.03,.12,'titanium',[edge-gap/2,0,z],'z');hinge.name='landsat-panel-hinge';}edge+=width+gap;}
 const radiator=B.part('radiator','散热面与导热连接','RADIATOR','白色散热板连接仪器与平台外部。',[-1.8,.6,-1.3]);
 B.box(radiator,.06,1.2,1.15,'porcelain',[-.7475,0,-.02],.015);for(let i=0;i<12;i++)B.box(radiator,.015,.025,1.02,'alloy',[-.783,-.5+i*.09,-.02],0);
 const communication=B.part('antenna','通信天线与支撑','COMMUNICATIONS','天线经支架安装在卫星平台下方。',[-1.6,-1,.7]),antenna=subgroup(communication,[-.62,-1.02,.50]);antenna.rotation.x=PI/2;dish(B,antenna,.22);B.cylinder(antenna,.06,.14,'titanium',[0,0,.04],'z');rod(B,communication,[-.50,-.79,.40],[-.62,-1.02,.50],.03);
 const attitude=B.part('attitude','姿态测量设备与内部轮组','ATTITUDE COMPONENTS','外部光学测量头和内部轮组分别安装在框架上。',[0,-1.7,1.1]),wheels=[];
 for(let i=0;i<3;i++){const q=subgroup(attitude,[-.36+i*.36,.1,0]);q.rotation.x=i*PI/3;B.cylinder(q,.14,.11,'dark',[0,0,0],'z');const wheel=subgroup(q);B.cylinder(wheel,.11,.13,'chrome',[0,0,0],'z');B.box(wheel,.08,.02,.01,'bronze',[0,.07,.069],0);wheels.push(wheel);for(const dx of [-.125,.125])if(Math.abs(-.36+i*.36+dx)<.3)rod(B,attitude,[-.36+i*.36+dx,.155,0],[-.36+i*.36+dx,.665,0],.012,'titanium');}
 for(const x of [-.5,.5]){B.box(attitude,.18,.16,.16,'dark',[x,.66,-.53]);B.cylinder(attitude,.055,.14,'optics',[x,.66,-.66],'z');}
 const base=B.part('adapter','安装适配环与底部接口','LAUNCH ADAPTER','底部环形接口连接平台承力结构。',[0,-2.0,0]);
 B.tube(base,.51,.44,.18,'titanium',[0,-.84,0],'y');B.bolts(base,Array.from({length:16},(_,i)=>[.47*Math.cos(i*TAU/16),-.94,.47*Math.sin(i*TAU/16)]),'y',.018);
 B.root.traverse(o=>{if(o.material&&o.userData.materialKey==='foil'){o.material.color.setHex(0xc5c9c9);o.material.metalness=.86;o.material.roughness=.36;}if(o.material&&o.userData.materialKey==='goldfoil'){o.material.color.setHex(0xc7a458);o.material.metalness=.80;o.material.roughness=.40;}if(o.material&&o.userData.materialKey==='solar'){o.material.color.setHex(0x0f2442);o.material.metalness=.35;o.material.roughness=.34;o.material.clearcoat=.3;o.material.envMapIntensity=.7;}});
 return {...B,update(a,e){offsets(B,e);pivot.rotation.x=.12*Math.sin(a*.18);antenna.rotation.y=.08*Math.sin(a*.2);wheels.forEach((g,i)=>g.rotation.z=a*(.25+i*.12));}};
}
