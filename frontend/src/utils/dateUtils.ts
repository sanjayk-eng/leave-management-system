/**
 * Utility functions for date formatting and validation
 */

/**
 * Formats a date string for display, handling Go's zero time values
 * @param dateString - The date string to format
 * @returns Formatted date string or '-' if invalid/empty
 */
export const formatPurchaseDate = (dateString?: string): string => {
  if (!dateString) return '-';
  
  // Handle Go's zero time value
  if (dateString === '0001-01-01T00:00:00Z' || 
      dateString.startsWith('0001-01-01')) {
    return '-';
  }
  
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 1900) {
      return date.toLocaleDateString();
    }
    return '-';
  } catch {
    return '-';
  }
};

/**
 * Validates if a date string is a valid, non-zero date
 * @param dateString - The date string to validate
 * @returns true if valid date, false otherwise
 */
export const isValidDate = (dateString?: string): boolean => {
  if (!dateString) return false;
  
  // Handle Go's zero time value
  if (dateString === '0001-01-01T00:00:00Z' || 
      dateString.startsWith('0001-01-01')) {
    return false;
  }
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getFullYear() >= 1900;
  } catch {
    return false;
  }
};