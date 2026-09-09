import { ChangeEventHandler, ReactNode } from "react";

export type AuthFormValues = {
  fullname: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginFormValues = Pick<AuthFormValues, "email" | "password">;

export type SignupFormValues = Pick<
  AuthFormValues,
  "fullname" | "username" | "email" | "password" | "confirmPassword"
>;

export type LoginPayload = Pick<AuthFormValues, "email" | "password">;

export type SignupPayload = Pick<
  AuthFormValues,
  "fullname" | "username" | "email" | "password"
>;

export type FormErrors<T extends object> = Partial<{
  [K in keyof T]: string;
}>;

export type FormValidator<T extends object> = (values: T) => FormErrors<T>;

export type AuthFieldProps = {
  label: string;
  name: keyof AuthFormValues;
  type: "text" | "email" | "password";
  value: string;
  error?: string;
  placeholder: string;
  hint: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export type AuthCardProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};
