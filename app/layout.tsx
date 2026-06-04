import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_DESCRIPTION =
  "Pallet Solutions is a managed pallet sourcing company for multi-DC procurement teams. We run pallet programs end-to-end across multi-facility footprints - sourcing, POs, BOLs, PODs, disputes, core pickup, consolidated invoicing - with cost-input intelligence anchored in publicly-reproducible federal data.";

export const metadata: Metadata = {
  metadataBase: new URL("https://palletsolutionsusa.com"),
  title:
    "Pallet Solutions -Managed pallet sourcing for multi-DC procurement teams",
  description: SITE_DESCRIPTION,
  applicationName: "Pallet Solutions USA",
  authors: [{ name: "Pallet Solutions USA" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://palletsolutionsusa.com",
    siteName: "Pallet Solutions USA",
    title:
      "Pallet Solutions -Managed pallet sourcing for multi-DC procurement teams",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Pallet Solutions -Managed pallet sourcing for multi-DC procurement teams",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
