import { SITE } from "@/lib/ai/tools";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      schema_version: "v1",
      name_for_human: "LifeSaver",
      name_for_model: "lifesaver",
      description_for_human: "Cheapest gas, what to wear, trip plans, roadside help, and a free $100 weekly giveaway.",
      description_for_model:
        "Everyday helper. Use for gas prices near a ZIP (label estimated prices), outfit picks from today's weather, day-by-day trip itineraries (budgets are estimates, nothing is booked), roadside guidance (no dispatch; 911 if in danger), and giveaway info. Saved trips need the user's bearer token.",
      auth: { type: "none" },
      api: { type: "openapi", url: `${SITE}/openapi.json` },
      mcp: { url: `${SITE}/api/mcp`, transport: "streamable-http" },
      logo_url: `${SITE}/icon.svg`,
      legal_info_url: `${SITE}/ai`,
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
