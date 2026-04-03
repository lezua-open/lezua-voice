import { useEffect, useState } from 'react';
import { DEFAULT_AUDIO_DEVICE_OPTION } from '../../../shared/settings';

export type AudioDeviceOption = {
  value: string;
  label: string;
};

export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioDeviceOption[]>([DEFAULT_AUDIO_DEVICE_OPTION]);
  const [audioHint, setAudioHint] = useState('正在加载麦克风设备列表…');

  useEffect(() => {
    void loadAudioDevices();
  }, []);

  async function loadAudioDevices() {
    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const inputs = mediaDevices.filter((device) => device.kind === 'audioinput');

      if (!inputs.length) {
        setDevices([DEFAULT_AUDIO_DEVICE_OPTION]);
        setAudioHint('未检测到可用麦克风设备。');
        return;
      }

      setDevices([
        DEFAULT_AUDIO_DEVICE_OPTION,
        ...inputs.map((device, index) => ({
          value: device.deviceId,
          label: device.label || `麦克风 ${index + 1}`,
        })),
      ]);
      setAudioHint(`已检测到 ${inputs.length} 个麦克风设备。`);
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      setDevices([DEFAULT_AUDIO_DEVICE_OPTION]);
      setAudioHint('获取麦克风设备列表失败。');
    }
  }

  return {
    devices,
    audioHint,
    reloadAudioDevices: loadAudioDevices,
  };
}
