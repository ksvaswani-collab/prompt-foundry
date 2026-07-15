// Vercel serverless function — powers the "Surprise Me" font button.
// Reuses the same GEMINI_API_KEY as api/generate.js.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tokens, notes } = req.body || {};
  const validTokens = (tokens || []).filter(t => t.name || t.value);
  const tokenText = validTokens.map(t => `${t.name || '(unnamed)'}: ${t.value || '(no value)'}`).join(', ');

  const system = `You are a typography expert helping a UI/UX designer pick a font pairing.
Given brand context, choose ONE heading font and ONE body font, both available on Google Fonts, that pair well together and suit the brand.
Respond with ONLY raw JSON on a single line, no markdown code fences, no commentary, in exactly this shape:
{"heading":"Font Name","body":"Font Name"}`;

  const user = `Brand tokens: ${tokenText || '(none given)'}
Audit/reference notes: ${notes || '(none)'}`;

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
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "Couldn't parse font suggestion" });
    }

    if (!parsed.heading || !parsed.body) {
      return res.status(500).json({ error: "Incomplete font suggestion" });
    }

    return res.status(200).json({ heading: parsed.heading, body: parsed.body });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
