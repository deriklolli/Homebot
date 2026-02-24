"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { HomebotLogo } from "@/components/icons";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Force light theme on signup page
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (wasDark) root.classList.add("dark");
    };
  }, []);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleSignUp() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg p-4">
        <div className="w-full max-w-[400px] bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 flex flex-col items-center gap-4 text-center">
          <HomebotLogo width={40} height={34} />
          <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
            Check your email
          </h1>
          <p className="text-[14px] text-text-3 leading-relaxed">
            We&apos;ve sent a confirmation link to <strong className="text-text-primary">{email}</strong>.
            Click the link to activate your account.
          </p>
          <Link
            href="/login"
            className="mt-2 text-[13px] text-accent font-medium hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-[400px] bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 flex flex-col items-center gap-6">
        {/* Logo & Header */}
        <div className="flex flex-col items-center gap-3">
          <HomebotLogo width={40} height={34} />
          <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
            Create an account
          </h1>
          <p className="text-[13px] text-text-3 text-center">
            Get started managing your home projects and inventory.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-red/10 border border-red/20">
            <p className="text-[13px] text-red">{error}</p>
          </div>
        )}

        {/* Email/Password form */}
        <form onSubmit={handleSignUp} className="w-full flex flex-col gap-3">
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1.5"
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              placeholder="Repeat your password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-accent text-white text-[14px] font-semibold rounded-[var(--radius-md)] hover:opacity-90 transition-opacity duration-[120ms] disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[12px] text-text-4">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google SSO */}
        <button
          onClick={handleGoogleSignUp}
          className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-border bg-surface text-text-primary text-[14px] font-medium rounded-[var(--radius-md)] hover:bg-border transition-colors duration-[120ms]"
        >
          <GoogleIcon />
          Sign up with Google
        </button>

        {/* Sign in link */}
        <p className="text-[13px] text-text-3">
          Already have an account?{" "}
          <Link href="/login" className="text-accent font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
