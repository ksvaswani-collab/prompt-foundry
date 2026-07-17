// `signal` is a standard AbortController signal — pass it through to fetch
// (so an in-flight request can actually be cancelled) and also honor it
// during the 429 backoff wait (so cancelling doesn't have to wait out a
// multi-second retry delay first).
export async function generateSection({ section, tokens, fontPair, resolution, industry, mode, notes, images }, signal, retries = 3) {
  const resp = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, tokens, fontPair, resolution, industry, mode, notes, images }),
    signal,
  });

  if (resp.status === 429 && retries > 0) {
    const wait = [2000, 5000, 10000][3 - retries];
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, wait);
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(t);
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        },
        { once: true }
      );
    });
    return generateSection({ section, tokens, fontPair, resolution, industry, mode, notes, images }, signal, retries - 1);
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
