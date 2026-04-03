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
import { cn } from '../shared/utils/cn';
import logoUrl from '../../assets/images/logo.png';

export function SettingsApp() {
  const { settings, updateSetting, saveSettings, resetSettings } = useSettingsDraft();
  const { devices, audioHint } = useAudioDevices();

  return (
    <div className="settings-shell">
      <header className="window-bar">
        <div className="window-bar__title">
          <div className="window-bar__logo-shell">
            <img className="window-bar__logo" src={logoUrl} alt="VoiceTranscribe logo" />
          </div>
          <div>
            <div className="window-bar__heading">VoiceTranscribe 设置</div>
            <div className="window-bar__subheading">短语音输入与实时转写控制面板</div>
          </div>
        </div>
        <div className="window-bar__actions">
          <button
            className="window-button"
            type="button"
            aria-label="最小化"
            onClick={() => window.electronAPI.windowMinimize()}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          <button
            className="window-button window-button--close"
            type="button"
            aria-label="关闭"
            onClick={() => window.electronAPI.windowClose()}
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
        </div>
      </header>

      <main className="settings-content">
        <div className="settings-layout">
          <section className="hero-card">
            <div className="hero-card__eyebrow">实时转写已启用</div>
            <div className="hero-card__grid">
              <div>
                <h1 className="hero-card__title">按一次开始录音，再按一次结束录音</h1>
                <p className="hero-card__description">
                  录音过程中会实时显示转写文本。停止录音后，应用会等待最终识别结果，再尝试把文本粘贴到当前焦点输入框。
                  如果目标应用不接受模拟粘贴，文本仍会保留在剪贴板中，方便手动粘贴。
                </p>
              </div>
              <div className="hero-card__stat">
                <div className="hero-card__stat-label">当前工作方式</div>
                <div className="hero-card__stat-value">实时转写 + 焦点注入</div>
                <div className="hero-card__stat-note">
                  热键默认使用 <strong>Ctrl+Shift+V</strong>，当前版本为切换式录音。
                </div>
              </div>
            </div>
          </section>

          <Section
            kicker="General"
            title="录音与输入"
            description="控制热键、识别语言与麦克风来源。这一层只负责基础输入链路，不涉及模型后处理。"
            tag="基础行为"
          >
            <div className="form-grid">
              <Field
                label="快捷键"
                hint="当前版本使用切换模式：按一次开始录音，再按一次结束录音。后续如果要做按住说话，需要补更底层的按键监听。"
              >
                <InputShell readOnly>
                  <input type="text" value={settings.hotkey} readOnly />
                </InputShell>
              </Field>

              <div className="form-grid form-grid--two">
                <Field label="识别语言">
                  <InputShell select>
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
                  <InputShell select>
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

              <div className="pill-row">
                <span className="pill pill--blue">实时转写中间结果</span>
                <span className="pill pill--cyan">停止后自动尝试粘贴</span>
              </div>
            </div>
          </Section>

          <Section
            kicker="DashScope"
            title="阿里云实时转写"
            description="基础语音识别走阿里云百炼实时句子级接口。录音期间边采集边推送 16k PCM 音频，并实时返回中间结果。"
            tag="核心链路"
          >
            <div className="form-grid">
              <Field
                label="WebSocket 接口地址"
                hint="默认使用中国内地域接口。如果你的账号在国际站或美国站，需要改成对应地域的接入地址。"
              >
                <InputShell>
                  <input
                    type="text"
                    value={settings.transcriptionApiUrl}
                    onChange={(event) =>
                      updateSetting('transcriptionApiUrl', event.target.value)
                    }
                  />
                </InputShell>
              </Field>

              <div className="form-grid form-grid--two">
                <Field label="转写模型">
                  <InputShell select>
                    <select
                      value={settings.transcriptionModel}
                      onChange={(event) =>
                        updateSetting('transcriptionModel', event.target.value)
                      }
                    >
                      {TRANSCRIPTION_MODEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </Field>

                <SecretField
                  label="阿里云 API Key"
                  value={settings.transcriptionApiKey}
                  placeholder="DashScope API Key"
                  onChange={(value) => updateSetting('transcriptionApiKey', value)}
                />
              </div>

              <div className="muted-panel">
                <strong>注意：</strong>这里填写的是阿里云百炼 DashScope API Key，只用于实时转写。
                不要和下方 LLM 纠错用的 API Key 混用。
              </div>
            </div>
          </Section>

          <Section
            kicker="Refinement"
            title="LLM 保守纠错"
            description="这是可选后处理层。只适合修正明显识别错误，不应该润色、改写或压缩用户原文。"
            tag="可选增强"
            disabled={!settings.llmEnabled}
          >
            <div className="form-grid">
              <ToggleCard
                title="启用保守纠错"
                description="仅修复明显的技术术语、中文谐音和大小写识别错误；不改写正确内容。"
                checked={settings.llmEnabled}
                onChange={(checked) => updateSetting('llmEnabled', checked)}
              />

              <div className="form-grid form-grid--two">
                <Field label="纠错接口地址">
                  <InputShell>
                    <input
                      type="text"
                      value={settings.llmApiUrl}
                      disabled={!settings.llmEnabled}
                      onChange={(event) => updateSetting('llmApiUrl', event.target.value)}
                    />
                  </InputShell>
                </Field>

                <Field label="纠错模型">
                  <InputShell>
                    <input
                      type="text"
                      value={settings.llmModel}
                      disabled={!settings.llmEnabled}
                      onChange={(event) => updateSetting('llmModel', event.target.value)}
                    />
                  </InputShell>
                </Field>
              </div>

              <SecretField
                label="纠错 API Key"
                value={settings.llmApiKey}
                disabled={!settings.llmEnabled}
                placeholder="可选：OpenAI 或兼容服务的 API Key"
                hint="如果你不需要 LLM 后处理，这一组可以完全留空。关闭开关后，应用会直接使用实时转写的最终结果。"
                onChange={(value) => updateSetting('llmApiKey', value)}
              />
            </div>
          </Section>

          <Section
            kicker="System"
            title="系统行为"
            description="决定应用与系统的相处方式。设置窗口关闭时不会退出应用，只会隐藏回托盘。"
            tag="桌面集成"
          >
            <div className="form-grid">
              <ToggleCard
                title="开机启动"
                description="当前设置项会被保存，但是否真正启用系统级自启动，后续还可以再加更完整的注册逻辑。"
                checked={settings.startWithSystem}
                onChange={(checked) => updateSetting('startWithSystem', checked)}
              />

              <div className="muted-panel">
                <strong>当前行为：</strong>关闭设置窗口不会退出应用。录音、转写和托盘入口会继续保留，窗口仅隐藏到后台。
              </div>
            </div>
          </Section>
        </div>
      </main>

      <footer className="settings-footer">
        <div className="settings-footer__inner">
          <div>
            <div className="settings-footer__title">配置会保存在本地并在下次启动时自动恢复</div>
            <div className="settings-footer__note">
              如果你更换了服务商或 API Key，建议先保存再重新开始一次录音，避免旧会话状态残留。
            </div>
          </div>
          <div className="settings-footer__actions">
            <button className="button button--secondary" type="button" onClick={resetSettings}>
              重置
            </button>
            <button
              className="button button--primary"
              type="button"
              onClick={() => {
                void saveSettings();
              }}
            >
              保存设置
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
