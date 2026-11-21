export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readBody<T>(request: Request): Promise<Partial<T> | null> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" ? (body as Partial<T>) : null;
  } catch {
    return null;
  }
}

export function cleanEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email && email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export function cleanZip(value: unknown) {
  return typeof value === "string" && /^\d{5}$/.test(value) ? value : null;
}

export async function readFormOrJson<T>(request: Request): Promise<Partial<T> | null> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return readBody<T>(request);
  try {
    const form = await request.formData();
    const body: Record<string, string> = {};
    form.forEach((value, key) => {
      if (typeof value === "string") body[key] = value;
    });
    return body as Partial<T>;
  } catch {
    return null;
  }
}

export function isJsonRequest(request: Request) {
  return (request.headers.get("content-type") || "").includes("application/json");
}
