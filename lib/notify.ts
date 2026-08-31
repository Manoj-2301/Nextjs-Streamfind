/**
 * notify.ts — Smart notification wrapper for react-hot-toast
 *
 * Reads the user's `channelBrowser` preference from localStorage.
 * If the user has disabled Browser notifications, all toast calls are silently suppressed.
 * If enabled (or no preference found, defaults to ON), toasts show normally.
 *
 * Usage: import { notify } from '@/lib/notify';
 *        notify.success('Done!');
 *        notify.error('Something went wrong');
 *        notify.loading('Saving...');
 */

import toast, { ToastOptions } from 'react-hot-toast';

const CHANNEL_KEY = 'streamfind_channel_browser';

function isBrowserEnabled(): boolean {
  if (typeof window === 'undefined') return true; // SSR: always allow
  const val = localStorage.getItem(CHANNEL_KEY);
  // Default is ON (true) if no preference is set
  return val === null ? true : val === 'true';
}

export const notify = {
  success: (message: string, opts?: ToastOptions) => {
    if (!isBrowserEnabled()) return '';
    return toast.success(message, opts);
  },
  error: (message: string, opts?: ToastOptions) => {
    if (!isBrowserEnabled()) return '';
    return toast.error(message, opts);
  },
  loading: (message: string, opts?: ToastOptions) => {
    if (!isBrowserEnabled()) return '';
    return toast.loading(message, opts);
  },
  dismiss: (id?: string) => {
    return toast.dismiss(id);
  },
  custom: (message: string, opts?: ToastOptions) => {
    if (!isBrowserEnabled()) return '';
    return toast(message, opts);
  },
};

/**
 * Call this whenever the user toggles channelBrowser in their profile settings.
 * Persists the preference to localStorage so all notify calls can read it synchronously.
 */
export function syncBrowserChannelPref(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHANNEL_KEY, String(enabled));
}
