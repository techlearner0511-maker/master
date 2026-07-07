# Day Arc — deploy to Vercel with cross-device sync

## What changed from your original file
Your file used `window.storage`, which only exists inside claude.ai's artifact
viewer — it won't work once the page is hosted on its own domain. I replaced
it with a tiny serverless API (`/api/kv.js`) backed by **Vercel KV** (a
Redis database), and a passphrase gate on first load. Enter the same
passphrase on your phone and your laptop and they'll both read/write the
same data. Everything else in the app (routine tracking, goals, workouts,
etc.) is untouched.

**Note on the passphrase:** it's a shared namespace, not a real login (no
password hashing, no account recovery). Fine for a personal tracker — just
don't reuse a password you care about, and don't share the passphrase with
anyone you don't want seeing/editing your data.

## Deploy steps

1. **Push this folder to GitHub** (or use the Vercel CLI — see option B below).

2. **Import into Vercel**
   - Go to vercel.com → New Project → import the GitHub repo.
   - Framework preset: "Other" (it's a static file + one API function, no
     build step needed).
   - Deploy.

3. **Add a Redis database** (this is the part that makes cross-device sync work)
   - In your Vercel project, open the **Storage** tab.
   - Click **Create Database** (or "Connect Database") → under Marketplace
     Database Providers, choose **Upstash** → pick the **Redis** product →
     follow the prompts to create it.
   - Connect it to this project. Vercel will inject the credentials your
     `/api/kv.js` function needs as environment variables automatically —
     you don't set those by hand.
   - Redeploy the project once the database is connected (Vercel usually
     prompts you to).

4. **Open your deployed URL** on your first device, set a passphrase when
   prompted. Open the same URL on your other device(s), enter the *same*
   passphrase — you'll see the same data.

### Option B — deploy from your terminal instead of GitHub
```bash
npm i -g vercel
cd day-arc
vercel        # follow prompts, links/creates the project
vercel --prod
```
Then do step 3 (add KV database) in the dashboard as above.

## Files
- `index.html` — the app (now a proper standalone HTML page)
- `api/kv.js` — serverless function proxying reads/writes to Vercel KV
- `package.json` — declares the `@vercel/kv` dependency
