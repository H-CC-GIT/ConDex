import type { CardPage, Contact, Deck, DueEntry } from "@/lib/types";

let book: Deck | null = null;

export function getBook() {
  return book;
}

export function saveBook(next: Deck) {
  book = next;
}

export function rememberedCard(id: string): CardPage | null {
  if (!book) return null;
  const contact = book.contacts.find((item) => item.id === id);
  if (!contact) return null;
  return {
    today: book.today,
    contact,
    related: [],
    directory: book.directory,
  };
}

export function rememberContact(contact: Contact) {
  if (!book) return;
  const today = book.today;
  const contacts = book.contacts.some((item) => item.id === contact.id)
    ? book.contacts.map((item) => (item.id === contact.id ? contact : item))
    : [...book.contacts, contact].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  const directory = book.directory.some((item) => item.id === contact.id)
    ? book.directory.map((item) => (item.id === contact.id ? { id: contact.id, name: contact.name } : item))
    : [...book.directory, { id: contact.id, name: contact.name }].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  book = { ...book, contacts, directory, due: dueEntries(contacts, today) };
}

export function forgetContact(id: string) {
  if (!book) return;
  book = {
    ...book,
    contacts: book.contacts.filter((item) => item.id !== id),
    directory: book.directory.filter((item) => item.id !== id),
    due: book.due.filter((item) => item.id !== id),
  };
}

function dueEntries(contacts: Contact[], today: string): DueEntry[] {
  return contacts
    .flatMap((contact) =>
      contact.followUpOn && contact.followUpOn <= today
        ? [{ id: contact.id, name: contact.name, followUpOn: contact.followUpOn }]
        : [],
    )
    .sort(
      (a, b) =>
        a.followUpOn.localeCompare(b.followUpOn) ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}
