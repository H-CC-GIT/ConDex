import { Rolodex } from "@/components/rolodex";
import { listDeck } from "@/lib/contacts";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[]; from?: string | string[] }>;
}) {
  const params = await searchParams;
  const book = listDeck("", false, "");
  return <Rolodex tag={firstParam(params.tag)} fromId={firstParam(params.from)} initialBook={book} />;
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
