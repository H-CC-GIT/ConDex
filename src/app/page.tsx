import { cookies } from "next/headers";
import { Rolodex } from "@/components/rolodex";
import { listDeck } from "@/lib/contacts";
import { NOTES_COOKIE, notesShown } from "@/lib/notes-pref";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[]; from?: string | string[] }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const book = listDeck("", false, "");
  return (
    <Rolodex
      tag={firstParam(params.tag)}
      fromId={firstParam(params.from)}
      initialBook={book}
      showNotes={notesShown(jar.get(NOTES_COOKIE)?.value)}
    />
  );
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
