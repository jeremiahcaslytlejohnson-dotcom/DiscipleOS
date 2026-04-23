import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiscipleOS",
  description: "A system for your daily walk with God.",
  applicationName: "DiscipleOS",
 metadataBase: new URL("https://discipleos.app"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DiscipleOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#09090f] text-white">{children}</body>
    </html>
  );
}