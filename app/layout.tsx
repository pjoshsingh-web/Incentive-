import "./globals.css";
import "./brand.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Q-Line Trucking | Incentive Builder",
  description:
    "Q-Line Trucking incentive planning for company, division, individual, and annual leadership goals.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
