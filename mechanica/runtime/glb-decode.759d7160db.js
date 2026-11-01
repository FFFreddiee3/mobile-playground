import {MeshoptDecoder} from '#meshopt';
// 把models-c里压缩过的GLB还原成parseGLB可读的普通GLB；未压缩的GLB原样返回。
export async function decodeGLB(buffer){
 const view=new DataView(buffer),jsonLen=view.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLen)));
 if(!json.extensionsUsed?.includes('EXT_meshopt_compression'))return buffer;
 await MeshoptDecoder.ready;
 const binStart=20+jsonLen+8,source=new Uint8Array(buffer,binStart,view.getUint32(20+jsonLen,true)),fallback=json.buffers[1],target=new Uint8Array(fallback.byteLength);
 for(const bv of json.bufferViews){
  const ext=bv.extensions.EXT_meshopt_compression,out=new Uint8Array(ext.count*ext.byteStride);
  MeshoptDecoder.decodeGltfBuffer(out,ext.count,ext.byteStride,source.subarray(ext.byteOffset,ext.byteOffset+ext.byteLength),ext.mode,ext.filter||'NONE');
  target.set(out,bv.byteOffset);delete bv.extensions;bv.buffer=0;
 }
 delete json.extensionsUsed;delete json.extensionsRequired;json.buffers=[{byteLength:target.length}];
 const text=new TextEncoder().encode(JSON.stringify(json)),jsonPad=(4-text.length%4)%4,total=12+8+text.length+jsonPad+8+target.length,out=new Uint8Array(total),dv=new DataView(out.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);dv.setUint32(12,text.length+jsonPad,true);dv.setUint32(16,0x4e4f534a,true);out.set(text,20);out.fill(0x20,20+text.length,20+text.length+jsonPad);
 const binHead=20+text.length+jsonPad;dv.setUint32(binHead,target.length,true);dv.setUint32(binHead+4,0x004e4942,true);out.set(target,binHead+8);
 return out.buffer;
}
