import { ShareCard, shareContentType, shareSize } from "@/lib/share-card";

export const alt = "LifeSaver. Stop getting robbed by your bills.";
export const size = shareSize;
export const contentType = shareContentType;

export default function OpenGraphImage() {
  return ShareCard();
}
