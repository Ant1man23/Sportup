# SportUp — Livrable 23 : Préparation de la Version 2

Impacts de chaque extension de la section 10.2 du cahier des charges sur la base de données, l'API, les types TypeScript, la navigation et l'état. Objectif : vérifier que l'architecture du MVP absorbe la V2 **par ajout**, sans refonte.

---

## 1. Vue d'ensemble

| Extension V2 | Base de données | API | Mobile | Effort estimé |
|---|---|---|---|---|
| Tournois complets | Nouvelles tables | Nouveaux endpoints | Nouveau stack + écrans | Élevé |
| Volleyball / tennis de table | Config + enum | Peu de changements | Config de sport + `ScoreBoard` par sets | Moyen |
| Équipes avancées / adversaires | Colonnes + invitations | Endpoints d'invitation/matching | Écrans Teams (déjà réservés) | Moyen |
| Statistiques avancées | Extension enum + table | Endpoints stats étendus | Graphiques | Moyen |
| Chat de session + notifications avancées | Tables messages/préférences | Temps réel (WebSocket/Firebase) | Écran de chat, préférences | Élevé |

---

## 2. Tournois (poules, élimination directe, classement automatique)

### Base de données

```sql
CREATE TABLE tournaments (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organizer_id  BIGINT UNSIGNED NOT NULL,
  sport_id      BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(150) NOT NULL,
  format        ENUM('groups','knockout','groups_then_knockout') NOT NULL,
  status        ENUM('draft','registration','in_progress','finished','cancelled') NOT NULL DEFAULT 'draft',
  starts_on     DATE NOT NULL,
  max_teams     SMALLINT UNSIGNED NOT NULL,
  created_at    TIMESTAMP NULL,
  updated_at    TIMESTAMP NULL,
  FOREIGN KEY (organizer_id) REFERENCES users(id),
  FOREIGN KEY (sport_id) REFERENCES sports(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tournament_teams (
  tournament_id BIGINT UNSIGNED NOT NULL,
  team_id       BIGINT UNSIGNED NOT NULL,
  group_label   CHAR(1) NULL,            -- A, B, C... pour la phase de poules
  seed          SMALLINT UNSIGNED NULL,  -- tête de série (élimination directe)
  PRIMARY KEY (tournament_id, team_id),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rattachement d'un match à un tournoi (optionnel : un match libre reste valable)
ALTER TABLE matches
  ADD COLUMN tournament_id BIGINT UNSIGNED NULL,
  ADD COLUMN stage ENUM('group','round_of_16','quarter','semi','final','third_place') NULL,
  ADD COLUMN round_number SMALLINT UNSIGNED NULL,
  ADD COLUMN team_a_id BIGINT UNSIGNED NULL,
  ADD COLUMN team_b_id BIGINT UNSIGNED NULL,
  ADD FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL;

-- Classement : table calculée à chaque fin de match de poule
CREATE TABLE tournament_standings (
  tournament_id BIGINT UNSIGNED NOT NULL,
  team_id       BIGINT UNSIGNED NOT NULL,
  played        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  wins          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  draws         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  losses        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  points_for    INT UNSIGNED NOT NULL DEFAULT 0,
  points_against INT UNSIGNED NOT NULL DEFAULT 0,
  points        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (tournament_id, team_id),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Pourquoi ça ne casse pas le MVP** : `matches.session_id` reste valable ; les colonnes ajoutées sont `NULL` pour tous les matchs existants. Le classement automatique est recalculé côté serveur (transaction à la fin du match), le mobile ne fait que l'afficher.

### API

| Endpoint | Rôle |
|---|---|
| `GET/POST /tournaments`, `GET/PUT /tournaments/{id}` | Liste, création, détail |
| `POST /tournaments/{id}/register` | Inscription d'une équipe |
| `POST /tournaments/{id}/draw` | Tirage des poules / du tableau (organisateur) |
| `GET /tournaments/{id}/standings` | Classement des poules |
| `GET /tournaments/{id}/bracket` | Arbre d'élimination directe |
| `GET /tournaments/{id}/matches` | Calendrier des matchs |

### Mobile

- Nouveau stack `TournamentsStack` : `Tournaments`, `TournamentDetails`, `CreateTournament`, `Standings`, `Bracket`, `TournamentMatches`.
- Nouveau dossier `features/tournaments/` (structure identique aux autres features, cf. Livrable 6).
- Le `LiveMatch` existant est réutilisé tel quel ; seule la fin de match déclenche en plus la mise à jour du classement côté serveur.

---

## 3. Volleyball et tennis de table

Les deux sports se jouent **par sets**, contrairement au score cumulé du football/basketball.

```sql
-- Nouveaux sports : simple insertion grâce à sports.is_active
INSERT INTO sports (name, slug, is_active) VALUES
  ('Volleyball', 'volleyball', TRUE),
  ('Tennis de table', 'table-tennis', TRUE);

-- Scores par set
CREATE TABLE match_sets (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id    BIGINT UNSIGNED NOT NULL,
  set_number  TINYINT UNSIGNED NOT NULL,
  score_team_a SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  score_team_b SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_match_set (match_id, set_number),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE match_events
  MODIFY COLUMN type ENUM('goal','basket','point','foul','card_yellow','card_red','substitution') NOT NULL;
```

**Mobile** : on étend la configuration `sportMatchConfig` (Livrable Match Basketball) avec un mode de score `scoring: 'sets'`.

```ts
const sportMatchConfig = {
  football:    { scoring: 'cumulative', periods: 2, scoreActions: [{ label: '+ But', points: 1 }] },
  basketball:  { scoring: 'cumulative', periods: 4, scoreActions: [/* +1 +2 +3 */] },
  volleyball:  { scoring: 'sets', setsToWin: 3, pointsPerSet: 25, tieBreakPoints: 15, scoreActions: [{ label: '+ Point', points: 1 }] },
  'table-tennis': { scoring: 'sets', setsToWin: 3, pointsPerSet: 11, scoreActions: [{ label: '+ Point', points: 1 }] },
};
```

`ScoreBoard` affiche alors le score du set courant et le décompte des sets gagnés. Aucun nouvel écran : `LiveMatch` reste le même.

---

## 4. Équipes avancées et recherche d'adversaires

```sql
CREATE TABLE team_invitations (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  team_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  invited_by BIGINT UNSIGNED NOT NULL,
  status     ENUM('pending','accepted','declined','expired') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE teams
  ADD COLUMN level ENUM('beginner','intermediate','advanced') NULL,
  ADD COLUMN city VARCHAR(100) NULL,
  ADD COLUMN is_looking_for_opponent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE team_members
  MODIFY COLUMN role ENUM('captain','vice_captain','member') NOT NULL DEFAULT 'member';
```

- **Recherche d'adversaires** : `GET /teams?lookingForOpponent=true&level=&lat=&lng=&radius=` (même logique que `GET /sessions`).
- **Mobile** : les routes `TeamsStack` sont déjà réservées (Livrable 3) ; on les active et on ajoute `Invitations` et `FindOpponent`.

---

## 5. Statistiques avancées

Passes décisives, rebonds, contres : ce sont de **nouveaux types d'événements**, donc l'enregistrement reste dans `match_events`.

```sql
ALTER TABLE match_events
  MODIFY COLUMN type ENUM(
    'goal','assist','basket','point','rebound','block','steal',
    'foul','card_yellow','card_red','substitution'
  ) NOT NULL;

ALTER TABLE user_sport_statistics
  ADD COLUMN assists INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN rebounds INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN blocks INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN steals INT UNSIGNED NOT NULL DEFAULT 0;

-- Historique pour les graphiques de progression
CREATE TABLE user_statistics_history (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  sport_id   BIGINT UNSIGNED NOT NULL,
  match_id   BIGINT UNSIGNED NOT NULL,
  stats_json JSON NOT NULL,              -- photo des stats du joueur sur ce match
  played_at  TIMESTAMP NOT NULL,
  INDEX idx_hist_user_sport (user_id, sport_id, played_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- **API** : `GET /users/{id}/statistics?sportId=` étendu, `GET /users/{id}/statistics/history` pour les courbes.
- **Mobile** : `MyStatistics` gagne des graphiques (librairie `victory-native` ou `react-native-gifted-charts`). La saisie de `assist/rebound/block` s'ajoute dans `MatchEventsModal` via la config par sport.

---

## 6. Chat de session et notifications push avancées

### Chat

```sql
CREATE TABLE conversations (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type       ENUM('session','team') NOT NULL,
  session_id BIGINT UNSIGNED NULL,
  team_id    BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE messages (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id       BIGINT UNSIGNED NOT NULL,
  body            TEXT NOT NULL,
  created_at      TIMESTAMP NULL,
  INDEX idx_messages_conv (conversation_id, created_at),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- **Temps réel** : Laravel Reverb / Pusher (WebSocket) côté serveur, ou Firebase. À trancher selon le coût d'hébergement ; le contrat mobile (`GET /conversations/{id}/messages`, `POST .../messages`) reste le même.
- **Mobile** : `features/chat/`, écran `Chat` accessible depuis `SessionDetails` (participants uniquement). Les messages passent par TanStack Query + abonnement WebSocket qui injecte les nouveaux messages dans le cache.
- **Sécurité** : seuls les participants de la session peuvent lire/écrire ; prévoir signalement et blocage (modération côté admin web). C'est la V2 qui introduit des contenus générés par les utilisateurs, donc à traiter dès la conception.
- **Hors-ligne** : contrairement aux actions de session, un message peut être mis en file d'attente (statut « envoi en cours »).

### Notifications avancées

```sql
CREATE TABLE notification_preferences (
  user_id         BIGINT UNSIGNED NOT NULL,
  type            VARCHAR(50) NOT NULL,   -- correspond à NotificationType
  push_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE users ADD COLUMN reminder_minutes_before SMALLINT UNSIGNED NOT NULL DEFAULT 60;
```

- **Mobile** : l'écran `Settings` reçoit une sous-page `NotificationPreferences`. Les types de notification V2 (`tournament_match_scheduled`, `new_message`, `team_invitation`...) s'ajoutent à l'union `NotificationType`.
- **Rappels** : planifiés côté serveur (jobs Laravel), le mobile n'ajoute que les préférences.

---

## 7. Navigation V2 (résumé)

```
AppStack
├── MainTabs (inchangé)
├── SessionsStack      + écran Chat (depuis SessionDetails)
├── MatchStack         (inchangé, ScoreBoard étendu aux sets)
├── TeamsStack         activé : Teams, TeamDetails, Invitations, FindOpponent...
├── TournamentsStack   NOUVEAU
└── Settings           + NotificationPreferences
```

Le `MainTabs` n'a **pas besoin d'un nouveau tab** : les tournois s'ouvrent depuis `Explore` (onglet interne « Tournois ») et depuis le profil d'équipe, pour ne pas surcharger la barre du bas.

---

## 8. Points de vigilance

1. **Les enums SQL évoluent par `ALTER`** : à chaque ajout de type d'événement, migration Laravel + mise à jour de l'union TypeScript correspondante (une seule source de vérité à garder synchronisée).
2. **Rétrocompatibilité mobile** : une V2 de l'API ne doit pas casser les versions MVP déjà installées. Prévoir le versionnement `/api/v1`, `/api/v2` et un contrôle de version minimale au `Splash`.
3. **Temps réel = nouvelle contrainte d'infrastructure** : le chat est le seul élément V2 qui impose un service serveur persistant (WebSocket). À budgéter (coût, hébergement) avant de s'engager.
4. **Volume de données** : l'historique de statistiques par match grossit vite ; prévoir pagination et agrégation (mensuelle) pour les graphiques.
5. **Tests** : les parcours e2e du Livrable 21 doivent être complétés (inscription à un tournoi, envoi d'un message hors-ligne).

---

*Fin du Livrable 23. Le MVP est conçu pour que chacune de ces extensions s'ajoute sous forme de nouvelles tables, nouveaux endpoints et nouveaux dossiers `features/`, sans refonte des modules existants.*
