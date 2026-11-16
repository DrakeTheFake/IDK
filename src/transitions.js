export const STICKER_SOUNDS=[1,2,3,4,5,7,8,9].map(id=>'sticker-keyClick'+id);
const STICKER_SWEEP=900;
const STICKER_HOLD=100;

function makeStickers(images,random) {
  const stickers=[];
  const sample=values=>values[Math.floor(random()*values.length)];
  const make=(x,y,center=false)=>{
    const image=sample(images);
    const width=Math.max(180,Math.min(290,image?.width||225));
    const height=image?width*image.height/image.width:190;
    return {image,x,y,width,height,angle:center?0:(random()-.5)*2.25,sound:sample(STICKER_SOUNDS)};
  };
  for(let y=-35;y<805;y+=68+random()*21){
    for(let x=-45;x<1380;){
      const sticker=make(x,y);
      stickers.push(sticker);
      x+=sticker.width*.44;
    }
  }
  for(let i=stickers.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [stickers[i],stickers[j]]=[stickers[j],stickers[i]];
  }
  stickers.push(make(640,360,true));
  return stickers;
}

export class SceneTransitions {
  constructor(){
    this.canvas=document.createElement('canvas');
    this.canvas.width=1280;
    this.canvas.height=720;
    this.ctx=this.canvas.getContext('2d');
    this.active=false;
  }

  get blocking(){return this.active&&this.kind==='stickers';}

  begin(source,from,to,{reducedMotion=false,now=performance.now(),stickers=null}={}){
    if(reducedMotion||[from,to].some(scene=>['editor','mods','character'].includes(scene))){
      this.finish();
      return;
    }
    this.ctx.clearRect(0,0,1280,720);
    this.ctx.drawImage(source,0,0);
    this.started=now;
    this.active=true;
    if(stickers){
      this.kind='stickers';
      this.duration=2*STICKER_SWEEP+STICKER_HOLD;
      this.stickers=makeStickers(Array.isArray(stickers)?stickers:[],Math.random);
      this.sounded=0;
      return;
    }
    this.kind=['story','play','loading','results'].includes(to)?'curtain':'slide';
    this.duration=['play','paused'].includes(from)&&['play','paused'].includes(to)?150:480;
  }

  drawStickers(ctx,age,sfx){
    const cards=this.stickers,count=cards.length;
    const opening=age<STICKER_SWEEP+STICKER_HOLD;
    const openingCount=Math.min(count,1+Math.floor(age/STICKER_SWEEP*count));
    const removed=Math.max(0,1+Math.floor((age-STICKER_SWEEP-STICKER_HOLD)/STICKER_SWEEP*count));
    const events=opening?openingCount:count+removed;
    if(events>this.sounded){
      // Rendering may skip a frame. Play only the latest click so they never pile up.
      sfx(cards[(events-1)%count].sound,.34);
      this.sounded=events;
    }
    if(opening)ctx.drawImage(this.canvas,0,0);
    const first=opening?0:removed,last=opening?openingCount:count;
    for(let index=first;index<last;index++){
      const card=cards[index],ageSince=age-index/count*STICKER_SWEEP;
      const pop=opening&&index===count-1?1+.12*Math.max(0,1-ageSince/84):1;
      ctx.save();
      ctx.translate(card.x,card.y);
      ctx.rotate(card.angle);
      ctx.scale(pop,pop);
      if(card.image){
        ctx.drawImage(card.image,-card.width/2,-card.height/2,card.width,card.height);
      }else{
        ctx.fillStyle='#24172f';
        ctx.fillRect(-card.width/2,-card.height/2,card.width,card.height);
        ctx.strokeStyle='#f7cfee';
        ctx.lineWidth=4;
        ctx.strokeRect(-card.width/2,-card.height/2,card.width,card.height);
      }
      ctx.restore();
    }
  }

  finish(){
    if(this.active)this.ctx.clearRect(0,0,1280,720);
    this.active=false;
    this.stickers=null;
  }

  draw(ctx,now,sfx=()=>{}){
    if(!this.active)return;
    const age=Math.max(0,now-this.started),p=age/this.duration;
    if(p>=1){this.finish();return;}
    if(this.kind==='stickers'){this.drawStickers(ctx,age,sfx);return;}
    const eased=1-Math.pow(1-p,3);
    ctx.save();
    if(this.kind==='slide'){
      ctx.globalAlpha=1-eased;
      ctx.drawImage(this.canvas,-eased*95,0);
      ctx.globalAlpha=(1-p)*.3;
      ctx.fillStyle='#090a19';
      ctx.fillRect(0,0,1280,720);
    }else{
      const edge=eased*1600;
      ctx.beginPath();
      ctx.moveTo(edge-320,0);
      ctx.lineTo(1280,0);
      ctx.lineTo(1280,720);
      ctx.lineTo(edge,720);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(this.canvas,0,0);
      ctx.fillStyle='#000';
      ctx.fillRect(edge-320,0,45,720);
    }
    ctx.restore();
  }
}
