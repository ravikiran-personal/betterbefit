import type { Metadata } from "next";
import "./globals.css";
import PWARegister from "../components/pwa-register";
export const metadata: Metadata = {
  title: "Recomp Tracker",
  description: "Private recomposition tracker for training, meals, steps, cardio, and weekly adjustments.",
  appleWebApp: {
    capable: true,
    title: "Recomp Tracker",
    statusBarStyle: "default"
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
