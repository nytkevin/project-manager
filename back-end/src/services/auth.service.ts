import * as argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
import type { LoginData, SignupData, User } from "../types/auth.types.js";
import { verifyRefreshToken, createAccessToken } from "../utils/jwt.js";

export async function registerUser({
  name,
  email,
  password,
}: SignupData): Promise<User> {
  const normalizedEmail = email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new Error("EMAIL ALREADY EXISTS");
  }

  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
    },

    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return user;
}

export async function authenticateUser({
  email,
  password,
}: LoginData): Promise<User> {
  const normalizedEmail = email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!existingUser) {
    throw new Error("INVALID CREDENTIALS");
  }

  const passwordMatches = await argon2.verify(
    existingUser.passwordHash,
    password,
  );

  if (!passwordMatches) {
    throw new Error("INVALID CREDENTIALS");
  }

  return {
    id: existingUser.id,
    name: existingUser.name,
    email: existingUser.email,
    createdAt: existingUser.createdAt,
  };
}

export async function getUserById(userId: number): Promise<User> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return user;
}

export async function refreshUserAccessToken(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
  });

  if (!user) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const accessToken = createAccessToken(user.id);

  return accessToken;
}
