<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Firebase Cloud Messaging — HTTP v1 API
    |--------------------------------------------------------------------------
    |
    | Pour obtenir ces valeurs :
    | 1. Console Firebase → Paramètres du projet → Comptes de service
    | 2. Cliquer "Générer une nouvelle clé privée" → télécharger le JSON
    | 3. Copier project_id, client_email, private_key dans votre .env
    |
    */

    'project_id'   => env('FIREBASE_PROJECT_ID', ''),
    'client_email' => env('FIREBASE_CLIENT_EMAIL', ''),
    'private_key'  => env('FIREBASE_PRIVATE_KEY', ''),

    /*
    | FCM endpoint FCM HTTP v1
    */
    'fcm_endpoint' => 'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send',

    /*
    | Délai d'expiration des requêtes FCM (secondes)
    */
    'timeout' => 10,
];
