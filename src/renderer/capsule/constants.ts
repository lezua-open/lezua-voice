export const BAR_WEIGHTS = [0.5, 0.8, 1.0, 0.75, 0.55] as const;
export const ATTACK = 0.4;
export const RELEASE = 0.15;
export const MIN_BAR = 4;
export const MAX_BAR = 32;
export const TARGET_SAMPLE_RATE = 16000;
export const MIN_WIDTH = 260;
export const MAX_WIDTH = 640;

export const STATUS_TEXT = {
  idle: {
    badge: 'Ready',
    hint: '按一次开始，再按一次结束',
    fallback: '准备就绪',
    subtle: true,
  },
  recording: {
    badge: 'Listening',
    hint: '正在实时转录',
    fallback: '请开始说话',
    subtle: false,
  },
  processing: {
    badge: 'Transcribing',
    hint: '等待最终结果',
    fallback: '正在整理识别内容…',
    subtle: false,
  },
  refining: {
    badge: 'Refining',
    hint: '正在做保守纠错',
    fallback: '正在优化文本…',
    subtle: false,
  },
  success: {
    badge: 'Done',
    hint: '已复制并尝试粘贴',
    fallback: '已完成',
    subtle: false,
  },
  error: {
    badge: 'Error',
    hint: '请查看错误信息',
    fallback: '发生错误',
    subtle: false,
  },
} as const;

export type CapsuleViewState = keyof typeof STATUS_TEXT;
