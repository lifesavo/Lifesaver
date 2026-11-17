import type { Metadata } from "next";
import { StartScreen } from "@/components/screens/start-screen";

export const metadata: Metadata = {
  title: "Get started",
  description: "Sign up with an email, add a ZIP code, and connect sample accounts.",
};

export default function StartPage() {
  return <StartScreen />;
}
