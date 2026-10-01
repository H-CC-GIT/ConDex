export function fold(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function queryTokens(query: string) {
  return query
    .trim()
    .split(/\s+/)
    .map((token) => fold(token).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);
}

export function wordMatches(word: string, tokens: string[]) {
  const core = fold(word).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!core) return false;
  return tokens.some((token) => core.startsWith(token));
}

export function matchExcerpt(text: string, query: string) {
  const tokens = queryTokens(query);
  if (!tokens.length || !text.trim()) return null;
  const words = text.trim().split(/\s+/);
  const index = words.findIndex((word) => wordMatches(word, tokens));
  if (index < 0) return null;
  const start = Math.max(0, index - 4);
  const end = Math.min(words.length, index + 8);
  const slice = words.slice(start, end).join(" ");
  return `${start > 0 ? "… " : ""}${slice}${end < words.length ? " …" : ""}`;
}
