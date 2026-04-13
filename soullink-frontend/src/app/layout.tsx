import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SoulLink | Authentic Connections",
  description: "A platform for meaningful human connections.",
};

import { Shell } from "@/components/layout/Shell";
import { NovaProvider } from "@/context/NovaContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <NovaProvider>
          {children}
        </NovaProvider>
      </body>
    </html>
  );
}
