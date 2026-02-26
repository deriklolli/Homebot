"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HomebotLogo } from "@/components/icons";

export default function ActivatePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Set password
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Mark account as activated
    const res = await fetch("/api/activate", { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Activation failed.");
      setLoading(false);
      return;
    }

    // Refresh session to pick up updated metadata
    await supabase.auth.refreshSession();

    // Redirect based on role
    const { data: { user } } = await supabase.auth.getUser();
    const role = (user?.app_metadata?.role as string) ?? "homeowner";
    const dest = role === "manager" ? "/admin" : "/";

    router.push(dest);
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-[400px] bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <HomebotLogo width={40} height={34} />
          <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
            Set Up Your Account
          </h1>
          <p className="text-[13px] text-text-3 text-center">
            Create a password to activate your HOMEBOT account.
          </p>
        </div>

        {error && (
          <div className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-red/10 border border-red/20">
            <p className="text-[13px] text-red">{error}</p>
          </div>
        )}

        <form onSubmit={handleActivate} className="w-full flex flex-col gap-3">
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
              htmlFor="confirmPassword"
              className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1.5"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-accent text-white text-[14px] font-semibold rounded-[var(--radius-md)] hover:opacity-90 transition-opacity duration-[120ms] disabled:opacity-60"
          >
            {loading ? "Activating..." : "Activate Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
