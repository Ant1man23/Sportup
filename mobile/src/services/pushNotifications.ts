import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { devicesApi } from '../api/devicesApi';

const FCM_TOKEN_STORAGE_KEY = '@sportup/fcm_token';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: {
    type?: string;
    notification_id?: string;
    related_session_id?: string;
    related_match_id?: string;
    [key: string]: any;
  };
}

type NotificationHandler = (notification: PushNotificationPayload) => void;

class PushNotificationService {
  private listeners: NotificationHandler[] = [];

  /**
   * Request push notification permissions (Android 13+ / iOS).
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (error) {
          console.warn('[PushNotifications] Error requesting notification permission:', error);
          return false;
        }
      }
      return true; // Auto-granted on Android < 13
    }
    return true;
  }

  /**
   * Enregistre localement le token FCM et le synchronise avec l'API backend.
   */
  async registerToken(token: string): Promise<void> {
    if (!token) return;

    try {
      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      await devicesApi.registerDevice(token);
    } catch (error) {
      console.warn('[PushNotifications] Failed to sync device token with backend:', error);
    }
  }

  /**
   * Récupère le token FCM actuellement stocké en mémoire cache sécurisée.
   */
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Désenregistre le token FCM auprès du serveur lors de la déconnexion.
   */
  async unregisterToken(): Promise<void> {
    try {
      const token = await this.getStoredToken();
      if (token) {
        await devicesApi.unregisterDevice(token);
        await AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('[PushNotifications] Failed to unregister device token:', error);
    }
  }

  /**
   * Enregistre un écouteur pour les notifications reçues au premier plan.
   */
  onNotification(handler: NotificationHandler): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((h) => h !== handler);
    };
  }

  /**
   * Transmet la notification entrante à tous les écouteurs locaux enregistrés.
   */
  dispatchNotification(payload: PushNotificationPayload): void {
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (e) {
        console.error('[PushNotifications] Error in notification listener:', e);
      }
    });
  }
}

export const pushNotifications = new PushNotificationService();
