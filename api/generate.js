// Vercel serverless function — keeps your Anthropic API key on the server.
// Set ANTHROPIC_API_KEY in your Vercel project's Environment Variables.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { system, user } = req.body || {};
  if (!user) {
    return res.status(400).json({ error: "Missing 'user' prompt in request body" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: system || "",
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((c) => c.type === "text");
    if (!textBlock) {
      return res.status(500).json({ error: "No text in Claude's response" });
    }

    return res.status(200).json({ text: textBlock.text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
