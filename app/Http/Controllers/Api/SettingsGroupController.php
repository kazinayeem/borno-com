<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\Spec;
use Illuminate\Http\Request;

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
        $stored = $this->stored($key);
        $out = [];
        foreach ($fields as $name => $f) {
            $v = $stored[$name] ?? null;
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
        Setting::put(["group.$key" => array_merge($stored, array_intersect_key($valid, $fields))]);

        return $this->show($key);
    }
}
