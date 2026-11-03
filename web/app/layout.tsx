import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoPilot Marketing OS",
  description: "AI lead capture and follow-up for home services businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
