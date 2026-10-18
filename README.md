# Lecture Transcriber — END TO END (use it daily)
GitHub Pages (UI) + Supabase Auth + Storage + Edge Functions + Soniox `stt-async-v5`.
Arabic + Urdu/Hindi. 1h/day ≈ $3/mo.

## STEP 1 — Supabase (once)

1. supabase.com -> New project, copy URL + anon key + service_role key
2. Authentication -> Providers -> Email ON (confirm email OFF for yourself)
3. SQL Editor -> paste + Run `supabase/schema.sql`
4. Install CLI: `npm i -g supabase`, then in `lecture-transcriber/`:
```bash
supabase login
supabase link --project-ref YOUR_REF
supabase functions deploy transcribe
supabase functions deploy status
supabase secrets set SONIOX_API_KEY=xxx SUPABASE_URL=https://YOUR_REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
Soniox key: https://console.soniox.com -> project -> API Keys.
Edge functions now REQUIRE login (verify-jwt ON by default — keep it).

## STEP 2 — GitHub Pages (once)

1. Edit `docs/config.js` with your URL + anon key (anon only, safe public)
2. Push repo, GitHub -> Settings -> Pages -> Deploy from branch -> folder `/docs` (or `/tester/lecture-transcriber/docs` if monorepo — better split to its own repo for Pages)
3. Open `https://USER.github.io/REPO/` -> Sign up with your email -> Login

Simplest: make a new repo `lecture-app`, copy `docs/` as root `index.html+config.js`, enable Pages on `/ (root)`.

## STEP 3 — Daily use (no extra steps)

1. Login -> Upload original recording as-is (m4a/mp3/wav/opus/mp4, 1-4h ok) -> wait 3-5 min (auto polls 10s) -> text appears. No ffmpeg needed — server gives Soniox a signed URL, Soniox auto-detects format.
2. My lectures list: click old job to reopen + re-download
3. Download .txt / Word .doc / Print->PDF (RTL Nastaliq+Amiri preserved)

Files stored at `lectures/<your-uid>/...`, jobs rows have `user_id` — no one else sees yours.
RLS blocks anon completely.

## Limits / notes

- 3-4h originals ok via signed URL (3h expiry). Supabase free storage 1GB — delete old audio from Storage after done (transcript stays in DB).
- Soniox deletes transcript copy after fetch (in `status` fn). Your copy stays in Supabase `jobs.tokens`.
- Cost: 30h/mo = $3 Soniox. Supabase free tier enough.
- To add a 2nd user: just sign them up, they get isolated folder automatically.
