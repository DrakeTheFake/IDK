export const CALIBRATION_BEAT = 600;

export function audioClockTime(context, eventAt, now = performance.now()) {
  const elapsed = Number.isFinite(eventAt) && eventAt > 0 ? Math.min(0, eventAt - now) : 0;
  return context.currentTime + Math.max(-250, elapsed) / 1000;
}

export function songClockTime(position, offset, rate = 1) {
  return position - offset * rate;
}

export function estimateOutputDelay(context) {
  const latencies = [context?.baseLatency, context?.outputLatency]
    .filter(value => Number.isFinite(value) && value >= 0);
  return latencies.length ? Math.min(1500, Math.round(latencies.reduce((sum, value) => sum + value, 0) * 1000)) : null;
}

export function medianDelay(samples) {
  if (!samples.length) return 0;
  const ordered = [...samples].sort((a, b) => a - b);
  return Math.round((ordered[Math.floor((ordered.length - 1) / 2)] + ordered[Math.floor(ordered.length / 2)]) / 2);
}

export class CalibrationAudio {
  constructor(audio, assetRoot) {
    this.audio = audio;
    this.assetRoot = assetRoot;
    this.generation = 0;
  }

  async start() {
    this.stop();
    const generation = this.generation;
    const buffers = await Promise.all(['offsetsLoop', 'drumsLoop'].map(name => this.audio.load(this.assetRoot + name + '.ogg')));
    if (generation !== this.generation) return;
    const {ctx, master} = this.audio;
    const length = buffers[1].length;
    this.started = ctx.currentTime + .08;
    this.stems = buffers.map((buffer, i) => {
      // The music Ogg is a few samples shorter than the beat stem. Pad that
      // difference so both sources repeat at the same sample indefinitely.
      if (buffer.length < length) {
        const padded = ctx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          padded.copyToChannel(buffer.getChannelData(channel), channel);
        }
        buffer = padded;
      }
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.loopEnd = length / buffer.sampleRate;
      gain.gain.value = i === 0 ? .8 : 0;
      source.connect(gain);
      gain.connect(master);
      source.start(this.started);
      return {source, gain};
    });
  }

  get ready() { return Boolean(this.stems); }

  beatDrums(enabled) {
    if (!this.stems) return;
    const gain = this.stems[1].gain.gain;
    gain.setTargetAtTime(enabled ? .9 : 0, this.audio.ctx.currentTime, .015);
  }

  time(eventAt) {
    return this.stems ? (audioClockTime(this.audio.ctx, eventAt) - this.started) * 1000 : 0;
  }

  autoEstimate() {
    return estimateOutputDelay(this.audio?.ctx);
  }

  stop() {
    this.generation++;
    for (const {source, gain} of this.stems || []) {
      source.stop();
      source.disconnect();
      gain.disconnect();
    }
    this.stems = null;
  }
}
