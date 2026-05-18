import { useEffect, useState } from 'react';
import { resetCartState } from '@/store/useCartStore';
import { api } from '@/lib/api';

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

export function useCustomerSession() {
  const [customer, setCustomer] = useState<CustomerSessionUser | null>(null);
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncCustomer = async () => {
      if (!mounted) {
        return;
      }

      const storedCustomer = getCustomerSession();
      if (!storedCustomer) {
        setCustomer(null);
        setIsCheckingCustomer(false);
        return;
      }

      try {
        const res = await api.get('/users/me');
        if (!mounted) {
          return;
        }

        const user = res.data as CustomerSessionUser;
        if (user.role !== 'CUSTOMER') {
          throw new Error('Rol cliente invalido');
        }

        localStorage.setItem('customerUser', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));
        setCustomer(user);
      } catch {
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
        setCustomer(null);
      } finally {
        if (mounted) {
          setIsCheckingCustomer(false);
        }
      }
    };

    void syncCustomer();
    const unsubscribe = subscribeCustomerSession(() => {
      void syncCustomer();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { customer, isCheckingCustomer };
}
