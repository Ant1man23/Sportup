import { Linking, Alert } from 'react-native';
import { teamsApi } from '../features/teams/api/teamsApi';

export type DeepLinkTarget =
  | { type: 'team'; teamId: number }
  | { type: 'session'; sessionId: number }
  | { type: 'match'; matchId: number }
  | { type: 'chat'; sessionId?: number; teamId?: number }
  | { type: 'tournaments' }
  | { type: 'unknown'; rawUrl: string };

export type DeepLinkHandler = (target: DeepLinkTarget) => void;

class DeepLinkService {
  private listener: DeepLinkHandler | null = null;
  private pendingTarget: DeepLinkTarget | null = null;
  private isInitialized = false;

  public init(handler: DeepLinkHandler): () => void {
    this.listener = handler;

    // Traite un deep link en attente si le handler est prêt
    if (this.pendingTarget) {
      const target = this.pendingTarget;
      this.pendingTarget = null;
      setTimeout(() => this.listener?.(target), 300);
    }

    if (!this.isInitialized) {
      this.isInitialized = true;

      // 1. Écoute les URLs arrivant pendant que l'application est en mémoire (Warm Start)
      const sub = Linking.addEventListener('url', ({ url }) => {
        this.processUrl(url);
      });

      // 2. Traite l'URL d'ouverture à froid (Cold Start)
      Linking.getInitialURL()
        .then((initialUrl) => {
          if (initialUrl) {
            this.processUrl(initialUrl);
          }
        })
        .catch((err) => {
          console.warn('[DeepLink] Erreur getInitialURL:', err);
        });

      return () => {
        sub.remove();
        this.listener = null;
      };
    }

    return () => {
      this.listener = null;
    };
  }

  /**
   * Analyse et résout une URL de lien profond (sportup:// ou https://sportup.app/...)
   */
  public async processUrl(rawUrl: string): Promise<void> {
    if (!rawUrl) return;

    try {
      const target = await this.parseUrl(rawUrl);
      if (target) {
        if (this.listener) {
          this.listener(target);
        } else {
          // Mise en attente jusqu'à l'initialisation de la navigation
          this.pendingTarget = target;
        }
      }
    } catch (e: any) {
      console.warn('[DeepLink] Échec du traitement du lien:', e);
    }
  }

  /**
   * Parse l'URL et résout le code d'équipe si nécessaire.
   */
  private async parseUrl(rawUrl: string): Promise<DeepLinkTarget | null> {
    // Normalisation des protocoles
    // Exemples supportés :
    // - sportup://team/SP-ABC123
    // - sportup://team/12
    // - sportup://session/5
    // - sportup://match/4
    // - https://sportup.app/join-team/SP-ABC123
    // - https://sportup.app/s/5
    // - https://sportup.app/sessions/5

    const clean = rawUrl.trim();

    // 1. Schéma custom : sportup://
    if (clean.startsWith('sportup://')) {
      const pathAndQuery = clean.replace('sportup://', '');
      const [path] = pathAndQuery.split('?');
      const segments = path.split('/').filter(Boolean);

      if (segments.length === 0) return null;

      const [route, param, subParam] = segments;

      // sportup://team/SP-XXXX ou sportup://team/12
      if (route === 'team' || route === 'teams' || route === 'join-team') {
        return await this.resolveTeamTarget(param);
      }

      // sportup://session/12
      if (route === 'session' || route === 'sessions' || route === 's') {
        const sessionId = parseInt(param, 10);
        if (!isNaN(sessionId)) {
          return { type: 'session', sessionId };
        }
      }

      // sportup://match/8
      if (route === 'match' || route === 'matches') {
        const matchId = parseInt(param, 10);
        if (!isNaN(matchId)) {
          return { type: 'match', matchId };
        }
      }

      // sportup://chat/session/5 ou sportup://chat/team/2
      if (route === 'chat') {
        if (param === 'team' && subParam) {
          return { type: 'chat', teamId: parseInt(subParam, 10) };
        }
        if (param === 'session' && subParam) {
          return { type: 'chat', sessionId: parseInt(subParam, 10) };
        }
      }

      // sportup://tournaments
      if (route === 'tournaments') {
        return { type: 'tournaments' };
      }
    }

    // 2. Schéma HTTPS : https://sportup.app/...
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      try {
        const urlObj = new URL(clean);
        const segments = urlObj.pathname.split('/').filter(Boolean);

        if (segments.length === 0) return null;

        const [first, second] = segments;

        // https://sportup.app/join-team/SP-XXXX ou https://sportup.app/teams/12
        if (first === 'join-team' || first === 'team' || first === 'teams') {
          return await this.resolveTeamTarget(second);
        }

        // https://sportup.app/s/5 ou https://sportup.app/sessions/5
        if (first === 's' || first === 'session' || first === 'sessions') {
          const sessionId = parseInt(second, 10);
          if (!isNaN(sessionId)) {
            return { type: 'session', sessionId };
          }
        }

        // https://sportup.app/match/8
        if (first === 'match' || first === 'matches') {
          const matchId = parseInt(second, 10);
          if (!isNaN(matchId)) {
            return { type: 'match', matchId };
          }
        }
      } catch {}
    }

    return { type: 'unknown', rawUrl };
  }

  /**
   * Résout l'identifiant numérique de l'équipe à partir d'un ID ou d'un code (SP-XXXX).
   */
  private async resolveTeamTarget(codeOrId?: string): Promise<DeepLinkTarget | null> {
    if (!codeOrId) return null;

    const trimmed = codeOrId.trim();

    // Si c'est déjà un ID entier
    const numId = parseInt(trimmed, 10);
    if (!isNaN(numId) && /^\d+$/.test(trimmed)) {
      return { type: 'team', teamId: numId };
    }

    // Sinon c'est un code d'invitation (ex: SP-A1B2C3)
    try {
      const team = await teamsApi.getTeamByCode(trimmed);
      if (team && team.id) {
        return { type: 'team', teamId: team.id };
      }
    } catch {
      Alert.alert(
        'Lien SportUp',
        `Impossible de trouver l'équipe associée au code "${trimmed}". Vérifiez le lien d'invitation.`
      );
    }

    return null;
  }
}

export const deepLinkService = new DeepLinkService();
