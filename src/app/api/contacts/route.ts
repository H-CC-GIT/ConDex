import { NextResponse } from "next/server";
import { createContact, listDeck } from "@/lib/contacts";
import type { ContactInput } from "@/lib/types";
import { fail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const dueOnly = url.searchParams.get("due") === "1";
    const tag = url.searchParams.get("tag") ?? "";
    return NextResponse.json(listDeck(query, dueOnly, tag));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactInput;
    return NextResponse.json(createContact(body), { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
