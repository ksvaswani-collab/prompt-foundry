// Vercel serverless function — powers the "Surprise Me" font button.
// Reuses the same GEMINI_API_KEY as api/generate.js.
//
// IMPORTANT: this FONT_OPTIONS list must match the <select> options in
// index.html exactly. The AI is constrained to only pick from this list,
// so the dropdown on the frontend can always display whatever comes back.

const FONT_OPTIONS = [
  "Inter", "Space Grotesk", "IBM Plex Sans", "Sora", "DM Sans", "Manrope",
  "Work Sans", "Poppins", "Fraunces", "Playfair Display", "Lora",
  "Merriweather", "Georgia", "JetBrains Mono", "Nunito", "Outfit"
];

function extractJson(raw) {
  // Strip markdown fences if present, then grab the first {...} block —
  // this protects us even if the model adds a stray sentence around the JSON.
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tokens, notes } = req.body || {};
  const validTokens = (tokens || []).filter(t => t.name || t.value);
  const tokenText = validTokens.map(t => `${t.name || '(unnamed)'}: ${t.value || '(no value)'}`).join(', ');

  const system = `You are a typography expert helping a UI/UX designer pick a font pairing.
You must choose ONE heading font and ONE body font, and BOTH must come exactly, character-for-character, from this list — do not pick anything outside it:
${FONT_OPTIONS.join(', ')}

Pick two different fonts from the list that pair well together and suit the brand context given.
Respond with ONLY raw JSON on a single line, no markdown code fences, no commentary, in exactly this shape:
{"heading":"Font Name","body":"Font Name"}`;

  const user = `Brand tokens: ${tokenText || '(none given)'}
Audit/reference notes: ${notes || '(none)'}`;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server." });
  }

  const model = "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { maxOutputTokens: 200, temperature: 0.8 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gemini request failed: ${errText}` });
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(extractJson(raw));
    } catch {
      return res.status(500).json({ error: `Couldn't parse font suggestion. Raw reply: ${raw.slice(0, 200)}` });
    }

    // Validate both fonts are actually from our allowed list (case-insensitive match),
    // and fall back to a safe random pair from the list if the model went off-script.
    const findInList = (name) =>
      FONT_OPTIONS.find(f => f.toLowerCase() === String(name || '').toLowerCase());

    let heading = findInList(parsed.heading);
    let body = findInList(parsed.body);

    if (!heading || !body || heading === body) {
      const shuffled = [...FONT_OPTIONS].sort(() => Math.random() - 0.5);
      heading = heading || shuffled[0];
      body = (body && body !== heading) ? body : shuffled.find(f => f !== heading);
    }

    return res.status(200).json({ heading, body });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
