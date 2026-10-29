"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Gift, LockKeyhole, Mail, Sparkles, UserPlus } from "lucide-react";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

const copy = {
  "sign-in": {
    title: "Welcome back",
    body: "Sign in with an invited family email to manage rewards, points, and the calendar.",
    cta: "Sign in",
    alt: "Family access is invitation-only.",
    href: "/",
    altCta: "Back to dashboard"
  },
  "sign-up": {
    title: "Create your family space",
    body: "Invite parents, guardians, and children after your family dashboard is ready.",
    cta: "Create account",
    alt: "Already have an account?",
    href: "/sign-in",
    altCta: "Sign in"
  },
  "forgot-password": {
    title: "Reset your password",
    body: "Enter your email and we will send reset instructions.",
    cta: "Send reset link",
    alt: "Remembered it?",
    href: "/sign-in",
    altCta: "Sign in"
  },
  "reset-password": {
    title: "Choose a new password",
    body: "Use a strong password for your family account.",
    cta: "Update password",
    alt: "Back to",
    href: "/sign-in",
    altCta: "Sign in"
  }
} as const satisfies Record<AuthMode, {
  title: string;
  body: string;
  cta: string;
  alt: string;
  href: "/" | "/sign-in" | "/sign-up";
  altCta: string;
}>;

export function AuthCard({ mode }: { mode: AuthMode }) {
  const item = copy[mode];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.22),transparent_34%),linear-gradient(135deg,#f8fafc,#eef6ff_48%,#f7fee7)] px-4 py-8 text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),linear-gradient(135deg,#020617,#0f172a_54%,#11221b)] dark:text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/76 shadow-panel backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/78 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden min-h-[620px] flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <div>
              <div className="mb-8 inline-flex rounded-full border border-white/15 bg-white/10 p-3">
                <Sparkles className="h-8 w-8 text-teal-200" />
              </div>
              <h1 className="text-5xl font-semibold leading-tight">Family Rewards & Calendar</h1>
              <p className="mt-5 max-w-sm text-base leading-7 text-white/68">
                Premium family organization for points, rewards, reminders, and the next week of real life.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Rewards", Gift],
                ["Calendar", CalendarDays],
                ["Secure", LockKeyhole]
              ].map(([label, Icon]) => (
                <div key={label as string} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <Icon className="h-5 w-5 text-teal-200" />
                  <p className="mt-4 text-sm font-medium">{label as string}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-10 lg:p-14">
            <div className="mb-10 flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white lg:hidden">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
              <span className="ml-auto rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-400/10 dark:text-teal-200">
                Secure family access
              </span>
            </div>
            <div className="max-w-md">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.body}</p>

              {mode === "sign-in" ? (
                <div className="mt-8 space-y-4">
                  <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm leading-6 text-teal-950 dark:border-teal-300/20 dark:bg-teal-300/10 dark:text-teal-100">
                    SMART - HOME uses the secure account already approved for this family site. Continue with ChatGPT using the invited email address.
                  </div>
                  <a href="/signin-with-chatgpt?return_to=%2F" target="_top" className="flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-teal-300 dark:text-slate-950 dark:hover:bg-teal-200">
                    Continue with ChatGPT
                  </a>
                </div>
              ) : (
              <form className="mt-8 space-y-4">
                {mode === "sign-up" && (
                  <label className="block">
                    <span className="text-sm font-medium">Family name</span>
                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
                      <UserPlus className="h-5 w-5 text-slate-400" />
                      <input className="w-full bg-transparent text-sm outline-none" placeholder="The Ganesh Family" />
                    </div>
                  </label>
                )}
                {mode !== "reset-password" && (
                  <label className="block">
                    <span className="text-sm font-medium">Email</span>
                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
                      <Mail className="h-5 w-5 text-slate-400" />
                      <input type="email" className="w-full bg-transparent text-sm outline-none" placeholder="parent@example.com" />
                    </div>
                  </label>
                )}
                {mode !== "forgot-password" && (
                  <label className="block">
                    <span className="text-sm font-medium">Password</span>
                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
                      <LockKeyhole className="h-5 w-5 text-slate-400" />
                      <input type="password" className="w-full bg-transparent text-sm outline-none" placeholder="**********" />
                    </div>
                  </label>
                )}
                <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-teal-300 dark:text-slate-950 dark:hover:bg-teal-200">
                  {item.cta}
                </button>
                {mode === "sign-up" && (
                  <button type="button" className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                    Continue with Google
                  </button>
                )}
              </form>
              )}

              <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
                {item.alt}{" "}
                <Link href={item.href} className="font-semibold text-slate-950 dark:text-white">
                  {item.altCta}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
