# HOMEBOT — Project Guide

Home management web app. Helps track home projects, contractors, home assets, services, inventory, and calendar events. UI design modeled after the Monarch Money aesthetic (warm cream palette, collapsible sidebar, card-based layout).

## Tech Stack

| Layer      | Choice                                |
|------------|---------------------------------------|
| Framework  | **Next.js 16** (App Router, TypeScript) |
| Styling    | **Tailwind CSS 4**                    |
| Database   | **Supabase** (PostgreSQL + RLS)       |
| Auth       | **Supabase Auth** (email/password, middleware-protected routes) |
| Charts     | Chart.js 4                            |
| Hosting    | Vercel (planned)                      |

## Project Structure

```
HOMEBOT/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (Inter font, ThemeProvider)
│   │   ├── globals.css             # Tailwind 4 + design tokens (@theme inline)
│   │   ├── (app)/                  # Route group — all authenticated pages
│   │   │   ├── layout.tsx          # AppShell wrapper (sidebar + responsive layout)
│   │   │   ├── page.tsx            # Dashboard
│   │   │   ├── projects/page.tsx   # Projects list
│   │   │   ├── projects/[id]/page.tsx
│   │   │   ├── home-assets/page.tsx
│   │   │   ├── home-assets/[id]/page.tsx
│   │   │   ├── inventory/page.tsx
│   │   │   ├── inventory/[id]/page.tsx
│   │   │   ├── services/page.tsx
│   │   │   ├── contractors/page.tsx
│   │   │   ├── contractors/[id]/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── help/page.tsx
│   │   ├── login/page.tsx          # Login (unauthenticated)
│   │   ├── signup/page.tsx         # Signup (unauthenticated)
│   │   ├── auth/callback/route.ts  # Supabase auth callback
│   │   └── api/                    # API routes
│   │       ├── scrape-thumbnail/route.ts
│   │       ├── scrape-home/route.ts
│   │       ├── convert-image/route.ts
│   │       ├── calendar/feed/route.ts  # iCal feed
│   │       └── alerts/sms/route.ts     # Cron-triggered SMS alerts
│   ├── components/
│   │   ├── AppShell.tsx            # Responsive layout shell
│   │   ├── Sidebar.tsx             # Collapsible sidebar navigation
│   │   ├── MobileHeader.tsx        # Mobile top bar
│   │   ├── MobileSidebarDrawer.tsx # Mobile nav drawer
│   │   ├── ThemeProvider.tsx       # Light/dark theme context
│   │   ├── SpendingChart.tsx       # Chart.js area chart
│   │   ├── SpendingCard.tsx        # Spending breakdown card
│   │   ├── icons.tsx               # All SVG icons as React components
│   │   ├── projects/              # Project feature components
│   │   ├── contractors/           # Contractor feature components
│   │   ├── home-assets/           # Home asset feature components
│   │   ├── inventory/             # Inventory feature components
│   │   ├── services/              # Services feature components
│   │   └── calendar/              # Calendar feature components
│   ├── lib/
│   │   ├── supabase.ts            # DB type interfaces (DbProject, etc.)
│   │   ├── supabase/client.ts     # Browser Supabase client
│   │   ├── supabase/server.ts     # Server Supabase client
│   │   ├── mappers.ts             # DB row → TypeScript type mappers
│   │   ├── utils.ts               # cn(), affiliateUrl(), buyNowUrl()
│   │   ├── compress-image.ts      # Client-side image compression
│   │   ├── pdf-thumbnail.ts       # PDF preview generation
│   │   ├── extract-invoice-total.ts # OCR invoice amount extraction
│   │   ├── import-assets.ts       # CSV/XLSX asset import
│   │   ├── projects-data.ts       # Project types & constants
│   │   ├── contractors-data.ts    # Contractor types & constants
│   │   ├── inventory-data.ts      # Inventory types & constants
│   │   ├── services-data.ts       # Service types & constants
│   │   └── home-assets-data.ts    # Home asset categories & defaults
│   └── middleware.ts              # Auth guard (redirects to /login)
├── public/
│   └── pdf.worker.min.mjs         # PDF.js worker (lazy-loaded)
├── .env.local                     # Supabase keys + secrets (gitignored)
├── .env.example                   # Template for env vars
├── CLAUDE.md                      # This file
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

## Design System

### Colors (Tailwind custom theme in globals.css)
- `accent: #FF692D` — primary orange (brand, active nav, CTAs)
- `green: #18a558` — positive budget, income
- `red: #e03131` — over-budget, negative amounts
- `teal: #00a2c7` — reserved for chart lines
- `bg: #f5f0eb` — warm cream page background
- `surface: #ffffff` — card/sidebar background
- `border: #efece9` — subtle dividers
- `text-primary: #22201d` — primary text
- `text-3: #84827f` — secondary/muted text

Colors are accessible as Tailwind utilities: `bg-accent`, `text-text-primary`, `border-border`, etc.

### Typography
- Font: **Inter** (loaded via `next/font/google`) with system-ui fallback
- Base size: 14px body, 22px page heading, 13px nav/UI labels

### Spacing & Radii
Defined in `globals.css` under `@theme inline`. Use Tailwind utilities or CSS `var()` references:
- `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`, `--radius-full: 9999px`

## Architecture

- **Next.js App Router** — file-based routing under `src/app/`. Authenticated pages use the `(app)` route group.
- **Server Components by default** — only add `"use client"` when needed (interactivity, hooks, browser APIs).
- **Tailwind CSS 4** — uses `@theme inline` in globals.css for design tokens. No `tailwind.config.js`.
- **Supabase** — browser client in `src/lib/supabase/client.ts`, server client in `src/lib/supabase/server.ts`. DB type interfaces in `src/lib/supabase.ts`.
- **Chart.js** — imported as npm package, used in client components only.
- **No icon library** — all icons are React components in `src/components/icons.tsx`.
- **Auth** — Supabase Auth with middleware protection. `src/middleware.ts` redirects unauthenticated users to `/login`. Public routes: `/login`, `/signup`, `/auth/callback`.

## Conventions

### General
- Add new pages as `src/app/(app)/<route>/page.tsx` (inside the route group).
- Feature components go in `src/components/<feature>/` (e.g., `projects/`, `calendar/`).
- Page-level client logic uses `*Client.tsx` suffix (e.g., `ProjectsClient.tsx`).
- The sidebar is rendered via `AppShell` in `src/app/(app)/layout.tsx` — no need to duplicate.
- Use Tailwind utility classes. Reference design tokens via `var(--color-*)`, `var(--radius-*)`, etc. where Tailwind classes don't suffice.
- Accessibility: always include `aria-label`, `aria-current`, and `role` where appropriate.
- Prefer semantic HTML elements (`<article>`, `<nav>`, `<header>`, `<aside>`) over generic `<div>`.

### Performance
- Mark client components with `"use client"` only when they need interactivity.
- **Dynamic imports** — heavy libraries (pdfjs-dist, tesseract.js, heic2any, xlsx) must use `await import()`, never top-level static imports.
- **Supabase queries** — always select specific columns (e.g., `.select("id, name, status")`), never `.select("*")`.
- **Images** — use `next/image` for optimized loading. Avoid raw `<img>` tags.
- **Chart.js** — register only the specific plugins needed, not `...registerables`.

### Data Layer
- DB row types are prefixed with `Db` (e.g., `DbProject`, `DbContractor`) in `src/lib/supabase.ts`.
- Mappers in `src/lib/mappers.ts` convert DB rows to UI types — always use these rather than manual mapping.
- Feature-specific types and constants live in `src/lib/<feature>-data.ts`.

## Navigation

Seven primary sections + two utility links at the bottom of the sidebar:

| Route          | Page            | Icon             |
|----------------|-----------------|------------------|
| `/`            | Dashboard       | Grid             |
| `/projects`    | Projects        | Wrench           |
| `/home-assets` | Home Assets     | Home             |
| `/inventory`   | Home Inventory  | Package          |
| `/services`    | Home Services   | ClipboardCheck   |
| `/contractors` | Contractors     | Users            |
| `/calendar`    | Calendar        | Calendar         |
| `/settings`    | Settings        | Gear             |
| `/help`        | Help & Support  | HelpCircle       |

## API Routes

| Method | Route                      | Purpose                          |
|--------|----------------------------|----------------------------------|
| POST   | `/api/scrape-thumbnail`    | Scrape logo/thumbnail from URL   |
| POST   | `/api/scrape-home`         | Scrape home details from Redfin  |
| POST   | `/api/convert-image`       | Server-side image conversion     |
| GET    | `/api/calendar/feed`       | iCal feed for calendar events    |
| GET    | `/api/alerts/sms`          | Cron-triggered SMS reminders     |

## Pages Status

- [x] `/` — Dashboard
- [x] `/projects` — Projects list + detail view
- [x] `/home-assets` — Home assets list + detail view + CSV import
- [x] `/inventory` — Inventory list + detail view
- [x] `/services` — Services list + add/edit
- [x] `/contractors` — Contractor directory + detail view
- [x] `/calendar` — Calendar with week/month views + iCal subscribe
- [x] `/settings` — Settings
- [x] `/help` — Help & Support
- [x] `/login` — Login
- [x] `/signup` — Signup

## Getting Started

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
```

### Supabase Setup
1. Create a project at https://supabase.com
2. Copy your project URL and anon key
3. Paste them into `.env.local` (see `.env.example`)

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon/public key
CRON_SECRET=                     # Secret for /api/alerts/sms endpoint
TWILIO_ACCOUNT_SID=              # Twilio SMS (optional)
TWILIO_AUTH_TOKEN=               # Twilio SMS (optional)
TWILIO_PHONE_NUMBER=             # Twilio SMS (optional)
ALERT_PHONE_NUMBER=              # SMS recipient (optional)
```
