/**
 * Standalone WebXR stereo *display experiment*, not production Quest control.
 * Uses a head-facing panel near the left tracked grip when visible; the controller
 * does NOT grant the rendered wrist app ability to capture gameplay input.
 */
const vertexSource='attribute vec2 pos;attribute vec2 uv;uniform mat4 projection;uniform mat4 view;uniform mat4 model;varying vec2 tex;void main(){tex=uv;gl_Position=projection*view*model*vec4(pos,0.0,1.0);}';
const fragmentSource='precision mediump float;varying vec2 tex;uniform sampler2D panel;void main(){gl_FragColor=texture2D(panel,tex);}';
function shader(gl,type,source){
 const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error('Shader error: '+error);}
 return s;
}
function program(gl){
 const vs=shader(gl,gl.VERTEX_SHADER,vertexSource),fs=shader(gl,gl.FRAGMENT_SHADER,fragmentSource),p=gl.createProgram();
 gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const error=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error('Link error: '+error);}
 return p;
}
function buildPanel(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=576;const c=canvas.getContext('2d');
 c.fillStyle='#071728';c.fillRect(0,0,1024,576);
 c.strokeStyle='#52e7ed';c.lineWidth=8;c.strokeRect(14,14,996,548);
 c.fillStyle='#53ece9';c.font='bold 54px system-ui';c.fillText('GEN.E.WRIST',62,100);
 c.fillStyle='#c8eff3';c.font='27px system-ui';c.fillText('THE BUILDER’S COMPANION',63,155);
 c.fillStyle='#839fb5';c.font='23px system-ui';c.fillText('EXPERIMENTAL XR DISPLAY • NOT CONNECTED TO A GAME',63,213);
 const tabs=['03  IDENTITY','06  TOOLS','09  REFUGE'];
 tabs.forEach((name,i)=>{const x=65+i*320;c.strokeStyle='#345d70';c.strokeRect(x,274,296,115);c.fillStyle='#53ece9';c.font='bold 32px system-ui';c.fillText(name,x+18,339);});
 c.fillStyle='#e6faff';c.font='22px system-ui';c.fillText('World launcher • Loom Market • S.N.A.K.E. Toolkit',63,462);
 c.fillStyle='#ffbd76';c.font='19px system-ui';c.fillText('Return to the browser for clickable controls. Exit via system menu.',63,516);
 return canvas;
}
function modelFromPose(viewer,hand){
 const head=viewer.transform,headMatrix=head.matrix;
 const m=new Float32Array(headMatrix);
 let x=head.position.x-m[8]*1.1,y=head.position.y-m[9]*1.1-0.05,z=head.position.z-m[10]*1.1;
 if(hand){
  const p=hand.transform.position;
  const dx=p.x-head.position.x,dy=p.y-head.position.y,dz=p.z-head.position.z;
  const distance=Math.hypot(dx,dy,dz);
  // Avoid uncomfortable near clipping and hidden-behind-head placement.
  const toward=dx*(-m[8])+dy*(-m[9])+dz*(-m[10]);
  if(distance>0.7&&distance<1.8&&toward>0.25){x=p.x;y=p.y;z=p.z;}
 }
 m[12]=x;m[13]=y;m[14]=z;
 for(let i=0;i<3;i++){m[i]*=0.85;m[4+i]*=0.48;}
 return m;
}
export async function launchExperimentalXR({onEnd=()=>{}}={}){
 if(!navigator.xr||typeof navigator.xr.requestSession!=='function')throw Error('WebXR not exposed in this browser');
 if(!(await navigator.xr.isSessionSupported?.('immersive-vr')))throw Error('Immersive VR not supported');
 const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor']});
 let gl=null,p=null,vbo=null,texture=null,closed=false;
 const finish=()=>{
  if(closed)return;closed=true;
  if(gl){if(texture)gl.deleteTexture(texture);if(vbo)gl.deleteBuffer(vbo);if(p)gl.deleteProgram(p);}
  onEnd();
 };
 session.addEventListener('end',finish,{once:true});
 try{
  const canvas=document.createElement('canvas');
  gl=canvas.getContext('webgl',{alpha:false,antialias:false,xrCompatible:true,preserveDrawingBuffer:false});
  if(!gl)throw Error('WebGL is unavailable');
  if(gl.makeXRCompatible)await gl.makeXRCompatible();
  session.updateRenderState({baseLayer:new XRWebGLLayer(session,gl)});
  let space;try{space=await session.requestReferenceSpace('local-floor');}catch{space=await session.requestReferenceSpace('local');}
  p=program(gl);
  vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
  // triangle strip: XY plane, UV texture coordinates.
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-0.5,-0.5,0,0, 0.5,-0.5,1,0, -0.5,0.5,0,1, 0.5,0.5,1,1]),gl.STATIC_DRAW);
  gl.useProgram(p);
  const position=gl.getAttribLocation(p,'pos'),uv=gl.getAttribLocation(p,'uv');
  gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,16,0);
  gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,buildPanel());
  gl.uniform1i(gl.getUniformLocation(p,'panel'),0);
  const uniforms={projection:gl.getUniformLocation(p,'projection'),view:gl.getUniformLocation(p,'view'),model:gl.getUniformLocation(p,'model')};
  const frame=(_time,xrFrame)=>{
   if(closed)return;
   const pose=xrFrame.getViewerPose(space);
   if(pose){
    let left=null;
    for(const source of session.inputSources){if(source.handedness==='left'&&source.gripSpace){left=xrFrame.getPose(source.gripSpace,space);if(left)break;}}
    const model=modelFromPose(pose,left);
    gl.bindFramebuffer(gl.FRAMEBUFFER,session.renderState.baseLayer.framebuffer);
    gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bindTexture(gl.TEXTURE_2D,texture);gl.enable(gl.SCISSOR_TEST);
    for(const view of pose.views){
     const vp=session.renderState.baseLayer.getViewport(view);gl.viewport(vp.x,vp.y,vp.width,vp.height);gl.scissor(vp.x,vp.y,vp.width,vp.height);
     gl.clearColor(0.016,0.035,0.075,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
     gl.uniformMatrix4fv(uniforms.projection,false,view.projectionMatrix);
     gl.uniformMatrix4fv(uniforms.view,false,view.transform.inverse.matrix);
     gl.uniformMatrix4fv(uniforms.model,false,model);
     gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
    gl.disable(gl.SCISSOR_TEST);
   }
   session.requestAnimationFrame(frame);
  };
  session.requestAnimationFrame(frame);
  return Object.freeze({session,async end(){if(!closed){await session.end();finish();}}});
 }catch(error){try{await session.end();}catch{}finish();throw error;}
}
