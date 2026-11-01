import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {clutchPose} from '#extras';

const PARTS=[
 ['drum','外鼓','INPUT DRUM','外鼓的轴向槽容纳摩擦片外耳，带动摩擦片并允许片组沿槽滑移。',[0,0,-1.7]],
 ['hub','内毂与输出轴','OUTPUT HUB','钢片内齿与内毂齿槽对应，后部支承盘和六根固定柱体随输出轴转动。',[0,0,2.5]],
 ['friction','摩擦片组','FRICTION PLATES','五片带外耳的钢制骨架两面分布摩擦面，外耳装在外鼓槽内。',[-1.3,.2,1.5]],
 ['steel','钢片组','STEEL PLATES','五片内齿钢片与摩擦片交替排列，内齿对应输出毂。',[1.3,.2,2]],
 ['pressure','压盘','PRESSURE PLATE','压盘外环接触片组，前侧带孔连接臂跨过内毂，沿固定柱体抬起和回压。',[0,1,3]],
 ['springs','压紧弹簧','CLAMP SPRINGS','六根弹簧夹在移动压盘和固定端座之间，压盘抬起时弹簧压缩。',[0,1.5,3.4]],
 ['release','分离轴承与推环','RELEASE BEARING','分离轴承接触压盘中央套筒，推环沿输出轴移动并抬起压盘。',[0,-.5,4]],
 ['cover','外罩','COVER','固定外罩、后端壁与安装边包围旋转片组，后端轴承支承输出轴，剖切后露出内部连接。',[-2,1,0]]
];
export const INFO={
 source:'https://www.press.bmwgroup.com/africa-dom-easteurope/article/attachment/T0133019EN/200253',
 sourceName:'BMW R 1200 GS 官方外径及官方照片',
 basis:'外径依据BMW R1200GS 10/2012官方资料第14页的147毫米。D级外轮廓按官方照片推断，轴向尺寸、台阶、轴端和独立外罩为教学补全。背面齿圈依据官方图P90104996可见的传动齿轮补全，齿数、沉孔、定位柱和外罩分缝及螺栓布置为教学推断。原产品为八片摩擦片并有防跳机构，网页保留五片摩擦片、五片钢片、六根弹簧及通用接合分离演示，不实现该产品的液压与防跳控制。内部结构、紧固件与细节属于网页造型补全，不是制造图纸。'
};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'clutch',PARTS,materials);
 const part=id=>B.parts.find(p=>p.id===id).group;
 const drum=part('drum'),hub=part('hub'),friction=part('friction'),steel=part('steel'),pressure=part('pressure'),springs=part('springs'),release=part('release');
 const frictionLayers=Array.from({length:5},(_,i)=>named.get('clutch-friction-layer-'+i));
 const steelLayers=Array.from({length:5},(_,i)=>named.get('clutch-steel-layer-'+i));
 const coils=Array.from({length:6},(_,i)=>named.get('clutch-spring-'+i));
 // 所有沿Z的回转体恢复建模时的直角，避免四元数舍入使片组支承端面倾斜。
 for(const o of named.values())if(o.isMesh&&Math.abs(o.rotation.x-Math.PI/2)<1e-6&&Math.abs(o.rotation.y)+Math.abs(o.rotation.z)<1e-8)o.rotation.set(Math.PI/2,0,0);
 // 轴承接触面使用原运动机构的精确轴向基准，避免绝对坐标单精度舍入产生假穿插。
 const bearing=named.get('release.bearing');
 bearing.position.z=1.68;
 for(const o of [...bearing.children]){o.position.add(bearing.position);release.add(o);}
 bearing.removeFromParent();
 // GLB保存单精度四元数，恢复导柱周围弹簧的精确XYZ角及既有子组顺序。
 for(const g of coils)g.rotation.set(Math.PI/2,0,0);
 for(const [g,list]of [[friction,frictionLayers],[steel,steelLayers],[springs,coils]]){
  g.children.sort((a,b)=>list.indexOf(a)-list.indexOf(b));
 }
 function update(a,e,mode){
  for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);
  const p=clutchPose(a);
  drum.rotation.z=friction.rotation.z=p.input;
  for(const g of [hub,steel,pressure,springs])g.rotation.z=p.output;
  for(let i=0;i<5;i++){
   frictionLayers[i].position.z=-.675+i*.17+(2*i+1)*p.gap;
   steelLayers[i].position.z=-.59+i*.17+(2*i+2)*p.gap;
  }
  pressure.position.z+=p.lift;
  release.position.z+=p.lift;
  for(const g of coils){g.position.z=.49+p.lift;g.scale.y=(.65-p.lift)/.65;}
 }
 return {...B,update,info};
}
