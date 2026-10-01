import { fold, queryTokens, wordMatches } from "@/lib/search-text";
import type { Contact, Deck } from "@/lib/types";

function wordsOf(contact: Contact) {
  return [
    contact.name,
    contact.who,
    contact.organization,
    contact.city,
    contact.notes,
    contact.tags.join(" "),
    contact.introducedByName ?? "",
    contact.meetings.map((meeting) => `${meeting.metOn} ${meeting.place} ${meeting.what}`).join(" "),
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean);
}

function matchesTokens(words: string[], tokens: string[]) {
  return tokens.every((token) => words.some((word) => wordMatches(word, [token])));
}

function byName(a: Contact, b: Contact) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function filterDesk(book: Deck, query: string, dueOnly: boolean, tag: string) {
  const tokens = queryTokens(query);
  const wanted = fold(tag.trim());
  let list = book.contacts;
  if (dueOnly) {
    list = list.filter((contact) => contact.followUpOn && contact.followUpOn <= book.today);
  }
  if (wanted) {
    list = list.filter((contact) => contact.tags.some((name) => fold(name) === wanted));
  }
  if (!tokens.length) {
    if (list === book.contacts) return list;
    return [...list].sort(byName);
  }
  return list
    .filter((contact) => matchesTokens(wordsOf(contact), tokens))
    .sort((a, b) => {
      const aName = matchesTokens(a.name.split(/\s+/), tokens) ? 0 : 1;
      const bName = matchesTokens(b.name.split(/\s+/), tokens) ? 0 : 1;
      if (aName !== bName) return aName - bName;
      return byName(a, b);
    });
}
