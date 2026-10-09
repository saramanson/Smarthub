# Family Rewards & Calendar

A premium family management web application focused only on rewards and calendar workflows.

## What is included

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- Supabase client scaffold and full PostgreSQL schema with RLS policies
- Responsive dashboard with light and dark mode
- Rewards module with search, filters, reward creation, point awards, redemption modal, history, leaderboard, badges, streaks, and notifications
- Calendar module with month, week, day, and agenda views, event creation, reminders, categories, duplication, deletion, and drag-and-drop date changes in month view
- Auth pages for sign in, sign up, forgot password, and reset password
- Static export support for hosting, plus Vercel-compatible project structure

## Local development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Configure Email and Google providers in Supabase Auth.

## Deployment

For Vercel, import this folder as a Next.js project and add the two Supabase environment variables.

For static hosting, run:

```bash
pnpm build
```

The static export is emitted to `out/`.
