"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/client";
import { normalizeUK } from "@/lib/ai";
import { MessageSquare, Save, Mail, PoundSterling } from "lucide-react";

export function TwilioAlertForm({ initialPhone, liveTwilio }: { initialPhone: string; liveTwilio: boolean }) {
  const [phone, setPhone] = useState(initialPhone);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);

  async function save() {
    const raw = phone.trim();
    if (!raw) {
      setError("Enter a UK mobile number first (e.g. 07700 900123).");
      return;
    }
    let normalized: string;
    try {
      normalized = normalizeUK(raw);
    } catch {
      normalized = raw;
    }

    setBusy("save");
    setError(null);
    setStatus(null);
    const res = await apiFetch<{ alertPhone: string }>("/api/settings/alert-phone", {
      method: "POST",
      body: JSON.stringify({ phone: normalized }),
    });
    if (res.success && res.data) {
      setPhone(res.data.alertPhone);
      setStatus(`Saved — lead alerts now go to ${res.data.alertPhone}.`);
    } else {
      setError(res.error?.message ?? "Could not save.");
    }
    setBusy(null);
  }

  async function testSms() {
    setBusy("test");
    setError(null);
    setStatus(null);
    const res = await apiFetch<{ sentTo: string; mock: boolean }>("/api/settings/test-sms", {
      method: "POST",
    });
    if (res.success && res.data) {
      setStatus(
        res.data.mock
          ? `Mock SMS logged on the server console for ${res.data.sentTo} — add Twilio keys in .env to send real texts.`
          : `Test text sent to ${res.data.sentTo}.`
      );
    } else {
      setError(res.error?.message ?? "Test failed.");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="alert-phone">
        Alert phone (UK mobile)
      </label>
      <div className="flex gap-2">
        <Input
          id="alert-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07700 900123"
          inputMode="tel"
          className="flex-1"
        />
        <Button variant="outline" onClick={save} disabled={busy !== null}>
          <Save className="h-3.5 w-3.5" aria-hidden /> {busy === "save" ? "Saving…" : "Save"}
        </Button>
      </div>

      <Button variant="accent" onClick={testSms} disabled={busy !== null || !phone.trim()}>
        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
        {busy === "test" ? "Sending…" : liveTwilio ? "Send test SMS" : "Send test SMS (mock)"}
      </Button>

      {status && <p className="text-sm text-teal-700">{status}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function EmailAlertForm({ initialEmail, liveSmtp }: { initialEmail: string; liveSmtp: boolean }) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);

  async function save() {
    const raw = email.trim();
    if (!raw || !raw.includes("@")) {
      setError("Enter an email address first (e.g. dave@yourcompany.co.uk).");
      return;
    }
    setBusy("save");
    setError(null);
    setStatus(null);
    const res = await apiFetch<{ alertEmail: string }>("/api/settings/alert-email", {
      method: "POST",
      body: JSON.stringify({ email: raw }),
    });
    if (res.success && res.data) {
      setEmail(res.data.alertEmail);
      setStatus(`Saved — lead alerts now go to ${res.data.alertEmail}.`);
    } else {
      setError(res.error?.message ?? "Could not save.");
    }
    setBusy(null);
  }

  async function testEmail() {
    setBusy("test");
    setError(null);
    setStatus(null);
    const res = await apiFetch<{ sentTo: string; mock: boolean }>("/api/settings/test-email", {
      method: "POST",
    });
    if (res.success && res.data) {
      setStatus(
        res.data.mock
          ? `Mock email logged on the server console for ${res.data.sentTo} — add SMTP settings in .env (a Gmail account + App Password is free) to send real emails.`
          : `Test email sent to ${res.data.sentTo} — check the inbox (and spam folder the first time).`
      );
    } else {
      setError(res.error?.message ?? "Test failed.");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="alert-email">
        Alert email
      </label>
      <div className="flex gap-2">
        <Input
          id="alert-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="dave@yourcompany.co.uk"
          className="flex-1"
        />
        <Button variant="outline" onClick={save} disabled={busy !== null}>
          <Save className="h-3.5 w-3.5" aria-hidden /> {busy === "save" ? "Saving…" : "Save"}
        </Button>
      </div>

      <Button variant="accent" onClick={testEmail} disabled={busy !== null || !email.trim()}>
        <Mail className="h-3.5 w-3.5" aria-hidden />
        {busy === "test" ? "Sending…" : liveSmtp ? "Send test email" : "Send test email (mock)"}
      </Button>

      {status && <p className="text-sm text-teal-700">{status}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function AvgJobValueForm({ initialValue }: { initialValue: number }) {
  const [value, setValue] = useState(String(initialValue));
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 50 || n > 100000) {
      setError("Enter a value between £50 and £100,000.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    const res = await apiFetch<{ avgJobValue: number }>("/api/settings/avg-job-value", {
      method: "POST",
      body: JSON.stringify({ value: n }),
    });
    if (res.success && res.data) {
      setValue(String(res.data.avgJobValue));
      setStatus("Saved — the pipeline estimate on your Overview updates on reload.");
    } else {
      setError(res.error?.message ?? "Could not save.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="avg-job-value">
        Average job value (£)
      </label>
      <div className="flex gap-2">
        <Input
          id="avg-job-value"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="numeric"
          placeholder="4800"
          className="flex-1"
        />
        <Button variant="outline" onClick={save} disabled={busy}>
          <PoundSterling className="h-3.5 w-3.5" aria-hidden /> {busy ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Your Overview multiplies booked jobs by this number to show an estimated pipeline. Roofers:
        ~£4,800 (reroofs pull it up). Plumbers: ~£250. Tune it to what your jobs actually invoice.
      </p>
      {status && <p className="text-sm text-teal-700">{status}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
