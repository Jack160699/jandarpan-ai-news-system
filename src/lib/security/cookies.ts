import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export function secureCookieOptions(maxAge: number): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}
