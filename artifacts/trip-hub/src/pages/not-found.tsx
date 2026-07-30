import { Link, useLocation } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 p-6">
      <div className="text-center space-y-4">
        <h1 className="font-display text-4xl text-ink-950">404</h1>
        <p className="text-ink-700">Lost on the island?</p>
        <Link href="/" className="inline-block mt-4 px-6 py-3 bg-lagoon-600 text-white font-bold rounded-xl tap">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
