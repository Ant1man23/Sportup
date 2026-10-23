# SportUp — Guide d'Installation & Configuration de l'Environnement

## 1. Prérequis & Stack Technique

- **Node.js** : `v26.x` ou `v20.x LTS`
- **npm** : `v11.x`
- **PHP** : `8.3.x`
- **Composer** : `v2.7+`
- **MySQL** : `8.4.x` (WampServer / Docker)
- **Android Studio** : SDK Android 34+, JBR Java 17/21

---

## 2. Structure des Répertoires du Projet

```text
SportUp/
├── mobile/            # Application React Native + TypeScript
├── backend/           # API REST Laravel 11+ & PHP 8.3+
├── documentation/     # Specifications, Architecture, Database & API docs
├── design/            # Charte graphique & Design System
└── database/          # Dump SQL & Seeders de démonstration
```

---

## 3. Configuration du Backend (Laravel)

1. Naviguer dans le dossier backend :
   ```bash
   cd backend
   ```
2. Installer les dépendances PHP :
   ```bash
   composer install
   ```
3. Copier le fichier d'environnement :
   ```bash
   cp .env.example .env
   ```
4. Configurer la base de données MySQL dans `.env` :
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=sportup_db
   DB_USERNAME=root
   DB_PASSWORD=
   ```
5. Générer la clé d'application & exécuter les migrations avec seeders :
   ```bash
   php artisan key:generate
   php artisan migrate --seed
   ```
6. Démarrer le serveur API local :
   ```bash
   php artisan serve --host=0.0.0.0 --port=8000
   ```

---

## 4. Configuration du Mobile (React Native)

1. Naviguer dans le dossier mobile :
   ```bash
   cd mobile
   ```
2. Installer les dépendances npm :
   ```bash
   npm install
   ```
3. Configurer l'adresse de l'API locale et la clé Google Maps dans `.env` :
   ```env
   API_BASE_URL=http://10.0.2.2:8000/api/v1
   GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY
   ```
4. Lancer l'application sur émulateur Android ou appareil physique :
   ```bash
   npm run android
   ```

---

## 5. Configuration de l'API Google Maps (Google Cloud Platform)

Pour activer les fonctionnalités réelles de cartes et de recherche d'adresses :

1. Rendez-vous sur la [Google Cloud Console](https://console.cloud.google.com/).
2. Créez ou sélectionnez votre projet SportUp.
3. Activez les 4 APIs suivantes dans la section **APIs & Services** :
   - **Maps SDK for Android** (rendu natif Android)
   - **Places API (New)** ou **Places API** (autocomplétion des terrains & stades)
   - **Geocoding API** (conversion adresses <-> coordonnées GPS)
   - **Maps Static API** (aperçus cartographiques légers & performants)
4. Dans **Identifiants (Credentials)**, créez une clé API :
   - Ajoutez-la dans `mobile/.env` : `GOOGLE_MAPS_API_KEY=votre_cle_ici`
   - Ajoutez-la dans `backend/.env` : `GOOGLE_MAPS_API_KEY=votre_cle_ici`
   - Pour la build Android native, vous pouvez également renseigner la clé dans `mobile/android/app/src/main/res/values/strings.xml` sous `google_maps_key`.
5. Si aucune clé n'est encore configurée, l'application utilise automatiquement un mode fallback gracieux avec les principaux terrains et stades de Madagascar (Mahamasina, Ankorondrano, Palais des Sports, etc.) pour vous permettre de tester sans interruption.

