import * as T from '#three';
import {TAU} from '#geometry';
// 结构细节统一在原模型上追加，继续使用原有的选择、剖切和网格合并入口。
export function addMechanicalDetails(model,key){
 const B=model,part=id=>B.parts.find(p=>p.id===id).group;
 const circle=(r,z,n=12,axis='z')=>Array.from({length:n},(_,i)=>{const a=i*TAU/n;return axis==='x'?[z,r*Math.cos(a),r*Math.sin(a)]:[r*Math.cos(a),r*Math.sin(a),z];});
 if(key==='turbine'){
  // 风扇机匣螺栓环与耐磨衬带；外涵道加强环；压气机外侧引气管；高压压气机鼓筒后端螺栓；热端机匣加强环；喷管外侧冷却管。
  const nacelle=part('nacelle');
  B.bolts(nacelle,circle(2.42,-3.48,36,'x'),'x',.026);
  B.tube(nacelle,2.405,2.39,.21,'dark',[-4.13,0,0],'x');
  for(let i=0;i<48;i++){const a=i*TAU/48,q=B.box(nacelle,.19,.012,.014,'alloy',[-4.13,2.388*Math.cos(a),2.388*Math.sin(a)],.002);q.rotation.x=a;}
  const bypass=part('bypass');
  for(const [x,r] of [[-3.48,2.48],[-2.6,2.495],[.45,2.18]]){
   B.tube(bypass,r+.015,r-.012,.045,'dark',[x,0,0],'x',-Math.PI/2,Math.PI);
   B.cut(B.tube(bypass,r+.015,r-.012,.045,'dark',[x,0,0],'x',Math.PI/2,Math.PI));
  }
  const caseG=part('case');
  for(const a of [Math.PI*.64,Math.PI*.88,Math.PI*1.12]){
   const y=Math.cos(a),z=Math.sin(a);
   B.path(caseG,[[-2.95,1.53*y,1.53*z],[-2.65,1.62*y,1.62*z],[-1.35,1.62*y,1.62*z],[-.85,1.53*y,1.53*z]],.025,'chrome');
   for(const x of [-2.65,-1.35]){B.tube(caseG,.065,.028,.12,'bronze',[x,1.62*y,1.62*z],'x');B.box(caseG,.09,.18,.08,'steel',[x,1.53*y,1.53*z],.015).rotation.x=a;}
  }
  B.bolts(part('compressor').children[0],circle(.6,-1.0+.45*.022,12,'x'),'x',.022);
  const hot=part('hotCase');
  for(const x of [.05,.45,.85,1.25])B.tube(hot,1.455,1.425,.035,'hotmetal',[x,0,0],'x',-Math.PI/2,Math.PI);
  const nozzle=part('nozzle');
  for(let i=0;i<24;i++){const a=i*TAU/24;const p=B.path(nozzle,[[2.80,1.225*Math.cos(a),1.225*Math.sin(a)],[3.35,1.085*Math.cos(a),1.085*Math.sin(a)],[3.89,.915*Math.cos(a),.915*Math.sin(a)]],.014,'bronze');if(Math.cos(a)>0)B.cut(p);}
 }else if(key==='gearbox'){
  // 输入端花键接联轴器，输出端用平键，两种轴端各自独立不重叠。
  B.splines(part('input'),.232,.65,20,[0,0,-1.9]);
  // 后壁外侧竖向加强筋，避开两处轴承凸台；侧壁外侧水平加强筋。
  const g=part('housing');for(const x of [-3.0,-.48,2.1,2.95])B.box(g,.1,4.1,.22,'gearpaint',[x,.05,-1.33],.02);
  for(const x of [-3.42,3.42])for(const y of [-1.2,0,1.2])B.box(g,.14,.1,1.9,'gearpaint',[x,y,0],.02);
 }else if(key==='motor'){
  // 端部绕组绑扎带，环绕线圈束截面；接线盒盖四角螺钉。
  const w=part('windings'),tie=new T.TorusGeometry(.155,.012,6,24).rotateX(Math.PI/2);
  for(const sign of [-1,1])B.instances(w,tie,'ceramic',Array.from({length:12},(_,i)=>{const a=(i+.5)*TAU/12;return {p:[1.17*Math.cos(a),1.17*Math.sin(a),sign*1.545],r:[0,0,a]};}));
  const t=part('terminal'),top=245/80*1.862-1.862+.0175,c=118/80*1.862/2-.2;B.bolts(t,[[-c,top+.45*.04,-c],[c,top+.45*.04,-c],[-c,top+.45*.04,c],[c,top+.45*.04,c]],'y',.04).forEach(B.cut);
 }else if(key==='planetary'){
  B.splines(part('sun'),.211,.62,20,[0,0,-1.55]);
  for(const g of part('planets').children.filter(o=>o.isGroup)){B.tube(g,.36,.29,.035,'dark',[0,0,.29]);B.bolts(g,circle(.33,.3075+.49*.028,6),'z',.028);}
  B.bolts(part('carrier'),circle(.36,.815+.49*.03,6),'z',.03);
 }else if(key==='pump'){
  B.splines(part('shaft'),.252,.45,20,[0,0,-2.35]);
 }else if(key==='blower'){
  for(const id of ['rotorA','rotorB']){B.tube(part(id),.30,.18,.10,'chrome',[0,0,1.1]);B.bolts(part(id),circle(.25,1.15+.49*.028,6),'z',.028);}
 }else if(key==='clutch'){
  B.splines(part('hub'),.25,.72,24,[0,0,2.5]);
 }else if(key==='brake'){
  const g=part('caliper');for(const y of [-.6,-.3,0,.3,.6])B.cut(B.box(g,.7,.035,.025,'dark',[1.6,y,1.061],.008));
  B.tube(part('hub'),.64,.5,.035,'dark',[0,0,.4325]);
  for(const y of [-.43,.43])for(const z of [-.55,.55])B.torus(part('pistons'),.306,.012,'rubber',[1.6,y,z]);
 }else if(key==='robot'){
  // TX2为全封闭臂身，不加外露电缆；只保留关节端盖螺钉、夹爪导轨和电机接线盒。
  for(const [id,r,z] of [['shoulder',.34,.34],['elbow',.27,.74]])B.bolts(part(id),circle(r,z+.49*.026,8),'z',.026);
  for(const z of [-.271,.271])B.cylinder(part('gripper'),.025,.64,'chrome',[0,.30,z],'x');
  B.box(part('servo'),.18,.12,.22,'black',[0,.33,-1.1],.02);
 }
}
