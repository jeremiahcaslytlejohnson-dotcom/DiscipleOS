import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiscipleOS",
  description: "A system for your daily walk with God.",
  applicationName: "DiscipleOS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DiscipleOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}