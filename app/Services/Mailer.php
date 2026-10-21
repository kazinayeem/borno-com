<?php

namespace App\Services;

use App\Models\Setting;
use App\Support\EmailTemplates;
use Illuminate\Support\Facades\Mail;

/** Sends template emails through the SMTP settings from Admin → 3rd Party → Mail Config. Honors the master on/off switch. */
class Mailer
{
    /** Master switch: on unless an admin turned it off. */
    public static function enabled(): bool
    {
        $g = Setting::storedGroup('mail');

        return (bool) ($g['is_active'] ?? true);
    }

    /** Copies the saved SMTP settings into Laravel's mail config for this request. */
    public static function configure(): void
    {
        $g = Setting::group('mail');
        if (trim((string) ($g['host'] ?? '')) === '') {
            return; // nothing saved: keep the app's .env mailer
        }
        $enc = strtolower((string) ($g['encryption'] ?? ''));
        config([
            'mail.default' => 'panel_smtp',
            'mail.mailers.panel_smtp' => [
                'transport' => 'smtp', 'host' => $g['host'], 'port' => (int) ($g['port'] ?: 587),
                'username' => ($g['username'] ?? '') ?: null, 'password' => ($g['password'] ?? '') ?: null,
                'scheme' => $enc === 'ssl' ? 'smtps' : null,
            ],
        ]);
        if (! empty($g['from_address'])) {
            config(['mail.from.address' => $g['from_address'], 'mail.from.name' => Setting::all_()['name'] ?? config('app.name')]);
        }
        Mail::purge('panel_smtp');
    }

    public static function appName(): string
    {
        return (string) (Setting::storedGroup('business')['name'] ?? '') ?: (string) (Setting::all_()['name'] ?? config('app.name'));
    }

    /** Returns [sent, message]. Skips quietly when emails are off, the template is off, or there is no recipient. */
    public static function send(string $template, ?string $to, array $vars = [], bool $force = false): array
    {
        $to = trim((string) $to);
        $t = EmailTemplates::get($template);
        if ($to === '' || ! $t) {
            return [false, 'No recipient.'];
        }
        if (! $force && (! self::enabled() || ! $t['enabled'])) {
            return [false, 'Emails are switched off.'];
        }
        $vars += ['app_name' => self::appName()];
        $subject = EmailTemplates::render($t['subject'], $vars, false);
        $body = EmailTemplates::render($t['body'], $vars, true);
        $html = view('emails.layout', ['subject' => $subject, 'body' => $body, 'app' => $vars['app_name'], 'logo' => url(Setting::all_()['logo'] ?? '/assets/logo.png')])->render();
        try {
            self::configure();
            Mail::html($html, fn ($m) => $m->to($to)->subject($subject));

            return [true, 'Sent'];
        } catch (\Throwable $e) {
            return [false, $e->getMessage()];
        }
    }
}
