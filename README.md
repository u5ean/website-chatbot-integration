AI Website Chatbot SaaS (Next.js App Router + Supabase + OpenAI + Stripe)

## Progress & Next Steps

### Current Progress
- Auth + dashboard are working (login + protected `/dashboard` routes).
- Chatbot creation flow works (crawl → finalize → embed code).
- Widget can load config, chat via `/api/chat`, and supports lead capture + handoff link (when enabled in config).

### To Do List

- [x] Fix Preview Height
- [x] Check Lead and Handoff URL function
- [x] Test the bot’s Answering
- [x] manual FAQ editor
- [x] Dashboard Settings page
- [x] Productionize crawling/embeddings: move /api/onboardin g/finalize + /api/dashboard/chatbots/[id]/recrawl off the request/response path (job/queue), because long crawls will timeout in real hosting.
- [ ] Lock down widget + APIs for real embeds: CORS allowlist (don’t reflect Origin: * ), rate limit /api/chat , basic abuse protection (per IP/session/chatbot) (CHECK)
- [ ] Allow position changing. (FIX)
- [ ] Make Billing real:: Add Stripe checkout flow + webhook to update profiles.subscription_tier and enforce limits (chatbots count, messages/month).
- [ ] Deploy + verify end-to-end on a real domain: hosted app URL in NEXT_PUBLIC_APP_URL , widget loads from that URL, and embed works from an external site.

## Getting Started

### Prerequisites
- Node.js 20+ recommended
- A Supabase project (Postgres + pgvector)
- OpenAI API key
- Stripe account (test mode) + Stripe CLI (for local webhooks)

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment variables
- Copy `.env.example` to `.env`
- Fill in values

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL` (use `http://localhost:3000` locally)

Optional (recommended for hard-to-crawl sites):
- `ZENROWS_API_KEY`

Stripe (test mode):
- `STRIPE_SECRET_KEY` (starts with `sk_test_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_test_...`)
- `STRIPE_WEBHOOK_SECRET` (starts with `whsec_...`)

### 3) Apply database migrations (Supabase)
Run the SQL files in `supabase/migrations/` in your Supabase project:
- `supabase/migrations/20260507000000_initial_schema.sql`
- `supabase/migrations/20260508000000_add_session_tags.sql`
- `supabase/migrations/20260514000000_lock_down_widget.sql`

You can paste each file into Supabase Dashboard → SQL Editor and run them.

### 4) Playwright setup (used as a crawling fallback)
If Playwright complains about missing browsers:
```bash
npx playwright install
```

### 5) Start the dev server
```bash
npm run dev
```

Open http://localhost:3000

## Local Testing Checklist

### Auth + Dashboard
- Visit `/login` to create/sign in
- Create a chatbot at `/dashboard/new`

### Widget preview + embed
- Open your chatbot config: `/dashboard/chatbots/<id>`
- Use the Live Preview iframe or open `/preview/<id>`
- Embed code is at `/dashboard/chatbots/<id>/embed`

### Stripe webhooks (test mode, local)
Run Stripe CLI forwarding:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

## Notes
- `.env` is intentionally ignored by git. Never commit real keys.
- `.env.example` is tracked so the next machine can set up quickly.
