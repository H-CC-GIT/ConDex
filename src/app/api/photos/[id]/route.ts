import { NextResponse } from "next/server";
import { readPhoto } from "@/lib/contacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const photo = readPhoto(id);
  if (!photo) {
    return NextResponse.json({ error: "No photo on that card." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
