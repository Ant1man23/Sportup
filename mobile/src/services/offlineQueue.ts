import AsyncStorage from '@react-native-async-storage/async-storage';
import { matchesApi, AddMatchEventPayload } from '../features/matches/api/matchesApi';

const OFFLINE_QUEUE_KEY = '@sportup_offline_match_events_queue';

export interface QueuedMatchEvent {
  id: string;
  matchId: number;
  payload: AddMatchEventPayload;
  timestamp: number;
}

export const offlineQueueService = {
  getQueue: async (): Promise<QueuedMatchEvent[]> => {
    try {
      const json = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },

  enqueueEvent: async (matchId: number, payload: AddMatchEventPayload): Promise<void> => {
    const currentQueue = await offlineQueueService.getQueue();

    // Ensure idempotency key is always generated to prevent double-increment on retry
    if (!payload.idempotency_key) {
      payload.idempotency_key = `mobile_${matchId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    const newItem: QueuedMatchEvent = {
      id: payload.idempotency_key,
      matchId,
      payload,
      timestamp: Date.now(),
    };
    currentQueue.push(newItem);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(currentQueue));
  },

  flushQueue: async (): Promise<{ syncedCount: number; remainingCount: number }> => {
    const queue = await offlineQueueService.getQueue();
    if (queue.length === 0) return { syncedCount: 0, remainingCount: 0 };

    const remainingQueue: QueuedMatchEvent[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        await matchesApi.addMatchEvent(item.matchId, item.payload);
        syncedCount++;
      } catch (error) {
        // If sync failed, retain in queue for next retry
        remainingQueue.push(item);
      }
    }

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
    return { syncedCount, remainingCount: remainingQueue.length };
  },

  clearQueue: async (): Promise<void> => {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  },
};
