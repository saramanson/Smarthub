import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Rewards & Calendar",
  description: "A premium family dashboard for rewards, points, and calendar planning."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
