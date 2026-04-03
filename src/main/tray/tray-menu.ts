import { Menu, Tray, nativeImage } from 'electron';
import {
  LANGUAGE_OPTIONS,
  TRANSCRIPTION_MODEL_OPTIONS,
  type AppSettings,
} from '../../shared/settings';

const iconDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFfSURBVDiNpZM9SwNBEIafvdxdQqKFHxCwgYWVlaX/gI2dnYWdjb/gj+fr6O/oL+gPWFlZWFhYWPgLfoCNjY2FhYWFra+5u/V6iUQSu8QdHlgGmJ155plZdnaXAOCqHBwAKLk+ADYAZQDXk1sDAB4BtwHoAogA3AG+ASLgGXDu+s4dR3d9H0ANwCqgCGAK0AIwBXgA7Lm+5wNIA5gC9F3fu+t7aQBzgAGAKcAAwBSg7/qeZ18dQAbAAqALIA1gxvWd2z4AqANYAPQATAF69rUEaAFYAIwBJvYSgDRA1/WdG3sB0AIwB5gAjO0lAHOAAYApwMBxfeeG3gC0ASwApgA9+1oCtAEsAKYAPftYArQBLABmAD37WgG0ASwAZgA9+1oDtAEsAGYAPftaB7QBmAFM7WsD0AZgBjC1ry1AG4AZwMy+dgBtAGYAM/vaCbQBmAHM7CcAtAGYAczsaxfQBmAGMLWvPUDbAWBqXwfQNfA/lR+B/6w/A/8B8AH4G2fM1X0AAAAASUVORK5CYII=';

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
  const tray = new Tray(nativeImage.createFromDataURL(iconDataUrl));
  tray.setToolTip('VoiceTranscribe');
  tray.on('click', onClick);
  return tray;
}
