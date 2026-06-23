import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily High / Low Temperature Predictor",
  description:
    "Predicted daily high and low temperatures for five airport stations, today and tomorrow. Powered by Open-Meteo with a lightweight bias correction.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans text-slate-900 dark:text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
