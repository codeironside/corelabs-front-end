import type { SfxPreset } from './sfxLibrary';

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function audioBufferToWav(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels;
  const length = buffer.length * channels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  const sampleRate = buffer.sampleRate;

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  let offset = 44;
  for (let sample = 0; sample < buffer.length; sample += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const data = buffer.getChannelData(channel);
      const clamped = Math.max(-1, Math.min(1, data[sample] ?? 0));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function envelope(local: number, shape: 'soft' | 'hit' | 'rise' | 'flat' = 'soft') {
  if (shape === 'hit') return Math.exp(-8 * local);
  if (shape === 'rise') return Math.min(1, local * 1.4) * Math.sin(Math.PI * local);
  if (shape === 'flat') return 0.85 + Math.sin(Math.PI * local) * 0.15;
  return Math.sin(Math.PI * local);
}

function addTone(
  data: Float32Array,
  sampleRate: number,
  frequency: number,
  gain: number,
  start = 0,
  end = data.length / sampleRate,
  shape: 'soft' | 'hit' | 'rise' | 'flat' = 'soft',
) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(data.length, Math.floor(end * sampleRate));
  for (let index = startIndex; index < endIndex; index += 1) {
    const t = index / sampleRate;
    const local = (index - startIndex) / Math.max(1, endIndex - startIndex);
    data[index] += Math.sin(2 * Math.PI * frequency * t) * gain * envelope(local, shape);
  }
}

function addSweep(
  data: Float32Array,
  sampleRate: number,
  fromFrequency: number,
  toFrequency: number,
  gain: number,
  start: number,
  end: number,
  shape: 'soft' | 'hit' | 'rise' | 'flat' = 'soft',
) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(data.length, Math.floor(end * sampleRate));
  let phase = 0;
  for (let index = startIndex; index < endIndex; index += 1) {
    const local = (index - startIndex) / Math.max(1, endIndex - startIndex);
    const frequency = fromFrequency + (toFrequency - fromFrequency) * local;
    phase += (2 * Math.PI * frequency) / sampleRate;
    data[index] += Math.sin(phase) * gain * envelope(local, shape);
  }
}

function addNoise(
  data: Float32Array,
  sampleRate: number,
  gain: number,
  start = 0,
  end = data.length / sampleRate,
  shape: 'soft' | 'hit' | 'rise' | 'flat' = 'soft',
  color: 'bright' | 'dark' | 'balanced' = 'balanced',
) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(data.length, Math.floor(end * sampleRate));
  let previous = 0;
  for (let index = startIndex; index < endIndex; index += 1) {
    const local = (index - startIndex) / Math.max(1, endIndex - startIndex);
    const white = Math.random() * 2 - 1;
    previous = previous * 0.86 + white * 0.14;
    const sample = color === 'dark' ? previous : color === 'bright' ? white - previous * 0.55 : white * 0.65 + previous * 0.35;
    data[index] += sample * gain * envelope(local, shape);
  }
}

function addClick(data: Float32Array, sampleRate: number, start: number, gain: number, frequency = 1200, length = 0.045) {
  addTone(data, sampleRate, frequency, gain, start, start + length, 'hit');
  addNoise(data, sampleRate, gain * 0.35, start, start + length, 'hit', 'bright');
}

function addChord(data: Float32Array, sampleRate: number, frequencies: number[], gain: number, start: number, end: number) {
  frequencies.forEach((frequency, index) => {
    addTone(data, sampleRate, frequency, gain / (index + 1), start, end, 'soft');
  });
}

function normalize(data: Float32Array) {
  let peak = 0;
  for (let index = 0; index < data.length; index += 1) peak = Math.max(peak, Math.abs(data[index] ?? 0));
  if (peak < 0.01) return;
  const scale = Math.min(1, 0.88 / peak);
  for (let index = 0; index < data.length; index += 1) data[index] *= scale;
}

export async function renderSfxPresetFile(preset: SfxPreset) {
  const sampleRate = 44_100;
  const context = new OfflineAudioContext(1, Math.ceil(sampleRate * preset.duration), sampleRate);
  const buffer = context.createBuffer(1, context.length, sampleRate);
  const data = buffer.getChannelData(0);

  if (preset.id === 'crowd-bed') {
    addNoise(data, sampleRate, 0.11, 0, preset.duration, 'flat', 'dark');
    addTone(data, sampleRate, 175, 0.018, 0, preset.duration, 'flat');
    addTone(data, sampleRate, 310, 0.01, 0, preset.duration, 'flat');
  } else if (preset.id === 'crowd-cheer') {
    addNoise(data, sampleRate, 0.24, 0, preset.duration, 'rise', 'bright');
    for (let shout = 0.05; shout < preset.duration; shout += 0.18 + Math.random() * 0.16) {
      addSweep(data, sampleRate, 260 + Math.random() * 180, 760 + Math.random() * 460, 0.075, shout, shout + 0.28, 'hit');
      addTone(data, sampleRate, 900 + Math.random() * 500, 0.018, shout, shout + 0.18, 'hit');
    }
  } else if (preset.id === 'crowd-gasp') {
    addNoise(data, sampleRate, 0.24, 0, 0.95, 'hit', 'bright');
    for (let voice = 0; voice < 0.75; voice += 0.08) {
      addSweep(data, sampleRate, 720 + Math.random() * 180, 280 + Math.random() * 120, 0.05, voice, voice + 0.42, 'hit');
    }
    addTone(data, sampleRate, 180, 0.08, 0, 0.55, 'hit');
  } else if (preset.id === 'applause') {
    for (let hit = 0; hit < preset.duration; hit += 0.055 + Math.random() * 0.085) {
      addClick(data, sampleRate, hit, 0.18 + Math.random() * 0.1, 850 + Math.random() * 1600, 0.025 + Math.random() * 0.035);
    }
    addNoise(data, sampleRate, 0.045, 0, preset.duration, 'flat', 'bright');
  } else if (preset.id === 'violin-swell') {
    addSweep(data, sampleRate, 392, 523, 0.16, 0, preset.duration, 'rise');
    addSweep(data, sampleRate, 587, 784, 0.08, 0.2, preset.duration, 'rise');
    addTone(data, sampleRate, 1046, 0.025, 1, preset.duration, 'rise');
  } else if (preset.id === 'piano-bed') {
    for (let beat = 0; beat < preset.duration; beat += 1.4) addChord(data, sampleRate, [262, 330, 392], 0.15, beat, beat + 0.75);
  } else if (preset.id === 'low-drone') {
    addTone(data, sampleRate, 55, 0.2, 0, preset.duration, 'flat');
    addTone(data, sampleRate, 110, 0.12, 0, preset.duration, 'flat');
    addTone(data, sampleRate, 220, 0.055, 0, preset.duration, 'flat');
    addSweep(data, sampleRate, 330, 260, 0.035, 0, preset.duration, 'flat');
    addNoise(data, sampleRate, 0.035, 0, preset.duration, 'flat', 'dark');
  } else if (preset.id === 'cinematic-hit') {
    addNoise(data, sampleRate, 0.3, 0, 0.32, 'hit', 'bright');
    addSweep(data, sampleRate, 180, 38, 0.95, 0, 1.7, 'hit');
    addTone(data, sampleRate, 58, 0.42, 0.03, 1.3, 'hit');
    addTone(data, sampleRate, 420, 0.08, 0, 0.28, 'hit');
  } else if (preset.id === 'bass-drop') {
    addSweep(data, sampleRate, 140, 36, 0.72, 0, 2.5, 'hit');
    addNoise(data, sampleRate, 0.08, 0, 0.7, 'hit', 'dark');
  } else if (preset.id === 'heartbeat') {
    for (let beat = 0; beat < preset.duration; beat += 0.85) {
      addTone(data, sampleRate, 82, 0.58, beat, beat + 0.16, 'hit');
      addTone(data, sampleRate, 60, 0.36, beat + 0.22, beat + 0.36, 'hit');
    }
  } else if (preset.id === 'whoosh') {
    addSweep(data, sampleRate, 280, 1800, 0.09, 0, preset.duration, 'rise');
    addNoise(data, sampleRate, 0.16, 0, preset.duration, 'rise', 'bright');
  } else if (preset.id === 'reverse-whoosh') {
    addSweep(data, sampleRate, 1800, 260, 0.1, 0, preset.duration, 'rise');
    addNoise(data, sampleRate, 0.14, 0, preset.duration, 'rise', 'balanced');
  } else if (preset.id === 'soft-riser') {
    addSweep(data, sampleRate, 180, 980, 0.09, 0, preset.duration, 'rise');
    addSweep(data, sampleRate, 360, 1260, 0.05, 1, preset.duration, 'rise');
  } else if (preset.id === 'street-ambience') {
    addNoise(data, sampleRate, 0.07, 0, preset.duration, 'flat', 'balanced');
    for (let pass = 0.5; pass < preset.duration; pass += 1.8) addSweep(data, sampleRate, 80, 180, 0.05, pass, pass + 1.1, 'soft');
    for (let horn = 1.2; horn < preset.duration; horn += 3.4) addTone(data, sampleRate, 410, 0.035, horn, horn + 0.2, 'hit');
  } else if (preset.id === 'market-ambience') {
    addNoise(data, sampleRate, 0.13, 0, preset.duration, 'flat', 'balanced');
    for (let voice = 0.05; voice < preset.duration; voice += 0.28 + Math.random() * 0.34) addSweep(data, sampleRate, 190 + Math.random() * 150, 340 + Math.random() * 280, 0.032, voice, voice + 0.22, 'soft');
    for (let clap = 0.9; clap < preset.duration; clap += 2.1) addClick(data, sampleRate, clap, 0.08, 1200, 0.03);
  } else if (preset.id === 'rain-ambience') {
    addNoise(data, sampleRate, 0.1, 0, preset.duration, 'flat', 'bright');
    for (let drop = 0; drop < preset.duration; drop += 0.045 + Math.random() * 0.12) addClick(data, sampleRate, drop, 0.025 + Math.random() * 0.03, 2200 + Math.random() * 1800, 0.012);
    addNoise(data, sampleRate, 0.035, 0, preset.duration, 'flat', 'dark');
  } else if (preset.id === 'office-room') {
    addNoise(data, sampleRate, 0.035, 0, preset.duration, 'flat', 'dark');
    addTone(data, sampleRate, 120, 0.015, 0, preset.duration, 'flat');
    addTone(data, sampleRate, 60, 0.012, 0, preset.duration, 'flat');
    for (let key = 1.1; key < preset.duration; key += 2.6) addClick(data, sampleRate, key, 0.035, 1300, 0.025);
  } else if (preset.id === 'camera-click') {
    addClick(data, sampleRate, 0.05, 0.45, 1800, 0.035);
    addClick(data, sampleRate, 0.13, 0.22, 900, 0.05);
  } else if (preset.id === 'notification') {
    addTone(data, sampleRate, 880, 0.28, 0, 0.16, 'soft');
    addTone(data, sampleRate, 1175, 0.22, 0.16, 0.34, 'soft');
  } else if (preset.id === 'typing') {
    for (let tap = 0; tap < preset.duration; tap += 0.14 + Math.random() * 0.16) addClick(data, sampleRate, tap, 0.12, 1300 + Math.random() * 1100, 0.025);
  } else if (preset.id === 'door-knock') {
    [0.1, 0.42, 0.8].forEach((start, index) => {
      addTone(data, sampleRate, 145 - index * 8, 0.48 - index * 0.05, start, start + 0.18, 'hit');
      addNoise(data, sampleRate, 0.08, start, start + 0.12, 'hit', 'dark');
    });
  } else if (preset.id === 'footsteps') {
    for (let step = 0; step < preset.duration; step += 0.55) {
      addTone(data, sampleRate, 92, 0.24, step, step + 0.13, 'hit');
      addNoise(data, sampleRate, 0.08, step, step + 0.16, 'hit', 'dark');
    }
  } else if (preset.id === 'page-turn') {
    addNoise(data, sampleRate, 0.22, 0.02, 0.32, 'hit', 'bright');
    addNoise(data, sampleRate, 0.14, 0.3, 0.82, 'soft', 'bright');
    addSweep(data, sampleRate, 2200, 620, 0.07, 0.04, 0.68, 'soft');
    addClick(data, sampleRate, 0.72, 0.07, 1800, 0.025);
  }

  normalize(data);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
  const rendered = await context.startRendering();
  const blob = audioBufferToWav(rendered);
  return new File([blob], `${preset.id}.wav`, { type: 'audio/wav' });
}
