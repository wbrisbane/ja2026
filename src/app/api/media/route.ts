import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { listMedia } from "@/lib/blob";

export async function GET() {
  const role = await getSessionRole();
  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const media = await listMedia();
  return NextResponse.json(media);
}
