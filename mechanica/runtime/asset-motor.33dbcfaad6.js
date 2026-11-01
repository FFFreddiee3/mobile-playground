import * as T from '#three';
import {makeBuilder,TAU} from '#geometry';
import {instantiateAsset} from '#glb';
// 几何由 blender/motor.py 导出。导条在这里用 TubeGeometry 生成，与网页 path 相同，合并进笼型转子部件。
// 1 个模型单位对应 80/1.862 mm。轴线为 z，轴伸指向 +z，底脚底面 y=-1.862。
const PARTS=[
 ['housing','机座与散热筋','MOTOR FRAME','铸铁机座固定定子并支承端盖。外侧散热筋增加换热面积，底脚用于安装。',[-2,0,0]],
 ['stator','定子铁芯','STATOR CORE','定子铁芯由薄钢片叠成，内侧36个半闭口槽安放绕组。它压装在机座内，不随转子旋转。',[-1.0,1.6,0]],
 ['windings','定子绕组','STATOR WINDINGS','三相绕组的线圈边嵌在定子槽内，端部铜线绕成环形并用绑扎带固定。交流电流流过绕组，形成旋转磁场。',[0,1.7,1.3]],
 ['rotor','转子铁芯','ROTOR CORE','转子铁芯由叠片压装在轴上，28个闭口槽内铸有铝导条。槽沿轴向斜一个转子槽距，以减小转矩波动与噪声。',[0,0,2.8]],
 ['cage','导条与短路环','ROTOR CAGE','铝导条沿斜槽穿过转子铁芯，两端由短路环连成闭合回路。短路环上的叶片在旋转时搅动机内空气。',[1.5,.5,2.8]],
 ['shaft','输出轴','OUTPUT SHAFT','转子固定在输出轴上，轴伸通过平键与外部负载连接。轴承安装在轴的两端。',[0,-.6,3.8]],
 ['endbells','前后端盖','END SHIELDS','端盖与机座连接，并为轴承提供安装孔。放射状加强筋增强端盖的支承结构。',[0,.5,2.3]],
 ['bearings','轴承','BEARINGS','轴承的内圈随轴转动，外圈由端盖定位。拆解时可独立观察滚动体与滚道。',[0,-1.6,1.2]],
 ['fan','冷却风扇','COOLING FAN','风扇安装在轴的尾端，随轴一起转动，引导空气沿机座外侧流动。',[0,0,-2.5]],
 ['fanCover','风扇护罩','FAN COVER','护罩围住冷却风扇，四处连接固定在后端盖周边。后部格栅接到内外圆环，开口供空气通过。剖切模式下移去罩体。',[0,0,-3.3]],
 ['terminal','接线盒','TERMINAL BOX','接线端子位于机座顶部的接线盒内。盒盖和电缆密封接头保护接线部位。',[0,2.2,-.5]]
];
export const INFO={
 basis:'外形按 ABB 2013 年过程工业电机样本（9AKK105944 EN 10-2013）第 55 页机座 80、底脚安装尺寸图折算，包括中心高 80 mm、底脚孔距 125 mm 与 100 mm、底脚宽 154 mm、轴伸直径 19 mm、轴伸长度 40 mm、全长 321 mm。定子 36 槽、转子 28 槽沿用网页原有布置。槽形、绕组端部、端盖内部、散热筋细节、风罩格栅及电缆格兰头属于网页造型补全，不是制造图纸。',
 source:'https://library.e.abb.com/public/872dce67fcf44f8cae0b44e15675c125/Catalog_Process_performance_acc_to_EU_MEPS_9AKK105944_EN%2010_2013_LOW.pdf',
 sourceName:'ABB 过程工业电机样本 2013'
};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'motor',PARTS,materials),part=id=>B.parts.find(p=>p.id===id).group;
 const rotor=part('rotor'),cage=part('cage'),shaft=part('shaft'),fan=part('fan');
 const stack=1.40,bars=28,skew=TAU/bars,barAt=.90;
 for(let i=0;i<bars;i++){const c=i*TAU/bars,pts=[];
  for(let j=0;j<=8;j++){const z=-stack-.1+j*(2*stack+.2)/8,a=c+skew*z/(2*stack);pts.push([barAt*Math.cos(a),barAt*Math.sin(a),z]);}
  B.path(cage,pts,.04,'alloy');}
 function setOffsets(e){for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);}
 function update(a,e){setOffsets(e);rotor.rotation.z=cage.rotation.z=shaft.rotation.z=fan.rotation.z=a;fan.position.z-=2.27;}
 return {...B,update,info};
}
