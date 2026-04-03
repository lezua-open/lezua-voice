import type { AppSettings } from '../../../shared/settings';

export async function injectText(text: string) {
  const savedClipboard = await window.electronAPI.clipboardSave();
  let pasted = false;

  try {
    await window.electronAPI.clipboardWrite(text);
    pasted = await window.electronAPI.simulatePaste();
  } finally {
    window.setTimeout(async () => {
      try {
        await window.electronAPI.clipboardRestore(savedClipboard || '');
      } catch (error) {
        console.error('Failed to restore clipboard:', error);
      }
    }, 5000);
  }

  return pasted;
}

export async function refineTranscript(text: string, settings: AppSettings) {
  if (!settings.llmEnabled || !settings.llmApiUrl || !settings.llmApiKey) {
    return text;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(settings.llmApiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.llmApiKey}`,
      },
      body: JSON.stringify({
        model: settings.llmModel || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You only fix obvious speech recognition mistakes. Do not rewrite, polish, summarize, shorten, or expand. If the text already looks correct, return it exactly unchanged. If you are unsure, keep the original. Output only the corrected plain text.',
          },
          { role: 'user', content: text },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      return text;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error('LLM refinement failed:', error);
    return text;
  } finally {
    window.clearTimeout(timeout);
  }
}
