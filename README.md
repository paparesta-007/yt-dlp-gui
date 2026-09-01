# 🎬 yt-dlp GUI

> A clean, minimal, high-performance web GUI and media manager for **yt-dlp**, built with **React**, **Tailwind CSS**, **shadcn/ui-inspired styling**, **React Router v7**, and **Node.js (Fastify + TypeScript)**.

---

## ✨ Tech Stack & Architecture

- **Frontend**:
  - **React 19 + TypeScript + Vite + pnpm**
  - **Tailwind CSS v4** + **shadcn/ui-inspired design** (Dark/Light mode, animations, custom scrollbars)
  - **React Router v7** (`react-router` unified package, without deprecated `react-router-dom`)
  - **Lucide Icons** & **Canvas Confetti**
  - **WebSocket Client** for real-time progress, speed, ETA, and live streaming console logs
- **Backend (Node.js + Fastify + TypeScript)**:
  - **Fastify v5** with `@fastify/websocket`, `@fastify/cors`, and `@fastify/static`
  - **`tsx`** for instant zero-compilation startup and hot-reloading
  - **Deep FFmpeg Detection**: Scans WinGet packages, Chocolatey, Program Files, and system paths, passing `--ffmpeg-location` directly to `yt-dlp`
  - **yt-dlp Engine**: Auto-installer (pulls latest `yt-dlp.exe` from GitHub releases), one-click updater (`yt-dlp -U`), metadata extractor (`--dump-single-json`), CLI argument builder, and real-time stdout/stderr progress parser
  - **Queue Manager**: Background download queue, concurrent fragment limits, live event broadcasting, job cancellation & retries
  - **Media Library & Streamer**: In-app streaming with HTTP range headers (video/audio scrubbing) + native Windows Explorer file launcher
  - **Thread-safe JSON Storage**: Stores download history and custom presets

---

## 🏗️ Monorepo Structure

```
yt-dlp-gui/
├── package.json                   # Root monorepo scripts (pnpm dev, pnpm build, pnpm start)
├── pnpm-workspace.yaml            # pnpm workspace definition (frontend + backend)
├── README.md                      # Documentation
│
├── backend/                       # Node.js + Fastify + TypeScript Backend
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts              # Fastify server entry point, static delivery & WebSocket route
│       ├── config.ts              # Settings management & JSON persistence
│       ├── ffmpeg.ts              # Deep WinGet/System FFmpeg detection & version probe
│       ├── ytdlp.ts               # yt-dlp binary resolver, auto-installer & updater
│       ├── extractor.ts           # Metadata extractor (--dump-single-json)
│       ├── builder.ts             # CLI arguments builder with explicit FFmpeg location
│       ├── parser.ts              # Real-time stdout progress parser
│       ├── manager.ts             # Download queue manager, process executor, WebSocket Hub
│       ├── storage.ts             # Persistent history & presets storage
│       └── system.ts              # Library scanner, Windows Explorer launcher
│
└── frontend/                      # React + Tailwind + React Router v7 Frontend
    ├── package.json
    ├── vite.config.ts             # Vite configuration with Tailwind v4 & API/WS proxy
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── index.html
    └── src/
        ├── index.css              # Design tokens, themes & animations
        ├── main.tsx               # React root with BrowserRouter from react-router
        ├── App.tsx                # App layout (header, sidebar, routes, mobile nav)
        ├── types/                 # TypeScript type definitions
        ├── lib/                   # API client, WebSocket manager, formatting utils
        ├── components/
        │   ├── ui/                # Button, Input, Badge, Card, Switch, Modal, Tabs
        │   ├── Header.tsx         # Binary status badges, active counter, theme toggle
        │   ├── Sidebar.tsx        # Navigation links with active count badges
        │   ├── UrlBar.tsx         # Hero URL input with clipboard paste & preset chips
        │   ├── InspectModal.tsx   # Comprehensive format & stream inspection modal
        │   ├── DownloadItem.tsx   # Download card with live progress, speed, ETA, and actions
        │   ├── LogViewerModal.tsx # Terminal console viewer for raw yt-dlp logs
        │   ├── MediaPlayerModal.tsx # In-app video/audio media player
        │   └── SystemModal.tsx    # yt-dlp & FFmpeg status and updater modal
        └── pages/
            ├── DownloadsPage.tsx  # Active queue & downloads manager
            ├── LibraryPage.tsx    # Downloaded media browser with player & folder actions
            ├── PresetsPage.tsx    # Custom download profiles manager
            └── SettingsPage.tsx   # App paths, concurrency, network, and cookies settings
```

---

## 🚀 How to Run

From the root directory `C:\Users\tommaso\Desktop\my-projects\yt-dlp-gui`:

```bash
# 1. Install dependencies
pnpm install

# 2. Start development mode (Frontend on http://localhost:5173 + Node Backend on http://localhost:8080)
pnpm dev

# 3. Build for production
pnpm build

# 4. Start standalone production server (http://localhost:8080)
pnpm start
```

---

## 📜 License
MIT License
