import { connection } from "next/server";
import { adoptOwnerData, consumeLoginCode, takeAuthRate, toPublic, updateUser, userByEmail } from "@/lib/accounts";
import { cleanEmail, json, readBody } from "@/lib/account-api";
import { clientKey, currentOwnerCookie, startSession } from "@/lib/session";

/** Sign in with an email plus a 6-digit code (emailed, or shown on a signed-in device). */
export async function POST(request: Request) {
  await connection();
  const body = await readBody<{ email: string; code: string }>(request);
  const email = cleanEmail(body?.email);
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!email || code.length !== 6) return json({ ok: false, message: "Enter your email and the 6-digit code." }, 400);
  if (!takeAuthRate(`verify-ip:${clientKey(request)}`, 30) || !takeAuthRate(`verify:${email}`, 10)) {
    return json({ ok: false, message: "Too many tries. Wait an hour and get a new code." }, 429);
  }
  const user = userByEmail(email);
  const purpose = user ? consumeLoginCode(user.id, code) : null;
  if (!user || !purpose) return json({ ok: false, message: "That code didn't match or has expired. Get a new one." }, 401);
  if (purpose === "email" && !user.email_verified) updateUser(user.id, { email_verified: 1 });
  adoptOwnerData(await currentOwnerCookie(), user.id);
  await startSession(user.id);
  return json({ ok: true, user: toPublic({ ...user, email_verified: purpose === "email" ? 1 : user.email_verified }) });
}
