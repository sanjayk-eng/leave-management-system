/**
 * Date utility functions to handle timezone conversions properly
 * Uses IST (Indian Standard Time - Asia/Kolkata) for all operations
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Convert a date string from date input (YYYY-MM-DD) to ISO format with IST timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns ISO string in IST timezone (e.g., "2025-11-28T00:00:00+05:30")
 */
export function dateInputToISO(dateString: string): string {
  // Parse the date string and create a date in IST timezone
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create date string in IST format
  // Format: YYYY-MM-DDTHH:mm:ss+05:30
  const istDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+05:30`;
  
  return istDateString;
}

/**
 * Format a date string for display in IST timezone
 * @param dateString - ISO date string from backend (can be in any timezone)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in IST
 */
export function formatDate(
  dateString: string | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  if (!dateString) return 'N/A';
  
  // Extract just the date part (YYYY-MM-DD) to avoid timezone conversion issues
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  
  // Create a date object representing this date in IST
  // We use the date parts directly to avoid timezone conversion
  const date = new Date(year, month - 1, day);
  
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  // Format using IST timezone
  return date.toLocaleDateString('en-IN', { 
    ...options, 
    timeZone: IST_TIMEZONE 
  });
}

/**
 * Get date string for date input field from ISO string
 * @param isoString - ISO date string (can be in any timezone)
 * @returns Date string in YYYY-MM-DD format
 */
export function isoToDateInput(isoString: string): string {
  // Extract just the date part (YYYY-MM-DD) to avoid timezone conversion
  const datePart = isoString.split('T')[0];
  return datePart;
}

/**
 * Convert a Date object to ISO string in IST timezone
 * @param date - Date object
 * @returns ISO string in IST timezone
 */
export function dateToIST(date: Date): string {
  // Get date components in IST
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  // Return in IST format
  return `${year}-${month}-${day}T00:00:00+05:30`;
}

/**
 * Get date string in YYYY-MM-DD format for comparison (IST)
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format (IST)
 */
export function getDateString(date: Date): string {
  // Get date components in IST
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}
