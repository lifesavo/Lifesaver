export const taskCategories = [
  { id: "yard", label: "Yard work" },
  { id: "moving", label: "Moving help" },
  { id: "assembly", label: "Assembly" },
  { id: "cleanup", label: "Cleanup" },
  { id: "errands", label: "Errands" },
] as const;

export type TaskCategory = (typeof taskCategories)[number]["id"];

export type HelperOffer = {
  id: string;
  name: string;
  rating: number;
  jobs: number;
  distance: string;
  price: number;
  eta: string;
  blurb: string;
};

export type PostedTask = {
  id: string;
  category: TaskCategory;
  title: string;
  details: string;
  whenLabel: string;
  zip: string;
  status: "open" | "booked";
  bookedOfferId?: string;
};

const offerPools: Record<TaskCategory, HelperOffer[]> = {
  yard: [
    { id: "yard-maya", name: "Maya R.", rating: 4.9, jobs: 86, distance: "0.4 mi", price: 45, eta: "Today, 4pm", blurb: "Mower in the truck. Front and back." },
    { id: "yard-luis", name: "Luis P.", rating: 4.8, jobs: 54, distance: "0.9 mi", price: 40, eta: "Tomorrow morning", blurb: "Weeding and bagging included." },
    { id: "yard-june", name: "June K.", rating: 5, jobs: 31, distance: "1.2 mi", price: 55, eta: "Saturday", blurb: "Hedges too, if you want them." },
  ],
  moving: [
    { id: "move-andre", name: "Andre T.", rating: 4.9, jobs: 120, distance: "0.6 mi", price: 80, eta: "Today, 6pm", blurb: "Van plus one friend. Stairs are fine." },
    { id: "move-priya", name: "Priya S.", rating: 4.7, jobs: 40, distance: "1.1 mi", price: 70, eta: "Tomorrow", blurb: "Couch and boxes, one trip." },
    { id: "move-noah", name: "Noah L.", rating: 4.8, jobs: 63, distance: "1.5 mi", price: 95, eta: "Sunday", blurb: "Two people, dollies, padding." },
  ],
  assembly: [
    { id: "asm-keiko", name: "Keiko M.", rating: 5, jobs: 77, distance: "0.5 mi", price: 55, eta: "Tonight", blurb: "IKEA and anything with an allen key." },
    { id: "asm-sam", name: "Sam D.", rating: 4.8, jobs: 29, distance: "0.8 mi", price: 48, eta: "Tomorrow afternoon", blurb: "Desk or bed frame, about an hour." },
    { id: "asm-rio", name: "Rio A.", rating: 4.6, jobs: 18, distance: "1.4 mi", price: 60, eta: "Saturday", blurb: "Brings a drill." },
  ],
  cleanup: [
    { id: "clean-hana", name: "Hana V.", rating: 4.9, jobs: 102, distance: "0.3 mi", price: 65, eta: "Today, 3pm", blurb: "Garage or spare room, haul-away extra." },
    { id: "clean-omar", name: "Omar C.", rating: 4.7, jobs: 44, distance: "0.7 mi", price: 50, eta: "Tomorrow", blurb: "Bag, sweep, and stack." },
    { id: "clean-elle", name: "Elle J.", rating: 4.8, jobs: 36, distance: "1.0 mi", price: 70, eta: "Friday", blurb: "Post-party reset." },
  ],
  errands: [
    { id: "err-nico", name: "Nico F.", rating: 4.9, jobs: 91, distance: "0.4 mi", price: 25, eta: "Within 2 hours", blurb: "Pharmacy, post office, or a store run." },
    { id: "err-aisha", name: "Aisha B.", rating: 4.8, jobs: 58, distance: "0.8 mi", price: 30, eta: "This evening", blurb: "Returns and pickups." },
    { id: "err-leo", name: "Leo G.", rating: 4.7, jobs: 22, distance: "1.3 mi", price: 22, eta: "Tomorrow", blurb: "Walking or biking distance." },
  ],
};

export function offersFor(category: TaskCategory) {
  return offerPools[category];
}

export const sampleTask: PostedTask = {
  id: "sample-couch",
  category: "moving",
  title: "Haul a couch to the curb",
  details: "Third-floor walkup. Two people would be better than one.",
  whenLabel: "Saturday morning",
  zip: "94110",
  status: "open",
};
