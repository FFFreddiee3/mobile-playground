import * as T from '#three';

// 只调整阴影相机，不改变主光源方向、贴图分辨率或模型几何。
export class ShadowFitter {
 constructor(light){
  this.light=light;this.direction=new T.Vector3().subVectors(light.position,light.target.position).normalize();
  if(this.direction.y<=1e-6)throw new RangeError('阴影主光源必须从上方向地面照射。');
  const camera=light.shadow.camera;if(Math.abs(camera.up.dot(this.direction))>.999)camera.up.set(0,0,1);
  this.right=new T.Vector3().crossVectors(camera.up,this.direction).normalize();this.up=new T.Vector3().crossVectors(this.direction,this.right).normalize();
  this.range=new T.Box3();this.bounds=new T.Box3();this.box=new T.Box3();this.detailBox=new T.Box3();this.point=new T.Vector3();this.projected=new T.Vector3();
  this.summary={width:0,height:0,depth:0,texelX:0,texelY:0};
 }
 reset(){this.range.makeEmpty();}
 measure(root,detail=0){
  this.bounds.makeEmpty();
  root.traverseVisible(mesh=>{
   if(!mesh.isMesh||!mesh.castShadow||mesh.userData.effect)return;
   const g=mesh.geometry;if(!g.boundingBox)g.computeBoundingBox();this.box.copy(g.userData.baseBounds||g.boundingBox);
   if(detail>0&&g.userData.detailBounds){this.detailBox.copy(this.box);this.detailBox.min.lerp(g.userData.detailBounds.min,detail);this.detailBox.max.lerp(g.userData.detailBounds.max,detail);this.box.union(this.detailBox);}
   this.bounds.union(this.box.applyMatrix4(mesh.matrixWorld));
  });return this.bounds;
 }
 fitModel(root,detail,floorY,seed){
  this.measure(root,detail);if(this.range.isEmpty()&&seed)this.bounds.union(seed);return this.fit(this.bounds,floorY);
 }
 fit(bounds,floorY){
  if(bounds.isEmpty()||![...bounds.min.toArray(),...bounds.max.toArray(),floorY].every(Number.isFinite))throw new RangeError('阴影覆盖范围必须有限且非空。');
  const {light,direction,right,up,point,projected,range}=this;
  for(let i=0;i<8;i++){
   point.set(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z);
   const x=point.dot(right),y=point.dot(up),z=point.dot(direction);projected.set(x,y,z);range.expandByPoint(projected);
   if(point.y>floorY){projected.z=z-(point.y-floorY)/direction.y;range.expandByPoint(projected);}
  }
  const nx=light.shadow.mapSize.x,ny=light.shadow.mapSize.y;if(nx<=10||ny<=10)throw new RangeError('阴影贴图尺寸不足以保留过滤边缘。');
  // 四个过滤边缘像素，另留一个像素容纳中心取整，避免裁掉边缘投影。
  const padding=Math.max(light.shadow.normalBias*2,1e-4),width=(Math.max(range.max.x-range.min.x,1e-3)+2*padding)/(1-10/nx),height=(Math.max(range.max.y-range.min.y,1e-3)+2*padding)/(1-10/ny);
  const tx=width/nx,ty=height/ny,cx=Math.round((range.min.x+range.max.x)/2/tx)*tx,cy=Math.round((range.min.y+range.max.y)/2/ty)*ty;
  const depth=range.max.z-range.min.z,depthPad=Math.max(padding,depth*1e-4);
  light.position.copy(right).multiplyScalar(cx).addScaledVector(up,cy).addScaledVector(direction,range.max.z+2*depthPad);
  light.target.position.copy(right).multiplyScalar(cx).addScaledVector(up,cy).addScaledVector(direction,(range.min.z+range.max.z)/2);
  light.updateMatrixWorld(true);light.target.updateMatrixWorld(true);
  const camera=light.shadow.camera;Object.assign(camera,{left:-width/2,right:width/2,bottom:-height/2,top:height/2,near:depthPad,far:depth+3*depthPad});camera.updateProjectionMatrix();
  Object.assign(this.summary,{width,height,depth:camera.far-camera.near,texelX:tx,texelY:ty});return this.summary;
 }
}
