/**
 * Pure stereo-safe panel pose helper. This is a lightweight display demo,
 * not a production wrist interface or controller calibration system.
 */
export function computePanelModel(viewer,hand,out=new Float32Array(16)){
 if(!viewer?.transform?.matrix||viewer.transform.matrix.length!==16)throw Error('Viewer transform required');
 const matrix=viewer.transform.matrix;
 const h=viewer.transform.position;
 for(let i=0;i<16;i++)out[i]=matrix[i];
 let useHand=false,x=0,y=0,z=0;
 const f={x:-matrix[8],y:-matrix[9],z:-matrix[10]};
 if(hand?.transform?.position){
  const p=hand.transform.position;
  const dx=p.x-h.x,dy=p.y-h.y,dz=p.z-h.z;
  const length=Math.hypot(dx,dy,dz);
  const facing=(dx*f.x+dy*f.y+dz*f.z)/Math.max(length,.001);
  if(length>=.65&&length<=1.4&&facing>.58){
   x=p.x;y=p.y+.14;z=p.z;useHand=true;
  }
 }
 if(!useHand){
  // Head-facing card about 1.15 m forward, slightly left and below central gaze.
  x=h.x+f.x*1.15-matrix[0]*.2;
  y=h.y+f.y*1.15-matrix[1]*.2-.13;
  z=h.z+f.z*1.15-matrix[2]*.2;
 }
 // Keep a comfortable 48 cm wide / 27 cm high binocular panel.
 for(let i=0;i<3;i++){out[i]*=.48;out[4+i]*=.27;}
 out[12]=x;out[13]=y;out[14]=z;out[15]=1;
 return {model:out,attachedToHand:useHand};
}
