export type ApiErrorKind =
  | 'validation'
  | 'auth'
  | 'notFound'
  | 'conflict'
  | 'server'
  | 'network'
  | 'timeout'
  | 'unknown';

export interface ApiError {
  kind: ApiErrorKind;
  status?: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export function normalizeApiError(error: any): ApiError {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return {
        kind: 'timeout',
        message: 'La connexion a expiré (timeout 15s). Vérifie ton réseau.',
      };
    }
    return {
      kind: 'network',
      message: 'Connexion réseau indisponible. Vérifie ta connexion Internet.',
    };
  }

  const status = error.response.status;
  const data = error.response.data;

  switch (status) {
    case 401:
      return {
        kind: 'auth',
        status,
        message: data?.message || 'Session expirée. Veuillez vous reconnecter.',
      };
    case 403:
      return {
        kind: 'auth',
        status,
        message: data?.message || 'Action non autorisée.',
      };
    case 404:
      return {
        kind: 'notFound',
        status,
        message: data?.message || 'Ressource introuvable.',
      };
    case 409:
      return {
        kind: 'conflict',
        status,
        message: data?.message || 'Conflit de données ou session complète.',
      };
    case 422:
      return {
        kind: 'validation',
        status,
        message: data?.message || 'Données fournies invalides.',
        fieldErrors: data?.errors || data?.fieldErrors,
      };
    default:
      return {
        kind: 'server',
        status,
        message: data?.message || 'Une erreur serveur est survenue. Réessaye plus tard.',
      };
  }
}
