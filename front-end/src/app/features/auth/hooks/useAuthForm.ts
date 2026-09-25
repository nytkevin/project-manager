"use client";

import { useState, type ChangeEvent } from "react";

import type { FormErrors, UseAuthFormOptions } from "../auth.types";

export function useAuthForm<T extends object>({
  initialValues,
  initialErrors,
  validator,
}: UseAuthFormOptions<T>) {
  const [form, setForm] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>(initialErrors);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;

    const nextForm = {
      ...form,
      [name]: value,
    } as T;

    setForm(nextForm);

    if (hasSubmitted) {
      setErrors(validator(nextForm));
    }
  };

  const validate = (): boolean => {
    const nextErrors = validator(form);

    setHasSubmitted(true);
    setErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  };

  const resetForm = () => {
    setForm(initialValues);
    setErrors(initialErrors);
    setHasSubmitted(false);
  };

  return {
    form,
    errors,
    setErrors,
    handleInput,
    validate,
    resetForm,
  };
}
