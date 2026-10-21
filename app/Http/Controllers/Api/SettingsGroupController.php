<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\Spec;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Settings pages defined in the spec (business setup, mail, pusher, …). Secret fields are never returned. */
class SettingsGroupController extends Controller
{
    private function page(string $key): array
    {
        abort_if($key === 'general', 404); // served by SettingsController
        $page = Spec::settingsPage($key);
        abort_unless($page, 404);

        return $page;
    }

    private function fields(array $page): array
    {
        $out = [];
        foreach ($page['fields'] as $def) {
            $f = Spec::parseField($def);
            $out[$f['name']] = $f;
        }

        return $out;
    }

    private function stored(string $key): array
    {
        return Setting::all_()["group.$key"] ?? [];
    }

    public function show(string $key)
    {
        $fields = $this->fields($this->page($key));
        $merged = Setting::group($key);
        $out = [];
        foreach ($fields as $name => $f) {
            $v = $merged[$name] ?? null;
            $out[$name] = $f['type'] === 'secret' ? (($v ?? '') !== '' ? Spec::SECRET_MASK : '') : $v;
        }

        return $out;
    }

    public function update(Request $request, string $key)
    {
        $fields = $this->fields($this->page($key));
        $stored = $this->stored($key);
        // Secrets are free text here; everything else validates like a normal form field.
        $plain = array_filter($fields, fn ($f) => $f['type'] !== 'secret');
        $valid = $request->validate(Spec::rules(array_map(fn ($f) => ['required' => false] + $f, $plain), false, $stored));
        foreach ($fields as $name => $f) {
            if ($f['type'] === 'secret' && $request->has($name)) {
                $v = $request->input($name);
                if ($v !== Spec::SECRET_MASK) {
                    $valid[$name] = is_string($v) ? mb_substr($v, 0, 500) : '';
                }
            }
        }
        $valid = $this->tighten($key, $request, $valid, $stored);
        Setting::put(["group.$key" => array_merge($stored, array_intersect_key($valid, $fields))]);

        return $this->show($key);
    }

    /** Rules the spec field types cannot express: real time zones, day counts, and phone-length order. */
    private function tighten(string $key, Request $request, array $valid, array $stored): array
    {
        if ($key === 'business') {
            $valid = array_merge($valid, $request->validate([
                'return_order_within_days' => 'nullable|integer|min:0|max:3650',
                'low_stock_alert_quantity' => 'nullable|integer|min:0|max:1000000',
                'default_phone_code' => 'nullable|string|max:8',
            ]));
            $zone = $valid['timezone'] ?? null;
            if ($zone !== null && $zone !== '' && ! in_array($zone, timezone_identifiers_list(), true)) {
                throw ValidationException::withMessages(['timezone' => 'Select a valid time zone.']);
            }
        }
        if ($key === 'verification') {
            $min = $valid['phone_min_length'] ?? $stored['phone_min_length'] ?? null;
            $max = $valid['phone_max_length'] ?? $stored['phone_max_length'] ?? null;
            if ($min !== null && $min !== '' && $max !== null && $max !== '' && (float) $max < (float) $min) {
                throw ValidationException::withMessages(['phone_max_length' => 'Maximum length must be at least the minimum length.']);
            }
        }

        return $valid;
    }
}
