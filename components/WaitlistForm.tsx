"use client";

import { FormEvent, useState } from "react";
import { submitWebLead } from "@/lib/submitLead";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
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
    setStatus("loading");
    setErrorMsg(null);

    const result = await submitWebLead({
      form_type: "market-pulse-waitlist",
      email: trimmed,
      source: "procurement-waitlist",
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
      <div className="rounded-xl bg-white/10 border border-white/25 p-6">
        <p className="text-lg font-semibold text-white">
          You are on the waitlist.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-brand-50">
          We will email you the moment Market Pulse founding spots open.
          No spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <label htmlFor="waitlist-email" className="sr-only">
        Work email address
      </label>
      <input
        id="waitlist-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === "error") {
            setStatus("idle");
            setErrorMsg(null);
          }
        }}
        placeholder="work@yourcompany.com"
        disabled={status === "loading"}
        className="w-full rounded-md border-2 border-white/30 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-white focus:bg-white/20 focus:outline-none transition-colors disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-md bg-white px-4 py-3 text-sm font-bold uppercase tracking-wider text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-60"
      >
        {status === "loading" ? "Joining..." : "Join the waitlist →"}
      </button>
      {status === "error" && errorMsg && (
        <p className="text-xs text-white/95 font-medium" role="alert">
          {errorMsg}
        </p>
      )}
      <p className="text-[11px] leading-relaxed text-brand-50">
        We will only email you about Market Pulse, and only when there is
        something real to share. No spam.
      </p>
    </form>
  );
}
