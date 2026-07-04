import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/providers/ThemeProvider";
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
  title: "RoundChain — On-Chain ROSCA",
  description:
    "Trustless savings circles on Stellar Soroban. Locked collateral, transparent payout order, automatic enforcement, and on-chain trust scores.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "RoundChain — Trustless Savings Circles",
    description: "Run a ROSCA without trusting a treasurer. Smart contracts on Stellar hold the rules.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('roundchain-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d))document.documentElement.classList.add('dark');}catch(e){}})();`}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} page-bg flex min-h-screen flex-col font-sans text-foreground antialiased`}
      >
        <ThemeProvider>
          <WalletProvider>
            <Header />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">{children}</main>
            <Footer />
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
