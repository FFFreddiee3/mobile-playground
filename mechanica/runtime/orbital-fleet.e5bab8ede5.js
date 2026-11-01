import * as T from '#three';
import {makeBuilder,TAU} from '#geometry';
import {subgroup,offsets,panel,rod,ellipsoid} from '#vehicle-kit';
import {solarPanel,blanketBox,dish} from '#orbital-kit';
const PI=Math.PI;

// 六个航天器的公开外形比例写在各构造函数开头，未公开的细部为网页补全。
// 活动件与固定件之间保留0.0005至0.002的展示间隙，低于接触判据0.004，转动时不穿过固定结构。

// 外表面带低幅褶皱的薄板，用于多层隔热毯。褶皱幅度在板边归零，侧面不开缝。
function creasedPlate(B,g,w,h,t,mat,pos,yaw=0,amp=.0035,seg=18){
 const geo=new T.BoxGeometry(w,h,t,seg,seg,1),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const z=p.getZ(i);if(z<t/2-1e-9)continue;const u=p.getX(i)/w+.5,v=p.getY(i)/h+.5,e=Math.sin(PI*u)*Math.sin(PI*v);p.setZ(i,z+amp*e*(.55*Math.sin(19*u+13*v)+.45*Math.sin(31*v-9*u+1.3)));}
 geo.computeVertexNormals();const m=B.mesh(g,geo,mat,pos);m.rotation.y=yaw;m.name='mli-blanket';return m;
}
// 正六边形板，角点从+z起每60度一个；可带圆孔，挤出方向为y。
function hexPlate(B,g,R,depth,mat,pos,hole=0,rot=PI/6){
 const s=new T.Shape();for(let i=0;i<6;i++){const a=rot+i*PI/3;i?s.lineTo(R*Math.sin(a),R*Math.cos(a)):s.moveTo(R*Math.sin(a),R*Math.cos(a));}s.closePath();
 if(hole){const h=new T.Path();h.absarc(0,0,hole,0,TAU,true);s.holes.push(h);}
 const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:48,steps:1});geo.translate(0,0,-depth/2);geo.rotateX(PI/2);return B.mesh(g,geo,mat,pos);
}
// 六面墙板，外表面位于边心距处；cut列出的墙面在剖切时移去。
function hexWalls(B,g,R,y0,y1,t,mat,cut=[]){
 const a=R*Math.cos(PI/6),out=[];
 for(let k=0;k<6;k++){const ang=k*PI/3,m=B.box(g,R,y1-y0,t,mat,[(a-t/2)*Math.sin(ang),(y0+y1)/2,(a-t/2)*Math.cos(ang)],0);m.rotation.y=ang;if(cut.includes(k))B.cut(m);out.push(m);}
 return out;
}
// 抛物面反射器，开口朝局部+z，背部中心在原点。
function reflector(B,g,r,depth,mat='porcelain'){
 const pts=[];for(let i=0;i<=8;i++){const q=r*i/8;pts.push([q,depth*(q/r)**2]);}
 const back=[];for(let i=8;i>=0;i--){const q=r*i/8;back.push([q,depth*(q/r)**2-.014]);}
 const m=B.lathe(g,[...pts,...back],mat,[0,0,0],'z');m.material.side=T.DoubleSide;m.name='reflector-dish';
 B.torus(g,r,.012,'titanium',[0,0,depth-.006],'z');
 B.cylinder(g,r*.16,.05,'titanium',[0,0,-.03],'z');
 for(let i=0;i<6;i++){const a=i*TAU/6;rod(B,g,[r*.14*Math.cos(a),r*.14*Math.sin(a),-.02],[r*.98*Math.cos(a),r*.98*Math.sin(a),depth*.96-.014],.008,'titanium');}
 return m;
}
// 太阳翼：固定驱动座、转动轴、根部轭架（或轭板）与成排电池板。局部+x向外，电池面朝局部+y。
function arrayWing(B,part,at,rot,{n,pw,ph,gap=.05,yoke=.5,rh=.06,cells=[8,6],yokePanel=false,name='array-tracker'}){
 const mount=subgroup(part,at);mount.rotation.set(...rot);
 B.cylinder(mount,rh*1.7,.024,'titanium',[.012,0,0],'x');
 B.tube(mount,rh,rh*.78,.14,'dark',[.094,0,0],'x');
 for(let i=0;i<4;i++){const a=PI/4+i*PI/2;B.box(mount,.12,.012,.012,'titanium',[.084,rh*1.02*Math.cos(a),rh*1.02*Math.sin(a)],0).rotation.x=-a;}
 const tracker=subgroup(mount);tracker.name=name;
 const sr=rh*.78*.985;B.cylinder(tracker,sr,.24,'chrome',[.154,0,0],'x');B.cylinder(tracker,rh*1.15,.06,'titanium',[.274,0,0],'x');
 const x0=.304+yoke,panels=[];
 if(yokePanel){const y=subgroup(tracker,[.304+(yoke-gap)/2-.004,0,0]);y.name='array-yoke';B.box(y,yoke-gap+.008,.026,ph*.82,'porcelain',[0,0,0],0);for(const z of [-1,1])B.box(y,yoke-gap+.008,.04,.03,'titanium',[0,0,z*ph*.41],0);rod(B,y,[-(yoke-gap)/2,0,0],[(yoke-gap)/2,0,0],.022,'titanium');
  for(const z of [-1,1])B.cylinder(tracker,gap/2+.012,.12,'titanium',[x0-gap/2,0,z*ph*.3],'z');}
 else for(const z of [-1,1]){rod(B,tracker,[.29,0,z*rh*.5],[x0+.006,0,z*ph*.36],.018,'titanium');rod(B,tracker,[.29,-.03,0],[x0+.006,-.02,z*ph*.2],.012,'titanium');}
 for(let i=0;i<n;i++){
  const c=x0+.009+pw/2+i*(pw+.018+gap),p=subgroup(tracker,[c,0,0]);p.name='array-panel';solarPanel(B,p,pw,ph,...cells);panels.push(p);
  if(i<n-1)for(const z of [-1,1])B.cylinder(tracker,gap/2+.010,.10,'titanium',[c+pw/2+.009+gap/2,0,z*ph*.3],'z');
 }
 return {tracker,panels,length:x0+n*(pw+.018)+(n-1)*gap};
}
// 反作用轮：固定底板、侧罩和轴，转子由轮缘、辐板和轮毂组成，轮毂内孔与轴保留展示间隙。
function reactionWheel(B,holderParent,pos,tilt,rw,pedestalBottom){
 const deck=pos[1];B.cylinder(holderParent,rw*.12,pos[1]+.004-pedestalBottom,'titanium',[pos[0],(pos[1]+.004+pedestalBottom)/2,pos[2]],'y',rw*.12,16);
 const holder=subgroup(holderParent,[pos[0],deck+.006,pos[2]]);holder.rotation.set(tilt[0],0,tilt[1]);
 B.cylinder(holder,rw*1.18,.012,'dark',[0,0,0],'y');B.tube(holder,rw*1.18,rw*1.08,rw*.62,'dark',[0,.006+rw*.31,0],'y');
 B.cylinder(holder,rw*.11,rw*.62,'steel',[0,.006+rw*.31,0],'y',rw*.11,24);
 const wheel=subgroup(holder,[0,.006+rw*.31,0]);wheel.name='attitude-wheel';
 B.tube(wheel,rw*.98,rw*.80,rw*.40,'chrome',[0,0,0],'y');B.tube(wheel,rw*.81,rw*.20,rw*.08,'alloy',[0,0,0],'y');B.tube(wheel,rw*.26,rw*.115,rw*.40,'chrome',[0,0,0],'y');
 B.box(wheel,rw*.32,.008,rw*.07,'bronze',[rw*.52,rw*.04+.004,0],0);
 return wheel;
}
function finish(B){
 B.root.traverse(o=>{if(!o.material||!o.isMesh)return;const k=o.userData.materialKey,m=o.material;
  if(k==='solar'){m.color.setHex(0x0f2442);m.metalness=.35;m.roughness=.34;m.clearcoat=.3;m.envMapIntensity=.7;}
  if(k==='goldfoil'){m.color.setHex(0xc7a458);m.metalness=.80;m.roughness=.40;}
  if(k==='foil'){m.color.setHex(0xc5c9c9);m.metalness=.86;m.roughness=.36;}
 });
}

// 箱形平台。四角立柱、上下层板和中心承力筒为主结构；南北两侧为散热面，东西两侧覆隔热毯。
// 电子设备和电池贴装在散热面内侧，反作用轮装在底层板上，底部为对接环。
function satelliteBus(B,w,h,d,{rc=Math.min(w,d)*.2,wheelSide=1}={}){
 const t=.04,post=.03,top=h/2,bottom=-h/2;
 const frame=B.part('frame','平台承力框架','SPACECRAFT FRAME','中心承力筒、上下层板和四角立柱组成主承力结构，外板与设备都固定在这一框架上。',[0,-1.3,0]);
 for(const y of [bottom+t/2,top-t/2])B.box(frame,w,t,d,'alloy',[0,y,0],0);
 for(const x of [-1,1])for(const z of [-1,1])B.cylinder(frame,post,h-2*t,'titanium',[x*(w/2-post),0,z*(d/2-post)],'y',post,16);
 B.tube(frame,rc,rc-.018,h-2*t,'airframe',[0,0,0],'y');
 const covers=B.part('covers','东西侧多层隔热毯','THERMAL BLANKETS','两侧隔热毯贴合层板和立柱外缘，压条分隔各块包覆，前侧剖开后露出内部设备。',[0,.6,-1.7]);
 for(const s of [-1,1]){const m=creasedPlate(B,covers,w,h,.02,'goldfoil',[0,0,s*(d/2+.01)],s<0?PI:0);if(s>0)B.cut(m);
  for(const x of [-w*.25,w*.25])B.box(covers,.014,h,.004,'bronze',[x,0,s*(d/2+.0215)],0);B.box(covers,w,.014,.004,'bronze',[0,0,s*(d/2+.0215)],0);}
 const bd=Math.min(.2,(w/2-rc)*.55),electronics=B.part('electronics','电子设备箱与线束','AVIONICS','设备箱贴装在散热板内侧，电路板和线束沿箱体朝内一侧布置。',[-1.4,-.5,-.8]);
 for(const s of [-1,1]){for(const y of [h*.12,h*.32])for(const z of [-d*.22,d*.22]){B.box(electronics,bd,h*.15,d*.30,'dark',[s*(w/2-bd/2),y,z],0);B.box(electronics,.006,h*.11,d*.24,'circuit',[s*(w/2-bd-.003),y,z],0);}
  B.path(electronics,[[s*(w/2-bd/2),h*.12,-d*.22],[s*(w/2-bd-.02),h*.22,0],[s*(w/2-bd/2),h*.32,d*.22]],.011,'copper');}
 const batteries=B.part('batteries','蓄电池组与配电','BATTERY PACKS','两组蓄电池贴装在散热板下半部内侧，单体顶部由连接条串接。',[1.4,-1.2,0]);
 for(const s of [-1,1]){B.box(batteries,bd,h*.22,d*.5,'black',[s*(w/2-bd/2),-h*.22,0],0);for(let i=0;i<4;i++)B.box(batteries,.008,h*.18,d*.08,'porcelain',[s*(w/2-bd-.004),-h*.22,-d*.18+i*d*.12],0);}
 const radiator=B.part('radiator','南北散热面与热管','RADIATOR PANELS','两侧白色散热板外表面排列光学反射片，内侧水平热管把设备热量传到板面。',[-1.7,.7,0]);
 const tiles=[],ty=Math.max(4,Math.round(h/.16)),tz=Math.max(3,Math.round(d/.16)),tileH=(h-.04)/ty,tileD=(d-.04)/tz;
 for(const s of [-1,1]){B.box(radiator,.03,h,d,'porcelain',[s*(w/2+.015),0,0],0);
  for(let i=0;i<ty;i++)for(let j=0;j<tz;j++)tiles.push({p:[s*(w/2+.032),-h/2+.02+(i+.5)*tileH,-d/2+.02+(j+.5)*tileD]});
  for(let i=0;i<5;i++)B.box(radiator,.012,.018,d*.7,'alloy',[s*(w/2-.006),bottom+h*(.18+i*.16),0],0);}
 B.instances(radiator,new T.BoxGeometry(.004,tileH*.94,tileD*.94),'chrome',tiles);
 const attitude=B.part('attitude','反作用轮组','REACTION WHEELS','三个倾斜安装的反作用轮通过立座固定在底层板上，转子在罩内转动。',[0,-.8,1.5]),wheels=[];
 const rw=Math.min(.13,(d/2-.06-rc)/2*.85,(w/2-bd)/3.2),zc=wheelSide*(rc+d/2-.06)/2;
 for(const [x,z,tilt]of [[-(w/2-bd)*.5,zc,[.35,.35]],[(w/2-bd)*.5,zc,[.35,-.35]],[0,-zc,[-.4,0]]])wheels.push(reactionWheel(B,attitude,[x,bottom+t+rw*1.25,z],tilt,rw,bottom+t));
 const adapter=B.part('adapter','底部对接环与包带','LAUNCH ADAPTER','底层板下方的对接环与中心承力筒同轴，包带和螺栓把卫星固定在运载器接口上。',[0,-1.9,0]);
 B.tube(adapter,rc+.03,rc-.03,.10,'titanium',[0,bottom-.05,0],'y');B.torus(adapter,rc+.03,.012,'chrome',[0,bottom-.09,0],'y');
 B.bolts(adapter,Array.from({length:16},(_,i)=>[rc*Math.cos(i*TAU/16),bottom-.096,rc*Math.sin(i*TAU/16)]),'y',.012);
 return {wheels,tick:a=>wheels.forEach((g,i)=>g.rotation.y=a*(.9+i*.25)),bd};
}

// GPS III：LM2100平台。翼展15米按DLR论文，平台短边1.8米按LM2100资料；翼板数与天线单元数为网页补全。
export function buildNavigation(materials){
 const B=makeBuilder(materials),w=1.55,h=1.85,d=1.45,k=w/1.8,bus=satelliteBus(B,w,h,d),wings=[];
 const tip=7.5*k,panels=3,gap=.05,yoke=.42,pw=(tip-(w/2+.03)-.304-yoke-(panels-1)*gap)/panels-.018;
 for(const [i,s]of [-1,1].entries()){
  const g=B.part('solar'+i,s<0?'左侧太阳翼':'右侧太阳翼','SOLAR ARRAY','根部驱动座固定在散热板中央，三段电池板由铰链串接，整翼绕根部转轴跟随太阳方向转动。',[s*2.0,.4,0]);
  wings.push(arrayWing(B,g,[s*(w/2+.03),0,0],[0,s<0?PI:0,0],{n:panels,pw,ph:1.25,gap,yoke,cells:[9,7]}).tracker);
 }
 const nav=B.part('navigation','对地L波段天线阵','L-BAND ANTENNA','对地面板上排布螺旋天线单元，白色天线罩下方为金属底座。',[0,1.8,.3]);
 B.box(nav,.96,.035,.96,'porcelain',[0,h/2+.0175,0],0);B.box(nav,.90,.012,.90,'gold',[0,h/2+.041,0],0);
 const elems=[];for(let i=0;i<12;i++){const ring=i<4?.17:.36,n=i<4?4:8,j=i<4?i:i-4,a=j*TAU/n+(i<4?PI/4:0);elems.push([ring*Math.cos(a),ring*Math.sin(a)]);}
 for(const [x,z]of elems){B.cylinder(nav,.058,.03,'chrome',[x,h/2+.062,z],'y');B.cylinder(nav,.045,.17,'ceramic',[x,h/2+.162,z],'y');B.cylinder(nav,.048,.012,'porcelain',[x,h/2+.252,z],'y');}
 const clocks=B.part('clocks','原子钟与导航信号设备','ATOMIC CLOCKS','三台时间基准设备吊装在顶层板下方，导航信号单元与其相邻。',[1.6,.6,-.9]);
 for(let i=0;i<3;i++){const x=(i-1)*.36;blanketBox(B,clocks,.28,.20,.28,[x,h/2-.04-.10,-.50],'airframe');B.cylinder(clocks,.06,.03,'bronze',[x,h/2-.04-.215,-.50],'y');}
 B.box(clocks,.8,.12,.14,'dark',[0,h/2-.04-.06,.5],0);
 const feeds=B.part('feeds','测控天线与支杆','TT&C ANTENNAS','测控天线经细支杆立在顶层板角部，与对地天线阵分开布置。',[-1.5,1.0,1.2]);
 for(const [x,z]of [[-.62,.56],[.62,-.56]]){rod(B,feeds,[x,h/2-.01,z],[x,h/2+.36,z],.016,'titanium');B.cylinder(feeds,.05,.16,'ceramic',[x,h/2+.42,z],'y');B.cylinder(feeds,.065,.012,'chrome',[x,h/2+.345,z],'y');}
 finish(B);
 return {...B,update(a,e){offsets(B,e);bus.tick(a);wings.forEach((g,i)=>g.rotation.x=(i?-1:1)*.30*Math.sin(a*.12));}};
}

// 地球同步通信卫星：泛化型，外形参照Boeing 702（Anik F1公开事实页）。
// 太阳翼端到端40.4米、每翼5块板，东西两面2.4米反射器、对地面2面2.2米反射器，天线方向宽约9米；4台25厘米离子推力器位置为网页补全。
export function buildCommunication(materials){
 const B=makeBuilder(materials),k=.5,w=2.1*k,h=3.6*k,d=3.4*k,bus=satelliteBus(B,w,h,d),wings=[];
 const tip=40.4/2*k,panels=5,gap=.05,yoke=.9,pw=(tip-(w/2+.03)-.304-yoke-(panels-1)*gap)/panels-.018;
 for(const [i,s]of [-1,1].entries()){
  const g=B.part('solar'+i,s<0?'北侧太阳翼':'南侧太阳翼','SOLAR ARRAY','五块电池板经轭架和驱动座连接散热板，整翼绕根部转轴跟随太阳方向转动。',[s*2.1,.5,-.4]);
  wings.push(arrayWing(B,g,[s*(w/2+.03),h*.06,0],[0,s<0?PI:0,0],{n:panels,pw,ph:1.15,gap,yoke,rh:.07,cells:[10,7]}).tracker);
 }
 // 0、1为东西两面展开反射器，2、3为对地面反射器；反射面朝向对地面上的馈源。
 const specs=[[1,2.4*k/2,'东侧展开反射器'],[-1,2.4*k/2,'西侧展开反射器'],[1,2.2*k/2,'对地面东向反射器'],[-1,2.2*k/2,'对地面西向反射器']];
 for(const [i,[s,r,name]]of specs.entries()){
  const g=B.part('reflector'+i,name,'COMMUNICATIONS REFLECTOR',i<2?'反射器经展开臂和铰链座连接东西侧面，反射面朝向对地面馈源。':'塔架把反射器支在对地面上方，反射面朝向外侧覆盖区。',[s*0,i<2?.6:1.2,s*1.6]);
  if(i<2){const hinge=[0,h/2-.12,s*(d/2+.02)],at=[0,h/2+.18,s*(d/2+.78)];B.box(g,.16,.10,.03,'titanium',[0,h/2-.12,s*(d/2+.035)],0);B.cylinder(g,.03,.18,'chrome',[0,h/2-.12,s*(d/2+.06)],'x');
   const pivot=subgroup(g,at);pivot.rotation.x=-PI/2-s*.42;reflector(B,pivot,r,r*.32);
   const p=pivot.position,arm=new T.Vector3(0,0,-.05).applyEuler(pivot.rotation).add(p);rod(B,g,[0,h/2-.12,s*(d/2+.06)],arm.toArray(),.022,'titanium');}
  else{const base=[0,h/2,s*.36],at=[0,h/2+.42,s*.55];rod(B,g,base,[0,at[1]-.06,at[2]],.04,'titanium');B.box(g,.14,.03,.14,'titanium',[0,h/2+.015,s*.36],0);
   const pivot=subgroup(g,at);pivot.rotation.x=-PI/2+s*.62;reflector(B,pivot,r,r*.30);
   const arm=new T.Vector3(0,0,-.05).applyEuler(pivot.rotation).add(pivot.position);rod(B,g,[0,at[1]-.06,at[2]],arm.toArray(),.03,'titanium');}
 }
 const payload=B.part('payload','对地面馈源与输出复用器','FEEDS & MULTIPLEXERS','喇叭馈源对准各反射器，圆柱形输出复用器与设备箱装在对地面上。',[0,1.9,-.5]);
 for(const s of [-1,1]){const g=subgroup(payload,[0,h/2,s*(d/2-.16)]);g.rotation.x=s*.5;B.box(g,.24,.05,.18,'titanium',[0,.025,0],0);
  for(const x of [-.07,.07])B.lathe(g,[[.018,.04],[.055,.24],[.048,.24],[.012,.04]],'gold',[x,0,0],'y');}
 for(const s of [-1,1])for(let i=0;i<3;i++){B.cylinder(payload,.035,.18,'alloy',[s*(w/2-.12),h/2+.09,-.24+i*.24],'y');B.box(payload,.10,.03,.08,'bronze',[s*(w/2-.12),h/2+.015,-.24+i*.24],0);}
 const thrusters=B.part('thrusters','离子推力器与指向支架','ION THRUSTERS','四台离子推力器经指向支架装在平台底部四角，推力器出口朝外倾斜。',[0,-1.3,-1.7]);
 for(const sx of [-1,1])for(const sz of [-1,1]){const at=[sx*(w/2-.14),-h/2,sz*(d/2-.20)];B.box(thrusters,.14,.05,.14,'titanium',[at[0],at[1]-.025,at[2]],0);
  const p=subgroup(thrusters,[at[0],at[1]-.05,at[2]]);p.rotation.set(sz*.35,0,-sx*.35);B.cylinder(p,.075,.10,'dark',[0,-.05,0],'y');B.tube(p,.08,.0625,.04,'chrome',[0,-.12,0],'y');B.cylinder(p,.0625,.008,'navy',[0,-.104,0],'y');
  for(let i=0;i<5;i++)B.box(p,.006,.006,.11,'titanium',[-.05+i*.025,-.11,0],0);}
 finish(B);
 return {...B,update(a,e){offsets(B,e);bus.tick(a);wings.forEach((g,i)=>g.rotation.x=(i?-1:1)*.30*Math.sin(a*.12));}};
}

// Sentinel-1：ESA SP-1322/1与SentiWiki。SAR天线12.3×0.821米，14块瓦片分装5块面板（每块面板瓦片数为网页补全）；
// 两翼各10米，每翼5块电池板加1块轭板；整星长21、宽2.5、高4米，可推出天线与太阳翼同沿长轴。平台本体尺寸与高度分配为网页补全。
export function buildRadar(materials){
 const B=makeBuilder(materials),k=.5,w=1.3*k,h=3.4*k,d=1.3*k,bus=satelliteBus(B,w,h,d,{wheelSide:-1}),wings=[];
 const wingY=h*.28,panels=5,gap=.04,yoke=.75,pw=(10*k-.304-yoke-panels*gap)/panels-.018;
 for(const [i,s]of [-1,1].entries()){
  const g=B.part('solar'+i,s<0?'后向太阳翼':'前向太阳翼','SOLAR WING','根部轭板和五块电池板沿飞行方向伸出，与雷达天线平行。',[s*1.8,.6,0]);
  wings.push(arrayWing(B,g,[s*(w/2+.03),wingY,0],[PI/2,s<0?PI:0,0],{n:panels,pw,ph:.8,gap,yoke,rh:.05,cells:[7,8],yokePanel:true}).tracker);
 }
 const sarY=-h*.22,back=d/2+.02+.10,th=.05,tile=12.3*k/14,tiles=[3,3,2,3,3],pgap=.03;
 const support=B.part('radar-support','雷达天线支架与展开撑杆','RADAR SUPPORT','中央面板由四根支杆固定在平台侧面，两侧撑杆连接相邻面板背部。',[0,-.9,1.2]);
 for(const x of [-.18,.18])for(const y of [-.12,.12])rod(B,support,[x,sarY+y,d/2-.01],[x,sarY+y,back+.004],.018,'titanium');
 B.box(support,.5,.06,.03,'titanium',[0,sarY,d/2+.035],0);
 let x=-(14*tile+4*pgap)/2;const panelX=[];
 for(let i=0;i<5;i++){const len=tiles[i]*tile;panelX.push([x,x+len]);x+=len+pgap;}
 for(const s of [-1,1]){const [a,b]=panelX[s<0?1:3];rod(B,support,[s*(w/2-.02),sarY+.16,d/2+.02],[s<0?(a+b)/2:(a+b)/2,sarY+.10,back+.004],.014,'titanium');}
 for(let i=0;i<5;i++){
  const [a,b]=panelX[i],cx=(a+b)/2,len=b-a,g=B.part('radar'+i,'雷达天线面板 '+(i+1),'SAR ANTENNA PANEL',`面板正面排列${tiles[i]}块辐射瓦片，侧边铰链连接相邻面板。`,[cx*.55,-.8,1.8]);
  B.box(g,len,.821*k,th,'dark',[cx,sarY,back+th/2],0);
  const slots=[],seams=[];for(let t=0;t<tiles[i];t++){const tx=a+(t+.5)*tile;for(let r=0;r<6;r++)for(let c=0;c<10;c++)slots.push({p:[tx-tile*.42+c*tile*.0933,sarY-.17+r*.068,back+th+.002]});if(t)seams.push({p:[a+t*tile,sarY,back+th+.002]});}
  B.box(g,len-.01,.821*k-.02,.003,'navy',[cx,sarY,back+th+.0005],0);
  B.instances(g,new T.BoxGeometry(tile*.07,.02,.004),'titanium',slots);
  if(seams.length)B.instances(g,new T.BoxGeometry(.008,.821*k-.02,.005),'black',seams);
  for(const y of [-1,1])B.box(g,len,.012,th+.006,'alloy',[cx,sarY+y*(.821*k/2-.006),back+th/2],0);
  if(i<4)for(const y of [-.12,.12])B.cylinder(g,pgap/2+.012,.09,'chrome',[b+pgap/2,sarY+y,back+.012],'y');
 }
 const elec=B.part('radar-electronics','雷达电子设备与射频线缆','RADAR ELECTRONICS','雷达电子箱贴装在天线上方的平台侧面，射频线缆沿支架接入中央面板背部。',[-1.5,.9,.8]);
 for(let i=0;i<3;i++){const ex=(i-1)*.19;blanketBox(B,elec,.15,.22,.12,[ex,sarY+.42,d/2+.02+.06],'foil');B.path(elec,[[ex,sarY+.36,d/2+.08],[ex*.6,sarY+.26,d/2+.10],[ex*.4,sarY+.12,back+.01]],.008,'copper');}
 const antenna=B.part('antenna','数据传输天线与转台','DATA DOWNLINK ANTENNA','对地数据传输天线经立柱和转台连接底层板。',[1.5,-1.0,-1.1]);
 const mast=[0,-h/2,-d*.28];rod(B,antenna,[mast[0],mast[1]+.01,mast[2]],[mast[0],mast[1]-.219,mast[2]],.022,'titanium');
 const turn=subgroup(antenna,[mast[0],mast[1]-.22,mast[2]]);B.cylinder(turn,.045,.03,'dark',[0,-.015,0],'y');
 const ant=subgroup(turn,[0,-.05,0]);ant.rotation.x=PI/2+.35;B.cylinder(ant,.03,.06,'titanium',[0,0,-.0],'z');dish(B,ant,.13,[0,0,-.1]);
 finish(B);
 return {...B,update(a,e){offsets(B,e);bus.tick(a);wings.forEach((g,i)=>g.rotation.x=.08*Math.sin(a*.14+i*.3));turn.rotation.y=.35*Math.sin(a*.2);}};
}

// 3U立方星：Cal Poly CDS Rev 14.1。外包络100×100×340.5毫米，导轨宽8.5毫米、端面支脚0.5至7毫米、
// 外伸件不超出导轨面6.5毫米、分离弹簧在-Z端、至少一个部署开关。1单位=100毫米，局部y为CDS的Z轴。
export function buildCubeSat(materials){
 const B=makeBuilder(materials),half=3.405/2,rail=.085,ri=.5-rail,stand=.05,ft=.06,endY=half-stand-ft/2;
 const frame=B.part('frame','3U 导轨与端框','3U STRUCTURE','四根8.5毫米宽导轨贯通340.5毫米全长，端框与导轨相接，导轨端面伸出5毫米支脚。',[0,0,-1.4]);
 for(const x of [-1,1])for(const z of [-1,1])B.box(frame,rail,3.405,rail,'alloy',[x*(.5-rail/2),0,z*(.5-rail/2)],0);
 for(const y of [-endY,endY])for(const s of [-1,1]){B.box(frame,2*ri,ft,.05,'alloy',[0,y,s*(ri-.025)],0);B.box(frame,.05,ft,2*ri-.1,'alloy',[s*(ri-.025),y,0],0);}
 for(const y of [-.5675,.5675])for(const s of [-1,1])B.box(frame,2*ri,.03,.03,'alloy',[0,y,s*(ri-.015)],0);
 const boards=B.part('boards','PC/104 电路板堆叠','AVIONICS STACK','电路板由四根堆叠螺杆穿过角孔定位，板间连接器和芯片分别构造。',[-1.2,-.6,0]);
 const rodsXZ=[[-.33,-.33],[.33,-.33],[-.33,.33],[.33,.33]],plateY=-endY+ft/2;
 for(const [x,z]of rodsXZ)B.cylinder(boards,.016,.68-plateY,'steel',[x,(.68+plateY)/2,z],'y',.016,12);
 for(let j=0;j<6;j++){
  const y=-.62+j*.21;B.box(boards,.80,.016,.80,'circuit',[0,y,0],0);
  for(let i=0;i<3;i++)B.box(boards,.16,.04,.13,'black',[-.2+i*.2,y+.028,-.12+(i%2)*.24],0);
  B.box(boards,.50,.06,.06,'porcelain',[0,y+.038,-.33],0);
  for(const [x,z]of rodsXZ)B.cylinder(boards,.03,.024,'bronze',[x,y+.02,z],'y',.03,12);
 }
 const battery=B.part('batteries','电池板与锂离子单体','BATTERY MODULE','四节圆柱单体卧放在电池板上，压条把单体固定在板面。',[0,-1.3,1.2]);
 const by=-1.08;B.box(battery,.80,.016,.80,'circuit',[0,by,0],0);
 for(const z of [-.27,-.09,.09,.27]){B.cylinder(battery,.085,.62,'dark',[0,by+.008+.085,z],'x');B.cylinder(battery,.06,.012,'chrome',[.316,by+.093,z],'x');}
 for(const x of [-.22,.22])B.box(battery,.03,.02,.72,'black',[x,by+.18,0],0);
 B.box(battery,.04,.17,.70,'black',[-.36,by+.085,0],0);B.box(battery,.04,.17,.70,'black',[.36,by+.085,0],0);
 const solar=B.part('body-solar','机身太阳能电池板','BODY SOLAR PANELS','两侧电池板卡在相邻导轨之间，电池片外伸约1毫米，未超出6.5毫米限值。',[0,.4,-1.5]);
 for(const s of [-1,1]){const p=subgroup(solar,[s*(.5-.014-.005),0,0]);p.rotation.z=-s*PI/2;solarPanel(B,p,3.20,2*ri,22,6);}
 const wings=[];
 for(const [i,s]of [-1,1].entries()){
  const g=B.part('solar'+i,s<0?'左展开电池板':'右展开电池板','DEPLOYABLE PANEL','铰链销由三处支座固定在导轨角上，展开板的铰链筒套在销上转到与机身垂直。',[s*1.3,0,.5]);
  const axis=[s*(.5+.035),0,.5+.035];B.cylinder(g,.015,3.0,'chrome',axis,'y',.015,16);
  for(const y of [-1.25,0,1.25]){const m=B.box(g,.058,.10,.022,'titanium',[s*.5168,y,.5168],0);m.rotation.y=-s*PI/4;}
  const hinge=subgroup(g,axis);hinge.name='cubesat-panel-hinge-'+i;
  for(const y of [-.62,.62])B.tube(hinge,.03,.0156,.36,'titanium',[0,y,0],'y');
  const p=subgroup(hinge,[0,0,-.035-.46]);p.rotation.z=-s*PI/2;solarPanel(B,p,2.9,.92,20,6);
  for(const y of [-.62,.62])B.box(hinge,.018,.30,.04,'titanium',[0,y,-.04],0);
  wings.push({g:hinge,s});
 }
 const payload=B.part('payload','光学载荷与遮光筒','OPTICAL PAYLOAD','光学载荷固定在上端两层电路板之间，遮光筒从上端框中央向外。',[1.2,1.0,.6]);
 const py=.68;B.box(payload,.70,.60,.70,'dark',[0,py+.008+.30,0],0);B.tube(payload,.26,.22,.38,'black',[0,py+.008+.60+.19,0],'y');B.cylinder(payload,.22,.012,'optics',[0,py+.008+.62,0],'y');
 for(const [x,z]of rodsXZ)B.cylinder(payload,.03,.60,'steel',[x,py+.008+.30,z],'y',.03,12);
 B.box(payload,.80,.016,.80,'circuit',[0,py,0],0);
 const antenna=B.part('antenna','展开天线模块','DEPLOYABLE ANTENNAS','端部天线模块固定在上端框，四根卷尺式天线从模块边缘展开。',[0,1.4,0]);
 const ay=endY+ft/2;for(let i=0;i<4;i++){const q=i*PI/2;const m=B.box(antenna,.80,.03,.10,'navy',[.35*Math.sin(q),ay-.045,.35*Math.cos(q)],0);m.rotation.y=q;}
 for(let i=0;i<4;i++){const a=i*PI/2,c=[.38*Math.cos(a),ay-.045,.38*Math.sin(a)];B.box(antenna,.06,.03,.06,'dark',c,0);B.path(antenna,[c,[.44*Math.cos(a),ay-.04,.44*Math.sin(a)],[.62*Math.cos(a),ay-.02,.62*Math.sin(a)],[1.55*Math.cos(a),ay+.02,1.55*Math.sin(a)]],.008,'chrome');}
 const covers=B.part('covers','侧壁板与接口口盖','SIDE PANELS','前后侧壁板卡在导轨之间，前板设检修口和拔除销，后板为黑色阳极氧化面。',[0,-.4,1.5]);
 for(const s of [-1,1]){const m=B.box(covers,2*ri,3.2,.015,s>0?'alloy':'black',[0,0,s*(.5-.015)],0);if(s>0)B.cut(m);}
 B.box(covers,.32,.20,.006,'dark',[0,-1.1,.4925],0);B.cylinder(covers,.035,.06,'redpaint',[.26,-1.1,.515],'z');B.cylinder(covers,.05,.008,'chrome',[.26,-1.1,.4885],'z');
 B.bolts(covers,[[-.36,1.4,.497],[.36,1.4,.497],[-.36,-1.4,.497],[.36,-1.4,.497]],'z',.012);
 const base=B.part('base','底端板、分离弹簧与部署开关','BASE INTERFACE','-Z端板连接四根导轨，两处分离弹簧柱塞和部署开关位于导轨端面支脚。',[0,-1.4,-.7]);
 B.box(base,2*ri,.016,2*ri,'titanium',[0,plateY+.008,0],0);
 for(const [x,z]of [[-1,-1],[1,1]]){B.cylinder(base,.022,.034,'chrome',[x*(.5-rail/2),-half+.005,z*(.5-rail/2)],'y',.022,16);}
 for(const [x,z]of [[1,-1],[-1,1]]){B.box(base,.03,.03,.03,'dark',[x*(.5-rail/2),-half+.055,z*(ri-.015)],0);B.cylinder(base,.008,.03,'chrome',[x*(.5-rail/2),-half+.007,z*(.5-rail/2)],'y',.008,12);}
 B.root.traverse(o=>{if(o.isMesh&&o.userData.part==='frame'){o.material.color.setHex(0x5f666c);o.material.metalness=.55;o.material.roughness=.48;}});
 finish(B);
 return {...B,update(a,e){offsets(B,e);wings.forEach(({g,s})=>g.rotation.y=-s*(PI/2+.08*Math.sin(a*.18)));}};
}

// 天宫：CMSA公开资料。天和长16.6米、大柱段直径4.2米、小柱段2.8米；问天17.9米、梦天17.88米，直径4.2米；
// 实验舱太阳翼单翼27米、两翼端到端55米；大机械臂10.2米（肩3、肘1、腕3共7关节），小机械臂约5米。1单位=4.545米。
export function buildTiangong(materials){
 const B=makeBuilder(materials),k=.22,Y=.7,R=4.2*k/2,r=2.8*k/2,wall=.025,wings=[],arms=[],coreWings=[];
 const halfTube=(g,ro,len,pos,axis)=>{B.tube(g,ro,ro-wall,len,'airframe',pos,axis,PI,PI);return B.cut(B.tube(g,ro,ro-wall,len,'airframe',pos,axis,0,PI));};
 const rails=(g,ro,from,to,axis)=>{for(const a of [PI/4,3*PI/4,5*PI/4,7*PI/4]){const u=Math.cos(a),v=Math.sin(a),map=(t,q)=>axis==='z'?[q*u,Y+q*v,t]:[t,Y+q*v,q*u];rod(B,g,map(from+.05,ro+.035),map(to-.05,ro+.035),.008,'bronze');for(const t of [from+.05,(from+to)/2,to-.05])rod(B,g,map(t,ro-.006),map(t,ro+.035),.009,'alloy');}};
 const core=B.part('tianhe','天和核心舱','TIANHE CORE MODULE','小柱段、锥段和大柱段依次连接节点舱与后部资源舱，舱壁外侧设扶手。',[0,-1.2,-1.1]);
 halfTube(core,r,1.0,[0,Y,-.58],'z');
 const cone=[[r-wall,0],[r,0],[R,-.17],[R-wall,-.17],[r-wall,0]];B.lathe(core,cone,'airframe',[0,Y,-1.08],'z',-PI/2,PI);B.cut(B.lathe(core,cone,'airframe',[0,Y,-1.08],'z',PI/2,PI));
 halfTube(core,R,1.50,[0,Y,-2.0],'z');B.cylinder(core,R-wall,.03,'porcelain',[0,Y,-2.735],'z');
 for(const z of [-1.08,-1.25,-1.65,-2.05,-2.45,-2.75])B.torus(core,z>-1.1?r+.002:R+.002,.008,'chrome',[0,Y,z],'z');
 rails(core,R,-2.75,-1.25,'z');
 const node=B.part('node','节点舱与对接口','NODE & DOCKING PORTS','球形节点舱设前向和径向对接口、两个侧向停泊口和出舱口，后端连接小柱段。',[0,-1.0,1.4]);
 B.cut(ellipsoid(B,node,[.32,.32,.32],[0,Y,0],'porcelain'));
 B.tube(node,.16,.11,.16,'chrome',[0,Y,.37],'z');B.tube(node,.20,.16,.04,'airframe',[0,Y,.43],'z');
 B.tube(node,.16,.11,.16,'chrome',[0,Y-.37,0],'y');B.tube(node,.20,.16,.04,'airframe',[0,Y-.43,0],'y');
 for(const s of [-1,1])B.tube(node,.20,.15,.16,'chrome',[s*.35,Y,0],'x');
 B.tube(node,.13,.09,.06,'titanium',[0,Y+.31,0],'y');
 for(const [id,name,s,desc]of [['wentian','问天实验舱',-1,'工作舱、气闸舱和资源舱连成17.9米长舱，经右侧停泊口连接节点舱。'],['mengtian','梦天实验舱',1,'工作舱、载荷舱和资源舱连成17.88米长舱，经左侧停泊口连接节点舱，货物气闸舱嵌在载荷舱内。']]){
  const g=B.part(id,name,'LABORATORY MODULE',desc,[s*1.7,-.8,0]),l=subgroup(g);l.rotation.y=s<0?PI:0;
  const fore=[[.15,0],[.20,0],[R,.20],[R-wall,.20],[.15,0]];B.lathe(l,fore.map(([q,h])=>[q,h]),'airframe',[.43,Y,0],'x',0,PI);B.cut(B.lathe(l,fore,'airframe',[.43,Y,0],'x',PI,PI));
  halfTube(l,R,3.27,[2.265,Y,0],'x');B.cylinder(l,R-wall,.03,'porcelain',[3.885,Y,0],'x');
  for(const x of [.63,1.3,2.0,2.7,3.3,3.90])B.torus(l,R+.002,.008,'chrome',[x,Y,0],'x');
  rails(l,R,.63,3.9,'x');
 }
 const resources=B.part('resources','资源舱与推进段','RESOURCE MODULES','天和尾部资源舱和两个实验舱末端资源舱为非密封段，外表面包覆隔热毯，末端设推力器与转动支承。',[0,.7,-1.8]);
 B.cylinder(resources,.40,.58,'foil',[0,Y,-3.04],'z');B.tube(resources,.16,.11,.12,'chrome',[0,Y,-3.39],'z');
 for(let i=0;i<4;i++){const a=PI/4+i*PI/2;B.lathe(resources,[[.025,0],[.05,-.09],[.045,-.09],[.02,0]],'hotmetal',[.26*Math.cos(a),Y+.26*Math.sin(a),-3.33],'z');}
 for(const s of [-1,1]){B.cylinder(resources,.40,.46,'foil',[s*4.13,Y,0],'x');B.box(resources,.30,.16,.30,'foil',[s*3.75,Y+R+.07,0],0);}
 const racks=B.part('racks','舱内实验机柜与生活设备','INTERNAL RACKS','实验机柜贴靠舱壁成排布置，前面板朝向中央通道。',[0,-1.6,.8]);
 const rx=Math.sqrt((R-wall)**2-.19**2)-.001;
 for(let i=0;i<5;i++)for(const s of [-1,1]){const z=-1.45-i*.27;B.box(racks,.14,.38,.25,'porcelain',[s*(rx-.07),Y,z],0);B.box(racks,.006,.30,.20,'navy',[s*(rx-.143),Y,z],0);}
 for(const s of [-1,1])for(let i=0;i<7;i++)for(const q of [-1,1]){const x=s*(.85+i*.43);B.box(racks,.38,.38,.14,'porcelain',[x,Y,q*(rx-.07)],0);B.box(racks,.30,.30,.006,'navy',[x,Y,q*(rx-.143)],0);}
 for(const [i,s]of [-1,1].entries()){
  const g=B.part('solar'+i,s<0?'问天大型柔性太阳翼':'梦天大型柔性太阳翼','LARGE FLEXIBLE SOLAR WINGS','实验舱末端驱动机构带动一对27米柔性翼跟随太阳方向转动，伸展桅杆把柔性电池阵面张开。',[s*1.5,1.3,0]);
  const mount=subgroup(g,[s*4.36,Y,0]);mount.rotation.y=s<0?PI:0;
  B.cylinder(mount,.18,.02,'titanium',[.01,0,0],'x');B.tube(mount,.14,.10,.08,'dark',[.06,0,0],'x');
  const pivot=subgroup(mount);pivot.name='tiangong-large-solar-'+i;
  B.cylinder(pivot,.098,.14,'chrome',[.095,0,0],'x');B.box(pivot,.10,.08,1.32,'titanium',[.20,0,0],0);
  for(const dir of [-1,1]){
   B.box(pivot,.98,.08,.12,'airframe',[.70,0,dir*.66],0);
   rod(B,pivot,[.70,-.05,dir*.72],[.70,-.05,dir*6.0],.022,'titanium');
   const p=subgroup(pivot,[.70,0,dir*(.72+.009+2.62)]);solarPanel(B,p,.95,5.24,3,84);
   B.box(pivot,.98,.06,.06,'titanium',[.70,0,dir*(5.98+.03)],0);
  }
  wings.push(pivot);
 }
 const small=B.part('core-solar','天和柔性太阳翼','CORE SOLAR WINGS','保留天和基本构型两侧柔性翼，驱动座固定在大柱段侧面，翼面随太阳转动。',[0,1.1,-2.0]);
 for(const s of [-1,1]){const mount=subgroup(small,[s*(R-.01),Y,-2.11]);mount.rotation.y=s<0?PI:0;
  B.cylinder(mount,.09,.04,'titanium',[.02,0,0],'x');B.tube(mount,.06,.045,.10,'dark',[.09,0,0],'x');
  const pivot=subgroup(mount);pivot.name='tiangong-core-solar';B.cylinder(pivot,.0443,.14,'chrome',[.12,0,0],'x');B.box(pivot,.05,.05,.64,'titanium',[.215,0,0],0);
  rod(B,pivot,[.22,-.04,0],[2.86,-.04,0],.016,'titanium');const p=subgroup(pivot,[.24+.009+1.30,0,0]);solarPanel(B,p,2.60,.60,26,5);B.box(pivot,.04,.04,.64,'titanium',[2.87,0,0],0);
  coreWings.push(pivot);}
 const airlock=B.part('airlock','气闸舱口与舱外平台','AIRLOCKS & EXPOSED PLATFORMS','问天气闸舱设出舱口和舱外实验平台，梦天设货物气闸舱口、一个固定式和两个展开式暴露平台。',[0,-.8,1.8]);
 B.tube(airlock,.14,.10,.08,'titanium',[-3.3,Y+R+.02,0],'y');B.cylinder(airlock,.10,.02,'airframe',[-3.3,Y+R+.05,0],'y');
 B.box(airlock,.55,.03,.32,'airframe',[-2.6,Y,R+.18],0);for(const x of [-2.8,-2.4])rod(B,airlock,[x,Y,R-.01],[x,Y,R+.04],.014,'titanium');
 for(let i=0;i<3;i++)blanketBox(B,airlock,.14,.12,.14,[-2.78+i*.18,Y+.075,R+.18]);
 B.box(airlock,.27,.27,.03,'dark',[2.9,Y,R+.006],0);B.box(airlock,.31,.31,.012,'titanium',[2.9,Y,R+.022],0);
 B.box(airlock,.62,.025,.46,'airframe',[2.45,Y+R+.075,0],0);for(const [x,z]of [[2.2,-.15],[2.7,.15]])rod(B,airlock,[x,Y+Math.sqrt(R*R-z*z)-.01,z],[x,Y+R+.065,z],.016,'titanium');
 for(let i=0;i<3;i++)blanketBox(B,airlock,.14,.10,.14,[2.25+i*.2,Y+R+.138,0]);
 for(const q of [-1,1]){B.box(airlock,.50,.025,.42,'airframe',[3.35,Y-.20,q*(R+.26)],0);rod(B,airlock,[3.35,Y-.20,q*(Math.sqrt(R*R-.04)-.01)],[3.35,Y-.20,q*(R+.06)],.018,'titanium');B.cylinder(airlock,.02,.42,'chrome',[3.35,Y-.20,q*(R+.05)],'x');}
 const armSpecs=[['largearm','七关节大机械臂',[.05,Y+R+.10,-1.55],1,Y+R-.012,[[0,.3,0],[0,-.5,0],[0,0,.75],[0,0,-1.7],[0,0,.6],[-.3,0,0],[0,.4,0]]],['smallarm','七关节小机械臂',[-1.7,Y+R+.06,.12],.5,Y+R-.012,[[0,.2,0],[0,.45,0],[0,0,-.7],[0,0,1.6],[0,0,-.5],[.3,0,0],[0,-.3,0]]]];
 for(const [id,name,base,scale,hull,pose]of armSpecs){
  const part=B.part(id,name,'SEVEN JOINT ROBOTIC ARM',id==='largearm'?'肩部三关节、肘部一关节、腕部三关节串联两根臂杆，展开约10.2米。':'七关节串联两段短臂杆，长约5米，可与大机械臂级联。',[id==='largearm'?-1.4:1.4,1.3,1.4]);
  const top=base[1]-.08*scale-.002;B.cylinder(part,.07*scale,top-hull,'titanium',[base[0],(top+hull)/2,base[2]],'y');B.cylinder(part,.11*scale,.02,'titanium',[base[0],hull+.01,base[2]],'y');
  const lengths=[.08,.08,.94,.94,.08,.08,.10].map(v=>v*scale),axes=['y','x','z','z','z','x','y'],joints=[];let parent=subgroup(part,base);
  for(let i=0;i<7;i++){
   const joint=subgroup(parent);joint.name=id+'-joint-'+i;joint.userData.axis=axes[i];joint.userData.rest=pose[i];
   B.cylinder(joint,.085*scale,.16*scale,'airframe',[0,0,0],axes[i]);
   rod(B,joint,[0,0,0],[0,lengths[i],0],(i===2||i===3?.05:.06)*scale,i===2||i===3?'porcelain':'airframe');
   const tip=subgroup(joint,[0,lengths[i],0]);tip.name=id+'-tip-'+i;parent=tip;joints.push(joint);
  }
  B.tube(parent,.09*scale,.05*scale,.10*scale,'chrome',[0,.05*scale,0],'y');arms.push(joints);
 }
 const thermal=B.part('thermal','实验舱散热板与外回路','THERMAL RADIATORS','散热板经支杆立在实验舱背向核心舱一侧，外回路管路沿舱壁连接各板。',[0,.8,1.9]);
 for(const s of [-1,1]){for(let i=0;i<3;i++){const x=s*(1.25+i*.9);B.box(thermal,.75,.46,.016,'porcelain',[x,Y,-(R+.14)],0);for(let j=0;j<6;j++)B.box(thermal,.70,.008,.004,'alloy',[x,Y-.19+j*.076,-(R+.15)],0);for(const y of [-.12,.12])rod(B,thermal,[x,Y+y,-(Math.sqrt(R*R-y*y)-.01)],[x,Y+y,-(R+.135)],.012,'titanium');}
  B.path(thermal,[[s*1.25,Y-.17,-(R+.13)],[s*1.7,Y-.25,-(R+.02)],[s*2.6,Y-.25,-(R+.02)],[s*3.05,Y-.17,-(R+.13)]],.012,'copper');}
 const comms=B.part('antenna','中继通信天线与转台','RELAY ANTENNA','中继天线经立柱和二维转台安装在核心舱大柱段顶部。',[0,1.6,-.8]);
 rod(B,comms,[0,Y+R-.01,-2.55],[0,Y+R+.239,-2.55],.025,'titanium');
 const turn=subgroup(comms,[0,Y+R+.24,-2.55]);B.cylinder(turn,.05,.04,'dark',[0,.02,0],'y');const ant=subgroup(turn,[0,.06,0]);ant.rotation.x=-.8;B.cylinder(ant,.025,.06,'titanium',[0,0,-.03],'z');dish(B,ant,.2,[0,0,-.1]);
 finish(B);
 return {...B,update(a,e){offsets(B,e);wings.forEach((g,i)=>g.rotation.x=(i?-1:1)*.30*Math.sin(a*.10));coreWings.forEach((g,i)=>g.rotation.x=(i?-1:1)*.30*Math.sin(a*.10));
  arms.forEach((joints,k)=>joints.forEach((g,i)=>{const r=g.userData.rest,o=.05*Math.sin(a*.13+i*.4+k);g.rotation.set(r[0],r[1],r[2]);g.rotation[g.userData.axis]+=o;}));turn.rotation.y=.25*Math.sin(a*.2);}};
}

// 罗曼空间望远镜：NASA公开资料。主镜2.4米、次镜0.581米；全长12.7米、展开宽4.4米；平台六边形宽4米、高2米；
// 外镜筒为六边形复合材料筒、内有10道挡光环；遮阳供电板6块，中间2块固定在外筒、外侧4块展开；高增益天线1.7米；宽视场仪器18块探测器。1单位=2米。
export function buildRoman(materials){
 const B=makeBuilder(materials),k=.5,busR=1.0,y0=-1.2,y1=-.2,cy=.62,top=4.2,oR=.86,wt=.03;
 const bus=B.part('bus','六边形航天器平台与设备舱','SPACECRAFT BUS','六面墙板和上下层板围成平台，设备箱贴装在墙板内侧，一侧墙板剖开。',[0,-1.4,0]);
 hexWalls(B,bus,busR,y0,y1,.04,'foil',[1]);
 for(const y of [y0+.02,y1-.02])hexPlate(B,bus,busR,.04,'alloy',[0,y,0]);
 const a=busR*Math.cos(PI/6);
 for(let kq=0;kq<6;kq++){const ang=kq*PI/3,g=subgroup(bus,[(a-.04-.12)*Math.sin(ang),(y0+y1)/2,(a-.04-.12)*Math.cos(ang)]);g.rotation.y=ang;B.box(g,.62,.52,.24,'dark',[0,0,0],0);B.box(g,.52,.42,.006,'circuit',[0,0,-.123],0);}
 const frame=B.part('frame','仪器承载结构与六根支杆','INSTRUMENT CARRIER','六根斜支杆把承载层板支在平台上方，宽视场仪器和日冕仪挂装在承载结构两侧。',[0,-.4,-1.4]);
 for(let i=0;i<6;i++){const q=PI/6+i*PI/3;rod(B,frame,[.78*Math.sin(q),y1-.01,.78*Math.cos(q)],[.70*Math.sin(q),cy-.02,.70*Math.cos(q)],.03,'titanium');}
 hexPlate(B,frame,oR,.04,'alloy',[0,cy,0],.16);
 const barrel=B.part('barrel','六边形外镜筒与十道挡光环','OUTER BARREL ASSEMBLY','复合材料六边形外筒立在承载层板上，内部十道挡光环贴合筒壁。',[0,.9,-1.3]);
 hexWalls(B,barrel,oR,cy+.02,top,wt,'dark',[1]);
 const ia=oR*Math.cos(PI/6)-wt;
 for(let i=0;i<10;i++)hexPlate(B,barrel,(ia+.002)/Math.cos(PI/6),.02,'black',[0,cy+.95+i*(top-cy-1.15)/9,0],.62);
 for(let i=0;i<6;i++){const q=i*PI/3;B.box(barrel,oR,.03,.012,'titanium',[(ia+wt/2)*Math.sin(q),top-.015,(ia+wt/2)*Math.cos(q)],0).rotation.y=q;}
 const mirror=B.part('primary','2.4米主镜与背部支承','PRIMARY MIRROR','主镜由三组双脚支杆支在承载层板上，中央开孔通往后方仪器。',[0,-.8,1.5]);
 const my=cy+.22;B.lathe(mirror,[[.12,-.055],[.30,-.05],[.48,-.035],[.60,-.005],[.60,.04],[.12,.04],[.12,-.055]],'chrome',[0,my,0],'y');B.tube(mirror,.60,.52,.05,'dark',[0,my-.04,0],'y');
 for(let i=0;i<3;i++){const q=i*TAU/3;for(const d of [-.18,.18])rod(B,mirror,[.50*Math.sin(q+d),cy+.02,.50*Math.cos(q+d)],[.55*Math.sin(q),my-.05,.55*Math.cos(q)],.016,'titanium');}
 const secondary=B.part('secondary','0.581米次镜与支杆','SECONDARY MIRROR','次镜位于主镜前方，三组支杆把次镜座连接到外筒内壁。',[0,1.5,1.0]);
 const sy=my+2.25;B.cylinder(secondary,.145,.07,'chrome',[0,sy,0],'y');B.cylinder(secondary,.17,.06,'dark',[0,sy+.06,0],'y');
 for(let i=0;i<3;i++){const q=i*TAU/3;for(const d of [-.25,.25]){const e=[ia*Math.sin(q+d)/Math.cos(d),sy+.18,ia*Math.cos(q+d)/Math.cos(d)];rod(B,secondary,[.12*Math.sin(q),sy+.06,.12*Math.cos(q)],[e[0]*1.004,e[1],e[2]*1.004],.008,'dark');}}
 const wfi=B.part('wfi','宽视场仪器与焦平面','WIDE FIELD INSTRUMENT','宽视场仪器挂装在承载层板下方一侧，焦平面装有18块探测器。',[1.7,.1,.5]);
 const wy=cy-.02-.26;blanketBox(B,wfi,.58,.52,.80,[.31,wy,0],'goldfoil');B.box(wfi,.52,.03,.62,'dark',[.31,wy-.275,0],0);
 const detectors=subgroup(wfi,[.31,wy-.29,0]);detectors.name='roman-detector-array';
 for(let row=0;row<3;row++)for(let col=0;col<6;col++){const c=subgroup(detectors,[(col-2.5)*.08,0,(row-1)*.18]);B.box(c,.07,.006,.16,'optics',[0,-.003,0],0);}
 const cgi=B.part('coronagraph','日冕仪与光学台','CORONAGRAPH INSTRUMENT','日冕仪光学台挂装在承载层板下方另一侧，与宽视场仪器分开。',[-1.6,.2,.8]);
 const gy=cy-.02-.20;blanketBox(B,cgi,.52,.40,.66,[-.34,gy,0],'foil');B.box(cgi,.44,.03,.54,'dark',[-.34,gy-.215,0],0);
 for(let i=0;i<5;i++)B.cylinder(cgi,.04,.06,'chrome',[-.50+i*.08,gy-.26,.12*Math.sin(i*1.3)],'y');
 const pw=.73,ph=(top-cy-.35)/2,pz=ia+wt+.10;
 for(let row=0;row<2;row++)for(let col=-1;col<=1;col++){
  const idx=row*3+col+1,g=B.part('solar'+idx,'遮阳供电板 '+(idx+1),'SOLAR ARRAY SUN SHIELD','六块板组成遮阳供电面，中间两块经支座固定在外筒，外侧四块由侧铰链连接中间板展开。',[col*1.2,.6,1.5]);
  const yc=cy+.25+ph/2+row*(ph+.03),p=subgroup(g,[col*(pw+.04),yc,pz]);p.rotation.x=PI/2;solarPanel(B,p,pw,ph,8,20);p.name=col===0?'roman-fixed-panel':'roman-deployable-panel';
  if(col===0)for(const x of [-.25,.25])for(const y of [-ph*.3,ph*.3])rod(B,g,[x,yc+y,ia+wt-.005],[x,yc+y,pz-.01],.02,'titanium');
  else for(const y of [-ph*.3,ph*.3])B.cylinder(g,.032,.16,'chrome',[col*(pw/2+.029),yc+y,pz],'y');
 }
 const cover=B.part('cover','可展开孔径盖','DEPLOYABLE APERTURE COVER','软结构孔径盖经铰链座固定在外筒顶部向阳一侧，展开后由两根撑杆张开。',[0,1.6,.9]);
 const hz=ia+wt,hinge=subgroup(cover,[0,top+.02,hz]);hinge.rotation.x=1.05;
 B.box(cover,.5,.04,.05,'titanium',[0,top+.01,hz-.01],0);B.cylinder(hinge,.02,1.4,'chrome',[0,0,0],'x');
 B.box(hinge,1.5,.012,1.10,'foil',[0,.02,-.58],0);for(const x of [-.65,.65])rod(B,hinge,[x,0,0],[x,.02,-1.10],.016,'titanium');
 const shade=B.part('shade','下部仪器遮阳板','LOWER INSTRUMENT SUN SHADE','两块铜色遮阳板从平台顶边向上展开，遮挡仪器承载结构。',[0,-.7,1.7]);
 for(const s of [-1,1]){const x=s*.45,zb=a-.01;B.box(shade,.12,.04,.06,'titanium',[x,y1+.01,zb],0);const p=subgroup(shade,[x,y1+.03,zb+.02]);p.rotation.x=.12;B.box(p,.82,.80,.02,'copper',[0,.40,0],0);}
 const antenna=B.part('antenna','1.7米高增益天线与万向架','HIGH GAIN ANTENNA','高增益天线经伸展杆和万向架连接平台背阳侧墙板，碟面随指向缓慢转动。',[0,-.6,-1.6]);
 const hy=(y0+y1)/2;rod(B,antenna,[0,hy,-(a-.01)],[0,hy,-(a+.299)],.035,'titanium');B.box(antenna,.16,.16,.03,'titanium',[0,hy,-(a+.014)],0);
 const gimbal=subgroup(antenna,[0,hy,-(a+.30)]);B.cylinder(gimbal,.07,.05,'dark',[0,0,-.025],'z');rod(B,gimbal,[0,0,-.04],[0,0,-.10],.03,'titanium');const hga=subgroup(gimbal,[0,0,-.11]);hga.rotation.x=PI-.45;B.cylinder(hga,.04,.10,'titanium',[0,0,-.03],'z');reflector(B,hga,.425,.16);
 const attitude=B.part('attitude','反作用轮组与线缆','REACTION WHEELS','四个反作用轮立在平台底层板上，线缆沿底板连接设备箱。',[-1.5,-1.1,0]),wheels=[];
 for(let i=0;i<4;i++){const q=PI/4+i*PI/2;wheels.push(reactionWheel(B,attitude,[.42*Math.sin(q),y0+.04+.16,.42*Math.cos(q)],[.3*Math.cos(q),-.3*Math.sin(q)],.12,y0+.04));}
 B.path(attitude,[[.30,y0+.045,.30],[0,y0+.05,.62],[-.30,y0+.045,.30]],.012,'copper');
 finish(B);
 return {...B,update(a,e){offsets(B,e);gimbal.rotation.z=.4*Math.sin(a*.15);wheels.forEach((g,i)=>g.rotation.y=a*(.8+i*.2));}};
}
