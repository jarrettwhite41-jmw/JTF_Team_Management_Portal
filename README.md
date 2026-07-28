# JTF Team Management Portal

A Vercel-deployed React + TypeScript portal backed by Supabase for data, auth, and row-level security.

## Prerequisites

1. Node.js 18+
2. npm 9+
3. A Supabase project with required schema/migrations
4. Vercel project configuration for deployment

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.local`:
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3. Start development server:
```bash
npm run dev
```

4. Validate before pushing:
```bash
npm run type-check
npm run build
```

## Architecture

- Frontend: React + TypeScript + Vite
- Data/Auth: Supabase (`services/supabaseService.ts`)
- Deployment: Vercel
- Access control: Supabase Auth + RLS policies

## Project Structure

```
JTF_Team_Management_Portal/
├── App.tsx
├── pages/
├── components/
├── services/
│   ├── authService.ts
│   ├── supabaseClient.ts
│   └── supabaseService.ts
├── migrations/
└── supabase/
```

## Notes

- All application reads/writes should go through `supabaseService`.
- Keep portal role restrictions enforced at policy level, not only UI level.
- Use migration files for schema and RLS changes.