"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitLabel = useMemo(() => (mode === "signin" ? "Sign in" : "Create account"), [mode]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;

      try {
        const response = await authFetch("/api/profile", { method: "GET" });
        const payload = await response.json();
        router.replace(payload.onboardingComplete ? "/feed" : "/onboarding");
      } catch {
        router.replace("/feed");
      }
    });
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email || password.length < 6) {
      setError("Enter a valid email and a password with at least 6 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage("Account created. Sign in to continue.");
          setMode("signin");
          return;
        }
      }

      const profileResponse = await authFetch("/api/profile", { method: "GET" });
      const profilePayload = await profileResponse.json();

      router.replace(profilePayload.onboardingComplete ? "/feed" : "/onboarding");
    } catch (authError) {
      setError((authError as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-12">
      <section className="card-surface w-full p-8 md:p-10">
        <p className="font-display text-xs uppercase tracking-[0.25em] text-cyan-300">KnowTok</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Paper feed for real life relevance</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Sign in to swipe frontier research papers and ask one question on every card: what does this mean for me?
        </p>

        <div className="mt-6 inline-flex rounded-full border border-white/20 p-1">
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mode === "signin" ? "bg-cyan-300 text-slate-900" : "text-slate-300"
            }`}
            type="button"
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mode === "signup" ? "bg-cyan-300 text-slate-900" : "text-slate-300"
            }`}
            type="button"
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-slate-200">
            Email
            <input
              className="input-field mt-2"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm text-slate-200">
            Password
            <input
              className="input-field mt-2"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
            />
          </label>

          <button className="primary-button w-full" disabled={submitting} type="submit">
            {submitting ? "Working..." : submitLabel}
          </button>
        </form>

        {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </section>
    </main>
  );
}
