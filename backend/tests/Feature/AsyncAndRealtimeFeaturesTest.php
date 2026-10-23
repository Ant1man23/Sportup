<?php

namespace Tests\Feature;

use App\Actions\Auth\ForgotPasswordAction;
use App\Events\ChatMessageSent;
use App\Jobs\SendPushNotificationJob;
use App\Mail\ResetPasswordCodeMail;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\SmsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AsyncAndRealtimeFeaturesTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_queues_email_and_sms(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'player@sportup.app',
            'username' => 'player_one',
        ]);

        $action = app(ForgotPasswordAction::class);
        $result = $action->execute([
            'email' => 'player@sportup.app',
            'phone' => '0341234567',
        ]);

        $this->assertArrayHasKey('message', $result);
        $this->assertArrayHasKey('debug_code', $result);

        Mail::assertQueued(ResetPasswordCodeMail::class, function ($mail) use ($user) {
            return $mail->hasTo('player@sportup.app') && $mail->username === $user->username;
        });
    }

    public function test_sms_service_normalizes_madagascar_numbers(): void
    {
        $sms = new SmsService();

        $this->assertEquals('+261341234567', $sms->normalizePhone('0341234567'));
        $this->assertEquals('+261321234567', $sms->normalizePhone('261321234567'));
        $this->assertEquals('+261331234567', $sms->normalizePhone('+261331234567'));

        $res = $sms->send('0341234567', 'Test SportUp SMS');
        $this->assertTrue($res['success']);
        $this->assertEquals('log', $res['driver']);
    }

    public function test_push_notification_job_can_be_dispatched(): void
    {
        Queue::fake();

        SendPushNotificationJob::dispatch(
            ['sample_fcm_token_123'],
            'Session Confirmée',
            'Votre session de foot démarre dans 1h'
        );

        Queue::assertPushed(SendPushNotificationJob::class, function ($job) {
            return $job->title === 'Session Confirmée' && $job->tokens[0] === 'sample_fcm_token_123';
        });
    }

    public function test_chat_message_broadcasts_event(): void
    {
        Event::fake([ChatMessageSent::class]);

        $user = User::factory()->create();
        $conversation = Conversation::create(['type' => 'session']);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id'       => $user->id,
            'body'            => 'Passe en profondeur !',
        ]);

        event(new ChatMessageSent($message));

        Event::assertDispatched(ChatMessageSent::class, function ($event) use ($conversation, $message) {
            return $event->message->id === $message->id &&
                   $event->broadcastOn()[0]->name === 'conversation.' . $conversation->id;
        });
    }

    public function test_login_rate_limiter_blocks_after_5_attempts(): void
    {
        $headers = ['X-Test-Rate-Limit' => '1'];

        // First 5 attempts return 422 (invalid credentials)
        for ($i = 0; $i < 5; $i++) {
            $res = $this->withHeaders($headers)->postJson('/api/v1/auth/login', [
                'email'    => 'bruteforce@sportup.app',
                'password' => 'WrongPassword!',
            ]);
            $this->assertEquals(422, $res->getStatusCode(), "Attempt {$i} should be 422");
        }

        // 6th attempt within the same minute is blocked by throttle with 429
        $blockedRes = $this->withHeaders($headers)->postJson('/api/v1/auth/login', [
            'email'    => 'bruteforce@sportup.app',
            'password' => 'WrongPassword!',
        ]);

        $this->assertEquals(429, $blockedRes->getStatusCode());
        $blockedRes->assertJsonFragment(['error' => 'rate_limit_exceeded']);
    }
}
