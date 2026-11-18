import { connection } from "next/server";
import { createAiToken, listAiTokens, revokeAiToken } from "@/lib/db";
import { bearer, cookieOwner } from "@/lib/owner";

/** Token management works only from the user's own browser (cookie), never with a token. */
function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host || new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  await connection();
  if (bearer(request)) return json({ ok: false, message: "Manage tokens from the LifeSaver app." }, 403);
  const owner = await cookieOwner(false);
  return json({ ok: true, tokens: owner ? listAiTokens(owner) : [] });
}

export async function POST(request: Request) {
  await connection();
  if (bearer(request) || !sameOrigin(request)) return json({ ok: false, message: "Manage tokens from the LifeSaver app." }, 403);
  let body: { name?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const owner = await cookieOwner(true);
  const name = typeof body.name === "string" ? body.name.trim().replace(/[^\p{L}\p{N} ._-]/gu, "") : "";
  const result = createAiToken(owner!, name || "My AI");
  if (!result.ok) return json(result, 409);
  return json({ ok: true, id: result.id, token: result.token, tokens: listAiTokens(owner!) });
}

export async function DELETE(request: Request) {
  await connection();
  if (bearer(request) || !sameOrigin(request)) return json({ ok: false, message: "Manage tokens from the LifeSaver app." }, 403);
  const owner = await cookieOwner(false);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!owner || !Number.isInteger(id)) return json({ ok: false, message: "Token not found." }, 404);
  revokeAiToken(owner, id);
  return json({ ok: true, tokens: listAiTokens(owner) });
}
