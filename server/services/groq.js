import fs from 'fs';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MAX_RETRIES = 5;

/** Sleep with periodic keep-alive callback (every 15s) to prevent connection timeouts */
async function sleepWithKeepAlive(ms, onKeepAlive) {
  const interval = 15000; // ping every 15 seconds
  let remaining = ms;
  while (remaining > 0) {
    const wait = Math.min(remaining, interval);
    await new Promise(resolve => setTimeout(resolve, wait));
    remaining -= wait;
    if (remaining > 0 && onKeepAlive) {
      onKeepAlive(Math.round(remaining / 1000));
    }
  }
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

/**
 * @param {string} filePath
 * @param {string} language
 * @param {string} originalName
 * @param {string} [subjectHint] - Subject/vocabulary hint passed to Whisper as prompt
 * @param {function} [onProgress] - Called with status messages during retries
 */
export async function transcribeAudio(filePath, language = 'pt', originalName = 'audio.mp3', subjectHint = '', onProgress = null) {
  const ext = originalName.match(/\.[^.]+$/)?.[0] || '.mp3';
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const formData = new FormData();
    formData.append('file', blob, `audio${ext}`);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', language);
    formData.append('response_format', 'text');

    // Whisper's prompt parameter helps with domain-specific vocabulary and names
    if (subjectHint) {
      formData.append('prompt', subjectHint);
    }

    const response = await fetch(WHISPER_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = getRetryDelay(response, attempt);
      const delaySec = Math.round(delay / 1000);
      console.log(`Rate limited on Whisper API. Waiting ${delaySec}s before retry ${attempt + 1}/${MAX_RETRIES}...`);

      if (onProgress) onProgress(`Rate limited — waiting ${delaySec}s before retry...`);

      await sleepWithKeepAlive(delay, (remainingSec) => {
        if (onProgress) onProgress(`Rate limited — retrying in ${remainingSec}s...`);
      });
      continue;
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Whisper API error (${response.status}): ${err}`);
    }
    return response.text();
  }
}

// ~4 chars per token rough estimate; keep well under 12k TPM free-tier limit
const MAX_CHUNK_CHARS = 28000; // ~7000 tokens, leaves room for system prompt + response

/** Call Llama chat API with retry on 429 */
async function chatCompletion(systemPrompt, userContent, maxTokens = 4096) {
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
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = getRetryDelay(response, attempt);
      console.log(`Rate limited on Llama API. Waiting ${Math.round(delay / 1000)}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
      await sleepWithKeepAlive(delay);
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

/** Split text into chunks at sentence boundaries */
function splitTranscript(text, maxChars) {
  if (text.length <= maxChars) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }

    // Find last sentence boundary within limit
    let splitAt = remaining.lastIndexOf('. ', maxChars);
    if (splitAt === -1 || splitAt < maxChars * 0.5) {
      splitAt = remaining.lastIndexOf(' ', maxChars);
    }
    if (splitAt === -1) {
      splitAt = maxChars;
    } else {
      splitAt += 1; // include the space/period
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks;
}

export async function summarizeTranscript(transcript, language = 'pt') {
  const chunks = splitTranscript(transcript, MAX_CHUNK_CHARS);

  const chunkPrompt = language === 'pt'
    ? `Você é um assistente especializado em resumir aulas universitárias em português. Analise esta parte da transcrição e extraia TODOS os detalhes importantes:

- Conceitos e definições explicados pelo professor
- Exemplos e casos práticos mencionados
- Teorias, fórmulas, ou frameworks apresentados
- Referências a autores, livros ou artigos
- Conexões entre tópicos
- Perguntas dos alunos e respostas do professor
- Tarefas, trabalhos ou leituras recomendadas

Seja detalhado e completo. Não omita informações relevantes.`
    : `You are an assistant specialized in summarizing university lectures. Analyze this part of the transcript and extract ALL important details:

- Concepts and definitions explained by the professor
- Examples and practical cases mentioned
- Theories, formulas, or frameworks presented
- References to authors, books, or articles
- Connections between topics
- Student questions and professor answers
- Assignments, homework, or recommended readings

Be detailed and thorough. Do not omit relevant information.`;

  const mergePrompt = language === 'pt'
    ? `Você é um assistente especializado em resumir aulas universitárias em português. Combine estes resumos parciais em um resumo final DETALHADO e bem estruturado. Use o seguinte formato:

## Tema da Aula
[Título/tema principal]

## Visão Geral
[2-3 parágrafos resumindo o conteúdo geral da aula]

## Conceitos e Definições
[Lista detalhada de todos os conceitos explicados, com suas definições]

## Pontos Principais
[Lista numerada com explicação de cada ponto, não apenas tópicos]

## Exemplos e Casos Práticos
[Exemplos mencionados pelo professor]

## Referências
[Autores, livros, artigos mencionados]

## Tarefas e Próximos Passos
[Trabalhos, leituras, ou atividades mencionadas]

## Observações Adicionais
[Detalhes extras relevantes, perguntas de alunos, etc.]

Seja completo e detalhado. Este resumo deve servir como material de estudo.`
    : `You are an assistant specialized in summarizing university lectures. Combine these partial summaries into a DETAILED, well-structured final summary. Use the following format:

## Lecture Topic
[Main title/topic]

## Overview
[2-3 paragraphs summarizing the overall lecture content]

## Concepts and Definitions
[Detailed list of all concepts explained, with their definitions]

## Key Points
[Numbered list with explanation of each point, not just topics]

## Examples and Practical Cases
[Examples mentioned by the professor]

## References
[Authors, books, articles mentioned]

## Assignments and Next Steps
[Homework, readings, or activities mentioned]

## Additional Notes
[Extra relevant details, student questions, etc.]

Be thorough and detailed. This summary should serve as study material.`;

  // Single chunk — summarize directly
  if (chunks.length === 1) {
    const directPrompt = language === 'pt'
      ? `Você é um assistente especializado em resumir aulas universitárias em português. Gere um resumo DETALHADO e bem estruturado da aula. Use o seguinte formato:

## Tema da Aula
[Título/tema principal]

## Visão Geral
[2-3 parágrafos resumindo o conteúdo geral da aula]

## Conceitos e Definições
[Lista detalhada de todos os conceitos explicados, com suas definições]

## Pontos Principais
[Lista numerada com explicação de cada ponto, não apenas tópicos]

## Exemplos e Casos Práticos
[Exemplos mencionados pelo professor]

## Referências
[Autores, livros, artigos mencionados]

## Tarefas e Próximos Passos
[Trabalhos, leituras, ou atividades mencionadas]

## Observações Adicionais
[Detalhes extras relevantes, perguntas de alunos, etc.]

Seja completo e detalhado. Este resumo deve servir como material de estudo.`
      : `You are an assistant specialized in summarizing university lectures. Generate a DETAILED, well-structured summary. Use the following format:

## Lecture Topic
[Main title/topic]

## Overview
[2-3 paragraphs summarizing the overall lecture content]

## Concepts and Definitions
[Detailed list of all concepts explained, with their definitions]

## Key Points
[Numbered list with explanation of each point, not just topics]

## Examples and Practical Cases
[Examples mentioned by the professor]

## References
[Authors, books, articles mentioned]

## Assignments and Next Steps
[Homework, readings, or activities mentioned]

## Additional Notes
[Extra relevant details, student questions, etc.]

Be thorough and detailed. This summary should serve as study material.`;
    return chatCompletion(directPrompt, transcript);
  }

  // Multiple chunks — summarize each, then merge
  console.log(`Transcript too long (${transcript.length} chars), splitting into ${chunks.length} chunks for summarization...`);

  const partialSummaries = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Summarizing chunk ${i + 1}/${chunks.length}...`);

    // Wait between calls to respect TPM limit
    if (i > 0) {
      await sleepWithKeepAlive(65000); // 65s to let the per-minute window reset
    }

    const summary = await chatCompletion(chunkPrompt, chunks[i]);
    partialSummaries.push(`[Part ${i + 1}/${chunks.length}]\n${summary}`);
  }

  // Final merge pass
  console.log('Merging partial summaries...');
  await sleepWithKeepAlive(65000);
  return chatCompletion(mergePrompt, partialSummaries.join('\n\n'));
}
