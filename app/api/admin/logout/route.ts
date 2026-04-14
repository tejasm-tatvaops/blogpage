import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
    logger.info("Admin logout");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Logout route error");
    return NextResponse.json({ error: "Logout failed." }, { status: 500 });
  }
}
