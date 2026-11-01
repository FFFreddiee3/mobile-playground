import * as T from '#three';
import {makeBuilder,TAU} from '#geometry';
import {subgroup,place,offsets,panel,rod,ellipsoid} from '#vehicle-kit';
const PI=Math.PI;
// 同一剖面同时生成半罩、下缘和接缝端面，拆开后仍保留真实壁厚。
function fairingHalf(B,g,side){
 const outer=[[.366,0],[.382,.025],[.502,.22],[.517,.26],[.52,.30],[.52,1.50]],curve=new T.CubicBezierCurve(new T.Vector2(.52,1.50),new T.Vector2(.52,2.00),new T.Vector2(.18,2.64),new T.Vector2(0,2.64));
 for(let i=1;i<=32;i++){const v=curve.getPoint(i/32);outer.push([v.x,v.y]);}
 const inner=outer.map(([r,y],i)=>{if(i===0)return [r-.016,y];if(i===outer.length-1)return [0,y-.016];const a=outer[i-1],b=outer[i+1],dr=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dr,dy);return [Math.max(0,r-.016*dy/d),y+.016*dr/d];});
 const profile=[...outer,...inner.reverse(),outer[0]],start=side<0?PI:0;
 const shell=B.lathe(g,profile,'porcelain',[0,0,0],'y',start,PI);shell.name='falcon-fairing-shell';
 // LatheGeometry末端给出零法线。闭合剖面端点使用首尾相邻切线的平均法线。
 const n=shell.geometry.attributes.normal,last=profile.length-1,a=profile[last-1],b=profile[0],c=profile[1],u=new T.Vector2(b[1]-a[1],a[0]-b[0]).normalize().add(new T.Vector2(c[1]-b[1],b[0]-c[0]).normalize()).normalize();
 for(let i=0;i<=64;i++){const phi=start+PI*i/64;for(const j of [0,last])n.setXYZ(i*profile.length+j,u.x*Math.sin(phi),u.y,u.x*Math.cos(phi));}
 for(const phi of [start,start+PI]){const geo=new T.ShapeGeometry(new T.Shape(profile.slice(0,-1).map(p=>new T.Vector2(...p))));geo.rotateY(Math.cos(phi)>0?-PI/2:PI/2);const normal=geo.attributes.normal,flip=normal.getX(0)*(-side)<0;if(flip){const idx=geo.index;for(let i=0;i<idx.count;i+=3){const a=idx.getX(i+1);idx.setX(i+1,idx.getX(i+2));idx.setX(i+2,a);}for(let i=0;i<normal.count;i++)normal.setXYZ(i,-normal.getX(i),-normal.getY(i),-normal.getZ(i));}const cap=B.mesh(g,geo,'porcelain');cap.name='falcon-fairing-seam';}
 const rim=B.tube(g,.366,.350,.024,'airframe',[0,.012,0],'y',side<0?PI/2:-PI/2,PI);rim.name='falcon-fairing-rim';
}

// 箭体字样用实际曲面几何绘制，随蒙皮拆开，不依赖外部图片或浏览器字体。
function rocketMarkings(B,frame,cx,r){
 const glyphs={S:[[1,1],[0,1],[0,.44],[.76,.44],[.76,.20],[0,.20],[0,0],[1,0],[1,.64],[.24,.64],[.24,.80],[1,.80]],P:[[0,0],[.24,0],[.24,.40],[1,.40],[1,1],[0,1]],A:[[0,0],[.25,0],[.34,.28],[.67,.28],[.76,0],[1,0],[.64,1],[.36,1]],C:[[1,1],[0,1],[0,0],[1,0],[1,.21],[.24,.21],[.24,.79],[1,.79]],E:[[1,1],[0,1],[0,0],[1,0],[1,.21],[.24,.21],[.24,.42],[.84,.42],[.84,.62],[.24,.62],[.24,.79],[1,.79]],X:[[0,0],[.28,0],[.50,.34],[.72,0],[1,0],[.64,.50],[1,1],[.72,1],[.50,.66],[.28,1],[0,1],[.36,.50]]};
 for(const [j,letter]of [...'SPACEX'].entries())for(const sign of [-1,1]){const shape=new T.Shape(glyphs[letter].map(([x,y])=>new T.Vector2((x-.5)*.13,y*.17)));if(letter==='P'){const hole=new T.Path();hole.moveTo(-.0338,.1054);hole.lineTo(.0338,.1054);hole.lineTo(.0338,.1343);hole.lineTo(-.0338,.1343);hole.closePath();shape.holes.push(hole);}if(letter==='A'){const hole=new T.Path();hole.moveTo(-.013,.0816);hole.lineTo(.013,.0816);hole.lineTo(0,.1258);hole.closePath();shape.holes.push(hole);}const geo=new T.ShapeGeometry(shape),v=geo.attributes.position;for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i),a=x/r;v.setXYZ(i,cx+sign*r*Math.sin(a),5.60-j*.25+y,sign*r*Math.cos(a));}geo.computeVertexNormals();if(sign<0){const index=geo.index;for(let i=0;i<index.count;i+=3){const a=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,a);}const n=geo.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,-n.getX(i),-n.getY(i),-n.getZ(i));}const mesh=B.mesh(frame,geo,'navy');mesh.name='falcon-body-marking';mesh.material.color.setHex(0x145476);mesh.material.metalness=.02;mesh.material.roughness=.54;}
}
// 仅作网页结构与运行展示，内部容器、紧固件和管路为可追溯的几何补全。
export function buildRocket(materials,heavy=false){
 const B=makeBuilder(materials),centers=heavy?[-.854,0,.854]:[0],R=.366,flames=[];
 const frame=B.part('structure','贮箱段结构与加强环','PRIMARY STRUCTURE','贮箱段外壁和环向加强结构连接发动机支承与级间段。',[0,0,-1.8]);
 for(const cx of centers){
  B.tube(frame,R,R-.018,7.95,'porcelain',[cx,4.38,0],'y',PI,PI);B.cut(B.tube(frame,R,R-.018,7.95,'porcelain',[cx,4.38,0],'y',0,PI));
  for(const y of [.60,1.3,3.4,5.4,7.55,8.30])B.torus(frame,R+.0005,.0025,y<1.4?'dark':'airframe',[cx,y,0],'y');
  const shield=B.tube(frame,R+.004,R,.44,'black',[cx,.64,0],'y');shield.name='falcon-engine-skirt';rocketMarkings(B,frame,cx,R+.007);
 }
 const fuel=B.part('fuel','一级燃料贮箱','FIRST STAGE FUEL TANKS','燃料贮箱布置于一级下部，与上部氧化剂贮箱分隔。',[-1.5,-.3,0]);
 const oxygen=B.part('oxygen','一级氧化剂贮箱','FIRST STAGE OXIDIZER TANKS','氧化剂贮箱位于一级上部，封头和管路用于展示内部布置。',[1.5,.3,0]);
 for(const cx of centers){for(const [g,y,h,mat]of [[fuel,2.5,3.0,'bronze'],[oxygen,6.14,3.9,'alloy']]){B.cylinder(g,R*.91,h-.5,mat,[cx,y,0],'y');for(const s of [-1,1])ellipsoid(B,g,[R*.91,.28,R*.91],[cx,y+s*(h-.5)*.5,0],mat);}}
 const lines=B.part('plumbing','输送管路与外部线缆槽','FEED LINES','内部管路沿贮箱段连接动力舱，外部线缆槽沿箭体纵向布置。',[0,.5,1.7]);for(const cx of centers){B.cylinder(lines,.034,7.1,'chrome',[cx,4.3,-.22]);B.box(lines,.08,7.2,.045,'airframe',[cx,4.5,-R-.015]);for(const y of [1.5,3.5,5.5,7.5])B.tube(lines,.052,.035,.07,'dark',[cx,y,-.22],'y');}
 const engines=B.part('engines','九机发动机与支承框架','FIRST STAGE ENGINES',heavy?'三个芯级各有九台发动机，按中心一台和外围八台排列。':'一级九台发动机按中心一台和外围八台排列。',[0,-1.9,0]);
 for(const cx of centers){B.cylinder(engines,R,.18,'dark',[cx,.62,0]);const spots=[[cx,0]];for(let i=0;i<8;i++){const a=i*TAU/8;spots.push([cx+.245*Math.cos(a),.245*Math.sin(a)]);}
  for(const [x,z]of spots){B.lathe(engines,[[.070,0],[.082,.03],[.045,.17],[.034,.30],[.045,.35],[.020,.36]],'hotmetal',[x,.16,z]);B.cylinder(engines,.028,.27,'steel',[x,.58,z]);for(let i=0;i<5;i++)B.torus(engines,.044+i*.005,.004,'bronze',[x,.45-i*.045,z],'y');
   const flame=subgroup(engines,[x,.16,z]);const m=B.mesh(flame,new T.ConeGeometry(.067,.68,16),'flame',[0,-.34,0],[PI,0,0]);m.userData.effect=true;flames.push(flame);
  }
 }
 const legsPart=B.part('legs','四支着陆腿与支承','LANDING LEGS','四支着陆腿沿一级外壁收拢，底部铰链与外部支承保持连接。',[0,-.7,1.9]);
 for(const cx of centers)for(let i=0;i<4;i++){
  const a=i*TAU/4,g=subgroup(legsPart,[cx,.78,0]),pivot=subgroup(g,[R+.03,0,0]);g.name=`landing-leg-${cx}-${i}`;pivot.name='leg-hinge';g.rotation.y=-a;
  const blade=panel(B,pivot,[[-.105,0],[.105,0],[.064,1.38],[.025,1.64],[0,1.68],[-.025,1.64],[-.064,1.38]],.034,'black',[0,0,0],'yz');blade.name='falcon-stowed-leg';
  B.cylinder(pivot,.028,.23,'titanium',[-.006,.04,0],'z',.028,24);B.box(pivot,.05,.10,.18,'dark',[-.02,.04,0],.006);
  for(const z of [-.035,.035]){rod(B,pivot,[.022,.16,z],[.022,1.37,z*.3],.008,'titanium');B.cylinder(pivot,.012,.11,'chrome',[.022,1.40,z*.3]);}
  B.box(pivot,.045,.095,.09,'rubber',[.012,1.57,0],.009);
 }
 const finPart=B.part('fins','栅格舵与外部铰座','GRID FINS','四片通透栅格舵沿箭体收拢，转轴座位于一级上端外壁。',[0,1.1,-1.8]);
 for(const cx of centers)for(let i=0;i<4;i++){
  const a=i*TAU/4,g=subgroup(finPart,[cx+(R+.025)*Math.cos(a),8.10,(R+.025)*Math.sin(a)]);g.rotation.y=-a;g.name='falcon-fin-mount';
  B.box(g,.05,.10,.17,'dark',[-.015,0,0],.004);B.cylinder(g,.03,.19,'titanium',[0,0,0],'z',.03,24);
  const pivot=subgroup(g);pivot.name='falcon-stowed-grid';pivot.rotation.z=-PI/2;
  // 格栅的通道沿局部厚度方向贯通，收拢时整个舵面平行于箭体轴线。
  for(const z of [-.17,.17])B.box(pivot,.49,.04,.022,'titanium',[.255,0,z],.003);
  for(const x of [.02,.49])B.box(pivot,.022,.04,.34,'titanium',[x,0,0],.003);
  for(let j=1;j<9;j++)B.box(pivot,.010,.038,.32,'titanium',[.02+j*.47/9,0,0],0);
  for(let j=1;j<7;j++)B.box(pivot,.46,.038,.009,'titanium',[.255,0,-.17+j*.34/7],0);
 }
 const interstage=B.part('interstage','级间段与分离接口','INTERSTAGE','级间段连接一级与二级，周向分布的连接结构形成分离接口。',[0,1.7,0]);B.tube(interstage,R+.008,R-.025,1.16,'black',[0,8.93,0],'y',PI,PI);B.cut(B.tube(interstage,R+.008,R-.025,1.16,'black',[0,8.93,0],'y',0,PI));for(const y of [8.39,9.47]){B.torus(interstage,R,.022,'airframe',[0,y,0],'y');B.bolts(interstage,Array.from({length:16},(_,i)=>[R*Math.cos(i*TAU/16),y,R*Math.sin(i*TAU/16)]),'y',.012);}
 const upper=B.part('upper','二级贮箱与箭体','SECOND STAGE','二级由贮箱段、发动机及载荷适配结构组成。',[0,2.8,-1.2]);B.tube(upper,R,R-.016,1.75,'porcelain',[0,10.37,0],'y',PI,PI);B.cut(B.tube(upper,R,R-.016,1.75,'porcelain',[0,10.37,0],'y',0,PI));for(const y of [9.57,10.30,11.18])B.torus(upper,R+.0005,.0025,'airframe',[0,y,0],'y');B.tube(upper,R,R-.016,.115,'porcelain',[0,11.3025,0],'y');
 // 接口两侧都以同一局部原点构造，合并时保留共同端面精度。
 for(const mesh of upper.children)mesh.position.y-=11.36;place(B,'upper',[0,11.36,0]);
 const upperTanks=B.part('upperTanks','二级内部贮箱','SECOND STAGE TANKS','二级内部容器按轴向排列，外形不作为制造尺寸。',[1.5,2.5,0]);for(const [y,h,m]of [[9.98,.60,'bronze'],[10.75,.74,'alloy']]){B.cylinder(upperTanks,R*.90,h,m,[0,y,0]);ellipsoid(B,upperTanks,[R*.9,.12,R*.9],[0,y+h*.5,0],m);}
 const vacuum=B.part('vacuum','二级真空发动机','VACUUM ENGINE','二级发动机使用较大的扩张喷管，轴线与箭体重合。',[0,1.3,1.7]);B.lathe(vacuum,[[.31,0],[.29,.15],[.13,.46],[.07,.62],[.09,.74],[.04,.75]],'hotmetal',[0,8.65,0]);for(let i=0;i<10;i++)B.torus(vacuum,.09+i*.02,.005,'bronze',[0,9.2-i*.048,0],'y');
 const avionics=B.part('avionics','设备舱与载荷适配器','AVIONICS & ADAPTER','设备和环形适配结构位于二级前端。',[0,3.5,1.4]);B.tube(avionics,.33,.25,.20,'titanium',[0,11.35,0],'y');for(const s of [-1,1])B.box(avionics,.17,.18,.16,'dark',[s*.18,11.36,0],.03);
 for(const side of [-1,1]){const id=side<0?'fairingL':'fairingR',g=B.part(id,side<0?'左半整流罩':'右半整流罩','PAYLOAD FAIRING','曲面外壳经下部收缩段接入二级，两半罩各有独立的薄壁、接缝端面和半环下缘。',[side*1.7,3.4,0]);place(B,id,[0,11.36,0]);fairingHalf(B,g,side);}
 const payload=B.part('payload','载荷与安装支架','PAYLOAD','载荷安装在二级前端适配结构上，作为可拆解的展示总成。',[0,4.5,0]);B.box(payload,.36,.52,.36,'bronze',[0,11.98,0]);for(const s of [-1,1])B.box(payload,.015,.49,.26,'screen',[s*.28,12.01,0]);rod(B,payload,[0,12.24,0],[0,12.62,0],.014,'chrome');
 if(heavy){const caps=B.part('boostercaps','两侧助推器鼻锥与连接件','SIDE BOOSTERS','两侧芯级以外部连接件接入中央芯级，连接件位于箭体之间。',[-2.7,.6,0]);for(const cx of [-.854,.854]){
  const nose=[[R,0],[R,.13]];const curve=new T.CubicBezierCurve(new T.Vector2(R,.13),new T.Vector2(R,.52),new T.Vector2(.10,.89),new T.Vector2(0,.89));for(let i=1;i<=24;i++){const p=curve.getPoint(i/24);nose.push([p.x,p.y]);}B.lathe(caps,nose,'porcelain',[cx,8.355,0]);
  const sign=Math.sign(cx),lo=R,hi=Math.abs(cx)-R;
  for(const y of [.76,8.27]){const joint=rod(B,caps,[sign*lo,y,0],[sign*hi,y,0],.033,'titanium');joint.name='falcon-external-booster-joint';for(const x of [lo,hi]){const foot=B.box(caps,.024,.13,.12,'dark',[sign*x,y,0],.004);foot.name='falcon-booster-attachment';}}
 }}
 // 喷漆、隔热黑色表面和金属栅格使用各自材质，调整只作用于本次构造的克隆。
 B.root.traverse(o=>{if(!o.isMesh)return;const mat=o.material,key=o.userData.materialKey;if(key==='porcelain'){mat.metalness=.04;mat.roughness=.39;}if(key==='black'){mat.metalness=.08;mat.roughness=.68;}if(key==='titanium'){mat.color.setHex(0x52565b);mat.metalness=.72;mat.roughness=.56;}});
 return {...B,update(a,e){offsets(B,e);flames.forEach((g,i)=>g.scale.y=.76+.16*Math.sin(a*6+i));}};
}
