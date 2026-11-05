// src/config/passwordRules.ts

export interface ValidationRule {
  id: string;
  label: string;
  errorMessage: string;
  check: (val: string) => boolean;
}

export const PASSWORD_RULES: ValidationRule[] = [
  {
    id: "length",
    label: "8+ characters",
    errorMessage: "Password must be at least 8 characters long",
    check: (p) => p.length >= 8,
  },
  {
    id: "upper",
    label: "Uppercase letter",
    errorMessage: "An uppercase letter is missing",
    check: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lower",
    label: "Lowercase letter",
    errorMessage: "A lowercase letter is missing",
    check: (p) => /[a-z]/.test(p),
  },
  {
    id: "number",
    label: "Number (0-9)",
    errorMessage: "A number is missing",
    check: (p) => /[0-9]/.test(p),
  },
  {
    id: "symbol",
    label: "Special char (!@#$)",
    errorMessage: "A special character is missing",
    check: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
  },
];

// Helper for when you need string messages (e.g. form submit fallback)
export const getPasswordErrors = (
  password: string | null | undefined,
  confirmPassword?: string | null | undefined
): string[] => {
  if (!password) return ["Password is required"];

  const errors = PASSWORD_RULES
    .filter((rule) => !rule.check(password))
    .map((rule) => rule.errorMessage);

  if (confirmPassword !== undefined && confirmPassword !== null) {
    if (!confirmPassword) {
      errors.push("Confirm password is required");
    } else if (password !== confirmPassword) {
      errors.push("Passwords do not match");
    }
  }

  return errors;
};