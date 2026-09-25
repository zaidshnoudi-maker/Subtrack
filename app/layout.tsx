import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./ios.css";
import { TabBar } from "@/components/ios/TabBar";

export const metadata: Metadata = {
  title: "SubTrack",
  description: "All your subscriptions in one place, found automatically in your iCloud Mail.",
  appleWebApp: { capable: true, title: "SubTrack", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
