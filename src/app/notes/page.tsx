import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { NotesScreen } from "@/components/screens/notes-screen";

export const metadata: Metadata = {
  title: "Notes",
  description:
    "Quick notes saved on your phone: pin the important ones, search everything, color and label them, turn any note into a checklist, and share or copy the text in one tap. No account needed.",
};

export default function NotesPage() {
  return (
    <AppShell>
      <NotesScreen />
    </AppShell>
  );
}
