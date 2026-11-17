export const SECRET_CHANCES = ['Original', 'Always', 'Never'];

export function rollSecret(mode, chance, random = Math.random) {
  if (mode === 'Always') return true;
  if (mode === 'Never') return false;
  return random() < chance;
}

const WIDTH=1280,HEIGHT=720;
const modulo=(value,period)=>((value%period)+period)%period;

// Tile once at source resolution. Each render then just slides a view over
// the cached bitmap, including a full tile beyond each wrap boundary.
export async function makeRepeatingEffect(image,scale=1){
  const {width,height}=image;
  const canvas=document.createElement('canvas');
  canvas.width=(Math.ceil(WIDTH/(width*scale))+1)*width;
  canvas.height=(Math.ceil(HEIGHT/(height*scale))+1)*height;
  const ctx=canvas.getContext('2d');
  for(let y=0;y<canvas.height;y+=height)
    for(let x=0;x<canvas.width;x+=width)
      ctx.drawImage(image,x,y);
  const bitmap=typeof createImageBitmap==='function'
    ? await createImageBitmap(canvas).catch(()=>canvas) : canvas;
  return {bitmap,width,height,scale};
}

export function drawRepeatingEffect(ctx,{bitmap,width,height,scale},x,y){
  ctx.drawImage(bitmap,modulo(-x/scale,width),modulo(-y/scale,height),
    WIDTH/scale,HEIGHT/scale,0,0,WIDTH,HEIGHT);
}
