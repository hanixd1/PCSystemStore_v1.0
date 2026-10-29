import { useEffect } from 'react';
import { create } from 'zustand';
import { resetCartState } from '@/store/useCartStore';
import { api } from '@/lib/api';

export type CustomerSessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  profileComplete?: boolean;
};

const CUSTOMER_SESSION_EVENT = 'customer-session-changed';

export function getCustomerSession(): CustomerSessionUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = localStorage.getItem('customerUser') || localStorage.getItem('user');
  if (!rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser) as CustomerSessionUser;
    return user.role === 'CUSTOMER' ? user : null;
  } catch {
    return null;
  }
}

export function hasCustomerSession() {
  return Boolean(getCustomerSession());
}

export function clearCustomerSession() {
  if (typeof window === 'undefined') {
    return;
  }

  const currentUser = getCustomerSession();
  if (!currentUser) {
    return;
  }

  localStorage.removeItem('customerUser');

  const rawUser = localStorage.getItem('user');
  if (rawUser) {
    try {
      const parsedUser = JSON.parse(rawUser) as { role?: string };
      if (parsedUser.role === 'CUSTOMER') {
        localStorage.removeItem('user');
      }
    } catch {
      localStorage.removeItem('user');
    }
  }
  void api.post('/users/customer-logout').catch(() => undefined);
  resetCartState();
  window.dispatchEvent(new Event(CUSTOMER_SESSION_EVENT));
}

export function notifyCustomerSessionChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CUSTOMER_SESSION_EVENT));
  }
}

export function subscribeCustomerSession(listener: () => void) {
  window.addEventListener(CUSTOMER_SESSION_EVENT, listener);
  window.addEventListener('storage', listener);

  return () => {
    window.removeEventListener(CUSTOMER_SESSION_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

type CustomerSessionState = {
  customer: CustomerSessionUser | null;
  isCheckingCustomer: boolean;
};

/**
 * One session shared by every component: the header, cart, checkout and account pages read the
 * same store, so a page load triggers a single GET /users/me instead of one per component.
 */
const useCustomerSessionStore = create<CustomerSessionState>(() => ({
  customer: null,
  isCheckingCustomer: true,
}));

let inFlightSync: Promise<void> | null = null;
let listenersAttached = false;

/** The session ended on its own (expired, revoked): its cart must not survive for the next user. */
function clearStoredCustomer() {
  resetCartState();
  localStorage.removeItem('customerUser');
  const rawUser = localStorage.getItem('user');
  if (rawUser) {
    try {
      const parsedUser = JSON.parse(rawUser) as { role?: string };
      if (parsedUser.role === 'CUSTOMER') {
        localStorage.removeItem('user');
      }
    } catch {
      localStorage.removeItem('user');
    }
  }
}

async function fetchCustomer() {
  const storedCustomer = getCustomerSession();
  if (!storedCustomer) {
    useCustomerSessionStore.setState({ customer: null, isCheckingCustomer: false });
    return;
  }

  try {
    const res = await api.get('/users/me');
    const user = res.data as CustomerSessionUser;
    if (user.role !== 'CUSTOMER') {
      throw new Error('Rol cliente invalido');
    }

    localStorage.setItem('customerUser', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
    useCustomerSessionStore.setState({ customer: user, isCheckingCustomer: false });
  } catch {
    clearStoredCustomer();
    useCustomerSessionStore.setState({ customer: null, isCheckingCustomer: false });
  }
}

/** Refresh the shared session; concurrent callers share the same request. */
export function syncCustomerSession(): Promise<void> {
  inFlightSync ??= fetchCustomer().finally(() => {
    inFlightSync = null;
  });
  return inFlightSync;
}

function ensureCustomerSessionLoaded() {
  if (listenersAttached || typeof window === 'undefined') {
    return;
  }
  listenersAttached = true;
  subscribeCustomerSession(() => {
    void syncCustomerSession();
  });
  void syncCustomerSession();
}

export function useCustomerSession() {
  const customer = useCustomerSessionStore((state) => state.customer);
  const isCheckingCustomer = useCustomerSessionStore((state) => state.isCheckingCustomer);

  useEffect(() => {
    ensureCustomerSessionLoaded();
  }, []);

  return { customer, isCheckingCustomer };
}
