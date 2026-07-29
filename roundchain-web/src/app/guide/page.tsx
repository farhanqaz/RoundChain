import Link from "next/link";
import { ExternalDocCard } from "@/components/ExternalDocCard";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { PRODUCT_GUIDE_PDF_URL, PRODUCT_GUIDE_URL } from "@/lib/external-links";

const BEFORE_START = [
  "Install Freighter wallet (browser extension)",
  "Switch to Stellar Testnet",
  "Get test XLM + USDC from the Circle faucet",
];

const STEPS = [
  {
    title: "Create or join",
    items: [
      "Create: set members, amount per round, and round length",
      "Join: open the invite link, connect wallet, deposit collateral",
    ],
  },
  {
    title: "Circle starts",
    items: ["When the circle is full, payout order is shuffled automatically"],
  },
  {
    title: "Each round",
    items: [
      "Scheduled recipient does NOT pay that round",
      "Other members pay into the pot",
      "Wait for the round period to end",
    ],
  },
  {
    title: "Release payout",
    items: [
      "If everyone who must pay has paid, anyone can release the pot to the recipient",
    ],
  },
];

const FAQ = [
  {
    q: "What is RoundChain?",
    a: "Digital arisan (ROSCA). Members save together in rounds. Rules are enforced by a smart contract on Stellar, not by one treasurer.",
  },
  {
    q: "What if someone does not pay?",
    a: "After the period ends, unpaid members can be slashed. Their collateral helps protect the group.",
  },
  {
    q: "What is trust score?",
    a: "+10 when you complete a circle cleanly. −25 if you default and get slashed.",
  },
];

export default function GuidePage() {
  return (
    <PageShell className="mx-auto max-w-2xl space-y-10 pb-12">
      <PageHeader
        backHref="/"
        backLabel="Home"
        label="Guide"
        title="How RoundChain works"
        description="A simple walkthrough for first-time users. Open the full guide for printable docs."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ExternalDocCard
          href={PRODUCT_GUIDE_URL}
          title="Full product guide"
          description="Step-by-step guide with examples on Google Docs."
          buttonLabel="Open guide"
        />
        <ExternalDocCard
          href={PRODUCT_GUIDE_PDF_URL}
          title="Download PDF"
          description="Same guide as a PDF you can save or share offline."
          buttonLabel="Open PDF"
        />
      </div>

      <section className="border border-border bg-card p-6">
        <h2 className="font-medium text-foreground">Before you start</h2>
        <ol className="mt-4 space-y-2 text-sm text-muted">
          {BEFORE_START.map((item, i) => (
            <li key={item} className="flex gap-3">
              <span className="font-mono text-xs text-muted">{i + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="border border-border bg-card p-6">
        <h2 className="font-medium text-foreground">The flow</h2>
        <ol className="mt-4 space-y-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="text-sm">
              <p className="font-medium text-foreground">
                Step {i + 1}: {step.title}
              </p>
              <ul className="mt-2 space-y-1 text-muted">
                {step.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span>·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="border border-border bg-card p-6">
        <h2 className="font-medium text-foreground">FAQ</h2>
        <dl className="mt-4 space-y-4">
          {FAQ.map(({ q, a }) => (
            <div key={q}>
              <dt className="text-sm font-medium text-foreground">{q}</dt>
              <dd className="mt-1 text-sm text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/demo" className="btn-primary text-center">
          Try sandbox
        </Link>
        <Link href="/about" className="btn-secondary text-center">
          About RoundChain
        </Link>
      </div>
    </PageShell>
  );
}
