import type { JwtPayload } from "jsonwebtoken";

export type User = {
  id: number;
  fullname: string;
  username: string;
  email: string;
  createdAt: Date;
};

export type SignupData = {
  fullname: string;
  username: string;
  email: string;
  password: string;
};

export type LoginData = {
  email: string;
  password: string;
};

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

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
