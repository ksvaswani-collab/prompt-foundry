export function detectTokensUsed(text, tokenList) {
  return tokenList.filter((t) => {
    if (!t.name && !t.value) return false;
    const hitName = t.name && text.toLowerCase().includes(t.name.toLowerCase());
    const hitVal = t.value && text.toLowerCase().includes(t.value.toLowerCase());
    return hitName || hitVal;
  });
}