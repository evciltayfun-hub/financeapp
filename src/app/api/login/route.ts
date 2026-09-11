import { NextRequest, NextResponse } from "next/server";
import { authToken, AUTH_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return NextResponse.json({ error: "APP_PASSWORD tanımlı değil" }, { status: 400 });

  const { password } = await req.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || password !== appPassword) {
    return NextResponse.json({ error: "Hatalı şifre" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await authToken(appPassword), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
