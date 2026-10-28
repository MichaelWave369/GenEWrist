/**
 * Experimental WebXR stereo console. No game input interception or fabricated
 * hardware telemetry. A right-controller select cycles the canonical rings.
 * Left grip provides a hand-adjacent anchor when visibly positioned in front.
 */
import {RINGS,ringItems} from './catalog.js';
import {computePanelModel} from './xr-layout.js';
const vertexSource='attribute vec2 pos;attribute vec2 uv;uniform mat4 projection;uniform mat4 view;uniform mat4 model;varying vec2 tex;void main(){tex=uv;gl_Position=projection*view*model*vec4(pos,0.0,1.0);}';
const fragmentSource='precision mediump float;varying vec2 tex;uniform sampler2D panel;void main(){gl_FragColor=texture2D(panel,tex);}';
function shader(gl,type,source){
 const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error('XR shader: '+error);}
 return s;
}
function program(gl){
 const vs=shader(gl,gl.VERTEX_SHADER,vertexSource),fs=shader(gl,gl.FRAGMENT_SHADER,fragmentSource),p=gl.createProgram();
 gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const error=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error('XR link: '+error);}
 return p;
}
function createPanelCanvas(){
 const canvas=document.createElement('canvas');
 canvas.width=1024;canvas.height=576;return canvas;
}
function drawPanel(canvas,ringIndex){
 const c=canvas.getContext('2d');if(!c)return;
 const ring=RINGS[ringIndex],apps=ringItems(ring.id);
 c.clearRect(0,0,1024,576);c.fillStyle='#071727';c.fillRect(0,0,1024,576);
 c.strokeStyle='#59e8ee';c.lineWidth=7;c.strokeRect(16,16,992,544);
 c.fillStyle='#45e5e8';c.font='bold 52px system-ui';c.fillText('GEN.E.WRIST',60,102);
 c.fillStyle='#b5e1eb';c.font='24px system-ui';c.fillText('THE BUILDER’S COMPANION  /  XR FIELD PREVIEW',60,145);
 for(let i=0;i<RINGS.length;i++){
  const current=RINGS[i];const x=60+i*312;
  c.strokeStyle=i===ringIndex?'#ffb774':'#315263';c.lineWidth=3;c.strokeRect(x,183,291,73);
  c.fillStyle=i===ringIndex?'#ffb774':'#75a4b3';c.font='bold 25px system-ui';c.fillText(current.count+' / '+current.label,x+17,229);
 }
 c.fillStyle='#e7fcff';c.font='bold 25px system-ui';c.fillText('CURRENT: '+ring.label,60,308);
 c.font='23px system-ui';c.fillStyle='#a8ceda';
 const max=ringIndex===2?3:2,step=ringIndex===2?40:59;
 apps.forEach((app,i)=>{
  const column=Math.floor(i/max),row=i%max;
  const x=60+column*312,y=350+row*step;
  c.fillText((i+1)+'. '+app.title.slice(0,22),x,y);
 });
 c.fillStyle='#ffbd76';c.font='20px system-ui';
 c.fillText('Right trigger: cycle rings. Exit XR with the Quest system menu.',60,532);
}
export async function launchExperimentalXR({onEnd=()=>{}}={}){
 if(!navigator.xr||typeof navigator.xr.requestSession!=='function')throw Error('WebXR not exposed by this browser');
 if(!(await navigator.xr.isSessionSupported?.('immersive-vr')))throw Error('Immersive VR not supported');
 const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor']});
 let gl=null,p=null,vbo=null,texture=null,closed=false,ringIndex=1,dirty=true;
 const canvas=createPanelCanvas(),model=new Float32Array(16);
 const onSelect=e=>{if(e.inputSource?.handedness==='right'){ringIndex=(ringIndex+1)%RINGS.length;dirty=true;}};
 session.addEventListener('select',onSelect);
 const finish=()=>{
  if(closed)return;closed=true;
  session.removeEventListener('select',onSelect);
  if(gl){if(texture)gl.deleteTexture(texture);if(vbo)gl.deleteBuffer(vbo);if(p)gl.deleteProgram(p);}
  onEnd();
 };
 session.addEventListener('end',finish,{once:true});
 try{
  const webglCanvas=document.createElement('canvas');
  gl=webglCanvas.getContext('webgl',{alpha:false,antialias:false,xrCompatible:true,preserveDrawingBuffer:false});
  if(!gl)throw Error('WebGL is unavailable');
  if(gl.makeXRCompatible)await gl.makeXRCompatible();
  session.updateRenderState({baseLayer:new XRWebGLLayer(session,gl)});
  let space;try{space=await session.requestReferenceSpace('local-floor');}catch{space=await session.requestReferenceSpace('local');}
  p=program(gl);vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-0.5,-0.5,0,0, 0.5,-0.5,1,0, -0.5,0.5,0,1, 0.5,0.5,1,1]),gl.STATIC_DRAW);
  gl.useProgram(p);const position=gl.getAttribLocation(p,'pos'),uv=gl.getAttribLocation(p,'uv');
  gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,16,0);
  gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);
  texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  for(const [name,param] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,name,param);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  const uniforms={projection:gl.getUniformLocation(p,'projection'),view:gl.getUniformLocation(p,'view'),model:gl.getUniformLocation(p,'model')};
  const render=(_time,xrFrame)=>{
   if(closed)return;
   const pose=xrFrame.getViewerPose(space);
   if(pose){
    let left=null;
    for(const source of session.inputSources){if(source.handedness==='left'&&source.gripSpace){left=xrFrame.getPose(source.gripSpace,space);if(left)break;}}
    computePanelModel(pose,left,model);
    if(dirty){
     drawPanel(canvas,ringIndex);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);dirty=false;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,session.renderState.baseLayer.framebuffer);
    gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bindTexture(gl.TEXTURE_2D,texture);gl.enable(gl.SCISSOR_TEST);
    for(const view of pose.views){
     const vp=session.renderState.baseLayer.getViewport(view);gl.viewport(vp.x,vp.y,vp.width,vp.height);gl.scissor(vp.x,vp.y,vp.width,vp.height);
     gl.clearColor(.012,.026,.055,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
     gl.uniformMatrix4fv(uniforms.projection,false,view.projectionMatrix);
     gl.uniformMatrix4fv(uniforms.view,false,view.transform.inverse.matrix);
     gl.uniformMatrix4fv(uniforms.model,false,model);
     gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
    gl.disable(gl.SCISSOR_TEST);
   }
   session.requestAnimationFrame(render);
  };
  session.requestAnimationFrame(render);
  return Object.freeze({session,async end(){if(!closed){await session.end();finish();}}});
 }catch(error){try{await session.end();}catch{}finish();throw error;}
}
