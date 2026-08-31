import type { Request, Response } from "express";
import { loginSchema, signupSchema } from "../validators/auth.validator.js";
import {
  authenticateUser,
  getUserById,
  refreshUserAccessToken,
  registerUser,
} from "../services/auth.service.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
} from "../utils/jwt.js";

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
    // console.error("SIGNUP ERROR:", error);

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

export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Login failed",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const user = await authenticateUser(result.data);
    const accessToken = createAccessToken(user.id);
    const refreshToken = createRefreshToken(user.id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      user,
      accessToken,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID CREDENTIALS") {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  return res.status(200).json({
    user: req.user,
  });
}

export async function refreshAccessToken(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      message: "Refresh token missing",
    });
  }

  try {
    const accessToken = await refreshUserAccessToken(refreshToken);

    return res.status(200).json({
      accessToken,
    });
  } catch {
    return res.status(401).json({
      message: "Invalid or expired refresh token",
    });
  }
}
