import { cookies } from "next/headers";
import { CardScreen } from "@/components/card-screen";
import { NOTES_COOKIE, notesShown } from "@/lib/notes-pref";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jar = await cookies();
  return <CardScreen id={id} showNotes={notesShown(jar.get(NOTES_COOKIE)?.value)} />;
}
