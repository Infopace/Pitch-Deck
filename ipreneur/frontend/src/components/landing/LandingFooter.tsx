/**
 * Landing page footer.
 *
 * Only links to pages that actually exist (see App.tsx's route list) or to
 * real anchors on this same page. No Privacy Policy, Terms of Service, Help
 * Center or Contact page exists yet, so none are linked here — a footer link
 * to a page that 404s is its own small broken promise, on a page whose whole
 * point is not making promises the product doesn't keep.
 */
import { Link } from "react-router-dom";
import { MintLogo } from "@/components/brand/MintLogo";

const PRODUCT_LINKS = [
  { label: "Live deck", href: "#showcase" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Designs", href: "#designs" },
  { label: "Why Mint", href: "#why-mint" },
  { label: "FAQ", href: "#faq" },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <MintLogo variant={1} height={28} textColor="#0F172A" />
            <p className="l-body mt-3 max-w-[32ch] text-[13px] leading-relaxed">
              Turn a website into a structured, editable pitch deck — researched,
              checked and ready to send.
            </p>
          </div>

          <div>
            <div className="l-meta mb-4 text-[11px] uppercase tracking-[0.07em]">Product</div>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="l-body text-[13px] no-underline hover:text-slate-900">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="l-meta mb-4 text-[11px] uppercase tracking-[0.07em]">Account</div>
            <ul className="space-y-2.5">
              <li>
                <Link to="/register" className="l-body text-[13px] no-underline hover:text-slate-900">
                  Create a deck
                </Link>
              </li>
              <li>
                <Link to="/login" className="l-body text-[13px] no-underline hover:text-slate-900">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200/80 pt-6">
          <p className="l-meta text-[12px]">© {new Date().getFullYear()} Mint, a product of Infopace.</p>
        </div>
      </div>
    </footer>
  );
}
