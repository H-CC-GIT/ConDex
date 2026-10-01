import { apiUrl } from "./base-path";
import type { CardPage, Contact, ContactInput, Deck } from "./types";

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (data && typeof data.error === "string") return data.error;
  return "The deck could not finish that.";
}

async function send<T>(response: Response) {
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

export function fetchDeck(query: string, dueOnly: boolean, tag = "") {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query);
  if (dueOnly) params.set("due", "1");
  if (tag.trim()) params.set("tag", tag.trim());
  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : "";
  return fetch(apiUrl(`/api/contacts${suffix}`), { cache: "no-store" }).then((response) =>
    send<Deck>(response),
  );
}

export function fetchCard(id: string) {
  return fetch(apiUrl(`/api/contacts/${id}`), { cache: "no-store" }).then((response) =>
    send<CardPage>(response),
  );
}

export function createCard(input: ContactInput) {
  return fetch(apiUrl("/api/contacts"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((response) => send<Contact>(response));
}

export function saveCard(id: string, input: ContactInput) {
  return fetch(apiUrl(`/api/contacts/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((response) => send<Contact>(response));
}

export function removeCard(id: string) {
  return fetch(apiUrl(`/api/contacts/${id}`), { method: "DELETE" }).then((response) =>
    send<{ ok: boolean }>(response),
  );
}

export function uploadPhoto(id: string, file: File) {
  const body = new FormData();
  body.set("photo", file);
  return fetch(apiUrl(`/api/contacts/${id}/photo`), { method: "POST", body }).then((response) =>
    send<Contact>(response),
  );
}

export function removePhoto(id: string) {
  return fetch(apiUrl(`/api/contacts/${id}/photo`), { method: "DELETE" }).then((response) =>
    send<Contact>(response),
  );
}

export async function downloadExport() {
  const response = await fetch(apiUrl("/api/export"), { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const day = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `condex-${day}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function importZip(file: File) {
  const body = new FormData();
  body.set("file", file);
  return fetch(apiUrl("/api/import"), { method: "POST", body }).then((response) =>
    send<{ contacts: number }>(response),
  );
}
