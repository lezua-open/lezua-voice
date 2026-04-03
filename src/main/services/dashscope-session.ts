import WebSocket from 'ws';
import type { AppSettings } from '../../shared/settings';

interface SessionState {
  ws: WebSocket;
  taskId: string;
  transcript: string;
  started: boolean;
  settled: boolean;
  finishRequested: boolean;
  finishSent: boolean;
  pendingChunks: Buffer[];
  startPromise: Promise<void>;
  finishPromise: Promise<string>;
  resolveStart: () => void;
  rejectStart: (error: Error) => void;
  resolveFinish: (text: string) => void;
  rejectFinish: (error: Error) => void;
}

type Callbacks = {
  onLiveTranscript: (payload: { text: string; isFinal: boolean }) => void;
  onRawMessage?: (rawText: string) => void;
};

function mapSourceLanguage(language: string) {
  switch (language) {
    case 'zh-CN':
    case 'zh-TW':
      return 'zh';
    case 'en-US':
      return 'en';
    case 'ja-JP':
      return 'ja';
    case 'ko-KR':
      return 'ko';
    default:
      return 'auto';
  }
}

export class DashScopeSessionManager {
  private session: SessionState | null = null;

  constructor(private readonly callbacks: Callbacks) {}

  private destroySession() {
    if (!this.session) return;
    try {
      this.session.ws.close();
    } catch {}
    this.session = null;
  }

  private flushPendingAudio(session: SessionState) {
    while (session.pendingChunks.length > 0 && session.started && !session.finishSent) {
      const chunk = session.pendingChunks.shift();
      if (chunk) {
        session.ws.send(chunk, { binary: true });
      }
    }

    if (session.finishRequested && !session.finishSent && session.started) {
      session.finishSent = true;
      session.ws.send(
        JSON.stringify({
          header: {
            action: 'finish-task',
            task_id: session.taskId,
            streaming: 'duplex',
          },
          payload: {
            input: {},
          },
        }),
      );
    }
  }

  async start(settings: AppSettings) {
    const transcriptionApiKey = (settings.transcriptionApiKey || '').trim();
    if (!settings.transcriptionApiUrl || !transcriptionApiKey) {
      throw new Error('缺少百炼接口地址或阿里云 API Key');
    }

    if (this.session) {
      this.destroySession();
    }

    const taskId = crypto.randomUUID();
    let resolveStart: () => void = () => {};
    let rejectStart: (error: Error) => void = () => {};
    let resolveFinish: (text: string) => void = () => {};
    let rejectFinish: (error: Error) => void = () => {};

    const startPromise = new Promise<void>((resolve, reject) => {
      resolveStart = resolve;
      rejectStart = reject;
    });

    const finishPromise = new Promise<string>((resolve, reject) => {
      resolveFinish = resolve;
      rejectFinish = reject;
    });

    const ws = new WebSocket(settings.transcriptionApiUrl, {
      headers: {
        Authorization: `Bearer ${transcriptionApiKey}`,
      },
    });

    const session: SessionState = {
      ws,
      taskId,
      transcript: '',
      started: false,
      settled: false,
      finishRequested: false,
      finishSent: false,
      pendingChunks: [],
      startPromise,
      finishPromise,
      resolveStart,
      rejectStart,
      resolveFinish,
      rejectFinish,
    };

    this.session = session;

    const fail = (error: Error) => {
      if (session.settled) return;
      session.settled = true;
      session.rejectStart(error);
      session.rejectFinish(error);
      this.destroySession();
    };

    const succeed = (text: string) => {
      if (session.settled) return;
      session.settled = true;
      session.resolveFinish(text);
      this.destroySession();
    };

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          header: {
            action: 'run-task',
            task_id: taskId,
            streaming: 'duplex',
          },
          payload: {
            task_group: 'audio',
            task: 'asr',
            function: 'recognition',
            model: settings.transcriptionModel || 'gummy-chat-v1',
            parameters: {
              format: 'pcm',
              sample_rate: 16000,
              source_language: mapSourceLanguage(settings.language),
              max_end_silence: 300,
              transcription_enabled: true,
              translation_enabled: false,
            },
            input: {},
          },
        }),
      );
    });

    ws.on('message', (raw: WebSocket.RawData) => {
      const rawText = typeof raw === 'string' ? raw : raw.toString();
      this.callbacks.onRawMessage?.(rawText);

      try {
        const message = JSON.parse(rawText);
        const event = message.header?.event;

        if (event === 'task-started') {
          session.started = true;
          session.resolveStart();
          this.flushPendingAudio(session);
          return;
        }

        if (event === 'result-generated') {
          const output = message.payload?.output;
          const transcription = output?.transcription;
          const text =
            output?.text ||
            output?.sentence_text ||
            output?.sentence?.text ||
            output?.transcript ||
            (typeof transcription === 'string' ? transcription : transcription?.text) ||
            '';

          if (typeof text === 'string' && text) {
            session.transcript = text;
            this.callbacks.onLiveTranscript({
              text,
              isFinal: Boolean(transcription?.sentence_end),
            });
          }
          return;
        }

        if (event === 'task-finished') {
          succeed((session.transcript || '').trim());
          return;
        }

        if (event === 'task-failed') {
          const errorMessage =
            message.header?.error_message || message.payload?.message || '百炼转写失败';
          fail(new Error(errorMessage));
        }
      } catch (error) {
        fail(error instanceof Error ? error : new Error('百炼响应解析失败'));
      }
    });

    ws.on('error', (error) => {
      fail(error instanceof Error ? error : new Error('百炼连接失败'));
    });

    ws.on('close', (code, reason) => {
      if (session.settled) return;
      if (session.finishRequested && session.transcript) {
        succeed((session.transcript || '').trim());
        return;
      }
      fail(new Error(`百炼连接已关闭，close=${code} reason=${reason.toString()}`));
    });

    await session.startPromise;
  }

  pushAudioChunk(audioChunk: Buffer) {
    if (!this.session || this.session.settled) return;

    if (!this.session.started || this.session.finishRequested) {
      this.session.pendingChunks.push(audioChunk);
      return;
    }

    this.session.ws.send(audioChunk, { binary: true });
  }

  async finish() {
    if (!this.session) {
      throw new Error('当前没有进行中的百炼会话');
    }

    this.session.finishRequested = true;
    this.flushPendingAudio(this.session);
    return await this.session.finishPromise;
  }

  destroy() {
    this.destroySession();
  }
}
