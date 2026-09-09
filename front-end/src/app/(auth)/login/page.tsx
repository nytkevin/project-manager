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
import type { SyntheticEvent } from "react";

export default function LoginPage() {
  const { form, errors, handleInput, validate } = useAuthForm({
    initialValues: LOGIN_INITIAL_STATE,
    initialErrors: LOGIN_INITIAL_ERRORS,
    validator: validateLogin,
  });

  const handleSubmit = async (
    event: SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const payload: LoginPayload = {
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    const res = await fetch("http://localhost:5000/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(data);
      return;
    }

    console.log("Account created:", data);
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

        <button
          type="submit"
          className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-zinc-200"
        >
          Sign in
        </button>
      </form>
    </AuthCard>
  );
}
