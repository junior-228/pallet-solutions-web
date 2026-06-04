"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";

// Animated FAQ accordion - smooth expand/collapse (grid-template-rows 0fr->1fr,
// no JS height measuring, no layout jump) with the +/x toggle rotating open.
// Rows also stagger in on scroll (shared reveal engine), once. Each row is
// independent (multiple can be open). Reduced-motion: instant, fully visible.

type Item = {
  q: string;
  a: string;
  link?: { label: string; href: string };
};

function FaqRow({ item, index }: { item: Item; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="reveal-item border-b border-ink-200 first:border-t first:border-t-ink-200"
      style={{ "--i": index } as CSSProperties}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start justify-between gap-6 py-6 text-left"
      >
        <span className="text-xl font-semibold text-ink-900 transition-colors hover:text-brand-700">
          {item.q}
        </span>
        <span
          aria-hidden="true"
          className={`mt-1 shrink-0 text-2xl leading-none transition-transform duration-300 ${
            open ? "rotate-45 text-brand-500" : "text-ink-500"
          }`}
        >
          +
        </span>
      </button>
      <div className="faq-acc__panel" data-open={open}>
        <div className="overflow-hidden">
          <div className="pb-6">
            <p className="text-base leading-relaxed text-ink-700">{item.a}</p>
            {item.link && (
              <Link
                href={item.link.href}
                className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
              >
                {item.link.label}
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FaqAccordion({
  items,
  className = "mt-12",
}: {
  items: Item[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setArmed(true);
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${armed ? "reveal--armed" : ""} ${
        inView ? "reveal--in" : ""
      } ${className}`}
    >
      {items.map((item, i) => (
        <FaqRow key={i} item={item} index={i} />
      ))}
    </div>
  );
}
