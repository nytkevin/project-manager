import type { NextFunction, Request, Response } from "express";
import { getUserById } from "../services/auth.service.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const accessToken = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = verifyAccessToken(accessToken);
    const user = await getUserById(payload.userId);

    req.user = user;

    return next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired access token",
    });
  }
}
