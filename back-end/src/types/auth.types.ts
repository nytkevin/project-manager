export type User = {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
};

export type SignupData = {
  name: string;
  email: string;
  password: string;
};

export type LoginData = {
  email: string;
  password: string;
};

import type { JwtPayload } from "jsonwebtoken";

export type AuthTokenPayload = JwtPayload & {
  userId: number;
};

export type AuthUserResponse = {
  user: User;
};

export type LoginResponse = {
  message: string;
  user: User;
  accessToken: string;
};
