import {bpmAt,clamp,HIT_WINDOW} from './core.js';
import {EXPANDED_BASE} from './expanded-content.js';

export const isQtRewired=choice=>choice?.source==='qt-rewired';

export function createQtGameplay(choice,chart){
  if(!isQtRewired(choice))return null;
  const attacks=[], cues=[];
  for(const event of chart.events){
    if(event.e!=='sawKB')continue;
    const value=event.v?.num_sawblades;
    const count=({Single:1,Double:2,Triple:3})[value]||Number(value)||1;
    const beat=60000/bpmAt(chart,event.t);
    const theme=count===2?2:1;
    cues.push({at:event.t,label:'alert '+theme+' beat 1',sound:'alert-1',beat},
      {at:event.t+beat,label:'alert '+theme+' beat 2',sound:'alert-'+(count===2?2:1),beat});
    if(count===3)cues.push({at:event.t+2*beat,label:'alert 2 attack 1',sound:'alert-1',beat});
    for(let i=0;i<count;i++){
      const at=event.t+((count===3?3:2)+i)*beat;
      attacks.push({at,index:i,done:false});
      const label=count===1?'alert 1 attack':i===0?'alert 2 attack 1':'alert 2 attack 2';
      cues.push({at,label,sound:'attack-'+(i+1),beat,attack:true});
    }
  }
  attacks.sort((a,b)=>a.at-b.at);
  cues.sort((a,b)=>a.at-b.at);
  let videos=[];
  if(choice.baseSong.startsWith('obliterated')){
    if(choice.variant==='erect'){
      videos=[{at:149673,end:153800,file:'obliteratedErectMid'},{at:153800,end:Infinity,file:'obliteratedErectEdit'}];
    }else{
      const start=chart.events.find(e=>e.e==='cutsceneVideo'),end=chart.events.find(e=>e.e==='cutsceneVideoOut');
      if(start&&end)videos=[{at:start.t,end:end.t,file:'cutscene'}];
    }
  }
  return {attacks,cues,attackIndex:0,cueIndex:0,events:chart.events.filter(e=>['changeStage','blackIn','fadeStart'].includes(e.e)),
    visualIndex:0,videos,stagePhase:'Killer',phaseAt:0};
}

export function dodgeQt(game,time,force){
  const qt=game.qt;
  const attack=qt?.attacks.slice(qt.attackIndex).find(a=>!a.done&&Math.abs(a.at-time)<=HIT_WINDOW);
  if(!attack)return false;
  attack.done=true;
  game.stats.health=clamp(game.stats.health+.20,0,2);
  qt.dodgedAt=time;
  force('player','dodge-'+(attack.index%2),time,false);
  return true;
}

function updateVideo(qt,time,rate){
  const current=qt.videos.find(clip=>time>=clip.at&&time<clip.end)
    ||qt.videos.find(clip=>time>=clip.at-3500&&time<clip.at);
  if(qt.video?.clip!==current){
    closeQtVideo(qt);
    if(current){
      const element=document.createElement('video');
      element.preload='auto';
      element.muted=true;
      element.playsInline=true;
      element.src=EXPANDED_BASE+'QTR_'+current.file+'.mp4';
      qt.video={clip:current,element};
    }
  }
  if(!qt.video||time<qt.video.clip.at)return;
  const video=qt.video.element,at=(time-qt.video.clip.at)/1000;
  if(video.error)return;
  video.playbackRate=rate;
  if(video.readyState>=2&&!video.seeking&&Math.abs(video.currentTime-at)>.22&&at<video.duration)video.currentTime=at;
  if(video.paused&&!video.ended&&!qt.video.starting){
    const active=qt.video;
    active.starting=true;
    video.play().catch(()=>{}).finally(()=>{active.starting=false;});
  }
}

export function closeQtVideo(qt){
  if(!qt?.video)return;
  const video=qt.video.element;
  video.pause();
  video.removeAttribute('src');
  video.load();
  qt.video=null;
}

export function updateQt(game,time,{mode,sound,force}){
  const qt=game.qt;
  if(!qt)return;
  while(qt.events[qt.visualIndex]?.t<=time){
    const event=qt.events[qt.visualIndex++];
    if(event.e==='changeStage'){qt.stagePhase=event.v.char;qt.phaseAt=event.t;}
    if(event.e==='blackIn')qt.blackIn=event.t;
    if(event.e==='fadeStart')qt.fadeStart=event.t;
  }
  if(mode!=='disabled'){
    while(qt.cues[qt.cueIndex]?.at<=time){
      qt.warning=qt.cues[qt.cueIndex++];
      sound('QTR_sawblades_'+(qt.warning.attack?'attacks_':'alerts_')+qt.warning.sound,.8);
      if(qt.warning.attack)force('girlfriend','dodge',qt.warning.at,false);
    }
    while(qt.attacks[qt.attackIndex]?.at<=time){
      const attack=qt.attacks[qt.attackIndex];
      if(game.botplay&&!attack.done)dodgeQt(game,attack.at,force);
      if(!attack.done&&time<=attack.at+HIT_WINDOW)break;
      if(!attack.done){
        game.stats.health=mode==='instakill'?0:Math.max(0,game.stats.health-1);
        qt.sawDeath=game.stats.health<=0;
        force('player','sawHit-'+(attack.index%2),time,true);
      }
      qt.attackIndex++;
    }
  }else{
    qt.warning=null;
    while(qt.cues[qt.cueIndex]?.at<=time)qt.cueIndex++;
    while(qt.attacks[qt.attackIndex]?.at<=time)qt.attackIndex++;
  }
  if(qt.videos.length)updateVideo(qt,time,game.modifiers.rate);
}

export function qtProp(prop,qt,time,flashes){
  if(!qt)return prop;
  const phase=qt.stagePhase;
  if(prop.name==='blackScreenVideo'){
    const hiding=qt.fadeStart!=null&&time<(qt.videos[0]?.end??0);
    return {...prop,alpha:hiding?clamp((time-qt.fadeStart)/3000,0,1):0};
  }
  if(prop.name==='blackScreenR')return {...prop,alpha:qt.blackIn!=null?1:0};
  if(prop.name==='warningScreen')return {...prop,alpha:phase==='Red'?(flashes?.55+.45*Math.cos((time-qt.phaseAt)*Math.PI/500):.55):0};
  if(prop.name==='blueScreen')return {...prop,alpha:phase==='Blue'?1:0};
  if(prop.name==='tvStaticLeft'||prop.name==='tvStaticRight')return {...prop,alpha:phase==='Killer'?1:0};
  if(prop.animations?.some(a=>a.name===phase))return {...prop,startingAnimation:phase};
  return prop;
}

export function qtScene(choice,kind,lang='english'){
  if(!isQtRewired(choice))return null;
  const line=(at,name,captions)=>({at,name:'QTR_'+name,captions:captions&&'QTR_'+lang+'_'+captions+'.srt'});
  const hi=at=>line(at,'gameplay_countdown_'+lang+'_hi_cutie','hi-cutie');
  const camera=zoom=>({camera:[[0,['opponent',0,0,zoom]],[3500,['player',0,0,zoom],2200,'quadInOut']]});
  if(choice.baseSong==='blissful'){
    if(kind==='outro'&&choice.variant==='erect')return {
      duration:5800,fadeIn:0,audio:'QTR_outroSong-erect.ogg',view:camera(.7),
      voiceLines:[line(1100,'gameplay_cutsceneSfx_'+lang+'_bf_qt_erect_ending','cutsceneErect_showoff')],
    };
    if(kind!=='intro')return null;
    if(choice.variant==='erect')return {
      duration:7000,audio:'QTR_introSong-erect.ogg',view:camera(.7),
      voiceLines:[line(1200,'gameplay_cutsceneSfx_'+lang+'_bf_qt_erect_intro_1','cutsceneErect_alright-cutie'),
        line(4050,'gameplay_cutsceneSfx_'+lang+'_bf_qt_erect_intro_2','cutsceneErect_well-see')],
      poses:[[900,'opponent','intro',1900],[3100,'player','hey',1150]],
    };
    if(choice.variant==='pico')return {
      duration:11000,audio:'QTR_introSong-pico.ogg',view:camera(.81),
      voiceLines:[hi(980),line(4150,'gameplay_cutsceneSfx_pico_introCutscene_picoWave')],
      poses:[[0,'opponent','still',500],[500,'opponent','intro',3000],[3500,'player','introbl',7000]],
    };
    return {
      duration:8100,audio:'QTR_introSong-default.ogg',view:camera(.78),
      voiceLines:[hi(2150)],poses:[[0,'opponent','still',1500],[1500,'opponent','intro',3000],[4300,'player','intro',3000]],
    };
  }
  if(choice.baseSong==='obliterated'&&choice.variant==='erect'){
    return kind==='intro'?{
      duration:5500,view:camera(.77),voiceLines:[line(0,'gameplay_introObliteratedErect')],
      poses:[[0,'opponent','intro-erect',5200]],
    }:null;
  }
  if(choice.baseSong==='go-go-go'){
    if(kind==='outro')return {duration:6300,fadeIn:0,fadeOut:4800,view:camera(.8),
      voiceLines:[line(0,'gameplay_collabSongEnd')],poses:[[0,'player','hey',2000]]};
    const times=lang==='spanish'?[20,1550,3035]:[0,1240,2900];
    const names=['cg5-line-1','qt-line-1','cg5-line-2'];
    return {duration:lang==='spanish'?5700:5450,view:camera(.82),
      voiceLines:names.map((name,i)=>line(times[i],'gameplay_introGoGoGo_'+lang+'_'+name,'introGoGoGo_'+name)),
      poses:[[0,'opponent','singUP',1100],[times[1],'player','hey',1500],[times[2],'opponent','singUP',1800]]};
  }
  return null;
}
