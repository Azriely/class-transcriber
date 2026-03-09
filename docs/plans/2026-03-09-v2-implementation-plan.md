# Class Transcriber v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the class transcription app as a React + Vite SPA with Node/Express backend, SQLite, JWT auth, Three.js 3D orb, glassmorphism UI, and Docker deployment.

**Architecture:** React SPA served by Express, which also provides REST API endpoints. SQLite for persistence. Groq API calls happen server-side. Three.js orb provides visual feedback. Glassmorphism design with dark/light mode.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Three.js (@react-three/fiber), Node.js, Express, SQLite (better-sqlite3), JWT, bcrypt, multer, Docker

---

## Phase 1: Project Setup + Backend

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.node.json`
- Create: `tailwind.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Initialize Vite + React + TypeScript project**

From the project root (after clearing v1 files):
```bash
# Remove v1 source files (keep docs/)
rm -rf css/ js/ index.html package.json Dockerfile .dockerignore
# Create new Vite project in place
npm create vite@latest . -- --template react-ts
```

**Step 2: Install all dependencies**

```bash
# Frontend
npm install react-router-dom three @react-three/fiber @react-three/drei
npm install -D tailwindcss @tailwindcss/vite

# Backend (will run from same package)
npm install express better-sqlite3 bcryptjs jsonwebtoken multer cors cookie-parser dotenv
npm install -D @types/express @types/better-sqlite3 @types/bcryptjs @types/jsonwebtoken @types/multer @types/cors @types/cookie-parser nodemon concurrently
```

**Step 3: Configure Vite for API proxy**

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

**Step 4: Configure Tailwind**

In `src/index.css`:
```css
@import "tailwindcss";
```

**Step 5: Create .env.example**

```
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET=your_random_secret_here
PORT=3001
```

Also create `.env` with actual values (it's gitignored).

**Step 6: Update package.json scripts**

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"nodemon server/index.js\"",
    "build": "vite build",
    "server": "node server/index.js",
    "start": "NODE_ENV=production node server/index.js"
  }
}
```

**Step 7: Create minimal src/App.tsx**

```tsx
export default function App() {
  return <div className="min-h-screen bg-[#0a0a1a] text-white flex items-center justify-center">
    <h1 className="text-4xl font-bold">Class Transcriber</h1>
  </div>;
}
```

**Step 8: Update .gitignore**

Add: `node_modules/`, `dist/`, `.env`, `data/`, `.wrangler/`

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold v2 with Vite + React + TypeScript + Tailwind"
```

---

### Task 2: Express Server + SQLite Database

**Files:**
- Create: `server/index.js`
- Create: `server/db.js`

**Step 1: Create server/db.js**

```javascript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'transcriber.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    theme TEXT DEFAULT 'dark',
    ui_language TEXT DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transcriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    audio_language TEXT DEFAULT 'pt',
    transcript TEXT NOT NULL,
    summary TEXT,
    file_size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
```

**Step 2: Create server/index.js**

```javascript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// API routes (will be added in later tasks)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// In production, serve the Vite build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 3: Add `"type": "module"` to package.json** (for ES module imports in server code)

**Step 4: Test server starts**

```bash
node server/index.js
# Should log "Server running on port 3001"
# curl http://localhost:3001/api/health should return {"status":"ok"}
```

**Step 5: Commit**

```bash
git add server/
git commit -m "feat: add Express server with SQLite database setup"
```

---

### Task 3: Auth System (Backend)

**Files:**
- Create: `server/middleware/auth.js`
- Create: `server/routes/auth.js`

**Step 1: Create JWT auth middleware**

`server/middleware/auth.js`:
```javascript
import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**Step 2: Create auth routes**

`server/routes/auth.js`:
```javascript
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = Router();

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// Register
router.post('/register', (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)'
  ).run(email, passwordHash, displayName || email.split('@')[0]);

  const token = createToken(result.lastInsertRowid);
  setTokenCookie(res, token);

  const user = db.prepare('SELECT id, email, display_name, theme, ui_language FROM users WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json({ user });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = createToken(user.id);
  setTokenCookie(res, token);

  res.json({
    user: { id: user.id, email: user.email, display_name: user.display_name, theme: user.theme, ui_language: user.ui_language }
  });
});

// Get current user
router.get('/me', (req, res) => {
  // This needs auth middleware applied when mounting
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, email, display_name, theme, ui_language FROM users WHERE id = ?')
      .get(payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

export default router;
```

**Step 3: Mount auth routes in server/index.js**

Add:
```javascript
import authRoutes from './routes/auth.js';
app.use('/api/auth', authRoutes);
```

**Step 4: Test with curl**

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' -c cookies.txt

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' -c cookies.txt

# Me
curl http://localhost:3001/api/auth/me -b cookies.txt
```

**Step 5: Commit**

```bash
git add server/middleware/ server/routes/auth.js server/index.js
git commit -m "feat: add JWT auth system with register, login, logout"
```

---

### Task 4: Groq Service + Transcription Routes

**Files:**
- Create: `server/services/groq.js`
- Create: `server/services/chunker.js`
- Create: `server/routes/transcriptions.js`

**Step 1: Create Groq service**

`server/services/groq.js`:
```javascript
import fs from 'fs';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function transcribeAudio(filePath, language = 'pt') {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);
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
```

**Step 2: Create audio chunker service**

`server/services/chunker.js`:
```javascript
import fs from 'fs';
import path from 'path';
import os from 'os';

const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

export function chunkAudioFile(filePath) {
  const stats = fs.statSync(filePath);
  if (stats.size <= CHUNK_SIZE) return [filePath];

  const chunks = [];
  const buffer = fs.readFileSync(filePath);
  let offset = 0;
  let i = 0;

  while (offset < buffer.length) {
    const end = Math.min(offset + CHUNK_SIZE, buffer.length);
    const chunkPath = path.join(os.tmpdir(), `chunk-${Date.now()}-${i}.mp3`);
    fs.writeFileSync(chunkPath, buffer.subarray(offset, end));
    chunks.push(chunkPath);
    offset = end;
    i++;
  }

  return chunks;
}

export function cleanupChunks(chunkPaths, originalPath) {
  for (const p of chunkPaths) {
    if (p !== originalPath) {
      try { fs.unlinkSync(p); } catch {}
    }
  }
}
```

**Step 3: Create transcription routes**

`server/routes/transcriptions.js`:
```javascript
import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import { transcribeAudio, summarizeTranscript } from '../services/groq.js';
import { chunkAudioFile, cleanupChunks } from '../services/chunker.js';
import db from '../db.js';

const router = Router();
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 500 * 1024 * 1024 } });

// Transcribe uploaded audio
router.post('/transcribe', authenticate, upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

  const language = req.body.language || 'pt';
  const title = req.body.title || req.file.originalname.replace(/\.[^/.]+$/, '') || 'Untitled';
  const chunks = chunkAudioFile(req.file.path);

  try {
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      const text = await transcribeAudio(chunks[i], language);
      results.push(text);
      // Rate limiting: wait between chunks
      if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 1500));
    }

    const transcript = results.join(' ');

    if (!transcript.trim()) {
      return res.status(422).json({ error: 'No speech detected in audio' });
    }

    const result = db.prepare(
      'INSERT INTO transcriptions (user_id, title, audio_language, transcript, file_size) VALUES (?, ?, ?, ?, ?)'
    ).run(req.userId, title, language, transcript, req.file.size);

    res.json({
      id: result.lastInsertRowid,
      title,
      transcript,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    cleanupChunks(chunks, req.file.path);
    try { fs.unlinkSync(req.file.path); } catch {}
  }
});

// Summarize existing transcription
router.post('/:id/summarize', authenticate, async (req, res) => {
  const row = db.prepare('SELECT * FROM transcriptions WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Transcription not found' });

  try {
    const summary = await summarizeTranscript(row.transcript, row.audio_language);
    db.prepare('UPDATE transcriptions SET summary = ? WHERE id = ?').run(summary, row.id);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List user's transcriptions
router.get('/', authenticate, (req, res) => {
  const rows = db.prepare(
    'SELECT id, title, audio_language, file_size, summary IS NOT NULL as has_summary, created_at FROM transcriptions WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId);
  res.json(rows);
});

// Get single transcription
router.get('/:id', authenticate, (req, res) => {
  const row = db.prepare('SELECT * FROM transcriptions WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Transcription not found' });
  res.json(row);
});

// Delete transcription
router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare('DELETE FROM transcriptions WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Transcription not found' });
  res.status(204).end();
});

export default router;
```

**Step 4: Create user preferences route**

`server/routes/user.js`:
```javascript
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

router.patch('/preferences', authenticate, (req, res) => {
  const { theme, uiLanguage } = req.body;
  const updates = [];
  const params = [];

  if (theme && ['dark', 'light'].includes(theme)) { updates.push('theme = ?'); params.push(theme); }
  if (uiLanguage && ['en', 'pt'].includes(uiLanguage)) { updates.push('ui_language = ?'); params.push(uiLanguage); }

  if (updates.length === 0) return res.status(400).json({ error: 'No valid preferences' });

  params.push(req.userId);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db.prepare('SELECT id, email, display_name, theme, ui_language FROM users WHERE id = ?')
    .get(req.userId);
  res.json({ user });
});

export default router;
```

**Step 5: Mount all routes in server/index.js**

```javascript
import authRoutes from './routes/auth.js';
import transcriptionRoutes from './routes/transcriptions.js';
import userRoutes from './routes/user.js';

app.use('/api/auth', authRoutes);
app.use('/api/transcriptions', transcriptionRoutes);
app.use('/api/user', userRoutes);
```

**Step 6: Test endpoints with curl**

**Step 7: Commit**

```bash
git add server/
git commit -m "feat: add Groq transcription/summarization service and all API routes"
```

---

## Phase 2: Frontend Core

### Task 5: Theme System + Glassmorphism CSS

**Files:**
- Create: `src/context/ThemeContext.tsx`
- Create: `src/hooks/useTheme.ts`
- Create: `src/styles/glass.css`
- Modify: `src/index.css`

**Step 1: Create ThemeContext**

Provides `theme` (dark/light) and `toggleTheme()`. Persists to user preferences via API when logged in, falls back to localStorage.

**Step 2: Create glassmorphism CSS**

`src/styles/glass.css` — utility classes:
- `.glass` — adaptive glass card (dark or light based on parent `[data-theme]`)
- `.glass-strong` — more opaque variant
- `.glass-subtle` — very subtle variant
- Background gradient blobs: animated purple/blue/teal circles with CSS `@keyframes`
- Smooth dark↔light transition on body/background (300ms)

**Step 3: Set up Tailwind with dark mode class strategy**

The app root gets `data-theme="dark"` or `data-theme="light"`. Tailwind dark mode uses `selector` strategy.

**Step 4: Commit**

```bash
git commit -m "feat: add theme system with glassmorphism CSS utilities"
```

---

### Task 6: i18n System

**Files:**
- Create: `src/context/I18nContext.tsx`
- Create: `src/lib/i18n.ts`

Port the i18n system from v1, adapted for React Context. Provide `t(key)`, `language`, `setLanguage()` via context. Same translation keys as v1 plus new auth-related keys (login, register, email, password, etc).

**Commit:** `feat: add i18n context with English and Portuguese translations`

---

### Task 7: Auth Context + API Client

**Files:**
- Create: `src/context/AuthContext.tsx`
- Create: `src/hooks/useAuth.ts`
- Create: `src/lib/api.ts`

**Step 1: Create API client**

`src/lib/api.ts` — thin wrapper around fetch:
- All requests include `credentials: 'include'` for cookies
- JSON body helper
- Multipart (file upload) helper
- Error handling: if 401, redirect to login

**Step 2: Create AuthContext**

- On mount: call `GET /api/auth/me` to check if already logged in (cookie)
- Provides: `user`, `isAuthenticated`, `isLoading`, `login()`, `register()`, `logout()`
- `login` and `register` call the API, set user state
- `logout` calls API, clears state

**Step 3: Create useAuth hook**

Simple: `return useContext(AuthContext)`

**Commit:** `feat: add auth context and API client`

---

### Task 8: App Shell + Routing + Auth Page

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/AuthPage.tsx`
- Create: `src/pages/DashboardPage.tsx`
- Create: `src/components/Layout.tsx`
- Create: `src/components/GlassCard.tsx`

**Step 1: Set up routing in App.tsx**

```tsx
<ThemeProvider>
  <I18nProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </I18nProvider>
</ThemeProvider>
```

ProtectedRoute: if not authed, redirect to /login.

**Step 2: Create GlassCard component**

Reusable wrapper with glassmorphism styling. Props: `className`, `children`, `variant` (default/strong/subtle).

**Step 3: Create AuthPage**

- Centered GlassCard on animated gradient background
- Toggle between Login and Register forms
- Email + password inputs with glassmorphism styling
- Display name input for registration
- Error display
- Submit calls auth context methods
- On success: redirect to /

**Step 4: Create minimal DashboardPage placeholder**

```tsx
export default function DashboardPage() {
  return <div>Dashboard coming soon</div>;
}
```

**Step 5: Create Layout component**

Header bar with: app title, language toggle, theme toggle, user menu (display name + logout).
Main content area below.

**Step 6: Test auth flow in browser**

Register → redirects to dashboard. Refresh → stays logged in. Logout → back to login.

**Step 7: Commit**

```bash
git commit -m "feat: add auth page, routing, glass card, and app shell"
```

---

## Phase 3: Transcription Flow

### Task 9: Upload Zone Component

**Files:**
- Create: `src/components/UploadZone.tsx`
- Create: `src/hooks/useTranscription.ts`

**Step 1: Create useTranscription hook**

State machine managing the transcription lifecycle:
- `status`: idle | uploading | transcribing | summarizing | complete | error
- `transcript`, `summary`, `progress`, `error`
- `uploadAndTranscribe(file, language)` — POST multipart to /api/transcribe
- `summarize(transcriptionId)` — POST to /api/transcriptions/:id/summarize
- `reset()` — back to idle

**Step 2: Create UploadZone**

- Large glassmorphism drop zone
- Drag events: dragover (highlight), dragleave (unhighlight), drop (handle file)
- Click to browse (hidden file input)
- File validation (audio types + extension fallback)
- Shows file name + size after selection
- "Transcribe" button triggers the hook
- Disabled state during transcription

**Step 3: Commit**

```bash
git commit -m "feat: add upload zone and transcription hook"
```

---

### Task 10: Transcript + Summary Panels

**Files:**
- Create: `src/components/TranscriptPanel.tsx`
- Create: `src/components/SummaryPanel.tsx`

**Step 1: TranscriptPanel**

- GlassCard with header ("Transcription" + copy/download buttons)
- Scrollable text content area
- "Generate Summary" button at bottom
- Appears after transcription completes (smooth fade-in)

**Step 2: SummaryPanel**

- GlassCard with header ("Summary" + copy/download buttons)
- Markdown-like rendering of summary text (bullet points, bold)
- Appears after summarization completes

**Step 3: Commit**

```bash
git commit -m "feat: add transcript and summary display panels"
```

---

### Task 11: Dashboard Page Assembly

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

Wire everything together:
- UploadZone at top
- Progress indicator during transcription
- TranscriptPanel below (when transcript exists)
- SummaryPanel below that (when summary exists)
- Audio language selector
- State transitions: idle → uploading → transcript visible → summary visible

**Commit:** `feat: assemble dashboard with upload, transcript, and summary flow`

---

### Task 12: History Sidebar

**Files:**
- Create: `src/components/HistorySidebar.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**Step 1: Create HistorySidebar**

- Fetches `GET /api/transcriptions` on mount
- List of GlassCard items (title + date)
- Click loads that transcription into the main view
- Delete button (with confirmation) calls DELETE endpoint
- Empty state message
- Sidebar on desktop (right side), collapsible on mobile

**Step 2: Integrate into DashboardPage layout**

Flexbox: main content (left) + sidebar (right, 300px). Responsive collapse.

**Step 3: Commit**

```bash
git commit -m "feat: add history sidebar with CRUD"
```

---

## Phase 4: 3D Orb + Visual Polish

### Task 13: Three.js Audio-Reactive Orb

**Files:**
- Create: `src/components/ThreeOrb.tsx`
- Create: `src/components/OrbScene.tsx`

This is the flagship visual element.

**Step 1: Create OrbScene**

Uses `@react-three/fiber` Canvas. Contains the orb, lighting, and post-processing.

**Step 2: Create ThreeOrb**

Props: `state` ('idle' | 'transcribing' | 'summarizing' | 'complete' | 'error')

Implementation:
- `IcosahedronGeometry(1, 64)` for smooth sphere
- Custom vertex shader using simplex noise for displacement
- `MeshPhysicalMaterial` with clearcoat, metalness
- `useFrame` hook for animation loop:
  - Time-based noise displacement
  - Amplitude controlled by state (idle=0.1, transcribing=0.4, etc)
  - Speed controlled by state (idle=slow, transcribing=fast)
  - Color lerp between states (purple→blue→cyan→green)
- Smooth state transitions using lerp/spring

**Step 3: Integrate into DashboardPage**

Place the orb behind/above the upload zone. It's always visible, reacting to the transcription state.

**Step 4: Ensure performance**

- Use `useMemo` for geometry
- Limit pixel ratio on mobile
- `frameloop="demand"` when idle (optional)

**Step 5: Commit**

```bash
git commit -m "feat: add Three.js audio-reactive orb with state animations"
```

---

### Task 14: Animated Background + Visual Polish

**Files:**
- Create: `src/components/AnimatedBackground.tsx`
- Modify: various component files for animations

**Step 1: Animated gradient blobs**

CSS-based animated gradient blobs behind everything:
- 3 large circles with blur, positioned absolute
- Slow CSS animation (transform + opacity)
- Different colors per theme

**Step 2: Transitions and micro-interactions**

- Page transitions (fade)
- Card appear animations (slide up + fade)
- Button hover effects (subtle glow)
- Upload zone pulse on drag-over
- Smooth theme transition (300ms on all colors)

**Step 3: Progress visualization**

During transcription, show a circular progress ring around the orb or a progress bar below it.

**Step 4: Commit**

```bash
git commit -m "feat: add animated background, transitions, and visual polish"
```

---

## Phase 5: Docker + Deployment

### Task 15: Docker Configuration

**Files:**
- Create: `Dockerfile` (replace v1)
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Step 1: Create multi-stage Dockerfile**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/index.js"]
```

Note: copy node_modules from build stage since server needs them at runtime (better-sqlite3, bcryptjs, etc).

**Step 2: Create docker-compose.yml**

**Step 3: Create .dockerignore**

```
node_modules
dist
data
.env
.git
docs
*.test.*
```

**Step 4: Test Docker build locally (if docker available) or commit and build on Unraid**

**Step 5: Commit**

```bash
git commit -m "feat: add Docker multi-stage build and compose config"
```

---

### Task 16: Deploy to Unraid

**Step 1: Push all code to GitHub**

```bash
git push origin main
```

**Step 2: SSH to Unraid and deploy**

```bash
ssh root@100.75.7.126
cd /mnt/user/appdata/class-transcriber
git pull
docker stop class-transcriber && docker rm class-transcriber
docker build -t class-transcriber .
docker run -d \
  --name class-transcriber \
  --network azriel.io \
  --restart unless-stopped \
  -p 8090:3000 \
  -e GROQ_API_KEY=<key> \
  -e JWT_SECRET=<random-secret> \
  -e NODE_ENV=production \
  -v transcriber-data:/app/data \
  class-transcriber
```

**Step 3: Verify deployment**

```bash
curl http://localhost:8090/api/health
```

**Step 4: Commit any final fixes**

---

## Task Dependency Summary

| Task | Description | Phase | Dependencies |
|------|-------------|-------|-------------|
| 1 | Project scaffolding | 1 | None |
| 2 | Express + SQLite | 1 | 1 |
| 3 | Auth system | 1 | 2 |
| 4 | Groq service + routes | 1 | 3 |
| 5 | Theme + glassmorphism | 2 | 1 |
| 6 | i18n system | 2 | 1 |
| 7 | Auth context + API | 2 | 1 |
| 8 | App shell + auth page | 2 | 5, 6, 7 |
| 9 | Upload zone | 3 | 8 |
| 10 | Transcript + summary | 3 | 8 |
| 11 | Dashboard assembly | 3 | 9, 10 |
| 12 | History sidebar | 3 | 11 |
| 13 | Three.js orb | 4 | 11 |
| 14 | Visual polish | 4 | 13 |
| 15 | Docker config | 5 | 14 |
| 16 | Deploy to Unraid | 5 | 15 |

**Tasks 5, 6, 7 are independent and can be parallelized.**
**Tasks 9, 10 are independent and can be parallelized.**
