import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { clearAccessToken, getAccessToken, setTokenExchange } from "@/auth/mock-session";
import { getConfig } from "@/config/runtime.config";

/**
 * HTTP clients for Fogline's sync backend.
 * `getAxios()` injects the device Bearer token and, on a 401, re-mints it once
 * and retries. The unauthenticated client stays private — its only job is the
 * token exchange wired below.
 */
interface RetryFlag extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const TIMEOUT_MS = 15_000;

let _instance: AxiosInstance | null = null;
let _publicInstance: AxiosInstance | null = null;

function build(): AxiosInstance {
  return axios.create({
    baseURL: getConfig().apiBaseUrl,
    timeout: TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
  });
}

function getPublicAxios(): AxiosInstance {
  if (_publicInstance === null) _publicInstance = build();
  return _publicInstance;
}

interface DeviceTokenResponse {
  access_token: string;
}

// Hand the session the one call it needs, instead of letting it import this
// module back (see `setTokenExchange`).
setTokenExchange(async (deviceId) => {
  const res = await getPublicAxios().post<DeviceTokenResponse>("/auth/device", {
    device_id: deviceId,
  });
  return res.data.access_token;
});

export function getAxios(): AxiosInstance {
  if (_instance !== null) return _instance;
  const instance = build();

  instance.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryFlag | undefined;
      if (error.response?.status === 401 && original && !original._retry) {
        original._retry = true;
        clearAccessToken();
        const token = await getAccessToken();
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return instance.request(original);
        }
      }
      return Promise.reject(error);
    },
  );

  _instance = instance;
  return instance;
}
