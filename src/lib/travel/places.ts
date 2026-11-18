export type Airport = { code: string; city: string; lat: number; lng: number };

const airports: Airport[] = [
  { code: "SFO", city: "San Francisco", lat: 37.6213, lng: -122.379 },
  { code: "OAK", city: "Oakland", lat: 37.7126, lng: -122.2197 },
  { code: "SJC", city: "San Jose", lat: 37.3639, lng: -121.9289 },
  { code: "LAX", city: "Los Angeles", lat: 33.9416, lng: -118.4085 },
  { code: "SAN", city: "San Diego", lat: 32.7338, lng: -117.1933 },
  { code: "SEA", city: "Seattle", lat: 47.4502, lng: -122.3088 },
  { code: "PDX", city: "Portland", lat: 45.5898, lng: -122.5951 },
  { code: "LAS", city: "Las Vegas", lat: 36.084, lng: -115.1537 },
  { code: "PHX", city: "Phoenix", lat: 33.4373, lng: -112.0078 },
  { code: "DEN", city: "Denver", lat: 39.8561, lng: -104.6737 },
  { code: "AUS", city: "Austin", lat: 30.1975, lng: -97.6664 },
  { code: "DFW", city: "Dallas", lat: 32.8998, lng: -97.0403 },
  { code: "IAH", city: "Houston", lat: 29.99, lng: -95.3368 },
  { code: "ORD", city: "Chicago", lat: 41.9742, lng: -87.9073 },
  { code: "ATL", city: "Atlanta", lat: 33.6407, lng: -84.4277 },
  { code: "MIA", city: "Miami", lat: 25.7959, lng: -80.287 },
  { code: "MCO", city: "Orlando", lat: 28.4312, lng: -81.3081 },
  { code: "BOS", city: "Boston", lat: 42.3656, lng: -71.0096 },
  { code: "JFK", city: "New York", lat: 40.6413, lng: -73.7781 },
  { code: "EWR", city: "Newark", lat: 40.6895, lng: -74.1745 },
  { code: "DCA", city: "Washington", lat: 38.8512, lng: -77.0402 },
  { code: "HNL", city: "Honolulu", lat: 21.3187, lng: -157.9225 },
];

export function resolvePlace(input: string): Airport | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const code = trimmed.toUpperCase();
  const byCode = airports.find((airport) => airport.code === code);
  if (byCode) return byCode;
  const lower = trimmed.toLowerCase();
  return (
    airports.find(
      (airport) => airport.city.toLowerCase() === lower || lower.includes(airport.city.toLowerCase()),
    ) ?? null
  );
}

export function haversineMiles(a: Airport, b: Airport) {
  const r = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}
