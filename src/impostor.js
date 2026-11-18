import {clamp} from './core.js?v=d0aa7fd313ffa9';
import {EXPANDED_BASE} from './expanded-content.js?v=d0aa7fd313ffa9';

export const isImpostorWeek=choice=>choice?.source==='impostor-week1';
const introVideos={'sussus-moogus':'polus1',sabotage:'polus2',meltdown:'polus3'};

export function impostorIntro(choice){
  const video=introVideos[choice.baseSong];
  if(!video||choice.variant==='pico')return null;
  return {file:`IMP_${video}.mp4`,dialogue:'impostor-dialogue-'+choice.baseSong};
}

export function createImpostorWeek(choice,chart){
  if(!isImpostorWeek(choice))return null;
  const state={beep:null,characters:{},noteFollow:0};
  const cue=chart.events?.find(event=>event.e==='PlayVideo'&&event.v?.path==='meltdown');
  if(cue){
    const element=document.createElement('video');
    element.muted=true;
    element.playsInline=true;
    element.preload='auto';
    element.src=EXPANDED_BASE+'IMP_meltdown.mp4';
    state.video={element,at:cue.t,end:chart.events.find(event=>event.e==='extra-events-cameraFadeEvent')?.t??cue.t+4000};
  }
  return state;
}

export function updateImpostorEvent(state,event){
  const value=event.v||{};
  if(event.e==='FocusCamera')state.noteFollow=value.noteFollow?Number(value.noteOffset)||20:0;
  if(event.e==='Reactor Beep')state.beep={at:event.t,alpha:clamp(Number(value.value??.4),0,.65),zoom:Number(value.zoomAmount??.015)};
  if(event.e==='ChangeCharacter'&&value.character==='gf'&&['ghost-gf','ghost-gf-intro'].includes(value.newchar)){
    state.characters.girlfriend=value.newchar;
    state.ghostAt=event.t;
  }
  if(event.e==='extra-events-cameraFadeEvent')state.fadeAt=event.t;
}

export function impostorCameraPush(state,time){
  const beep=state?.beep;
  if(!beep)return 0;
  return beep.zoom*clamp(1-Math.abs(time-beep.at-400)/400,0,1);
}

export function impostorFlash(state,time){
  return state?.beep?state.beep.alpha*clamp(1-(time-state.beep.at)/600,0,1):0;
}

export function syncImpostorVideo(state,time,rate){
  const video=state?.video;
  if(!video||time<video.at)return;
  const {element}=video;
  if(time>=video.end||element.error){
    closeImpostorVideo(state);
    return;
  }
  element.playbackRate=rate;
  const position=(time-video.at)/1000;
  if(element.readyState>=2&&!element.seeking&&Math.abs(element.currentTime-position)>.16)
    element.currentTime=position;
  if(element.paused&&!element.ended&&!video.starting){
    video.starting=true;
    element.play().catch(()=>{}).finally(()=>{video.starting=false;});
  }
}

export function closeImpostorVideo(state){
  if(!state?.video)return;
  const {element}=state.video;
  state.video=null;
  element.pause();
  element.removeAttribute('src');
  element.load();
}
