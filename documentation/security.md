# SportUp — Politiques & Architecture de Sécurité

## 1. Directives Majeures & Principes de Sécurité

1. **Aucun Accès Direct DB** : Le mobile ne dialogue qu'avec l'API REST Laravel via HTTPS et Sanctum Bearer Token.
2. **Stockage Chiffré des Identifiants** : Les tokens Sanctum ne sont jamais stockés dans `AsyncStorage` en clair, mais dans le stockage chiffré matériel du téléphone (`react-native-keychain` : iOS Keychain / Android Keystore).
3. **Protection des Données de Géolocalisation** : Les coordonnées GPS précises de l'utilisateur ne sont ni stockées en continu ni partagées publiquement sans raison. L'API backend effectue le calcul de distance (`ST_Distance_Sphere`) et renvoie uniquement la distance en kilomètres au mobile.
4. **Prévention des Injections (XSS & SQL)** :
   - Eloquent ORM utilise exclusivement des requêtes préparées pour toutes les interactions MySQL.
   - Les formulaires d'entrée sont doublement validés : localement avec Zod (`strict`), et côté serveur avec les `FormRequest` de Laravel.
5. **Protection IDOR (Insecure Direct Object References)** :
   - Chaque modification/annulation de session ou d'événement de match est contrôlée par une `Laravel Policy` (`SessionPolicy`, `MatchPolicy`).
   - Un utilisateur non organisateur se voit refuser toute tentative de soumission via un HTTP 403 Forbidden.
6. **Gestion du Rate Limiting & Brute Force** :
   - Rate limiting configuré sur `/auth/login` et `/auth/register` (5 tentatives par minute par IP).
   - Protection globale sur l'API (60 requêtes/minute par utilisateur authentifié).
7. **Gestion des Secrets** :
   - Les clés API sensibles (Google Places API key, Firebase Admin credentials, Database credentials) sont strictement confinées dans le fichier `.env` du serveur backend et exclues de Git.
