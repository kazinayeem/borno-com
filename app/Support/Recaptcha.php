<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

/** Google reCAPTCHA v2 check for public forms. Does nothing until an admin switches it on and saves both keys. */
class Recaptcha
{
    public static function config(): array
    {
        $g = Setting::group('recaptcha');

        return ['active' => (bool) ($g['is_active'] ?? false) && ($g['site_key'] ?? '') !== '' && ($g['secret_key'] ?? '') !== '', 'site_key' => (string) ($g['site_key'] ?? ''), 'secret' => (string) ($g['secret_key'] ?? '')];
    }

    public static function enabled(): bool
    {
        return self::config()['active'];
    }

    public static function verify(Request $request): void
    {
        $c = self::config();
        if (! $c['active']) {
            return;
        }
        $token = (string) $request->input('recaptcha_token', '');
        $ok = false;
        if ($token !== '') {
            try {
                $ok = (bool) Http::asForm()->timeout(8)->post('https://www.google.com/recaptcha/api/siteverify', ['secret' => $c['secret'], 'response' => $token, 'remoteip' => $request->ip()])->json('success');
            } catch (\Throwable) {
                $ok = false;
            }
        }
        if (! $ok) {
            throw ValidationException::withMessages(['recaptcha' => ['Please confirm you are not a robot.']]);
        }
    }
}
