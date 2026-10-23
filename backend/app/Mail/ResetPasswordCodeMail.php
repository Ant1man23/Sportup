<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetPasswordCodeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public string $username
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'SportUp — Votre code de réinitialisation de mot de passe',
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    protected function buildHtml(): string
    {
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Réinitialisation de mot de passe</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F6F8FB; margin: 0; padding: 24px; color: #172033;">
    <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #E4E7EC;">
        <div style="background-color: #0C1C34; padding: 28px 24px; text-align: center;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">Sport<span style="color: #1456D9;">Up</span></h1>
            <p style="color: #94A3B8; margin: 6px 0 0 0; font-size: 13px;">La plateforme sportive géolocalisée</p>
        </div>
        <div style="padding: 32px 28px;">
            <h2 style="font-size: 18px; color: #0C1C34; margin: 0 0 12px 0;">Bonjour {$this->username},</h2>
            <p style="color: #667085; font-size: 14px; line-height: 22px; margin: 0 0 24px 0;">
                Vous avez demandé la réinitialisation de votre mot de passe SportUp. Utilisez le code sécurisé à 6 chiffres ci-dessous dans votre application mobile :
            </p>
            <div style="background-color: #EAF1FE; border: 2px dashed #1456D9; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 800; color: #1456D9; letter-spacing: 6px;">{$this->code}</span>
            </div>
            <p style="color: #667085; font-size: 12px; line-height: 18px; margin: 0 0 8px 0;">
                Ce code est valide pendant <strong>15 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
            </p>
        </div>
        <div style="background-color: #F8FAFC; border-top: 1px solid #E4E7EC; padding: 16px 24px; text-align: center;">
            <p style="color: #94A3B8; font-size: 11px; margin: 0;">SportUp Madagascar • Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
