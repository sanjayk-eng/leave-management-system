// Simplified equipment utilities - backend handles all business logic and validation

/**
 * Formats equipment price for display
 * @param price - The price number
 * @returns Formatted price string
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};