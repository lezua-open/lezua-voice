import { useCallback, useRef } from 'react';
import { ATTACK, BAR_WEIGHTS, MAX_BAR, MIN_BAR, RELEASE, TARGET_SAMPLE_RATE } from '../constants';
import { clamp, downsampleBuffer, encodePcm } from '../audio-utils';

type UseAudioCaptureParams = {
  onWaveHeights: (next: number[]) => void;
};

export function useAudioCapture(params: UseAudioCaptureParams) {
  const waveformFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserDataRef = useRef<Uint8Array | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const muteGainRef = useRef<GainNode | null>(null);
  const smoothedLevelRef = useRef(0);

  const resetWaveform = useCallback(() => {
    params.onWaveHeights(BAR_WEIGHTS.map(() => MIN_BAR));
    smoothedLevelRef.current = 0;
  }, [params]);

  const stop = useCallback(async () => {
    if (waveformFrameRef.current) {
      window.cancelAnimationFrame(waveformFrameRef.current);
      waveformFrameRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (muteGainRef.current) {
      muteGainRef.current.disconnect();
      muteGainRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    analyserDataRef.current = null;
  }, []);

  const animateWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const analyserData = analyserDataRef.current;
    if (!analyser || !analyserData) return;

    const draw = () => {
      const currentAnalyser = analyserRef.current;
      const currentData = analyserDataRef.current;
      if (!currentAnalyser || !currentData) return;

      currentAnalyser.getByteTimeDomainData(currentData);
      let sum = 0;
      for (let i = 0; i < currentData.length; i += 1) {
        const normalized = (currentData[i] - 128) / 128;
        sum += normalized * normalized;
      }

      const rms = Math.sqrt(sum / currentData.length);
      const target = Math.min(1, rms * 5.2);
      const easing = target > smoothedLevelRef.current ? ATTACK : RELEASE;
      smoothedLevelRef.current += (target - smoothedLevelRef.current) * easing;

      params.onWaveHeights(
        BAR_WEIGHTS.map((weight) => {
          const jitter = 1 + (Math.random() * 0.08 - 0.04);
          const height = MIN_BAR + (MAX_BAR - MIN_BAR) * smoothedLevelRef.current * weight * jitter;
          return clamp(height, MIN_BAR, MAX_BAR);
        }),
      );

      waveformFrameRef.current = window.requestAnimationFrame(draw);
    };

    waveformFrameRef.current = window.requestAnimationFrame(draw);
  }, [params]);

  const start = useCallback(async (deviceId: string) => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : true,
    });
    mediaStreamRef.current = mediaStream;

    const AudioCtor =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    const audioContext = new AudioCtor();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    analyserRef.current = analyser;
    analyserDataRef.current = new Uint8Array(analyser.fftSize);

    const sourceNode = audioContext.createMediaStreamSource(mediaStream);
    sourceNodeRef.current = sourceNode;

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    const muteGain = audioContext.createGain();
    muteGain.gain.value = 0;
    muteGainRef.current = muteGain;

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const copied = new Float32Array(input);
      const downsampled = downsampleBuffer(copied, audioContext.sampleRate, TARGET_SAMPLE_RATE);
      const pcmChunk = encodePcm(downsampled);
      window.electronAPI.dashScopeAudioChunk(pcmChunk);
    };

    sourceNode.connect(analyser);
    sourceNode.connect(processor);
    processor.connect(muteGain);
    muteGain.connect(audioContext.destination);

    animateWaveform();
  }, [animateWaveform]);

  return {
    start,
    stop,
    resetWaveform,
  };
}
