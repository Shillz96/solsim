// Password strength validation utility

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate password strength against security requirements
 *
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * @param password - Password to validate
 * @returns Validation result with specific error messages
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&* etc.)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get a user-friendly error message for password validation failures
 * @param result - Validation result from validatePasswordStrength
 * @returns Formatted error message
 */
export function getPasswordErrorMessage(result: PasswordValidationResult): string {
  if (result.isValid) {
    return '';
  }

  if (result.errors.length === 1) {
    return result.errors[0];
  }

  return `Password requirements not met:\n${result.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
}
