import { apiClient } from '../../../api/client';

export interface NotificationItem {
  id: number;
  /** V2 : tournament_match_scheduled | new_message | team_invitation | session_invitation */
  type:
    | 'participant'
    | 'spots'
    | 'reminder'
    | 'match_start'
    | 'tournament_match_scheduled'
    | 'new_message'
    | 'team_invitation'
    | 'session_invitation'
    | string;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  is_read: boolean;
  time_ago: string;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  unread_count: number;
}

export const notificationsApi = {
  getNotifications: async (): Promise<NotificationsResponse> => {
    const response = await apiClient.get<NotificationsResponse>('/notifications');
    return response.data;
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read-all');
  },

  deleteNotification: async (id: number): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },
};
