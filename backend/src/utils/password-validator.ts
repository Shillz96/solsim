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
 *
 * @param password - Password to validate
 * @returns Validation result with specific error messages
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long');
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
