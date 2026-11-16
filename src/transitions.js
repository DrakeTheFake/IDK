export class SceneTransitions {
  constructor(){this.canvas=document.createElement('canvas');this.canvas.width=1280;this.canvas.height=720;this.ctx=this.canvas.getContext('2d');this.active=false;}
  begin(source,from,to,{reducedMotion=false,now=performance.now(),stickers=null}={}){if(reducedMotion||from==='editor'||to==='editor'||from==='mods'||to==='mods'||from==='character'||to==='character'){this.active=false;return;}this.ctx.drawImage(source,0,0);this.started=now;this.duration=['play','paused'].includes(from)&&['play','paused'].includes(to)?150:480;this.active=true;
    if(stickers){
      this.kind='stickers';this.duration=680;
      const art=Array.isArray(stickers)?stickers:[];
      this.stickers=Array.from({length:24},(_,i)=>({
        image:art[i%art.length],x:110+(i%6)*211,y:104+Math.floor(i/6)*171,
        rotation:Math.sin(i*1.6)*.42,start:(i%5)*.02,
      }));
      return;
    }
    this.kind=['story','play','loading','results'].includes(to)?'curtain':'slide';}
  draw(ctx,now){if(!this.active)return;const p=Math.min(1,(now-this.started)/this.duration);if(p>=1){this.active=false;return;}const eased=1-Math.pow(1-p,3);ctx.save();if(this.kind==='stickers'){
    for(const [i,card] of this.stickers.entries()){
      const t=Math.min(1,Math.max(0,(p-card.start)/.92));
      const fly=t*t*1.8;
      ctx.save();ctx.globalAlpha=1-t**3;
      ctx.translate(card.x+(card.x-640)*fly,card.y+(card.y-340)*fly+220*fly);
      ctx.rotate(card.rotation+Math.sin(i+1)*fly);
      if(card.image){
        const w=205,h=w*card.image.height/card.image.width;
        ctx.drawImage(card.image,-w/2,-h/2,w,h);
      }else{
        ctx.drawImage(this.canvas,i%6*213,Math.floor(i/6)*180,213,180,-106,-90,213,180);
        ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.strokeRect(-106,-90,213,180);
      }
      ctx.restore();
    }
  }else if(this.kind==='slide'){ctx.globalAlpha=1-eased;ctx.drawImage(this.canvas,-eased*95,0);ctx.globalAlpha=(1-p)*0.3;ctx.fillStyle='#090a19';ctx.fillRect(0,0,1280,720);}else{const edge=eased*1600;ctx.beginPath();ctx.moveTo(edge-320,0);ctx.lineTo(1280,0);ctx.lineTo(1280,720);ctx.lineTo(edge,720);ctx.closePath();ctx.clip();ctx.drawImage(this.canvas,0,0);ctx.fillStyle='#000';ctx.fillRect(edge-320,0,45,720);}ctx.restore();}
}
