import {makeBuilder} from '#geometry';
import {GEARBOX,gearAngles} from '#motion';
import {instantiateAsset} from '#glb';
const M=GEARBOX.module,x1=-GEARBOX.outputTeeth*M/2,x2=GEARBOX.inputTeeth*M/2;
const PARTS=[
 ['housing','箱体','GEARBOX HOUSING','箱体为轴承和传动轴提供安装位置，底部安装座支承整台齿轮箱。',[0,-1.5,-1]],
 ['cover','前盖与紧固件','FRONT COVER','前盖封闭传动腔，两处轴承孔供轴穿过。周边螺栓把前盖固定在箱体上，剖切模式中移去前盖。',[0,.1,2.6]],
 ['input','输入轴','INPUT SHAFT','输入轴与小齿轮同轴连接。轴上的台阶用于定位齿轮和轴承，后端花键接入动力。',[-1.2,0,-2]],
 ['pinion','小齿轮','DRIVING GEAR','示例小齿轮有 20 个齿。它与 40 齿的大齿轮外啮合，两个齿轮的转动方向相反。',[-1.2,.3,1]],
 ['driven','大齿轮','DRIVEN GEAR','示例大齿轮有 40 个齿。小齿轮转两圈时，大齿轮反向转一圈。腹板减重孔和轮毂随轮缘一起转动。',[1.4,.3,1.2]],
 ['output','输出轴','OUTPUT SHAFT','输出轴与大齿轮固定连接。相对于输入轴，示例中的输出轴转得更慢，转向相反。',[1.4,0,2.3]],
 ['bearings','滚动轴承','ROLLING BEARINGS','每根轴由前后两处轴承支承。外圈装在箱体与前盖的轴承孔内，滚动体在内外圈之间运动。',[0,1.8,1.4]],
 ['seals','轴封与端盖','SHAFT SEALS','轴封的内孔与各自轴径对应，外露键位于端盖外侧。端盖对密封件进行轴向定位。',[0,-1,3]],
 ['plugs','加油与放油螺塞','OIL PLUGS','顶部螺塞提供加油入口，前盖下部螺塞用于排出润滑油。页面省略油液，以便看清传动部件。',[0,2.0,0]]
];
export const INFO={
 basis:'外形按 ZDY80 单级圆柱齿轮减速器外形图，中心距 80 mm 对应模型中心距 2.85。传动比段 1.25 至 2.8 含本模型速比 2。外露输入轴直径28 mm、长42 mm，输出轴直径32 mm、长58 mm，底座235×150 mm、四个直径12 mm安装孔按表值。水平剖分法兰、双圆拱、吊耳和轴承座加强筋按图与厂商照片补全，局部厚度、轴承内部、内腔与齿侧间隙属于网页造型补全，不是制造图纸。',
 source:'https://www.jlcfa.com/mcbook/16039-2.htm',
 sourceName:'ZDY80 外形尺寸图'
};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'gearbox',PARTS,materials);
 const part=id=>B.parts.find(p=>p.id===id).group;
 const input=part('input'),pinion=part('pinion'),driven=part('driven'),output=part('output');
 // 对照厂商ZDY产品照片使用蓝色漆面，只改本模型的材质副本。
 B.root.traverse(o=>{if(o.isMesh&&o.userData.materialKey==='gearpaint'){o.material.color.setHex(0x0878bc);o.material.metalness=.18;o.material.roughness=.42;}});
 const first=(g,o)=>{g.children.splice(g.children.indexOf(o),1);g.children.unshift(o);};
 const pinTeeth=named.get('pinion-teeth'),drvTeeth=named.get('driven-teeth');
 pinTeeth.geometry.userData={teeth:20,pitchRadius:GEARBOX.inputTeeth*M/2};
 drvTeeth.geometry.userData={teeth:40,pitchRadius:GEARBOX.outputTeeth*M/2};
 first(pinion,pinTeeth);first(driven,drvTeeth);
 function update(a,e){
  for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);
  input.position.x+=x1;pinion.position.x+=x1;driven.position.x+=x2;output.position.x+=x2;
  const angles=gearAngles(a);
  input.rotation.z=pinion.rotation.z=angles.input;output.rotation.z=driven.rotation.z=angles.output;
 }
 return {...B,update,info};
}
