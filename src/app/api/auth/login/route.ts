import { NextRequest, NextResponse } from "next/server";
import { signToken, COOKIE_NAME, type Role } from "@/lib/auth";
import { getClientIP, logEvent } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const { password } = await req.json();

  let role: Role | null = null;

  if (password === process.env.UPLOADER_PASSWORD) {
    role = "uploader";
  } else if (password === process.env.VIEWER_PASSWORD) {
    role = "viewer";
  }

  if (!role) {
    logEvent("login_failed", { ip });
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  logEvent("login_success", { ip, role });

  const token = await signToken(role);

  const res = NextResponse.json({ role });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return res;
}
