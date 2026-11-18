import { connection } from "next/server";
import { createLoginCode, takeAuthRate, userByEmail } from "@/lib/accounts";
import { cleanEmail, json, readBody } from "@/lib/account-api";
import { emailEnabled, loginCodeEmail, sendEmail } from "@/lib/email";
import { clientKey } from "@/lib/session";

/** Email a 6-digit sign-in code. Same answer whether or not the email has an account. */
export async function POST(request: Request) {
  await connection();
  if (!emailEnabled()) {
    return json({ ok: false, emailLogin: false, message: "Email codes aren't switched on yet. Get a code from a phone or computer where you're already signed in: open Settings there and tap Sign in on another device." }, 503);
  }
  const body = await readBody<{ email: string }>(request);
  const email = cleanEmail(body?.email);
  if (!email) return json({ ok: false, message: "Enter an email like alex@example.com." }, 400);
  if (!takeAuthRate(`code:${email}`, 5) || !takeAuthRate(`code-ip:${clientKey(request)}`, 20)) {
    return json({ ok: false, message: "Too many codes. Try again in an hour." }, 429);
  }
  const user = userByEmail(email);
  if (user) {
    const { code, minutes } = createLoginCode(user.id, "email");
    const message = loginCodeEmail(code, minutes);
    const sent = await sendEmail({ to: email, ...message });
    if (!sent.ok) return json({ ok: false, message: "We couldn't send the email. Try again in a minute." }, 502);
  }
  return json({ ok: true, message: "If that email has a LifeSaver account, a 6-digit code is on its way. Check spam too." });
}
