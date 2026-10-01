import { NextResponse } from "next/server";
import { DeckError } from "./contacts";

export function fail(error: unknown) {
  if (error instanceof DeckError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json(
    { error: "The deck could not finish that." },
    { status: 500 },
  );
}

export function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
