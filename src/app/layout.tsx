import type { Metadata, Viewport } from "next";
import { Fredoka, Outfit } from "next/font/google";
import { AskLifeSaver } from "@/components/ask-lifesaver";
import { Providers } from "@/components/providers";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:43123";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LifeSaver",
    template: "%s · LifeSaver",
  },
  description: "Stop getting robbed by your bills. Save money without trying.",
  applicationName: "LifeSaver",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "LifeSaver",
    description: "Stop getting robbed by your bills. Save money without trying.",
    siteName: "LifeSaver",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "LifeSaver",
    description: "Stop getting robbed by your bills. Save money without trying.",
  },
};

export const viewport: Viewport = {
  themeColor: "#E01470",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>
          {children}
          <AskLifeSaver />
        </Providers>
      </body>
    </html>
  );
}
