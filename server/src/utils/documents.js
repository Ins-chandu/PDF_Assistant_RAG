export function sanitizeText(value) {
  return String(value || "")
    .replace(/\u0000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarizeSnippet(text, maxLength = 240) {
  const normalized = sanitizeText(text);
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trim()}...`
    : normalized;
}
