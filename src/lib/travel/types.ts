export type TripQuery = {
  from: string;
  to: string;
  depart: string;
  returnDate: string;
  travelers: number;
};

export type PriceKind = "live" | "sample";

export type TravelOption = {
  id: string;
  kind: "flight" | "stay" | "car";
  provider: string;
  title: string;
  detail: string;
  amount: number | null;
  priceKind: PriceKind;
  href: string;
};

export type DriveEstimate = {
  miles: number | null;
  fuelCost: number | null;
  flightCost: number | null;
  flightKind: PriceKind | null;
  note: string;
  href: string;
};

export type TravelSearch = {
  liveConnected: boolean;
  notice: string;
  flights: TravelOption[];
  stays: TravelOption[];
  cars: TravelOption[];
  drive: DriveEstimate;
};
