import Link from "next/link";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

type FooterColumn = {
  heading: string;
  links: FooterLink[];
};

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Sourcing",
    links: [
      { label: "Managed Programs", href: "/sourcing" },
      { label: "Add us to your RFQ", href: "/rfp" },
    ],
  },
  {
    heading: "Procurement",
    links: [
      { label: "Procurement overview", href: "/procurement" },
      {
        label: "What's moving",
        href: "/market-pulse",
      },
      {
        label: "Tuesday Read",
        href: "/tuesday-read",
      },
      {
        label: "PSCI cost index",
        href: "/psci",
      },
      {
        label: "Methodology",
        href: "/methodology",
      },
      {
        label: "Find a Vendor",
        href: "/find-a-vendor",
      },
    ],
  },
  {
    heading: "For Vendors",
    links: [
      { label: "Claim your listing", href: "/vendors" },
      // Tuesday Report (paid VENDOR brief) -- distinct from Tuesday Read
      // (free BUYER email) in the Procurement column above. Added
      // 2026-06-02 for discoverability. Do NOT repoint Tuesday Read here:
      // two products, two pages, two footer links.
      { label: "Tuesday Report", href: "/tuesday-report" },
      {
        label: "Find your listing on the map",
        href: "https://network.palletsolutionsusa.com",
        external: true,
      },
    ],
  },
  {
    heading: "Company",
    links: [
      {
        label: "About",
        href: "https://palletsolutionsusa.com/about",
        external: true,
      },
      { label: "Contact", href: "/contact" },
      {
        label: "Security",
        href: "https://palletsolutionsusa.com/security",
        external: true,
      },
      {
        label: "Privacy",
        href: "https://palletsolutionsusa.com/privacy",
        external: true,
      },
    ],
  },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-ink-600 hover:text-brand-600 transition-colors"
      >
        {link.label}
      </a>
    );
  }
  return (
    <Link
      href={link.href}
      className="text-sm text-ink-600 hover:text-brand-600 transition-colors"
    >
      {link.label}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-ink-50">
      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Top: tagline + contact */}
        <div className="grid gap-10 lg:grid-cols-[1.5fr_2.5fr]">
          <div>
            <Link
              href="/"
              className="flex flex-col leading-tight"
              aria-label="Pallet Solutions home"
            >
              <span className="text-base font-semibold tracking-tight text-ink-900">
                Pallet Solutions
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-brand-500">
                USA
              </span>
            </Link>
            <p className="mt-5 text-sm text-ink-700 leading-relaxed max-w-sm">
              Multi-location pallet procurement, anchored in publicly-
              reproducible federal data.
            </p>
            <div className="mt-5 text-sm text-ink-700 space-y-1">
              <p>
                <a
                  href="mailto:info@palletsolutionsusa.com"
                  className="hover:text-brand-600 transition-colors"
                >
                  info@palletsolutionsusa.com
                </a>
              </p>
              <p>
                <a
                  href="tel:19518210364"
                  className="hover:text-brand-600 transition-colors"
                >
                  951-821-0364
                </a>
              </p>
            </div>
          </div>

          {/* 4-column nav grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-900">
                  {col.heading}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <FooterLinkItem link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Legal + fraud notice */}
        <div className="mt-14 pt-8 border-t border-ink-200 space-y-3">
          <p className="text-xs text-ink-600">
            © 2026 Pallet Solutions USA · Seaford, DE
          </p>
          <p className="text-xs italic text-ink-600">
            Our office never makes changes to wire or ACH transactions via
            email.
          </p>
          <p className="text-[11px] leading-relaxed text-ink-500 max-w-3xl pt-2">
            PSCI™, Pallet Solutions Cost Index™, PSPI™, and Pallet Solutions
            Pressure Index™ are trademarks of Pallet Solutions USA. Federal
            trademark applications pending with USPTO.
          </p>
        </div>
      </div>
    </footer>
  );
}
