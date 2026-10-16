import { modelById, engineSettings } from './models.js';

export function shortTitle(text, max = 40) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (!t) return 'Озвучка';
  return t.length > max ? t.slice(0, max) + '…' : t;
}

export function safeFilename(text, max = 48) {
  const t = String(text || '').trim().replace(/\s+/g, ' ').replace(/[\\/:*?"<>|]/g, '');
  const base = (t.slice(0, max) || 'voice').trim();
  return base + '.mp3';
}

/** Настройки озвучки -> поля задачи в формате VoiceGen. */
export function generationFields(settings) {
  const model = modelById(settings.model);
  const fields = {
    voice_engine: model.engine,
    voice_engine_settings: engineSettings(settings.model, settings.params[settings.model]),
    delay_between_chunks: Number(settings.pause) || 0,
    thread_count: Math.max(1, Number(settings.threads) || 1)
  };
  if (settings.split === 'para') {
    fields.split_into_paragraph_files = true;
  } else {
    fields.chunk_size = Math.max(300, Number(settings.partSize) || 1200);
    fields.split_into_chunk_files = false;
  }
  return fields;
}

export function buildTaskPayload({ text, voice, settings }) {
  return {
    text,
    filename: safeFilename(text),
    voice_id: voice.id || voice.voice_id,
    ...generationFields(settings),
    auto_start: true
  };
}
