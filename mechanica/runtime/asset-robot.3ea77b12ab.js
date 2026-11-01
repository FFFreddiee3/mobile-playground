import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {robotPose, ROBOT} from '#extras';
// 几何由 blender/robot.py 导出。关节长度与 src/extras.mjs 的 ROBOT、robotPose 相同。
const PARTS = [
 ['base', '固定底座', 'FIXED BASE', '底座固定在工作台上，侧面设置电缆出口，支承整条机械臂。', [0, -1, 0]],
 ['turret', '第一轴回转座', 'AXIS 1', '回转座绕竖直第一轴转动，侧面支座承装第二轴。', [-1.5, .3, 0]],
 ['shoulder', '第二轴肩部关节', 'AXIS 2', '肩部轮毂贴在回转座支座内侧，带动上臂摆动。', [-1.7, .8, .5]],
 ['upper', '上臂', 'UPPER ARM', '全封闭上臂连接第二轴与第三轴，内部走线不外露。', [-1, 1, 0]],
 ['elbow', '第三轴肘关节', 'AXIS 3', '肘部轮毂贴在上臂外侧，侧臂和轴承座把前臂接到第三轴。', [1.5, 1.1, .4]],
 ['forearm', '第四轴前臂', 'AXIS 4', '前臂在肘部轴承座内绕自身轴线转动，末端双耳叉承装第五轴。', [1.8, 1.5, 0]],
 ['wrist', '第五轴手腕', 'AXIS 5', '手腕轮毂夹在前臂双耳之间摆动，腕体伸向第六轴法兰。', [2.2, 1, .5]],
 ['flange', '第六轴末端法兰', 'AXIS 6', '末端法兰绕工具轴旋转，用于安装执行器。', [2.5, .5, 1]],
 ['gripper', '平行夹爪', 'GRIPPER', '夹爪沿两侧导轨开合，示意末端抓取。', [2.8, .3, 1.5]],
 ['servo', '肩部伺服电机', 'SERVO MOTOR', '第二轴电机装在回转座支座外侧，与肩关节同轴驱动上臂。', [-2, 1, -1]]
];
export const INFO = {
 basis: '轮廓取自 Stäubli TX2-90 产品数据表（2025-07）第 2 页 TX2-90 标准臂的侧视与正视。比例以上臂 B=425 mm 对应代码上臂 2.1，第一轴到第二轴偏距 A=50 mm 对应 0.247，地面到第二轴按图中 478 mm。数据表第一轴到第六轴 1000 mm，第五轴到法兰面按 100 mm 换算为 0.49。前臂沿用测试锁定长度 1.8，比按 C=425 mm 换算的 2.1 短约 14%。轮廓重合度按数据表零位比对：偏航、肩、肘、腕转角为 0，两节臂竖直、腕部朝上。网页默认演示仍是角度 0 的折臂姿态，动画公式不变。漆色对照数据表封面照片，约为 #e8b000。肩部壳体、肘部侧向关节、腕部与法兰按数据表外轮廓布置，六个轴的电机、减速器、滚动轴承、中空走线、壳体壁厚、夹爪和螺钉为网页造型补全，不是厂商内部制造图。演示转角落在数据表范围 A±180°、B +147.5°/−130°、C±145°、D±270°、E +140°/−115°、F±270° 内。本模型不是制造图纸。',
 source: 'https://www.staubli.com/content/dam/robotics/products/robots/tx2/TX2-90-6-axis-product-data-sheet-EN.pdf',
 sourceName: 'Stäubli TX2-90 数据表'
};
export function build(materials, info) {
 const B = makeBuilder(materials);
 instantiateAsset(B, 'robot', PARTS, materials);
 const part = id => B.parts.find(p => p.id === id).group;
 const turret = part('turret'), shoulder = part('shoulder'), upper = part('upper'), elbow = part('elbow');
 const forearm = part('forearm'), wrist = part('wrist'), flange = part('flange'), gripper = part('gripper'), servo = part('servo');
 const fingers = [...gripper.children].filter(o => o.isGroup).sort((a, b) => a.name.localeCompare(b.name));
 for (const id of ['base', 'turret', 'shoulder', 'upper', 'elbow', 'forearm']) part(id).traverse(o => {
  if (!o.isMesh || o.userData.materialKey !== 'orangepaint') return;
  o.material.color.setHex(0xe8b000); o.material.roughness = .38; o.material.metalness = .08;
 });
 const R = ROBOT;
 const qYaw = new T.Quaternion(), qS = new T.Quaternion(), qE = new T.Quaternion(), qW = new T.Quaternion(), qTool = new T.Quaternion(), qFore = new T.Quaternion();
 const Y = new T.Vector3(0, 1, 0), Z = new T.Vector3(0, 0, 1);
 const sPos = new T.Vector3(), ePos = new T.Vector3(), wPos = new T.Vector3(), fPos = new T.Vector3(), gPos = new T.Vector3();
 function place(g, pos, q) { g.position.add(pos); g.quaternion.copy(q); }
 function applyKinematics(yaw, shoulderAngle, elbowAngle, twist, pitch, tool) {
  qYaw.setFromAxisAngle(Y, yaw);
  qS.setFromAxisAngle(Z, shoulderAngle).premultiply(qYaw);
  qE.setFromAxisAngle(Z, elbowAngle).premultiply(qS);
  qFore.setFromAxisAngle(Y, twist).premultiply(qE);
  qW.setFromAxisAngle(Z, pitch).premultiply(qFore);
  qTool.setFromAxisAngle(Y, tool).premultiply(qW);
  sPos.set(R.shoulderOffset, R.shoulderHeight, 0).applyQuaternion(qYaw);
  ePos.set(0, R.upper, 0).applyQuaternion(qS).add(sPos);
  wPos.set(0, R.forearm, 0).applyQuaternion(qFore).add(ePos);
  fPos.set(0, R.wristToFlange, 0).applyQuaternion(qW).add(wPos);
  gPos.set(0, R.flangeLength, 0).applyQuaternion(qTool).add(fPos);
  turret.quaternion.copy(qYaw);
  place(shoulder, sPos, qS);
  place(upper, sPos, qS);
  place(elbow, ePos, qE);
  place(forearm, ePos, qFore);
  place(wrist, wPos, qW);
  place(flange, fPos, qTool);
  place(gripper, gPos, qTool);
  place(servo, sPos, qYaw);
 }
 function update(a, e) {
  for (const p of B.parts) p.group.position.copy(p.base).addScaledVector(p.offset, e);
  const p = robotPose(a);
  applyKinematics(p.yaw, p.shoulder, p.elbow, p.wrist, -.7 + p.wrist, .5 * Math.sin(a * .7));
  fingers.forEach((g, i) => { g.position.x = (i ? 1 : -1) * (.18 + .10 * (1 + Math.sin(a)) * .5); });
 }
 // 数据表尺寸图的零位：两节臂竖直，腕部朝上。只改部件组的位置与转角。
 function refPose() {
  for (const p of B.parts) p.group.position.copy(p.base);
  applyKinematics(0, 0, 0, 0, 0, 0);
 }
 return {...B, update, refPose, info};
}
