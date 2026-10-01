import { NextResponse } from "next/server";
import { buildZip } from "@/lib/archive";
import { todayISO } from "@/lib/contacts";
import { fail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const zip = await buildZip();
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="condex-${todayISO()}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
