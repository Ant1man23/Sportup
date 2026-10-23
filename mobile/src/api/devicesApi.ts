import { apiClient } from './client';
import { Platform } from 'react-native';

export const devicesApi = {
  /**
   * Enregistre ou met à jour le token FCM de l'appareil sur le backend.
   */
  async registerDevice(fcmToken: string, platform?: 'android' | 'ios'): Promise<void> {
    await apiClient.post('/devices', {
      fcmToken,
      platform: platform || (Platform.OS === 'ios' ? 'ios' : 'android'),
    });
  },

  /**
   * Désenregistre le token FCM de l'appareil lors de la déconnexion.
   */
  async unregisterDevice(fcmToken: string): Promise<void> {
    await apiClient.delete('/devices', {
      data: { fcmToken },
    });
  },
};
