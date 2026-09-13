"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // Zod بيرجع أخطاء متعددة (fieldErrors) — بناخد أول واحدة نلاقيها
      const firstFieldError = body.details?.fieldErrors
        ? (Object.values(body.details.fieldErrors)[0] as string[] | undefined)?.[0]
        : null;
      setError(firstFieldError ?? body.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    // التسجيل نجح — بنسجّله دخول على طول بنفس البيانات، بدل ما نرجّعه
    // لصفحة login منفصلة يكتب فيها نفس حاجة كتبها لسه
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      router.push("/login");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-ink">Create an account</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-steel">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-steel/25 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-steel">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-steel/25 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-steel">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-steel/25 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-steel">At least 8 characters, one uppercase letter, one number.</p>
        </div>

        {error && <p className="text-sm text-alert">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-ink py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-steel">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
