"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Passwordless sign-in: Supabase emails a one-time link. */
export function SignInForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setState("idle");
    } else setState("sent");
  }

  if (state === "sent")
    return (
      <div className="group">
        <div className="row">
          <div className="row-main">
            <div className="title">
              <span className="t">Check your email</span>
            </div>
            <div className="subtitle" style={{ whiteSpace: "normal" }}>
              We sent a sign-in link to {email}. Open it on this device.
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <form onSubmit={onSubmit}>
      <div className="group">
        <div className="field">
          <input
            id="signin-email"
            className="left"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            autoCapitalize="none"
            autoComplete="email"
            aria-label="Email address"
          />
        </div>
      </div>
      {error && <div className="error-text">{error}</div>}
      <div style={{ marginTop: 16 }}>
        <button className="filled-btn" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Continue with Email"}
        </button>
      </div>
      <div className="section-f" style={{ textAlign: "center" }}>
        No password needed. We&apos;ll email you a link.
      </div>
    </form>
  );
}
