import fs from 'fs';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function transcribeAudio(filePath, language = 'pt') {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);
  const formData = new FormData();
  formData.append('file', blob, 'audio.mp3');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', language);
  formData.append('response_format', 'text');

  const response = await fetch(WHISPER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper API error (${response.status}): ${err}`);
  }
  return response.text();
}

export async function summarizeTranscript(transcript, language = 'pt') {
  const systemPrompt = language === 'pt'
    ? 'Você é um assistente que resume aulas universitárias em português. Gere um resumo conciso com: título/tema, 5-10 pontos principais, conceitos-chave, e tarefas mencionadas.'
    : 'You are an assistant that summarizes university lectures in English. Generate a concise summary with: title/topic, 5-10 key points, key concepts, and any assignments mentioned.';

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

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Llama API error (${response.status}): ${err}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}
