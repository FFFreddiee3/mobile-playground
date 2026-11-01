import * as T from '#three';
import {subgroup} from '#vehicle-kit';
const TAU=Math.PI*2;
// 闭合履带路径，直线与圆弧处位置和切线均连续。
export function trackPose(distance,half=1.65,r=.45){
 const straight=2*half,arc=Math.PI*r,total=2*straight+2*arc;
 let s=((distance%total)+total)%total;
 if(s<straight)return {x:-half+s,y:r,angle:0};
 s-=straight;if(s<arc){const t=Math.PI/2-s/r;return{x:half+r*Math.cos(t),y:r*Math.sin(t),angle:t-Math.PI/2};}
 s-=arc;if(s<straight)return{x:half-s,y:-r,angle:-Math.PI};
 s-=straight;const t=-Math.PI/2-s/r;return{x:-half+r*Math.cos(t),y:r*Math.sin(t),angle:t-Math.PI/2};
}
export function trackAssembly(B,parent,z,half=1.65,r=.45,width=.56,n=46,mat='steel'){
 const shoes=[],length=4*half+TAU*r,pitch=length/n;
 for(let i=0;i<n;i++){
  const g=new T.Bone();g.userData.part=parent.userData.part;parent.add(g);g.name='track-shoe';
  B.box(g,pitch*.91,.055,width,mat,[0,0,0],.008);
  B.box(g,.024,.055,width*.95,mat,[0,.04,0],.002);
  B.instances(g,new T.CylinderGeometry(.020,.020,width*.98,8).rotateX(Math.PI/2),mat,[{p:[pitch*.42,0,0]}]);
  shoes.push(g);
 }
 function update(distance){shoes.forEach((g,i)=>{const p=trackPose(i*pitch+distance,half,r);g.position.set(p.x,p.y+r+.08,z);g.rotation.z=p.angle;});}
 const batch={parent,bones:shoes,half,r,z};(B.rigidBatches??=[]).push(batch);
 update(0);return{shoes,update,pitch,length,r,half,z,batch};
}
// 单个杆件沿局部+Y构造，运动只更新父节点，网格合并后仍保留连接。
export function movingRod(B,parent,length,r=.04,mat='chrome'){
 const g=subgroup(parent);B.cylinder(g,r,length,mat,[0,length/2,0]);
 const v=new T.Vector3(),up=new T.Vector3(0,1,0);
 function set(a,b){g.position.set(...a);v.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);g.quaternion.setFromUnitVectors(up,v.normalize());}
 return{group:g,length,set};
}
export function hydraulicCylinder(B,parent,barrelLength=.72,r=.075){
 const g=subgroup(parent),ram=subgroup(g),tip=subgroup(g);
 B.cylinder(g,r,barrelLength,'orangepaint',[0,barrelLength/2,0]);
 for(const y of [.06,barrelLength-.035])B.tube(g,r*1.13,r*.74,.055,'dark',[0,y,0],'y');
 B.cylinder(g,r*.65,r*2.2,'steel',[0,0,0],'z');B.tube(g,r*.77,r*.35,r*2.3,'chrome',[0,0,0],'z');
 B.cylinder(ram,r*.47,1,'chrome',[0,.5,0]);ram.position.y=barrelLength-.04;
 B.cylinder(tip,r*.66,r*2.2,'steel',[0,0,0],'z');B.tube(tip,r*.77,r*.35,r*2.3,'chrome',[0,0,0],'z');
 B.path(g,[[r+.02,.10,0],[r+.06,.15,0],[r+.06,barrelLength-.15,0],[r+.02,barrelLength-.10,0]],.012,'black');
 const v=new T.Vector3(),up=new T.Vector3(0,1,0);
 function set(a,b){g.position.set(...a);v.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=v.length();if(length<barrelLength)throw new RangeError('油缸安装点短于缸筒。');g.quaternion.setFromUnitVectors(up,v.normalize());ram.scale.y=length-barrelLength+.04;tip.position.y=length;}
 return{group:g,ram,tip,barrelLength,set};
}
export function circleJoint(a,b,ra,rb){
 const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);
 if(d>ra+rb+1e-10||d<Math.abs(ra-rb)-1e-10||d<1e-10)throw new RangeError('连杆长度不能形成闭合机构。');
 const t=(ra*ra-rb*rb+d*d)/(2*d),h=Math.sqrt(Math.max(0,ra*ra-t*t));
 return[a[0]+t*dx/d-h*dy/d,a[1]+t*dy/d+h*dx/d];
}
