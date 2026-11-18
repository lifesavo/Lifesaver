import { connection } from "next/server";
import { createLoginCode, takeAuthRate } from "@/lib/accounts";
import { json } from "@/lib/account-api";
import { sessionUser } from "@/lib/session";

/** A 6-digit code to sign in on another device (for example the iPhone home-screen app). */
export async function POST() {
  await connection();
  const user = await sessionUser();
  if (!user) return json({ ok: false, message: "Sign in first." }, 401);
  if (!takeAuthRate(`link:${user.id}`, 10)) return json({ ok: false, message: "Too many codes. Try again in an hour." }, 429);
  const { code, minutes } = createLoginCode(user.id, "device");
  return json({ ok: true, code, minutes, email: user.email });
}
