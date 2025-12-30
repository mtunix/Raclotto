import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { ApiError } from "./types";
import { useAuthStore } from "../../AuthSlice";

// Type declaration for deserialize-json-api since it doesn't have TypeScript types
type DeserializeFunction = (data: unknown) => {
  data: unknown;
  jsonapi?: Record<string, unknown>;
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const deserialize = require("deserialize-json-api")
  .deserialize as DeserializeFunction;

const CONTENT_TYPE = "application/vnd.api+json";

export function getHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": CONTENT_TYPE,
    Accept: CONTENT_TYPE,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

function handleAuthError(error: AxiosError) {
  if (error.response?.status === 401) {
    // Clear auth state and redirect to login
    useAuthStore.getState().logout();
    // Redirect will be handled by ProtectedRoute component
    throw new Error("Unauthorized");
  }
  throw error;
}

export type JsonApiResponse = {
  data: unknown;
  jsonapi?: Record<string, unknown>;
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

export const onErrorRetry = (
  error: ApiError,
  key: string,
  config: unknown,
  revalidate: (options: { retryCount: number }) => void,
  { retryCount }: { retryCount: number },
) => {
  if (error.status === 404) return;

  if (retryCount >= 10) return;

  setTimeout(
    () => revalidate({ retryCount: retryCount + 1 }),
    200 * retryCount,
  );
};

export async function get(endpoint: string) {
  try {
    let response: AxiosResponse = await axios.get(endpoint, {
      headers: getHeaders(),
    });
    return deserialize(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      handleAuthError(error);
    }
    console.error("Error:", error);
    throw error;
  }
}

export async function getRaw(endpoint: string, config?: AxiosRequestConfig) {
  try {
    let response: AxiosResponse = await axios.get(endpoint, {
      ...config,
      headers: {
        ...getHeaders(),
        ...config?.headers,
      },
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      handleAuthError(error);
    }
    console.error("Error:", error);
    throw error;
  }
}

export async function postRaw(
  endpoint: string,
  data?: unknown,
  config?: AxiosRequestConfig,
) {
  try {
    let response: AxiosResponse = await axios.post(endpoint, data, {
      ...config,
      headers: {
        ...getHeaders(),
        ...config?.headers,
      },
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      handleAuthError(error);
    }
    console.error("Error:", error);
    throw error;
  }
}

export async function post(endpoint: string, data: string) {
  try {
    let response: AxiosResponse = await axios.post(endpoint, data, {
      headers: getHeaders(),
    });
    return deserialize(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      handleAuthError(error);
    }
    console.error("Error:", error);
    throw error;
  }
}

export async function patch(endpoint: string, data: string) {
  try {
    let response: AxiosResponse = await axios.patch(endpoint, data, {
      headers: getHeaders(),
    });
    if (response.status >= 200 && response.status < 300) {
      return deserialize(response.data);
    }
    throw new Error(`Patch request failed with status ${response.status}`);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      handleAuthError(error);
    }
    console.error("Error:", error);
    throw error;
  }
}

export async function del(endpoint: string) {
  try {
    let response: AxiosResponse = await axios.delete(endpoint, {
      headers: getHeaders(),
    });
    return response;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      handleAuthError(error);
    }
    console.error("Error:", error);
    throw error;
  }
}
