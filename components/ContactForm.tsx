"use client";

import { FormEvent, useState } from "react";
import { submitWebLead } from "@/lib/submitLead";

type Status = "idle" | "loading" | "success" | "error";

// /contact catch-all form: name / email / company (optional) / topic / message.
// Posts to web-lead (form_type "contact"); must-succeed before success.
// Light-section styling to match the white contact panel. `topics` come from
// the page so the dropdown stays a single source.
export default function ContactForm({ topics }: { topics: string[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
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
    if (!name.trim() || !message.trim()) {
      setStatus("error");
      setErrorMsg("Please add your name and a message.");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    const result = await submitWebLead({
      form_type: "contact",
      email: trimmed,
      name: name.trim(),
      company: company.trim() || undefined,
      source: "contact-page",
      topic: topic || undefined,
      message: message.trim(),
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
      <div className="mt-8 rounded-xl border border-brand-300 bg-brand-50/60 p-6">
        <p className="text-lg font-semibold text-ink-900">Message sent.</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          We read every message and reply the same business day. If it is
          urgent, email info@palletsolutionsusa.com directly.
        </p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-md border border-ink-300 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 disabled:opacity-50";
  const labelCls =
    "block text-xs font-semibold uppercase tracking-wider text-ink-600 mb-2";
  const loading = status === "loading";

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelCls}>
            Name
          </label>
          <input
            id="contact-name"
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
          <label htmlFor="contact-email" className={labelCls}>
            Work email
          </label>
          <input
            id="contact-email"
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-company" className={labelCls}>
            Company
          </label>
          <input
            id="contact-company"
            type="text"
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
          <label htmlFor="contact-topic" className={labelCls}>
            Topic
          </label>
          <select
            id="contact-topic"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              clearErr();
            }}
            disabled={loading}
            className={inputCls}
          >
            <option value="" disabled>
              Select a topic
            </option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className={labelCls}>
          Message
        </label>
        <textarea
          id="contact-message"
          rows={5}
          required
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            clearErr();
          }}
          placeholder="What is on your mind?"
          disabled={loading}
          className={`${inputCls} resize-y`}
        />
      </div>

      {status === "error" && errorMsg && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60"
      >
        {loading ? "Sending..." : "Send message"}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
