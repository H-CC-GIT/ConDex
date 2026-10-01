import { Rolodex } from "@/components/rolodex";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[]; from?: string | string[] }>;
}) {
  const params = await searchParams;
  return <Rolodex tag={firstParam(params.tag)} fromId={firstParam(params.from)} />;
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
