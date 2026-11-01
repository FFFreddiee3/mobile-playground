import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
// 几何由 blender/pump.py 建模导出为 models/pump.glb。外形按 KSB Etanorm 080-065-160 总图，内部流道、叶轮和密封是网页结构补全。
const PARTS = [
 ['volute', '蜗壳与底座', 'VOLUTE', '螺旋侧壁与后壁围成泵腔，流道连续连接上方排出口。', [-1.8, 0, -1]],
 ['impeller', '闭式叶轮', 'IMPELLER', '后盖板、七片弯曲叶片和带进口颈的前盖板组成闭式叶轮，剖切时移去前盖板露出叶片。', [0, 0, 1.7]],
 ['inlet', '吸入口与前盖', 'SUCTION INLET', '液体沿轴向经过轮毂周围进入叶轮。前盖沿蜗壳轮廓封闭泵腔，剖切后露出叶片。', [-2, 1.4, 2.8]],
 ['outlet', '排出口', 'DISCHARGE', '空心过渡段把蜗壳出口接到圆形管口，法兰用于连接下游管道。', [1.8, 1.2, 0]],
 ['shaft', '泵轴与联轴器', 'SHAFT', '轴把外部驱动转矩传给叶轮。', [0, 0, -2]],
 ['seal', '机械密封', 'SEAL', '固定密封环装入后壁，转动环随轴旋转。弹簧由后侧套环支承，两环端面相接。', [1.8, -.4, 0]],
 ['bearings', '轴承与轴承座', 'BEARING SUPPORT', '轴承支承泵轴，座体连接到加长底座。', [0, -1, -1.5]],
 ['wear', '叶轮口环', 'WEAR RING', '口环位于叶轮入口与前盖之间，内孔避开中央轮毂。', [0, 1.6, 2.1]],
];
export const INFO = {
 basis: '外形轮廓和比例按 KSB Etanorm 总布置图 1311.391/03-EN 第 6 页 Fig. 1 的 080-065-160 裸轴泵：径向剖分蜗壳、端吸、顶部排出、轴承托架。中心高 h1=160 mm、向上外形 h2=200 mm，对应代码造型包围盒高度 5.883 个模型单位。叶轮为七片平面弯曲叶片的闭式叶轮，机械密封、流道和内部尺寸是网页结构补全，不是制造图纸，也不对应实机加工尺寸或流体性能。',
 source: 'https://boosterkar.com/catalog/installation-pump-etanorm-ksb.pdf',
 sourceName: 'KSB Etanorm 总布置图 1311.391/03-EN',
};
export function build(materials, info) {
 const B = makeBuilder(materials);
 const named = instantiateAsset(B, 'pump', PARTS, materials);
 const group = id => B.parts.find(p => p.id === id).group;
 const impeller = group('impeller'), shaft = group('shaft'), rotor = named.get('seal-rotor');
 function update(a, e) {
  for (const p of B.parts) p.group.position.copy(p.base).addScaledVector(p.offset, e);
  impeller.rotation.z = shaft.rotation.z = rotor.rotation.z = a;
 }
 return {...B, update, info};
}
