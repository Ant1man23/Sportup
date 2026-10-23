import { matchesApi, LiveMatchResponse, MatchStatisticsResponse } from '../features/matches/api/matchesApi';
import { offlineQueueService } from './offlineQueue';
import { websocketService } from './websocketService';

export type SyncConnectionStatus = 'connected' | 'reconnecting' | 'offline';

export interface MatchSyncCallbacks {
  onLiveUpdate: (live: LiveMatchResponse) => void;
  onStatsUpdate?: (stats: MatchStatisticsResponse) => void;
  onStatusChange?: (status: SyncConnectionStatus) => void;
  onError?: (error: Error) => void;
}

export class MatchLiveSyncService {
  private activeSubscriptions = new Map<number, {
    timer: NodeJS.Timeout | null;
    unsubscribeWs?: () => void;
    callbacks: MatchSyncCallbacks;
    status: SyncConnectionStatus;
    retryCount: number;
  }>();

  /**
   * Subscribe to a live match's state updates via WebSockets with adaptive polling fallback.
   */
  public subscribe(matchId: number, callbacks: MatchSyncCallbacks): () => void {
    // Stop any existing subscription for this match
    this.unsubscribe(matchId);

    const subscription = {
      timer: null as NodeJS.Timeout | null,
      unsubscribeWs: undefined as (() => void) | undefined,
      callbacks,
      status: 'connected' as SyncConnectionStatus,
      retryCount: 0,
    };

    // 1. Initial immediate REST fetch for baseline state
    this.fetchFullState(matchId);

    // 2. Try flushing offline queue in background
    offlineQueueService.flushQueue().catch(() => {});

    // 3. Connect via Realtime WebSocket (Instant Push)
    try {
      subscription.unsubscribeWs = websocketService.subscribe(
        `match.${matchId}`,
        'MatchLiveUpdated',
        (payload: any) => {
          if (payload && payload.match_id === matchId) {
            // Instant live update received through WebSocket!
            this.handleWebSocketUpdate(matchId, payload);
          }
        }
      );
    } catch {
      // Graceful fallback to polling
    }

    // 4. Adaptive Polling (Fallback or Heartbeat)
    // If WebSocket is active, poll every 20s as a quiet sync guard; otherwise every 2.5s
    const getInterval = () => (websocketService.connected ? 20000 : 2500);

    const scheduleNextPoll = () => {
      subscription.timer = setTimeout(async () => {
        await this.fetchFullState(matchId);
        if (this.activeSubscriptions.has(matchId)) {
          scheduleNextPoll();
        }
      }, getInterval());
    };

    scheduleNextPoll();

    this.activeSubscriptions.set(matchId, subscription);

    // Return cleanup callback
    return () => {
      this.unsubscribe(matchId);
    };
  }

  public unsubscribe(matchId: number): void {
    const sub = this.activeSubscriptions.get(matchId);
    if (sub) {
      if (sub.timer) {
        clearTimeout(sub.timer);
      }
      if (sub.unsubscribeWs) {
        sub.unsubscribeWs();
      }
      this.activeSubscriptions.delete(matchId);
    }
  }

  /**
   * Manually trigger an immediate sync (e.g. after adding an event or on screen focus)
   */
  public async syncNow(matchId: number): Promise<void> {
    await this.fetchFullState(matchId);
  }

  private handleWebSocketUpdate(matchId: number, payload: any): void {
    const sub = this.activeSubscriptions.get(matchId);
    if (!sub) return;

    if (sub.status !== 'connected') {
      sub.status = 'connected';
      sub.retryCount = 0;
      sub.callbacks.onStatusChange?.('connected');
    }

    // Transform broadcast payload into LiveMatchResponse shape
    const liveUpdate: Partial<LiveMatchResponse> = {
      match_id: matchId,
      status: payload.status,
      score_team_a: payload.score_team_a,
      score_team_b: payload.score_team_b,
      current_period: payload.current_period,
      period_elapsed_seconds: payload.period_elapsed_seconds,
      remaining_period_seconds: payload.remaining_period_seconds,
      is_paused: payload.is_paused,
    };

    sub.callbacks.onLiveUpdate(liveUpdate as LiveMatchResponse);
  }

  private async fetchFullState(matchId: number): Promise<void> {
    const sub = this.activeSubscriptions.get(matchId);
    if (!sub) return;

    try {
      const [liveData, statsData] = await Promise.all([
        matchesApi.getLiveMatch(matchId),
        matchesApi.getMatchStatistics(matchId).catch(() => null),
      ]);

      if (sub.status !== 'connected') {
        sub.status = 'connected';
        sub.retryCount = 0;
        sub.callbacks.onStatusChange?.('connected');
        // Flush any queued offline actions on reconnect
        offlineQueueService.flushQueue().catch(() => {});
      }

      sub.callbacks.onLiveUpdate(liveData);
      if (statsData && sub.callbacks.onStatsUpdate) {
        sub.callbacks.onStatsUpdate(statsData);
      }
    } catch (err: any) {
      sub.retryCount++;
      const newStatus: SyncConnectionStatus = sub.retryCount > 2 ? 'offline' : 'reconnecting';
      if (sub.status !== newStatus) {
        sub.status = newStatus;
        sub.callbacks.onStatusChange?.(newStatus);
      }
      sub.callbacks.onError?.(err);
    }
  }
}

export const matchLiveSync = new MatchLiveSyncService();
