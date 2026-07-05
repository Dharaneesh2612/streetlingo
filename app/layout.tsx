import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreetLingo — Understand any sign, anywhere",
  description: "Translate street signs and text into Tamil, Hindi, Telugu, Malayalam and more using AI.",
  openGraph: { title: "StreetLingo", description: "Understand any sign, anywhere", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <Link href="/" className="nav-brand">
            <span className="nav-brand-icon">⬡</span>
            StreetLingo
          </Link>
          <div className="nav-links">
            <Link href="/translate"     className="nav-link">Translate</Link>
            <Link href="/transliterate" className="nav-link">Transliterate</Link>
            <Link href="/scan"          className="nav-link">Scan Sign</Link>
            <Link href="/history"       className="nav-link">History</Link>
          </div>
          <Link href="/translate" className="btn btn--primary nav-cta">
            Start Translating
          </Link>
        </nav>
        <div className="page-wrapper">{children}</div>
        <footer className="site-footer">
          Built with Next.js · <strong style={{ color: "var(--accent)" }}>Tech Busters</strong>
        </footer>
      </body>
    </html>
  );
}
