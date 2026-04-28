import axios from 'axios';

const configuredApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') || '';

export const API_URL = configuredApiUrl;

function getApiConfigurationError(): string | null {
  if (!API_URL) {
    return 'Falta configurar NEXT_PUBLIC_API_URL para el frontend.';
  }

  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'https:' && API_URL.startsWith('http://')) {
      return 'NEXT_PUBLIC_API_URL usa http:// mientras el frontend corre en https://. Eso provoca mixed content y bloquea las requests.';
    }
  }

  return null;
}

export const api = axios.create({
  baseURL: API_URL || undefined,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const configurationError = getApiConfigurationError();
  if (configurationError) {
    return Promise.reject(new Error(configurationError));
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ERR_NETWORK') {
        error.message =
          'No se pudo conectar con el backend. Verifica NEXT_PUBLIC_API_URL, CORS y que la API este publicada.';
      } else {
        const responseMessage = error.response?.data?.message;
        if (typeof responseMessage === 'string' && responseMessage.trim()) {
          error.message = responseMessage;
        }
      }
    }

    return Promise.reject(error);
  },
);

export const AUTHORIZED_ADMIN_ROLES = new Set(['ADMIN', 'EDITOR']);

export function getApiErrorMessage(error: unknown, fallback: string) {
  const configurationError = getApiConfigurationError();
  if (configurationError) {
    return configurationError;
  }

  if (axios.isAxiosError(error)) {
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
