import { connection } from "next/server";
import { AI_TOOLS, callAiTool, SITE, ToolError } from "@/lib/ai/tools";
import { ownerForToken } from "@/lib/db";
import { bearer } from "@/lib/owner";

/**
 * Remote MCP server (Streamable HTTP, JSON responses, stateless).
 * Public tools need no auth. Tools that touch the user's saved data need
 * 'Authorization: Bearer <LifeSaver personal access token>'.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
};

const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

type RpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

function rpcError(id: RpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handle(message: RpcRequest, ownerId: string | null, tokenSent: boolean) {
  const { id, method, params } = message;
  if (message.jsonrpc !== "2.0" || typeof method !== "string") return rpcError(id, -32600, "Invalid request");
  const isNotification = id === undefined;
  switch (method) {
    case "initialize": {
      const asked = typeof params?.protocolVersion === "string" ? params.protocolVersion : SUPPORTED[0];
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "lifesaver", title: "LifeSaver", version: "1.0.0" },
          instructions: `LifeSaver everyday tools: cheapest gas, what to wear, trip itineraries, roadside help guidance, and the free $100 weekly giveaway. Label estimated or reported gas prices as such. Budget numbers in trip plans are estimates. Roadside info is guidance only. Saved-trip tools need the user's personal access token from ${SITE}/settings.`,
        },
      };
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: AI_TOOLS.map((tool) => ({
            name: tool.name,
            title: tool.title,
            description: tool.description + (tool.auth ? " (Requires the user's token.)" : ""),
            inputSchema: tool.inputSchema,
            annotations: { readOnlyHint: tool.readOnly, openWorldHint: !tool.auth, destructiveHint: tool.name === "delete_my_trip" },
          })),
        },
      };
    case "tools/call": {
      const name = typeof params?.name === "string" ? params.name : "";
      const args = (params?.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;
      try {
        if (tokenSent && !ownerId) throw new ToolError("That LifeSaver token is not valid or was revoked. Create a new one at " + `${SITE}/settings.`);
        const data = await callAiTool(name, args, ownerId);
        return {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data as Record<string, unknown>, isError: false },
        };
      } catch (cause) {
        const text = cause instanceof ToolError || cause instanceof Error ? cause.message : "Tool failed.";
        if (!AI_TOOLS.some((t) => t.name === name)) return rpcError(id, -32602, text);
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text }], isError: true } };
      }
    }
    default:
      return isNotification ? null : rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(request: Request) {
  await connection();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"), { status: 400, headers: CORS });
  }
  const token = bearer(request);
  let ownerId: string | null = null;
  if (token) {
    try {
      ownerId = ownerForToken(token);
    } catch {
      ownerId = null;
    }
  }
  const batch = Array.isArray(body);
  const messages = (batch ? body : [body]) as RpcRequest[];
  if (!messages.length || messages.length > 20) {
    return Response.json(rpcError(null, -32600, "Invalid request"), { status: 400, headers: CORS });
  }
  const replies = (await Promise.all(messages.map((m) => handle(m ?? {}, ownerId, Boolean(token))))).filter(Boolean);
  if (!replies.length) return new Response(null, { status: 202, headers: CORS });
  return Response.json(batch ? replies : replies[0], { headers: { ...CORS, "Cache-Control": "no-store" } });
}

export async function GET() {
  // No server-initiated stream. Clients POST JSON-RPC.
  return new Response("LifeSaver MCP endpoint. POST JSON-RPC 2.0 messages here. Docs: " + `${SITE}/ai`, {
    status: 405,
    headers: { ...CORS, Allow: "POST, OPTIONS" },
  });
}

export async function DELETE() {
  return new Response(null, { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
