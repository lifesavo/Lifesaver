/** Static roadside guidance. No dispatch: LifeSaver does not send a tow truck or a person. */

export type RoadsideIssue = "flat_tire" | "breakdown" | "out_of_gas" | "lockout" | "jump_start" | "accident" | "wont_start";

/** Issues shown in the picker, in order. wont_start stays for older links. */
export const PICKER_ISSUES: RoadsideIssue[] = ["flat_tire", "breakdown", "out_of_gas", "lockout", "jump_start", "accident"];

export const ROADSIDE_SAFETY =
  "If you are in danger, hurt, or stopped in a traffic lane, call 911 first. Pull as far off the road as you can, turn on hazard lights, and stay away from moving traffic.";

const maps = (q: string) => `https://www.google.com/maps/search/${encodeURIComponent(q)}`;

export const ROADSIDE: Record<RoadsideIssue, { label: string; steps: string[]; links: { label: string; href: string }[] }> = {
  flat_tire: {
    label: "Flat or blown tire",
    steps: [
      "Get fully off the road on flat ground, hazards on, parking brake set.",
      "Check the trunk for a spare, jack, and lug wrench, or a tire inflator kit.",
      "Loosen lug nuts before jacking. Never get under a car on a jack.",
      "A spare donut is usually good for about 50 mph and a short distance.",
      "Your insurance, car maker, or credit card may include free roadside help. Check the card or app.",
    ],
    links: [
      { label: "Tire shops near me", href: maps("tire shop near me") },
      { label: "Tow truck near me", href: maps("tow truck near me") },
    ],
  },
  jump_start: {
    label: "Dead battery",
    steps: [
      "Both cars off. Red clamp to dead battery +, then red to good battery +.",
      "Black clamp to good battery −, last black clamp to bare metal on the dead car, away from the battery.",
      "Start the good car, wait 2–3 minutes, then try the dead car.",
      "Remove clamps in reverse order. Drive 20+ minutes to recharge.",
    ],
    links: [
      { label: "Auto parts stores near me (free battery test)", href: maps("auto parts store near me") },
      { label: "Mobile battery service near me", href: maps("mobile car battery service near me") },
    ],
  },
  breakdown: {
    label: "Breakdown",
    steps: [
      "Get as far off the road as you can. Hazards on. If you can't get off a highway lane, stay buckled in and call 911.",
      "At night or in bad weather, stay in the car with your seatbelt on, unless it's smoking or on fire.",
      "Warning lights, smoke, steam, or a burning smell: turn the engine off and don't keep trying to start it.",
      "Check your insurance card, car maker app, or credit card for free roadside service before paying for a tow.",
    ],
    links: [
      { label: "Tow truck near me", href: maps("tow truck near me") },
      { label: "Mechanics near me", href: maps("auto repair near me") },
    ],
  },
  out_of_gas: {
    label: "Out of gas",
    steps: [
      "Coast to the shoulder, hazards on.",
      "Find the nearest station on the LifeSaver gas map, then walk only if it is close and safe.",
      "Use an approved gas can. Many stations sell one.",
      "Fuel delivery services exist in many areas, but availability and arrival times vary.",
    ],
    links: [
      { label: "Cheapest gas near you (LifeSaver)", href: "/fuel" },
      { label: "Fuel delivery near me", href: maps("fuel delivery near me") },
      { label: "Tow truck near me", href: maps("tow truck near me") },
    ],
  },
  lockout: {
    label: "Locked out",
    steps: [
      "Check every door and the trunk. Many cars have a spare key app or a dealer unlock service.",
      "If a child or pet is locked inside, call 911 now.",
      "Use a licensed locksmith and ask for the price before they start.",
    ],
    links: [{ label: "Car locksmith near me", href: maps("car locksmith near me") }],
  },
  wont_start: {
    label: "Car won't start",
    steps: [
      "Clicking but no crank usually means the battery. Try a jump.",
      "Cranks but won't fire: check you have gas, then wait a few minutes and try once more.",
      "Warning lights, smoke, or a burning smell: stop trying and call for a tow.",
    ],
    links: [
      { label: "Mechanics near me", href: maps("auto repair near me") },
      { label: "Tow truck near me", href: maps("tow truck near me") },
    ],
  },
  accident: {
    label: "Accident",
    steps: [
      "Call 911 if anyone is hurt or the cars block traffic.",
      "Move to safety if you can. Turn on hazards.",
      "Swap names, insurance, and plates. Take photos of both cars and the scene.",
      "Call your insurance company to start a claim.",
    ],
    links: [{ label: "Tow truck near me", href: maps("tow truck near me") }],
  },
};

export function roadsideInfo(issue?: string) {
  const key = (issue ?? "").toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
  const aliases: Record<string, RoadsideIssue> = { flat: "flat_tire", tire: "flat_tire", blow: "flat_tire", break: "breakdown", battery: "jump_start", jump: "jump_start", gas: "out_of_gas", fuel: "out_of_gas", locked: "lockout", keys: "lockout", start: "wont_start", crash: "accident" };
  const match = (Object.keys(ROADSIDE) as RoadsideIssue[]).find((k) => k === key) ?? Object.entries(aliases).find(([word]) => key.includes(word))?.[1];
  return {
    safety: ROADSIDE_SAFETY,
    note: "LifeSaver gives guidance and links. It does not dispatch a tow truck, fuel delivery, or a person, and nothing here is guaranteed.",
    issues: match ? { [match]: ROADSIDE[match] } : ROADSIDE,
  };
}

/** Picks a roadside issue out of a chat message, or null. */
export function detectRoadside(text: string): RoadsideIssue | null {
  const t = text.toLowerCase();
  if (/\b(accident|crash(ed)?|wreck(ed)?|hit (a|another|by)|rear[- ]ended|collision)\b/.test(t)) return "accident";
  if (/\b(blew|blown|blowout|flat)\b.*\btire|\btire\b.*\b(blew|blown|flat|popped|burst)|\bflat tire\b|\bblowout\b/.test(t)) return "flat_tire";
  if (/\b(ran|run|running) out of (gas|fuel)|\bout of (gas|fuel)\b|\bno gas\b|\bempty tank\b/.test(t)) return "out_of_gas";
  if (!/\b(house|home|apartment|office)\b/.test(t) && /\blocked (my )?(keys|myself)|\bkeys? (locked )?in (the|my) (car|truck)|\blocked out\b/.test(t)) return "lockout";
  if (/\bdead battery\b|\bbattery (is )?dead\b|\bneed a jump\b|\bjump ?start\b/.test(t)) return "jump_start";
  if (/\b(broke|broken) down\b|\bbreakdown\b|\bstranded\b|\b(car|truck|van|suv) (won'?t|will not|wont) (start|run|go)\b|\bneed a tow\b|\bon the side of the (road|highway)\b/.test(t)) return "breakdown";
  return null;
}
