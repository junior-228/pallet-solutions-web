"use client";

import { FormEvent, useState } from "react";
import { submitWebLead } from "@/lib/submitLead";

type Status = "idle" | "loading" | "success" | "error";

// Low-friction "add us to your RFQ" form: work email + timeline window.
// Used on the homepage RFQ section and on /rfp. Posts to the web-lead
// function (form_type "rfq"); must-succeed before showing the success state.
// Dark-section styling to match the ink-900 bands it sits in.
export default function RfqForm({
  source = "homepage-rfq",
}: {
  source?: string;
}) {
  const [email, setEmail] = useState("");
  const [timeline, setTimeline] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setStatus("error");
      setErrorMsg("Please enter a valid work email address.");
      return;
    }
    if (!timeline) {
      setStatus("error");
      setErrorMsg("Please pick an RFQ window.");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    const result = await submitWebLead({
      form_type: "rfq",
      email: trimmed,
      timeline,
      source,
    });
    if (result.ok) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMsg(result.error || "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-8 rounded-md border border-brand-400 bg-ink-800 p-6">
        <p className="text-lg font-semibold text-white">You are on the list.</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          We will reach out when your RFQ window opens with a per-pallet quote
          for every DC on your list, traceable to PSCI when finance asks. No
          follow-up calls until then.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
      <div>
        <label
          htmlFor="rfq-email"
          className="block text-xs font-semibold uppercase tracking-wide text-ink-300"
        >
          Work email
        </label>
        <input
          id="rfq-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") {
              setStatus("idle");
              setErrorMsg(null);
            }
          }}
          placeholder="you@company.com"
          disabled={status === "loading"}
          className="mt-2 w-full rounded-md border border-ink-700 bg-ink-800 px-4 py-3 text-base text-white placeholder:text-ink-500 focus:border-brand-400 focus:outline-none disabled:opacity-50"
        />
      </div>
      <div>
        <label
          htmlFor="rfq-timeline"
          className="block text-xs font-semibold uppercase tracking-wide text-ink-300"
        >
          RFQ timeline
        </label>
        <select
          id="rfq-timeline"
          name="timeline"
          required
          value={timeline}
          onChange={(e) => {
            setTimeline(e.target.value);
            if (status === "error") {
              setStatus("idle");
              setErrorMsg(null);
            }
          }}
          disabled={status === "loading"}
          className="mt-2 w-full rounded-md border border-ink-700 bg-ink-800 px-4 py-3 text-base text-white focus:border-brand-400 focus:outline-none disabled:opacity-50"
        >
          <option value="" disabled>
            Select a window
          </option>
          <option value="Q3 2026">Q3 2026</option>
          <option value="Q4 2026">Q4 2026</option>
          <option value="Q1 2027">Q1 2027</option>
          <option value="Mid to late 2027">Mid to late 2027</option>
          <option value="Just exploring">Just exploring</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60"
      >
        {status === "loading" ? "Sending..." : "Add us to the RFQ"}
        <span aria-hidden="true">→</span>
      </button>
      {status === "error" && errorMsg && (
        <p role="alert" className="text-sm font-medium text-red-300">
          {errorMsg}
        </p>
      )}
      <p className="text-xs text-ink-400">
        No follow-up calls until your RFQ window opens.
      </p>
    </form>
  );
}
