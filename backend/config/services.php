<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services Configuration
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Google Maps, Firebase Cloud Messaging, SMS gateways, and others.
    |
    */

    'google_maps' => [
        'api_key' => env('GOOGLE_MAPS_API_KEY'),
        'default_country' => env('GOOGLE_MAPS_COUNTRY', 'mg'),
    ],

    'firebase' => [
        'credentials_path' => env('FIREBASE_CREDENTIALS', base_path('firebase-credentials.json')),
        'server_key'       => env('FCM_SERVER_KEY'),
    ],

    'sms' => [
        'driver' => env('SMS_DRIVER', 'log'),
    ],

    'orange' => [
        'client_id'     => env('ORANGE_SMS_CLIENT_ID'),
        'client_secret' => env('ORANGE_SMS_CLIENT_SECRET'),
        'sender'        => env('ORANGE_SMS_SENDER', 'SportUp'),
    ],

    'twilio' => [
        'sid'   => env('TWILIO_SID'),
        'token' => env('TWILIO_TOKEN'),
        'from'  => env('TWILIO_FROM'),
    ],

];
