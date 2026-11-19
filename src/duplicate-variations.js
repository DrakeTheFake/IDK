export const songFamily=song=>song.originalSongId||song.baseSong||song.id;

export function duplicateChoices(songs,selected,choiceFor){
  const current=choiceFor(selected),family=songFamily(selected);
  return songs.filter(song=>{
    if(songFamily(song)!==family)return false;
    const choice=choiceFor(song);
    return choice.character===current.character&&choice.level===current.level;
  });
}

export function collapseDuplicates(songs,choiceFor){
  const seen=new Set();
  return songs.filter(song=>{
    const choice=choiceFor(song),key=[songFamily(song),choice.character,choice.level].join(':');
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}

export class VariationSelector{
  async choose(options,{albumFor,preview=()=>{},sound=()=>{}}){
    if(options.length<2)return options[0]||null;
    this.close?.();
    const root=document.createElement('section');root.id='variation-selector';
    root.setAttribute('role','dialog');root.setAttribute('aria-label','Select your album');root.setAttribute('aria-modal','true');
    const title=document.createElement('h1');title.textContent='SELECT YOUR ALBUM';root.append(title);
    const row=document.createElement('div');row.className='variation-albums';root.append(row);
    const buttons=[];let index=0;
    const result=new Promise(resolve=>{
      const close=value=>{root.remove();document.removeEventListener('keydown',key,true);this.close=null;resolve(value);};
      this.close=()=>close(null);
      const select=i=>{index=(i+options.length)%options.length;buttons.forEach((button,j)=>button.classList.toggle('selected',j===index));buttons[index]?.focus();sound('scrollMenu');preview(options[index]);};
      const key=event=>{
        if(!['Escape','ArrowLeft','ArrowRight','Enter'].includes(event.code))return;
        event.preventDefault();event.stopImmediatePropagation();
        if(event.code==='Escape')close(null);
        else if(event.code==='Enter'){sound('confirmMenu');close(options[index]);}
        else select(index+(event.code==='ArrowLeft'?-1:1));
      };
      document.addEventListener('keydown',key,true);
      for(const [i,option] of options.entries()){
        const button=document.createElement('button');button.className='variation-album';
        const art=document.createElement('img');art.alt='';art.hidden=true;button.append(art);
        const name=document.createElement('strong');name.textContent=option.label;button.append(name);
        const detail=document.createElement('span');detail.textContent=option.detail||'';button.append(detail);
        button.onclick=()=>{if(index===i){sound('confirmMenu');close(option);}else select(i);};
        button.onfocus=()=>{index=i;buttons.forEach((b,j)=>b.classList.toggle('selected',i===j));};
        row.append(button);buttons.push(button);
        Promise.resolve(albumFor(option)).then(url=>{if(url&&root.isConnected){art.src=url;art.hidden=false;}}).catch(()=>{});
      }
      const back=document.createElement('button');back.textContent='BACK / ESC';back.className='variation-back';back.onclick=()=>close(null);root.append(back);
      document.querySelector('#game').append(root);select(0);
    });
    return result;
  }
}
