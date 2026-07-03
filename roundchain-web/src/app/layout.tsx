import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WalletProvider } from "@/providers/WalletProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "RoundChain — Arisan Digital",
  description:
    "Kelola arisan dengan kontrak pintar Stellar. Jaminan terkunci, giliran transparan, enforcement otomatis.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "RoundChain — Arisan Digital Aman",
    description: "Arisan tanpa takut bendahara lari. Dijamin kontrak pintar Stellar.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} page-bg flex min-h-screen flex-col font-sans text-slate-100 antialiased`}
      >
        <WalletProvider>
          <Header />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">{children}</main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
