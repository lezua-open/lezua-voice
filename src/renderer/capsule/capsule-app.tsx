import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BAR_WEIGHTS,
  MAX_WIDTH,
  MIN_WIDTH,
  STATUS_TEXT,
  type CapsuleViewState,
} from './constants';
import { clamp } from './audio-utils';
import { useAudioCapture } from './hooks/use-audio-capture';
import { injectText, refineTranscript } from './services/text-actions';
import { CapsuleView } from './components/capsule-view';

type LiveTranscriptPayload = {
  text?: string;
  isFinal?: boolean;
};

type CapsulePresentation = {
  badge: string;
  hint: string;
  text: string;
  subtle: boolean;
};

function getPresentation(
  state: CapsuleViewState,
  currentText: string,
  lastLiveTranscript: string,
): CapsulePresentation {
  const config = STATUS_TEXT[state];
  const text = currentText || lastLiveTranscript || config.fallback;

  return {
    badge: config.badge,
    hint: config.hint,
    text,
    subtle: config.subtle && !currentText,
  };
}

export function CapsuleApp() {
  const [viewState, setViewState] = useState<CapsuleViewState>('idle');
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [displayHint, setDisplayHint] = useState(STATUS_TEXT.idle.hint);
  const [displayBadge, setDisplayBadge] = useState(STATUS_TEXT.idle.badge);
  const [displaySubtle, setDisplaySubtle] = useState(true);
  const [waveHeights, setWaveHeights] = useState<number[]>(BAR_WEIGHTS.map(() => 4));
  const [capsuleWidth, setCapsuleWidth] = useState(MIN_WIDTH);

  const measurerRef = useRef<HTMLSpanElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const lastLiveTranscriptRef = useRef('');
  const recordingActiveRef = useRef(false);
  const viewStateRef = useRef<CapsuleViewState>('idle');

  const { start: startAudioCapture, stop: stopAudioCapture, resetWaveform } = useAudioCapture({
    onWaveHeights: setWaveHeights,
  });

  const presentation = useMemo(
    () => getPresentation(viewState, displayText, lastLiveTranscriptRef.current),
    [displayText, viewState],
  );

  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);

  useLayoutEffect(() => {
    const measurer = measurerRef.current;
    if (!measurer) return;

    measurer.textContent = presentation.text || STATUS_TEXT.idle.fallback;
    const measured = measurer.getBoundingClientRect().width;
    setCapsuleWidth(clamp(Math.ceil(measured) + 130, MIN_WIDTH, MAX_WIDTH));
  }, [presentation.text]);

  useEffect(() => {
    setDisplayBadge(presentation.badge);
    setDisplayHint(presentation.hint);
    setDisplaySubtle(presentation.subtle);
  }, [presentation]);

  useEffect(() => {
    const unsubscribeCapsule = window.electronAPI.onCapsuleState((state, data) => {
      void handleCapsuleState(state, data as LiveTranscriptPayload | { message?: string } | undefined);
    });

    void window.electronAPI.isRecording().then((isRecording) => {
      if (isRecording) {
        void beginRecording();
      }
    });

    return () => {
      unsubscribeCapsule?.();
      clearHideTimer();
      recordingActiveRef.current = false;
      void stopAudioCapture();
    };
  }, []);

  function clearHideTimer() {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  function showCapsule() {
    clearHideTimer();
    setVisible(true);
  }

  function hideCapsule() {
    setVisible(false);
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      window.electronAPI.hideCapsule();
    }, 220);
  }

  function applyState(nextState: CapsuleViewState, text = '', hintOverride?: string) {
    setViewState(nextState);
    setDisplayText(text);

    const config = STATUS_TEXT[nextState];
    setDisplayBadge(config.badge);
    setDisplayHint(hintOverride ?? config.hint);
    setDisplaySubtle(config.subtle && !text);

    if (nextState === 'idle' || nextState === 'error') {
      resetWaveform();
    }
  }

  async function processRecording() {
    if (!recordingActiveRef.current) return;
    recordingActiveRef.current = false;

    applyState(
      'processing',
      lastLiveTranscriptRef.current || '正在把语音转换成文字…',
      '等待最终结果',
    );

    const settings = await window.electronAPI.getSettings();
    await stopAudioCapture();

    try {
      const rawTranscript = await window.electronAPI.dashScopeFinish();
      if (!rawTranscript) {
        throw new Error('未识别到语音内容');
      }

      const finalTranscript = await refineTranscript(rawTranscript, settings);
      const pasted = await injectText(finalTranscript);
      const successText = pasted
        ? finalTranscript
        : `${finalTranscript}（已复制，可手动 Ctrl+V 粘贴）`;

      applyState('success', successText, '已复制并尝试粘贴');
    } catch (error) {
      console.error('Transcription failed:', error);
      const message =
        error instanceof Error && error.message ? error.message : '转写失败';
      applyState('error', message, '请查看错误信息');
    }

    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      lastLiveTranscriptRef.current = '';
      applyState('idle');
      hideCapsule();
    }, 3200);
  }

  async function beginRecording() {
    if (recordingActiveRef.current) return;
    recordingActiveRef.current = true;

    showCapsule();
    clearHideTimer();
    lastLiveTranscriptRef.current = '';
    resetWaveform();
    applyState('recording', '请开始说话', '正在实时转录');

    try {
      const settings = await window.electronAPI.getSettings();
      const sessionStartPromise = window.electronAPI.dashScopeStart();
      await startAudioCapture(settings.audioDeviceId);
      await sessionStartPromise;
    } catch (error) {
      console.error('Recording start failed:', error);
      await stopAudioCapture();
      recordingActiveRef.current = false;
      applyState('error', '麦克风初始化失败', '请查看错误信息');
    }
  }

  function handleLiveTranscript(payload?: LiveTranscriptPayload) {
    const text = payload?.text || '';
    if (!text) return;

    lastLiveTranscriptRef.current = text;
    const currentViewState = viewStateRef.current;

    if (currentViewState === 'recording') {
      setDisplayText(text);
      setDisplaySubtle(false);
      setDisplayHint(payload?.isFinal ? '已得到一句完整文本' : '正在实时转录');
      return;
    }

    if (currentViewState === 'processing') {
      setDisplayText(text);
      setDisplaySubtle(false);
      setDisplayHint('等待最终结果');
    }
  }

  async function handleCapsuleState(
    state: string,
    data?: LiveTranscriptPayload | { message?: string },
  ) {
    if (state === 'recording') {
      await beginRecording();
      return;
    }

    if (state === 'stop') {
      await processRecording();
      return;
    }

    if (state === 'live-transcript') {
      handleLiveTranscript(data as LiveTranscriptPayload);
      return;
    }

    if (state === 'idle') {
      recordingActiveRef.current = false;
      applyState('idle');
      return;
    }

    if (state === 'error') {
      recordingActiveRef.current = false;
      applyState(
        'error',
        (data as { message?: string } | undefined)?.message || '发生错误',
        '请查看错误信息',
      );
    }
  }

  return (
    <CapsuleView
      viewState={viewState}
      visible={visible}
      capsuleWidth={capsuleWidth}
      waveHeights={waveHeights}
      displayBadge={displayBadge}
      displayHint={displayHint}
      displaySubtle={displaySubtle}
      text={presentation.text}
      measurerRef={measurerRef}
    />
  );
}
