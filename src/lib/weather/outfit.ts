/** Weather types and outfit rules. Pure, safe for server and browser. */

export type WeatherReport = {
  place: string;
  lat: number;
  lng: number;
  timezone: string;
  observedAt: string;
  current: { temp: number; feelsLike: number; code: number; wind: number; precip: number; snowfall: number };
  today: { high: number; low: number; code: number; precipChance: number; precipInches: number; snowInches: number; windMax: number };
  source: string;
};

export type OutfitPick = { slot: "top" | "bottom" | "shoes" | "extra"; label: string; emoji: string; why: string };

export type Outfit = { summary: string; condition: string; picks: OutfitPick[] };

export function conditionFor(code: number): { word: string; emoji: string } {
  if (code === 0) return { word: "sunny", emoji: "☀️" };
  if (code === 1 || code === 2) return { word: "partly cloudy", emoji: "⛅" };
  if (code === 3) return { word: "cloudy", emoji: "☁️" };
  if (code === 45 || code === 48) return { word: "foggy", emoji: "🌫️" };
  if (code >= 51 && code <= 57) return { word: "drizzly", emoji: "🌦️" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { word: "rainy", emoji: "🌧️" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { word: "snowy", emoji: "❄️" };
  if (code >= 95) return { word: "stormy", emoji: "⛈️" };
  return { word: "mixed", emoji: "🌤️" };
}

const isSnowCode = (code: number) => (code >= 71 && code <= 77) || code === 85 || code === 86;
const isRainCode = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function pickOutfit(report: WeatherReport): Outfit {
  const { today, current } = report;
  const high = Math.round(today.high);
  const low = Math.round(today.low);
  const coldest = Math.min(low, current.feelsLike);
  const snowy = today.snowInches >= 0.2 || isSnowCode(today.code) || current.snowfall > 0;
  const rainy = !snowy && (today.precipChance >= 50 || today.precipInches >= 0.15 || isRainCode(today.code) || current.precip > 0);
  const maybeRain = !snowy && !rainy && today.precipChance >= 30;
  const windy = today.windMax >= 20;
  const sunny = today.code <= 1;

  let top: OutfitPick;
  if (high < 35 || coldest < 25) top = { slot: "top", label: "Winter coat", emoji: "🧥", why: `Low of ${low}°F. Layer up.` };
  else if (high < 50) top = { slot: "top", label: "Jacket", emoji: "🧥", why: `Only ${high}°F at the warmest.` };
  else if (high < 62) top = { slot: "top", label: "Hoodie", emoji: "🧶", why: `Cool day, high of ${high}°F.` };
  else if (low < 55) top = { slot: "top", label: "T-shirt + a hoodie", emoji: "👕", why: `${low}°F this morning, ${high}°F later. Bring the layer.` };
  else top = { slot: "top", label: "T-shirt", emoji: "👕", why: `Warm, up to ${high}°F.` };
  if (rainy && high >= 50) top = { ...top, label: high >= 70 ? "T-shirt + rain jacket" : "Rain jacket", emoji: "🧥", why: `${top.why} Rain likely.` };

  const bottom: OutfitPick =
    high >= 75 && !rainy && !snowy
      ? { slot: "bottom", label: "Shorts", emoji: "🩳", why: "Warm and dry enough." }
      : { slot: "bottom", label: "Pants", emoji: "👖", why: high >= 75 ? "Wet weather today, so skip the shorts." : "Too cool for shorts." };

  let shoes: OutfitPick;
  if (snowy) shoes = { slot: "shoes", label: "Snow boots", emoji: "🥾", why: today.snowInches > 0 ? `About ${today.snowInches.toFixed(1)} in of snow forecast.` : "Snow in the forecast." };
  else if (rainy) shoes = { slot: "shoes", label: "Rain boots", emoji: "👢", why: `${today.precipChance}% chance of rain.` };
  else if (high >= 80) shoes = { slot: "shoes", label: "Sandals", emoji: "🩴", why: "Hot and dry." };
  else shoes = { slot: "shoes", label: "Sneakers", emoji: "👟", why: "Dry ground." };

  const extras: OutfitPick[] = [];
  if (rainy || maybeRain) extras.push({ slot: "extra", label: "Umbrella", emoji: "☂️", why: `${today.precipChance}% chance of rain.` });
  if (coldest < 35 || snowy) extras.push({ slot: "extra", label: "Hat and gloves", emoji: "🧤", why: `Feels like ${Math.round(coldest)}°F at the coldest.` });
  if (high >= 85 && sunny) extras.push({ slot: "extra", label: "Sun hat and sunscreen", emoji: "🧢", why: "Strong sun." });
  if (windy) extras.push({ slot: "extra", label: "Windbreaker", emoji: "💨", why: `Gusty, winds up to ${Math.round(today.windMax)} mph.` });

  const condition = conditionFor(today.code).word;
  const wearsTop = !/^T-shirt$/.test(top.label);
  const parts = wearsTop ? [top.label.replace(/^T-shirt \+ /, ""), bottom.label.toLowerCase(), shoes.label.toLowerCase()] : [bottom.label, shoes.label.toLowerCase()];
  const list = parts.length === 3 ? `${cap(parts[0].toLowerCase())}, ${parts[1]}, and ${parts[2]}` : `${parts[0]} and ${parts[1]}`;
  const extra = extras[0] ? ` Bring ${`a${/^[aeiou]/i.test(extras[0].label) ? "n" : ""} ${extras[0].label.toLowerCase()}`}.` : "";
  const summary = `${list} today, ${high}°F and ${condition}.${extra}`;

  return { summary, condition, picks: [top, bottom, shoes, ...extras] };
}
