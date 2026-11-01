import * as T from '#three';
import {TAU} from '#geometry';
import {rod} from '#vehicle-kit';
// 电池片、隔热包覆和舱段共用构造。尺寸为网页局部单位。
export function solarPanel(B,g,w,h,cols=8,rows=14){
 B.box(g,w,.028,h,'dark',[0,0,0],.006);
 const cw=(w-.06)/cols,ch=(h-.06)/rows,cells=[],contacts=[];
 for(let x=0;x<cols;x++)for(let z=0;z<rows;z++){
  const px=-w/2+.03+(x+.5)*cw,pz=-h/2+.03+(z+.5)*ch;
  cells.push({p:[px,.022,pz]});contacts.push({p:[px,.028,pz]});
 }
 B.instances(g,new T.BoxGeometry(cw*.94,.010,ch*.96),'solar',cells);
 B.instances(g,new T.BoxGeometry(.003,.003,ch*.94),'bronze',contacts);
 for(const x of [-w/2,w/2])B.box(g,.018,.045,h,'titanium',[x,0,0],0);
 for(const z of [-h/2,h/2])B.box(g,w,.045,.018,'titanium',[0,0,z],0);
}
export function blanketBox(B,g,w,h,d,pos=[0,0,0],mat='foil'){
 B.box(g,w,h,d,mat,pos,.035);
 for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])B.box(g,.014,h,.014,'bronze',[pos[0]+x,pos[1],pos[2]+z],0);
 for(const y of [-h/2,h/2])for(const z of [-d/2,d/2])B.box(g,w,.012,.012,'bronze',[pos[0],pos[1]+y,pos[2]+z],0);
}
export function moduleShell(B,g,r,len,pos=[0,0,0],axis='z'){
 B.tube(g,r,r-.025,len,'airframe',pos,axis,Math.PI,Math.PI);
 B.cut(B.tube(g,r,r-.025,len,'airframe',pos,axis,0,Math.PI));
 const map=(u,v,t)=>axis==='x'?[pos[0]+t,pos[1]+u,pos[2]+v]:[pos[0]+u,pos[1]+v,pos[2]+t];
 for(const t of [-len/2,len/2]){
  B.cylinder(g,r*.94,.05,'porcelain',map(0,0,t),axis);
  B.tube(g,r*.45,r*.34,.09,'chrome',map(0,0,t*1.03),axis);
  B.cylinder(g,r*.34,.025,'dark',map(0,0,t*1.05),axis);
 }
 for(let j=0;j<=6;j++)B.torus(g,r+.004,.012,'chrome',map(0,0,-len/2+j*len/6),axis);
 for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  const u=(r+.05)*Math.cos(a),v=(r+.05)*Math.sin(a);
  rod(B,g,map(u,v,-len*.35),map(u,v,len*.35),.012,'bronze');
  for(const t of [-len*.35,0,len*.35])rod(B,g,map(u*.93,v*.93,t),map(u,v,t),.014,'alloy');
 }
 for(let i=0;i<4;i++)B.box(g,r*.45,r*.36,.06,'navy',map(0,0,-len*.30+i*len*.2),.01);
}
export function dish(B,g,r,pos=[0,0,0]){
 const bowl=B.lathe(g,[[0,.10],[r*.25,.11],[r*.50,.15],[r*.75,.22],[r,.32],[r,.30],[r*.75,.20],[r*.50,.13],[0,.08]],'airframe',pos,'z');
 bowl.material.side=T.DoubleSide;
 for(let i=0;i<3;i++){const a=i*TAU/3;rod(B,g,[pos[0]+r*.85*Math.cos(a),pos[1]+r*.85*Math.sin(a),pos[2]+.27],[pos[0],pos[1],pos[2]+r*.8],.012,'titanium');}
 B.cylinder(g,r*.09,.10,'bronze',[pos[0],pos[1],pos[2]+r*.8],'z');
}
