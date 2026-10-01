import { NextResponse } from "next/server";
import { clearPhoto, savePhoto } from "@/lib/contacts";
import { fail, isUuid } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "That card is no longer in the deck." }, { status: 404 });
    }
    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a photo first." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    return NextResponse.json(savePhoto(id, bytes));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "That card is no longer in the deck." }, { status: 404 });
    }
    return NextResponse.json(clearPhoto(id));
  } catch (error) {
    return fail(error);
  }
}
