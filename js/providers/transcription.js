export class GroqWhisperProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'whisper-large-v3';
    this.baseUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';
  }

  buildRequestConfig(audioBlob, language) {
    return { model: this.model, language };
  }

  async transcribe(audioBlob, language = 'pt', fileName = 'audio.mp3', signal) {
    const formData = new FormData();
    formData.append('file', audioBlob, fileName);
    formData.append('model', this.model);
    formData.append('language', language);
    formData.append('response_format', 'text');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: formData,
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Transcription failed (${response.status}): ${error}`);
    }

    return response.text();
  }
}
