// 几何长度用于教学模型布局，不表示实物尺寸。
export const ENGINE={radius:.62,rod:2.02};
export const GEARBOX={inputTeeth:20,outputTeeth:40,module:.095,pressureAngle:20*Math.PI/180};
export function pistonPose(angle,radius=ENGINE.radius,rod=ENGINE.rod){
 if(!Number.isFinite(angle)||!(radius>0)||!(rod>radius))throw new RangeError('曲柄半径需为正，连杆长度需大于曲柄半径，角度需为有限数。');
 const x=radius*Math.sin(angle),y=radius*Math.cos(angle);
 return {x,y,pistonY:y+Math.sqrt(rod*rod-x*x),rodAngle:Math.asin(x/rod)};
}
export function gearAngles(angle){
 if(!Number.isFinite(angle))throw new RangeError('角度需为有限数。');
 return {input:angle,output:-angle*GEARBOX.inputTeeth/GEARBOX.outputTeeth+Math.PI/GEARBOX.outputTeeth};
}
// 理想化的四冲程开闭时刻，凸轮轮廓和气门位移共用同一升程。
export function valveLift(angle,valve){
 const a=((angle%(Math.PI*4))+Math.PI*4)%(Math.PI*4),phase=Math.floor(a/Math.PI);
 return phase===(valve==='intake'?0:3)?Math.sin(a%Math.PI)*.18:0;
}
export function involuteHalfAngle(radius,pitchRadius,baseRadius,teeth){
 const inv=r=>{const a=Math.acos(Math.min(1,baseRadius/r));return Math.tan(a)-a;};
 return Math.PI/(2*teeth)+inv(pitchRadius)-inv(Math.max(radius,baseRadius));
}
