"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
export function AuthCard({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setMessage("");
    try {
      const result = mode === "sign-up"
        ? await authClient.signUp.email({ email, password, name })
        : mode === "forgot-password"
        ? await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` })
        : mode === "reset-password"
        ? await authClient.resetPassword({ newPassword: password, token: new URLSearchParams(window.location.search).get("token") || "" })
        : await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message || "Unable to continue.");
      if (mode === "sign-in") window.location.assign("/");
      else setMessage(mode === "sign-up" ? "Account created. Send a verification code below, verify your email, then sign in." : mode === "forgot-password" ? "If this account exists, password reset instructions have been sent." : "Password updated. You can now sign in.");
    } catch (error) { setMessage((error as Error).message); } finally { setPending(false); }
  }
  async function verify(send: boolean) {
    setPending(true);
    try {
      const result = send ? await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" }) : await authClient.emailOtp.verifyEmail({ email, otp });
      if (result.error) throw new Error(result.error.message);
      setMessage(send ? "Check your email for the verification code." : "Email verified. Sign in to open your family dashboard.");
    } catch (error) { setMessage((error as Error).message); } finally { setPending(false); }
  }
  const title = { "sign-in": "Welcome home", "sign-up": "Create your account", "forgot-password": "Reset your password", "reset-password": "Choose a new password" }[mode];
  const input = "w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-950";
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10"><section className="w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-xl"><p className="text-sm font-semibold tracking-widest text-teal-700">SMART - HOME</p><h1 className="text-3xl font-semibold text-slate-950">{title}</h1><p className="text-sm text-slate-600">Family records are available only to approved, verified email addresses.</p><form onSubmit={submit} className="space-y-4">{mode === "sign-up" && <label className="block">Name<input required className={input} value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>}{mode !== "reset-password" && <label className="block">Email<input required type="email" className={input} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>}{mode !== "forgot-password" && <label className="block">Password<input required minLength={8} type="password" className={input} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} /></label>}<button disabled={pending} className="w-full rounded-xl bg-teal-700 p-3 font-semibold text-white disabled:opacity-50">{pending ? "Please wait…" : title}</button></form><p role="status" className="text-sm text-slate-700">{message}</p>{(mode === "sign-up" || mode === "sign-in") && <details className="text-sm"><summary>Verify your email</summary><div className="mt-3 space-y-3"><button disabled={pending || !email} onClick={() => void verify(true)} className="underline">Send verification code to the email above</button><label className="block">Verification code<input className={input} value={otp} onChange={e => setOtp(e.target.value)} autoComplete="one-time-code" /></label><button disabled={pending || !otp} onClick={() => void verify(false)} className="underline">Verify email</button></div></details>}<nav className="flex flex-wrap gap-4 text-sm text-teal-800"><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link><Link href="/forgot-password">Forgot password</Link></nav></section></main>;
}
