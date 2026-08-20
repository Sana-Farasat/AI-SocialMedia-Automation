# SocialPilot AI — Frontend

Next.js dashboard for the SocialPilot AI multi-platform social media automation
SaaS. Connect social accounts, write and AI-assist content, schedule posts, and
track publishing — all in one responsive app.

## Tech stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS 4 + shadcn/ui components (Radix UI primitives)
- Zustand (auth state) · React Hook Form + Zod (forms) · Framer Motion · Recharts
- Dark / light theme (next-themes) · sonner toasts

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## API configuration

The app calls the backend through `NEXT_PUBLIC_API_URL`. By default it points at
`http://localhost:8000` (see `lib/api.ts`). To override, create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Credentials are sent with `credentials: "include"`, so the backend and this app
share the auth cookie. The backend must list this origin in `FRONTEND_URLS`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (port 3000) |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |

## Project structure

```
frontend/
  app/
    login/ register/ forgot-password/ reset-password/   # auth screens
    (app)/                                             # authenticated dashboard
      dashboard/     # overview: stats, charts, recent activity
      create/        # post composer (text, media, platforms, publish/schedule)
      calendar/      # content calendar (day/week/month)
      posts/         # scheduled / published / drafts / failed lists
      social-accounts/  # connect & manage platform accounts (OAuth)
      ai-content/    # AI content assistant
      analytics/     # engagement metrics per platform
      settings/      # profile, AI, publishing, security
      docs/          # in-app docs
    layout.tsx       # root layout
  components/        # ui/, auth/, social/, calendar/, posts/, analytics/, ai/
  lib/
    api.ts           # fetch wrapper (JSON / FormData, cookie auth, error mapping)
    types.ts         # shared TS types mirroring backend schemas
    platforms.ts     # platform metadata + status labels
    stores/auth.ts   # Zustand auth store
```

## App flow

1. Sign up / log in
2. **Social Accounts** → connect platforms via OAuth (redirects to the platform,
   callback handled at `/social-accounts/callback`)
3. **Create** → write content or generate with AI, add media, pick platforms,
   then **Publish now**, **Schedule**, or **Save draft**
4. The backend worker publishes scheduled posts automatically; statuses update
   in **Posts** and **Calendar**
5. Track results in **Analytics**

## OAuth callback

The platform callback URL lives on this app:
`<origin>/social-accounts/callback` (e.g. `http://localhost:3000/social-accounts/callback`).
Whitelist this exact URL in every platform developer console. See
[OAUTH.md](../OAUTH.md) for the full per-platform setup.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Root README](../README.md) — full project, quick start, deployment
- [Backend README](../backend/README.md) — API, environment variables, worker