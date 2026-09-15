"use client";

import { useState, type ChangeEvent } from "react";

import type { FormErrors, FormValidator } from "../auth.types";

type UseAuthFormOptions<T extends object> = {
  initialValues: T;
  initialErrors: FormErrors<T>;
  validator: FormValidator<T>;
};

export function useAuthForm<T extends object>({
  initialValues,
  initialErrors,
  validator,
}: UseAuthFormOptions<T>) {
  const [form, setForm] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>(initialErrors);

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;

    const nextForm = {
      ...form,
      [name]: value,
    } as T;

    setForm(nextForm);
    setErrors(validator(nextForm));
  };

  const validate = (): boolean => {
    const nextErrors = validator(form);

    setErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  };

  const resetForm = () => {
    setForm(initialValues);
    setErrors(initialErrors);
  };

  return {
    form,
    errors,
    handleInput,
    validate,
    resetForm,
  };
}
