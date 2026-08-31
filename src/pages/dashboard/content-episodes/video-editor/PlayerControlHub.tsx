import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Captions, Loader2, Maximize2, Pause, Play, RefreshCcw, Scissors, Shrink, Volume2, VolumeX } from 'lucide-react';
import type { EpisodeSceneCard } from '../storyboard';
import { directStudioMediaUrl, preventMediaContextMenu, protectedMediaSurfaceClass, protectedVideoProps, resolveProtectedAudioPlaybackUrl, useProtectedMediaSrc } from '../protectedMedia';
import { effectiveAudioVolume, audioLayersSignature, scheduledAudioLayers } from './audioPlayback';
import { connectAudioWithFx, resumeAudioContext, type AudioChainHandle } from './audioEffectChain';
import { filterLayersForSolo } from './audioLaneSolo';
import { activeBrollLayers, defaultBrollOpacity } from './brollTimeline';
import { DEFAULT_COLOR_GRADE, mergeVideoPreviewStyle } from './colorGrade';
import { resolveSceneClipVideoUrl, sceneDuration, segmentVideoUrl, timecode } from './editorUtils';
import { secondsFromPercent } from './playheadScrub';
import {
  fadeBlackOverlayOpacity,
  incomingLayerStyle,
  incomingLocalTimeSec,
  mergeInspectorOpacity,
  outgoingLayerStyle,
  transitionDurationSec,
  transitionUsesOverlap,
  transitionWindowProgress,
} from './sceneTransitionPreview';
import { activeSubtitleCue, SubtitleOverlay } from './SubtitleOverlay';
import type { AudioSoloTarget, ClipInspectorState, EditorAspectRatio, EpisodeTimelineSegment, SubtitleCue, SubtitleStyle, TimelineAudioLayer, TimelineBrollLayer, TimelineTool, TransitionKind } from './types';

type TimelineClip = {
  scene: EpisodeSceneCard;
  url: string;
};

type ActiveAudioRef = {
  audio?: HTMLAudioElement;
  chain?: AudioChainHandle;
  timeoutId?: number;
  stopTimeoutId?: number;
  layerVolume: number;
  layerId: string;
};

function gainToLinear(gainDb: number) {
  return Math.pow(10, gainDb / 20);
}

function HubButton({
  label,
  children,
  disabled,
  onClick,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[var(--color-ash-brown)] shadow-sm ring-1 ring-border hover:bg-[var(--color-tea-green)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function PlayerControlHub({
  aspectRatio,
  scenes,
  activeSegments,
  selectedScene,
  sceneSelectionVersion,
  playheadSec,
  selectedSegment,
  finalVideoUrl,
  inspector,
  subtitleCues = [],
  subtitleStyle,
  transitions,
  sceneAudioMuted,
  audioLayers,
  audioSolo = null,
  brollLayers,
  onAspectRatioChange,
  onInspectorChange,
  onToolChange,
  onGenerateSubtitles,
  onRegenerateClip,
  onPlayheadChange,
  onSelectScene,
}: {
  aspectRatio: EditorAspectRatio;
  scenes: EpisodeSceneCard[];
  activeSegments: EpisodeTimelineSegment[];
  selectedScene?: EpisodeSceneCard;
  sceneSelectionVersion: number;
  playheadSec: number;
  selectedSegment?: EpisodeTimelineSegment;
  finalVideoUrl?: string;
  inspector: ClipInspectorState;
  subtitleCues?: SubtitleCue[];
  subtitleStyle?: SubtitleStyle;
  transitions: Record<string, TransitionKind>;
  sceneAudioMuted: Record<string, boolean>;
  audioLayers: TimelineAudioLayer[];
  audioSolo?: AudioSoloTarget;
  brollLayers: TimelineBrollLayer[];
  onAspectRatioChange: (aspectRatio: EditorAspectRatio) => void;
  onInspectorChange: (patch: Partial<ClipInspectorState>) => void;
  onToolChange: (tool: TimelineTool) => void;
  onGenerateSubtitles: () => void;
  onRegenerateClip: (scene: EpisodeSceneCard) => void;
  onPlayheadChange: (seconds: number) => void;
  onSelectScene?: (sceneId: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nextVideoRef = useRef<HTMLVideoElement | null>(null);
  const monitorTimelineRef = useRef<HTMLDivElement | null>(null);
  const monitorRulerRef = useRef<HTMLDivElement | null>(null);
  const suppressPauseStateRef = useRef(false);
  const advancingClipRef = useRef(false);
  const hubSceneJumpRef = useRef(false);
  const transitionActiveRef = useRef(false);
  const transitionKindRef = useRef<TransitionKind>('cut');
  const pendingNextClipRef = useRef<TimelineClip | null>(null);
  const resumeLocalTimeRef = useRef<number | null>(null);
  const shouldResumePlaybackRef = useRef(false);
  const isPlayingRef = useRef(false);
  const lastNotifiedSceneRef = useRef('');
  const overlaySyncRef = useRef<{ absoluteStart: number; windowEnd: number; layersKey: string } | null>(null);
  const audioLayersKey = useMemo(
    () => `${audioLayersSignature(audioLayers)}|solo:${audioSolo ? `${audioSolo.track}-${audioSolo.lane}` : 'off'}`,
    [audioLayers, audioSolo],
  );
  const audioRefs = useRef<ActiveAudioRef[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentSceneId, setCurrentSceneId] = useState(selectedScene?.id ?? scenes[0]?.id ?? '');
  const [videoFallbackSrc, setVideoFallbackSrc] = useState<string | undefined>();
  const [videoPlaybackError, setVideoPlaybackError] = useState(false);
  const [transitionActive, setTransitionActive] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [activeTransitionKind, setActiveTransitionKind] = useState<TransitionKind>('cut');
  const segmentsByScene = useMemo(() => {
    const map = new Map<number, EpisodeTimelineSegment>();
    activeSegments.forEach((segment) => map.set(segment.sceneNumber, segment));
    return map;
  }, [activeSegments]);
  const timelineClips = useMemo(
    () =>
      scenes
        .map((scene) => ({
          scene,
          url: resolveSceneClipVideoUrl(scene, segmentsByScene.get(scene.sceneNumber)),
        }))
        .filter((clip) => Boolean(clip.url)),
    [scenes, segmentsByScene],
  );
  const currentScene = scenes.find((scene) => scene.id === currentSceneId) ?? selectedScene;
  const currentClip = timelineClips.find((clip) => clip.scene.id === currentSceneId);
  const currentIndex = currentClip ? timelineClips.findIndex((clip) => clip.scene.id === currentClip.scene.id) : -1;
  const upcomingClip = currentIndex >= 0 && currentIndex < timelineClips.length - 1 ? timelineClips[currentIndex + 1] : undefined;
  const selectedSegmentUrl = selectedScene?.id === currentScene?.id ? segmentVideoUrl(selectedSegment) : '';
  const useMasterPreview = Boolean(finalVideoUrl?.trim() && timelineClips.length === 0 && !selectedSegmentUrl);
  const activeVideoUrl = useMasterPreview
    ? finalVideoUrl!
    : currentClip?.url
      || selectedSegmentUrl
      || currentScene?.sceneVideoUrl
      || finalVideoUrl
      || '';
  const { src: protectedActiveVideoUrl, loading: activeVideoLoading, error: activeVideoError } = useProtectedMediaSrc(activeVideoUrl || undefined);
  const { src: protectedNextVideoUrl } = useProtectedMediaSrc(
    !useMasterPreview && upcomingClip?.url ? upcomingClip.url : undefined,
  );
  const monitorVideoSrc = videoFallbackSrc || protectedActiveVideoUrl;
  const activeScene = currentScene;
  const outgoingTransition = currentClip ? transitions[currentClip.scene.id] ?? 'cut' : 'cut';
  const activeTransition = transitionActive ? activeTransitionKind : outgoingTransition;
  const activeBroll = activeBrollLayers(brollLayers, playheadSec)[0];
  const totalDuration = Math.max(10, ...scenes.map((scene) => scene.endSec));
  const absolutePlayhead = playheadSec;
  const monitorTicks = Array.from({ length: Math.floor(totalDuration) + 1 }, (_, index) => index);

  function secondTimecode(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function cancelTransition() {
    transitionActiveRef.current = false;
    pendingNextClipRef.current = null;
    setTransitionActive(false);
    setTransitionProgress(0);
    if (nextVideoRef.current) {
      nextVideoRef.current.pause();
    }
  }

  function applyPreviewToVideo(video: HTMLVideoElement, scene?: EpisodeSceneCard) {
    const sceneMuted = muted || Boolean(scene && sceneAudioMuted[scene.id]);
    video.muted = sceneMuted;
    video.playbackRate = inspector.speed;
    const baseVol = sceneMuted ? 0 : (volume / 100) * gainToLinear(inspector.gain);
    video.volume = Math.min(1, Math.max(0, baseVol));
  }

  function notifySceneChangeDuringPlayback(sceneId: string) {
    if (!sceneId || lastNotifiedSceneRef.current === sceneId) return;
    lastNotifiedSceneRef.current = sceneId;
    hubSceneJumpRef.current = true;
    onSelectScene?.(sceneId);
  }

  function setPlayingState(playing: boolean) {
    isPlayingRef.current = playing;
    setIsPlaying(playing);
  }

  function adoptIncomingAsMain(incomingTime: number, nextScene: EpisodeSceneCard) {
    const main = videoRef.current;
    const incoming = nextVideoRef.current;
    if (!main || !incoming?.src) return false;

    const wasPlaying = isPlayingRef.current || !main.paused;
    suppressPauseStateRef.current = true;

    const finish = () => {
      try {
        main.currentTime = incomingTime;
      } catch {
        // Metadata may not be ready yet.
      }
      incoming.pause();
      cancelTransition();
      setCurrentSceneId(nextScene.id);
      notifySceneChangeDuringPlayback(nextScene.id);
      onPlayheadChange(nextScene.startSec + incomingTime);
      suppressPauseStateRef.current = false;
      if (wasPlaying) {
        void main.play().catch(() => undefined);
        setPlayingState(true);
        playOverlayAudioFrom(nextScene.startSec + incomingTime, totalDuration);
      }
    };

    if (main.src !== incoming.src) {
      main.src = incoming.src;
      main.addEventListener('loadedmetadata', finish, { once: true });
      try {
        main.load();
      } catch {
        finish();
      }
    } else {
      finish();
    }
    return true;
  }

  function jumpToScene(scene: EpisodeSceneCard) {
    hubSceneJumpRef.current = true;
    onSelectScene?.(scene.id);
    seekToAbsolute(scene.startSec, { autoplay: true });
  }

  function sceneForSecond(seconds: number) {
    return scenes.find((scene) => seconds >= scene.startSec && seconds < scene.endSec) ?? scenes[scenes.length - 1];
  }

  function seekToAbsolute(seconds: number, options?: { autoplay?: boolean }) {
    cancelTransition();
    const bounded = Math.min(totalDuration, Math.max(0, seconds));
    const scene = sceneForSecond(bounded);
    if (!scene) return;
    const localTime = useMasterPreview ? bounded : Math.max(0, bounded - scene.startSec);
    const shouldPlay = options?.autoplay ?? isPlayingRef.current;
    lastNotifiedSceneRef.current = scene.id;
    setCurrentSceneId(scene.id);
    stopOverlayAudio();
    onPlayheadChange(bounded);
    window.setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      suppressPauseStateRef.current = true;
      try {
        video.currentTime = localTime;
      } catch {
        // Some streams need metadata before seeking; the next interaction will retry.
      }
      suppressPauseStateRef.current = false;
      if (shouldPlay) {
        void video.play().catch(() => undefined);
        setPlayingState(true);
        playOverlayAudioFrom(bounded, totalDuration);
      }
    }, 40);
  }

  function startMonitorScrub(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const rect = monitorRulerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const updateFromPointer = (clientX: number) => seekToAbsolute(secondsFromPercent(clientX, rect, totalDuration));
    updateFromPointer(event.clientX);
    const handleMove = (moveEvent: globalThis.PointerEvent) => updateFromPointer(moveEvent.clientX);
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  }

  useEffect(() => {
    setVideoFallbackSrc(undefined);
    setVideoPlaybackError(false);
  }, [activeVideoUrl]);

  useEffect(() => {
    if (timelineClips.length === 0) return;
    if (!timelineClips.some((clip) => clip.scene.id === currentSceneId)) {
      setCurrentSceneId(timelineClips[0]!.scene.id);
      lastNotifiedSceneRef.current = timelineClips[0]!.scene.id;
    }
  }, [timelineClips, currentSceneId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !monitorVideoSrc) return;

    const resume = shouldResumePlaybackRef.current;
    shouldResumePlaybackRef.current = false;
    const sceneStart = activeScene?.startSec ?? 0;
    const localTime = resumeLocalTimeRef.current ?? (useMasterPreview ? playheadSec : Math.max(0, playheadSec - sceneStart));
    resumeLocalTimeRef.current = null;

    const applySeek = () => {
      try {
        video.currentTime = localTime;
      } catch {
        // Metadata may not be ready yet.
      }
      suppressPauseStateRef.current = false;
      if (resume || isPlayingRef.current) {
        void video.play().catch(() => undefined);
        setPlayingState(true);
      }
    };

    suppressPauseStateRef.current = true;
    if (video.src !== monitorVideoSrc) {
      video.src = monitorVideoSrc;
      video.addEventListener('loadedmetadata', applySeek, { once: true });
      try {
        video.load();
      } catch {
        applySeek();
      }
      return;
    }

    if (video.readyState >= 1) applySeek();
    else video.addEventListener('loadedmetadata', applySeek, { once: true });
  }, [monitorVideoSrc, useMasterPreview]);

  useEffect(() => {
    if (useMasterPreview || timelineClips.length === 0 || isPlayingRef.current) return;
    const playingScene = sceneForSecond(playheadSec);
    const clipForPlayhead = timelineClips.find((clip) => clip.scene.id === playingScene?.id)
      ?? timelineClips.find((clip) => playheadSec >= clip.scene.startSec && playheadSec < clip.scene.endSec);
    if (clipForPlayhead && clipForPlayhead.scene.id !== currentSceneId) {
      setCurrentSceneId(clipForPlayhead.scene.id);
    }
  }, [playheadSec, timelineClips, useMasterPreview, currentSceneId, scenes]);

  useEffect(() => {
    if (!selectedScene?.id) return;
    if (hubSceneJumpRef.current) {
      hubSceneJumpRef.current = false;
      return;
    }
    setCurrentSceneId(selectedScene.id);
    const bounded = selectedScene.startSec;
    onPlayheadChange(bounded);
    window.setTimeout(() => {
      const video = videoRef.current;
      if (!video || !monitorVideoSrc) return;
      suppressPauseStateRef.current = true;
      try {
        video.currentTime = useMasterPreview ? bounded : 0;
      } catch {
        // Metadata may not be ready yet.
      }
      suppressPauseStateRef.current = false;
      if (isPlayingRef.current) {
        void video.play().catch(() => undefined);
        playOverlayAudioFrom(bounded, totalDuration);
      }
    }, 40);
  }, [sceneSelectionVersion]);

  useEffect(() => {
    if (isPlaying) return;
    const video = videoRef.current;
    const currentAbsolute = (activeScene?.startSec ?? 0) + (video?.currentTime ?? 0);
    if (Math.abs(playheadSec - currentAbsolute) < 0.35) return;
    seekToAbsolute(playheadSec);
  }, [playheadSec, isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    applyPreviewToVideo(video, activeScene);
    if (nextVideoRef.current && transitionActiveRef.current) {
      applyPreviewToVideo(nextVideoRef.current, pendingNextClipRef.current?.scene);
    }
  }, [inspector.speed, inspector.gain, volume, muted, activeScene, sceneAudioMuted, transitionActive]);

  useEffect(() => {
    if (!isPlaying || !activeScene) return;
    const absoluteTime = useMasterPreview
      ? (videoRef.current?.currentTime ?? playheadSec)
      : activeScene.startSec + (videoRef.current?.currentTime ?? 0);
    const prev = overlaySyncRef.current;
    if (prev && prev.layersKey === audioLayersKey && Math.abs(prev.absoluteStart - absoluteTime) < 0.2 && prev.windowEnd === totalDuration) {
      return;
    }
    playOverlayAudioFrom(absoluteTime, totalDuration);
  }, [audioLayersKey, isPlaying, activeScene?.id, totalDuration, useMasterPreview]);

  useEffect(() => () => stopOverlayAudio(), []);

  function stopOverlayAudio() {
    overlaySyncRef.current = null;
    audioRefs.current.forEach((entry) => {
      if (entry.timeoutId) window.clearTimeout(entry.timeoutId);
      if (entry.stopTimeoutId) window.clearTimeout(entry.stopTimeoutId);
      entry.chain?.disconnect();
      if (entry.audio) {
        entry.audio.pause();
        entry.audio.src = '';
      }
    });
    audioRefs.current = [];
  }

  function syncOverlayChain(entry: ActiveAudioRef, layer: TimelineAudioLayer) {
    const layerGain = effectiveAudioVolume(layer.volume, volume);
    if (entry.chain) {
      entry.chain.applyFx(layer.fx);
      entry.chain.setLayerGain(layerGain);
      entry.chain.setMuted(muted);
    }
    entry.layerVolume = layer.volume;
  }

  function playOverlayAudioFrom(absoluteStartSec: number, windowEndSec: number) {
    const layersKey = audioLayersKey;
    overlaySyncRef.current = { absoluteStart: absoluteStartSec, windowEnd: windowEndSec, layersKey };

    const audibleLayers = filterLayersForSolo(audioLayers, audioSolo ?? null);
    const scheduled = scheduledAudioLayers(audibleLayers, absoluteStartSec, windowEndSec);
    const scheduledIds = new Set(scheduled.map((item) => item.layer.id));
    const layerById = new Map(audibleLayers.map((layer) => [layer.id, layer]));

    audioRefs.current = audioRefs.current.filter((entry) => {
      if (scheduledIds.has(entry.layerId) && entry.audio && !entry.audio.paused) {
        const layer = layerById.get(entry.layerId);
        if (layer) syncOverlayChain(entry, layer);
        return true;
      }
      if (entry.timeoutId) window.clearTimeout(entry.timeoutId);
      if (entry.stopTimeoutId) window.clearTimeout(entry.stopTimeoutId);
      entry.chain?.disconnect();
      if (entry.audio) {
        entry.audio.pause();
        entry.audio.src = '';
      }
      return false;
    });

    const activeIds = new Set(audioRefs.current.map((entry) => entry.layerId));
    scheduled
      .filter((item) => !activeIds.has(item.layer.id))
      .forEach((scheduledLayer) => {
      const entry: ActiveAudioRef = { layerVolume: scheduledLayer.layer.volume, layerId: scheduledLayer.layer.id };
      const start = () => {
        void (async () => {
          // Use blob URLs for all overlay audio (tts/music/sfx). Stream URLs in
          // <audio src> fail under cross-site CORP; fetchΓåÆblob is CORS-safe.
          const playbackUrl = await resolveProtectedAudioPlaybackUrl(scheduledLayer.layer.url);
          if (!playbackUrl) return;

          const audio = new Audio();
          entry.audio = audio;
          const layerGain = effectiveAudioVolume(scheduledLayer.layer.volume, volume);
          audio.preload = 'auto';
          audio.controls = false;
          audio.setAttribute('controlsList', 'nodownload noremoteplayback');
          audio.draggable = false;
          entry.chain = connectAudioWithFx(audio, scheduledLayer.layer.fx, layerGain);
          entry.chain.setMuted(muted);
          audio.src = playbackUrl;
          audio.addEventListener('error', () => undefined, { once: true });
          const startAudio = () => {
            void resumeAudioContext().then(() => {
              try {
                audio.currentTime = scheduledLayer.offsetSec;
              } catch {
                // Some browsers reject currentTime before enough metadata is available.
              }
              void audio.play().catch(() => undefined);
            });
            if (scheduledLayer.playForMs > 0) {
              entry.stopTimeoutId = window.setTimeout(() => {
                audio.pause();
              }, scheduledLayer.playForMs);
            }
          };
          if (audio.readyState >= 2) startAudio();
          else audio.addEventListener('canplay', startAudio, { once: true });
          try {
            audio.load();
          } catch {
            // Browser audio loading is best effort for local preview blobs.
          }
        })();
      };
      if (scheduledLayer.delayMs > 50) entry.timeoutId = window.setTimeout(start, scheduledLayer.delayMs);
      else start();
      audioRefs.current.push(entry);
    });
  }

  function handleMonitorVideoError() {
    const direct = directStudioMediaUrl(activeVideoUrl);
    if (direct && direct !== monitorVideoSrc) {
      setVideoFallbackSrc(direct);
      setVideoPlaybackError(false);
      return;
    }
    setVideoPlaybackError(true);
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video || !monitorVideoSrc) return;
    if (video.paused) {
      void resumeAudioContext();
      void video.play();
      if (transitionActiveRef.current) {
        void nextVideoRef.current?.play().catch(() => undefined);
      }
      const absoluteStart = useMasterPreview
        ? video.currentTime
        : (activeScene?.startSec ?? 0) + video.currentTime;
      playOverlayAudioFrom(absoluteStart, totalDuration);
      setPlayingState(true);
    } else {
      video.pause();
      nextVideoRef.current?.pause();
      cancelTransition();
      stopOverlayAudio();
      setPlayingState(false);
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    audioRefs.current.forEach((entry) => {
      entry.chain?.setMuted(next);
    });
  }

  function updateVolume(next: number) {
    setVolume(next);
    const sceneMuted = muted || Boolean(activeScene && sceneAudioMuted[activeScene.id]);
    const nextSceneMuted = muted || Boolean(upcomingClip && sceneAudioMuted[upcomingClip.scene.id]);
    const mainVol = sceneMuted ? 0 : Math.min(1, Math.max(0, (next / 100) * gainToLinear(inspector.gain)));
    if (videoRef.current) videoRef.current.volume = mainVol;
    if (nextVideoRef.current) nextVideoRef.current.volume = nextSceneMuted ? 0 : mainVol;
    audioRefs.current.forEach((entry) => {
      const layerGain = effectiveAudioVolume(entry.layerVolume, next);
      entry.chain?.setLayerGain(layerGain);
    });
  }

  function beginSceneTransition(next: TimelineClip, kind: TransitionKind, progress: number) {
    const nextVideo = nextVideoRef.current;
    if (!nextVideo || !protectedNextVideoUrl || !currentClip) {
      hardCutToNextClip();
      return;
    }

    transitionActiveRef.current = true;
    transitionKindRef.current = kind;
    pendingNextClipRef.current = next;
    setTransitionActive(true);
    setActiveTransitionKind(kind);
    setTransitionProgress(progress);

    const slotDuration = sceneDuration(currentClip.scene);
    const localTime = Math.min(videoRef.current?.currentTime ?? 0, slotDuration);
    const incomingTime = incomingLocalTimeSec(localTime, slotDuration, kind);

    applyPreviewToVideo(nextVideo, next.scene);
    if (nextVideo.readyState >= 1) {
      try {
        nextVideo.currentTime = incomingTime;
      } catch {
        // Metadata may not be ready yet.
      }
    } else {
      nextVideo.addEventListener('loadedmetadata', () => {
        try {
          nextVideo.currentTime = incomingTime;
        } catch {
          // Metadata may not be ready yet.
        }
      }, { once: true });
    }
    void nextVideo.play().catch(() => undefined);
  }

  function syncTransitionPlayback(
    progress: number,
    kind: TransitionKind,
    slotDuration: number,
    localTime: number,
  ) {
    setTransitionProgress(progress);
    const nextVideo = nextVideoRef.current;
    if (!nextVideo) return;
    const incomingTime = incomingLocalTimeSec(localTime, slotDuration, kind);
    if (Math.abs(nextVideo.currentTime - incomingTime) > 0.2) {
      try {
        nextVideo.currentTime = incomingTime;
      } catch {
        // Seek may fail while metadata is loading.
      }
    }
    if (nextVideo.paused) {
      void nextVideo.play().catch(() => undefined);
    }
  }

  function completeSceneTransition() {
    if (!transitionActiveRef.current || advancingClipRef.current) return;
    const next = pendingNextClipRef.current ?? upcomingClip;
    if (!next || !currentClip) return;

    const kind = transitionKindRef.current;
    const slotDuration = sceneDuration(currentClip.scene);
    const localTime = Math.min(videoRef.current?.currentTime ?? 0, slotDuration);
    const incomingTime = incomingLocalTimeSec(localTime, slotDuration, kind);

    advancingClipRef.current = true;
    transitionActiveRef.current = false;
    pendingNextClipRef.current = null;
    setTransitionActive(false);
    setTransitionProgress(0);

    const adopted = adoptIncomingAsMain(incomingTime, next.scene);
    if (!adopted) {
      shouldResumePlaybackRef.current = isPlayingRef.current || !videoRef.current?.paused;
      resumeLocalTimeRef.current = incomingTime;
      setCurrentSceneId(next.scene.id);
      notifySceneChangeDuringPlayback(next.scene.id);
      onPlayheadChange(next.scene.startSec + incomingTime);
    }

    window.setTimeout(() => {
      advancingClipRef.current = false;
    }, 80);
  }

  function hardCutToNextClip() {
    if (advancingClipRef.current || useMasterPreview) return;
    if (currentIndex < 0 || currentIndex >= timelineClips.length - 1) return;

    advancingClipRef.current = true;
    const next = timelineClips[currentIndex + 1]!;
    const wasPlaying = isPlayingRef.current || !videoRef.current?.paused;

    if (nextVideoRef.current && protectedNextVideoUrl) {
      try {
        nextVideoRef.current.currentTime = 0;
      } catch {
        // Metadata may not be ready yet.
      }
      if (adoptIncomingAsMain(0, next.scene)) {
        window.setTimeout(() => {
          advancingClipRef.current = false;
        }, 80);
        return;
      }
    }

    cancelTransition();
    shouldResumePlaybackRef.current = wasPlaying;
    suppressPauseStateRef.current = true;
    resumeLocalTimeRef.current = 0;
    setCurrentSceneId(next.scene.id);
    notifySceneChangeDuringPlayback(next.scene.id);
    onPlayheadChange(next.scene.startSec);

    window.setTimeout(() => {
      const video = videoRef.current;
      suppressPauseStateRef.current = false;
      if (video && wasPlaying) {
        void video.play().catch(() => undefined);
        setPlayingState(true);
        playOverlayAudioFrom(next.scene.startSec, totalDuration);
      }
      advancingClipRef.current = false;
    }, 120);
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;

    if (useMasterPreview) {
      const absolute = Math.min(totalDuration, Math.max(0, video.currentTime));
      onPlayheadChange(absolute);
      const scene = sceneForSecond(absolute);
      if (scene && scene.id !== currentSceneId) setCurrentSceneId(scene.id);
      return;
    }

    if (!currentClip) {
      if (timelineClips[0]) {
        setCurrentSceneId(timelineClips[0].scene.id);
      }
      return;
    }

    const slotDuration = sceneDuration(currentClip.scene);
    const localTime = Math.min(video.currentTime, slotDuration);
    const outgoingKind = transitions[currentClip.scene.id] ?? 'cut';
    const progress = transitionWindowProgress(localTime, slotDuration, outgoingKind);
    const hasNext = currentIndex >= 0 && currentIndex < timelineClips.length - 1;
    const nextClip = hasNext ? timelineClips[currentIndex + 1] : undefined;

    if (progress !== null && hasNext && nextClip) {
      if (!transitionActiveRef.current) {
        beginSceneTransition(nextClip, outgoingKind, progress);
      }
      syncTransitionPlayback(progress, outgoingKind, slotDuration, localTime);
      onPlayheadChange(currentClip.scene.startSec + localTime);
      if (progress >= 0.985 || localTime >= slotDuration - 0.02) {
        completeSceneTransition();
      }
      return;
    }

    if (transitionActiveRef.current) {
      completeSceneTransition();
      return;
    }

    onPlayheadChange(currentClip.scene.startSec + localTime);
    notifySceneChangeDuringPlayback(currentClip.scene.id);

    if (advancingClipRef.current) return;

    if (!hasNext) {
      if (localTime >= slotDuration - 0.05) {
        video.pause();
        stopOverlayAudio();
        setPlayingState(false);
      }
      return;
    }

    if (!transitionUsesOverlap(outgoingKind) && localTime >= slotDuration - 0.05) {
      hardCutToNextClip();
      return;
    }

    if (transitionUsesOverlap(outgoingKind) && slotDuration <= transitionDurationSec(outgoingKind) && localTime >= slotDuration - 0.05) {
      hardCutToNextClip();
    }
  }

  function handleEnded() {
    if (transitionActiveRef.current) return;
    if (useMasterPreview) {
      stopOverlayAudio();
      setPlayingState(false);
      return;
    }
    if (currentIndex >= 0 && currentIndex < timelineClips.length - 1) {
      hardCutToNextClip();
    } else {
      stopOverlayAudio();
      setPlayingState(false);
    }
  }

  const outgoingVideoStyle = transitionActive
    ? mergeVideoPreviewStyle(
        inspector.colorGrade ?? DEFAULT_COLOR_GRADE,
        inspector.opacity,
        mergeInspectorOpacity(outgoingLayerStyle(activeTransitionKind, transitionProgress), inspector.opacity),
      )
    : mergeVideoPreviewStyle(inspector.colorGrade ?? DEFAULT_COLOR_GRADE, inspector.opacity);

  const incomingVideoStyle = transitionActive
    ? mergeVideoPreviewStyle(
        inspector.colorGrade ?? DEFAULT_COLOR_GRADE,
        inspector.opacity,
        mergeInspectorOpacity(incomingLayerStyle(activeTransitionKind, transitionProgress), inspector.opacity),
      )
    : mergeVideoPreviewStyle(inspector.colorGrade ?? DEFAULT_COLOR_GRADE, inspector.opacity, { opacity: 0 });

  const activeSubtitle = activeSubtitleCue(subtitleCues, absolutePlayhead);
  const videoFitClass = aspectRatio === '16:9' ? 'object-cover' : 'object-contain';

  return (
    <div className="rounded-xl border border-border bg-[var(--color-ash-brown)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-vanilla-cream)]/70">Composition Monitor Hub</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-vanilla-cream)]">
            {timelineClips.length > 1
              ? `Continuous preview ┬╖ Scene ${activeScene?.sceneNumber ?? '-'} of ${timelineClips.length}`
              : activeScene
                ? `Timeline playback: Scene ${activeScene.sceneNumber}`
                : selectedScene
                  ? `Scene ${selectedScene.sceneNumber}`
                  : 'No scene selected'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HubButton label={isPlaying ? 'Pause preview' : 'Play preview'} disabled={!monitorVideoSrc || activeVideoLoading} onClick={togglePlayback}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </HubButton>
          <div className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-border">
            <button type="button" aria-label={muted ? 'Unmute preview' : 'Mute preview'} onClick={toggleMute} className="text-[var(--color-ash-brown)]">
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input aria-label="Preview volume" type="range" min={0} max={100} value={volume} onChange={(event) => updateVolume(Number(event.target.value))} className="w-20 accent-[var(--color-muted-olive)]" />
          </div>
          <HubButton label="Blade active clip at playhead" onClick={() => onToolChange('blade')}><Scissors size={16} /></HubButton>
          <HubButton label="Trim or squeeze active clip" onClick={() => onToolChange('speed')}><Shrink size={16} /></HubButton>
          <HubButton label="Generate synchronized subtitles" onClick={onGenerateSubtitles}><Captions size={16} /></HubButton>
          <HubButton label="Regenerate highlighted clip" disabled={!selectedScene} onClick={() => selectedScene && onRegenerateClip(selectedScene)}><RefreshCcw size={16} /></HubButton>
          <div className="inline-flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-border">
            <Maximize2 size={14} className="ml-1 text-[var(--color-ash-brown)]" />
            {(['9:16', '16:9'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onAspectRatioChange(option)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${aspectRatio === option ? 'bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]' : 'text-dark'}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`mx-auto mt-4 flex max-h-[420px] cursor-pointer items-center justify-center overflow-hidden rounded-xl ${aspectRatio === '16:9' ? 'bg-[var(--color-ash-brown)]' : 'bg-black'} ${protectedMediaSurfaceClass} ${aspectRatio === '9:16' ? 'aspect-[9/16] w-full max-w-[236px]' : 'aspect-video w-full max-w-none'}`}
        onClick={togglePlayback}
        onContextMenu={preventMediaContextMenu}
        title={isPlaying ? 'Pause preview' : 'Play preview'}
      >
        {activeVideoLoading ? (
          <div className="flex h-full min-h-[12rem] w-full items-center justify-center text-[var(--color-vanilla-cream)]/80">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : monitorVideoSrc ? (
          <div className="relative h-full w-full overflow-hidden">
            <video
              key={useMasterPreview ? 'master-preview' : 'timeline-continuous-preview'}
              ref={videoRef}
              {...protectedVideoProps}
              preload="auto"
              src={monitorVideoSrc}
              muted={muted || Boolean(activeScene && sceneAudioMuted[activeScene.id])}
              onPlay={() => setPlayingState(true)}
              onPause={() => {
                if (!suppressPauseStateRef.current) setPlayingState(false);
              }}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onError={handleMonitorVideoError}
              className={`h-full w-full ${videoFitClass}`}
              style={outgoingVideoStyle}
            />
            {!useMasterPreview && protectedNextVideoUrl && (
              <video
                key={`incoming-${upcomingClip?.scene.id ?? 'next'}`}
                ref={nextVideoRef}
                {...protectedVideoProps}
                preload="auto"
                src={protectedNextVideoUrl}
                muted={muted || Boolean(upcomingClip && sceneAudioMuted[upcomingClip.scene.id])}
                className={`pointer-events-none absolute inset-0 h-full w-full ${videoFitClass}`}
                style={incomingVideoStyle}
              />
            )}
            {subtitleStyle && activeSubtitle && (
              <SubtitleOverlay cue={activeSubtitle} style={subtitleStyle} playheadSec={absolutePlayhead} />
            )}
            {transitionActive && activeTransitionKind === 'fade-black' && (
              <div
                className="pointer-events-none absolute inset-0 z-10 bg-black"
                style={{ opacity: fadeBlackOverlayOpacity(transitionProgress) }}
              />
            )}
            {videoPlaybackError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-xs font-medium text-white/85">
                Preview stream failed. Refresh the page or regenerate the clip.
              </div>
            )}
            {timelineClips.length > 1 && (
              <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold text-white">
                {currentIndex + 1}/{timelineClips.length} | {activeTransition.replace('-', ' ')}
              </div>
            )}
            {activeBroll && (
              <div
                className="pointer-events-none absolute right-3 top-3 max-w-[72%] overflow-hidden rounded-lg border border-white/25 bg-black/55 px-3 py-2 text-left text-white shadow-lg backdrop-blur"
                style={{ opacity: defaultBrollOpacity(activeBroll.opacity) / 100 }}
              >
                {activeBroll.sourceUrl ? (
                  <img src={activeBroll.sourceUrl} alt={activeBroll.label} className="max-h-28 rounded-md object-cover" />
                ) : (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">B-roll overlay</p>
                    <p className="mt-1 text-xs font-semibold">{activeBroll.label}</p>
                  </>
                )}
              </div>
            )}
          </div>
        ) : activeVideoUrl && activeVideoError ? (
          <div className="px-8 text-center">
            <Play size={38} className="mx-auto text-[var(--color-vanilla-cream)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--color-vanilla-cream)]">Protected preview unavailable</p>
            <p className="mt-1 text-xs text-[var(--color-vanilla-cream)]/70">Refresh the editor and try again.</p>
          </div>
        ) : (
          <div className="px-8 text-center">
            <Play size={38} className="mx-auto text-[var(--color-vanilla-cream)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--color-vanilla-cream)]">Timeline preview</p>
            <p className="mt-1 text-xs text-[var(--color-vanilla-cream)]/70">Rendered scene clips and the compiled master appear here.</p>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-border">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Monitor timeline</span>
          <span className="rounded-full bg-[var(--color-tea-green)]/35 px-2 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">{timecode(absolutePlayhead)} / {timecode(totalDuration)}</span>
        </div>
        <div
          ref={monitorTimelineRef}
          className="relative h-10 overflow-hidden rounded-lg border border-border bg-[var(--color-faded-copper)]/10"
        >
          {scenes.map((scene) => {
            const left = `${(scene.startSec / totalDuration) * 100}%`;
            const width = `${(sceneDuration(scene) / totalDuration) * 100}%`;
            const active = activeScene?.id === scene.id;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => jumpToScene(scene)}
                className={`absolute top-0 flex h-full cursor-pointer items-center justify-center border-r border-white/70 px-1 text-[9px] font-semibold ${active ? 'bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]' : 'bg-[var(--color-tea-green)]/45 text-[var(--color-ash-brown)] hover:bg-[var(--color-tea-green)]/65'}`}
                style={{ left, width }}
                title={`Play from Scene ${scene.sceneNumber}: ${timecode(scene.startSec)} - ${timecode(scene.endSec)}`}
              >
                S{scene.sceneNumber}
              </button>
            );
          })}
          <div
            className="pointer-events-none absolute top-0 z-20 h-full w-0.5 bg-[var(--color-faded-copper)] shadow"
            style={{ left: `${Math.min(100, Math.max(0, (absolutePlayhead / totalDuration) * 100))}%` }}
          />
          <div
            className="pointer-events-none absolute top-1/2 z-30 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-faded-copper)] shadow"
            style={{ left: `${Math.min(100, Math.max(0, (absolutePlayhead / totalDuration) * 100))}%` }}
          />
        </div>
        <div
          ref={monitorRulerRef}
          className="relative mt-1 h-8 cursor-ew-resize overflow-hidden"
          onPointerDown={startMonitorScrub}
          title="Drag to scrub playback"
        >
          {monitorTicks.map((tick) => (
            <button
              key={`monitor-time-${tick}`}
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                seekToAbsolute(tick);
              }}
              className={`absolute top-0 -translate-x-1/2 border-l border-border pl-1 text-[8px] font-semibold text-muted hover:text-[var(--color-ash-brown)] ${tick % 5 === 0 ? 'h-8 opacity-100' : 'h-3 opacity-80'}`}
              style={{ left: `${Math.min(100, (tick / totalDuration) * 100)}%` }}
              title={secondTimecode(tick)}
            >
              <span className={tick % 5 === 0 || totalDuration <= 30 ? 'block' : 'hidden'}>{secondTimecode(tick)}</span>
            </button>
          ))}
          <div
            className="pointer-events-none absolute top-0 z-20 h-full w-0.5 bg-[var(--color-faded-copper)]/70"
            style={{ left: `${Math.min(100, Math.max(0, (absolutePlayhead / totalDuration) * 100))}%` }}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-2 rounded-xl bg-white/8 p-3 md:grid-cols-3">
        <label className="text-[11px] font-semibold text-[var(--color-vanilla-cream)]/80">
          Speed Ripple
          <input type="range" min={0.5} max={2} step={0.1} value={inspector.speed} onChange={(event) => onInspectorChange({ speed: Number(event.target.value) })} className="mt-1 w-full accent-[var(--color-tea-green)]" />
        </label>
        <label className="text-[11px] font-semibold text-[var(--color-vanilla-cream)]/80">
          Clip Opacity
          <input type="range" min={0} max={100} value={inspector.opacity} onChange={(event) => onInspectorChange({ opacity: Number(event.target.value) })} className="mt-1 w-full accent-[var(--color-tea-green)]" />
        </label>
        <label className="text-[11px] font-semibold text-[var(--color-vanilla-cream)]/80">
          Audio Gain
          <input type="range" min={-24} max={12} value={inspector.gain} onChange={(event) => onInspectorChange({ gain: Number(event.target.value) })} className="mt-1 w-full accent-[var(--color-tea-green)]" />
        </label>
      </div>
    </div>
  );
}
