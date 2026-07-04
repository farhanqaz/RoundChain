import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="section-label">404</p>
      <h1 className="mt-2 text-2xl font-medium text-foreground">Page not found</h1>
      <p className="mt-3 max-w-md text-muted">
        The circle or page you are looking for does not exist. Check the circle ID or return home.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-primary px-6">
          Home
        </Link>
        <Link href="/circles" className="btn-secondary px-6">
          Browse circles
        </Link>
      </div>
    </div>
  );
}
