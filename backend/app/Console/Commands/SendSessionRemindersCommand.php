<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\SportSession;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendSessionRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'sportup:send-session-reminders';

    /**
     * The console command description.
     */
    protected $description = 'Envoie une notification push de rappel 1h avant le coup d\'envoi aux participants des sessions sportives';

    /**
     * Execute the console command.
     */
    public function handle(NotificationService $notificationService): int
    {
        $today = Carbon::today()->toDateString();
        $now = Carbon::now();

        $this->info("Vérification des sessions à venir pour le rappel 1h... ({$now->toDateTimeString()})");

        // Sessions prévues aujourd'hui qui sont ouvertes ou complètes
        $sessions = SportSession::with(['sport', 'organizer', 'participants'])
            ->where('session_date', $today)
            ->whereIn('status', ['open', 'full'])
            ->get();

        $remindersSent = 0;

        foreach ($sessions as $session) {
            $sessionDateTime = Carbon::parse($session->session_date->format('Y-m-d') . ' ' . $session->start_time);

            // Calcul du temps restant avant le coup d'envoi en minutes
            $diffInMinutes = $now->diffInMinutes($sessionDateTime, false);

            // On cible la fenêtre de 45 à 75 minutes avant le coup d'envoi (rappel ~1h)
            if ($diffInMinutes < 45 || $diffInMinutes > 75) {
                continue;
            }

            // Vérifier si un rappel a déjà été envoyé pour cette session
            $alreadyNotified = Notification::where('type', 'session_reminder')
                ->whereJsonContains('data->session_id', (string) $session->id)
                ->exists();

            if ($alreadyNotified) {
                continue;
            }

            // Destinataires : tous les participants + organisateur
            $recipients = $session->participants;
            if ($session->organizer && !$recipients->contains('id', $session->organizer_id)) {
                $recipients->push($session->organizer);
            }

            if ($recipients->isEmpty()) {
                continue;
            }

            $sportName = $session->sport ? $session->sport->name : 'Match';
            $location = $session->address ?? $session->city ?? 'Terrain de jeu';
            $startTimeFormatted = substr($session->start_time, 0, 5);

            // Lien direct d'itinéraire GPS Google Maps
            $gpsUrl = null;
            if (!empty($session->latitude) && !empty($session->longitude)) {
                $gpsUrl = "https://www.google.com/maps/search/?api=1&query={$session->latitude},{$session->longitude}";
            }

            $title = "Coup d'envoi dans 1 heure ! ⚡";
            $body = "Votre session de {$sportName} ({$session->format}) débute à {$startTimeFormatted} ({$location}). Préparez vos équipements !";
            if ($gpsUrl) {
                $body .= "\n📍 Itinéraire GPS : {$gpsUrl}";
            }

            $notificationService->sendToUsers(
                $recipients,
                'session_reminder',
                $title,
                $body,
                $session->id,
                null,
                [
                    'session_id' => (string) $session->id,
                    'type'       => 'session_reminder',
                    'latitude'   => (string) ($session->latitude ?? ''),
                    'longitude'  => (string) ($session->longitude ?? ''),
                    'gps_url'    => $gpsUrl ?? '',
                ]
            );

            $this->line("Rappel envoyé pour la session #{$session->id} ({$sportName}) à {$recipients->count()} participant(s).");
            $remindersSent++;
        }

        $this->info("Terminé. {$remindersSent} rappel(s) de session envoyé(s).");

        return Command::SUCCESS;
    }
}
