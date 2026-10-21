<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;

/** Sends one SMS through the provider chosen in Admin → 3rd Party → SMS Gateway. Returns [ok, message]. */
class Sms
{
    public const PROVIDERS = [
        'ssl_wireless', 'bulksmsbd', 'greenweb', 'alpha_sms', 'mimsms', 'adn_sms', 'twilio', 'telesign', 'nexmo', 'messagebird',
    ];

    /** Bangladesh numbers are sent as 8801XXXXXXXXX; anything else is passed through digits-only. */
    public static function normalize(string $to): string
    {
        $d = preg_replace('/\D+/', '', $to);
        if (preg_match('/^01\d{9}$/', $d)) {
            return '88'.$d;
        }

        return $d;
    }

    public static function send(string $to, string $message): array
    {
        $c = Setting::group('sms');
        $p = $c['provider'] ?? '';
        $to = self::normalize($to);
        if (! in_array($p, self::PROVIDERS, true)) {
            return [false, 'Choose an SMS provider first.'];
        }
        if (strlen($to) < 8) {
            return [false, 'Enter a valid phone number.'];
        }
        try {
            return match ($p) {
                'ssl_wireless' => self::ssl($c, $to, $message),
                'bulksmsbd' => self::bulk($c, $to, $message),
                'greenweb' => self::green($c, $to, $message),
                'alpha_sms' => self::alpha($c, $to, $message),
                'mimsms' => self::mim($c, $to, $message),
                'adn_sms' => self::adn($c, $to, $message),
                'twilio' => self::twilio($c, $to, $message),
                'telesign' => self::telesign($c, $to, $message),
                'nexmo' => self::nexmo($c, $to, $message),
                'messagebird' => self::bird($c, $to, $message),
            };
        } catch (\Throwable $e) {
            return [false, 'Could not reach the provider: '.$e->getMessage()];
        }
    }

    private static function need(array $c, array $keys): ?string
    {
        foreach ($keys as $k) {
            if (trim((string) ($c[$k] ?? '')) === '') {
                return "Missing setting: {$k}.";
            }
        }

        return null;
    }

    private static function ssl(array $c, string $to, string $m): array
    {
        if ($e = self::need($c, ['ssl_api_token', 'ssl_sid'])) {
            return [false, $e];
        }
        $r = Http::timeout(15)->acceptJson()->post('https://smsplus.sslwireless.com/api/v3/send-sms', [
            'api_token' => $c['ssl_api_token'], 'sid' => $c['ssl_sid'], 'msisdn' => $to, 'sms' => $m, 'csms_id' => substr(md5(uniqid('', true)), 0, 20),
        ]);

        return [strtoupper((string) $r->json('status')) === 'SUCCESS', (string) ($r->json('error_message') ?: $r->json('status') ?: $r->status())];
    }

    private static function bulk(array $c, string $to, string $m): array
    {
        if ($e = self::need($c, ['bulksmsbd_api_key', 'bulksmsbd_sender_id'])) {
            return [false, $e];
        }
        $r = Http::timeout(15)->asForm()->post('http://bulksmsbd.net/api/smsapi', ['api_key' => $c['bulksmsbd_api_key'], 'senderid' => $c['bulksmsbd_sender_id'], 'number' => $to, 'message' => $m]);

        return [(int) $r->json('response_code') === 202, (string) ($r->json('error_message') ?: $r->json('success_message') ?: $r->body())];
    }

    private static function green(array $c, string $to, string $m): array
    {
        if ($e = self::need($c, ['greenweb_token'])) {
            return [false, $e];
        }
        $r = Http::timeout(15)->asForm()->post('https://api.greenweb.com.bd/api.php', ['token' => $c['greenweb_token'], 'to' => $to, 'message' => $m]);

        return [str_starts_with(trim($r->body()), 'Ok'), trim($r->body())];
    }

    private static function alpha(array $c, string $to, string $m): array
    {
        if ($e = self::need($c, ['alpha_api_key'])) {
            return [false, $e];
        }
        $body = ['api_key' => $c['alpha_api_key'], 'msg' => $m, 'to' => $to];
        if (! empty($c['alpha_sender_id'])) {
            $body['sender_id'] = $c['alpha_sender_id'];
        }
        $r = Http::timeout(15)->asForm()->post('https://api.sms.net.bd/sendsms', $body);

        return [(int) $r->json('error') === 0 && $r->json('error') !== null, (string) ($r->json('msg') ?: $r->status())];
    }

    private static function mim(array $c, string $to, string $m): array
    {
        if ($e = self::need($c, ['mimsms_username', 'mimsms_api_key', 'mimsms_sender_name'])) {
            return [false, $e];
        }
        $r = Http::timeout(15)->acceptJson()->post('https://api.mimsms.com/api/SmsSending/SMS', [
            'UserName' => $c['mimsms_username'], 'Apikey' => $c['mimsms_api_key'], 'MobileNumber' => $to, 'CampaignId' => 'null',
            'SenderName' => $c['mimsms_sender_name'], 'TransactionType' => 'T', 'Message' => $m,
        ]);

        return [(string) $r->json('statusCode') === '200', (string) ($r->json('responseResult') ?: $r->json('message') ?: $r->status())];
    }

    private static function adn(array $c, string $to, string $m): array
    {
        if ($e = self::need($c, ['adn_api_key', 'adn_api_secret'])) {
            return [false, $e];
        }
        $r = Http::timeout(15)->asForm()->post('https://portal.adnsms.com/api/v1/secure/send-sms', [
            'api_key' => $c['adn_api_key'], 'api_secret' => $c['adn_api_secret'], 'request_type' => 'SINGLE_SMS', 'message_type' => 'TEXT', 'mobile' => $to, 'message_body' => $m,
        ]);

        return [(int) $r->json('api_response_code') === 200, (string) ($r->json('api_response_message') ?: $r->status())];
    }

    private static function twilio(array $c, string $to, string $m): array
    {
        if ($e = self::need($c, ['twilio_sid', 'twilio_token', 'twilio_from'])) {
            return [false, $e];
        }
        $r = Http::timeout(15)->withBasicAuth($c['twilio_sid'], $c['twilio_token'])->asForm()
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$c['twilio_sid']}/Messages.json", ['From' => $c['twilio_from'], 'To' => '+'.$to, 'Body' => $m]);

        return [$r->successful(), (string) ($r->json('message') ?: $r->json('status') ?: $r->status())];
    }

    private static function telesign(array $c, string $to, string $m): array
    {
        if ($e = self::need($c, ['telesign_customer_id', 'telesign_api_key'])) {
            return [false, $e];
        }
        $r = Http::timeout(15)->withBasicAuth($c['telesign_customer_id'], $c['telesign_api_key'])->asForm()
            ->post('https://rest-api.telesign.com/v1/messaging', ['phone_number' => $to, 'message' => $m, 'message_type' => 'ARN']);

        return [$r->successful(), (string) ($r->json('status.description') ?: $r->status())];
    }

    private static function nexmo(array $c, string $to, string $m): array
    {
        if ($e = self::need($c, ['nexmo_key', 'nexmo_secret', 'nexmo_from'])) {
            return [false, $e];
        }
        $r = Http::timeout(15)->asForm()->post('https://rest.nexmo.com/sms/json', ['api_key' => $c['nexmo_key'], 'api_secret' => $c['nexmo_secret'], 'from' => $c['nexmo_from'], 'to' => $to, 'text' => $m]);

        return [(string) $r->json('messages.0.status') === '0', (string) ($r->json('messages.0.error-text') ?: 'Sent')];
    }

    private static function bird(array $c, string $to, string $m): array
    {
        if ($e = self::need($c, ['messagebird_api_key', 'messagebird_from'])) {
            return [false, $e];
        }
        $r = Http::timeout(15)->withHeaders(['Authorization' => 'AccessKey '.$c['messagebird_api_key']])->acceptJson()
            ->post('https://rest.messagebird.com/messages', ['originator' => $c['messagebird_from'], 'recipients' => [$to], 'body' => $m]);

        return [$r->successful(), (string) ($r->json('errors.0.description') ?: $r->status())];
    }
}
