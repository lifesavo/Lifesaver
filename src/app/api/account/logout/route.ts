import { connection } from "next/server";
import { json } from "@/lib/account-api";
import { endSession } from "@/lib/session";

export async function POST() {
  await connection();
  await endSession();
  return json({ ok: true });
}
