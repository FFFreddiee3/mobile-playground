import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
const PI=Math.PI;
const PARTS=[
 [
  "housing",
  "泵体与底脚",
  "CASING",
  "双圆弧腔体连接上下气口，端壁与后部齿轮腔分开，左右底脚为下方排气口留出空间。",
  [
   -1.9,
   -0.5,
   -1
  ]
 ],
 [
  "rotorA",
  "主动转子",
  "LOBED ROTOR",
  "两只双叶转子按固定相位反向旋转，公开曲线构成外形，端面和壳壁之间保留展示间隙。",
  [
   -1.3,
   0.4,
   1.4
  ]
 ],
 [
  "rotorB",
  "从动转子",
  "LOBED ROTOR",
  "两只双叶转子按固定相位反向旋转，公开曲线构成外形，端面和壳壁之间保留展示间隙。",
  [
   1.3,
   0.4,
   1.4
  ]
 ],
 [
  "gears",
  "同步齿轮",
  "TIMING GEARS",
  "齿轮腔内两只24齿钢制齿轮相互啮合，让两根轴等速反向同步。",
  [
   0,
   1.8,
   -1.2
  ]
 ],
 [
  "bearings",
  "轴承组",
  "BEARINGS",
  "两根轴分别由前后轴承支承，外圈装入端壁和端盖承孔。",
  [
   0,
   -1.4,
   1
  ]
 ],
 [
  "cover",
  "前端盖",
  "FRONT COVER",
  "带有两个轴承孔的端盖封闭转子腔，剖切后露出双叶转子。",
  [
   -2.3,
   1.7,
   2.8
  ]
 ],
 [
  "inlet",
  "进气口",
  "INLET",
  "空心矩形接口从上方接到转子腔。",
  [
   0,
   2,
   0
  ]
 ],
 [
  "outlet",
  "排气口",
  "OUTLET",
  "下方排气口与转子腔连通，底脚避开出口。",
  [
   0,
   -1.5,
   0
  ]
 ]
];
export const INFO={source:'https://www.pdblowers.com/wp-content/uploads/2016/11/universal_rai_white_print_22_to_59_vh_62795021_rev_e_1.pdf',sourceName:'ROOTS 45 URAI 厂商尺寸图',basis:'外形参考ROOTS 45 URAI水平转子轴构型和62795021 Rev E厂商尺寸图，外宽346.202毫米对应5.72网页单位。内部双叶曲线、轴距、轴承及齿轮沿用网页结构补全，内部结构与细节不是制造图纸。'};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'blower',PARTS,materials),p=id=>B.parts.find(p=>p.id===id).group;
 const rotors=[p('rotorA'),p('rotorB')],wheels=[named.get('gear.drive'),named.get('gear.driven')];
 // GLB保存真实齿廓，恢复测试与工具使用的原齿轮参数及动态标记。
 for(const w of wheels){w.geometry.userData={teeth:24,pitchRadius:1.07};w.userData.dynamic=true;}
 const gears=p('gears');gears.children.splice(0,gears.children.length,...wheels);
 function update(a,e,mode){for(const q of B.parts)q.group.position.copy(q.base).addScaledVector(q.offset,e);rotors[0].position.x-=1.07;rotors[1].position.x+=1.07;rotors[0].rotation.z=a;rotors[1].rotation.z=-a+PI/2;wheels[0].rotation.z=a;wheels[1].rotation.z=-a+PI/24;}
 return {...B,update,info};
}
