# SportUp — Spécification du Contrat API REST (v1)

Base URL : `https://api.sportup.app/api/v1`  
Authentification : `Authorization: Bearer <sanctum_token>`

---

## 1. Endpoints Authentification (`/auth`)

### `POST /auth/register`
* **Public**
* **Body** :
  ```json
  {
    "username": "karim_b",
    "email": "karim@example.com",
    "password": "Password123!",
    "password_confirmation": "Password123!",
    "city": "Antananarivo"
  }
  ```
* **Response 201 Created** :
  ```json
  {
    "token": "1|sanctum_token_string...",
    "user": {
      "id": 12,
      "username": "karim_b",
      "email": "karim@example.com",
      "city": "Antananarivo",
      "level": "intermediate",
      "photo": null
    }
  }
  ```

### `POST /auth/login`
* **Public**
* **Body** :
  ```json
  {
    "email": "karim@example.com",
    "password": "Password123!"
  }
  ```
* **Response 200 OK** : `AuthResponse` (token + user object).
* **Response 401 Unauthorized** : Identifiants invalides.

### `POST /auth/logout`
* **Auth Requise**
* **Response 204 No Content**

### `GET /auth/me`
* **Auth Requise**
* **Response 200 OK** : Profil complet de l'utilisateur connecté.

---

## 2. Endpoints Profil (`/profile` & `/users`)

### `GET /profile`
* **Auth Requise**
* **Response 200 OK** : Détails du profil connecté avec sports favoris.

### `PUT /profile`
* **Auth Requise**
* **Body** : `multipart/form-data` (si photo incluse)
  - `username` (optionnel)
  - `city` (optionnel)
  - `level` (optionnel : `beginner`, `intermediate`, `advanced`)
  - `favorite_sports` (array of sport_ids)
  - `photo` (image file optionnelle)

### `GET /users/{id}`
* **Auth Requise**
* **Response 200 OK** : Profil public du joueur (statistiques publiques, sports favoris, victoires).

---

## 3. Endpoints Sessions (`/sessions`)

### `GET /sessions`
* **Auth Requise**
* **Query Params** :
  - `lat` (float, optionnel)
  - `lng` (float, optionnel)
  - `radius` (int in km, default 10)
  - `sport_id` (int, optionnel)
  - `date` (ISO date string, optionnel)
  - `level` (enum, optionnel)
  - `type` (enum, optionnel)
  - `page` (int, default 1)
* **Response 200 OK** : Liste paginée des sessions avec distance calculée si `lat`/`lng` fournis.

### `GET /sessions/nearby`
* **Auth Requise**
* **Query Params** : `lat`, `lng`, `radius`
* **Response 200 OK** : Fast lookup des sessions géolocalisées autour des coordonnées.

### `GET /sessions/{id}`
* **Auth Requise**
* **Response 200 OK** : Détail complet de la session, statut, créateur, liste des participants, et id du match lié.

### `POST /sessions`
* **Auth Requise**
* **Body** :
  ```json
  {
    "sport_id": 1,
    "type": "free_match",
    "format": "5v5",
    "session_date": "2026-09-25",
    "start_time": "18:00",
    "latitude": -18.8792,
    "longitude": 47.5079,
    "address": "Stade Municipal de Mahamasina",
    "city": "Antananarivo",
    "level": "intermediate",
    "max_participants": 10,
    "description": "Five amical du vendredi soir."
  }
  ```
* **Response 201 Created**

### `PUT /sessions/{id}`
* **Auth Requise (Organisateur uniquement)**

### `DELETE /sessions/{id}`
* **Auth Requise (Organisateur uniquement)** : Annulation de la session.

### `POST /sessions/{id}/join`
* **Auth Requise** : Inscription du joueur connecté.
* **Response 200 OK** : Mise à jour de la session.
* **Response 409 Conflict** : Session déjà complète, annulée ou joueur déjà inscrit.

### `DELETE /sessions/{id}/leave`
* **Auth Requise** : Retrait du joueur de la session.

---

## 4. Endpoints Matchs & Scoreboard en Direct (`/matches`)

### `GET /matches/{id}`
* **Public / Auth** : Détails complets du match (score, période, chrono officiel, roster des joueurs, statut sur le terrain et fil d'événements).

### `GET /matches/{id}/live`
* **Public / Spectateur** : Instantané ultra-rapide et synchronisé pour l'affichage en direct du scoreboard :
  - Score en direct Équipe A / Équipe B
  - Période courante (Q1, Q2, Q3, Q4, OT) & temps restant dans le quart-temps
  - Fautes d'équipe par quart-temps avec drapeau de pénalité (5+ fautes)
  - Horodatage serveur pour synchronisation stricte du chronomètre
  - Répartition des points par quart-temps et statistiques collectives
  - Dernier événement enregistré

### `GET /matches/{id}/statistics`
* **Public / Spectateur** : Statistiques complètes du match :
  - **Statistiques collectives** : Points, 2PT (M/A/%), 3PT (M/A/%), FT (M/A/%), FG global (M/A/%), Rebonds (Off/Déf/Total), Passes décisives, Interceptions, Contres, Balles perdues, Fautes, Répartition des points par quart-temps.
  - **Statistiques individuelles (Boxscore)** : Fiche joueur avec numéro de maillot, temps de jeu calculé (MIN:SEC), points, tirs réussis/tentés/%, rebonds, passes, interceptions, contres, pertes de balle, fautes et statut sur le terrain / banc.

### `POST /sessions/{id}/match/start`
* **Auth Requise (Organisateur)** : Démarre le match et initialise le chronomètre officiel.
* **Body** :
  ```json
  {
    "total_periods": 4,
    "period_duration_seconds": 600
  }
  ```

### `POST /matches/{id}/pause` & `POST /matches/{id}/resume`
* **Auth Requise (Organisateur)** : Met en pause / reprend le chronomètre officiel du match côté serveur et diffuse l'événement en direct.

### `POST /matches/{id}/next-period`
* **Auth Requise (Organisateur)** : Clôt le quart-temps actuel, cumule le temps de jeu des joueurs sur le terrain, remet à zéro les fautes d'équipe, avance à la période suivante (ou prolongation OT) et diffuse l'état en direct.

### `POST /matches/{id}/events`
* **Auth Requise (Organisateur)** : Enregistre un événement de match validé par le backend avec clé d'idempotence anti-doublon.
* **Body (Basketball - Panier)** :
  ```json
  {
    "type": "basket",
    "team_side": "team_a",
    "player_id": 8,
    "related_player_id": 14,
    "points": 3,
    "shot_type": "3pt",
    "idempotency_key": "client_uuid_abc_123"
  }
  ```
* **Body (Basketball - Tir Manqué / Rebond / Faute)** :
  ```json
  {
    "type": "missed_shot",
    "team_side": "team_b",
    "player_id": 23,
    "shot_type": "2pt"
  }
  ```
* **Body (Basketball - Remplacement)** :
  ```json
  {
    "type": "substitution",
    "team_side": "team_a",
    "sub_out_player_id": 8,
    "sub_in_player_id": 19
  }
  ```

### `DELETE /matches/{id}/events/{eventId}` & `POST /matches/{id}/events/{eventId}/cancel`
* **Auth Requise (Organisateur)** : Annule / corrige un événement erroné. Recalcule automatiquement le score officiel et les statistiques sans incohérence, puis diffuse la correction.

### `POST /matches/{id}/players`
* **Auth Requise (Organisateur)** : Met à jour la composition de match, les numéros de maillots et les statuts titulaire / remplaçant.

### `POST /matches/{id}/finish`
* **Auth Requise (Organisateur)** : Clôture officiellement le match, arrête le chronomètre, consolide les classements de tournoi et enregistre les statistiques des joueurs dans leur historique.

---

## 5. Diffusion en Temps Réel (Broadcasting WebSockets)

* **Canal Public** : `match.{id}` (Spectateurs, Joueurs, Abonnés)
* **Canal Privé** : `private-match.{id}.organizer` (Contrôle organisateur)
* **Événement diffusé** : `MatchLiveUpdated`
* **Payload diffusé** : État complet instantané (score, chrono, fautes, période, stats collectives, scores par quart-temps, dernier événement).
* **Stratégie de reconnexion** : En cas de coupure réseau, le client mobile tente la reconnexion automatique avec backoff exponentiel et réhydrate l'état complet via `GET /matches/{id}/live`.
* **Idempotence & Hors-Ligne** : Chaque action envoyée depuis le mobile intègre un `idempotency_key` unique stocké dans la file d'attente locale `offlineQueueService`. En cas de retry ou latence, le backend garantit un incrément unique.

---

## 5. Endpoints Statistiques (`/statistics`)

### `GET /users/{id}/statistics`
* **Auth Requise**
* **Response 200 OK** :
  ```json
  {
    "matches_played": 42,
    "wins": 28,
    "losses": 11,
    "draws": 3,
    "win_rate": 66.7,
    "goals_scored": 35,
    "mvp_count": 7,
    "sports_breakdown": [
      { "sport": "Football", "matches": 31, "win_rate": 74.0 },
      { "sport": "Basketball", "matches": 11, "win_rate": 50.0 }
    ]
  }
  ```

---

## 6. Structure d'Erreur Standardisée

Toutes les erreurs renvoyées par l'API suivent la structure suivante :

```json
{
  "kind": "validation | auth | notFound | conflict | server",
  "status": 422,
  "message": "Les données fournies sont invalides.",
  "fieldErrors": {
    "email": ["L'adresse e-mail est déjà utilisée."],
    "password": ["Le mot de passe doit contenir au moins 8 caractères."]
  }
}
```
