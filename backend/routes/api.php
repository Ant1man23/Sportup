<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\DeviceController;
use App\Http\Controllers\Api\V1\MatchController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\NotificationPreferenceController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\SessionController;
use App\Http\Controllers\Api\V1\StatisticsController;
use App\Http\Controllers\Api\V1\TeamController;
use App\Http\Controllers\Api\V1\TournamentController;
use App\Http\Controllers\Api\V1\VenueController;
use App\Models\Sport;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1 & v2 Routes — SportUp
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // Public Auth Routes (Anti Brute-Force Rate Limited)
    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

    // Public Referentials
    // Public Referentials & Live Match Data
    Route::get('/sports', function () {
        return response()->json(Sport::where('is_active', true)->get(), 200);
    });
    Route::get('/matches/{id}/live', [MatchController::class, 'live']);
    Route::get('/matches/{id}/statistics', [MatchController::class, 'statistics']);
    Route::get('/matches/{id}/sheet', [MatchController::class, 'matchSheet']);

    // Public Tournament Listing & Details
    Route::get('/tournaments', [TournamentController::class, 'index']);
    Route::get('/tournaments/{id}', [TournamentController::class, 'show']);
    Route::get('/tournaments/{id}/standings', [TournamentController::class, 'standings']);
    Route::get('/tournaments/{id}/bracket', [TournamentController::class, 'bracket']);
    Route::get('/tournaments/{id}/matches', [TournamentController::class, 'matches']);

    // Public Venues Directory (Annuaire des Terrains)
    Route::get('/venues', [VenueController::class, 'index']);
    Route::get('/venues/{id}', [VenueController::class, 'show']);

    // Public Team Deep Link Resolution
    Route::get('/teams/by-code/{code}', [TeamController::class, 'showByCode']);

    // Authenticated Routes
    Route::middleware('auth:sanctum')->group(function () {
        // Broadcasting Channels Auth (Pusher / Reverb)
        Route::post('/broadcasting/auth', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Support\Facades\Broadcast::auth($request);
        });

        // Auth / User Profile
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/profile', [ProfileController::class, 'update']);
        Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
        Route::get('/users/search', [ProfileController::class, 'search']);
        Route::get('/users/{id}', [ProfileController::class, 'show']);

        // Sessions CRUD, Participations & Agenda
        Route::get('/sessions', [SessionController::class, 'index']);
        Route::get('/sessions/{id}', [SessionController::class, 'show']);
        Route::post('/sessions', [SessionController::class, 'store']);
        Route::post('/sessions/{id}/join', [SessionController::class, 'join']);
        Route::delete('/sessions/{id}/leave', [SessionController::class, 'leave']);
        Route::post('/sessions/{id}/invite', [SessionController::class, 'invitePlayer']);
        Route::get('/calendar', [SessionController::class, 'calendar']);

        // Chat & Conversations (Sessions + Teams + Inbox)
        Route::get('/conversations', [ChatController::class, 'userConversations']);
        Route::get('/sessions/{sessionId}/conversation', [ChatController::class, 'getSessionConversation']);
        Route::get('/teams/{teamId}/conversation', [ChatController::class, 'getTeamConversation']);
        Route::get('/conversations/{id}/messages', [ChatController::class, 'index']);
        Route::post('/conversations/{id}/messages', [ChatController::class, 'store']);

        // Match Lifecycle & Realtime Events
        Route::get('/matches/{id}', [MatchController::class, 'show']);
        Route::post('/sessions/{id}/match/start', [MatchController::class, 'start']);
        Route::post('/matches/{id}/pause', [MatchController::class, 'pause']);
        Route::post('/matches/{id}/resume', [MatchController::class, 'resume']);
        Route::post('/matches/{id}/next-period', [MatchController::class, 'nextPeriod']);
        Route::post('/matches/{id}/events', [MatchController::class, 'addEvent']);
        Route::delete('/matches/{id}/events/{eventId}', [MatchController::class, 'cancelEvent']);
        Route::post('/matches/{id}/events/{eventId}/cancel', [MatchController::class, 'cancelEvent']);
        Route::post('/matches/{id}/players', [MatchController::class, 'updatePlayers']);
        Route::post('/matches/{id}/finish', [MatchController::class, 'finish']);

        // User Statistics & History
        Route::get('/users/{id}/statistics', [StatisticsController::class, 'showUserStats']);
        Route::get('/users/{id}/statistics/history', [StatisticsController::class, 'history']);

        // Teams & Invitations
        Route::get('/teams', [TeamController::class, 'index']);
        Route::post('/teams', [TeamController::class, 'store']);
        Route::post('/teams/join-by-code', [TeamController::class, 'joinByCode']);
        Route::get('/teams/invitations/my', [TeamController::class, 'myInvitations']);
        Route::post('/teams/invitations/{id}/respond', [TeamController::class, 'respondInvitation']);
        Route::get('/teams/{id}', [TeamController::class, 'show']);
        Route::put('/teams/{id}', [TeamController::class, 'update']);
        Route::delete('/teams/{id}', [TeamController::class, 'destroy']);
        Route::put('/teams/{id}/opponent-status', [TeamController::class, 'updateOpponentStatus']);
        Route::post('/teams/{id}/logo', [TeamController::class, 'uploadLogo']);
        Route::post('/teams/{id}/members', [TeamController::class, 'addMember']);
        Route::post('/teams/{id}/invitations', [TeamController::class, 'inviteMember']);

        // Notifications & Preferences
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
        Route::get('/notification-preferences', [NotificationPreferenceController::class, 'index']);
        Route::put('/notification-preferences', [NotificationPreferenceController::class, 'update']);
        Route::post('/devices', [DeviceController::class, 'store']);
        Route::delete('/devices', [DeviceController::class, 'destroy']);

        // Tournaments — authenticated actions
        Route::post('/tournaments', [TournamentController::class, 'store']);
        Route::post('/tournaments/{id}/register', [TournamentController::class, 'register']);
        Route::post('/tournaments/{id}/invite-team', [TournamentController::class, 'inviteTeam']);
        Route::post('/tournaments/{id}/draw', [TournamentController::class, 'draw']);

        // Venues Directory — Add / Edit
        Route::post('/venues', [VenueController::class, 'store']);
        Route::put('/venues/{id}', [VenueController::class, 'update']);
    });
});
