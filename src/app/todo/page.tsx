import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { TodoScreen } from "@/components/screens/todo-screen";

export const metadata: Metadata = {
  title: "To-do & reminders",
  description:
    "A simple to-do list with due dates, repeating tasks, and reminders that drop into your phone's calendar. Free, no sign-up, saved on your phone.",
};

export default function TodoPage() {
  return (
    <AppShell>
      <TodoScreen />
    </AppShell>
  );
}
