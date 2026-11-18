import { redirect } from "next/navigation";

// The old odd-job preview used example helpers. Real requests live at /help.
export default function HandPage() {
  redirect("/help");
}
