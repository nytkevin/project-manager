"use client";

import { useState, type SyntheticEvent } from "react";

import { AuthCard } from "@/app/features/auth/components/authCard";
import { AuthField } from "@/app/features/auth/components/authField";
import { SignupPayload } from "@/app/features/auth/auth.types";
import { useAuthForm } from "@/app/features/auth/hooks/useAuthForm";
import {
  SIGNUP_INITIAL_ERRORS,
  SIGNUP_INITIAL_STATE,
} from "@/app/features/auth/auth.constants";
import { validateSignup } from "@/app/features/auth/auth.validation";

export default function SignupPage() {
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { form, errors, handleInput, validate } = useAuthForm({
    initialValues: SIGNUP_INITIAL_STATE,
    initialErrors: SIGNUP_INITIAL_ERRORS,
    validator: validateSignup,
  });

  const handleSubmit = async (
    event: SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();
    setStatus(null);

    if (!validate()) {
      return;
    }

    const payload: SignupPayload = {
      fullname: form.fullname.trim(),
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    setIsSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setStatus({
          type: "error",
          message: data.message ?? "Account creation failed. Please try again.",
        });

        return;
      }

      setStatus({
        type: "success",
        message: data.message ?? "Account created successfully.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard eyebrow="Welcome" title="Create account">
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Full name"
          name="fullname"
          type="text"
          value={form.fullname}
          error={errors.fullname}
          placeholder="John Doe"
          hint=""
          onChange={handleInput}
        />

        <AuthField
          label="Username"
          name="username"
          type="text"
          value={form.username}
          error={errors.username}
          placeholder="john_doe"
          hint="Choose a unique username."
          onChange={handleInput}
        />

        <AuthField
          label="Email address"
          name="email"
          type="email"
          value={form.email}
          error={errors.email}
          placeholder="you@example.com"
          hint=""
          onChange={handleInput}
        />

        <AuthField
          label="Password"
          name="password"
          type="password"
          value={form.password}
          error={errors.password}
          placeholder="*******"
          hint="Use at least 8 characters, one uppercase, one lowercase, and one number."
          onChange={handleInput}
        />

        <AuthField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          error={errors.confirmPassword}
          placeholder="*******"
          hint=""
          onChange={handleInput}
        />

        {status && (
          <p
            role="alert"
            className={
              status.type === "success"
                ? "rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
                : "rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300"
            }
          >
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-zinc-200"
        >
          {isSubmitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </AuthCard>
  );
}
