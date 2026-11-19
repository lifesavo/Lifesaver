import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { SplitScreen } from "@/components/screens/split-screen";

export const metadata: Metadata = {
  title: "Tip & split",
  description:
    "Work out the tip and split a check evenly or by what each person ordered, with tax and tip shared fairly. Free, no sign-up, nothing leaves your phone.",
};

export default function SplitPage() {
  return (
    <AppShell>
      <SplitScreen />
    </AppShell>
  );
}
