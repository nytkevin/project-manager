import type {
  FormValidator,
  LoginFormValues,
  SignupFormValues,
} from "./auth.types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string {
  const value = email.trim();

  if (!value) {
    return "Email is required.";
  }

  if (!EMAIL_REGEX.test(value)) {
    return "Please enter a valid email address.";
  }

  return "";
}

function validateSignupPassword(password: string): string {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }

  if (!/\d/.test(password)) {
    return "Password must include at least one number.";
  }

  return "";
}

export const validateLogin: FormValidator<LoginFormValues> = (values) => {
  return {
    email: validateEmail(values.email),

    password: !values.password ? "Password is required." : "",
  };
};

export const validateSignup: FormValidator<SignupFormValues> = (values) => {
  let fullnameError = "";
  let usernameError = "";
  let confirmPasswordError = "";

  const fullname = values.fullname.trim();
  const username = values.username.trim();

  if (!fullname) {
    fullnameError = "Full name is required.";
  } else if (fullname.length < 2) {
    fullnameError = "Name must be at least 2 characters.";
  }

  if (!username) {
    usernameError = "Username is required.";
  } else if (username.length < 3) {
    usernameError = "Username must be at least 3 characters.";
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    usernameError =
      "Username can only contain letters, numbers, and underscores.";
  }

  if (!values.confirmPassword) {
    confirmPasswordError = "Please confirm your password.";
  } else if (values.password !== values.confirmPassword) {
    confirmPasswordError = "Passwords do not match.";
  }

  return {
    fullname: fullnameError,
    username: usernameError,
    email: validateEmail(values.email),
    password: validateSignupPassword(values.password),
    confirmPassword: confirmPasswordError,
  };
};
