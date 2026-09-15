"use client";

import {
  LOGIN_INITIAL_ERRORS,
  LOGIN_INITIAL_STATE,
} from "@/app/features/auth/auth.constants";
import { LoginPayload } from "@/app/features/auth/auth.types";
import { validateLogin } from "@/app/features/auth/auth.validation";
import { AuthCard } from "@/app/features/auth/components/authCard";
import { AuthField } from "@/app/features/auth/components/authField";
import { useAuthForm } from "@/app/features/auth/hooks/useAuthForm";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { form, errors, handleInput, validate } = useAuthForm({
    initialValues: LOGIN_INITIAL_STATE,
    initialErrors: LOGIN_INITIAL_ERRORS,
    validator: validateLogin,
  });

  const handleSubmit = async (
    event: SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();
    setStatus(null);

    if (!validate()) {
      return;
    }

    const payload: LoginPayload = {
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    setIsSubmitting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      setStatus({
        type: res.ok ? "success" : "error",
        message: data.message ?? "Login failed. Please try again.",
      });

      if (res.ok) {
        router.push("/dashboard");
      }
    } catch {
      setStatus({
        type: "error",
        message: "Unable to sign in. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard eyebrow="Welcome back" title="Sign in">
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
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
          hint="Enter your account password."
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
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}
