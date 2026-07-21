// Vercel serverless function — keeps your Gemini API key on the server.
// Set GEMINI_API_KEY in your Vercel project's Environment Variables.
// Get a free key (no credit card needed) at https://aistudio.google.com/apikey
//
// This function now builds the actual system/user prompt itself from
// structured fields (section, tokens, fontPair, resolution, industry, notes)
// sent by the browser. That way font pairing, target resolution, and
// industry context are enforced here, on the server, not just assembled as
// a string in the frontend.

const LIGHT_RULES = `  - Use a bright, high-luminance canvas and surfaces, with elevation communicated through soft shadows and subtle borders rather than lighter/darker surface layering.
  - Body text should read as a near-black/dark-neutral for strong contrast, not pure black.
  - Ensure any provided brand tokens intended for dark backgrounds are described with adequate contrast guidance on light surfaces (e.g. used only for accents/icons rather than large fill areas) rather than inventing new values.`;

const DARK_RULES = `  - Use a deep, low-luminance canvas and surfaces (near-black to dark-neutral, not just a dimmed version of a light layout), with elevation communicated through subtle lighter surface layers rather than heavy drop shadows.
  - If a provided brand token would have poor contrast directly on a dark surface (e.g. a dark navy meant for a light background), do not invent a new hex value for it — instead describe the adjusted usage relationally (e.g. "used at reduced opacity as an accent, not as the primary surface color") while still naming the token.
  - Body text should read as a soft off-white/light-neutral rather than pure white, and any color used for status, links, or accents should be described as a lightened/desaturated variant relationally rather than assigned an invented hex code.`;

function appearanceSection(appearanceMode) {
  if (appearanceMode === 'auto') {
    return `APPEARANCE MODE — AUTO:
- No light/dark mode was forced. Infer whichever reads as the more natural fit from the brand tokens, industry context, and audit notes given, then commit to it as a real decision (not a hedge).
- State which one you chose, in one short sentence, before the layout instructions begin — then follow the same load-bearing rules a forced choice would require: real luminance/contrast decisions, not just a label.`;
  }

  if (appearanceMode === 'both') {
    return `APPEARANCE MODE — BOTH (single dual-theme prompt):
- This one prompt must specify BOTH a light and a dark surface treatment for the same section — not a choice between them. Structure this explicitly with a "Light theme:" pass and a "Dark theme:" pass covering surface/background/text-contrast decisions, while keeping layout, spacing, component structure, and content identical across both.
- Light theme rules:
${LIGHT_RULES}
- Dark theme rules:
${DARK_RULES}
- Brand tokens are the same hard constraint in both themes — never invent a new hex value for either theme. Where a token has poor contrast in one theme, describe its adjusted usage relationally (e.g. "used at reduced opacity as an accent") rather than substituting a new value.
- State clearly, once, that this section is designed to support both light and dark modes.`;
  }

  const isDark = appearanceMode === 'dark';
  return `APPEARANCE MODE:
- Design explicitly for ${isDark ? 'DARK' : 'LIGHT'} MODE. This must be a real, load-bearing decision, not a label:
${isDark ? DARK_RULES : LIGHT_RULES}
- State somewhere in the prompt that this section is being designed for ${isDark ? 'dark' : 'light'} mode.`;
}

const APPEARANCE_LABELS = {
  light: 'light',
  dark: 'dark',
  both: 'both light and dark (single dual-theme prompt)',
  auto: 'auto (model infers light or dark from context)',
};

function buildPrompt({ section, tokens, fontPair, resolution, industry, mode, notes, hasImages }) {
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

  const industryText = (industry || '').trim();
  const appearanceMode = ['light', 'dark', 'both', 'auto'].includes(mode) ? mode : 'light';
  const appearanceLabel = APPEARANCE_LABELS[appearanceMode];

  const imageRules = hasImages
    ? `

REFERENCE IMAGES:
- One or more reference screenshots are attached for this section. Study their layout structure, spacing rhythm, visual hierarchy, component states, and general style approach.
- Translate what you observe into concrete, literal instructions expressed using the brand tokens, font pairing, and resolution given above. Do NOT invent new colors or fonts because you saw them in the image — brand tokens and the font pairing always take priority over anything visual in the reference.
- Do NOT describe the image itself or say things like "as shown in the reference image" or "similar to the attached screenshot" — the output is a standalone prompt for a tool that cannot see the reference. Write the layout/style logic directly as if it were your own design decision.
- If multiple images are attached, treat them as a small mood/pattern set — synthesize the shared logic across them rather than describing each one separately.`
    : '';

  const system = `You write single, paste-ready prompts for Figma's "Canvas AI" prompt-to-design tool, for a working UI/UX designer. The person deliberately gives you SHORT, sparse input (a section name, a couple lines of intent, a short token list) and expects you to expand it into a long, rich, fully-specified prompt — you are the one doing the elaboration, not them. Rules:

DETAIL — this is the most important rule:
- Never compress or summarize. Expand. A one-line section description should still produce a dense, multi-paragraph, implementation-ready prompt.
- Cover, explicitly, wherever relevant to the section: layout and grid structure, visual hierarchy and sizing, spacing/rhythm logic, exact component states (default/hover/active/empty/error), responsive behavior, content structure (real copy direction, not placeholder), and interaction/motion notes.
- Target roughly 250-450 words per section. Do not artificially cut it short. If anything, err toward more specificity, not less. Terse output is a failure.
- Do not pad with vague adjectives ("modern", "clean", "sleek") unless immediately followed by the concrete instruction that makes them true.

INDUSTRY CONTEXT — treat this as a real constraint on layout and content, not decoration:
${industryText
    ? `- This is being designed for: ${industryText}. Let this genuinely shape decisions: information density (e.g. dense/data-forward for fintech or B2B SaaS vs. spacious/visual for hospitality or fashion), the tone of the placeholder copy you write, which trust or compliance signals belong on the page (e.g. security badges and disclaimers for finance, credentialing/HIPAA-safe language for healthcare, clear pricing and return-policy cues for e-commerce), and which components are conventionally expected in that industry's product category. Do not just mention the industry name once — let it inform actual structural choices.`
    : `- No industry was given. Use general, industry-agnostic UI/UX best practices — do not invent an industry.`}

${appearanceSection(appearanceMode)}

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
- Output ONLY the prompt text for this one section. No headers, no preamble, no markdown, no meta-commentary about what you're doing.${imageRules}`;

  const user = `Section: ${section.name}

What it should contain/do: ${section.desc || '(use your judgement based on the section name, industry, and tokens)'}

Industry / product context: ${industryText || '(none given — stay industry-agnostic)'}

Appearance mode: ${appearanceLabel}

Brand tokens (use ONLY these — do not invent others)${tokenText ? ` [${tokenNameList}]` : ''}:
${tokenText || '(none given — keep it token-agnostic, describe structurally instead of inventing values)'}

Font pairing:
${fontLine}

Target device: ${res.device} — ${res.w} × ${res.h}px

Audit/reference notes: ${notes || '(none)'}${hasImages ? '\n\n(Reference screenshots are attached to this request — see system instructions on how to use them.)' : ''}

Reminder: expand this into a long, dense, fully-specified prompt (roughly 250-450 words). Every token, the font pairing, the target resolution, the industry context, and the ${appearanceLabel} appearance mode above must meaningfully shape the output.`;

  return { system, user };
}

const MAX_IMAGES = 4;

// Daily caps to protect your Gemini quota from unexpected traffic.
// If Upstash isn't configured (env vars missing) or Upstash itself errors,
// this fails OPEN — requests are allowed through rather than the whole
// tool breaking because of a rate-limiter problem.
const DAILY_LIMIT_PER_IP = 30;
const DAILY_LIMIT_GLOBAL = 300;

async function checkRateLimit(ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { allowed: true };

  const today = new Date().toISOString().slice(0, 10);
  const ipKey = `ratelimit:ip:${today}:${ip}`;
  const globalKey = `ratelimit:global:${today}`;

  try {
    const resp = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", ipKey],
        ["EXPIRE", ipKey, "86400"],
        ["INCR", globalKey],
        ["EXPIRE", globalKey, "86400"],
      ]),
    });
    if (!resp.ok) return { allowed: true };

    const [ipResult, , globalResult] = await resp.json();
    if (ipResult.result > DAILY_LIMIT_PER_IP) {
      return { allowed: false, reason: "You've reached today's generation limit for this tool. Try again tomorrow." };
    }
    if (globalResult.result > DAILY_LIMIT_GLOBAL) {
      return { allowed: false, reason: "This tool has hit its daily usage cap across all visitors. Try again tomorrow." };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { section, tokens, fontPair, resolution, industry, mode, notes, images } = req.body || {};
  if (!section || !section.name) {
    return res.status(400).json({ error: "Missing 'section' in request body" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const rateCheck = await checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: rateCheck.reason, ownLimit: true });
  }

  const cleanImages = Array.isArray(images)
    ? images.filter((img) => img && img.data && img.mimeType).slice(0, MAX_IMAGES)
    : [];

  const { system, user } = buildPrompt({
    section,
    tokens,
    fontPair,
    resolution,
    industry,
    mode,
    notes,
    hasImages: cleanImages.length > 0,
  });

  const model = "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  // Text prompt first, then any reference images as inline vision parts.
  const parts = [{ text: user }];
  for (const img of cleanImages) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
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