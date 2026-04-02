# Voice Transcription Application Specification

## 1. Project Overview

**Project Name:** VoiceTranscribe
**Type:** Desktop Application (Electron)
**Core Feature:** Press-and-hold hotkey voice recording with real-time waveform visualization and transcription
**Target Users:** Users who need quick voice-to-text transcription with system tray residence

## 2. UI/UX Specification

### 2.1 Window Architecture

- **Main Window:** Hidden by default, only shows when settings needed
- **Tray Mode:** App runs as system tray resident (background)
- **Capsule Window:** Floating bottom-center capsule (240x80px) for recording state display
  - Appears when hotkey is pressed
  - Auto-hides when hotkey is released
  - Frameless, rounded corners, semi-transparent background

### 2.2 Visual Design

**Color Palette:**
- Primary: `#6366F1` (Indigo)
- Secondary: `#1E1E2E` (Dark background)
- Accent: `#22D3EE` (Cyan for waveform)
- Success: `#10B981` (Green)
- Error: `#EF4444` (Red)
- Text: `#F8FAFC` (Light)
- Background: `#0F0F1A` (Near black)

**Typography:**
- Font Family: `"Segoe UI", system-ui, sans-serif`
- Headings: 16px semibold
- Body: 14px regular
- Caption: 12px regular

**Spacing System:**
- Base unit: 4px
- Padding: 8px, 12px, 16px
- Border radius: 8px (cards), 40px (capsule)

**Visual Effects:**
- Capsule: `backdrop-filter: blur(20px)`, `background: rgba(30,30,46,0.85)`
- Box shadow: `0 8px 32px rgba(0,0,0,0.4)`
- Transitions: 150ms ease-out

### 2.3 Components

#### Capsule Window (Recording State)
- **Idle (hotkey pressed, waiting):** Pulsing indigo dot + "准备中..."
- **Recording:** Real-time RMS waveform bars + "录音中" text
- **Processing:** Spinner + "转录中..." or "AI 优化中..."
- **Success:** Checkmark + transcription text (truncated) + "已注入"
- **Error:** X icon + error message + "点击关闭"

#### Main Settings Window
- Hotkey configuration input
- Language selector dropdown
- LLM enable/configure section
- Audio input device selector
- Start with system checkbox
- Save/Reset buttons

#### System Tray
- Icon: Microphone icon (changes color when recording)
- Menu: 打开设置 / 退出

### 2.4 Component States

| Component | Default | Hover | Active | Disabled |
|-----------|---------|-------|--------|----------|
| Button | `#6366F1` | `#818CF8` | `#4F46E5` | `#374151` |
| Input | `#1E1E2E` border | `#6366F1` border | `#6366F1` border | `#374151` |
| Capsule | Semi-transparent | - | - | - |

## 3. Functional Specification

### 3.1 Core Features

1. **System Tray Residence**
   - App starts minimized to tray
   - Single instance enforcement
   - Tray icon with context menu

2. **Global Hotkey (Press-and-Hold)**
   - Default: `Ctrl+Shift+V`
   - Press: Start recording immediately
   - Release: Stop recording and transcribe
   - Visual feedback within 50ms of key events

3. **Audio Recording**
   - Use Web Audio API with getUserMedia
   - Sample rate: 16000 Hz (optimal for Whisper)
   - Real-time RMS calculation for waveform
   - Audio format: WAV/PCM for Whisper compatibility

4. **Real-time Waveform Visualization**
   - 16 bars displayed
   - RMS values mapped to bar heights (0-100%)
   - Update rate: 60fps via requestAnimationFrame
   - Smooth interpolation between RMS values

5. **Speech-to-Text Transcription**
   - Primary: Whisper.cpp via native addon or WebAssembly
   - Fallback: Browser Web Speech API (less accurate)
   - Default language: zh-CN

6. **LLM Refinement (Optional)**
   - Enable/disable in settings
   - API endpoint configurable
   - State flow: Recording → Transcribing → Refining → Final
   - API: OpenAI compatible

7. **Text Injection**
   - Method 1: Clipboard (copy + paste via keyboard simulation)
   - Method 2: Direct to active window via clipboard
   - Preserve original clipboard content, restore after injection
   - Simulate Ctrl+V for paste

8. **Settings Persistence**
   - JSON file in app data directory
   - Settings: hotkey, language, LLM config, audio device, theme
   - Auto-save on change

### 3.2 User Interaction Flows

```
[App Start] → [Load Settings] → [Register Hotkey] → [Hide to Tray]
                                                    ↓
[Hotkey Press] → [Show Capsule] → [Start Recording] → [Real-time Waveform]
                                                    ↓
[Hotkey Release] → [Stop Recording] → [Transcribe] → [LLM Refine?]
                                                    ↓
[Inject Text] → [Show Success] → [Hide Capsule after 2s]
                                                    ↓
[Error] → [Show Error in Capsule] → [Click to dismiss]
```

### 3.3 Key Modules Design

```
src/
├── main/                    # Electron main process
│   ├── index.ts            # Entry point, window management
│   ├── tray.ts             # System tray management
│   ├── hotkey.ts           # Global hotkey registration
│   ├── ipc.ts              # IPC handlers
│   └── store.ts            # Settings persistence
├── renderer/               # Electron renderer process
│   ├── index.html          # Main window HTML
│   ├── capsule.html        # Capsule window HTML
│   ├── index.tsx           # React entry for settings
│   ├── capsule.tsx         # Capsule UI
│   └── styles/             # CSS files
├── shared/                 # Shared types and constants
│   └── types.ts
└── native/                 # Native modules (future)
    └── whisper/            # Whisper.cpp bindings placeholder
```

**Module Interfaces:**
- `HotkeyModule`: register(keys), unregister(), onPress(callback), onRelease(callback)
- `AudioModule`: startRecording(), stopRecording(), getAnalyserData()
- `TranscribeModule`: transcribe(audioBuffer, language) → Promise<string>
- `LLMModule`: refine(text, apiConfig) → Promise<string>
- `ClipboardModule`: save(), restore(), injectText(text)
- `SettingsModule`: load(), save(), get(key), set(key, value)

### 3.4 Edge Cases

1. **Microphone permission denied:** Show error in capsule, log details
2. **No microphone found:** Show error, disable recording
3. **Hotkey conflict:** Notify user, suggest alternative
4. **LLM API failure:** Fall back to raw transcription
5. **Very long recording (>60s):** Auto-stop, transcribe current segment
6. **App already running:** Focus existing instance, don't start new
7. **Network offline:** Skip LLM refinement, use local transcription only
8. **Clipboard access denied:** Fall back to keyboard simulation only
9. **Whisper load failure:** Fall back to Web Speech API

## 4. Known Limitations

### 4.1 Electron-Specific Limitations

1. **Waveform Latency:** Browser audio context has ~100ms latency vs native ~20ms
2. **Hotkey Reliability:** Electron global shortcuts can be blocked by some apps
3. **Clipboard Security:** Electron clipboard requires user gesture for some operations
4. **Background Power:** Electron uses more power than native apps when idle
5. **Audio Device Changes:** May require app restart when default device changes

### 4.2 Architecture for Future Native Enhancement

```
AudioModule (interface)
├── BrowserAudioImpl  ← Current implementation
└── NativeAudioImpl   ← Future: via NativeAddon or Rust binding

TranscribeModule (interface)
├── WhisperWasmImpl   ← Current: Whisper.cpp in WASM
└── WhisperNativeImpl ← Future: whisper.cpp native addon

TextInjectModule (interface)
├── ClipboardImpl     ← Current: Clipboard + keyboard simulation
└── NativeInjectImpl  ← Future: Windows API via Rust addon
```

## 5. Acceptance Criteria

### 5.1 Functional Criteria

- [ ] App starts and minimizes to system tray
- [ ] Global hotkey (Ctrl+Shift+V) triggers capsule and recording
- [ ] Capsule shows within 100ms of hotkey press
- [ ] Waveform bars animate with real RMS values during recording
- [ ] Releasing hotkey stops recording and starts transcription
- [ ] Transcription result appears in capsule within 5s for 10s audio
- [ ] Text is injected into active window via clipboard
- [ ] Settings persist across app restarts
- [ ] Errors display clear, actionable messages
- [ ] App can be closed completely from tray menu

### 5.2 Visual Checkpoints

1. **Tray Icon:** Visible in system tray with microphone icon
2. **Capsule Idle:** Indigo pulsing dot + "准备中..."
3. **Capsule Recording:** Animated waveform bars + cyan accents
4. **Capsule Success:** Green checkmark + truncated text
5. **Capsule Error:** Red X + error message
6. **Settings Window:** Dark theme, all controls accessible

### 5.3 Performance Targets

- App startup: < 2 seconds
- Hotkey response: < 50ms
- Waveform update: 60fps
- Memory usage: < 200MB idle
- CPU usage: < 5% idle, < 30% recording
