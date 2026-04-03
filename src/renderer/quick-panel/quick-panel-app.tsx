import { useEffect, useState } from 'react';
import {
  LANGUAGE_OPTIONS,
  TRANSCRIPTION_MODEL_OPTIONS,
} from '../../shared/settings';
import { useAudioDevices } from '../shared/hooks/use-audio-devices';
import { useSettingsDraft } from '../shared/hooks/use-settings-draft';
import {
  Field,
  InputShell,
  SecretField,
  Section,
  ToggleCard,
} from '../shared/ui/form-controls';
import logoUrl from '../../assets/images/logo.png';

export function QuickPanelApp() {
  const { settings, updateSetting, saveSettings } = useSettingsDraft();
  const { devices, audioHint } = useAudioDevices();
  const [recordingState, setRecordingState] = useState<'recording' | 'idle'>('idle');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void window.electronAPI.isRecording().then((value) => {
      setRecordingState(value ? 'recording' : 'idle');
    });

    const unsubscribe = window.electronAPI.onRecordingState((state) => {
      setRecordingState(state === 'recording' ? 'recording' : 'idle');
    });

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleSave() {
    await saveSettings();
    setToast('已保存');
  }

  function handleToggleRecording() {
    if (recordingState === 'recording') {
      window.electronAPI.recordingStopped();
    } else {
      window.electronAPI.recordingStarted();
    }
  }

  return (
    <div className="quick-panel">
      <header className="quick-panel__header">
        <div>
          <div className="quick-panel__brand">
            <div className="quick-panel__logo-shell">
              <img className="quick-panel__logo" src={logoUrl} alt="VoiceTranscribe logo" />
            </div>
            <div>
              <div className="quick-panel__eyebrow">托盘快速设置</div>
              <div className="quick-panel__title">VoiceTranscribe</div>
            </div>
          </div>
          <div className="quick-panel__subtitle">
            高频配置放在这里，详细参数仍在完整设置页中维护。
          </div>
        </div>
        <button
          className="quick-panel__close"
          type="button"
          aria-label="关闭"
          onClick={() => window.electronAPI.hideQuickPanel()}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M4 4l6 6M10 4L4 10"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <main className="quick-panel__content">
        <Section
          kicker="Status"
          title={recordingState === 'recording' ? '正在录音' : '当前已就绪'}
          description="这里保留高频开关和当前状态，不需要打开完整设置页也能直接开始操作。"
        >
          <div className="form-grid">
            <div className="pill-row">
              <span className={`pill ${recordingState === 'recording' ? 'pill--cyan' : 'pill--blue'}`}>
                {recordingState === 'recording' ? '录音中' : '就绪'}
              </span>
              <span className="pill pill--blue">Ctrl+Shift+V</span>
            </div>
            <button className="quick-panel__action" type="button" onClick={handleToggleRecording}>
              {recordingState === 'recording' ? '停止录音' : '开始录音'}
            </button>
          </div>
        </Section>

        <Section
          kicker="Speech"
          title="实时转写"
          description="语言、模型和阿里云 Key 放在这里，覆盖日常切换和快速排错。"
        >
          <div className="form-grid">
            <div className="form-grid form-grid--two">
              <Field label="识别语言">
                <InputShell select compact>
                  <select
                    value={settings.language}
                    onChange={(event) => updateSetting('language', event.target.value)}
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </InputShell>
              </Field>

              <Field label="音频设备" hint={audioHint}>
                <InputShell select compact>
                  <select
                    value={settings.audioDeviceId}
                    onChange={(event) => updateSetting('audioDeviceId', event.target.value)}
                  >
                    {devices.map((device) => (
                      <option key={device.value} value={device.value}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </InputShell>
              </Field>
            </div>

            <div className="form-grid form-grid--two">
              <Field label="转写模型">
                <InputShell select compact>
                  <select
                    value={settings.transcriptionModel}
                    onChange={(event) => updateSetting('transcriptionModel', event.target.value)}
                  >
                    {TRANSCRIPTION_MODEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </InputShell>
              </Field>

              <Field label="WebSocket 地址">
                <InputShell compact>
                  <input
                    type="text"
                    value={settings.transcriptionApiUrl}
                    onChange={(event) => updateSetting('transcriptionApiUrl', event.target.value)}
                  />
                </InputShell>
              </Field>
            </div>

            <SecretField
              label="阿里云 API Key"
              value={settings.transcriptionApiKey}
              placeholder="DashScope API Key"
              compact
              onChange={(value) => updateSetting('transcriptionApiKey', value)}
            />
          </div>
        </Section>

        <Section
          kicker="LLM"
          title="保守纠错"
          description="这里只保留常用开关、模型和 Key。更细的参数放在完整设置页。"
          disabled={!settings.llmEnabled}
        >
          <div className="form-grid">
            <ToggleCard
              title="启用保守纠错"
              description="只修明显错误，不改写正确内容。"
              checked={settings.llmEnabled}
              compact
              onChange={(checked) => updateSetting('llmEnabled', checked)}
            />

            <div className="form-grid form-grid--two">
              <Field label="纠错模型">
                <InputShell compact>
                  <input
                    type="text"
                    value={settings.llmModel}
                    disabled={!settings.llmEnabled}
                    onChange={(event) => updateSetting('llmModel', event.target.value)}
                  />
                </InputShell>
              </Field>

              <Field label="接口地址">
                <InputShell compact>
                  <input
                    type="text"
                    value={settings.llmApiUrl}
                    disabled={!settings.llmEnabled}
                    onChange={(event) => updateSetting('llmApiUrl', event.target.value)}
                  />
                </InputShell>
              </Field>
            </div>

            <SecretField
              label="纠错 API Key"
              value={settings.llmApiKey}
              placeholder="可选：OpenAI 或兼容服务的 API Key"
              compact
              disabled={!settings.llmEnabled}
              onChange={(value) => updateSetting('llmApiKey', value)}
            />
          </div>
        </Section>
      </main>

      <footer className="quick-panel__footer">
        <button
          className="quick-panel__ghost"
          type="button"
          onClick={() => {
            window.electronAPI.showMainWindow();
            window.electronAPI.hideQuickPanel();
          }}
        >
          高级设置
        </button>
        <button className="quick-panel__primary" type="button" onClick={() => void handleSave()}>
          保存
        </button>
      </footer>

      <div className={`quick-panel__toast ${toast ? 'is-visible' : ''}`}>{toast}</div>
    </div>
  );
}
