# HOMEBOT — Project Guide

Home management web app. Helps track home projects, contractors, and home inventory. UI design modeled after the Monarch Money aesthetic (warm cream palette, collapsible sidebar, card-based layout).

## Tech Stack

| Layer      | Choice                                |
|------------|---------------------------------------|
| Framework  | **Next.js 16** (App Router, TypeScript) |
| Styling    | **Tailwind CSS 4**                    |
| Database   | **Supabase** (PostgreSQL)             |
| Auth       | Supabase Auth (planned)               |
| Charts     | Chart.js 4                            |
| Hosting    | Vercel (planned)                      |

## Project Structure

```
HOMEBOT/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (Inter font, sidebar shell)
│   │   ├── globals.css         # Tailwind + design tokens (@theme)
│   │   ├── page.tsx            # Dashboard
│   │   ├── projects/page.tsx   # Projects (placeholder)
│   │   ├── contractors/page.tsx# Contractors (placeholder)
│   │   ├── inventory/page.tsx  # Inventory (placeholder)
│   │   ├── settings/page.tsx   # Settings (placeholder)
│   │   └── help/page.tsx       # Help (placeholder)
│   ├── components/
│   │   ├── Sidebar.tsx         # Collapsible sidebar navigation
│   │   ├── SpendingChart.tsx   # Chart.js area chart (client component)
│   │   └── icons.tsx           # All SVG icons as React components
│   └── lib/
│       └── supabase.ts         # Supabase client initialization
├── _reference/                 # Original vanilla HTML/CSS/JS (for reference)
├── .env.local                  # Supabase keys (gitignored)
├── .env.example                # Template for env vars
├── CLAUDE.md                   # This file
├── package.json
├── tsconfig.json
└── next.config.ts
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

- **Next.js App Router** — file-based routing under `src/app/`.
- **Server Components by default** — only add `"use client"` when needed (interactivity, hooks, browser APIs).
- **Tailwind CSS 4** — uses `@theme inline` in globals.css for design tokens. No `tailwind.config.js`.
- **Supabase** — client initialized in `src/lib/supabase.ts`. Env vars in `.env.local`.
- **Chart.js** — imported as npm package, used in client components only.
- **No icon library** — all icons are React components in `src/components/icons.tsx`.

## Conventions

- Add new pages as `src/app/<route>/page.tsx` files.
- The sidebar is rendered once in `src/app/layout.tsx` — no need to duplicate.
- Use Tailwind utility classes. Reference design tokens via `var(--color-*)`, `var(--radius-*)`, etc. where Tailwind classes don't suffice.
- Accessibility: always include `aria-label`, `aria-current`, and `role` where appropriate.
- Prefer semantic HTML elements (`<article>`, `<nav>`, `<header>`, `<aside>`) over generic `<div>`.
- Mark client components with `"use client"` directive only when they need interactivity.

## Navigation

Four primary sections + two utility links at the bottom of the sidebar:

| Route          | Page            | Icon           |
|----------------|-----------------|----------------|
| `/`            | Dashboard       | Grid           |
| `/projects`    | Projects        | Wrench         |
| `/contractors` | Contractors     | Users          |
| `/inventory`   | Home Inventory  | Package/3D box |
| `/settings`    | Settings        | Gear           |
| `/help`        | Help & Support  | Question circle|

## Pages Status

- [x] `/` — Dashboard (fully migrated)
- [ ] `/projects` — Projects list/detail (placeholder)
- [ ] `/contractors` — Contractor directory (placeholder)
- [ ] `/inventory` — Home inventory table (placeholder)
- [ ] `/settings` — Settings (placeholder)
- [ ] `/help` — Help & Support (placeholder)

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
