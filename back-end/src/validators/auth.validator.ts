import { z } from "zod";

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .pipe(z.string().min(2, "Name must contain at least 2 characters")),

  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .pipe(z.email("Invalid email address")),

  password: z
    .string()
    .min(1, "Password is required")
    .pipe(
      z
        .string()
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
          "Password must contain uppercase, lowercase, number, and special character",
        ),
    ),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .pipe(z.email("Invalid email address")),

  password: z
    .string()
    .min(1, "Password is required")
    .pipe(
      z
        .string()
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
          "Password must contain uppercase, lowercase, number, and special character",
        ),
    ),
});
