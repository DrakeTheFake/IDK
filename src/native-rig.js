const RIG_BASE='assets/expanded/qt-hd/';

export class NativeRigs {
  constructor(){
    this.index={};
    this.loaded=new Map();
    this.sheets=new Map();
  }

  loadSheet(file){
    if(!this.sheets.has(file)){
      const image=new Image();
      image.src=RIG_BASE+file;
      const pending=image.decode().then(()=>image);
      this.sheets.set(file,pending);
      pending.catch(()=>{if(this.sheets.get(file)===pending)this.sheets.delete(file);});
    }
    return this.sheets.get(file);
  }

  async load(name){
    const response=await fetch(RIG_BASE+this.index[name]);
    if(!response.ok)throw new Error('Could not load original sprite data for '+name);
    const rig=await response.json();
    rig.images=await Promise.all(rig.sources.map(file=>this.loadSheet(file)));
    this.loaded.set(name,rig);
    return rig.images[0];
  }

  release(keep){
    for(const name of this.loaded.keys())if(!keep.has(name))this.loaded.delete(name);
    const used=new Set([...this.loaded.values()].flatMap(rig=>rig.sources));
    for(const name of this.sheets.keys())if(!used.has(name))this.sheets.delete(name);
  }

  draw(ctx,name,frame,x,y,scale){
    const rig=this.loaded.get(name),ids=rig?.frames[frame];
    if(!ids)return false;
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(scale,scale);
    for(const index of ids){
      const [page,sx,sy,width,height,rotated,a,b,c,d,tx,ty,opacity]=rig.parts[index];
      ctx.save();
      ctx.transform(a,b,c,d,tx,ty);
      ctx.globalAlpha*=opacity;
      if(rotated){
        ctx.translate(0,width);
        ctx.rotate(-Math.PI/2);
      }
      ctx.drawImage(rig.images[page],sx,sy,width,height,0,0,width,height);
      ctx.restore();
    }
    ctx.restore();
    return true;
  }
}
