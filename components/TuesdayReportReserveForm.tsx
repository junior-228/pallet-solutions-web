"use client";

// TuesdayReportReserveForm - free sign-up entry on the standalone
// /tuesday-report discovery page.
//
// POSTs to the existing web-lead Netlify function with form_type =
// 'tuesday-report-reservation' (the allowlist key - kept as-is so the
// capture keeps working mechanically). The lead lands in public.web_leads
// with corridor (city + state) + vendor business name in the payload jsonb
// so Rob knows who to send the first edition to.
//
// HONESTY DISCIPLINE: the Tuesday Report is FREE for claimed vendors. No
// payment, no founding rate, no ship date, no scarcity. Success state
// confirms capture + sets expectations: "We will email when the first
// edition for your corridor is ready - no charge."

import { FormEvent, useState } from "react";
import { submitWebLead } from "@/lib/submitLead";

type Status = "idle" | "loading" | "success" | "error";

export default function TuesdayReportReserveForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [corridor, setCorridor] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    const result = await submitWebLead({
      form_type: "tuesday-report-reservation",
      email: trimmed,
      company: company.trim() || undefined,
      phone: phone.trim() || undefined,
      source: "tuesday-report-page",
      // Anything not in the reserved column set lands in payload jsonb.
      corridor: corridor.trim() || undefined,
      intent: "tuesday-report-signup",
    });
    if (result.ok) {
      setStatus("success");
    } else {
      setError(
        result.error
          ? `${result.error} - nothing was reserved; please try again.`
          : "Something went wrong - nothing was reserved; please try again."
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-6 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
          You&apos;re on the list
        </p>
        <p className="mt-3 text-lg font-semibold text-ink-900">
          Free for claimed vendors.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          We&apos;ll email when the first Tuesday Report is ready to ship to
          your corridor. No charge.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border-2 border-brand-300 bg-brand-50/40 p-6 sm:p-7"
      noValidate
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
          Tuesday Report · for claimed vendors
        </p>
        <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          Free
        </span>
      </div>
      <p className="mt-3 text-lg font-bold text-ink-900">
        Free for claimed vendors.
      </p>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-ink-800">
        Your corridor, watched for you - so your selling time goes to closing.
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
        Add your email and we&apos;ll send the first edition for your corridor
        when it ships. No card, no charge.
      </p>

      <div className="mt-5 space-y-3">
        <div>
          <label
            htmlFor="trf-email"
            className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-600 mb-1.5"
          >
            Work email
          </label>
          <input
            id="trf-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") {
                setStatus("idle");
                setError(null);
              }
            }}
            placeholder="you@yourcompany.com"
            disabled={status === "loading"}
            className="w-full rounded-md border-[1.5px] border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:opacity-50"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="trf-company"
              className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-600 mb-1.5"
            >
              Business (optional)
            </label>
            <input
              id="trf-company"
              type="text"
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your pallet yard"
              disabled={status === "loading"}
              className="w-full rounded-md border-[1.5px] border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:opacity-50"
            />
          </div>
          <div>
            <label
              htmlFor="trf-corridor"
              className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-600 mb-1.5"
            >
              Corridor (city, ST)
            </label>
            <input
              id="trf-corridor"
              type="text"
              value={corridor}
              onChange={(e) => setCorridor(e.target.value)}
              placeholder="Dallas, TX"
              disabled={status === "loading"}
              className="w-full rounded-md border-[1.5px] border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:opacity-50"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="trf-phone"
            className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-600 mb-1.5"
          >
            Phone (optional)
          </label>
          <input
            id="trf-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="555-555-1234"
            disabled={status === "loading"}
            className="w-full max-w-xs rounded-md border-[1.5px] border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:opacity-50"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3.5 text-base font-bold text-white shadow-md shadow-brand-500/30 transition-all hover:scale-[1.01] hover:bg-brand-600 disabled:opacity-60 disabled:hover:scale-100"
      >
        {status === "loading"
          ? "Sending..."
          : "Get the Tuesday Report →"}
      </button>
      <p className="mt-2 text-center text-[11px] text-ink-500">
        Free for claimed vendors. We&apos;ll email when the first edition for
        your corridor is ready to ship.
      </p>
      {status === "error" && error && (
        <p role="alert" className="mt-3 text-sm text-red-700 font-medium">
          {error}
        </p>
      )}
    </form>
  );
}
