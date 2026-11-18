import { callAiTool } from "@/lib/ai/tools";

export async function GET(request: Request) {
  const issue = new URL(request.url).searchParams.get("issue") ?? "";
  const data = await callAiTool("roadside_help_info", { issue }, null);
  return Response.json({ ok: true, ...(data as object) }, { headers: { "Access-Control-Allow-Origin": "*" } });
}
