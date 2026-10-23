# 🇲🇬 SportUp — La Plateforme Sportive Communautaire de Madagascar

> **SportUp** est une application mobile et une API moderne conçue pour dynamiser la pratique sportive à Madagascar. Elle permet aux sportifs, capitaines, organisateurs et gestionnaires de complexes de se connecter, d'organiser des matchs, de trouver des terrains, de gérer des équipes et de suivre des compétitions en temps réel.

---

## 📑 Sommaire

1. [Vue d'ensemble & Architecture](#-vue-densemble--architecture)
2. [Matrice des Fonctionnalités](#-matrice-des-fonctionnalités)
3. [Détail des Fonctionnalités](#-détail-des-fonctionnalités)
   - [1. Annuaire & Gestion Collaborative des Terrains](#1-annuaire--gestion-collaborative-des-terrains)
   - [2. Organisation de Sessions & Matchmaking Géolocalisé](#2-organisation-de-sessions--matchmaking-géolocalisé)
   - [3. Feuille de Match en Direct & Tableau d'Affichage (Live Scoreboard)](#3-feuille-de-match-en-direct--tableau-daffichage-live-scoreboard)
   - [4. Tournois & Compétitions](#4-tournois--compétitions)
   - [5. Équipes, Recrutement & Recherche d'Adversaires](#5-équipes-recrutement--recherche-dadversaires)
   - [6. Messagerie Instantanée & Chat Temps Réel](#6-messagerie-instantanée--chat-temps-réel)
   - [7. Statistiques Joueur & Gamification](#7-statistiques-joueur--gamification)
   - [8. Notifications Push & Préférences](#8-notifications-push--préférences)
   - [9. Authentification & Rôles](#9-authentification--rôles)
4. [Démarrage & Installation](#-démarrage--installation)
   - [Backend (Laravel 11)](#backend-laravel-11)
   - [Mobile (React Native / Expo)](#mobile-react-native--expo)
5. [Tests & Qualité du Code](#-tests--qualité-du-code)

---

## 🏗️ Vue d'ensemble & Architecture

L'écosystème SportUp est structuré en deux blocs complémentaires :

```
SportUp/
├── backend/            # API REST Laravel 11 (PHP 8.3 + MySQL + Sanctum)
│   ├── app/            # Contrôleurs, Modèles, Policies, Services
│   ├── database/       # Migrations & Seeders (Madagascar)
│   ├── routes/api.php  # Endpoints REST v1 et v2
│   └── tests/          # Tests automatisés PHPUnit / Feature & Unit
│
└── mobile/             # Application Mobile React Native (TypeScript + Expo)
    ├── src/features/   # Modules par domaine (venues, sessions, matches, teams, tournaments...)
    ├── src/api/        # Client Axios unifié avec intercepteurs Sanctum
    ├── src/store/      # Gestion d'état global persisté (Zustand)
    └── src/theme/      # Design System (Couleurs, Spacing, Typographie)
```

### Stack Technologique

* **Backend** : Laravel 11, PHP 8.3, MySQL, Laravel Sanctum (Tokens API), Broadcasting (Reverb / Pusher).
* **Mobile** : React Native, Expo, TypeScript, Zustand (State Management), React Navigation, Lucide Icons, Vanilla StyleSheet (Design System sur-mesure sans Tailwind).
* **Contexte Madagascar** : Monnaie en Ariary (MGA), numérotation locale (+261, MVola/Airtel Money), villes principales (*Antananarivo, Toamasina, Antsirabe, Mahajanga, Fianarantsoa, Toliara, Antsiranana*).

---

## 📊 Matrice des Fonctionnalités

| Module | Statut | Rôles concernés | Description |
| :--- | :---: | :---: | :--- |
| **Annuaire des Terrains** | ✅ Opérationnel | Tous / Modérateurs | Répertoire national, ajout libre, modification par auteur, contact WhatsApp. |
| **Sessions Sportives** | ✅ Opérationnel | Joueurs / Organisateurs | Création de matchs ouverts ou privés, carte interactive, inscriptions. |
| **Live Scoreboard** | ✅ Opérationnel | Arbitres / Spectateurs | Chronomètre, saisie de points/buts en direct, partage d'affiches de score. |
| **Tournois (V2)** | ✅ Opérationnel | Organisateurs / Équipes | Poules, élimination directe, tirage au sort et classements automatiques. |
| **Équipes & Recrutement** | ✅ Opérationnel | Capitaines / Joueurs | Profil d'équipe, code d'invitation, statut recherche d'adversaire. |
| **Chat & Discussions** | ✅ Opérationnel | Tous les membres | Canaux de session, canaux d'équipe et messagerie directe. |
| **Statistiques & Badges** | ✅ Opérationnel | Joueurs | Suivi des victoires, buts/paniers, historique et badges de niveau. |
| **Notifications Push** | ✅ Opérationnel | Tous | Alertes de convocations, rappels avant match, réponses aux invitations. |

---

## 🎯 Détail des Fonctionnalités

### 1. Annuaire & Gestion Collaborative des Terrains

SportUp intègre un répertoire complet des infrastructures sportives de Madagascar, avec gestion collaborative :

* **Ajout de terrain par tous les utilisateurs** :
  * N'importe quel sportif ou gérant connecté peut référencer un terrain de son quartier (`POST /api/v1/venues`).
  * Suggestion rapide des grandes villes malgaches ou saisie libre de communes/districts.
  * Multi-sports : Football, Foot à 5 (Urban/Galaxy), Basketball, Basket 3x3, Volleyball, Ping-Pong, Athlétisme.
  * Types de surface : Gazon synthétique, gazon naturel, béton, parquet d'intérieur, sable, ciment.
  * Commodités détaillées (toggles) : Éclairage nocturne pour les matchs du soir, vestiaires/douches, parking sécurisé, tribunes/gradins, buvette/cafétéria, terrain couvert (indoor).
  * Tarification en Ariary par heure (MGA) et horaires d'ouverture/fermeture.
* **Modification des fiches** :
  * Le créateur du terrain (ou un administrateur) peut mettre à jour les coordonnées, horaires, tarifs et équipements à tout moment (`PUT /api/v1/venues/{id}`).
* **Modération & Sécurité** :
  * Tout terrain nouvellement ajouté démarre avec le badge `is_verified = false` (en attente de validation par l'équipe SportUp).
* **Réservation & Deep-linking** :
  * Bouton direct **WhatsApp** pré-remplissant un message de réservation avec le nom du terrain.
  * Bouton d'appel téléphonique direct.
  * Redirection Google Maps avec itinéraire calculé jusqu'au complexe.

---

### 2. Organisation de Sessions & Matchmaking Géolocalisé

* **Création de session sportive** :
  * Choix du sport, de la date, de l'heure et du terrain associé (issu de l'annuaire ou lieu libre).
  * Configuration du niveau requis (Débutant, Intermédiaire, Avancé, Tous niveaux).
  * Définition du nombre maximum de participants et du prix par joueur (partage de la location du terrain).
  * Modalité publique (visible sur la carte) ou privée (accessible par lien/invitation).
* **Exploration interactive sur carte** :
  * Visualisation des sessions ouvertes autour de soi.
  * Filtres par sport, quartier, niveau et tranche horaire.
* **Participation & Convocations** :
  * Inscription en un clic, liste d'attente automatique en cas de session complète.
  * Bouton d'invitation directe d'amis ou de coéquipiers.
  * Synchronisation avec l'agenda personnel dans l'application.

---

### 3. Feuille de Match en Direct & Tableau d'Affichage (Live Scoreboard)

Transforme un smartphone en véritable console d'arbitrage professionnelle :

* **Prise en charge multi-sports** :
  * *Football / Foot à 5* : Score par buts, décompte du temps de jeu, mi-temps.
  * *Basketball / Basket 3x3* : Incrémentations 1 pt (lancers francs), 2 pts et 3 pts, gestion des quart-temps, timeouts.
  * *Volleyball / Tennis de table* : Décompte par **sets**, points par set et permutation de service.
* **Télécommande Arbitre / Organisateur** :
  * Lancement du chronomètre, mise en pause, reprise, passage à la période suivante, coup de sifflet final.
* **Fil d'événements en direct** :
  * Enregistrement en direct : buteur/marqueur, cartons jaunes/rouges, fautes collectives.
  * Option d'annulation immédiate en cas d'erreur de saisie de l'arbitre.
* **Diffusion & Partage** :
  * Les spectateurs et joueurs suivent l'évolution du score en direct.
  * Génération d'une affiche graphique récapitulative du match pour partage sur WhatsApp, Facebook ou Instagram.

---

### 4. Tournois & Compétitions

Module complet de gestion d'événements compétitifs :

* **Formats supportés** :
  1. *Championnat / Poules* (Round-robin) : Calcul automatique des points (3 pts victoire, 1 pt nul, 0 pt défaite), goal-average et buts pour/contre.
  2. *Élimination directe* (Knockout) : Tableaux des 8es, quarts, demi-finales et finale.
  3. *Mixte* : Phase de poules qualificatives suivie d'un arbre à élimination directe.
* **Tirage au sort automatique** :
  * Répartition automatisée des équipes inscrites dans les poules ou sur l'arbre de match.
* **Inscriptions d'équipes** :
  * Les capitaines peuvent inscrire leur effectif aux tournois ouverts.

---

### 5. Équipes, Recrutement & Recherche d'Adversaires

* **Gestion de l'effectif** :
  * Création d'équipe avec logo, bio, ville et sport de prédilection.
  * Rôles au sein de l'équipe : Capitaine, Co-capitaine, Joueur.
* **Recrutement facile par code** :
  * Chaque équipe dispose d'un code unique de partage (ex: `SP-7A2F`).
  * Deep-link direct permettant aux nouveaux joueurs de rejoindre l'équipe instantanément.
* **Mode "Recherche d'adversaire" (Looking for Opponents)** :
  * Les équipes peuvent activer un badge pour indiquer leur disponibilité à disputer un match amical.
  * Listing des équipes disponibles par sport et par zone géographique pour organiser des défis.

---

### 6. Messagerie Instantanée & Chat Temps Réel

* **Canaux de communication intégrés** :
  * *Chat de session* : Permet aux inscrits de s'organiser (covoiturage, confirmation des présences, couleur de maillots).
  * *Chat d'équipe* : Salon privé réservé aux membres de la même équipe.
  * *Messages directs* : Échange privé entre deux sportifs.
* **Technologie Temps Réel** :
  * Diffusion instantanée par WebSocket (Laravel Reverb / Pusher) avec bascule automatique sur polling sécurisé en cas de connexion instable.

---

### 7. Statistiques Joueur & Gamification

* **Profil d'athlète** :
  * Taux de victoire, nombre de matchs disputés, total de buts ou points inscrits, nombre d'élections en tant qu'Homme du Match (MVP).
* **Progression & Badges** :
  * Système de badges débloquables (ex: *Premier Match*, *Serial Buteur*, *Capitaine Modèle*, *Fidèle au Poste*).
  * Historique chronologique des performances.

---

### 8. Notifications Push & Préférences

* **Alertes automatiques** :
  * Invitation à rejoindre une équipe ou une session.
  * Rappel automatique avant le coup d'envoi (ex: 30 minutes avant).
  * Notification en direct lorsqu'un tournoi publie son calendrier ou ses classements.
* **Gestion fine des préférences** :
  * Chaque utilisateur peut activer ou désactiver les notifications par catégorie (chat, matchs, invitations, système).

---

### 9. Authentification & Rôles

* **Sécurité** :
  * Tokens d'authentification Laravel Sanctum avec hachage sécurisé des mots de passe (Bcrypt).
  * Protection anti-brute-force sur les routes d'authentification (`throttle`).
* **Rôles utilisateurs** :
  * `player` : Pratique libre, inscription aux sessions, gestion de son profil.
  * `team_manager` : Création et gestion d'équipes, recrutement, inscription aux tournois.
  * `organizer` : Création de tournois, de sessions publiques, attribution des terrains.
  * `referee` : Contrôle exclusif de la console d'arbitrage et saisie des scores.
  * `admin` : Modération globale, validation des terrains soumis, supervision de la plateforme.

---

## 🚀 Démarrage & Installation

### Prérequis
* PHP 8.2 ou supérieur & Composer
* Node.js 18 ou supérieur & npm
* MySQL 5.7+ ou MariaDB
* Expo Go (sur smartphone) ou un émulateur Android / iOS

---

### Backend (Laravel 11)

1. **Accéder au dossier backend** :
   ```bash
   cd backend
   ```

2. **Installer les dépendances PHP** :
   ```bash
   composer install
   ```

3. **Configurer l'environnement** :
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
   *Vérifier la configuration de la base de données dans `.env` (`DB_DATABASE=sportup_db`).*

4. **Exécuter les migrations et le jeu de données Madagascar** :
   ```bash
   php artisan migrate --seed
   ```

5. **Lancer le serveur de développement** :
   ```bash
   php artisan serve --host=0.0.0.0 --port=8000
   ```

---

### Mobile (React Native / Expo)

1. **Accéder au dossier mobile** :
   ```bash
   cd mobile
   ```

2. **Installer les dépendances npm** :
   ```bash
   npm install
   ```

3. **Configurer l'URL de l'API** :
   * Créer ou vérifier le fichier `.env` ou `src/config/api.ts` pour pointer sur votre adresse IP locale ou votre tunnel Cloudflare / Ngrok :
     ```env
     EXPO_PUBLIC_API_URL=http://VOTRE_IP_LOCALE:8000/api/v1
     ```

4. **Démarrer l'application avec Expo** :
   ```bash
   npx expo start
   ```
   *Scannez le QR code affiché dans le terminal avec l'application **Expo Go** (Android / iOS).*

---

## 🧪 Tests & Qualité du Code

### 1. Tests automatisés Backend (PHPUnit)

Pour exécuter la suite de tests automatisée des endpoints (notamment l'annuaire des terrains) :

```bash
cd backend
php -d memory_limit=512M ./vendor/bin/phpunit tests/Feature/VenueApiTest.php
```

Résultat attendu :
```text
OK (6 tests, 18 assertions)
```

Pour exécuter l'ensemble des suites de tests du projet :
```bash
./vendor/bin/phpunit
```

### 2. Validation TypeScript Mobile

Pour vérifier l'intégrité des types et l'absence de régression côté mobile :

```bash
cd mobile
npx tsc --noEmit
```

*Sortie attendue : Code de retour 0 (aucune erreur de typage).*

---

## 👥 Auteurs & Licence

Projet développé avec passion pour la communauté sportive malgache.  
**SportUp © 2026 — Tous droits réservés.**
