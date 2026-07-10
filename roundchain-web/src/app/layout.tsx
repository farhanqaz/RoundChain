import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { AbstractBackground } from "@/components/AbstractBackground";
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
    "Trustless ROSCA on Stellar Soroban. Locked collateral, shuffled payout order, n−1 contributors per round, and on-chain trust scores.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "RoundChain — On-Chain ROSCA",
    description:
      "Rotating savings circles with smart-contract rules. Recipient-exempt rounds, fair shuffle, automatic enforcement.",
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
        className={`${geistSans.variable} ${geistMono.variable} page-bg relative flex min-h-screen flex-col font-sans text-foreground antialiased`}
      >
        <AbstractBackground />
        <ThemeProvider>
          <WalletProvider>
            <div className="relative z-10 flex min-h-screen flex-col">
              <Header />
              <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">{children}</main>
              <Footer />
            </div>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
