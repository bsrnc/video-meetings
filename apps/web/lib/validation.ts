export const MIN_PASSWORD_LENGTH = 8;
// bcrypt silently truncates anything past 72 bytes, so reject it up front.
export const MAX_PASSWORD_LENGTH = 72;

export function validateEmail(value: string): string | null {
  if (value.trim() === '') {
    return 'Enter your email address';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Enter a valid email address, for example you@example.com';
  }
  return null;
}

/** Sign-up rules. The API enforces the same bounds. */
export function validateNewPassword(value: string): string | null {
  if (value === '') {
    return 'Enter a password';
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`;
  }
  return null;
}

/**
 * Sign-in only checks for presence: length rules may have changed since the
 * account was created, and the API is the authority on whether it matches.
 */
export function validateExistingPassword(value: string): string | null {
  return value === '' ? 'Enter your password' : null;
}
