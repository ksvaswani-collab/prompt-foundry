export async function generateSection({ section, tokens, fontPair, resolution, industry, mode, notes }, retries = 3) {
  const resp = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, tokens, fontPair, resolution, industry, mode, notes }),
  });

  if (resp.status === 429 && retries > 0) {
    const wait = [2000, 5000, 10000][3 - retries];
    await new Promise(r => setTimeout(r, wait));
    return generateSection({ section, tokens, fontPair, resolution, industry, mode, notes }, retries - 1);
  }

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    if (resp.status === 429) {
      throw new Error("Rate limited by Gemini — free tier quota hit. Wait a minute and try again.");
    }
    throw new Error(data.error || "Request failed");
  }

  const data = await resp.json();
  return data.text.trim();
}