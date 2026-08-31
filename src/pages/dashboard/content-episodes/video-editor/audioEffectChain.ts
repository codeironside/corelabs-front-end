import { mergeAudioFx } from './audioFx';
import type { AudioFxSettings } from './types';

let sharedContext: AudioContext | null = null;

function getContext() {
  if (!sharedContext) {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

type FxNodes = {
  lowCut: BiquadFilterNode;
  bass: BiquadFilterNode;
  mid: BiquadFilterNode;
  presence: BiquadFilterNode;
  treble: BiquadFilterNode;
  gate: DynamicsCompressorNode;
  compressor: DynamicsCompressorNode;
  limiter: DynamicsCompressorNode;
  deReverbDry: GainNode;
  output: GainNode;
};

type ChainEntry = {
  source: MediaElementAudioSourceNode;
  nodes: FxNodes;
  audio: HTMLAudioElement;
  baseGain: number;
  muted: boolean;
  fx: AudioFxSettings;
};

function syncOutputGain(entry: ChainEntry) {
  const riding = 1 + entry.fx.vocalRiding / 200;
  const saturation = 1 + entry.fx.saturation / 500;
  const gain = entry.baseGain * riding * saturation;
  entry.nodes.output.gain.value = entry.muted ? 0 : Math.min(2, Math.max(0, gain));
}

function applyFxToNodes(entry: ChainEntry) {
  const { nodes, fx, audio } = entry;
  nodes.lowCut.frequency.value = fx.lowCutHz;
  nodes.bass.gain.value = fx.bassDb;
  nodes.mid.gain.value = fx.midDb;
  nodes.presence.gain.value = fx.presenceDb - fx.deEss * 0.12;
  nodes.treble.gain.value = fx.trebleDb - fx.noiseReduction * 0.08;

  nodes.gate.threshold.value = -50 + fx.noiseGate * 0.35;
  nodes.gate.ratio.value = 8 + fx.noiseGate / 10;

  nodes.compressor.threshold.value = -24 + fx.compression * 0.18;
  nodes.compressor.ratio.value = 1 + fx.compression / 25;

  nodes.limiter.threshold.value = -6 - fx.limiting * 0.2;
  nodes.limiter.ratio.value = 4 + fx.limiting / 15;

  nodes.deReverbDry.gain.value = 1 - fx.deReverb / 120;

  const pitchRate = Math.pow(2, (fx.pitchSemitones + fx.autoTune * 0.02) / 12);
  audio.playbackRate = Math.min(2, Math.max(0.5, pitchRate));
  if ('preservesPitch' in audio) {
    (audio as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch = true;
  }

  syncOutputGain(entry);
}

export type AudioChainHandle = {
  disconnect: () => void;
  applyFx: (fxInput: Partial<AudioFxSettings> | undefined) => void;
  setLayerGain: (gain: number) => void;
  setMuted: (muted: boolean) => void;
};

const chainsByAudio = new WeakMap<HTMLAudioElement, ChainEntry>();

function handleFromEntry(entry: ChainEntry): AudioChainHandle {
  return {
    applyFx: (fxInput) => {
      entry.fx = mergeAudioFx({ ...entry.fx, ...fxInput });
      applyFxToNodes(entry);
    },
    setLayerGain: (gain) => {
      entry.baseGain = gain;
      syncOutputGain(entry);
    },
    setMuted: (muted) => {
      entry.muted = muted;
      syncOutputGain(entry);
    },
    disconnect: () => {
      try {
        entry.source.disconnect();
        entry.nodes.lowCut.disconnect();
        entry.nodes.bass.disconnect();
        entry.nodes.mid.disconnect();
        entry.nodes.presence.disconnect();
        entry.nodes.treble.disconnect();
        entry.nodes.gate.disconnect();
        entry.nodes.compressor.disconnect();
        entry.nodes.limiter.disconnect();
        entry.nodes.deReverbDry.disconnect();
        entry.nodes.output.disconnect();
      } catch {
        // Nodes may already be torn down.
      }
      chainsByAudio.delete(entry.audio);
    },
  };
}

export async function resumeAudioContext() {
  const ctx = getContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

export function connectAudioWithFx(
  audio: HTMLAudioElement,
  fxInput: Partial<AudioFxSettings> | undefined,
  layerGain: number,
): AudioChainHandle {
  const fx = mergeAudioFx(fxInput);
  const existing = chainsByAudio.get(audio);
  if (existing) {
    existing.fx = fx;
    existing.baseGain = layerGain;
    applyFxToNodes(existing);
    return handleFromEntry(existing);
  }

  const ctx = getContext();
  const source = ctx.createMediaElementSource(audio);
  audio.volume = 1;

  const lowCut = ctx.createBiquadFilter();
  lowCut.type = 'highpass';

  const bass = ctx.createBiquadFilter();
  bass.type = 'lowshelf';
  bass.frequency.value = 120;

  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 1000;
  mid.Q.value = 1;

  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 3200;
  presence.Q.value = 1.2;

  const treble = ctx.createBiquadFilter();
  treble.type = 'highshelf';
  treble.frequency.value = 8000;

  const gate = ctx.createDynamicsCompressor();
  gate.attack.value = 0.003;
  gate.release.value = 0.15;

  const compressor = ctx.createDynamicsCompressor();
  compressor.attack.value = 0.005;
  compressor.release.value = 0.2;

  const limiter = ctx.createDynamicsCompressor();
  limiter.attack.value = 0.001;
  limiter.release.value = 0.08;

  const deReverbDry = ctx.createGain();
  const output = ctx.createGain();

  const nodes: FxNodes = { lowCut, bass, mid, presence, treble, gate, compressor, limiter, deReverbDry, output };

  source.connect(lowCut);
  lowCut.connect(bass);
  bass.connect(mid);
  mid.connect(presence);
  presence.connect(treble);
  treble.connect(gate);
  gate.connect(compressor);
  compressor.connect(limiter);
  limiter.connect(deReverbDry);
  deReverbDry.connect(output);
  output.connect(ctx.destination);

  const entry: ChainEntry = { source, nodes, audio, baseGain: layerGain, muted: false, fx };
  applyFxToNodes(entry);
  chainsByAudio.set(audio, entry);
  return handleFromEntry(entry);
}
