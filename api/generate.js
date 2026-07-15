// Vercel serverless function — keeps your Gemini API key on the server.
// Set GEMINI_API_KEY in your Vercel project's Environment Variables.
// Get a free key (no credit card needed) at https://aistudio.google.com/apikey
//
// This function now builds the actual system/user prompt itself from
// structured fields (section, tokens, fontPair, resolution, notes) sent by
// the browser. That way font pairing and target resolution are enforced
// here, on the server, not just assembled as a string in the frontend.

function buildPrompt({ section, tokens, fontPair, resolution, notes }) {
  const validTokens = (tokens || []).filter(t => t.name || t.value);
  const tokenText = validTokens
    .map(t => `- ${t.name || '(unnamed)'}: ${t.value || '(no value given)'}`)
    .join('\n');
  const tokenNameList = validTokens.map(t => t.name).filter(Boolean).join(', ');

  const heading = fontPair && fontPair.heading ? fontPair.heading.trim() : '';
  const body = fontPair && fontPair.body ? fontPair.body.trim() : '';
  const fontLine = (heading || body)
    ? `- Heading font: ${heading || '(unspecified — infer from body font)'}\n- Body font: ${body || '(unspecified — infer from heading font)'}`
    : '(no font pairing given — choose one that fits the tone, and name it explicitly in the prompt)';

  const res = resolution && resolution.w && resolution.h
    ? resolution
    : { device: 'Desktop', w: 1440, h: 1024 };

  const system = `You write single, paste-ready prompts for Figma's "Canvas AI" prompt-to-design tool, for a working UI/UX designer. The person deliberately gives you SHORT, sparse input (a section name, a couple lines of intent, a short token list) and expects you to expand it into a long, rich, fully-specified prompt — you are the one doing the elaboration, not them. Rules:

DETAIL — this is the most important rule:
- Never compress or summarize. Expand. A one-line section description should still produce a dense, multi-paragraph, implementation-ready prompt.
- Cover, explicitly, wherever relevant to the section: layout and grid structure, visual hierarchy and sizing, spacing/rhythm logic, exact component states (default/hover/active/empty/error), responsive behavior, content structure (real copy direction, not placeholder), and interaction/motion notes.
- Target roughly 250-450 words per section. Do not artificially cut it short. If anything, err toward more specificity, not less. Terse output is a failure.
- Do not pad with vague adjectives ("modern", "clean", "sleek") unless immediately followed by the concrete instruction that makes them true.

BRAND TOKENS — treat the token list as a hard constraint, not a suggestion:
- You must use ONLY the tokens provided below. Reference each provided token by its exact name AND exact value at least once, naturally woven into the prompt (e.g. "background in Primary Navy (#1A1A2E)").
- Do NOT invent, substitute, or add any color, font, spacing, or other token-like value that was not explicitly given. If something needs a value and no token covers it (e.g. no accent color was given), describe it structurally/relationally instead (e.g. "a muted neutral one step darker than the card background") rather than inventing a new hex code or font name.
- If the token list is empty, say nothing about specific values — describe structure and hierarchy only, and note that token values should be filled in by the designer.

TYPOGRAPHY:
- If a font pairing is provided, use the heading font ONLY for headings/titles/eyebrows and the body font ONLY for body copy, labels, captions, and metadata. Reference both fonts by their exact name at least once.
- If no pairing is given, choose a pairing appropriate to the brand tokens and audit notes, and state your choice by name — never leave typography unspecified.

VIEWPORT:
- Design explicitly for a ${res.device} viewport at ${res.w}×${res.h}px. Every layout, grid-column count, and spacing decision must be justified against this exact canvas size — not a generic "make it responsive" gesture. Mention the pixel dimensions at least once.

STYLE:
- Actively avoid generic AI-design clichés: no default gradient-hero, no meaningless numbered badges (01/02/03) unless the content is a real sequence, no stock-photo language, no filler copy like "unlock your potential."
- Output ONLY the prompt text for this one section. No headers, no preamble, no markdown, no meta-commentary about what you're doing.`;

  const user = `Section: ${section.name}

What it should contain/do: ${section.desc || '(use your judgement based on the section name and tokens)'}

Brand tokens (use ONLY these — do not invent others)${tokenText ? ` [${tokenNameList}]` : ''}:
${tokenText || '(none given — keep it token-agnostic, describe structurally instead of inventing values)'}

Font pairing:
${fontLine}

Target device: ${res.device} — ${res.w} × ${res.h}px

Audit/reference notes: ${notes || '(none)'}

Reminder: expand this into a long, dense, fully-specified prompt (roughly 250-450 words). Every token, the font pairing, and the target resolution above must appear by exact name/value somewhere in the output.`;

  return { system, user };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { section, tokens, fontPair, resolution, notes } = req.body || {};
  if (!section || !section.name) {
    return res.status(400).json({ error: "Missing 'section' in request body" });
  }

  const { system, user } = buildPrompt({ section, tokens, fontPair, resolution, notes });

  const model = "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { maxOutputTokens: 3000, temperature: 0.9 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(500).json({ error: "No text in Gemini's response" });
    }

    return res.status(200).json({ text: text.trim() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
