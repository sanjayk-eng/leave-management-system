/**
 * Reusable Pagination Types
 * These interfaces provide a consistent pagination structure across the application
 */

/**
 * Pagination query parameters for API requests
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

/**
 * Pagination metadata returned from API responses
 */
export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

/**
 * Generic paginated response wrapper
 * @template T - The type of data being paginated
 *
 * WHY NO INDEX SIGNATURE:
 * The previous `[key: string]: unknown` made every field — including
 * `data`, `categories`, and `equipment` — resolve to `unknown`.
 * TypeScript widens all named fields to satisfy the index signature,
 * so `response.categories` became `unknown` instead of `T[]`, causing
 * the "Argument of type 'unknown' is not assignable to T[]" error.
 *
 * Fix: list every real field name explicitly. TypeScript now knows
 * each field's type precisely, and useState assignments type-check correctly.
 */
export interface PaginatedResponse<T> {
  message: string;
  data?: T[];        // assignments endpoint  → response.data
  categories?: T[];  // categories endpoint   → response.categories
  equipment?: T[];   // equipment endpoint    → response.equipment
  pagination?: PaginationMeta;
}

/**
 * Hook return type for paginated data
 * @template T - The type of data being paginated
 */
export interface UsePaginatedDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  // Pagination state
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  // Pagination controls
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  // Data refresh
  refetch: () => Promise<void>;
}