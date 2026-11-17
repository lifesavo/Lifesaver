import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:43123";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Your Money Life Saver",
    template: "%s · Your Money Life Saver",
  },
  description:
    "A bill and subscription watchdog plus daily local deals. Catch price hikes, forgotten trials, and unused charges, then see cheaper gas, groceries, and food near you.",
  applicationName: "Your Money Life Saver",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0E4D38",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
