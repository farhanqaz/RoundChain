import Link from "next/link";
import { PlatformFeeNote } from "@/components/PlatformFeeNote";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border transition-colors duration-300">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm space-y-2">
          <p className="font-medium text-foreground">RoundChain</p>
          <p className="text-sm leading-relaxed text-muted">
            On-chain ROSCA on Stellar. Locked collateral, shuffled payout order, contributor-only
            rounds, and portable trust scores.{" "}
            <PlatformFeeNote prefix="" suffix=" fee on payout releases." />
          </p>
        </div>
        <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm sm:gap-x-16">
          <div className="space-y-2">
            <p className="text-muted">Product</p>
            <Link href="/demo" className="block text-muted transition hover:text-foreground">
              Sandbox
            </Link>
            <Link href="/create" className="block text-muted transition hover:text-foreground">
              Create
            </Link>
            <Link href="/circles" className="block text-muted transition hover:text-foreground">
              Circles
            </Link>
          </div>
          <div className="space-y-2">
            <p className="text-muted">Info</p>
            <Link href="/about" className="block text-muted transition hover:text-foreground">
              About
            </Link>
            <a
              href="https://github.com/farhanqaz/RoundChain"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-muted transition hover:text-foreground"
            >
              GitHub
            </a>
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-muted transition hover:text-foreground"
            >
              Stellar
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        Stellar Testnet · © {new Date().getFullYear()} RoundChain
      </div>
    </footer>
  );
}
