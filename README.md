# Prompt Foundry

I kept rewriting the same style of Figma Canvas AI prompt by hand for every client
audit — same structure, same level of detail, just swapping in that project's brand
tokens. Prompt Foundry does that expansion for me: give it your brand tokens (colors,
fonts, spacing) and a short list of page sections, and it turns each one into a long,
paste-ready Canvas AI prompt that references your exact tokens instead of generic
placeholder values.

Live demo: https://prompt-foundry-indol.vercel.app
(Note: shared demo has a daily usage cap to protect the free API quota — for regular use, deploy your own copy below, it takes about 5 minutes.)

## What it does
1. You enter brand tokens (colors, fonts, spacing) and the sections you need
   (hero, pricing card, dashboard, etc.), plus optional audit notes.
2. It calls Gemini once per section and returns a concrete, paste-ready prompt
   that references your exact tokens and actively avoids generic AI-design clichés.
3. Copy each prompt straight into Figma Canvas AI.

## Deploy to Vercel (recommended — simplest)
1. Push this folder to a new GitHub repo:
   ```
   git init
   git add .
   git commit -m "Prompt Foundry"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Go to https://vercel.com/new and import that repo.
3. In the Vercel project's **Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your Gemini API key (get one free, no credit card, at https://aistudio.google.com/apikey)
   - (Optional but recommended if deploying publicly) `UPSTASH_REDIS_REST_URL` and
     `UPSTASH_REDIS_REST_TOKEN` from a free Upstash Redis database — this adds a
     daily generation cap so a traffic spike can't burn through your Gemini quota.
     Without these, the tool works fine but has no usage cap.
4. Deploy. Vercel automatically detects `api/generate.js` as a serverless function,
   and `vercel.json` tells it to run `npm run build` (Vite) and serve the `dist/`
   folder it produces — no manual config needed.

## Getting a free Gemini API key
1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API key" — no credit card required
4. Copy the key and paste it into Vercel's environment variable above

The free tier runs on `gemini-2.5-flash`, which is what this project uses. It's rate-limited
(not unlimited) but plenty for personal use — well beyond what one designer generating
prompts throughout the day would hit.

## Deploy to Netlify instead
Netlify functions use a slightly different shape than Vercel's. Move
`api/generate.js` to `netlify/functions/generate.js` and change its export to:
```js
exports.handler = async (event) => {
  const { system, user } = JSON.parse(event.body);
  // ...same fetch logic, return { statusCode: 200, body: JSON.stringify({ text }) }
};
```
Then set `GEMINI_API_KEY` under Site settings → Environment variables, and
update the frontend fetch URL from `/api/generate` to `/.netlify/functions/generate`.

## Frontend: React + Vite + Tailwind
The UI is built with React (components in `src/components/`), bundled by Vite.
Styling is Tailwind v4, applied via the official `@tailwindcss/vite` plugin —
`src/input.css` holds the `@theme` design tokens and `@layer components` custom
classes (`.field`, `.out-card`, `.chip`, etc.), and Vite compiles/injects it
automatically. There's no separate CSS build step to remember — `npm run build`
handles everything (React + Tailwind) in one pass, and outputs to `dist/`
(gitignored, regenerated on every build).

## Local testing
```
npm install
npm install -g vercel
vercel dev
```
Then open the local URL `vercel dev` gives you — it runs the Vite dev server
(with hot reload) and the `/api` serverless functions together.

## Notes
- Your API key never touches the browser — it stays in the serverless function.
- Uses Gemini's free tier (`gemini-flash-latest`) — no billing setup required to start.
- `maxOutputTokens` is capped at 3000 per section; adjust in `api/generate.js` if needed.
- If Upstash env vars are set, requests are capped at 30/day per visitor and 300/day
  total — adjust `DAILY_LIMIT_PER_IP` / `DAILY_LIMIT_GLOBAL` in `api/generate.js`.
