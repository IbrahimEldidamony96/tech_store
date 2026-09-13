"use client";

import { useState } from "react";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: currentPassword || undefined,
        newPassword,
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body.error ?? "Could not update password");
      setSubmitting(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* يوزر داخل بجوجل بس (hasPassword=false) بيحط أول باسورد له من
          غير ما يثبت باسورد قديم مالوش أصلًا */}
      {hasPassword && (
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">
            Current password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full rounded-md border border-steel/25 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          {hasPassword ? "New password" : "Set a password"}
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-md border border-steel/25 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-steel">
          At least 8 characters, one uppercase letter, one number.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          Confirm password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full rounded-md border border-steel/25 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-alert">{error}</p>}
      {success && <p className="text-sm text-signal">Password updated.</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-ink/90 disabled:opacity-40"
      >
        {submitting
          ? "Saving…"
          : hasPassword
            ? "Update password"
            : "Set password"}
      </button>
    </form>
  );
}
