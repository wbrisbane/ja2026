import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Oakwood JA 2026 - DCC Gallery",
  description: "Private photo and video gallery",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.oakwoodclassof2029.com"
  ),
  openGraph: {
    title: "Oakwood JA 2026 - DCC Gallery",
    description: "Private photo and video gallery",
    images: [{ url: "/oakwoodlogo.png", width: 400, height: 400 }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} bg-zinc-950 text-white antialiased min-h-full`}>
        {children}
      </body>
    </html>
  );
}
