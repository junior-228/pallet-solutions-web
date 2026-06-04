"use client";

import { FormEvent, useState } from "react";
import { FUNCTIONS_BASE } from "@/lib/functionsBase";

type Status = "idle" | "loading" | "success" | "error";

// /tuesday-read subscribe form. Posts to the EXISTING network-site function
// `tuesday-read-subscribe` (its own subscriber table + welcome email +
// unsubscribe token), not web-lead. Different endpoint + payload, so it does
// its own fetch. Dark pill styling to match the ink band.
const SUBSCRIBE_URL = `${FUNCTIONS_BASE}/.netlify/functions/tuesday-read-subscribe`;

export default function TuesdayReadForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setStatus("error");
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch(SUBSCRIBE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source_page: "tuesday-read-page",
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (res.ok && data.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.error || `Subscribe failed (HTTP ${res.status}).`);
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-10 max-w-md mx-auto rounded-xl border border-brand-400 bg-white/10 p-6 text-center">
        <p className="text-lg font-semibold text-white">You are subscribed.</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          Check your inbox - we just sent a welcome note and this week&apos;s
          edition. Every Tuesday from here on.
        </p>
      </div>
    );
  }

  const loading = status === "loading";

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
      >
        <label htmlFor="tr-email" className="sr-only">
          Email address
        </label>
        <input
          type="email"
          id="tr-email"
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
          disabled={loading}
          className="flex-1 rounded-full bg-white/10 border border-white/20 px-5 py-3 text-sm text-white placeholder:text-ink-400 focus:outline-none focus:border-brand-400 focus:bg-white/15 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          {loading ? "Subscribing..." : "Subscribe"}
        </button>
      </form>
      {status === "error" && errorMsg && (
        <p role="alert" className="mt-3 text-xs font-medium text-red-300">
          {errorMsg}
        </p>
      )}
    </>
  );
}
