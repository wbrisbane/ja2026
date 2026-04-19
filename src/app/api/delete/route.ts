import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { deleteMedia } from "@/lib/blob";
import { getClientIP, logEvent } from "@/lib/logger";

export async function DELETE(req: NextRequest) {
  const ip = getClientIP(req);
  const role = await getSessionRole();
  if (role !== "uploader") {
    logEvent("delete_forbidden", { ip, role: role ?? "none" });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  await deleteMedia(url);
  logEvent("delete_success", { ip, url });
  return NextResponse.json({ ok: true });
}
