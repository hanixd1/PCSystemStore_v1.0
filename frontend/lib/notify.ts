'use client';

export type NotifyType = 'success' | 'error' | 'info' | 'warning';

export type NotifyPayload = {
  type?: NotifyType;
  message: string;
};

export type ConfirmPayload = {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
};

export const APP_NOTIFY_EVENT = 'pcsystemstore:notify';
export const APP_CONFIRM_EVENT = 'pcsystemstore:confirm';

export function notify(payload: NotifyPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(APP_NOTIFY_EVENT, { detail: payload }));
}

notify.success = (message: string) => notify({ type: 'success', message });
notify.error = (message: string) => notify({ type: 'error', message });
notify.info = (message: string) => notify({ type: 'info', message });
notify.warning = (message: string) => notify({ type: 'warning', message });

export function confirmAction(payload: ConfirmPayload): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent(APP_CONFIRM_EVENT, {
        detail: {
          ...payload,
          resolve,
        },
      }),
    );
  });
}
