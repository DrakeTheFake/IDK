export const isBadBunny=choice=>choice?.source==='bad-bunny';

export function bunnyIntro(choice){
  if(!isBadBunny(choice)||choice.baseSong!=='celoso')return null;
  return {duration:6300,fadeIn:1000,
    poses:[[3700,'opponent','hey',2300],[4900,'player','hey',1400]],
    view:{camera:[[0,['position',700,-100,1.1]],[0,['position',700,-100,.8],1500,'circOut'],
      [1800,['opponent',0,0,.8],2400,'quartInOut'],[3900,['player',0,0,.8],1800,'expoInOut']]},
    voiceLines:[{at:300,name:'BB_intro'}]};
}

export function bunnyBop(pattern,step){
  const patterns={reggaeton:[8,{0:2,3:.6,4:.6,6:1}],reggaeton_build_up:[16,{0:2,4:.6,8:1,12:.6}],
    trap:[32,{0:1.5,16:1.5,4:.6,20:.6,8:2,24:2,12:.2,13:.2,27:1.8}],alterno:[8,{0:3,3:1,6:1}],
    'palmas-piano':[16,{0:2,10:.8}],'one-weak':[16,{0:1.2,4:.8,8:.8,12:.8}],
    'one-strong':[16,{0:2,4:1.1,8:1.1,12:1.1}],'one-equal-strong':[4,{0:2}],
    'one-every-other':[8,{0:1.1,4:1.6}],'one-just-every-other':[8,{4:1.6}],'four-weak':[16,{0:.6}]};
  const p=patterns[pattern];return p?p[1][step%p[0]]||0:0;
}

export function updateBunny(game,time,art,{motion=true}={}){
  if(!isBadBunny(game.choice))return;
  const state=game.bunny??={cue:0,step:-1,pattern:null,dolphins:{}};
  const step=Math.floor(game.beat*4),cues=art.cues[game.choice.baseSong]||[];
  while(cues[state.cue]?.step<=step){
    const cue=cues[state.cue++];
    if('pattern' in cue)state.pattern=cue.pattern;
    if('alternate' in cue)state.alternate=cue.alternate;
    if(cue.dolphin)state.dolphins[cue.dolphin.name]={at:time,x:cue.dolphin.x};
    if(cue.fade)state.fadeAt=time;
  }
  if(state.step===step)return;
  const previous=state.step;state.step=step;
  if(step<0)return;
  if(step%4===0&&previous<step&&Math.random()<.1){
    const name=time-(state.dolphins.dolphin?.at??-1e6)>1000?'dolphin':'dolphin-fg';
    if(time-(state.dolphins[name]?.at??-1e6)>1000)
      state.dolphins[name]={at:time,x:name==='dolphin'?-400+Math.random()*1800:-2138+Math.random()*1100};
  }
  if(state.pattern!=null){
    game.bopRate=0;
    if(motion){const intensity=bunnyBop(state.pattern,step);if(intensity)game.cameraBump=.015*intensity;}
  }else game.bopRate=4;
}

export function bunnyProp(prop,game,time,assets){
  if(!isBadBunny(game.choice))return prop;
  if(['dolphin','dolphin-fg'].includes(prop.name)){
    const cue=game.bunny?.dolphins[prop.name],frames=assets.frames(prop.assetId,'Jump');
    if(!cue||time<cue.at||(time-cue.at)*.024>=frames.length)return null;
    return {...prop,position:[cue.x,prop.position[1]],animationTime:time-cue.at,
      animations:prop.animations.map(a=>({...a,looped:false}))};
  }
  return prop;
}

// Run the installed shader code on the original source textures. The output
// buffer follows the projected display size; textures are never downscaled.
export class BunnyShaders{
  constructor(){this.programs=new Map();}
  draw(ctx,prop,image,{x,y,width,height,time,source}){
    const name=prop.name;
    if(!['sky','sun','water'].includes(name)||!source)return false;
    let renderer=this.programs.get(name);
    if(renderer===false)return false;
    if(!renderer){
      try{renderer=this.create(source,image);this.programs.set(name,renderer);}
      catch(error){console.warn('Bad Bunny '+name+' shader could not initialize:',error.message);this.programs.set(name,false);return false;}
    }
    const {canvas,gl,program,clock}=renderer;
    const matrix=ctx.getTransform(),scale=Math.hypot(matrix.a,matrix.b);
    const w=Math.max(1,Math.ceil(width*scale)),h=Math.max(1,Math.ceil(height*scale));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
    gl.useProgram(program);gl.uniform1f(clock,Math.max(0,time)/2000);gl.drawArrays(gl.TRIANGLES,0,6);
    ctx.save();
    if(name==='sun'){
      ctx.translate(x+width/2,y+height/2);ctx.rotate(Math.max(0,time)/1000*3*Math.PI/180);
      ctx.drawImage(canvas,-width/2,-height/2,width,height);
    }else ctx.drawImage(canvas,x,y,width,height);
    ctx.restore();return true;
  }
  create(source,image){
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false});
    if(!gl)throw Error('WebGL unavailable');
    const compile=(kind,code)=>{
      const shader=gl.createShader(kind);gl.shaderSource(shader,code);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;
    };
    const program=gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 position; varying vec2 openfl_TextureCoordv; void main(){openfl_TextureCoordv=vec2((position.x+1.0)*.5,1.0-(position.y+1.0)*.5);gl_Position=vec4(position,0.,1.);}'));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,'precision highp float; uniform sampler2D bitmap; varying vec2 openfl_TextureCoordv;\n'+source.replace('#pragma header','').replaceAll('flixel_texture2D','texture2D')));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.uniform1i(gl.getUniformLocation(program,'bitmap'),0);
    return {canvas,gl,program,clock:gl.getUniformLocation(program,'iTime')};
  }
}
