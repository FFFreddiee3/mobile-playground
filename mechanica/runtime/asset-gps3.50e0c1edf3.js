import {makeBuilder} from '#geometry';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
// 几何由 blender/gps3.py 导出。1 个模型单位 = 1161.2903 mm，翼展 15 m 对齐代码造型的 x 向全长。
// 外轮廓按 gps.gov 第 8 页英寸尺寸。内部设备、天线单元与皱褶是网页造型补全。
const PARTS=[
 ['frame','平台承力框架','SPACECRAFT FRAME','中心承力筒、上下层板和四角立柱组成主承力结构，外板与设备都固定在这一框架上。',[0,-1.3,0]],
 ['covers','东西侧多层隔热毯','THERMAL BLANKETS','两侧隔热毯贴合层板和立柱外缘，压条分隔各块包覆，前侧剖开后露出内部设备。',[0,.6,-1.7]],
 ['electronics','电子设备箱与线束','AVIONICS','设备箱贴装在散热板内侧，电路板和线束沿箱体朝内一侧布置。',[-1.4,-.5,-.8]],
 ['batteries','蓄电池组与配电','BATTERY PACKS','两组蓄电池贴装在散热板下半部内侧，单体顶部由连接条串接。',[1.4,-1.2,0]],
 ['radiator','南北散热面与热管','RADIATOR PANELS','两侧白色散热板外表面排列光学反射片，内侧水平热管把设备热量传到板面。',[-1.7,.7,0]],
 ['attitude','反作用轮组','REACTION WHEELS','三个倾斜安装的反作用轮通过立座固定在底层板上，转子在罩内转动。',[0,-.8,1.5]],
 ['adapter','底部对接环与包带','LAUNCH ADAPTER','底层板下方的对接环与中心承力筒同轴，包带和螺栓把卫星固定在运载器接口上。',[0,-1.9,0]],
 ['solar0','左侧太阳翼','SOLAR ARRAY','根部驱动座固定在散热板中央，三段电池板由铰链串接，整翼绕根部转轴跟随太阳方向转动。',[-2,.4,0]],
 ['solar1','右侧太阳翼','SOLAR ARRAY','根部驱动座固定在散热板中央，三段电池板由铰链串接，整翼绕根部转轴跟随太阳方向转动。',[2,.4,0]],
 ['navigation','对地L波段天线阵','L-BAND ANTENNA','对地面板上排布螺旋天线单元，白色天线罩下方为金属底座。',[0,1.8,.3]],
 ['clocks','原子钟与导航信号设备','ATOMIC CLOCKS','三台时间基准设备吊装在顶层板下方，导航信号单元与其相邻。',[1.6,.6,-.9]],
 ['feeds','测控天线与支杆','TT&C ANTENNAS','测控天线经细支杆立在顶层板角部，与对地天线阵分开布置。',[-1.5,1.0,1.2]]
];
export const INFO={
 source:'https://archive.gps.gov/multimedia/presentations/2018/11/ICG/alexander.pdf',
 sourceName:'GPS.gov ICG-13 尺寸页',
 basis:'外形按美国GPS计划ICG-13讲稿第8页的97×70×134英寸机体，以及DLR论文表1的15米翼展。沿太阳翼的机体厚度取70英寸，横宽取97英寸，对地高度取134英寸。翼弦由DLR表3的28.2平方米太阳翼面积与翼展推算。对地面的L波段螺旋阵、星间链路和测控喇叭，两侧金色隔热与散热面，以及太阳翼驱动臂，位置来自洛克希德·马丁在Inside GNSS图4的标注和DLR图4的比例模型照片。单元尺寸、臂长和喷管没有公布数字，是按照片相对位置做的网页造型，不是制造图纸，也不提供导航或射频设计。'
};
export function build(materials, info){
 const B=makeBuilder(materials);
 const named=instantiateAsset(B,'gps3',PARTS,materials);
 B.root.traverse(o=>{
  if(o.name.startsWith('array-panel'))o.name='array-panel';
  if(o.name.startsWith('mli-blanket'))o.name='mli-blanket';
 });
 const wheels=[0,1,2].map(i=>{const o=named.get('attitude-wheel.'+i);if(!o)throw new Error('缺少反作用轮 '+i);return o;});
 const trackers=[0,1].map(i=>{const o=named.get('array-tracker.'+i);if(!o)throw new Error('缺少太阳翼转轴 '+i);return o;});
 B.root.traverse(o=>{if(!o.isMesh)return;const k=o.userData.materialKey,m=o.material;
  if(k==='solar'){m.color.setHex(0x0f2442);m.metalness=.35;m.roughness=.34;m.clearcoat=.3;m.envMapIntensity=.7;}
  if(k==='goldfoil'){m.color.setHex(0xc7a458);m.metalness=.80;m.roughness=.40;}
  if(k==='foil'){m.color.setHex(0xc5c9c9);m.metalness=.86;m.roughness=.36;}
 });
 function update(a,e){
  offsets(B,e);
  wheels.forEach((g,i)=>g.rotation.y=a*(.9+i*.25));
  trackers.forEach((g,i)=>g.rotation.x=(i?-1:1)*.30*Math.sin(a*.12));
 }
 return {...B,update,info};
}
