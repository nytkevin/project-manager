import type { Request, Response } from "express";
import { signupSchema } from "../validators/auth.validator.js";
import { registerUser } from "../services/auth.service.js";

export async function signup(req: Request, res: Response) {
  const result = signupSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Registration unsuccessful",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const user = await registerUser(result.data);

    return res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL ALREADY EXISTS") {
      return res.status(409).json({
        message: "A user with this email already exists",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
