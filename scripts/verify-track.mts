import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lifesaver-track-"));
process.env.DATA_DIR = dir;

const {
  isBeaconEvent,
  isTestEmail,
  incrementEvent,
  incrementEventOnce,
  eventCounts,
  chicagoDay,
  recordTrackedEvent,
  accountTrackStats,
} = await import("../src/lib/track");
const { trafficSource, trialStartPath, normalizeSource } = await import("../src/lib/attribution");
const { addSignup } = await import("../src/lib/db");

const checks: string[] = [];
function assert(cond: unknown, msg: string) {
  if (!cond) checks.push("FAIL: " + msg);
  else checks.push("ok: " + msg);
}

assert(isBeaconEvent("try_it_free_hero"), "hero click is a beacon event");
assert(isBeaconEvent("try_it_free_sticky"), "sticky click is a beacon event");
assert(isBeaconEvent("try_it_free_header"), "header click is a beacon event");
assert(!isBeaconEvent("trial_signup"), "signup is not a public beacon event");
assert(!isBeaconEvent("trial_form_submit"), "form submit is not a public beacon event");
assert(!isBeaconEvent("trial_checkout_failed"), "checkout failed is not a public beacon event");
assert(!isBeaconEvent("not_a_real_event"), "unknown events are rejected");

assert(isTestEmail("trial.verify.ad31266.1@somewhere.com"), "trial.verify prefix is a test email");
assert(isTestEmail("person@example.com"), "@example.com is a test email");
assert(isTestEmail("8yp1yxba@mail.grokbot.com"), "bot inbox is a test email");
assert(isTestEmail("8yp1yxba+launchtest@mail.grokbot.com"), "bot plus-address is a test email");
assert(!isTestEmail("alex@gmail.com"), "ordinary email is not a test account");

assert(trafficSource({ utm_source: "tiktok" }) === "tiktok", "utm_source tiktok");
assert(trafficSource({ utm_source: "tt" }) === "tiktok", "tt aliases to tiktok");
assert(trafficSource({ utm_source: "meta" }) === "meta", "utm_source meta");
assert(trafficSource({ utm_source: "youtube" }) === "youtube", "utm_source youtube");
assert(trafficSource({ ref: "creator1" }) === "creator1", "ref used when no utm");
assert(trafficSource({}) === "direct", "default source is direct");
assert(normalizeSource("ig") === "instagram", "ig aliases to instagram");

assert(trialStartPath("") === "/start?trial=1", "bare trial path");
assert(trialStartPath("?utm_source=tiktok&ref=aboost") === "/start?trial=1&utm_source=tiktok&ref=aboost", "forwards utm and ref");
assert(trialStartPath("?utm_source=evil.com/x") === "/start?trial=1", "drops unsafe source values");

recordTrackedEvent("try_it_free_hero", { utm_source: "tiktok" });
recordTrackedEvent("try_it_free_hero", { utm_source: "tiktok" });
recordTrackedEvent("try_it_free_sticky", {});
incrementEvent("trial_start_view", "direct");

const day = chicagoDay();
const rows = eventCounts();
const hero = rows.find((row) => row.event === "try_it_free_hero" && row.source === "tiktok" && row.day === day);
const sticky = rows.find((row) => row.event === "try_it_free_sticky" && row.source === "direct" && row.day === day);
assert(hero?.count === 2, "hero clicks accumulate by source and day");
assert(sticky?.count === 1, "sticky clicks default to direct");
assert(rows.every((row) => !("email" in row) && !("ip" in row)), "event rows have no email or ip fields");

assert(incrementEventOnce("trial_complete:sub_1", "trial_checkout_completed", "tiktok"), "first complete counts");
assert(
  !incrementEventOnce("trial_complete:sess_1", "trial_checkout_completed", "tiktok", ["trial_complete:sub_1"]),
  "session/subscription aliases do not double-count",
);
const completed = eventCounts().find((row) => row.event === "trial_checkout_completed" && row.day === day);
assert(completed?.count === 1, "completed trial counted once");

addSignup("alex@gmail.com", "94110", {
  ref: null,
  utmSource: "tiktok",
  utmMedium: null,
  utmCampaign: null,
  source: "trial",
});
addSignup("trial.verify.1@example.com", "94110", {
  ref: null,
  utmSource: "tiktok",
  utmMedium: null,
  utmCampaign: null,
  source: "trial",
});
const accounts = accountTrackStats();
assert(accounts.trialSignups === 1, "account trial signup total excludes test emails");

const failed = checks.filter((line) => line.startsWith("FAIL"));
console.log(checks.join("\n"));
fs.rmSync(dir, { recursive: true, force: true });
if (failed.length) {
  console.error(`\n${failed.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll track checks passed");
