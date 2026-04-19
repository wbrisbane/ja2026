import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type Role = "viewer" | "uploader";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const COOKIE_NAME = "gallery_session";

export async function signToken(role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<Role | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.role as Role) ?? null;
  } catch {
    return null;
  }
}

export async function getSessionRole(): Promise<Role | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
