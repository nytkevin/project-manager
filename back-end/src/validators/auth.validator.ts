import { z } from "zod";

export const signupSchema = z.object({
  fullname: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .pipe(z.string().min(2, "Full name must contain at least 2 characters")),

  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .pipe(
      z.string().regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    ),

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
