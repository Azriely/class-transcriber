# Class Transcriber v2 — Redesign Design Document

**Date:** 2026-03-09
**Status:** Approved

## Problem

v1 is functional but visually basic, requires users to manage their own API keys, and has no persistence beyond localStorage. The app needs a premium glassmorphism design with 3D animations, server-side API key management, user accounts, and proper database storage.

## Solution

Full rebuild as a React + Vite SPA with a Node.js/Express backend, SQLite database, JWT authentication, Three.js 3D audio-reactive orb, and glassmorphism UI with dark/light mode toggle.

## Tech Stack

### Frontend
- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS 4 + custom glassmorphism utilities
- **3D:** Three.js + @react-three/fiber + @react-three/drei
- **State:** React Context (simple enough, no Redux needed)
- **HTTP:** fetch with auth interceptor
- **Routing:** React Router (login, dashboard, history)

### Backend
- **Runtime:** Node.js 20 + Express
- **Database:** SQLite via better-sqlite3 (zero-config, file-based, Docker volume)
- **Auth:** bcrypt for passwords, JWT for sessions
- **File uploads:** multer (multipart form data)
- **API proxy:** Server-side Groq Whisper + Llama calls

### Infrastructure
- **Docker:** Multi-stage build (Vite build → serve with Express)
- **Env vars:** GROQ_API_KEY, JWT_SECRET, PORT
- **Deployment:** Single Docker container on Unraid, azriel.io network

## Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  theme TEXT DEFAULT 'dark',
  ui_language TEXT DEFAULT 'en',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transcriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  audio_language TEXT DEFAULT 'pt',
  transcript TEXT NOT NULL,
  summary TEXT,
  duration_seconds INTEGER,
  file_size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Auth
- `POST /api/auth/register` — { email, password, displayName } → { token, user }
- `POST /api/auth/login` — { email, password } → { token, user }
- `GET /api/auth/me` — (auth) → { user }

### Transcription
- `POST /api/transcribe` — (auth, multipart: audio file + language) → { transcriptionId, transcript }
  - Server chunks the file if needed
  - Calls Groq Whisper with server-side API key
  - Saves to DB
  - Returns result
- `POST /api/transcriptions/:id/summarize` — (auth) → { summary }
  - Fetches transcript from DB
  - Calls Groq Llama with server-side API key
  - Updates DB with summary
  - Returns result

### History
- `GET /api/transcriptions` — (auth) → [{ id, title, language, createdAt, hasSummary }]
- `GET /api/transcriptions/:id` — (auth) → { id, title, transcript, summary, ... }
- `DELETE /api/transcriptions/:id` — (auth) → 204

### User
- `PATCH /api/user/preferences` — (auth, { theme, uiLanguage }) → { user }

## Frontend Architecture

### Pages
1. **AuthPage** — Login/Register with glassmorphism card, 3D orb in background
2. **DashboardPage** — Main transcription interface
3. **HistoryPage** — List of past transcriptions (could be sidebar or separate page)

### Key Components
- `ThreeOrb` — Three.js audio-reactive sphere
  - Idle: gentle floating + slow rotation, soft glow
  - Transcribing: pulsing rings, faster movement, color shift (purple → blue)
  - Summarizing: smooth color shift (blue → green)
  - Complete: celebratory pulse, settles back to idle
- `GlassCard` — Reusable frosted glass container component
- `UploadZone` — Drag-and-drop with visual feedback
- `TranscriptPanel` — Scrollable transcript with copy/download
- `SummaryPanel` — Collapsible summary with copy/download
- `ThemeToggle` — Dark/light mode switch with smooth transition
- `LanguageToggle` — EN/PT UI switch
- `ProgressRing` — Circular progress around the orb during transcription

### Glassmorphism System

```css
/* Dark mode glass */
.glass-dark {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Light mode glass */
.glass-light {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}
```

### Color Palette

**Dark mode:**
- Background: #0a0a1a (deep navy-black)
- Gradient blobs: purple (#7c3aed) → blue (#3b82f6) → teal (#06b6d4)
- Glass: white at 5% opacity
- Text: white / white at 60%
- Accent: #8b5cf6 (violet)

**Light mode:**
- Background: #f0f4ff (soft blue-white)
- Gradient blobs: lighter versions of same
- Glass: white at 60% opacity
- Text: #1a1a2e / #6b7280
- Accent: #7c3aed (violet)

## Three.js Orb Design

The orb is a displaced sphere with vertex noise:

```
Geometry: IcosahedronGeometry(1, 64)
Material: MeshPhysicalMaterial with:
  - clearcoat, metalness, roughness
  - Custom vertex shader for displacement
  - Color shifts based on app state

States:
  idle:         slow wobble, low displacement, purple-blue gradient
  transcribing: fast pulse, high displacement, blue-cyan with ring particles
  summarizing:  medium pulse, medium displacement, cyan-green shift
  complete:     brief expansion + settle, return to idle
  error:        brief red flash + shake, return to idle
```

Animated with requestAnimationFrame, displacement driven by simplex noise + time uniform.

## File Structure

```
/
  server/
    index.js              — Express server entry
    db.js                 — SQLite setup + queries
    routes/
      auth.js             — Register, login, me
      transcriptions.js   — CRUD + Groq proxy
      user.js             — Preferences
    middleware/
      auth.js             — JWT verification
    services/
      groq.js             — Groq Whisper + Llama API calls
      chunker.js          — Server-side audio chunking
  src/
    main.tsx              — React entry
    App.tsx               — Router + providers
    pages/
      AuthPage.tsx
      DashboardPage.tsx
    components/
      ThreeOrb.tsx
      GlassCard.tsx
      UploadZone.tsx
      TranscriptPanel.tsx
      SummaryPanel.tsx
      ThemeToggle.tsx
      LanguageToggle.tsx
      ProgressRing.tsx
      Layout.tsx
    hooks/
      useAuth.ts
      useTranscription.ts
      useTheme.ts
    context/
      AuthContext.tsx
      ThemeContext.tsx
      I18nContext.tsx
    lib/
      api.ts              — API client with auth headers
      i18n.ts             — Translations
    styles/
      glass.css           — Glassmorphism utilities
  public/
  index.html
  vite.config.ts
  tailwind.config.ts
  package.json
  Dockerfile
  docker-compose.yml
```

## Docker Setup

```dockerfile
# Build frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["node", "server/index.js"]
```

```yaml
# docker-compose.yml
services:
  class-transcriber:
    build: .
    ports:
      - "8090:3000"
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    volumes:
      - transcriber-data:/app/data
    restart: unless-stopped

volumes:
  transcriber-data:
```

Express serves the Vite build from `dist/` and handles API routes under `/api/`.

## Constraints

- Single Docker container (Express serves both API + static frontend)
- SQLite file stored in Docker volume for persistence
- Groq API key never exposed to frontend
- JWT tokens stored in httpOnly cookies (not localStorage) for security
- Audio file uploads limited to 500MB
- Rate limiting on auth endpoints (prevent brute force)

## Future Enhancements (Not in Scope)
- OAuth (Google/GitHub login)
- Real-time transcription progress via WebSocket
- Audio playback synced with transcript
- Export to PDF/DOCX
- Team/shared transcriptions
- Mobile app (PWA)
