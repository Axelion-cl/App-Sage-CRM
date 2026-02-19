# Project Structure

## Overview

- Project Name: App Sage CRM (web)
- Project Type: Fullstack (Next.js App Router)
- Primary Language: TypeScript
- Framework: Next.js 16.1.6, React 19
- Database/Backend: Supabase
- AI/LLM: Gemini 1.5 Flash (via Google Generative AI)

## Key Directories

- Source: `src/`
- App Router: `src/app/` (Pages: login, dashboard)
- Logic/Services: `src/lib/` (classifier, dashboard-service, forcemanager, supabase)
- Assets: `public/`
- Documentation: `docs/`

## Entry Points

- Main Entry: `src/app/page.tsx`
- Layout: `src/app/layout.tsx`
- Dashboard Root: `src/app/dashboard/`

## Important Files

- Configuration: `package.json`, `next.config.ts`, `tsconfig.json`
- UI Styling: `tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`
- Missing Config: `.env.local` (Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`)
