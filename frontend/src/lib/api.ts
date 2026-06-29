import { toast } from "sonner";

// ─── Configuration ────────────────────────────────────────────────────────────

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8082/api";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of the authenticated user stored in localStorage. */
export interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

/** Shape of a JSON error body returned by the backend. */
interface ApiErrorBody {
  message?: string;
  error?: string | { message?: string };
  detail?: string;
  msg?: string;
  errors?: Record<string, string[]>;
  validationErrors?: Record<string, string[]>;
  details?: Record<string, string[]>;
  data?: { errors?: Record<string, string[]> };
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export const getAuthToken = (): string | null =>
  localStorage.getItem("auth_token");

export const setAuthToken = (token: string): void =>
  localStorage.setItem("auth_token", token);

export const removeAuthToken = (): void =>
  localStorage.removeItem("auth_token");

export const getCurrentUser = (): CurrentUser | null => {
  const userStr = localStorage.getItem("current_user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as CurrentUser;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: CurrentUser): void =>
  localStorage.setItem("current_user", JSON.stringify(user));

export const removeCurrentUser = (): void =>
  localStorage.removeItem("current_user");

// ─── Error classes ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown,
    public endpoint?: string,
    public validationErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Narrows an unknown catch value so we can safely read .message / .name. */
function asError(value: unknown): { message?: string; name?: string } {
  return value !== null && typeof value === "object"
    ? (value as { message?: string; name?: string })
    : {};
}

/**
 * Single source of truth for HTTP status → fallback message.
 * Used by both apiFetch (when the body has no message) and handleApiError.
 */
const STATUS_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  401: "Session expired. Please log in again.",
  403: "Access denied. You don't have permission.",
  404: "Resource not found.",
  409: "This action conflicts with existing data.",
  422: "Validation failed. Please check your input.",
  429: "Too many requests. Try again later.",
  500: "Server error. Please try again later.",
  502: "Service temporarily unavailable. Please try again.",
  503: "Service is currently down for maintenance.",
  504: "Request timeout. Please try again.",
};

// ─── Global error handler ─────────────────────────────────────────────────────

export const handleApiError = (
  error: unknown,
  navigate?: (path: string) => void,
): void => {
  if (error instanceof ApiError) {
    const { status, message, data, validationErrors, endpoint } = error;

    switch (status) {
      case 401: {
        const isLoginError =
          endpoint?.includes("/login") || endpoint?.includes("/auth/login");
        if (isLoginError) {
          toast.error(message || "Invalid email or password.");
        } else {
          removeAuthToken();
          removeCurrentUser();
          toast.error(message || STATUS_MESSAGES[401]);
          if (navigate) {
            navigate("/login");
          } else {
            window.location.href = "/login";
          }
        }
        break;
      }

      case 422: {
        if (validationErrors && Object.keys(validationErrors).length > 0) {
          const list = Object.entries(validationErrors)
            .map(([f, msgs]) => `${f}: ${msgs.join(", ")}`)
            .join("\n");
          toast.error(`Validation failed:\n${list}`, { duration: 5000 });
        } else {
          const body = data as ApiErrorBody | undefined;
          const bodyErrors = body?.errors ?? body?.data?.errors;
          if (bodyErrors) {
            const list = Object.entries(bodyErrors)
              .map(([f, msgs]) => `${f}: ${(msgs as string[]).join(", ")}`)
              .join("\n");
            toast.error(`Validation failed:\n${list}`, { duration: 5000 });
          } else {
            toast.error(message || STATUS_MESSAGES[422]);
          }
        }
        break;
      }

      default:
        toast.error(
          message || STATUS_MESSAGES[status] || "An unexpected error occurred.",
        );
        break;
    }
  } else {
    const err = asError(error);
    toast.error(err.message || "An unexpected error occurred.");
  }
};

// ─── Base fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  } else {
    delete headers["Content-Type"];
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: ApiErrorBody = {};
      let errorMessage = "";
      let validationErrors: Record<string, string[]> | undefined;

      try {
        errorData = (await response.json()) as ApiErrorBody;

        const errorObj = errorData.error;
        errorMessage =
          (typeof errorObj === "object" ? errorObj?.message : undefined) ??
          (typeof errorObj === "string" ? errorObj : undefined) ??
          errorData.message ??
          errorData.detail ??
          errorData.msg ??
          "";

        if (response.status === 422) {
          validationErrors =
            errorData.errors ??
            errorData.validationErrors ??
            errorData.details ??
            errorData.data?.errors;
        }
      } catch {
        errorMessage = response.statusText;
      }

      throw new ApiError(
        response.status,
        errorMessage ||
          STATUS_MESSAGES[response.status] ||
          "An unexpected error occurred",
        errorData,
        endpoint,
        validationErrors,
      );
    }

    return (await response.json()) as T;
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;

    const err = asError(error);

    if (
      err.name === "TypeError" ||
      err.message?.includes("fetch") ||
      err.message?.includes("Failed to fetch") ||
      err.message?.includes("NetworkError") ||
      err.message?.includes("Network request failed")
    ) {
      throw new ApiError(
        0,
        "Unable to connect to server.",
        { originalError: err.message },
        endpoint,
      );
    }

    if (err.name === "AbortError" || err.message?.includes("timeout")) {
      throw new ApiError(
        0,
        "Request timeout. Please try again.",
        { originalError: err.message },
        endpoint,
      );
    }

    throw new ApiError(
      0,
      err.message || "An unexpected error occurred.",
      { originalError: err.message },
      endpoint,
    );
  }
}

// ─── Blob fetch (PDF downloads) ───────────────────────────────────────────────

export async function apiFetchBlob(endpoint: string): Promise<Blob> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    removeCurrentUser();
    window.location.href = "/login";
    throw new ApiError(401, STATUS_MESSAGES[401], {}, endpoint);
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.statusText ||
        STATUS_MESSAGES[response.status] ||
        "Failed to fetch file.",
      {},
      endpoint,
    );
  }

  return response.blob();
}

// ─── API client ───────────────────────────────────────────────────────────────

export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: "GET" }),

  post: <T>(endpoint: string, data?: unknown) =>
    apiFetch<T>(endpoint, {
      method: "POST",
      body:
        data instanceof FormData
          ? data
          : data
            ? JSON.stringify(data)
            : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown) =>
    apiFetch<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    apiFetch<T>(endpoint, {
      method: "PUT",
      body:
        data instanceof FormData
          ? data
          : data
            ? JSON.stringify(data)
            : undefined,
    }),

  delete: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: "DELETE" }),

  deleteWithBody: <T>(endpoint: string, data: unknown) =>
    apiFetch<T>(endpoint, {
      method: "DELETE",
      body: JSON.stringify(data),
    }),
};
