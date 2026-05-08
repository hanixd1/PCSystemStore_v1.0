import axios, { AxiosHeaders } from 'axios';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
export const API_URL = configuredApiUrl || '';

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

  if (typeof window !== 'undefined') {
    const token = getContextToken();
    if (token) {
      if (isStoredTokenUsable()) {
        const headers = AxiosHeaders.from(config.headers);
        headers.set('Authorization', `Bearer ${token}`);
        config.headers = headers;
      } else {
        clearStoredAuthSession();
      }
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        clearStoredAuthSession();
      }

      if (error.code === 'ERR_NETWORK') {
        error.message =
          'No se pudo conectar con el backend. Verifica NEXT_PUBLIC_API_URL, CORS y que la API este publicada.';
      } else {
        const responseMessage = error.response?.data?.message;
        if (typeof responseMessage === 'string' && responseMessage.trim()) {
          error.message = responseMessage;
        } else if (Array.isArray(responseMessage) && responseMessage.length > 0) {
          error.message = responseMessage.join('\n');
        }
      }
    }

    return Promise.reject(error);
  },
);

export const AUTHORIZED_ADMIN_ROLES = new Set(['ADMIN', 'EDITOR', 'EMPLOYEE']);

export function getContextToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  const isAdminPath = window.location.pathname.startsWith('/admin');
  return (
    localStorage.getItem(isAdminPath ? 'adminToken' : 'customerToken')?.trim() ||
    localStorage.getItem('token')?.trim() ||
    ''
  );
}

export function clearStoredAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }

  const isAdminPath = window.location.pathname.startsWith('/admin');

  if (isAdminPath) {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminSession');
  } else {
    localStorage.removeItem('customerUser');
    localStorage.removeItem('customerToken');
  }

  const rawUser = localStorage.getItem('user');
  if (!rawUser) {
    return;
  }

  try {
    const parsedUser = JSON.parse(rawUser) as { role?: string };
    const shouldRemoveLegacySession = isAdminPath
      ? AUTHORIZED_ADMIN_ROLES.has(parsedUser.role || '')
      : parsedUser.role === 'CUSTOMER';

    if (shouldRemoveLegacySession) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
}

export function isStoredTokenUsable() {
  if (typeof window === 'undefined') {
    return false;
  }

  const token = getContextToken();
  if (!token) {
    return false;
  }

  const [, payload] = token.split('.');
  if (!payload) {
    return false;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );
    const decodedPayload = JSON.parse(atob(paddedPayload)) as { exp?: number };

    if (!decodedPayload.exp) {
      return true;
    }

    return decodedPayload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function isAuthenticationError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const message = String(error.response?.data?.message || error.message || '').toLowerCase();
  return error.response?.status === 401 || message.includes('token');
}

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
