import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeApiError } from './errorHandler';
import { ENV } from '../config/env';

export const STORAGE_CUSTOM_API_KEY = '@sportup_custom_api_url';

// Default API URL configured for Physical Devices, Tunnels & Emulators
export let API_BASE_URL = ENV.API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15s timeout for degraded mobile networks
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

export const getActiveApiUrl = (): string => {
  return apiClient.defaults.baseURL || ENV.API_BASE_URL;
};

export const setCustomApiUrl = async (url: string): Promise<void> => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  apiClient.defaults.baseURL = cleanUrl;
  API_BASE_URL = cleanUrl;
  await AsyncStorage.setItem(STORAGE_CUSTOM_API_KEY, cleanUrl);
};

export const loadStoredApiUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_CUSTOM_API_KEY);
    if (saved && saved.startsWith('http')) {
      apiClient.defaults.baseURL = saved;
      API_BASE_URL = saved;
      return saved;
    }
  } catch {}
  return ENV.API_BASE_URL;
};

// Initial non-blocking load
loadStoredApiUrl().catch(() => {});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

apiClient.interceptors.request.use(async (config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    if (
      !error.response &&
      originalRequest &&
      !originalRequest._retryFallback &&
      ENV.FALLBACK_API_BASE_URL
    ) {
      originalRequest._retryFallback = true;
      const targetBase =
        originalRequest.baseURL === API_BASE_URL
          ? ENV.FALLBACK_API_BASE_URL
          : API_BASE_URL;
      originalRequest.baseURL = targetBase;
      try {
        return await axios(originalRequest);
      } catch (fallbackError) {
        return Promise.reject(normalizeApiError(fallbackError));
      }
    }
    return Promise.reject(normalizeApiError(error));
  }
);
