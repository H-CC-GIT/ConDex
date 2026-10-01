import { NextResponse } from "next/server";
import { deleteContact, getContact, updateContact } from "@/lib/contacts";
import { fail, isUuid } from "@/lib/http";
import type { ContactInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "That card is no longer in the deck." }, { status: 404 });
    }
    const contact = getContact(id);
    if (!contact) {
      return NextResponse.json({ error: "That card is no longer in the deck." }, { status: 404 });
    }
    return NextResponse.json(contact);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "That card is no longer in the deck." }, { status: 404 });
    }
    const body = (await request.json()) as ContactInput;
    return NextResponse.json(updateContact(id, body));
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
    deleteContact(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
