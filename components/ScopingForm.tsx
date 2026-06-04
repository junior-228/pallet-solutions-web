"use client";

import { FormEvent, useState } from "react";
import { submitWebLead } from "@/lib/submitLead";

type Status = "idle" | "loading" | "success" | "error";

// /sourcing managed-scoping form: name / email / company / DC count / goal.
// Posts to web-lead (form_type "scoping"); must-succeed before showing the
// success state. Dark-section styling to match the ink-900 band.
export default function ScopingForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [dcCount, setDcCount] = useState("");
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function clearErr() {
    if (status === "error") {
      setStatus("idle");
      setErrorMsg(null);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setStatus("error");
      setErrorMsg("Please enter a valid work email address.");
      return;
    }
    if (!name.trim() || !company.trim() || !dcCount || !goal.trim()) {
      setStatus("error");
      setErrorMsg("Please fill in every field so we can scope it properly.");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    const result = await submitWebLead({
      form_type: "scoping",
      email: trimmed,
      name: name.trim(),
      company: company.trim(),
      source: "sourcing-scoping",
      dc_count: dcCount,
      goal: goal.trim(),
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
      <div className="mt-10 rounded-xl border border-brand-400 bg-ink-800 p-6">
        <p className="text-lg font-semibold text-white">Sent to PS.</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          We respond the same business day with a real read on how we would run
          the engagement, a typical timeline, and pricing for your scope.
        </p>
      </div>
    );
  }

  const inputCls =
    "mt-2 w-full rounded-md border border-ink-700 bg-ink-800 px-4 py-3 text-base text-white placeholder:text-ink-500 focus:border-brand-400 focus:outline-none disabled:opacity-50";
  const labelCls =
    "block text-xs font-semibold uppercase tracking-wide text-ink-300";
  const loading = status === "loading";

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="scope-name" className={labelCls}>
            Name
          </label>
          <input
            id="scope-name"
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearErr();
            }}
            placeholder="Your name"
            disabled={loading}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="scope-email" className={labelCls}>
            Work email
          </label>
          <input
            id="scope-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearErr();
            }}
            placeholder="you@company.com"
            disabled={loading}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="scope-company" className={labelCls}>
            Company
          </label>
          <input
            id="scope-company"
            type="text"
            required
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              clearErr();
            }}
            placeholder="Company name"
            disabled={loading}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="scope-dcs" className={labelCls}>
            Number of DCs
          </label>
          <select
            id="scope-dcs"
            required
            value={dcCount}
            onChange={(e) => {
              setDcCount(e.target.value);
              clearErr();
            }}
            disabled={loading}
            className={inputCls}
          >
            <option value="" disabled>
              Select range
            </option>
            <option value="1-5">1 to 5 DCs</option>
            <option value="6-20">6 to 20 DCs</option>
            <option value="21-50">21 to 50 DCs</option>
            <option value="50+">50+ DCs</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="scope-goal" className={labelCls}>
          What are you trying to solve?
        </label>
        <textarea
          id="scope-goal"
          rows={4}
          required
          value={goal}
          onChange={(e) => {
            setGoal(e.target.value);
            clearErr();
          }}
          placeholder="Current vendor count, pain points, what good looks like..."
          disabled={loading}
          className={`${inputCls} resize-y`}
        />
      </div>

      {status === "error" && errorMsg && (
        <p role="alert" className="text-sm font-medium text-red-300">
          {errorMsg}
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <p className="text-xs text-ink-400">
          We respond same business day with next steps.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send to PS"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
