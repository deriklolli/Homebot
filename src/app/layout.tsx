import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HOMEBOT – Home Management",
  description: "Track home projects, contractors, and home inventory.",
};

export const viewport: Viewport = {
  themeColor: "#FF692D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="flex h-dvh overflow-hidden">
          <Sidebar />
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
