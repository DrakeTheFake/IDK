import {clamp} from './core.js?v=eb47cb3d299c14';
import {eventEase} from './song-events.js?v=eb47cb3d299c14';

export const isDefeat=choice=>choice?.baseSong==='defeat'&&choice?.source==='impostor-week4';
export const changeComboLimit=(current,delta)=>(Math.round(current)+Math.round(delta)+6)%6;
export function defeatHealth(game){
  const limit=game.impostor?.comboBreakLimit;
  if(limit==null)return false;
  const failed=game.stats.misses>limit||!!game.modifiers?.instantFail&&game.stats.misses>0;
  game.stats.health=failed?0:1;
  return failed&&!game.practice&&!game.botplay&&!game.modifiers?.noFail;
}
const roleOf=name=>({bf:'player',boyfriend:'player',dad:'opponent',gf:'girlfriend'}[name]||name);
function alphaAt(cue,time){
  if(!cue)return 1;
  const t=clamp((time-cue.at)/Math.max(1,cue.end-cue.at),0,1);
  return cue.from+(cue.to-cue.from)*eventEase(cue.ease,'InOut',t);
}
export function campaignEvent(state,event){
  if(!state)return;
  const v=event.v||{};
  if(event.e==='ChangeCharacter'){
    state.characters[roleOf(v.character)]=String(v.newchar).toLowerCase();
    state.resetActor=roleOf(v.character);
  }
  if(event.e==='ChangeStage'){state.stage=v.stageid;state.props={};}
  if(event.e==='All Character Alpha Changer'){
    state.actorAlpha??={};
    const roles=v.target==='all'||!v.target?['player','opponent','girlfriend']:[roleOf(v.target)];
    for(const role of roles)state.actorAlpha[role]={at:event.t,end:event.t+(v.ease==='INSTANT'?0:Math.max(0,Number(v.duration)||0)*1000),
      from:alphaAt(state.actorAlpha[role],event.t),to:clamp(Number(v.alpha),0,1),ease:v.ease||'linear'};
  }
  if(event.e==='AdjustStageProp'){
    state.props??={};state.props[v.propName]={alpha:clamp(Number(v.alpha),0,1)};
  }
  if(event.e==='Camera Twist')state.twist={at:event.t,intensity:Number(v['Value 1'])||0,amount:Number(v['Value 2'])||0};
}
export const campaignActorAlpha=(state,role,time)=>alphaAt(state?.actorAlpha?.[role],time);
export function campaignTwist(ctx,state,beat,reducedMotion){
  if(reducedMotion||!state?.twist?.amount)return;
  const sign=Math.floor(beat)%2?-1:1,t=clamp((beat%1)*2,0,1),v=state.twist;
  const angle=sign*(v.amount+(v.intensity-v.amount)*Math.sqrt(1-(t-1)**2));
  ctx.translate(640,360-6*v.amount*(1-Math.abs((beat%1)*2-1)));ctx.rotate(angle*Math.PI/180);ctx.translate(-640,-360);
}
export function campaignProp(prop,game,time){
  if(!prop)return null;
  const state=game.impostor;
  if(!state)return prop;
  if(state.stage==='defeaterect2'&&game.beat*4>=896&&game.beat*4<992&&['bg','bg1','deadonesinveryfarbg','deadonesinbg','deadonesinfg'].includes(prop.name))return null;
  return state.props?.[prop.name]?{...prop,...state.props[prop.name]}:prop;
}
export function campaignActorPosition(game,role,position,time){
  if(game.choice.baseSong!=='danger'||role!=='girlfriend')return position;
  const start=game.chart.tempos.reduce((at,tempo)=>tempo.beat<=164?tempo:at,game.chart.tempos[0]);
  const at=start.time+(164-start.beat)*60000/start.bpm;
  const progress=clamp((time-at)/6000,0,1);
  return [position[0]-3000*progress**4,position[1]];
}
export const campaignSilhouette=game=>game.impostor?.stage==='defeaterect2'&&game.beat*4>=896&&game.beat*4<992;
export function campaignSingers(note){
  const kind=String(note.kind||'').toLowerCase();
  if(['gf','gf sing'].includes(kind))return ['girlfriend'];
  if(['both','white and black duet'].includes(kind))return [note.player?'player':'opponent','girlfriend'];
  if(['no animation','noanim'].includes(kind))return [];
  return [note.player?'player':'opponent'];
}
export function campaignPose(note){
  const kind=String(note.kind||'').toLowerCase();
  if(kind==='death'&&!note.player)return {name:'death',lock:true};
  if(kind!=='play-anim')return null;
  const params=Object.fromEntries((note.params||[]).map(p=>[p.n??p.name,p.v??p.value]));
  return {name:params.animation||'idle',lock:!!params.force};
}
export function campaignAssets(choice,native){
  const names=new Set();
  for(const stageId of choice.preload?.stages||[])for(const prop of native.stages[stageId]?.props||[])if(prop.assetId)names.add(prop.assetId);
  for(const id of choice.preload?.characters||[]){
    const config=native.characters[native.characterIds[id]];
    if(config)names.add(config.atlasName);
    if(native.iconAssets[id])names.add(native.iconAssets[id]);
  }
  if(isDefeat(choice)){
    const selector=native.impostor.defeatSelector;names.add(selector.arrow);for(const id of selector.dummies)names.add(id);
  }
  return [...names];
}
