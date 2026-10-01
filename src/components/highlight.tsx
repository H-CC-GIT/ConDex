import { queryTokens, wordMatches } from "@/lib/search-text";

export function Highlight({ text, query }: { text: string; query: string }) {
  if (!text) return null;
  const tokens = queryTokens(query);
  if (tokens.length === 0) return <>{text}</>;
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, index) =>
        part.trim() && wordMatches(part, tokens) ? (
          <mark key={index}>{part}</mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}
