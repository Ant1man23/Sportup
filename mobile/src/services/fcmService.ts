/**
 * fcmService.ts
 *
 * Gère l'intégration Firebase Cloud Messaging (FCM) :
 *  - Demande la permission de notifications
 *  - Récupère le token FCM de l'appareil
 *  - Enregistre / désabonne le token auprès du backend SportUp
 *  - Écoute les notifications en foreground pour les afficher en toast
 *  - Configure le handler background/killed (via setBackgroundMessageHandler)
 */

import messaging from '@react-native-firebase/messaging';
import { Linking, Platform } from 'react-native';
import { apiClient } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type ForegroundHandler = (title: string, body: string) => void;
export type NotificationDataHandler = (data: Record<string, any>) => void;

// ─── Background handler (appelé quand l'app est fermée ou en background) ─────
// IMPORTANT : doit être enregistré avant tout autre code, idéalement dans index.js

export function registerBackgroundHandler(): void {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    // Le système Android affiche automatiquement la notification
    // Ce handler permet de traiter des données supplémentaires si besoin
    console.log('[FCM Background] Message reçu:', remoteMessage.messageId);
  });
}

// ─── FCM Service ──────────────────────────────────────────────────────────────

class FcmService {
  private foregroundListeners: ForegroundHandler[] = [];
  private openListeners: NotificationDataHandler[] = [];
  private unsubscribeForeground: (() => void) | null = null;
  private unsubscribeTokenRefresh: (() => void) | null = null;
  private unsubscribeOpenedApp: (() => void) | null = null;

  // ─── Initialisation ─────────────────────────────────────────────────────────

  /**
   * Initialise FCM : demande la permission, enregistre le token, écoute les messages.
   * À appeler après la connexion de l'utilisateur.
   */
  async init(): Promise<void> {
    try {
      const granted = await this.requestPermission();
      if (!granted) {
        console.log('[FCM] Permission refusée — notifications désactivées.');
        return;
      }

      // Récupérer et enregistrer le token
      await this.registerToken();

      // Écouter les changements de token (rotation automatique Firebase)
      this.unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
        console.log('[FCM] Token rafraîchi, ré-enregistrement...');
        await this.sendTokenToBackend(newToken);
      });

      // Écouter les messages en foreground
      this.unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
        console.log('[FCM Foreground] Message reçu:', remoteMessage.messageId);
        const title = remoteMessage.notification?.title ?? 'SportUp';
        const body = remoteMessage.notification?.body ?? '';
        this.emitForeground(title, body);
      });

      // Écouter quand l'utilisateur clique sur la notification (app en arrière-plan)
      this.unsubscribeOpenedApp = messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log('[FCM] Notification cliquée (background):', remoteMessage?.data);
        if (remoteMessage?.data) {
          this.emitNotificationOpened(remoteMessage.data);
        }
      });

      // Vérifier si l'app a été démarrée suite au clic sur une notification (app killed)
      messaging()
        .getInitialNotification()
        .then((remoteMessage) => {
          if (remoteMessage?.data) {
            console.log('[FCM] Notification cliquée (killed):', remoteMessage.data);
            this.emitNotificationOpened(remoteMessage.data);
          }
        })
        .catch((err) => {
          console.warn('[FCM] Erreur getInitialNotification:', err);
        });

    } catch (e) {
      console.warn('[FCM] Erreur lors de l\'initialisation:', e);
    }
  }

  /**
   * Nettoie les listeners FCM.
   * À appeler à la déconnexion de l'utilisateur.
   */
  async destroy(unregisterToken = true): Promise<void> {
    this.unsubscribeForeground?.();
    this.unsubscribeTokenRefresh?.();
    this.unsubscribeOpenedApp?.();
    this.unsubscribeForeground = null;
    this.unsubscribeTokenRefresh = null;
    this.unsubscribeOpenedApp = null;
    this.foregroundListeners = [];
    this.openListeners = [];

    if (unregisterToken) {
      await this.unregisterToken();
    }
  }

  // ─── Permission ─────────────────────────────────────────────────────────────

  private async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    }

    // Android 13+ : la permission est gérée par @react-native-firebase/messaging
    // automatiquement via le manifest. Vérification du statut actuel.
    const authStatus = await messaging().hasPermission();
    if (authStatus === messaging.AuthorizationStatus.NOT_DETERMINED) {
      const result = await messaging().requestPermission();
      return result === messaging.AuthorizationStatus.AUTHORIZED;
    }
    return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
  }

  // ─── Token Registration ──────────────────────────────────────────────────────

  private async registerToken(): Promise<void> {
    try {
      const token = await messaging().getToken();
      if (token) {
        await this.sendTokenToBackend(token);
      }
    } catch (e) {
      console.warn('[FCM] Impossible de récupérer le token:', e);
    }
  }

  private async unregisterToken(): Promise<void> {
    try {
      const token = await messaging().getToken();
      if (token) {
        await apiClient.delete('/devices', { data: { fcm_token: token } });
        console.log('[FCM] Token désenregistré du backend.');
      }
    } catch (e) {
      console.warn('[FCM] Impossible de désenregistrer le token:', e);
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      await apiClient.post('/devices', {
        fcm_token: token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      console.log('[FCM] Token enregistré sur le backend.');
    } catch (e) {
      console.warn('[FCM] Erreur lors de l\'enregistrement du token:', e);
    }
  }

  // ─── Foreground Listeners ────────────────────────────────────────────────────

  /**
   * Abonnez-vous aux notifications reçues en foreground.
   * Retourne une fonction de désabonnement.
   */
  onForegroundMessage(handler: ForegroundHandler): () => void {
    this.foregroundListeners.push(handler);
    return () => {
      this.foregroundListeners = this.foregroundListeners.filter((h) => h !== handler);
    };
  }

  private emitForeground(title: string, body: string): void {
    for (const listener of this.foregroundListeners) {
      try {
        listener(title, body);
      } catch {
        /* noop */
      }
    }
  }

  // ─── Notification Click Listeners (Navigation Deep Link) ──────────────────────

  /**
   * Écoute les clics sur les notifications (app background ou killed).
   * Retourne une fonction de désabonnement.
   */
  onNotificationOpened(handler: NotificationDataHandler): () => void {
    this.openListeners.push(handler);
    return () => {
      this.openListeners = this.openListeners.filter((h) => h !== handler);
    };
  }

  private emitNotificationOpened(data: Record<string, any>): void {
    for (const listener of this.openListeners) {
      try {
        listener(data);
      } catch (e) {
        console.warn('[FCM] Error in notification open listener:', e);
      }
    }
  }

  // ─── Direct Topic Subscriptions (Matchs en Direct & Équipes) ────────────────
  /**
   * S'abonner aux alertes de scores en direct d'un match
   */
  async subscribeToMatchUpdates(matchId: number | string): Promise<void> {
    try {
      await messaging().subscribeToTopic(`match_${matchId}`);
      console.log(`[FCM] Abonné aux alertes du match #${matchId}`);
    } catch (e) {
      console.warn(`[FCM] Erreur abonnement topic match_${matchId}:`, e);
    }
  }

  /**
   * Se désabonner des alertes d'un match
   */
  async unsubscribeFromMatchUpdates(matchId: number | string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(`match_${matchId}`);
      console.log(`[FCM] Désabonné des alertes du match #${matchId}`);
    } catch (e) {
      console.warn(`[FCM] Erreur désabonnement topic match_${matchId}:`, e);
    }
  }

  /**
   * S'abonner aux alertes de matchs d'une équipe
   */
  async subscribeToTeamUpdates(teamId: number | string): Promise<void> {
    try {
      await messaging().subscribeToTopic(`team_${teamId}`);
      console.log(`[FCM] Abonné aux alertes de l'équipe #${teamId}`);
    } catch (e) {
      console.warn(`[FCM] Erreur abonnement topic team_${teamId}:`, e);
    }
  }

  /**
   * Se désabonner des alertes d'une équipe
   */
  async unsubscribeFromTeamUpdates(teamId: number | string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(`team_${teamId}`);
      console.log(`[FCM] Désabonné des alertes de l'équipe #${teamId}`);
    } catch (e) {
      console.warn(`[FCM] Erreur désabonnement topic team_${teamId}:`, e);
    }
  }

  // ─── GPS Navigation Helper (Rappel 1h avant match) ───────────────────────────
  /**
   * Ouvre directement le terrain dans Google Maps ou Apple Maps avec guidage GPS
   */
  async openGpsNavigation(latitude: number | string, longitude: number | string, label?: string): Promise<void> {
    const lat = String(latitude);
    const lng = String(longitude);
    const query = label ? encodeURIComponent(label) : `${lat},${lng}`;

    const url = Platform.select({
      ios: `maps://app?saddr=Current%20Location&daddr=${lat},${lng}&q=${query}`,
      android: `google.navigation:q=${lat},${lng}&mode=d`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback web Google Maps
        await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
      }
    } catch (e) {
      console.warn('[FCM] Erreur ouverture navigation GPS:', e);
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    }
  }
}

export const fcmService = new FcmService();
