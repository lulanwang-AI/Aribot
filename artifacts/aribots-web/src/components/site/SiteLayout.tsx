import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Mail, Menu, MessageSquare, Phone, X } from "lucide-react";
import aribotLogoPath from "@assets/aribot-mark-primary-1024_1777274279204.png";
import { ComplianceBadges } from "./ComplianceBadges";

export const CONTACT_URL = "https://www.aribots.com/contact-8";
export const CONTACT_PHONE = { display: "415.228.9933", href: "tel:4152289933" };
export const CONTACT_EMAIL = "info@aribots.com";

export const PRODUCT_LINKS = [
  { label: "ARIbots AI", href: "/products/aribots", blurb: "Clinical intelligence and the physician community" },
  { label: "Ari AMR", href: "/products/ari-amr", blurb: "Antimicrobial stewardship workspace" },
  { label: "Ari EMR", href: "/products/ari-emr", blurb: "The longitudinal patient record" },
] as const;

const PRIMARY_LINKS = [
  { label: "Platform", href: "/platform" },
  { label: "Mobile", href: "/mobile" },
  { label: "Security", href: "/security" },
  { label: "About", href: "/about" },
  { label: "Whitepaper", href: "/whitepaper" },
] as const;

const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/aribots", label: "Facebook", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
  { href: "https://www.twitter.com/aribots", label: "Twitter / X", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  { href: "https://www.linkedin.com/company/aribots", label: "LinkedIn", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
  { href: "https://www.instagram.com/aribots", label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
] as const;

/** Sets the document title and description for a public page. */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute("content", description);
  }, [title, description]);
}

function isActive(location: string, href: string) {
  return location === href || location.startsWith(`${href}/`);
}

export function SiteHeader({ loginHref = "/sign-in" }: { loginHref?: string }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const productsActive = location.startsWith("/products") || location === "/ari-amr" || location === "/amr";

  useEffect(() => {
    setMobileOpen(false);
    setProductsOpen(false);
  }, [location]);

  const linkClass = (active: boolean) =>
    `text-sm transition-colors ${active ? "text-white font-semibold" : "text-white/80 hover:text-[#4A90D9]"}`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#111]/90 backdrop-blur-md border-b border-white/10" data-testid="site-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3" data-testid="link-navbar-logo">
          <img src={aribotLogoPath} alt="ARIbots" className="h-9 w-9 rounded object-contain" />
          <span className="text-white font-semibold tracking-tight hidden sm:inline">ARIbots</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          <div
            className="relative"
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
          >
            <button
              type="button"
              onClick={() => setProductsOpen((v) => !v)}
              aria-expanded={productsOpen}
              className={`${linkClass(productsActive)} inline-flex items-center gap-1`}
              data-testid="link-nav-products"
            >
              Products
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${productsOpen ? "rotate-180" : ""}`} />
            </button>
            {productsOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3" data-testid="menu-products">
                <div className="w-80 rounded-2xl border border-white/10 bg-[#141a21] p-2 shadow-2xl">
                  {PRODUCT_LINKS.map((p) => (
                    <Link
                      key={p.href}
                      href={p.href}
                      className={`block rounded-xl px-4 py-3 transition-colors hover:bg-white/5 ${isActive(location, p.href) ? "bg-white/5" : ""}`}
                      data-testid={`link-nav-${p.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className="text-sm font-semibold text-white">{p.label}</div>
                      <div className="text-xs text-white/50 mt-0.5">{p.blurb}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {PRIMARY_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={linkClass(isActive(location, l.href))}
              data-testid={`link-nav-${l.label.toLowerCase()}`}
            >
              {l.label}
            </Link>
          ))}
          <Link href={loginHref} className={linkClass(false)} data-testid="link-nav-login">
            Sign in
          </Link>
          <Link
            href="/request-demo"
            className="text-sm font-semibold px-5 py-2 bg-[#4A90D9] text-white rounded-full hover:bg-[#5BA0E9] transition-colors"
            data-testid="link-nav-request-demo"
          >
            Request a demo
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-3">
          <Link
            href="/request-demo"
            className="text-xs font-semibold px-4 py-1.5 bg-[#4A90D9] text-white rounded-full hover:bg-[#5BA0E9] transition-colors"
            data-testid="link-mobile-request-demo"
          >
            Request demo
          </Link>
          <button
            type="button"
            className="text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#111]/95 border-t border-white/10 px-4 pb-4" data-testid="menu-mobile">
          <p className="pt-3 pb-1 text-[10px] uppercase tracking-widest text-white/40 font-semibold">Products</p>
          {PRODUCT_LINKS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="block py-2.5 pl-3 text-white/80 hover:text-[#4A90D9] transition-colors text-sm"
              data-testid={`link-mobile-${p.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {p.label}
            </Link>
          ))}
          <div className="my-2 h-px bg-white/10" />
          {PRIMARY_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-2.5 text-white/80 hover:text-[#4A90D9] transition-colors text-sm"
              data-testid={`link-mobile-${l.label.toLowerCase()}`}
            >
              {l.label}
            </Link>
          ))}
          <Link href={loginHref} className="block py-2.5 text-white/80 hover:text-[#4A90D9] transition-colors text-sm" data-testid="link-mobile-login">
            Sign in
          </Link>
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block py-2.5 text-white/80 hover:text-[#4A90D9] transition-colors text-sm"
            data-testid="link-mobile-contact"
          >
            Contact
          </a>
        </div>
      )}
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[#0b0f14] border-t border-white/8 py-14" data-testid="site-footer">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={aribotLogoPath} alt="ARIbots" className="h-8 w-8 rounded object-contain" />
              <span className="text-white font-semibold text-lg">ARI bots</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              A connected clinical infrastructure layer for the people and systems that carry care forward.
            </p>
            <Link href="/security" className="mt-5 inline-block text-white/70 hover:text-white transition-colors" data-testid="link-footer-compliance">
              <ComplianceBadges size="sm" />
            </Link>
          </div>

          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-widest font-semibold mb-4">Products</h4>
            <ul className="space-y-2">
              {[...PRODUCT_LINKS, { label: "Mobile apps", href: "/mobile" }].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/40 hover:text-[#4A90D9] text-sm transition-colors" data-testid={`link-footer-${item.href.replace(/\//g, "-").slice(1)}`}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-widest font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {[
                { label: "Platform", href: "/platform" },
                { label: "Security & compliance", href: "/security" },
                { label: "About & team", href: "/about" },
                { label: "Whitepaper", href: "/whitepaper" },
                { label: "Request a demo", href: "/request-demo" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/40 hover:text-[#4A90D9] text-sm transition-colors" data-testid={`link-footer-${item.href.slice(1)}`}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-widest font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 mb-5">
              <li className="flex items-center gap-2 text-white/50 text-sm">
                <Phone className="w-3.5 h-3.5 text-[#4A90D9] shrink-0" />
                <a href={CONTACT_PHONE.href} className="hover:text-[#4A90D9] transition-colors">{CONTACT_PHONE.display}</a>
              </li>
              <li className="flex items-center gap-2 text-white/50 text-sm">
                <Mail className="w-3.5 h-3.5 text-[#4A90D9] shrink-0" />
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-[#4A90D9] transition-colors">{CONTACT_EMAIL}</a>
              </li>
            </ul>
            <div className="flex items-center gap-3 mb-5">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#4A90D9]/20 hover:border-[#4A90D9]/40 transition-colors group"
                  data-testid={`link-social-${s.label.toLowerCase().split(" ")[0]}`}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white/40 group-hover:fill-[#4A90D9] transition-colors">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4A90D9]/10 border border-[#4A90D9]/30 text-[#4A90D9] text-xs font-medium hover:bg-[#4A90D9]/20 transition-colors"
              data-testid="link-footer-contact"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Send Us a Message
            </a>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} ARI bots. All rights reserved. Clinical context, connected.
          </p>
          <p className="text-white/30 text-xs">
            HIPAA compliant · SOC 2 compliant ·{" "}
            <Link href="/security" className="hover:text-white/60 transition-colors">How we protect clinical data</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

export type SiteTheme = "landing" | "dark" | "amr";

const THEME_CLASS: Record<SiteTheme, string> = {
  // The editorial light system the marketing sections were designed against.
  landing: "landing-shell min-h-screen",
  // Long-form reading surface (whitepaper).
  dark: "min-h-screen bg-[#0e1117] text-white",
  // The stewardship product page keeps its own token-driven dark theme.
  amr: "amr-public-theme dark min-h-screen bg-background text-foreground",
};

/**
 * Shell for every public page: fixed header, footer, page metadata, and
 * scroll-to-top on navigation (or to the hash target when there is one).
 */
export function SiteLayout({
  title,
  description,
  theme = "landing",
  loginHref,
  children,
}: {
  title: string;
  description: string;
  theme?: SiteTheme;
  loginHref?: string;
  children: ReactNode;
}) {
  const [location] = useLocation();
  usePageMeta(title, description);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    const frame = requestAnimationFrame(() => {
      if (id && document.getElementById(id)) {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location]);

  return (
    <div className={THEME_CLASS[theme]}>
      <SiteHeader loginHref={loginHref} />
      <main className="pt-16">{children}</main>
      <SiteFooter />
    </div>
  );
}
