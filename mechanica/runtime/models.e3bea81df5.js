import * as T from '#three';
import {makeBuilder,gearGeometry,bladeGeometry,perforatedTubeGeometry,fanBladeGeometry,circularHoleRadius,TAU} from '#geometry';
import {ENGINE,GEARBOX,pistonPose,gearAngles,valveLift} from '#motion';
import {addMechanicalDetails} from '#details';
import {EXTRA_INFO,EXTRA_BUILDERS} from '#extras';
import {VEHICLE_INFO,VEHICLE_BUILDERS} from '#vehicles';
import {COLLECTION_INFO,COLLECTION_BUILDERS} from '#collections';
import {ASSET_MODULES} from '#assets';
const PI=Math.PI;
export const MODEL_INFO={
 ...EXTRA_INFO,...VEHICLE_INFO,...COLLECTION_INFO,
 engine:{name:'单缸四冲程发动机',asset:'engine',nav:'活塞发动机',code:'ENGINE / 001',tag:'单缸 · 顶置气门 · 25°斜置气缸',subtitle:'沿着活塞、连杆与曲轴，追踪一次燃烧如何变成转动。',short:'往复运动与旋转运动的连接。',selected:'piston',azimuth:.7,elevation:.25,cycleTitle:'一次循环，四个冲程。',cycleHint:'曲轴转动两圈',basis:'整机按本田GX200产品手册公开参数造型，缸径68 mm、行程54 mm、排量196 cm³，气缸前倾25°，外形尺寸321×376×346 mm，曲轴中心高106 mm，输出轴直径20 mm。三视轮廓与手册线图逐一比对。连杆长度、凸轮型线、配气机构与内部壁厚属于网页造型补全，不是制造图纸。',source:'https://cdn.honda.co.za/pub/general/gx200/brochure/GX200.pdf',sourceName:'Honda GX200 产品手册',phases:[['进气','INTAKE','进气门打开，活塞下行。','intake'],['压缩','COMPRESSION','气门关闭，活塞上行。','piston'],['做功','POWER','混合气点燃，推动活塞。','rod'],['排气','EXHAUST','排气门打开，活塞上行。','exhaust']]},
 gearbox:{name:'平行轴齿轮箱',nav:'齿轮箱',code:'GEARBOX / 002',tag:'单级 · 外啮合直齿轮 · 20 / 40 齿',subtitle:'看见轮齿如何接力，把输入的转动传递给输出轴。',short:'两根轴，一对持续啮合的齿轮。',selected:'driven',azimuth:.25,elevation:.32,cycleTitle:'转动如何传到另一根轴。',cycleHint:'示例转速比 2 : 1',basis:'齿数、模数、20°压力角与齿顶高1m、齿根高1.25m按渐开线标准齿形构造，中心距等于m(z1+z2)/2。箱体与前盖设有实际穿轴通孔，轴封对应各自轴径，输出键位于端盖外侧。轴承、孔壁、轴封、腹板减重孔与外露轴段的尺寸属于网页结构补全。',source:'https://khkchilun.com/gearknowledge/introduction-to-gears/involute-tooth-profile.html',sourceName:'KHK 齿轮知识',phases:[['输入','INPUT','输入轴带动小齿轮。','input'],['啮合','MESH','齿面接触，传递运动。','pinion'],['输出','OUTPUT','大齿轮反向，以一半速度转动。','driven'],['支承','SUPPORT','轴承支承旋转的轴。','bearings']]},
 motor:{name:'笼型异步电动机',nav:'电动机',code:'MOTOR / 003',tag:'三相 · 36槽定子 · 28导条斜槽转子',subtitle:'剖开外壳，观察绕组、定子铁芯与笼型转子的空间关系。',short:'把电能转化为轴的旋转运动。',selected:'rotor',azimuth:.68,elevation:.27,cycleTitle:'从旋转磁场到转矩输出。',cycleHint:'转动动画为示意',basis:'外形比例按ABB M3BP 80机座尺寸图（3GZF500008-65）折算，包括中心高80、底脚孔距125×100、轴伸19×40、平键6、接线盒118见方与顶面高245。定子36槽、转子28槽参考Xiang等2025年Electronics论文中的7.5 kW样机。机座轴向长度、槽形细节、绕组端部与冷却结构属于网页造型补全。',source:'https://www.nidec.com/en/products/small-precision-motors/contents/technology/motor/basic/00026/',sourceName:'Nidec 电机原理',phases:[['定子','STATOR','绕组通电，形成旋转磁场。','windings'],['感应','INDUCTION','转子导条中产生感应电流。','cage'],['转矩','TORQUE','电流与磁场作用，驱动转子。','rotor'],['输出','OUTPUT','转子带动输出轴和冷却风扇。','shaft']]},
 turbine:{name:'航空涡扇发动机',nav:'航空涡扇',code:'TURBOFAN / 004',tag:'单级风扇 · 3+9级压气机 · 1+4级涡轮',subtitle:'从宽弦风扇到核心机，展开一台航空发动机的内部世界。',short:'宽弦风扇、环形外涵道与双转子核心机。',selected:'fanRotor',azimuth:-.92,elevation:.29,cycleTitle:'沿气流方向，读懂发动机。',cycleHint:'风扇与核心机由不同转子驱动',basis:'级数按EASA CFM56-7B型号合格证数据单（TCDS E.004），即单级风扇、3级增压级、9级高压压气机、单级高压涡轮与4级低压涡轮。风扇22片钛合金宽弦叶片取自GE Aerospace 1997年CFM56-7新闻稿。各段半径、叶片弦长与其余叶片数属于网页造型补全，不代表可飞行的设计。',source:'https://www.grc.nasa.gov/www/k-12/airplane/aturbf.html',sourceName:'NASA Glenn',phases:[['风扇','FAN','部分气流进入外涵道，绕过核心机。','fanRotor'],['燃烧','COMBUSTION','燃料与空气混合并燃烧。','combustor'],['涡轮','TURBINE','涡轮取出功，带动压气机。','turbine'],['喷出','EXHAUST','喷管使气流加速排出。','nozzle']]}
};
function sub(parent){const g=new T.Group();g.userData.part=parent.userData.part;parent.add(g);return g;}
function flange(B,g,r,ri,z,mat='steel',axis='z'){B.tube(g,r,ri,.12,mat,axis==='x'?[z,0,0]:[0,0,z],axis);const pts=[];for(let i=0;i<12;i++){const a=i*TAU/12;pts.push(axis==='x'?[z+.07,Math.cos(a)*(r-.09),Math.sin(a)*(r-.09)]:[Math.cos(a)*(r-.09),Math.sin(a)*(r-.09),z+.07]);}B.bolts(g,pts,axis,.045);}
export function buildGearbox(materials){
 const B=makeBuilder(materials),m=GEARBOX.module,r1=GEARBOX.inputTeeth*m/2,r2=GEARBOX.outputTeeth*m/2,x1=-r2,x2=r1,inputRadius=.23,inputRearSeat=.26,outputRadius=.27,outputFrontSeat=.30;
 // 渐开线齿形按KHK标准齿制（齿顶高1m、齿根高1.25m、压力角20°）。挤出倒角会把齿廓外扩，齿厚按倒角量另减0.003作侧隙，标准中心距下两齿轮不互相嵌入。
 const seat=(face,size)=>face+.45*size,holeSegments=32,fit=bore=>bore*Math.cos(Math.PI/holeSegments)-.0005;
 function spurGear(teeth,width,bore,rimInner=0){
  const bevel=.012,rp=teeth*m/2,rb=rp*Math.cos(GEARBOX.pressureAngle),ra=rp+m-bevel,rf=rp-1.25*m-bevel,thin=bevel+.003,inv=r=>{const a=Math.acos(Math.min(1,rb/r));return Math.tan(a)-a;},half=r=>Math.PI/(2*teeth)+inv(rp)-inv(Math.max(r,rb))-thin/r,low=Math.max(rf,rb),pts=[];
  for(let k=0;k<teeth;k++){const c=k*TAU/teeth,bottom=half(low);pts.push(new T.Vector2(rf*Math.cos(c-bottom),rf*Math.sin(c-bottom)));for(let i=0;i<=8;i++){const r=low+(ra-low)*i/8,a=c-half(r);pts.push(new T.Vector2(r*Math.cos(a),r*Math.sin(a)));}for(let i=8;i>=0;i--){const r=low+(ra-low)*i/8,a=c+half(r);pts.push(new T.Vector2(r*Math.cos(a),r*Math.sin(a)));}pts.push(new T.Vector2(rf*Math.cos(c+bottom),rf*Math.sin(c+bottom)));const gap=TAU/teeth-2*bottom;for(let j=1;j<=3;j++){const a=c+bottom+gap*j/3;pts.push(new T.Vector2(rf*Math.cos(a),rf*Math.sin(a)));}}
  const s=new T.Shape(pts),hole=new T.Path();hole.absarc(0,0,(rimInner||bore)+bevel,0,TAU,true);s.holes.push(hole);
  const geo=new T.ExtrudeGeometry(s,{depth:width,bevelEnabled:true,bevelSegments:2,bevelThickness:.018,bevelSize:bevel,curveSegments:holeSegments,steps:1});geo.translate(0,0,-width/2);geo.userData={teeth,pitchRadius:rp};return geo;
 }
 const housing=B.part('housing','箱体','GEARBOX HOUSING','箱体为轴承和传动轴提供安装位置，底部安装座支承整台齿轮箱。',[0,-1.5,-1]);
 // 箱壁内侧距大齿轮齿顶约两个模数，底板前后伸出作为安装凸缘。
 B.box(housing,6.9,.28,3.0,'gearpaint',[0,-2.27,0],.08);for(const x of [-3.25,3.25])B.box(housing,.22,4.62,2.1,'gearpaint',[x,.02,0]);B.box(housing,6.72,.2,2.1,'gearpaint',[0,2.3,0]);B.box(housing,6.3,4.4,.17,'gearpaint',[0,0,-1.08],.16,[[x1,0,.48],[x2,0,.48]]);
 for(const x of [x1,x2])B.tube(housing,.66,circularHoleRadius(.48,3),.3,'gearpaint',[x,0,-1.32]);B.box(housing,6.4,.3,.2,'gearpaint',[0,-1.95,.8],.03);
 for(const x of [-2.75,2.75])B.box(housing,.9,.2,3.0,'gearpaint',[x,-2.52,0],.03);B.bolts(housing,[[-2.75,seat(-2.102,.09),-1.37],[-2.75,seat(-2.102,.09),1.37],[2.75,seat(-2.102,.09),-1.37],[2.75,seat(-2.102,.09),1.37]],'y',.09);
 const cover=B.part('cover','前盖与紧固件','FRONT COVER','前盖封闭传动腔，两处轴承孔供轴穿过。周边螺栓把前盖固定在箱体上，剖切模式中移去前盖。',[0,.1,2.6]);B.cut(B.box(cover,6.58,4.37,.24,'gearpaint',[0,.155,1.1],.2,[[x1,-.155,.48],[x2,-.155,.48]]));const boltpos=[];for(const x of [-2.9,-1.45,0,1.45,2.9])for(const y of [-1.95,2.3])boltpos.push([x,y,seat(1.29,.08)]);for(const x of [-3.25,3.25])for(const y of [-1,0,1])boltpos.push([x,y,seat(1.29,.08)]);B.bolts(cover,boltpos,'z',.08).forEach(B.cut);for(const x of [x1,x2])B.cut(B.tube(cover,.59,circularHoleRadius(.48,3),.34,'gearpaint',[x,0,1.29]));
 const input=B.part('input','输入轴','INPUT SHAFT','输入轴与小齿轮同轴连接。轴上的台阶用于定位齿轮和轴承，后端花键接入动力。',[-1.2,0,-2]);input.position.x=x1;for(const [r,h,z]of [[inputRadius,4.3,-.1],[fit(.29),1,0],[inputRearSeat,.4,-1]])B.cylinder(input,r,h,'chrome',[0,0,z],'z');
 const pinion=B.part('pinion','小齿轮','DRIVING GEAR','示例小齿轮有 20 个齿。它与 40 齿的大齿轮外啮合，两个齿轮的转动方向相反。',[-1.2,.3,1]);pinion.position.x=x1;B.mesh(pinion,spurGear(20,.72,.29),'steel');B.tube(pinion,.40,.29,.95,'chrome');
 // 大齿轮采用轮缘、带减重孔的腹板与轮毂三段，腹板薄于齿宽。
 const driven=B.part('driven','大齿轮','DRIVEN GEAR','示例大齿轮有 40 个齿。小齿轮转两圈时，大齿轮反向转一圈。腹板减重孔和轮毂随轮缘一起转动。',[1.4,.3,1.2]);driven.position.x=x2;const rimInner=r2-1.25*m-.2;B.mesh(driven,spurGear(40,.72,.32,rimInner),'steel');
 const web=new T.Shape();web.absarc(0,0,rimInner+.012,0,TAU,false);const webHole=new T.Path();webHole.absarc(0,0,.5,0,TAU,true);web.holes.push(webHole);for(let i=0;i<6;i++){const a=i*TAU/6+TAU/12,h=new T.Path();h.absarc(1.04*Math.cos(a),1.04*Math.sin(a),.25,0,TAU,true);web.holes.push(h);}const webGeo=new T.ExtrudeGeometry(web,{depth:.26,bevelEnabled:true,bevelThickness:.02,bevelSize:.012,bevelSegments:2,curveSegments:24});webGeo.translate(0,0,-.13);B.mesh(driven,webGeo,'steel');B.tube(driven,.51,fit(.32)/Math.cos(Math.PI/64)+.0004,1.12,'chrome');
 const output=B.part('output','输出轴','OUTPUT SHAFT','输出轴与大齿轮固定连接。相对于输入轴，示例中的输出轴转得更慢，转向相反。',[1.4,0,2.3]);output.position.x=x2;for(const [r,h,z]of [[outputRadius,4.7,.2],[fit(.32),1.2,0],[outputFrontSeat,.4,1.1]])B.cylinder(output,r,h,'chrome',[0,0,z],'z');B.box(output,.12,.08,.65,'steel',[0,.28,2.1],.01);
 const bearings=B.part('bearings','滚动轴承','ROLLING BEARINGS','每根轴由前后两处轴承支承。外圈装在箱体与前盖的轴承孔内，滚动体在内外圈之间运动。',[0,1.8,1.4]);for(const [x,z,bore]of [[x1,-.91,inputRearSeat],[x1,.91,inputRadius],[x2,-.91,outputRadius],[x2,.91,outputFrontSeat]])B.bearing(bearings,.48,[x,0,z],'z',bore);
 const seals=B.part('seals','轴封与端盖','SHAFT SEALS','轴封的内孔与各自轴径对应，外露键位于端盖外侧。端盖对密封件进行轴向定位。',[0,-1,3]);for(const [x,bore]of [[x1,inputRadius],[x2,outputRadius]]){B.tube(seals,.48,circularHoleRadius(bore,Math.max(Math.abs(x),1.49)),.14,'black',[x,0,1.49]);B.tube(seals,.60,.28,.09,'alloy',[x,0,1.58]);B.bolts(seals,Array.from({length:4},(_,i)=>{const a=i*TAU/4+TAU/8;return[x+.51*Math.cos(a),.51*Math.sin(a),seat(1.625,.045)];}),'z',.045);}
 const drain=B.part('plugs','加油与放油螺塞','OIL PLUGS','顶部螺塞提供加油入口，前盖下部螺塞用于排出润滑油。页面省略油液，以便看清传动部件。',[0,2.0,0]);B.cylinder(drain,.18,.16,'chrome',[-.4,2.412+.078,0],'y',.18,6);B.cylinder(drain,.21,.03,'bronze',[-.4,2.412+.013,0],'y');B.cylinder(drain,.16,.15,'chrome',[2.4,-1.75,1.29+.03+.073],'z',.16,6);B.cylinder(drain,.19,.03,'bronze',[2.4,-1.75,1.29+.013],'z');
 function update(a,e){setOffsets(B,e);input.position.x+=x1;pinion.position.x+=x1;driven.position.x+=x2;output.position.x+=x2;const angles=gearAngles(a);input.rotation.z=pinion.rotation.z=angles.input;output.rotation.z=driven.rotation.z=angles.output;}
 return {...B,update,info:MODEL_INFO.gearbox};
}
export function buildMotor(materials){
 const B=makeBuilder(materials),shaftRadius=.22,bearingRadius=.43,seatHole=circularHoleRadius(bearingRadius,2.15);
 // 外形按ABB M3BP 80ML尺寸图（3GZF500008-65）：中心高H=80、底脚孔距A=125与B=100、轴伸D=19与E=40、底脚高10，按H折算比例。
 const k=1.862/80,stack=1.40,cutAt=TAU/3,polygon=(path,r,n,start=0)=>{for(let i=0;i<=n;i++){const a=start+i*TAU/n;i?path.lineTo(r*Math.cos(a),r*Math.sin(a)):path.moveTo(r*Math.cos(a),r*Math.sin(a));}};
 const housing=B.part('housing','机座与散热筋','MOTOR FRAME','铸铁机座固定定子并支承端盖。外侧散热筋增加换热面积，底脚用于安装。',[-2,0,0]);
 B.tube(housing,1.54,1.40,3.4,'motorpaint',[0,0,0],'z',Math.PI*.65,Math.PI*1.35);B.cut(B.tube(housing,1.54,1.4,3.4,'motorpaint',[0,0,0],'z',0,Math.PI*.65));
 for(let i=0;i<36;i++){const a=i*TAU/36,g=(a<Math.PI*.65);const rib=B.box(housing,.08,.25,3.35,'motorpaint',[1.59*Math.cos(a),1.59*Math.sin(a),0],.01);rib.rotation.z=a-Math.PI/2;if(g)B.cut(rib);}
 const footX=125*k/2,footZ=100*k/2,footTop=-1.862+10*k;
 for(const z of [-1.73,1.73])flange(B,housing,1.64,1.40,z,'motorpaint');for(const x of [-1,1]){B.box(housing,.34,.78,2.7,'motorpaint',[x*1.08,-1.32,0],.03);B.box(housing,.92,10*k-.024,2.7,'motorpaint',[x*(154*k/2-.46),(footTop-1.862)/2,0],.03);}
 B.bolts(housing,[-1,1].flatMap(x=>[-1,1].map(z=>[x*footX,footTop+.45*.09,z*footZ])),'y',.09);
 // 定子36槽半闭口槽叠片，齿宽沿径向不变，槽底圆角；叠片外圆与机座内孔贴合。
 const stator=B.part('stator','定子铁芯','STATOR CORE','定子铁芯由薄钢片叠成，内侧36个半闭口槽安放绕组。它压装在机座内，不随转子旋转。',[-1.0,1.6,0]);
 const bore=1.0,tooth=.085,slotHalf=r=>(TAU*r/36-tooth)/2,slotTop=1.21;
 function lamination(a0,a1){const s=new T.Shape(),outer=1.40,n=Math.round((a1-a0)/(TAU/96));for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;i?s.lineTo(outer*Math.cos(a),outer*Math.sin(a)):s.moveTo(outer*Math.cos(a),outer*Math.sin(a));}
  const P=(r,a)=>s.lineTo(r*Math.cos(a),r*Math.sin(a));P(bore,a1);
  for(let j=Math.round(a1/(TAU/36))-1;j>=Math.round(a0/(TAU/36));j--){const c=(j+.5)*TAU/36,w=slotHalf(slotTop);P(bore,c+.022/bore);P(1.03,c+.022/1.03);P(1.05,c+slotHalf(1.05)/1.05);P(slotTop,c+w/slotTop);for(let i=1;i<6;i++){const t=i*Math.PI/6,x=slotTop+w*Math.sin(t),y=w*Math.cos(t);P(Math.hypot(x,y),c+Math.atan2(y,x));}P(slotTop,c-w/slotTop);P(1.05,c-slotHalf(1.05)/1.05);P(1.03,c-.022/1.03);P(bore,c-.022/bore);}
  P(bore,a0);s.closePath();return s;}
 const sheets=28,pitch=2*stack/sheets;
 for(const [a0,a1,hidden] of [[cutAt,TAU,false],[0,cutAt,true]]){const geo=new T.ExtrudeGeometry(lamination(a0,a1),{depth:pitch,bevelEnabled:false,curveSegments:8,steps:1});
  for(const [mat,odd] of [['steel',0],['dark',1]]){const list=[];for(let i=odd;i<sheets;i+=2)list.push({p:[0,0,-stack+i*pitch]});const m=B.instances(stator,geo,mat,list);if(hidden)B.cut(m);}}
 // 双层叠绕组：每槽上下两层线圈边，端部绕组成环并用绑扎带固定；槽口用槽楔封闭。
 const windings=B.part('windings','定子绕组','STATOR WINDINGS','三相绕组的线圈边嵌在定子槽内，端部铜线绕成环形并用绑扎带固定。交流电流流过绕组，形成旋转磁场。',[0,1.7,1.3]);
 const side=(r,w,h)=>Array.from({length:36},(_,j)=>{const c=(j+.5)*TAU/36;return {p:[r*Math.cos(c),r*Math.sin(c),0],r:[0,0,c-Math.PI/2],s:[w,h,1]};});
 const bar=new T.BoxGeometry(1,1,2*stack+.12);B.instances(windings,bar,'copper',side(1.095,.088,.068));B.instances(windings,bar,'copper',side(1.175,.1,.068));
 B.instances(windings,new T.BoxGeometry(1,1,2*stack),'dark',side(1.04,.058,.016));
 const endRing=[[1.06,0],[1.03,.08],[1.02,.18],[1.06,.26],[1.15,.29],[1.25,.27],[1.31,.2],[1.32,.1],[1.27,0],[1.06,0]];
 // 车削轮廓按外法线朝外排列，两端镜像后反转点序。
 for(const sign of [-1,1]){const pts=endRing.map(([r,z])=>[r,sign*(stack+z)]);B.lathe(windings,sign>0?pts.reverse():pts,'copper',[0,0,0],'z');}
 // 笼型转子：28个闭口槽内的铝导条斜一个转子槽距，两端短路环带散热叶片。
 const rotor=B.part('rotor','转子铁芯','ROTOR CORE','转子铁芯由叠片压装在轴上，28个闭口槽内铸有铝导条。槽沿轴向斜一个转子槽距，以减小转矩波动与噪声。',[0,0,2.8]);
 const bars=28,skew=TAU/bars,rotorR=.975,barR=.04,barAt=.90,core=new T.Shape();core.absarc(0,0,rotorR,0,TAU,false);const boreHole=new T.Path();polygon(boreHole,.29/Math.cos(Math.PI/64)+.0005,64);core.holes.push(boreHole);
 for(let i=0;i<bars;i++){const h=new T.Path(),c=i*TAU/bars;for(let j=0;j<=12;j++){const a=-j*TAU/12,x=barAt*Math.cos(c)+.045*Math.cos(a),y=barAt*Math.sin(c)+.045*Math.sin(a);j?h.lineTo(x,y):h.moveTo(x,y);}core.holes.push(h);}
 const coreGeo=new T.ExtrudeGeometry(core,{depth:2*stack,bevelEnabled:false,curveSegments:96,steps:12});coreGeo.translate(0,0,-stack);
 {const p=coreGeo.attributes.position,n=coreGeo.attributes.normal;for(let i=0;i<p.count;i++){const t=skew*p.getZ(i)/(2*stack),c=Math.cos(t),s=Math.sin(t),x=p.getX(i),y=p.getY(i),nx=n.getX(i),ny=n.getY(i);p.setXY(i,x*c-y*s,x*s+y*c);n.setXY(i,nx*c-ny*s,nx*s+ny*c);}}
 B.mesh(rotor,coreGeo,'steel');
 const cage=B.part('cage','导条与短路环','ROTOR CAGE','铝导条沿斜槽穿过转子铁芯，两端由短路环连成闭合回路。短路环上的叶片在旋转时搅动机内空气。',[1.5,.5,2.8]);
 for(const sign of [-1,1]){B.tube(cage,.95,.72,.19,'alloy',[0,0,sign*(stack+.095)]);for(let i=0;i<8;i++){const a=i*TAU/8+TAU/16,fin=B.box(cage,.05,.2,.08,'alloy',[.84*Math.cos(a),.84*Math.sin(a),sign*(stack+.19+.04)],.01);fin.rotation.z=a-Math.PI/2;}}
 for(let i=0;i<bars;i++){const c=i*TAU/bars,pts=[];for(let j=0;j<=8;j++){const z=-stack-.1+j*(2*stack+.2)/8,a=c+skew*z/(2*stack);pts.push([barAt*Math.cos(a),barAt*Math.sin(a),z]);}B.path(cage,pts,barR,'alloy');}
 const shaft=B.part('shaft','输出轴','OUTPUT SHAFT','转子固定在输出轴上，轴伸通过平键与外部负载连接。轴承安装在轴的两端。',[0,-.6,3.8]);const front=2.145+40*k,rear=-2.52;B.cylinder(shaft,shaftRadius,front-rear,'chrome',[0,0,(front+rear)/2],'z');B.cylinder(shaft,.29,3.25,'steel',[0,0,0],'z');B.box(shaft,6*k,6*k,32*k,'steel',[0,shaftRadius,front-.04-16*k],.012);
 const endbells=B.part('endbells','前后端盖','END SHIELDS','端盖与机座连接，并为轴承提供安装孔。放射状加强筋增强端盖的支承结构。',[0,.5,2.3]);for(const z of [-1.92,1.92]){if(z>0){B.tube(endbells,1.55,seatHole,.23,'motorpaint',[0,0,z-Math.sign(z)*.02],'z',Math.PI*.65,Math.PI*1.35);B.cut(B.tube(endbells,1.55,seatHole,.23,'motorpaint',[0,0,z-Math.sign(z)*.02],'z',0,Math.PI*.65));}else B.tube(endbells,1.55,seatHole,.23,'motorpaint',[0,0,z-Math.sign(z)*.02]);B.tube(endbells,.55,seatHole,.45,'motorpaint',[0,0,z]);for(let i=0;i<8;i++){const a=i*TAU/8;const rib=B.box(endbells,.12,.9,.18,'motorpaint',[.96*Math.cos(a),.96*Math.sin(a),z+(z>0?.17:-.17)],.025);rib.rotation.z=a-Math.PI/2;if(z>0&&a<Math.PI*.65)B.cut(rib);}const fasteners=B.bolts(endbells,Array.from({length:8},(_,i)=>{const a=i*TAU/8;return[1.4*Math.cos(a),1.4*Math.sin(a),z+Math.sign(z)*.12];}),'z',.055);if(z<0)for(const mesh of fasteners)mesh.geometry.rotateY(PI);}
 const bearings=B.part('bearings','轴承','BEARINGS','轴承的内圈随轴转动，外圈由端盖定位。拆解时可独立观察滚动体与滚道。',[0,-1.6,1.2]);for(const z of [-1.92,1.92])B.bearing(bearings,bearingRadius,[0,0,z],'z',shaftRadius);
 const fan=B.part('fan','冷却风扇','COOLING FAN','风扇安装在轴的尾端，随轴一起转动，引导空气沿机座外侧流动。',[0,0,-2.5]);fan.position.z=-2.27;B.tube(fan,.34,circularHoleRadius(shaftRadius,2.27),.25,'black',[0,0,0]);B.instances(fan,bladeGeometry(.30,1.20,.44,.8),'black',Array.from({length:11},(_,i)=>({p:[0,0,0],r:[0,0,i*TAU/11]})));
 const fanCover=B.part('fanCover','风扇护罩','FAN COVER','护罩围住冷却风扇，四处连接固定在后端盖周边。后部格栅接到内外圆环，开口供空气通过。剖切模式下移去罩体。',[0,0,-3.3]);B.cut(B.tube(fanCover,1.46,1.38,.73,'motorpaint',[0,0,-2.45]));B.cut(B.tube(fanCover,1.43,1.28,.06,'motorpaint',[0,0,-2.84]));B.cut(B.tube(fanCover,.43,.22,.06,'motorpaint',[0,0,-2.84]));for(let i=0;i<24;i++){const a=i*TAU/24;const rib=B.box(fanCover,.035,.89,.08,'dark',[.85*Math.cos(a),.85*Math.sin(a),-2.89],.005);rib.rotation.z=a-Math.PI/2;B.cut(rib);}
 for(let i=0;i<4;i++){const a=TAU*(i+.25)/4,block=B.box(fanCover,.14,.16,.14,'motorpaint',[1.50*Math.cos(a),1.50*Math.sin(a),-2.065],.01);block.rotation.z=a;block.name='fan-cover-mount';B.cut(block);}
 // 接线盒按尺寸图118 mm见方、顶面距底脚245 mm，盒体为空腔，盒盖在剖切模式中移去。
 const terminal=B.part('terminal','接线盒','TERMINAL BOX','接线端子位于机座顶部的接线盒内。盒盖和电缆密封接头保护接线部位。',[0,2.2,-.5]);const boxW=118*k,boxTop=245*k-1.862,lid=.16,wall=.1,floorY=1.86,inner=boxTop-lid-floorY;
 B.box(terminal,boxW-.3,.42,boxW-.3,'motorpaint',[0,1.68,0],.05);B.box(terminal,boxW,.12,boxW,'motorpaint',[0,floorY+.06,0],.03);
 for(const s of [-1,1]){B.box(terminal,wall,inner,boxW,'motorpaint',[s*(boxW-wall)/2,floorY+inner/2,0],.03);B.box(terminal,boxW-2*wall,inner,wall,'motorpaint',[0,floorY+inner/2,s*(boxW-wall)/2],.03);}
 B.cut(B.box(terminal,boxW+.06,lid,boxW+.06,'motorpaint',[0,boxTop-lid/2,0],.05));B.box(terminal,1.2,.14,.7,'ceramic',[0,floorY+.12+.07,0],.02);for(const x of [-.4,0,.4])for(const z of [-.2,.2])B.cylinder(terminal,.065,.2,'bronze',[x,floorY+.12+.14+.1,z]);
 for(const z of [-.55,.55]){B.cylinder(terminal,.2,.12,'black',[boxW/2+.06,floorY+inner*.45,z],'x',.2,6);B.cylinder(terminal,.15,.22,'black',[boxW/2+.23,floorY+inner*.45,z],'x');}
 function update(a,e){setOffsets(B,e);rotor.rotation.z=cage.rotation.z=shaft.rotation.z=fan.rotation.z=a;fan.position.z-=2.27;}
 return {...B,update,info:MODEL_INFO.motor};
}
export function buildTurbine(materials){
 const B=makeBuilder(materials),hole=r=>circularHoleRadius(r,4);
 // 级数取EASA CFM56-7B型号合格证数据单：单级风扇、3级增压级、9级高压压气机、单级高压涡轮、4级低压涡轮。风扇22片宽弦钛叶片取自GE Aerospace 1997年CFM56-7新闻稿；各段半径、叶片弦长与其余叶片数为网页造型补全。
 // 叶片截面沿径向扫掠：弦长、安装角与厚度从根部到叶尖线性变化，轴向半宽可由弦长和安装角算出，用于排距留间隙。
 function blade(r0,r1,c0,c1,b0,b1,t0,t1,sections=4,sides=8,camber=.05){const pos=[],idx=[];for(let j=0;j<=sections;j++){const v=j/sections,r=r0+(r1-r0)*v,c=c0+(c1-c0)*v,b=b0+(b1-b0)*v,t=t0+(t1-t0)*v;for(let i=0;i<sides;i++){const th=i*TAU/sides,s=Math.cos(th)*c/2,h=Math.sin(th)*t/2+camber*c*(1-(2*s/c)**2);pos.push(s*Math.cos(b)-h*Math.sin(b),r,s*Math.sin(b)+h*Math.cos(b));}}for(let j=0;j<sections;j++)for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides,c=a+sides,d=b+sides;idx.push(a,b,c,b,d,c);}for(let i=1;i<sides-1;i++){idx.push(0,i+1,i);const n=sections*sides;idx.push(n,n+i,n+i+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
 const ring=(g,n,x)=>Array.from({length:n},(_,j)=>({p:[x,0,0],r:[j*TAU/n,0,0]}));
 function vaneRow(g,geo,mat,x,n){const shown=[],hidden=[];for(let j=0;j<n;j++){const a=(j+.5)*TAU/n;(a<PI?hidden:shown).push({p:[x,0,0],r:[a,0,0]});}B.instances(g,geo,mat,shown);B.cut(B.instances(g,geo,mat,hidden));}
 function halfTube(g,ro,ri,h,mat,x){B.tube(g,ro,ri,h,mat,[x,0,0],'x',-PI/2,PI);B.cut(B.tube(g,ro,ri,h,mat,[x,0,0],'x',PI/2,PI));}
 const inlet=B.part('inlet','分流环与增压级机匣','SPLITTER & BOOSTER CASE','分流环把风扇后的气流分成内外两股：内侧进入增压级和核心机，外侧进入外涵道。增压级静子固定在分流环内壁。',[-2.1,0,0]);B.lathe(inlet,[[1.35,-.26],[1.5,-.23],[1.57,-.12],[1.56,.06],[1.45,.22],[1.33,.24],[1.31,.14],[1.39,-.06],[1.35,-.26]],'alloy',[-3.5,0,0],'x');flange(B,inlet,1.5,1.32,-3.24,'alloy','x');
 // 高压压气机：九级转子叶片装在锥形鼓筒上，轮毂半径沿流向增大，叶尖贴近机匣内壁。
 const compressor=B.part('compressor','高压压气机转子','HP COMPRESSOR ROTOR','九级转子叶片装在同一鼓筒上，由高压涡轮经高压轴驱动。流道沿流向收窄，后级叶片逐渐变短。',[-1.3,.5,0]);const rotor=sub(compressor);
 const hpcHub=x=>.62+.30*(x+2.92)/1.92,hpcX=i=>-2.80+i*.215;
 B.lathe(rotor,[[.163,-2.92],[.62,-2.92],[.92,-1.0],[.163,-1.0],[.163,-2.92]],'steel',[0,0,0],'x');
 for(let i=0;i<9;i++){const x=hpcX(i),h=hpcHub(x);B.instances(rotor,blade(h-.012,1.33,.09,.08,.75,1.0,.016,.009),i<5?'titanium':'steel',ring(rotor,32,x));}
 const stators=B.part('stators','压气机静子','COMPRESSOR STATORS','静子叶片位于相邻两排转子之间，调整气流方向。外端固定在机匣上，内端由内环连成一体，不随转子旋转。',[0,1.8,-.3]);
 const boostX=[-3.64,-3.49,-3.34],boostHub=x=>.66+.04*(x+3.70)/.5;
 for(const x of boostX.map(x=>x+.075)){const h=boostHub(x);vaneRow(stators,blade(h+.04,1.42,.07,.07,-.9,-.8,.012,.008),'steel',x,32);halfTube(stators,h+.06,h+.03,.04,'steel',x);}
 for(let i=0;i<9;i++){const x=hpcX(i)+.1075,h=hpcHub(x);vaneRow(stators,blade(h+.05,1.39,.08,.07,-.8,-.7,.014,.008),'steel',x,36);halfTube(stators,h+.065,h+.03,.05,'steel',x);}
 const caseG=B.part('case','压气机机匣','COMPRESSOR CASE','机匣包围高压压气机并固定静子。分段法兰、紧固件和外侧引气管表现其装配关系。',[0,2.2,1.8]);B.tube(caseG,1.47,1.37,2.63,'cast',[-2.0,0,0],'x',-Math.PI/2,Math.PI);B.cut(B.tube(caseG,1.47,1.37,2.63,'cast',[-2.0,0,0],'x',Math.PI/2,Math.PI));for(const x of [-3.25,-2.6,-1.3,-.73])flange(B,caseG,1.55,1.37,x,'steel','x');
 const diffuser=B.part('diffuser','扩压段','DIFFUSER','压气机出口气流进入扩压段，速度降低，部分动能转为压力。这里把环形过渡通道剖开展示。',[-.2,1.3,0]);B.lathe(diffuser,[[.68,-.25],[.91,-.25],[1.31,.28],[1.23,.28],[.68,-.25]],'alloy',[-.43,0,0],'x',Math.PI/2,Math.PI);
 const combustor=B.part('combustor','环形燃烧室','ANNULAR COMBUSTOR','燃料在环形流道中与空气混合并燃烧。内外壁围成燃烧空间，壁面孔列用于展示火焰筒的结构。',[.1,1.4,1.1]);// 火焰筒外壁按窄条分段弯成圆筒，每条一列稀释孔；窄条的端面三角形不再横穿轴心。
 function linerStrip(outer,inner,length,start,sweep){const R=(outer+inner)/2,w=R*sweep,sh=new T.Shape();sh.moveTo(0,-length/2);sh.lineTo(w,-length/2);sh.lineTo(w,length/2);sh.lineTo(0,length/2);sh.closePath();for(let row=0;row<5;row++){const h=new T.Path();h.absarc(w/2,-length/2+.19+row*(length-.38)/4,row%2?.05:.065,0,TAU,true);sh.holes.push(h);}
  const geo=new T.ExtrudeGeometry(sh,{depth:outer-inner,bevelEnabled:false,curveSegments:8,steps:1}),p=geo.attributes.position;for(let i=0;i<p.count;i++){const a=start+p.getX(i)/R,r=inner+p.getZ(i),x=p.getY(i);p.setXYZ(i,x,r*Math.cos(a),r*Math.sin(a));}geo.computeVertexNormals();return geo;}
 for(let k=0;k<26;k++){const m=B.mesh(combustor,linerStrip(1.24,1.17,1.7,k*TAU/26,TAU/26),'bronze',[.7,0,0]);if(k<13)B.cut(m);}B.tube(combustor,.63,.55,1.75,'bronze',[.725,0,0],'x');for(const x of [-.15,1.55])flange(B,combustor,1.33,1.17,x,'bronze','x');
 const injectors=B.part('injectors','燃油喷嘴与供油环','FUEL INJECTORS','供油环把燃料分配到燃烧室前端的多个喷嘴。喷嘴围绕主轴排列，中心保留主轴通道。',[0,2.7,-.5]);B.torus(injectors,1.35,.045,'bronze',[-.25,0,0],'x');for(let i=0;i<12;i++){const a=i*TAU/12,y=Math.cos(a),z=Math.sin(a);B.path(injectors,[[-.25,1.35*y,1.35*z],[-.36,1.18*y,1.18*z],[-.12,.94*y,.94*z],[.14,.94*y,.94*z]],.035,'bronze');B.cylinder(injectors,.075,.2,'steel',[.16,.94*y,.94*z],'x');}
 // 单级高压涡轮：涡轮盘套在高压轴后端，叶片位于导向器与第一排低压导向叶片之间。
 const turbine=B.part('turbine','高压涡轮转子','HP TURBINE ROTOR','燃烧后的高温气体推动单级高压涡轮，涡轮经高压轴带动高压压气机，两者同速旋转。',[1.6,.4,0]);const turbineRot=sub(turbine);
 B.tube(turbineRot,.55,hole(.162),.16,'steel',[1.80,0,0],'x');B.instances(turbineRot,blade(.54,1.22,.13,.12,.6,.75,.03,.016,4,8,.06),'hotmetal',ring(turbineRot,40,1.80));
 const turbineStator=B.part('turbineStator','涡轮导向叶片','TURBINE GUIDE VANES','高压涡轮导向器把燃烧室出口气流引向涡轮转子。低压涡轮四排导向叶片与转子交错布置。内外环把叶片连成整体，外环固定在热端机匣上。',[1.8,1.7,-.5]);
 vaneRow(turbineStator,blade(.62,1.30,.12,.11,-.7,-.6,.03,.016),'bronze',1.64,32);halfTube(turbineStator,.66,.58,.08,'steel',1.64);halfTube(turbineStator,1.34,1.26,.08,'steel',1.64);
 const lptX=[2.06,2.24,2.42,2.60];
 for(const x of lptX.map(x=>x-.09)){vaneRow(turbineStator,blade(.625,1.32,.08,.08,-.8,-.7,.014,.008),'bronze',x,36);halfTube(turbineStator,.64,.61,.05,'steel',x);halfTube(turbineStator,1.34,1.30,.05,'steel',x);}
 // 两处主轴承：前支承在增压级与高压压气机之间，后支承在低压涡轮之后，支板把轴承座连到外机匣。
 const shaft=B.part('shaft','主轴与支承','SHAFT & SUPPORTS','高压轴连接高压压气机与高压涡轮。前后两处轴承座经径向支板固定在机匣上，低压轴从高压轴内部穿过。',[0,-1.8,0]);const spindle=sub(shaft);B.tube(spindle,.16,.10,5.22,'chrome',[-.64,0,0],'x');
 for(const x of [-3.05,2.55])B.bearing(shaft,.35,[x,0,0],'x',.16);
 B.tube(shaft,.42,.35,.24,'steel',[-3.05,0,0],'x');B.tube(shaft,.42,.35,.52,'steel',[2.69,0,0],'x');
 for(const [x,r0,r1] of [[-3.05,.40,1.38],[2.88,.40,1.16]])for(let i=0;i<6;i++){const a=i*TAU/6;const brace=B.box(shaft,.09,r1-r0,.07,'steel',[x,(r0+r1)/2*Math.cos(a),(r0+r1)/2*Math.sin(a)],.01);brace.rotation.x=a;}
 const nozzle=B.part('nozzle','尾锥与喷管','EXHAUST NOZZLE','尾锥包住后轴承座，引导气流绕过主轴后端。喷管逐渐收缩，使排出的气流加速。',[2.8,0,0]);const np=[[1.23,-.55],[1.23,-.42],[.91,.64],[.86,.64],[1.15,-.42],[1.15,-.55]];B.lathe(nozzle,np,'hotmetal',[3.27,0,0],'x',Math.PI/2,Math.PI);B.cut(B.lathe(nozzle,np,'hotmetal',[3.27,0,0],'x',-Math.PI/2,Math.PI));B.lathe(nozzle,[[.50,-.55],[.50,-.35],[.38,.10],[.12,.55],[0,.62]],'steel',[3.27,0,0],'x');flange(B,nozzle,1.51,1.15,2.76,'steel','x');
 const hotCase=B.part('hotCase','热端机匣','HOT SECTION CASE','热端机匣包围燃烧室和高低压涡轮，外侧法兰连接相邻段。剖切后可见燃烧室与叶片排列。',[1.0,2.7,1.9]);B.tube(hotCase,1.43,1.34,3.41,'steel',[.995,0,0],'x',-Math.PI/2,Math.PI);B.cut(B.tube(hotCase,1.43,1.34,3.41,'steel',[.995,0,0],'x',Math.PI/2,Math.PI));for(const x of [-.7,1.55,2.64])flange(B,hotCase,1.51,1.34,x,'steel','x');
 // 风扇与增压级同在低压转子上，由低压轴连接到后部低压涡轮。
 const fanRotor=B.part('fanRotor','风扇、增压级与低压轴','FAN, BOOSTER & LP SHAFT','宽弦风扇叶片推动大部分空气进入外涵道。风扇后方的三级增压级先压缩核心气流。它们由低压涡轮经穿过高压轴内部的低压轴驱动。',[-2.7,0,1.7]);
 B.instances(fanRotor,blade(.50,2.32,.40,.85,.55,1.15,.035,.015,8,12,.04),'titanium',ring(fanRotor,22,-4.02));
 B.cylinder(fanRotor,.55,.32,'dark',[-3.9,0,0],'x');B.lathe(fanRotor,[[0,-.85],[.18,-.72],[.40,-.32],[.57,.08],[.57,.30],[0,.30]],'dark',[-4.08,0,0],'x');B.cylinder(fanRotor,.085,7.0,'chrome',[-.62,0,0],'x');
 B.lathe(fanRotor,[[.45,-3.78],[.66,-3.70],[.70,-3.20],[.56,-3.20]],'steel',[0,0,0],'x');for(const x of boostX){const h=boostHub(x);B.instances(fanRotor,blade(h-.012,1.27,.07,.065,.9,1.05,.016,.009),'titanium',ring(fanRotor,28,x));}
 const spiral=[];for(let i=0;i<=70;i++){const t=i/70,r=.055+.39*t,a=t*TAU*1.3;spiral.push([-4.88+.51*t,r*Math.cos(a),r*Math.sin(a)]);}B.path(fanRotor,spiral,.019,'ceramic');
 const nacelle=B.part('nacelle','进气唇口与风扇机匣','FAN CASE & INLET LIP','圆弧进气唇口包围前置风扇。机匣在剖切时打开，露出风扇与核心机。',[-1.6,2.1,-1.2]);
 B.lathe(nacelle,[[2.34,-.65],[2.48,-.56],[2.53,-.35],[2.52,.35],[2.44,.75],[2.37,.75],[2.41,.27],[2.40,-.25],[2.34,-.48],[2.34,-.65]],'chrome',[-4.18,0,0],'x');
 const bypass=B.part('bypass','外涵道与短舱','BYPASS DUCT','风扇后的部分空气绕过核心机，经外涵道向后流动。',[0,2.4,-2.0]);B.lathe(bypass,[[2.45,-2.0],[2.50,-1.3],[2.36,1.7],[1.88,2.8],[1.81,2.8],[2.27,1.7],[2.41,-1.3],[2.37,-2.0]],'cast',[-1.7,0,0],'x',PI/2,PI);B.cut(B.lathe(bypass,[[2.45,-2.0],[2.50,-1.3],[2.36,1.7],[1.88,2.8],[1.81,2.8],[2.27,1.7],[2.41,-1.3],[2.37,-2.0]],'cast',[-1.7,0,0],'x',-PI/2,PI));
 const fanStator=B.part('fanStator','风扇出口导向叶片','FAN OUTLET GUIDE VANES','静止导向叶片连接内外机匣，并调整风扇出口气流方向。',[-.7,-2,1]);const fanGeo=bladeGeometry(1.42,2.40,.35,-.4);fanGeo.rotateY(PI/2);B.instances(fanStator,fanGeo,'alloy',Array.from({length:14},(_,i)=>({p:[-3.32,0,0],r:[(i+7)*TAU/28,0,0]})));B.cut(B.instances(fanStator,fanGeo,'alloy',Array.from({length:14},(_,i)=>({p:[-3.32,0,0],r:[(i-7)*TAU/28,0,0]}))));
 // 四级低压涡轮叶片装在同一鼓筒上，鼓筒前端的轮盘经套筒连到低压轴，后轴承位于鼓筒内侧。
 const lowTurbine=B.part('lowTurbine','低压涡轮','LOW PRESSURE TURBINE','四级低压涡轮经低压轴带动风扇与增压级，与高压转子分开转动。',[2.3,-.8,1.4]);
 B.tube(lowTurbine,.16,hole(.087),.95,'steel',[2.475,0,0],'x');B.tube(lowTurbine,.53,.155,.04,'steel',[2.02,0,0],'x');B.tube(lowTurbine,.58,.52,.66,'steel',[2.33,0,0],'x');
 for(const x of lptX)B.instances(lowTurbine,blade(.57,1.28,.09,.08,.8,.95,.016,.009),'hotmetal',ring(lowTurbine,40,x));
 function update(a,e){setOffsets(B,e);rotor.rotation.x=turbineRot.rotation.x=spindle.rotation.x=a;fanRotor.rotation.x=lowTurbine.rotation.x=a*.65;}
 return {...B,update,info:MODEL_INFO.turbine};
}
function setOffsets(B,e){for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);}
// Blender模型优先于同名代码造型；模块可用INFO补充或改写说明字段，asset字段指向同名模型文件。
for(const [key,m]of Object.entries(ASSET_MODULES))MODEL_INFO[key]={...MODEL_INFO[key],...m.INFO,asset:key};
export function buildModel(key,materials){const fn={gearbox:buildGearbox,motor:buildMotor,turbine:buildTurbine,...EXTRA_BUILDERS,...VEHICLE_BUILDERS,...COLLECTION_BUILDERS}[key];const asset=ASSET_MODULES[key];if(!fn&&!asset)throw new RangeError('不支持的机械类型。');const model=asset?asset.build(materials,MODEL_INFO[key]):fn(materials);if(asset||VEHICLE_INFO[key]||COLLECTION_INFO[key])model.info=MODEL_INFO[key];else addMechanicalDetails(model,key);model.update(.55,0,'structure');return model;}
