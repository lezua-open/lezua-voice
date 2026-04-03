import { clipboard } from 'electron';
import { execFile } from 'child_process';

export function saveClipboardText() {
  return clipboard.readText();
}

export function restoreClipboardText(text: string) {
  clipboard.writeText(text);
}

export function writeClipboardText(text: string) {
  clipboard.writeText(text);
}

export async function simulatePaste() {
  return await new Promise<boolean>((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-Command', '(New-Object -ComObject WScript.Shell).SendKeys("^v")'],
      (error) => resolve(!error),
    );
  });
}
