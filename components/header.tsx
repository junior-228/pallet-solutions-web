import Link from "next/link";

type NavChild = {
  label: string;
  href: string;
  external?: boolean;
};

type NavItem = {
  label: string;
  href: string;
  children: NavChild[] | null;
  external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "SOURCING",
    href: "/sourcing",
    children: [
      { label: "Managed Programs", href: "/sourcing" },
      { label: "Add us to your RFQ", href: "/rfp" },
    ],
  },
  {
    label: "PROCUREMENT",
    href: "/procurement",
    children: [
      { label: "Procurement overview", href: "/procurement" },
      {
        label: "Cost Index",
        href: "/market-pulse",
      },
      {
        label: "Tuesday Read",
        href: "/tuesday-read",
      },
      {
        label: "Methodology",
        href: "/methodology",
      },
    ],
  },
  {
    label: "FIND A VENDOR",
    href: "/find-a-vendor",
    children: null,
  },
  {
    label: "FOR VENDORS",
    href: "/vendors",
    children: null,
  },
  {
    label: "CONTACT",
    href: "/contact",
    children: null,
  },
];

function ChevronDown() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className="ml-1.5 transition-transform duration-200 group-hover:rotate-180"
    >
      <path
        d="M2 4 L5 7 L8 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavItemWithDropdown({ item }: { item: NavItem }) {
  return (
    <div className="group relative">
      <Link
        href={item.href}
        className="flex items-center text-xs font-semibold uppercase tracking-[0.14em] text-ink-700 hover:text-brand-600 transition-colors py-2"
      >
        {item.label}
        <ChevronDown />
      </Link>
      {/* invisible bridge so dropdown doesn't disappear when mouse moves down */}
      <div className="absolute left-0 top-full hidden pt-2 group-hover:block z-20">
        <div className="rounded-lg border border-ink-200 bg-white shadow-lg py-2 min-w-[220px]">
          {item.children!.map((child) =>
            child.external ? (
              <a
                key={child.href}
                href={child.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-5 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-brand-600 transition-colors"
              >
                {child.label}
              </a>
            ) : (
              <Link
                key={child.href}
                href={child.href}
                className="block px-5 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-brand-600 transition-colors"
              >
                {child.label}
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  return (
    <header className="border-b border-ink-200 bg-white relative z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="flex items-center"
          aria-label="Pallet Solutions home"
        >
          {/* Stacked Pallet Solutions lockup, matching palletsolutionsusa.com
              (icon + PALLET / SOLUTIONS wordmark). 48px mobile, 64px desktop -
              same sizing as the marketing-site nav. Asset lives at
              public/pallet-solutions-logo.png. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pallet-solutions-logo.png"
            alt="Pallet Solutions"
            className="h-12 w-auto sm:h-16"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <NavItemWithDropdown key={item.href} item={item} />
            ) : item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700 hover:text-brand-600 transition-colors py-2"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-700 hover:text-brand-600 transition-colors py-2"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <Link
          href="/rfp"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-600 transition-colors"
        >
          Add us to your RFQ
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <nav className="md:hidden border-t border-ink-100 px-6 py-3 flex flex-wrap gap-x-5 gap-y-2 justify-center">
        {NAV_ITEMS.map((item) =>
          item.external ? (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-700 hover:text-brand-600"
            >
              {item.label}
            </a>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-700 hover:text-brand-600"
            >
              {item.label}
            </Link>
          )
        )}
      </nav>
    </header>
  );
}
