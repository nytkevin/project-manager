import * as argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
import type { LoginData, SignupData } from "../types/auth.types.js";

export async function registerUser({ name, email, password }: SignupData) {
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

export async function authenticateUser({ email, password }: LoginData) {
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
