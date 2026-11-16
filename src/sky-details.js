import {expandedImage,loadExpandedAnimation} from './sky-ui.js';
import {drawSkyAnimation,loadSkyPolishPack} from './sky-polish.js';

const candyNames=['taco','packofSkittles','popTart','lollipop','jollyRancher'];
const clamp=value=>Math.max(0,Math.min(1,value));
const fract=value=>value-Math.floor(value);

export class SkyDetails {
  async prepare(choice,audio){
    if(!choice.stage?.startsWith('theShift'))return;
    if(!this.loading){
      this.loading=(async()=>{
        const pack=await loadSkyPolishPack();
        this.art=Object.fromEntries(await Promise.all(['angerTile','angryVignette','candyGradient','tacoGradient',...candyNames]
          .filter(key=>pack[key]).map(async key=>[key,await expandedImage(pack[key])])));
        this.scream={...pack.scream,image:await expandedImage(pack.scream.image)};
        [this.gesture,this.cup]=await Promise.all([loadExpandedAnimation(pack.bfGesture),loadExpandedAnimation(pack.picoCup)]);
        this.audio=audio;
        this.sounds=Object.fromEntries(await Promise.all(['tomatoThrow','tomatoSplat','boyfriendHawk']
          .filter(name=>pack.audio[name]).map(async name=>[name,await audio.load('assets/expanded/'+pack.audio[name]).catch(()=>null)])));
      })().catch(error=>{this.loading=null;console.warn(error);});
    }
    await this.loading;
  }

  async prepareStickers(choice){
    const set=choice.source==='sky-reborn'?
      (choice.baseSong==='scenecore'?'sky-sticker-set-allegro':choice.variant==='sky'?'sky-sticker-set-sky':choice.character==='pico'?'sky-sticker-set-pico':'sky-sticker-set'):
      (choice.baseSong==='tutorial'?'bonus-tutorial':choice.week==='weekend1'?'bonus-weekend1':choice.character==='pico'?'standard-pico':'standard-bf');
    if(!this.stickers?.[set]){
      this.stickers??={};
      this.stickers[set]=loadSkyPolishPack().then(pack=>Promise.all((pack.stickers[set]||[]).map(expandedImage))).catch(()=>[]);
    }
    return this.stickers[set];
  }

  update(game,time,actors,random=Math.random){
    if(!game.choice.stage?.startsWith('theShift')||game.custom||game.beat<0)return;
    const {choice,beat}=game;
    const state=game.skyDetails??={beat:-1,at:{},anger:0};
    const cue=(key,at,action)=>{
      if(beat>=at&&state.at[key]===undefined){state.at[key]=time;action();}
    };
    const force=(role,name,duration)=>{actors[role].forced={name,since:time,until:time+duration,lock:true};};
    const suffix=(role,value)=>{
      game.animationSuffix??={};
      game.animationSuffix[role]={idle:value,sing:value};
    };
    const sound=name=>this.playSound(name);
    if(choice.baseSong==='wife-forever'){
      state.block=choice.variant==='classic'&&choice.characters.player==='bf-candy'&&beat>=72&&beat<104;
      if(choice.characters.player==='bf-candy'){
        cue('catch',92,()=>suffix('player','-candy'));
        cue('toss',200,()=>{force('player','candyflip',875);suffix('player','-lollipop');});
        cue('spit',336,()=>{force('player','candyspit',900);sound('boyfriendHawk');suffix('player','');});
      }
    }
    if(Math.floor(beat)!==state.beat){
      state.beat=Math.floor(beat);
      if(!this.cardboardFell&&['theShift','theShiftDark'].includes(choice.stage)&&random()<(choice.stage==='theShift'?.0005:.0025)){
        this.cardboardFell=true;
        game.propAnimations??={};
        game.propAnimations.boyfriendCutout={name:'fall',since:time,until:Infinity};
      }
    }
    if(choice.baseSong==='sky'||choice.baseSong==='sky-lyrics'){
      const pose=actors.opponent.forced;
      if(pose&&['yell','mad','flabbergasted','scream','bothered'].includes(pose.name)&&state.pose!==pose.since){
        state.pose=pose.since;state.anger=Math.min(1,state.anger+.12);
      }
    }
  }

  playSound(name){
    const buffer=this.sounds?.[name],audio=this.audio;
    if(!buffer||!audio?.ctx)return;
    const source=audio.ctx.createBufferSource();
    source.buffer=buffer;
    source.connect(audio.fx);
    source.onended=()=>source.disconnect();
    source.start();
  }

  chartPose(game,role,name){
    if(!game.choice.stage?.startsWith('theShift'))return;
    if(role==='opponent'&&name==='caramelTransition'){
      game.animationSuffix??={};
      game.animationSuffix.opponent={idle:'-caramel'};
    }
    if(role==='girlfriend'&&name==='tomatoThrow')this.playSound('tomatoThrow');
    if(role==='opponent'&&name==='tomatoHit'){
      game.animationSuffix??={};
      game.animationSuffix.opponent={idle:'-tomato',sing:'-tomato'};
      this.playSound('tomatoSplat');
    }
  }

  drawSpecialPose(ctx,game,actor,role,position,time,scale){
    const pose=actor?.forced;
    if(role!=='player'||!pose||time<pose.since||time>=pose.until)return false;
    const gesture=pose.name==='pointing',cup=pose.name==='cupThrow'||pose.name==='raspberry';
    const asset=gesture?this.gesture:cup?this.cup:null;
    if(!asset)return false;
    const label=gesture?'Gesture':pose.name==='cupThrow'?'Cup Throw':'Raspberry';
    drawSkyAnimation(ctx,asset,time-pose.since,position[0]-(gesture?183:235)*scale,
      position[1]-(gesture?425:472)*scale,{scale,label,normalize:true});
    return true;
  }

  drawBackdrop(ctx,game,time){
    if(game.choice.stage!=='theShiftDarkErect'||!this.art?.angerTile)return;
    const tile=this.art.angerTile,size=tile.width*.8,height=tile.height*.8;
    const x=Math.max(0,time)*.075%size,y=Math.max(0,time)*.075%height;
    ctx.save();ctx.globalAlpha=.25;ctx.globalCompositeOperation='multiply';
    for(let left=x-size;left<1280;left+=size)
      for(let top=y-height;top<720;top+=height)ctx.drawImage(tile,left,top,size,height);
    ctx.restore();
  }

  drawForeground(ctx,game,time,reduced){
    if(!this.art||reduced)return;
    const {beat,choice}=game;
    if(choice.baseSong==='wife-forever'&&beat>=72&&beat<136){
      const taco=choice.variant==='erect';
      const gradient=this.art[taco?'tacoGradient':'candyGradient'];
      const opacity=clamp(Math.min(beat-72,136-beat)/3);
      ctx.save();
      ctx.globalAlpha=opacity*.2;
      if(gradient)ctx.drawImage(gradient,0,0,1280,720);
      const pool=(taco?['taco']:candyNames.slice(1)).filter(name=>this.art[name]);
      if(pool.length){
        for(let i=0;i<20;i++){
          const art=this.art[pool[i%pool.length]],phase=fract(time*.00036+i*.137);
          const x=fract(i*.618035)*1280,y=phase*850-75;
          const w=56+i%6*8,h=w*art.height/art.width;
          ctx.save();ctx.globalAlpha=opacity*.71;ctx.translate(x,y);ctx.rotate(time*.002+i);
          ctx.drawImage(art,-w/2,-h/2,w,h);ctx.restore();
        }
      }
      ctx.restore();
    }
    if(this.art.angryVignette&&game.skyDetails?.anger){
      ctx.save();ctx.globalAlpha=game.skyDetails.anger;
      ctx.drawImage(this.art.angryVignette,0,0,1280,720);ctx.restore();
    }
  }

  drawScream(ctx,game,actor,position,time,scale){
    if(actor.forced?.name!=='scream'||time<actor.forced.since||time>=actor.forced.until||!this.scream?.frames.length)return;
    const {frames,image}=this.scream;
    const f=frames[Math.floor((time-actor.forced.since)*.024)%frames.length];
    ctx.drawImage(image,f.x,f.y,f.width,f.height,position[0]+20*scale,position[1]-530*scale,f.width*scale,f.height*scale);
  }
}
