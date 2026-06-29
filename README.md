# Frontier OS — Frontend

React + Vite frontend for [Frontier OS](https://frontier-os.com) — private beta acquisition screening product.

**Framework:** React 19 + Vite 7  
**Styling:** Tailwind CSS v4 + shadcn/ui (New York style)  
**Auth:** Clerk  
**Routing:** Wouter  
**State:** TanStack Query  

---

## Local development

### 1. Clone and install

```bash
git clone https://github.com/robin-starplay/ai-agent-test.git
cd ai-agent-test/frontend
npm install
```

Or with pnpm:

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Backend base URL (Railway production)
VITE_FRONTIER_API_BASE_URL=https://web-production-0224c.up.railway.app

# Clerk publishable key — get from https://dashboard.clerk.com
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 3. Run the dev server

```bash
npm run dev
```

App opens at [http://localhost:3000](http://localhost:3000).

---

## Build

```bash
npm run build
```

Output goes to `dist/`. Preview the production build:

```bash
npm run preview
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FRONTIER_API_BASE_URL` | Yes | Backend base URL — no trailing slash. Production: `https://web-production-0224c.up.railway.app` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key — starts with `pk_test_` or `pk_live_` |

---

## Stack

| Layer | Technology |
|-------|------------|
| Build | Vite 7 |
| UI | React 19 |
| Styling | Tailwind CSS v4, shadcn/ui (New York) |
| Auth | Clerk (`@clerk/react`) |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Animation | Framer Motion |
| Icons | Lucide React |
| Charts | Recharts |

---

## Project structure

```
frontend/
├── src/
│   ├── components/     # Shared UI components (shadcn + custom)
│   ├── components/ui/  # shadcn/ui primitives
│   ├── contexts/       # React contexts (AccessContext)
│   ├── data/           # Static data, scenarios, mock data
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # API clients, utilities, evidence logic
│   ├── pages/          # Route-level page components
│   └── main.tsx        # Entry point + router
├── public/             # Static assets (favicon, robots.txt)
├── index.html          # HTML entry
├── vite.config.ts      # Vite config
├── tsconfig.json       # TypeScript config
├── components.json     # shadcn/ui config
└── .env.example        # Environment variable template
```

---

## Notes for Codex / AI editors

- **Evidence rule:** Only render `status: "verified"` items as verified. If backend returns `claim`, `unknown`, `not_checked`, `unavailable` — render as-is. Never upgrade evidence visually.
- **No hardcoded financials:** Do not add mock revenue, ARR, EBITDA, or verified facts. All financial display is conditional on backend `status + source_metadata`.
- **Preferred tone:** Short, plain, investor-grade. No em-dash-heavy copy. No SaaS marketing language.
- **Backend:** `VITE_FRONTIER_API_BASE_URL` → Railway. Never modify Railway config from the frontend repo.
- See the full operating principle in the `replit.md` of the main repo.
