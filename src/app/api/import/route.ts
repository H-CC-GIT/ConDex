import { NextResponse } from "next/server";
import { readZip } from "@/lib/archive";
import { fail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a ConDex zip first." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await readZip(bytes);
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
