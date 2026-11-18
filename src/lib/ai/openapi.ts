import { SITE } from "@/lib/ai/tools";

export function openApiSpec() {
  const err = { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } };
  const ok = (description: string) => ({ description, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } });
  return {
    openapi: "3.1.0",
    info: {
      title: "LifeSaver",
      version: "1.0.0",
      description:
        "Everyday tools from LifeSaver (golifesaver.com): cheapest gas, what to wear, trip itineraries, roadside help guidance, and the free $100 weekly giveaway. Read endpoints are public. Saved-trip endpoints need the user's personal access token as a Bearer token. Gas prices carry a kind (live, reported, estimated); never call estimated prices live. Trip budgets are estimates. Roadside info is guidance only and dispatches no one.",
    },
    servers: [{ url: SITE }],
    paths: {
      "/api/fuel": {
        get: {
          operationId: "getGasPrices",
          summary: "Gas stations and prices near a ZIP or point",
          parameters: [
            { name: "zip", in: "query", schema: { type: "string", pattern: "^\\d{5}$" } },
            { name: "lat", in: "query", schema: { type: "number" } },
            { name: "lng", in: "query", schema: { type: "number" } },
            { name: "radius", in: "query", description: "Meters, 800-25000", schema: { type: "number", default: 4828 } },
          ],
          responses: { "200": ok("Stations sorted by distance with prices and price kinds"), "400": err, "502": err },
        },
      },
      "/api/weather": {
        get: {
          operationId: "whatToWear",
          summary: "Today's weather and outfit picks",
          parameters: [
            { name: "q", in: "query", description: "US ZIP or 'City, ST'", schema: { type: "string" } },
            { name: "lat", in: "query", schema: { type: "number" } },
            { name: "lng", in: "query", schema: { type: "number" } },
          ],
          responses: { "200": ok("report and outfit (summary + picks)"), "400": err, "502": err },
        },
      },
      "/api/itinerary": {
        post: {
          operationId: "planTrip",
          summary: "Build a day-by-day trip itinerary",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    text: { type: "string", description: "Plain-English request, e.g. 'Plan a 3-day trip to Nashville Dec 5-7 for 2, $800'" },
                    destination: { type: "string" },
                    origin: { type: "string" },
                    start: { type: "string", format: "date" },
                    end: { type: "string", format: "date" },
                    travelers: { type: "integer", minimum: 1, maximum: 12 },
                    budget: { type: "number" },
                    interests: { type: "array", items: { type: "string", enum: ["food", "music", "nightlife", "outdoors", "museums", "family", "shopping", "beach", "romance", "sports"] } },
                  },
                },
              },
            },
          },
          responses: { "200": ok("plan: days, budget (estimates), packing, links"), "400": err },
        },
      },
      "/api/alerts": {
        get: {
          operationId: "getAlerts",
          summary: "Active National Weather Service alerts for a place",
          parameters: [
            { name: "q", in: "query", description: "US ZIP or 'City, ST'", schema: { type: "string" } },
            { name: "lat", in: "query", schema: { type: "number" } },
            { name: "lng", in: "query", schema: { type: "number" } },
          ],
          responses: { "200": ok("alerts sorted by severity"), "400": err, "502": err },
        },
      },
      "/api/alerts/trip": {
        get: {
          operationId: "getTripAlerts",
          summary: "Alerts at a destination and sampled points along the way, plus state road-conditions links",
          parameters: [
            { name: "destination", in: "query", required: true, schema: { type: "string" } },
            { name: "origin", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": ok("destination, route, roads"), "400": err, "502": err },
        },
      },
      "/api/roadside": {
        get: {
          operationId: "roadsideHelpInfo",
          summary: "Roadside safety steps and nearby-service links",
          parameters: [{ name: "issue", in: "query", schema: { type: "string", enum: ["flat_tire", "breakdown", "out_of_gas", "lockout", "jump_start", "accident"] } }],
          responses: { "200": ok("safety copy and per-issue steps and links") },
        },
      },
      "/api/help/requests": {
        post: {
          operationId: "createGetAHandRequest",
          summary: "Get a Hand request for roadside, ride, or pro help (community helpers, not vetted or licensed; not guaranteed)",
          security: [{ bearer: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["type", "name", "phone"],
                  properties: {
                    type: { type: "string", enum: ["roadside", "ride", "pro"] },
                    issue: { type: "string", description: "roadside: flat_tire, breakdown, out_of_gas, lockout, jump_start, accident" },
                    category: { type: "string", description: "pro: plumber, electrician, hvac, handyman, roofing, cleaning, lawn_snow, moving, pest, locksmith, auto_mechanic, other" },
                    pickup: { type: "string" },
                    dropoff: { type: "string" },
                    when: { type: "string" },
                    riders: { type: "integer" },
                    address: { type: "string" },
                    urgency: { type: "string", enum: ["now", "today", "this_week", "flexible"] },
                    description: { type: "string" },
                    lat: { type: "number" },
                    lng: { type: "number" },
                    zip: { type: "string" },
                    name: { type: "string" },
                    phone: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": ok("request"), "400": err, "401": err, "429": err },
        },
        get: {
          operationId: "listMyGetAHandRequests",
          summary: "The user's requests and status",
          security: [{ bearer: [] }],
          parameters: [{ name: "mine", in: "query", required: true, schema: { type: "string", enum: ["1"] } }],
          responses: { "200": ok("requests") },
        },
      },
      "/api/roadside/requests": {
        get: {
          operationId: "listMyHelpRequests",
          summary: "The user's roadside help requests and their status",
          security: [{ bearer: [] }],
          parameters: [{ name: "mine", in: "query", required: true, schema: { type: "string", enum: ["1"] } }],
          responses: { "200": ok("requests") },
        },
        post: {
          operationId: "createHelpRequest",
          summary: "Ask nearby Lend a Hand helpers for roadside help (community members, not pros; not guaranteed)",
          security: [{ bearer: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["issue", "lat", "lng", "name", "phone"],
                  properties: {
                    issue: { type: "string", enum: ["flat_tire", "breakdown", "out_of_gas", "lockout", "jump_start", "accident"] },
                    lat: { type: "number" },
                    lng: { type: "number" },
                    name: { type: "string" },
                    phone: { type: "string" },
                    note: { type: "string", maxLength: 300 },
                  },
                },
              },
            },
          },
          responses: { "200": ok("request"), "400": err, "401": err, "429": err },
        },
      },
      "/api/giveaway": {
        get: {
          operationId: "giveawayInfo",
          summary: "Current $100 weekly giveaway week, entrants, and last winner",
          responses: { "200": ok("week, entrants, lastWinner") },
        },
      },
      "/api/me/trips": {
        get: { operationId: "listMyTrips", summary: "The user's saved trips", security: [{ bearer: [] }], responses: { "200": ok("trips"), "401": err } },
        post: {
          operationId: "saveMyTrip",
          summary: "Save a plan returned by planTrip to the user's trips",
          security: [{ bearer: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", description: "The plan object from planTrip", additionalProperties: true } } } },
          responses: { "200": ok("saved"), "400": err, "401": err },
        },
        delete: {
          operationId: "deleteMyTrip",
          summary: "Delete a saved trip",
          security: [{ bearer: [] }],
          parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
          responses: { "200": ok("deleted"), "401": err },
        },
      },
    },
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer", description: `Personal access token from ${SITE}/settings` } },
      schemas: { Error: { type: "object", properties: { ok: { type: "boolean" }, message: { type: "string" } } } },
    },
  };
}

export function llmsTxt() {
  return `# LifeSaver

> LifeSaver (${SITE}) is an all-in-one everyday app: cheapest gas, what to wear, a trip planner, roadside help guidance, bills, deals, and a free $100 weekly giveaway. These endpoints let a person's own AI assistant use LifeSaver for them.

Rules for assistants:
- Gas prices have a kind: live, reported, or estimated. Say which. Never call an estimate a live price.
- Trip budget numbers are a suggested split, not quotes. LifeSaver does not book travel.
- Roadside info is guidance only. LifeSaver does not dispatch anyone. If the user is in danger, tell them to call 911.
- The giveaway is free. The user enters themselves at ${SITE}/giveaway.
- LifeSaver is not affiliated with OpenAI, Anthropic, Google, or xAI.

## Connect
- MCP server (Streamable HTTP): ${SITE}/api/mcp
- OpenAPI 3.1 spec: ${SITE}/openapi.json
- Setup guide: ${SITE}/ai
- Personal access token (only for the user's saved trips): create at ${SITE}/settings, send as \`Authorization: Bearer <token>\`.

## Public tools (no token)
- get_gas_prices: GET ${SITE}/api/fuel?zip=64067
- what_to_wear: GET ${SITE}/api/weather?q=Denver,%20CO
- plan_trip: POST ${SITE}/api/itinerary {"text":"Plan a 3-day trip to Nashville Dec 5-7 for 2, $800"}
- roadside_help_info: GET ${SITE}/api/roadside?issue=flat_tire
- giveaway_info: GET ${SITE}/api/giveaway
- get_alerts: GET ${SITE}/api/alerts?q=Denver,%20CO or ${SITE}/api/alerts/trip?origin=Kansas%20City&destination=Denver

## With the user's token
- list_my_trips: GET ${SITE}/api/me/trips
- save_trip: POST ${SITE}/api/me/trips (plan object) or MCP save_trip
- delete_my_trip: DELETE ${SITE}/api/me/trips?id=trip-...
- create_help_request: POST ${SITE}/api/help/requests with type roadside ({"type":"roadside","issue":"flat_tire","lat":39.1,"lng":-94.5,"name":"Sam","phone":"555-555-0100","note":"I-70 WB exit 49"}), ride (pickup, dropoff, when, riders), or pro (category, description, address, urgency). Helpers are community members, not vetted or licensed by LifeSaver; not guaranteed.
- list_my_help_requests: GET ${SITE}/api/help/requests?mine=1

## Get a Hand
- ${SITE}/help?type=ride&dropoff=Airport or ${SITE}/help?type=pro&category=plumber. Helper board: ${SITE}/helpers

## Roadside
- People who are stranded can open ${SITE}/roadside?issue=flat_tire (or breakdown, out_of_gas, lockout, jump_start, accident).
`;
}
