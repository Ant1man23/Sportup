import { Platform } from 'react-native';
import { apiClient } from './client';
import { ConversationMessage } from '../types';

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  city?: string | null;
  level?: string | null;
  role?: string | null;
  photo_path?: string | null;
}

export interface ConversationItem {
  id: number;
  type: 'session' | 'team';
  title: string;
  subtitle: string;
  session_id?: number | null;
  team_id?: number | null;
  last_message?: {
    body: string;
    sender?: string;
    created_at?: string;
  } | null;
  messages_count: number;
}

export const chatApi = {
  async getSessionConversation(sessionId: number): Promise<{ id: number; messages: ConversationMessage[] }> {
    const response = await apiClient.get(`/sessions/${sessionId}/conversation`);
    return response.data;
  },

  async getTeamConversation(teamId: number): Promise<{ id: number; messages: ConversationMessage[] }> {
    const response = await apiClient.get(`/teams/${teamId}/conversation`);
    return response.data;
  },

  async getUserConversations(): Promise<ConversationItem[]> {
    const response = await apiClient.get('/conversations');
    return response.data;
  },

  async getMessages(conversationId: number): Promise<ConversationMessage[]> {
    const response = await apiClient.get(`/conversations/${conversationId}/messages`);
    return response.data;
  },

  async sendMessage(
    conversationId: number,
    body?: string,
    imageFile?: { uri: string; type?: string; fileName?: string }
  ): Promise<ConversationMessage> {
    if (imageFile) {
      const formData = new FormData();
      if (body) {
        formData.append('body', body);
      }
      formData.append('image', {
        uri: Platform.OS === 'android' ? imageFile.uri : imageFile.uri.replace('file://', ''),
        type: imageFile.type || 'image/jpeg',
        name: imageFile.fileName || `chat_${Date.now()}.jpg`,
      } as any);

      const response = await apiClient.post(`/conversations/${conversationId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }

    const response = await apiClient.post(`/conversations/${conversationId}/messages`, { body: body || '' });
    return response.data;
  },

  async searchUsers(query: string): Promise<UserSummary[]> {
    if (!query || query.trim().length < 2) return [];
    const response = await apiClient.get('/users/search', { params: { q: query.trim() } });
    return Array.isArray(response.data) ? response.data : [];
  },

  async inviteToSession(
    sessionId: number,
    target: { user_id?: number; username?: string; email?: string }
  ): Promise<{ message: string; user?: UserSummary }> {
    const response = await apiClient.post(`/sessions/${sessionId}/invite`, target);
    return response.data;
  },

  async inviteToTeam(
    teamId: number,
    target: { user_id?: number; username?: string; email?: string }
  ): Promise<{ message: string; invitation?: any }> {
    const response = await apiClient.post(`/teams/${teamId}/invitations`, target);
    return response.data;
  },
};
