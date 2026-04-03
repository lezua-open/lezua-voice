export interface AppSettings {
  hotkey: string;
  language: string;
  transcriptionApiKey: string;
  llmEnabled: boolean;
  llmApiUrl: string;
  llmApiKey: string;
  llmModel: string;
  transcriptionApiUrl: string;
  transcriptionModel: string;
  audioDeviceId: string;
  startWithSystem: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: 'Ctrl+Shift+V',
  language: 'zh-CN',
  transcriptionApiKey: '',
  llmEnabled: false,
  llmApiUrl: 'https://api.openai.com/v1/chat/completions',
  llmApiKey: '',
  llmModel: 'gpt-4o-mini',
  transcriptionApiUrl: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference',
  transcriptionModel: 'gummy-chat-v1',
  audioDeviceId: 'default',
  startWithSystem: false,
};

export const LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '中文（简体）' },
  { value: 'zh-TW', label: '中文（繁体）' },
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
] as const;

export const TRANSCRIPTION_MODEL_OPTIONS = [
  { value: 'gummy-chat-v1', label: 'gummy-chat-v1' },
] as const;

export const DEFAULT_AUDIO_DEVICE_OPTION = {
  value: 'default',
  label: '默认设备',
} as const;
