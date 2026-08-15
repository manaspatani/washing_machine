import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Washing Machine Booking — Mewad Jain Hostel",
  description:
    "Book washing machine slots for Mewad Jain Hostel. Simple, fast, mobile-friendly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧺</text></svg>" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "Inter, sans-serif",
              fontSize: "0.875rem",
              fontWeight: "500",
              borderRadius: "10px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            },
          }}
        />
      </body>
    </html>
  );
}
