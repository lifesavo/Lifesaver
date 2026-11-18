export type Metro = {
  id: string;
  name: string;
  prefixes: string[];
};

/** Top US metros. No event details live here. Real nights are posted by an admin. */
export const metros: Metro[] = [
  { id: "nyc", name: "New York", prefixes: ["100", "101", "102", "103", "104", "111", "112", "113", "114"] },
  { id: "la", name: "Los Angeles", prefixes: ["900", "901", "902", "903", "904", "905", "906", "907", "908", "910", "911", "912", "913", "914", "915", "916"] },
  { id: "chicago", name: "Chicago", prefixes: ["606"] },
  { id: "houston", name: "Houston", prefixes: ["770", "772", "773", "774", "775"] },
  { id: "phoenix", name: "Phoenix", prefixes: ["850", "851", "852", "853"] },
  { id: "dallas", name: "Dallas", prefixes: ["750", "751", "752", "753"] },
  { id: "atlanta", name: "Atlanta", prefixes: ["303"] },
  { id: "miami", name: "Miami", prefixes: ["331", "332", "333"] },
  { id: "kc", name: "Kansas City", prefixes: ["641", "661"] },
  { id: "philadelphia", name: "Philadelphia", prefixes: ["191"] },
  { id: "sf", name: "San Francisco", prefixes: ["941"] },
  { id: "seattle", name: "Seattle", prefixes: ["981"] },
  { id: "boston", name: "Boston", prefixes: ["021", "022"] },
  { id: "denver", name: "Denver", prefixes: ["802"] },
  { id: "dc", name: "Washington", prefixes: ["200", "202"] },
  { id: "austin", name: "Austin", prefixes: ["787"] },
];

export function metroForZip(zip: string): Metro | null {
  if (!/^\d{5}$/.test(zip)) return null;
  return metros.find((metro) => metro.prefixes.some((prefix) => zip.startsWith(prefix))) ?? null;
}
