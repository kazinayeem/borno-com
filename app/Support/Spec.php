<?php

namespace App\Support;

use Illuminate\Validation\Rule;

/**
 * Reads the admin page spec (resources/js/pages/admin/spec/spec.json) so the API validates exactly the
 * fields the UI renders. Field shorthand: "name:type[*]:Label[@resource|[a|b|c]]".
 */
class Spec
{
    /** Resources stored in the generic `records` table. */
    public const RECORD_RESOURCES = [
        'courier_trackings', 'preorders', 'preorder_products', 'preorder_commissions', 'preorder_profits', 'return_orders', 'stock_summary',
        'purchases', 'purchase_returns', 'banners', 'ads', 'grid_ads', 'meta_pixel_events', 'sale_reports', 'commissions', 'payouts',
        'rider_cash_submissions', 'employees', 'suppliers', 'subscriptions', 'subscription_plans', 'support_tickets', 'supports', 'withdraws',
        'countries', 'areas', 'weight_charges', 'languages', 'social_links', 'ticket_issue_types', 'support_items', 'pages', 'menus', 'footers',
        'roles', 'addons', 'notifications', 'customer_notifications',
    ];

    public const SECRET_MASK = '********';

    private static ?array $spec = null;

    public static function all(): array
    {
        return self::$spec ??= json_decode(file_get_contents(base_path('resources/js/pages/admin/spec/spec.json')), true);
    }

    public static function parseField(string $def): array
    {
        [$name, $typeStar, $rest] = array_pad(explode(':', $def, 3), 3, '');
        $required = str_ends_with($typeStar, '*');
        $type = rtrim($typeStar, '*');
        $label = $rest;
        $resource = null;
        $options = null;
        if (preg_match('/^(.*)@(\w+)$/', $rest, $m)) {
            [$label, $resource] = [$m[1], $m[2]];
        } elseif (preg_match('/^(.*)\[(.*)\]$/', $rest, $m)) {
            [$label, $options] = [$m[1], explode('|', $m[2])];
        }

        return compact('name', 'type', 'required', 'label', 'resource', 'options');
    }

    /** Declared fields of every form/modal that writes to this resource (de-duplicated by name). */
    public static function fieldsFor(string $resource): array
    {
        $out = [];
        foreach (self::all()['pages'] as $page) {
            if (($page['resource'] ?? null) !== $resource) {
                continue;
            }
            foreach (array_merge($page['fields'] ?? [], $page['modal'] ?? []) as $def) {
                $f = self::parseField($def);
                $out[$f['name']] ??= $f;
            }
        }

        return $out;
    }

    public static function toggleFields(string $resource): array
    {
        $out = [];
        foreach (self::all()['pages'] as $page) {
            if (($page['resource'] ?? null) === $resource) {
                foreach ($page['columns'] ?? [] as $c) {
                    [$key, $type] = array_pad(explode(':', $c), 2, '');
                    if ($type === 'toggle') {
                        $out[$key] = true;
                    }
                }
            }
        }

        return array_keys($out);
    }

    public static function settingsPage(string $key): ?array
    {
        foreach (self::all()['pages'] as $page) {
            if (($page['type'] ?? null) === 'settings' && ($page['key'] ?? null) === $key) {
                return $page;
            }
        }

        return null;
    }

    /**
     * Laravel rules for a set of parsed fields. `$current` holds the stored values so an unchanged
     * (seeded) image reference is still accepted on update.
     */
    public static function rules(array $fields, bool $creating, array $current = []): array
    {
        $rules = [];
        foreach ($fields as $f) {
            $r = [$creating && $f['required'] ? 'required' : ($f['required'] ? 'sometimes' : 'nullable')];
            switch ($f['type']) {
                case 'number': $r[] = 'numeric'; break;
                case 'email': $r[] = 'email'; $r[] = 'max:160'; break;
                case 'date': $r[] = 'date'; break;
                case 'datetime-local': $r[] = 'date'; break;
                case 'checkbox': $r[] = 'boolean'; break;
                case 'multiselect': case 'tags': $r[] = 'array'; break;
                case 'color': $r[] = 'regex:/^#[0-9a-fA-F]{6}$/'; break;
                case 'password': $r[] = 'string'; $r[] = 'min:6'; $r[] = 'max:100'; break;
                case 'image': case 'file':
                    $keep = $current[$f['name']] ?? null;
                    $r[] = 'string';
                    $r[] = fn ($a, $v, $fail) => $v === null || $v === '' || $v === $keep || preg_match('/^uploads\/[\w.\-]+$/', $v) ?: $fail('The '.$a.' must be an uploaded file.');
                    break;
                case 'select': case 'radio':
                    if ($f['options']) {
                        $r[] = Rule::in($f['options']);
                    } else {
                        $r[] = 'nullable';
                    }
                    break;
                default: $r[] = 'string'; $r[] = 'max:5000';
            }
            if ($f['type'] === 'password' && isset($fields[$f['name'].'_confirmation'])) {
                $r[] = 'confirmed';
            }
            $rules[$f['name']] = $r;
        }

        return $rules;
    }
}
