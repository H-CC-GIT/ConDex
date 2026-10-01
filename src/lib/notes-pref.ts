export const NOTES_COOKIE = "condex-notes";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Missing or any value other than "1" means notes stay off the screen. */
export function notesShown(value: string | undefined): boolean {
  return value === "1";
}

export function writeNotesShown(shown: boolean) {
  document.cookie = `${NOTES_COOKIE}=${shown ? "1" : "0"}; Path=/; Max-Age=${YEAR_SECONDS}; SameSite=Lax`;
}
