export class GroqLlamaProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'llama-3.3-70b-versatile';
    this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  }

  buildPrompt(transcript, language = 'pt') {
    if (language === 'pt') {
      return `Você é um assistente que resume aulas universitárias. Dado o texto transcrito de uma aula, gere um resumo conciso com os pontos principais em português.

Formato do resumo:
- Título/tema da aula (se identificável)
- 5-10 pontos principais em tópicos
- Conceitos-chave mencionados
- Qualquer tarefa ou leitura mencionada

Transcrição da aula:
${transcript}`;
    }
    return `You are an assistant that summarizes university lectures. Given the transcribed text of a lecture, generate a concise summary with key points in English.

Summary format:
- Lecture title/topic (if identifiable)
- 5-10 key points as bullet points
- Key concepts mentioned
- Any assignments or readings mentioned

Lecture transcript:
${transcript}`;
  }

  async summarize(transcript, language = 'pt', signal) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'user', content: this.buildPrompt(transcript, language) }
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Summarization failed (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
