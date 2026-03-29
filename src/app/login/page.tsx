"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "./actions/auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState<
    AuthState,
    FormData
  >(login, {});
  const [signupState, signupAction, signupPending] = useActionState<
    AuthState,
    FormData
  >(signup, {});

  const state = mode === "login" ? loginState : signupState;
  const pending = mode === "login" ? loginPending : signupPending;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 lg:pl-0">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding */}
        <div className="text-center">
          <img src="/logo.png" alt="VRdict" className="w-16 h-16 rounded-xl mx-auto mb-3" />
          <h1 className="font-display text-4xl font-semibold text-gradient-vr tracking-wider">
            VRdict
          </h1>
          <p className="font-display text-[10px] uppercase tracking-[0.3em] text-[#5c5954] mt-2">
            Personal Cinelog
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-card/80 border border-border-glow">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 rounded-md text-sm font-display uppercase tracking-wider transition-all ${
              mode === "login"
                ? "bg-gradient-to-br from-vr-blue to-vr-blue-dark text-white"
                : "text-[#5c5954] hover:text-[#9a968e]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 rounded-md text-sm font-display uppercase tracking-wider transition-all ${
              mode === "signup"
                ? "bg-gradient-to-br from-vr-violet to-vr-violet-dark text-white"
                : "text-[#5c5954] hover:text-[#9a968e]"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form
          action={mode === "login" ? loginAction : signupAction}
          className="p-6 rounded-xl border border-border-glow bg-bg-card/50 backdrop-blur-sm space-y-4"
        >
          {/* Top gradient line like the original modal */}
          <div
            className="h-px -mx-6 -mt-6 mb-4 rounded-t-xl"
            style={{
              background:
                "linear-gradient(90deg, transparent 5%, #38bdf8 30%, #a78bfa 70%, transparent 95%)",
            }}
          />

          {mode === "signup" && (
            <div className="space-y-1.5">
              <label
                htmlFor="display_name"
                className="font-display text-[11px] uppercase tracking-wider text-[#9a968e]"
              >
                Display Name
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                placeholder="Your name"
                className="w-full h-11 rounded-lg border border-border-glow bg-bg-deep/50 px-3 font-body text-sm text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/40 focus:ring-1 focus:ring-vr-blue/20 transition-colors"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="font-display text-[11px] uppercase tracking-wider text-[#9a968e]"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full h-11 rounded-lg border border-border-glow bg-bg-deep/50 px-3 font-body text-sm text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/40 focus:ring-1 focus:ring-vr-blue/20 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="font-display text-[11px] uppercase tracking-wider text-[#9a968e]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Min 6 characters"
              className="w-full h-11 rounded-lg border border-border-glow bg-bg-deep/50 px-3 font-body text-sm text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/40 focus:ring-1 focus:ring-vr-blue/20 transition-colors"
            />
          </div>

          {mode === "signup" && (
            <div className="space-y-1.5">
              <label
                htmlFor="invite_code"
                className="font-display text-[11px] uppercase tracking-wider text-[#9a968e]"
              >
                Invite Code
              </label>
              <input
                id="invite_code"
                name="invite_code"
                type="text"
                required
                placeholder="Enter invite code"
                className="w-full h-11 rounded-lg border border-border-glow bg-bg-deep/50 px-3 font-body text-sm text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/40 focus:ring-1 focus:ring-vr-blue/20 transition-colors"
              />
            </div>
          )}

          {/* Error / success messages */}
          {state.error && (
            <p className="text-sm font-body text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="text-sm font-body text-green-400 bg-green-400/10 px-3 py-2 rounded-lg">
              {state.success}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full h-11 rounded-lg font-display text-sm uppercase tracking-wider text-white transition-all disabled:opacity-50"
            style={{
              background:
                mode === "login"
                  ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                  : "linear-gradient(135deg, #a78bfa, #8b5cf6)",
            }}
          >
            {pending
              ? "..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
