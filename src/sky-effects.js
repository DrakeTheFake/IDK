export const SECRET_CHANCES = ['Original', 'Always', 'Never'];

export function rollSecret(mode, chance, random = Math.random) {
  if (mode === 'Always') return true;
  if (mode === 'Never') return false;
  return random() < chance;
}

const patterns = new WeakMap();

export function drawRepeatingEffect(ctx, image, x, y, scale = 1) {
  let pattern = patterns.get(image);
  if (!pattern) {
    pattern = ctx.createPattern(image, 'repeat');
    if (!pattern) return;
    patterns.set(image, pattern);
  }
  const left = x % (image.width * scale);
  const top = y % (image.height * scale);
  ctx.save();
  ctx.translate(left, top);
  ctx.scale(scale, scale);
  ctx.fillStyle = pattern;
  ctx.fillRect(-left / scale, -top / scale, 1280 / scale, 720 / scale);
  ctx.restore();
}
