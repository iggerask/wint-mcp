const SAFE_PATH_PARAM = /^[a-zA-Z0-9\-]+$/;

const MAX_ERROR_LENGTH = 2048;

/**
 * Validates and sanitizes a path parameter (GUID, integer, yearMonth, etc.).
 * Throws if the value contains traversal sequences or disallowed characters.
 */
export function sanitizePathParam(value: string | number): string {
  const str = String(value);
  if (!SAFE_PATH_PARAM.test(str)) {
    throw new Error(
      `Invalid path parameter: ${str.slice(0, 50)}. Only alphanumeric characters and hyphens are allowed.`
    );
  }
  return str;
}

/**
 * Validates that a user-provided API path is safe for the fallback tool.
 * Must start with /api/ and must not contain traversal sequences.
 */
export function validateApiPath(path: string): string {
  if (!path.startsWith("/api/")) {
    throw new Error(
      `Invalid API path: must start with /api/. Got: ${path.slice(0, 50)}`
    );
  }
  if (path.includes("..") || path.includes("//") || path.includes("\\") || path.includes("\0")) {
    throw new Error(
      `Invalid API path: contains forbidden sequence. Got: ${path.slice(0, 50)}`
    );
  }
  return path;
}

/**
 * Extracts safe error information from an axios error.
 * Never exposes error.config (which contains auth credentials).
 */
export function sanitizeErrorForOutput(error: any): {
  error: true;
  status?: number;
  message: string;
  details?: unknown;
} {
  if (error?.response) {
    const { status, data } = error.response;
    const message =
      data?.Message || data?.message || data?.title || "Request failed";

    let details: unknown = undefined;
    if (data?.Errors || data?.errors) {
      details = data.Errors || data.errors;
    }

    const result = { error: true as const, status, message, details };

    // Truncate if the serialized output is too large
    const serialized = JSON.stringify(result);
    if (serialized.length > MAX_ERROR_LENGTH) {
      return {
        error: true,
        status,
        message,
        details: "[response too large, truncated]",
      };
    }

    return result;
  }

  return { error: true, message: String(error) };
}
