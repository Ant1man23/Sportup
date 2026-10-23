import { apiClient } from './client';
import { NotificationPref } from '../types';

export const notificationPreferencesApi = {
  async getPreferences(): Promise<{ reminder_minutes_before: number; preferences: NotificationPref[] }> {
    const response = await apiClient.get('/notification-preferences');
    return response.data;
  },

  async updatePreferences(reminderMinutesBefore: number, preferences: NotificationPref[]): Promise<any> {
    const response = await apiClient.put('/notification-preferences', {
      reminder_minutes_before: reminderMinutesBefore,
      preferences,
    });
    return response.data;
  },
};
