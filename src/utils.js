export function isValidHex(v) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test((v || '').trim());
}