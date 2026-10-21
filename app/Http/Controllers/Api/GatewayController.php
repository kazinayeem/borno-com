<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Record;
use App\Support\Spec;
use Illuminate\Http\Request;

/** Payment gateways. Credentials are write-only: they are masked in every response. */
class GatewayController extends Controller
{
    private function view(Record $r): array
    {
        $d = $r->data;
        $d['config'] = collect($d['config'] ?? [])->map(fn ($v) => ($v ?? '') !== '' ? Spec::SECRET_MASK : '')->all();

        return ['id' => $r->rid] + $d;
    }

    public function index()
    {
        return Record::where('resource', 'payment_gateways')->orderBy('rid')->get()->map(fn ($r) => $this->view($r))->values();
    }

    public function update(Request $request, int $id)
    {
        $r = Record::where('resource', 'payment_gateways')->where('rid', $id)->firstOrFail();
        $data = $request->validate([
            'title' => 'sometimes|required|string|max:80', 'mode' => 'sometimes|in:test,live', 'is_active' => 'sometimes|boolean',
            'config' => 'sometimes|array',
        ]);
        $d = $r->data;
        foreach (['title', 'mode', 'is_active'] as $k) {
            if (array_key_exists($k, $data)) {
                $d[$k] = $data[$k];
            }
        }
        foreach ($data['config'] ?? [] as $k => $v) {
            // Only keys the gateway already defines can be set; the mask means "unchanged".
            if (array_key_exists($k, $d['config'] ?? []) && $v !== Spec::SECRET_MASK && (is_string($v) || $v === null)) {
                $d['config'][$k] = mb_substr((string) $v, 0, 500);
            }
        }
        $r->update(['data' => $d]);

        return $this->view($r);
    }
}
