<?php

namespace App\Support;

use App\Models\Currency;
use App\Models\Setting;

/** Formats an amount the way the store's default currency is set up in the admin (symbol, position, rate). */
class Money
{
    public static function format(float|int|string|null $amount): string
    {
        $c = array_replace(\App\Http\Controllers\Api\SettingsController::DEFAULTS, Setting::all_());
        $cur = Currency::where('name', $c['currency'])->first();
        $position = Setting::storedGroup('business')['currency_position'] ?? ($c['currency_position'] ?? 'prefix');
        $text = number_format((float) $amount * (float) ($cur?->rate ?: 1), 2);
        $symbol = $cur?->symbol ?: '$';

        return $position === 'suffix' ? $text.$symbol : $symbol.$text;
    }
}
