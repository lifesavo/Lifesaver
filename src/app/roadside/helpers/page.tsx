import { redirect } from "next/navigation";

export default function RoadsideHelpersPage() {
  redirect("/helpers?type=roadside");
}
