/**
 * notificationPolling.ts
 *
 * Polls the /api/v1/notifications endpoint at a regular interval
 * and triggers native system notifications for new unread items.
 *
 * This is the bridge between the existing backend notification system
 * and the device's notification tray — no Firebase required.
 */

import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import { showLocalNotification } from './localNotifications';

const LAST_NOTIF_ID_KEY = '@sportup/last_notification_id';
const POLL_INTERVAL_FG  = 20_000;  // 20s when app is in foreground
const POLL_INTERVAL_BG  = 60_000;  // 60s when app is in background (if JS runs)

// ─── Notification API shape ───────────────────────────────────────────────────

interface ApiNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

class NotificationPollingService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: any = null;
  private isForeground = true;
  private lastSeenId: number | null = null;
  private isAuthenticated = false;

  // ─── Init / Teardown ────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.timer) return; // already running

    // Restore the last seen notification ID
    try {
      const stored = await AsyncStorage.getItem(LAST_NOTIF_ID_KEY);
      if (stored) this.lastSeenId = parseInt(stored, 10);
    } catch {
      /* ignore */
    }

    this.isAuthenticated = true;

    // Listen for app state changes (foreground / background)
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // First immediate poll
    await this.poll();

    // Schedule recurring polls
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.appStateSubscription?.remove?.();
    this.isAuthenticated = false;
  }

  // ─── Polling Logic ──────────────────────────────────────────────────────────

  private scheduleNext(): void {
    if (this.timer) clearTimeout(this.timer);
    const interval = this.isForeground ? POLL_INTERVAL_FG : POLL_INTERVAL_BG;
    this.timer = setTimeout(async () => {
      if (this.isAuthenticated) {
        await this.poll();
        this.scheduleNext();
      }
    }, interval);
  }

  private async poll(): Promise<void> {
    if (!this.isAuthenticated) return;

    try {
      const response = await apiClient.get<{ data: ApiNotification[] }>('/notifications', {
        params: { per_page: 10, page: 1 },
        timeout: 8000,
      });

      const notifications: ApiNotification[] = response.data?.data ?? [];
      if (!Array.isArray(notifications) || notifications.length === 0) return;

      // Détecte les nouvelles notifications non lues (ID supérieur au dernier ID traité)
      const newOnes = notifications
        .filter(n => !n.is_read)
        .filter(n => this.lastSeenId === null || n.id > this.lastSeenId);

      if (newOnes.length === 0) return;

      // Met à jour l'ID de la dernière notification traitée
      const maxId = Math.max(...newOnes.map(n => n.id));
      this.lastSeenId = maxId;
      await AsyncStorage.setItem(LAST_NOTIF_ID_KEY, String(maxId));

      // Déclenche une notification système native (uniquement en arrière-plan
      // pour éviter les doublons avec les alertes dans l'application)
      if (!this.isForeground) {
        for (const n of newOnes) {
          showLocalNotification({
            title: n.title,
            body: n.body,
            type: n.type,
          });
        }
      } else {
        // When in foreground: dispatch to in-app listeners
        for (const n of newOnes) {
          this.emitInApp(n);
        }
      }
    } catch (e: any) {
      // Silently ignore network errors (offline, etc.)
      if (e?.response?.status === 401) {
        // Token expired — stop polling
        this.stop();
      }
    }
  }

  // ─── In-App Listeners (foreground) ─────────────────────────────────────────

  private foregroundListeners: Array<(n: ApiNotification) => void> = [];

  onForegroundNotification(handler: (n: ApiNotification) => void): () => void {
    this.foregroundListeners.push(handler);
    return () => {
      this.foregroundListeners = this.foregroundListeners.filter(h => h !== handler);
    };
  }

  private emitInApp(n: ApiNotification): void {
    for (const listener of this.foregroundListeners) {
      try { listener(n); } catch { /* noop */ }
    }
  }

  // ─── App State ──────────────────────────────────────────────────────────────

  private handleAppStateChange = (state: AppStateStatus): void => {
    const wasBackground = !this.isForeground;
    this.isForeground = state === 'active';

    // Immediately poll when returning to foreground
    if (wasBackground && this.isForeground && this.isAuthenticated) {
      this.poll().then(() => this.scheduleNext());
    }
  };
}

export const notificationPolling = new NotificationPollingService();
