// Password validation utility matching backend GenerateSecurePassword format
// Format:  uppercase +  lowercase +  digits +  special characters
// Format:  8 - 20 characters 
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export const validateSecurePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  
  // Check minimum length

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (password.length > 20) {
    errors.push('Password cannot exceed 20 characters');
  }
  
  // Count character types
  const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
  const lowercaseCount = (password.match(/[a-z]/g) || []).length;
  const digitCount = (password.match(/[0-9]/g) || []).length;
  const specialCount = (password.match(/[@#$%&*!?]/g) || []).length;
  

  if (!uppercaseCount) errors.push('Add at least one uppercase letter');
  if (!lowercaseCount) errors.push('Add at least one lowercase letter');
  if (!digitCount) errors.push('Add at least one number');
  if (!specialCount) errors.push('Add at least one special character');

  // Check for invalid characters
  const validChars = /^[A-Za-z0-9@#$%&*!?]+$/;
  if (!validChars.test(password)) {
    errors.push('Password contains invalid characters. Only A-Z, a-z, 0-9, and @#$%&*!? are allowed');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};