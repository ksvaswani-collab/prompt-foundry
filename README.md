# Prompt Foundry

A personal AI agent that turns your brand tokens + a list of page sections into
paste-ready Figma Canvas AI prompts — the same section-by-section, token-referenced
workflow you already use manually for client audits.

## What it does
1. You enter brand tokens (colors, fonts, spacing) and the sections you need
   (hero, pricing card, dashboard, etc.), plus optional audit notes.
2. It calls Claude once per section and returns a concrete, paste-ready prompt
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
- Uses Gemini's free tier (`gemini-2.5-flash`) — no billing setup required to start.
- `maxOutputTokens` is capped at 1000 per section to keep responses fast; increase
  in `api/generate.js` if you want longer prompts.