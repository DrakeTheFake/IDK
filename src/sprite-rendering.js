const filters = new WeakMap();
const imageIds = new WeakMap();
const cache = new Map();
const CACHE_LIMIT = 48 * 1024 * 1024;
let nextImageId = 0;
let cacheSize = 0;

export function withSpriteFilter(ctx, color, draw, shadow = null) {
  const previous = filters.get(ctx);
  const filter = shadow ? `${color} drop-shadow(${shadow.x}px ${shadow.y}px 0px ${shadow.color})` : color;
  ctx.save();
  ctx.filter = filter;
  filters.set(ctx, {color, shadow, filter});
  try {
    return draw();
  } finally {
    if (previous) filters.set(ctx, previous);
    else filters.delete(ctx);
    ctx.restore();
  }
}

function surfaceFor(image, x, y, width, height, effect, isMask = false) {
  const size = width * height * 4;
  if (!Number.isInteger(size) || size <= 0 || size > CACHE_LIMIT || width > 4096 || height > 4096) return null;
  if (!imageIds.has(image)) imageIds.set(image, ++nextImageId);
  const key = `${imageIds.get(image)}:${x},${y},${width},${height}:${effect}`;
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return cached.canvas;
  }
  while (cacheSize + size > CACHE_LIMIT) {
    const [oldKey, old] = cache.entries().next().value;
    cache.delete(oldKey);
    cacheSize -= old.size;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (!isMask) ctx.filter = effect;
  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  if (isMask) {
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = effect;
    ctx.fillRect(0, 0, width, height);
  }
  cache.set(key, {canvas, size});
  cacheSize += size;
  return canvas;
}

// Cache the original-resolution crop. Color transforms need no resampling, and
// the zero-blur outline is drawn at the same screen-pixel offset at any zoom.
export function drawSprite(ctx, image, sx, sy, sw, sh, x, y, width, height) {
  const effect = filters.get(ctx);
  if (!effect || ctx.filter !== effect.filter ||
      (effect.shadow && (ctx.globalAlpha !== 1 || ctx.globalCompositeOperation !== 'source-over'))) {
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
    return;
  }
  const color = surfaceFor(image, sx, sy, sw, sh, effect.color);
  const shadow = effect.shadow;
  const mask = shadow && surfaceFor(image, sx, sy, sw, sh, shadow.color, true);
  if (!color || shadow && !mask) {
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
    return;
  }
  ctx.save();
  ctx.filter = 'none';
  if (mask) {
    const {a, b, c, d, e, f} = ctx.getTransform();
    ctx.setTransform(a, b, c, d, e + shadow.x, f + shadow.y);
    ctx.drawImage(mask, x, y, width, height);
    ctx.setTransform(a, b, c, d, e, f);
  }
  ctx.drawImage(color, x, y, width, height);
  ctx.restore();
}
