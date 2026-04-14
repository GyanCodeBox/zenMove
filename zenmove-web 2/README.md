# ZenMove Web — Customer App (Phase 1)

React + Vite + TypeScript frontend for ZenMove customers.

## Stack

- **React 18** + **TypeScript**
- **Vite** — fast dev server with HMR
- **React Router v6** — client-side routing
- **Tailwind CSS** — utility styling
- **Zustand** — auth state management
- **Lucide React** — icons
- **Fonts**: Sora (display) + DM Sans (body)

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/auth` | AuthPage | Register + Login (tab toggle) |
| `/moves` | MovesPage | Dashboard — list all moves with stats |
| `/moves/new` | CreateMovePage | Multi-field form to create a move |
| `/moves/:id` | MoveDetailPage | Status timeline + info + advance CTA |
| `/moves/:id/items` | ItemsPage | Item grid with QR/photo/load status |
| `/moves/:id/manifest` | ManifestPage | PDF manifest viewer + download |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (backend must be running on :8000)
npm run dev
# → http://localhost:3000

# 3. Build for production
npm run build
```

## Backend proxy

Vite proxies `/api` → `http://localhost:8000`.  
Start the FastAPI backend first:

```bash
# In the zenmove/ directory
uvicorn app.main:app --reload
```

## Design System

Colours defined in `src/index.css` as CSS variables:

| Variable | Value | Use |
|---|---|---|
| `--navy` | `#1A3C5E` | Primary brand, sidebar, headings |
| `--amber` | `#F4A261` | Accent, CTA highlights |
| `--teal` | `#2E86AB` | Active states, progress |
| `--surface` | `#f7f9fc` | Page background |
| `--border` | `#d5e0ec` | Card borders |

Animation classes: `animate-fade-up`, `animate-fade-in`, `animate-slide-in`.  
Stagger children: wrap parent in `stagger` class.

## Connecting to backend

All API calls live in `src/services/api.ts`.  
Auth token stored in `localStorage` as `zm_token`, managed by Zustand in `src/store/auth.ts`.
