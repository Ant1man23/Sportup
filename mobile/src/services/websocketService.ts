import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useAuthStore } from '../store/useAuthStore';
import { getActiveApiUrl } from '../api/client';

export interface WebSocketConfig {
  appKey: string;
  host?: string;
  port?: number;
  scheme?: 'ws' | 'wss';
  cluster?: string;
  heartbeatIntervalMs?: number;
}

export type ChannelCallback = (data: any) => void;

interface PendingPrivateSub {
  channel: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private socketId: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 8;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingIntervalTimer: NodeJS.Timeout | null = null;
  private channels = new Map<string, Map<string, ChannelCallback[]>>();
  private subscribedChannels = new Set<string>();
  private pendingPrivateSubs: PendingPrivateSub[] = [];
  private netInfoUnsubscribe: (() => void) | null = null;
  private lastConfig?: Partial<WebSocketConfig>;

  constructor() {
    this.initNetInfoListener();
  }

  public get connected(): boolean {
    return this.isConnected;
  }

  public get currentSocketId(): string | null {
    return this.socketId;
  }

  /**
   * Surveillance du réseau via NetInfo : reconnexion automatique au retour du réseau.
   */
  private initNetInfoListener(): void {
    if (this.netInfoUnsubscribe) return;

    this.netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        // Le réseau est de retour : réinitialiser les compteurs et reconnecter
        if (!this.isConnected && this.subscribedChannels.size > 0) {
          this.reconnectAttempts = 0;
          this.connect(this.lastConfig);
        }
      } else {
        // Hors ligne
        this.isConnected = false;
        this.stopHeartbeat();
      }
    });
  }

  /**
   * Initialise et connecte la socket au serveur Reverb / Pusher.
   */
  public connect(config?: Partial<WebSocketConfig>): void {
    this.lastConfig = config;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const appKey = config?.appKey || 'sportup-key';
    const host = config?.host || this.deriveWsHost();
    const port = config?.port || (this.isHttps() ? 443 : 8080);
    const scheme = config?.scheme || (this.isHttps() ? 'wss' : 'ws');

    let wsUrl: string;
    if (config?.cluster) {
      wsUrl = `wss://ws-${config.cluster}.pusher.com/app/${appKey}?protocol=7&client=js&version=8.4.0`;
    } else {
      const portSuffix = (scheme === 'wss' && port === 443) || (scheme === 'ws' && port === 80) ? '' : `:${port}`;
      wsUrl = `${scheme}://${host}${portSuffix}/app/${appKey}?protocol=7&client=js&version=8.4.0`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat(config?.heartbeatIntervalMs || 25000);

        // Réabonnement automatique à tous les canaux enregistrés
        this.subscribedChannels.forEach((channel) => {
          this.sendSubscription(channel);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleIncomingMessage(message);
        } catch {
          // Payload brut ou malformé
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.stopHeartbeat();
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.socketId = null;
        this.stopHeartbeat();
        this.scheduleReconnect(config);
      };
    } catch {
      this.isConnected = false;
      this.stopHeartbeat();
      this.scheduleReconnect(config);
    }
  }

  /**
   * S'abonne à un canal temps réel et écoute les événements diffusés.
   * Gère les canaux publics ainsi que les canaux privés ('private-*') et présence ('presence-*').
   */
  public subscribe(channel: string, event: string, callback: ChannelCallback): () => void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Map());
    }

    const eventMap = this.channels.get(channel)!;
    if (!eventMap.has(event)) {
      eventMap.set(event, []);
    }

    eventMap.get(event)!.push(callback);
    this.subscribedChannels.add(channel);

    if (this.isConnected) {
      this.sendSubscription(channel);
    } else {
      this.connect(this.lastConfig);
    }

    return () => {
      this.unsubscribe(channel, event, callback);
    };
  }

  /**
   * Se désabonne d'un événement ou d'un canal entier.
   */
  public unsubscribe(channel: string, event?: string, callback?: ChannelCallback): void {
    const eventMap = this.channels.get(channel);
    if (!eventMap) return;

    if (event && callback) {
      const callbacks = eventMap.get(event) || [];
      const filtered = callbacks.filter((cb) => cb !== callback);
      if (filtered.length > 0) {
        eventMap.set(event, filtered);
      } else {
        eventMap.delete(event);
      }
    } else if (event) {
      eventMap.delete(event);
    } else {
      this.channels.delete(channel);
      this.subscribedChannels.delete(channel);
      if (this.isConnected) {
        this.sendUnsubscription(channel);
      }
    }

    if (eventMap.size === 0) {
      this.channels.delete(channel);
      this.subscribedChannels.delete(channel);
      if (this.isConnected) {
        this.sendUnsubscription(channel);
      }
    }
  }

  /**
   * Ferme manuellement la connexion WebSocket et nettoie les timers.
   */
  public disconnect(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.isConnected = false;
    this.socketId = null;
  }

  /**
   * Démarre le ping client périodique (toutes les 25 secondes) pour franchir les routeurs NAT opérateurs.
   */
  private startHeartbeat(intervalMs: number): void {
    this.stopHeartbeat();
    this.pingIntervalTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
        } catch {}
      }
    }, intervalMs);
  }

  private stopHeartbeat(): void {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  /**
   * Envoie la commande de souscription. Si le canal est privé, effectue l'appel d'authentification Sanctum.
   */
  private async sendSubscription(channel: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const isPrivate = channel.startsWith('private-') || channel.startsWith('presence-');

    if (!isPrivate) {
      // Canal public direct
      this.ws.send(
        JSON.stringify({
          event: 'pusher:subscribe',
          data: { channel },
        })
      );
      return;
    }

    // Canal privé ou présence : nécessite un socket_id
    if (!this.socketId) {
      this.pendingPrivateSubs.push({ channel });
      return;
    }

    try {
      const authData = await this.authenticateChannel(channel, this.socketId);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            event: 'pusher:subscribe',
            data: {
              channel,
              auth: authData.auth,
              channel_data: authData.channel_data,
            },
          })
        );
      }
    } catch (e) {
      console.warn(`[WebSocket] Échec d'authentification pour le canal ${channel}:`, e);
    }
  }

  /**
   * Authentifie un canal privé auprès de l'API Laravel Sanctum.
   */
  private async authenticateChannel(
    channel: string,
    socketId: string
  ): Promise<{ auth: string; channel_data?: string }> {
    const token = useAuthStore.getState().token;
    const baseUrl = getActiveApiUrl().replace(/\/+$/, '');
    const authEndpoint = `${baseUrl}/broadcasting/auth`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(authEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        socket_id: socketId,
        channel_name: channel,
      }),
    });

    if (!response.ok) {
      throw new Error(`Broadcasting auth failed with HTTP ${response.status}`);
    }

    return await response.json();
  }

  private sendUnsubscription(channel: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            event: 'pusher:unsubscribe',
            data: { channel },
          })
        );
      } catch {}
    }
  }

  private handleIncomingMessage(message: any): void {
    // 1. Handshake Pusher : réception du socket_id
    if (message.event === 'pusher:connection_established') {
      try {
        const payload = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
        if (payload?.socket_id) {
          this.socketId = payload.socket_id;

          // Traiter les canaux privés en attente
          const toSubscribe = [...this.pendingPrivateSubs];
          this.pendingPrivateSubs = [];
          toSubscribe.forEach((sub) => {
            this.sendSubscription(sub.channel);
          });
        }
      } catch {}
      return;
    }

    // 2. Traitement ping / pong
    if (message.event === 'pusher:ping') {
      try {
        this.ws?.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
      } catch {}
      return;
    }
    if (message.event === 'pusher:pong') {
      return;
    }

    // 3. Événements sur les canaux enregistrés
    const { channel, event } = message;
    let data = message.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        // Texte brut conservé
      }
    }

    if (channel && event && this.channels.has(channel)) {
      const eventMap = this.channels.get(channel)!;
      const callbacks = eventMap.get(event) || [];
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.warn('WebSocket callback error:', e);
        }
      });
    }
  }

  private scheduleReconnect(config?: Partial<WebSocketConfig>): void {
    if (this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Pause longue (30s) au lieu d'un abandon définitif
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.connect(config);
      }, 30000);
      return;
    }

    this.reconnectAttempts++;
    const delayMs = Math.min(1000 * Math.pow(1.8, this.reconnectAttempts), 20000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(config);
    }, delayMs);
  }

  private isHttps(): boolean {
    const url = getActiveApiUrl();
    return url.startsWith('https');
  }

  private deriveWsHost(): string {
    try {
      const parsed = new URL(getActiveApiUrl());
      return parsed.hostname;
    } catch {
      return '192.168.0.194';
    }
  }
}

export const websocketService = new WebSocketService();
