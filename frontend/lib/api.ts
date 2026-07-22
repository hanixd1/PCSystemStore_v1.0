import axios from 'axios';
import { isAdminRoute } from '@/lib/adminRouting';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
export const API_URL = configuredApiUrl || '';
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith('pcs_csrf_token='))
    ?.slice('pcs_csrf_token='.length);
  return raw ? decodeURIComponent(raw) : null;
}

async function getCsrfToken(): Promise<string> {
  const cookieToken = readCsrfCookie();
  if (cookieToken) return cookieToken;
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = axios
      .get<{ csrfToken: string }>(`${API_URL}/auth/csrf-token`, { withCredentials: true })
      .then((response) => response.data.csrfToken)
      .finally(() => {
        csrfRequest = null;
      });
  }
  csrfToken = await csrfRequest;
  return csrfToken;
}

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

function toFriendlyValidationMessage(message: string): string {
  if (message.includes('confirmPassword must be a string')) {
    return 'La confirmacion de contrasena es obligatoria.';
  }

  if (message.includes('confirmPassword must be longer than or equal to 8 characters')) {
    return 'La confirmacion debe tener al menos 8 caracteres.';
  }

  if (message.includes('password must be longer than or equal to 8 characters')) {
    return 'La contrasena debe tener al menos 8 caracteres.';
  }

  if (message.includes('email must be an email')) {
    return 'Ingresa un correo valido con dominio completo.';
  }

  return message;
}

function getFriendlyResponseMessage(responseMessage: unknown): string | null {
  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return toFriendlyValidationMessage(responseMessage);
  }

  if (Array.isArray(responseMessage) && responseMessage.length > 0) {
    return responseMessage
      .map((message) => toFriendlyValidationMessage(String(message)))
      .join('\n');
  }

  return null;
}

api.interceptors.request.use(async (config) => {
  const configurationError = getApiConfigurationError();
  if (configurationError) {
    return Promise.reject(new Error(configurationError));
  }

  if (typeof window !== 'undefined' && MUTATING_METHODS.has(config.method?.toLowerCase() ?? '')) {
    config.headers.set('X-CSRF-Token', await getCsrfToken());
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const rotatedToken = (response.data as { csrfToken?: unknown } | undefined)?.csrfToken;
    if (typeof rotatedToken === 'string' && rotatedToken) csrfToken = rotatedToken;
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        clearStoredAuthSession();
      }

      if (error.code === 'ERR_NETWORK') {
        error.message =
          'No se pudo conectar con el backend. Verifica NEXT_PUBLIC_API_URL, CORS y que la API este publicada.';
      } else {
        const friendlyMessage = getFriendlyResponseMessage(error.response?.data?.message);
        if (friendlyMessage) {
          error.message = friendlyMessage;
        }
      }
    }

    return Promise.reject(error);
  },
);

export const AUTHORIZED_ADMIN_ROLES = new Set(['ADMIN', 'EDITOR']);

export function getContextToken() {
  return '';
}

export function clearStoredAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }
  csrfToken = null;

  const isAdminPath = isAdminRoute(window.location.pathname);

  if (isAdminPath) {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminSession');
  } else {
    localStorage.removeItem('customerUser');
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
    }
  } catch {
    localStorage.removeItem('user');
  }
}

export function isStoredTokenUsable() {
  return true;
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
