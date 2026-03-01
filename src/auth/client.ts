import axios, { AxiosInstance } from "axios";

export const BASE_URL = "https://superkollapi.wint.se";

const REQUEST_TIMEOUT = 30_000;

export class WintApiClient {
  private client: AxiosInstance;

  constructor(injectedClient?: AxiosInstance) {
    if (injectedClient) {
      this.client = injectedClient;
      return;
    }

    const username = process.env.WINT_USERNAME;
    const apiKey = process.env.WINT_API_KEY;
    if (!username || !apiKey) {
      throw new Error("WINT_USERNAME and WINT_API_KEY environment variables are required");
    }

    this.client = axios.create({
      baseURL: BASE_URL,
      auth: { username, password: apiKey },
      timeout: REQUEST_TIMEOUT,
    });
  }

  async request<T = any>(
    method: string,
    path: string,
    options?: {
      params?: Record<string, any>;
      data?: any;
    }
  ): Promise<T> {
    console.error(`[wint] ${method} ${path}`);
    const response = await this.client.request<T>({
      method,
      url: path,
      params: options?.params,
      data: options?.data,
    });
    return response.data;
  }

  async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async post<T = any>(path: string, data?: any, params?: Record<string, any>): Promise<T> {
    return this.request<T>("POST", path, { data, params });
  }

  async put<T = any>(path: string, data?: any, params?: Record<string, any>): Promise<T> {
    return this.request<T>("PUT", path, { data, params });
  }

  async delete<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>("DELETE", path, { params });
  }
}

let _wintClient: WintApiClient | null = null;

export function getWintClient(): WintApiClient {
  if (!_wintClient) {
    _wintClient = new WintApiClient();
  }
  return _wintClient;
}

/** @deprecated Use getWintClient() instead — kept for backward compat during migration */
export const wintClient: WintApiClient = new Proxy({} as WintApiClient, {
  get(_target, prop) {
    return (getWintClient() as any)[prop];
  },
});
