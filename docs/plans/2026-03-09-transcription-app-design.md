# Class Transcription Web App — Design Document

**Date:** 2026-03-09
**Status:** Approved

## Problem

A Brazilian university student needs a way to transcribe her 1-2 hour class recordings (in Portuguese) into text, with optional summarization of key points. The solution should be free to start, easy to use, and upgradeable to paid providers later.

## Solution

A single-page web app where the user uploads audio files, gets them transcribed via Groq's free Whisper API, and optionally summarized via Groq's free Llama 3 API. The architecture abstracts providers behind interfaces so paid services (OpenAI, Claude, etc.) can be swapped in later.

## Tech Stack

- **Frontend:** HTML / CSS / vanilla JavaScript (no framework — keep it simple and portable)
- **Transcription:** Groq Whisper API (free tier) — `whisper-large-v3` model, `language: "pt"` or `"en"`
- **Summarization:** Groq Llama 3 API (free tier) — generates key points from transcript
- **Hosting:** Static files — can be opened locally or deployed to Cloudflare Pages / Vercel / Netlify
- **Storage:** localStorage for API keys, settings, and transcription history

## User Flow

1. Open app in browser
2. First visit: enter Groq API key in settings (saved to localStorage)
3. Select audio language (Portuguese or English)
4. Upload audio file (.mp3, .m4a, .wav, .ogg, .webm)
5. App chunks file if > 25MB, sends chunks to Groq Whisper API
6. Transcription appears on screen with progress indicator
7. Click "Summarize" to generate key points via Groq Llama 3
8. Copy or download transcription + summary as text file
9. Transcription saved to history (localStorage) for later review

## Audio Chunking

Groq Whisper API limit: 25MB per request. A 2-hour 128kbps MP3 is ~115MB.

Strategy: Split audio into ~20MB chunks client-side, transcribe each sequentially, concatenate results. Use file slicing (binary chunking) since Whisper handles partial audio gracefully.

## Internationalization (i18n)

- UI supports English and Portuguese via language toggle
- All UI strings externalized into a translations object
- Audio transcription supports both Portuguese and English input

## Provider Abstraction (Upgrade Path)

All API calls go through provider interfaces:

```
TranscriptionProvider {
  transcribe(audioBlob, language) -> string
}

SummarizationProvider {
  summarize(text, language) -> string
}
```

Initial providers: GroqWhisperProvider, GroqLlamaProvider
Future providers: OpenAIWhisperProvider, ClaudeProvider, etc.

Settings page allows selecting provider + model per function.

## UI Design

Clean, minimal layout:
- **Header:** App name + language toggle (EN/PT) + settings gear
- **Settings panel:** API keys, provider/model selection per function
- **Upload area:** Drag-and-drop or file picker, large and prominent
- **Progress:** Chunk-by-chunk progress bar during transcription
- **Transcript view:** Full text with copy/download buttons
- **Summary section:** Collapsible, below transcript, with copy/download
- **History sidebar:** List of past transcriptions by date/name

## File Structure

```
/
  index.html          — Single page app shell
  css/
    styles.css        — All styles
  js/
    app.js            — Main app logic, UI binding
    i18n.js           — Translation strings
    providers/
      transcription.js — TranscriptionProvider interface + Groq implementation
      summarization.js — SummarizationProvider interface + Groq implementation
    audio-chunker.js  — Client-side audio file splitting
    storage.js        — localStorage helpers for settings + history
    utils.js          — Download, copy, formatting helpers
```

## Constraints

- All processing happens client-side (no backend server)
- API keys stored in localStorage (acceptable for personal use)
- Groq free tier rate limits: 20 req/min for Whisper, may need throttling between chunks
- Maximum audio quality limited by Whisper model capabilities

## Future Enhancements (Not in Scope Now)

- Live recording in-browser
- Speaker diarization (who said what)
- User accounts / cloud storage
- Mobile-optimized PWA
- Export to various formats (PDF, DOCX)
- Translation (PT <-> EN)
