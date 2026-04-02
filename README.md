# VoiceTranscribe

Press-and-hold voice transcription application with system tray residence.

## Features

- **Press-and-hold recording** with global hotkey (default: `Ctrl+Shift+V`)
- **Real-time waveform visualization** driven by actual audio RMS
- **System tray residence** - runs quietly in background
- **Optional AI refinement** via OpenAI-compatible API
- **Text injection** via clipboard (preserves original clipboard)
- **Persistent settings** across restarts

## Quick Start

```bash
npm install
npm run dev
```

## Usage

1. **Start recording**: Hold `Ctrl+Shift+V`
2. **Speak** - waveform shows real-time audio levels
3. **Release hotkey** - recording stops and transcription begins
4. **Result** - text is automatically injected into the active window

## Known Limitations

### 1. Hotkey Release Detection
Electron's `globalShortcut` API only supports key press detection, not key release. This implementation uses a hybrid approach:

- A transparent overlay window captures keyboard events
- When the hotkey is pressed, recording starts immediately
- Release detection relies on the overlay window receiving keyup events

**Limitation**: In some cases (rare), the keyup might not be captured if the system is under heavy load or if certain fullscreen applications have keyboard focus.

### 2. Audio Waveform Latency
Browser-based audio (`Web Audio API`) has ~50-100ms latency compared to native audio implementations. The waveform animation may slightly lag behind actual speech.

### 3. Clipboard Injection
Text injection uses clipboard + keyboard simulation (`Ctrl+V`). This:
- Temporarily replaces clipboard content (restored after injection)
- May not work in applications that block global keyboard simulation
- Requires the target window to be focusable

### 4. Background Power Usage
Electron applications use more power than native apps when idle. The app is optimized to minimize CPU usage when not recording.

### 5. Audio Device Changes
If the default audio device changes while the app is running, you may need to restart the app.

### 6. Microphone Permissions
On first run, the browser will request microphone permission. If denied, recording will show an error.

## Future Optimization Directions

### Native Audio Module
Replace `Web Audio API` with native audio recording via a Rust addon:
- Lower latency (~20ms vs ~100ms)
- More reliable device enumeration
- Better handling of device hot-swapping

**Interface designed for replacement:**
```typescript
interface AudioModule {
  startRecording(deviceId: string): Promise<void>;
  stopRecording(): Promise<AudioBuffer>;
  getAnalyser(): AnalyserNode; // For waveform
  onDeviceChange(callback: (devices: AudioDevice[]) => void): void;
}
```

### Native Hotkey Module
Replace Electron's globalShortcut with a native implementation:
- True keyup detection
- Better conflict detection
- Support for more complex hotkey combinations

### Native Text Injection
Replace clipboard simulation with direct text injection:
- Windows API via Rust addon
- No clipboard modification
- Works in more applications

### Whisper.cpp Integration
Currently, transcription is simulated. Future versions will integrate:
- Whisper.cpp as a native addon (Rust)
- Or Whisper.cpp compiled to WebAssembly
- For offline, local transcription

### Settings Synchronization
Future: Cloud sync for settings across devices.

## Architecture for Native Enhancement

```
┌─────────────────────────────────────────────────────┐
│                    Main Process                     │
├─────────────────────────────────────────────────────┤
│  HotkeyModule (replaceable)                        │
│  ├── ElectronHotkeyImpl (current)                  │
│  └── NativeHotkeyImpl (future: Rust addon)         │
├─────────────────────────────────────────────────────┤
│  AudioModule (replaceable)                         │
│  ├── BrowserAudioImpl (current: Web Audio API)     │
│  └── NativeAudioImpl (future: Rust bindings)       │
├─────────────────────────────────────────────────────┤
│  TranscribeModule (replaceable)                    │
│  ├── SimulatedTranscribeImpl (current)             │
│  ├── WhisperWasmImpl (planned: WASM)               │
│  └── WhisperNativeImpl (future: Rust addon)        │
├─────────────────────────────────────────────────────┤
│  TextInjectModule (replaceable)                    │
│  ├── ClipboardImpl (current)                       │
│  └── NativeInjectImpl (future: Windows API)         │
└─────────────────────────────────────────────────────┘
```

## Configuration

Settings are stored in:
- Windows: `%APPDATA%/voicetranscribe/config.json`

```json
{
  "hotkey": "Ctrl+Shift+V",
  "language": "zh-CN",
  "llmEnabled": false,
  "llmApiUrl": "https://api.openai.com/v1/chat/completions",
  "llmApiKey": "",
  "audioDeviceId": "default",
  "startWithSystem": false
}
```

## Dependencies

- Electron 33+
- TypeScript 5+
- electron-store for settings persistence

## License

MIT
