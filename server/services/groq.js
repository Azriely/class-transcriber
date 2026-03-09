import fs from 'fs';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MAX_RETRIES = 5;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Parse retry-after from 429 response, or use exponential backoff */
function getRetryDelay(response, attempt) {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  // Exponential backoff: 30s, 60s, 120s, 240s, 480s
  return Math.min(30000 * Math.pow(2, attempt), 480000);
}

export async function transcribeAudio(filePath, language = 'pt', originalName = 'audio.mp3') {
  const ext = originalName.match(/\.[^.]+$/)?.[0] || '.mp3';
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const formData = new FormData();
    formData.append('file', blob, `audio${ext}`);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', language);
    formData.append('response_format', 'text');

    const response = await fetch(WHISPER_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = getRetryDelay(response, attempt);
      console.log(`Rate limited on Whisper API. Waiting ${Math.round(delay / 1000)}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
      await sleep(delay);
      continue;
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Whisper API error (${response.status}): ${err}`);
    }
    return response.text();
  }
}

export async function summarizeTranscript(transcript, language = 'pt') {
  const systemPrompt = language === 'pt'
    ? 'Você é um assistente que resume aulas universitárias em português. Gere um resumo conciso com: título/tema, 5-10 pontos principais, conceitos-chave, e tarefas mencionadas.'
    : 'You are an assistant that summarizes university lectures in English. Generate a concise summary with: title/topic, 5-10 key points, key concepts, and any assignments mentioned.';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = getRetryDelay(response, attempt);
      console.log(`Rate limited on Llama API. Waiting ${Math.round(delay / 1000)}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
      await sleep(delay);
      continue;
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Llama API error (${response.status}): ${err}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  }
}
