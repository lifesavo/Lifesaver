import { connection } from "next/server";
import { createUser, takeAuthRate, toPublic, userByEmail } from "@/lib/accounts";
import { cleanEmail, cleanZip, json, readBody } from "@/lib/account-api";
import { billingOpen } from "@/lib/billing-config";
import { readAttribution } from "@/lib/attribution";
import { addSignup } from "@/lib/db";
import { emailEnabled } from "@/lib/email";
import { clientKey, currentOwnerCookie, sessionUser, startSession } from "@/lib/session";
import { isTestEmail, recordTrackedEvent } from "@/lib/track";

/** Create an account with an email and ZIP and sign this browser in. */
export async function POST(request: Request) {
  await connection();
  const body = await readBody<{ email: string; zip: string; ref: string; utm_source: string; trial: boolean }>(request);
  const email = cleanEmail(body?.email);
  if (!email) return json({ ok: false, message: "Enter an email like alex@example.com." }, 400);
  const zip = cleanZip(body?.zip);
  if (body?.zip && !zip) return json({ ok: false, message: "Use a 5-digit ZIP code." }, 400);

  const already = await sessionUser();
  if (already && already.email === email) return json({ ok: true, user: toPublic(already) });

  if (!takeAuthRate(`signup:${clientKey(request)}`, 20)) {
    return json({ ok: false, message: "Too many sign-ups from here. Try again in an hour." }, 429);
  }

  if (userByEmail(email)) {
    // Never sign someone into an existing account without a code.
    return json({ ok: false, exists: true, emailLogin: emailEnabled(), message: "That email already has a LifeSaver account. Sign in with a code." }, 409);
  }

  const trial = body?.trial === true;
  const attribution = {
    ...readAttribution({ ref: body?.ref, utm_source: body?.utm_source }),
    source: trial ? "trial" : null,
  };
  const user = createUser({ email, zip, ownerId: await currentOwnerCookie(), billingOpen: billingOpen() });
  addSignup(email, zip, attribution);
  if (trial && !isTestEmail(email)) {
    recordTrackedEvent("trial_signup", { utm_source: attribution.utmSource, ref: attribution.ref });
  }
  await startSession(user.id);
  return json({ ok: true, user: toPublic(user) });
}
