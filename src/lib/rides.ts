export const sampleTrip = {
  fromLabel: "Near you",
  toLabel: "Downtown",
  pickup: { latitude: 37.7597, longitude: -122.4187 },
  dropoff: { latitude: 37.7879, longitude: -122.4075, nickname: "Downtown" },
};

export type RideOption = {
  id: string;
  name: string;
  kind: "ride" | "delivery";
  price: number;
  detail: string;
  href: string;
};

function uberRide() {
  const { pickup, dropoff } = sampleTrip;
  const params = new URLSearchParams({
    action: "setPickup",
    "pickup[latitude]": String(pickup.latitude),
    "pickup[longitude]": String(pickup.longitude),
    "dropoff[latitude]": String(dropoff.latitude),
    "dropoff[longitude]": String(dropoff.longitude),
    "dropoff[nickname]": dropoff.nickname,
  });
  return `https://m.uber.com/ul/?${params.toString()}`;
}

function lyftRide() {
  const { pickup, dropoff } = sampleTrip;
  const params = new URLSearchParams({
    id: "lyft",
    "pickup[latitude]": String(pickup.latitude),
    "pickup[longitude]": String(pickup.longitude),
    "destination[latitude]": String(dropoff.latitude),
    "destination[longitude]": String(dropoff.longitude),
  });
  return `https://lyft.com/ride?${params.toString()}`;
}

export const rideOptions: RideOption[] = [
  {
    id: "uber",
    name: "Uber",
    kind: "ride",
    price: 18.4,
    detail: "Sample pickup in 6 min",
    href: uberRide(),
  },
  {
    id: "lyft",
    name: "Lyft",
    kind: "ride",
    price: 16.2,
    detail: "Sample pickup in 8 min",
    href: lyftRide(),
  },
];

export const deliveryOptions: RideOption[] = [
  {
    id: "ubereats",
    name: "Uber Eats",
    kind: "delivery",
    price: 3.99,
    detail: "Sample delivery fee",
    href: "https://www.ubereats.com/",
  },
  {
    id: "doordash",
    name: "DoorDash",
    kind: "delivery",
    price: 2.49,
    detail: "Sample delivery fee",
    href: "https://www.doordash.com/",
  },
];

export function cheapest(options: RideOption[]) {
  return options.reduce((best, option) => (option.price < best.price ? option : best));
}
