import { Menu, Tray } from 'electron';
import {
  LANGUAGE_OPTIONS,
  TRANSCRIPTION_MODEL_OPTIONS,
  type AppSettings,
} from '../../shared/settings';
import { createTrayIcon } from '../utils/app-logo';

type MenuParams = {
  isRecording: boolean;
  settings: AppSettings;
  onToggleRecording: () => void;
  onChangeLanguage: (language: string) => void;
  onChangeTranscriptionModel: (model: string) => void;
  onToggleLlm: (enabled: boolean) => void;
  onOpenQuickPanel: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
};

export function buildTrayMenu(params: MenuParams) {
  return Menu.buildFromTemplate([
    { label: params.isRecording ? '状态：录音中' : '状态：就绪', enabled: false },
    {
      label: params.isRecording ? '停止录音' : '开始录音',
      click: params.onToggleRecording,
    },
    { type: 'separator' },
    {
      label: '语言',
      submenu: LANGUAGE_OPTIONS.map((option) => ({
        label: option.label,
        type: 'radio' as const,
        checked: params.settings.language === option.value,
        click: () => params.onChangeLanguage(option.value),
      })),
    },
    {
      label: '转写模型',
      submenu: [
        ...TRANSCRIPTION_MODEL_OPTIONS.map((option) => ({
          label: option.label,
          type: 'radio' as const,
          checked: params.settings.transcriptionModel === option.value,
          click: () => params.onChangeTranscriptionModel(option.value),
        })),
        { type: 'separator' as const },
        { label: '自定义模型…', click: params.onOpenQuickPanel },
      ],
    },
    {
      label: 'LLM 纠错',
      submenu: [
        {
          label: '启用保守纠错',
          type: 'checkbox' as const,
          checked: params.settings.llmEnabled,
          click: () => params.onToggleLlm(!params.settings.llmEnabled),
        },
        { label: '快速配置…', click: params.onOpenQuickPanel },
      ],
    },
    { type: 'separator' },
    { label: '快速设置', click: params.onOpenQuickPanel },
    { label: '打开设置', click: params.onOpenSettings },
    { label: '退出', click: params.onQuit },
  ]);
}

export function createTray(onClick: () => void) {
  const tray = new Tray(createTrayIcon());
  tray.setToolTip('VoiceTranscribe');
  tray.on('click', onClick);
  return tray;
}
