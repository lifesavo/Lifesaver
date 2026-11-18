/**
 * Outgoing email. Turned on by setting RESEND_API_KEY and EMAIL_FROM on the server
 * (EMAIL_FROM must be an address on a domain verified in Resend, e.g. "LifeSaver <hello@golifesaver.com>").
 * With no key, email sign-in codes are off and people sign in with a code from a signed-in device.
 */
export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }) {
  if (!emailEnabled()) return { ok: false as const, message: "Email is not set up." };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM!.trim(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!response || !response.ok) return { ok: false as const, message: "The email didn't send." };
  return { ok: true as const };
}

export function loginCodeEmail(code: string, minutes: number) {
  const text = `Your LifeSaver sign-in code is ${code}\n\nIt works for ${minutes} minutes. If you didn't ask for it, you can ignore this email.`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#2A1038;max-width:420px">
<p style="font-size:16px">Your LifeSaver sign-in code is</p>
<p style="font-size:36px;font-weight:700;letter-spacing:6px;margin:8px 0">${code}</p>
<p style="font-size:14px;color:#555">It works for ${minutes} minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`;
  return { subject: `${code} is your LifeSaver code`, text, html };
}
