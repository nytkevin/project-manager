import type {
  FormErrors,
  LoginFormValues,
  SignupFormValues,
} from "./auth.types";

export const LOGIN_INITIAL_STATE: LoginFormValues = {
  email: "",
  password: "",
};

export const SIGNUP_INITIAL_STATE: SignupFormValues = {
  fullname: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export const LOGIN_INITIAL_ERRORS: FormErrors<LoginFormValues> = {
  email: "",
  password: "",
};

export const SIGNUP_INITIAL_ERRORS: FormErrors<SignupFormValues> = {
  fullname: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};
