/**
 * localNotifications.ts
 *
 * Wraps the native Android LocalNotificationModule and provides
 * a polling-based real-time notification service.
 *
 * Works WITHOUT Firebase — uses the /api/v1/notifications endpoint
 * that already exists in the SportUp backend.
 */

import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

// ─── Native Bridge ────────────────────────────────────────────────────────────

const { LocalNotification } = NativeModules as {
  LocalNotification?: {
    show: (options: {
      title: string;
      body: string;
      type?: string;
      notificationId?: number;
    }) => void;
    cancelAll: () => void;
  };
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocalNotificationOptions {
  title: string;
  body: string;
  type?: string;
}

// ─── Notification Permission ──────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  if (Platform.Version >= 33) {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notifications SportUp',
          message: 'Autorisez SportUp à vous envoyer des notifications pour les sessions, équipes et messages.',
          buttonPositive: 'Autoriser',
          buttonNegative: 'Refuser',
        }
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  return true; // Auto-granted on Android < 13
}

// ─── Show Local Notification ──────────────────────────────────────────────────

export function showLocalNotification(options: LocalNotificationOptions): void {
  if (!LocalNotification) {
    console.warn('[LocalNotification] Native module not available on this platform.');
    return;
  }

  try {
    LocalNotification.show(options);
  } catch (e) {
    console.warn('[LocalNotification] Failed to show notification:', e);
  }
}

export function cancelAllNotifications(): void {
  LocalNotification?.cancelAll?.();
}
