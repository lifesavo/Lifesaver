export function money(amount: number) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function areaLabel(zip: string) {
  const known: Record<string, string> = {
    "94110": "the Mission, San Francisco",
    "94103": "SoMa, San Francisco",
    "10001": "Chelsea, New York",
    "11201": "Brooklyn Heights",
    "90210": "Beverly Hills",
    "60611": "Streeterville, Chicago",
    "78701": "downtown Austin",
    "98101": "downtown Seattle",
    "02139": "Cambridge",
    "30308": "Midtown Atlanta",
  };
  return known[zip] ?? `ZIP ${zip}`;
}
