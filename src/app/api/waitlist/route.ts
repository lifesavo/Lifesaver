import { connection } from "next/server";
import { addSignup, countSignups } from "@/lib/db";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  await connection();
  return json({ count: countSignups() });
}

export async function POST(request: Request) {
  await connection();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, message: "Send an email address." }, 400);
  }

  if (!payload || typeof payload !== "object") {
    return json({ ok: false, message: "Send an email address." }, 400);
  }

  const body = payload as { email?: unknown; zip?: unknown; company?: unknown };

  if (typeof body.company === "string" && body.company.trim()) {
    return json({
      ok: true,
      already: false,
      count: countSignups(),
      email: "",
    });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const zipRaw = typeof body.zip === "string" ? body.zip.trim() : "";

  if (!email || email.length > 254 || !EMAIL.test(email)) {
    return json(
      { ok: false, message: "Enter an email like alex@example.com." },
      400,
    );
  }

  if (zipRaw && !/^\d{5}$/.test(zipRaw)) {
    return json({ ok: false, message: "ZIP codes are 5 digits, or leave it blank." }, 400);
  }

  const result = addSignup(email, zipRaw || null);
  if (!result.ok) {
    return json(result, 400);
  }

  return json({
    ok: true,
    already: result.already,
    count: result.count,
    email,
  });
}
