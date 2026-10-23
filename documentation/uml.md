# SportUp — Modélisation & Diagrammes UML

## 1. Diagramme de Cas d'Utilisation (Use Case Diagram)

```mermaid
graph TD
    Visiteur((Visiteur))
    Joueur((Joueur Authentifié))
    Organisateur((Organisateur))
    Capitaine((Capitaine d'équipe))

    subgraph SportUp Mobile System
        UC_Auth[S'inscrire / Se connecter]
        UC_Profile[Consulter & Modifier Profil]
        UC_Search[Rechercher Session Géolocalisée]
        UC_Join[Rejoindre une Session]
        UC_Leave[Quitter une Session]
        UC_CreateSession[Créer une Session Sportive]
        UC_EditSession[Modifier / Annuler sa Session]
        UC_StartMatch[Démarrer un Match]
        UC_EventMatch[Enregistrer Buts / Paniers / Événements]
        UC_FinishMatch[Clôturer un Match & Valider Score]
        UC_Stats[Consulter ses Statistiques]
        UC_Team[Gérer son Équipe - V2]
    end

    Visiteur --> UC_Auth
    Joueur --> UC_Profile
    Joueur --> UC_Search
    Joueur --> UC_Join
    Joueur --> UC_Leave
    Joueur --> UC_Stats

    Joueur <|-- Organisateur
    Organisateur --> UC_CreateSession
    Organisateur --> UC_EditSession
    Organisateur --> UC_StartMatch
    Organisateur --> UC_EventMatch
    Organisateur --> UC_FinishMatch

    Joueur <|-- Capitaine
    Capitaine --> UC_Team
```

---

## 2. Diagramme de Classes (Class Diagram)

```mermaid
classDiagram
    class User {
        +int id
        +string username
        +string email
        +string city
        +string level
        +register()
        +login()
        +updateProfile()
    }

    class Sport {
        +int id
        +string name
        +string slug
        +string colorHex
    }

    class Session {
        +int id
        +string type
        +string format
        +date sessionDate
        +time startTime
        +float latitude
        +float longitude
        +int maxParticipants
        +int currentParticipants
        +string status
        +join()
        +leave()
        +cancel()
    }

    class Match {
        +int id
        +string status
        +int scoreTeamA
        +int scoreTeamB
        +int currentPeriod
        +int elapsedSeconds
        +start()
        +pause()
        +resume()
        +finish()
    }

    class MatchEvent {
        +int id
        +string type
        +string teamSide
        +int minute
        +int points
    }

    class UserSportStatistics {
        +int matchesPlayed
        +int wins
        +int losses
        +int draws
        +int goalsScored
        +int mvpCount
    }

    User "1" -- "0..*" Session : "organise"
    User "1..*" -- "0..*" Session : "participe (session_participants)"
    Sport "1" -- "0..*" Session : "est le sport de"
    Session "1" -- "0..1" Match : "génère"
    Match "1" -- "0..*" MatchEvent : "enregistre"
    User "1" -- "0..*" MatchEvent : "auteur de"
    User "1" -- "0..*" UserSportStatistics : "possède"
    Sport "1" -- "0..*" UserSportStatistics : "statistique de"
```

---

## 3. Diagramme de Séquence : Rejoindre une Session (Mise à jour Optimiste)

```mermaid
sequenceDiagram
    autonumber
    actor J as Joueur Mobile
    participant RN as App Mobile (React Native)
    participant Z as Store Zustand / TanStack Cache
    participant API as API Laravel REST
    participant DB as MySQL DB

    J->>RN: Tape sur "Rejoindre la session"
    RN->>RN: Vérifications locales (Auth, Statut Session, Places)
    RN->>Z: Applique la mise à jour optimiste (+1 participant, statut 'rejoint')
    RN->>J: Affiche immédiatement l'état "Inscrit" (Feedback instantané)

    RN->>API: POST /api/v1/sessions/{id}/join (Bearer Token)
    API->>DB: Transaction SQL (Lock row, check max capacity, insert participant)

    alt Succès Serveur (200 OK)
        DB-->>API: Transaction Commit
        API-->>RN: 200 OK (Session mise à jour)
        RN->>Z: Confirme la donnée dans le cache TanStack
    else Échec / Conflit (409 Session complète entre-temps)
        DB-->>API: Transaction Rollback
        API-->>RN: 409 Conflict ("Session désormais complète")
        RN->>Z: Rollback de la mise à jour optimiste
        RN->>J: Notification Toast d'erreur ("Désolé, la session vient de se remplir")
    end
```

---

## 4. Diagramme de Séquence : Match en Direct & Événement Hors-ligne

```mermaid
sequenceDiagram
    autonumber
    actor Org as Organisateur sur le terrain
    participant RN as App Mobile (LiveMatch)
    participant Q as Offline Queue (AsyncStorage)
    participant API as API Laravel REST
    participant DB as MySQL DB

    Org->>RN: Marque un But (+1 Équipe A)
    RN->>RN: Incrémente le score local immédiatement
    RN->>Q: Ajoute l'événement à la file d'attente hors-ligne

    alt Connexion Réseau Disponible
        RN->>API: POST /api/v1/matches/{id}/events
        API->>DB: INSERT INTO match_events & UPDATE matches score
        DB-->>API: Succès
        API-->>RN: 201 Created (Event Synced)
        RN->>Q: Retire l'événement de la file
    else Réseau Interrompu / Faible
        API--xRN: Timeout ou Erreur Réseau
        RN->>RN: Conserve le score local et garde l'événement dans Q
        RN->>Org: Affiche badge discret ("1 événement en attente de synchro")
        Note over RN,API: Dès le retour du réseau, la file se rejoue automatiquement
    end
```

---

## 5. Diagrammes d'État-Transition

### Statut d'une Session

```mermaid
stateDiagram-v2
    [*] --> open : Création de la session
    open --> full : Capacité max atteinte
    full --> open : Un joueur quitte la session
    open --> cancelled : Annulée par l'organisateur
    full --> cancelled : Annulée par l'organisateur
    open --> in_progress : Match démarré
    full --> in_progress : Match démarré
    in_progress --> finished : Match terminé
    cancelled --> [*]
    finished --> [*]
```

### Statut d'un Match

```mermaid
stateDiagram-v2
    [*] --> pending : Session créée
    pending --> in_progress : Organisateur clique "Démarrer"
    in_progress --> paused : Pause mi-temps / interruption
    paused --> in_progress : Reprise de la période
    in_progress --> finished : Fin du temps réglementaire / Arrêt manuel
    paused --> finished : Arrêt anticipé
    finished --> [*]
```

---

## 6. Diagramme de Déploiement (Deployment Diagram)

```mermaid
graph TB
    subgraph Client Device [Smartphone Android / iOS]
        RN_App[SportUp RN Bundle - Hermes Bytecode]
        Keychain[iOS Keychain / Android Keystore]
    end

    subgraph Web Server [Serveur HTTPS - Apache/Nginx]
        LaravelApp[Laravel 11+ App REST API]
    end

    subgraph Database Server [Database Host]
        MySQL_Server[(MySQL 8.4 Server - InnoDB Engine)]
    end

    subgraph External Cloud Services
        GoogleCloud[Google Maps Platform - Places/Geocoding]
        FCM_Cloud[Firebase Cloud Messaging]
    end

    RN_App -->|HTTPS / TLS 1.3 - Bearer Token| LaravelApp
    RN_App -->|Stockage Sécurisé du Token| Keychain
    LaravelApp -->|SQL Native Driver| MySQL_Server
    RN_App -->|Maps Tiles & Places SDK| GoogleCloud
    LaravelApp -->|Proxy Geocoding API| GoogleCloud
    LaravelApp -->|Push Notification Triggers| FCM_Cloud
    FCM_Cloud -->|Notification Delivery| RN_App
```
