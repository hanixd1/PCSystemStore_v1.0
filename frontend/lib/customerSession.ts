import { useEffect, useState } from 'react';
import { resetCartState } from '@/store/useCartStore';

export type CustomerSessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const CUSTOMER_SESSION_EVENT = 'customer-session-changed';

export function getCustomerSession(): CustomerSessionUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token =
    localStorage.getItem('customerToken')?.trim() ||
    localStorage.getItem('token')?.trim();
  const rawUser = localStorage.getItem('customerUser') || localStorage.getItem('user');
  if (!token || !rawUser) {
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
  localStorage.removeItem('customerToken');

  const rawUser = localStorage.getItem('user');
  if (rawUser) {
    try {
      const parsedUser = JSON.parse(rawUser) as { role?: string };
      if (parsedUser.role === 'CUSTOMER') {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }
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

export function useCustomerSession() {
  const [customer, setCustomer] = useState<CustomerSessionUser | null>(null);
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncCustomer = () => {
      if (!mounted) {
        return;
      }

      setCustomer(getCustomerSession());
      setIsCheckingCustomer(false);
    };

    syncCustomer();
    const unsubscribe = subscribeCustomerSession(syncCustomer);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { customer, isCheckingCustomer };
}
