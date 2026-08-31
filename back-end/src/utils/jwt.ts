import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "../types/auth.types.js";

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

export function createAccessToken(userId: number) {
  return jwt.sign(
    {
      userId,
    },
    getEnv("JWT_ACCESS_SECRET"),
    {
      expiresIn: "15m",
    },
  );
}

export function createRefreshToken(userId: number) {
  return jwt.sign(
    {
      userId,
    },
    getEnv("JWT_REFRESH_SECRET"),
    {
      expiresIn: "7d",
    },
  );
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, getEnv("JWT_ACCESS_SECRET")) as
    | jwt.JwtPayload
    | string;

  if (typeof payload === "string" || typeof payload.userId !== "number") {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  return payload as AuthTokenPayload;
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, getEnv("JWT_REFRESH_SECRET")) as
    | jwt.JwtPayload
    | string;

  if (typeof payload === "string" || typeof payload.userId !== "number") {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  return payload as AuthTokenPayload;
}
