<?php

namespace App\Support;

/**
 * Staff access catalog. A module groups sidebar pages (`ui` prefixes) and API resources (`api` segments);
 * a role grants some of view / add / edit / delete per module. Super admins (no staff role) can do everything.
 */
class Permissions
{
    public const ACTIONS = ['view', 'add', 'edit', 'delete'];

    public const MODULES = [
        'orders' => ['label' => 'Orders', 'ui' => ['/admin/orders', '/admin/courier-tracking', '/admin/refund', '/admin/return-orders'], 'api' => ['orders']],
        'pos' => ['label' => 'POS', 'ui' => ['/admin/pos'], 'api' => ['pos']],
        'catalog' => ['label' => 'Products & Catalog', 'ui' => ['/admin/products', '/admin/product', '/admin/categor', '/admin/category', '/admin/subcategor', '/admin/brands', '/admin/colors', '/admin/sizes', '/admin/units', '/admin/variant'], 'api' => ['products', 'categories', 'subcategories', 'brands', 'colors', 'sizes', 'units', 'options', 'catalog']],
        'shops' => ['label' => 'Shops', 'ui' => ['/admin/shops', '/admin/shop'], 'api' => ['shops']],
        'customers' => ['label' => 'Customers', 'ui' => ['/admin/customers', '/admin/riders', '/admin/rider-cash'], 'api' => ['customers', 'riders']],
        'promotion' => ['label' => 'Promotion', 'ui' => ['/admin/flash-sales', '/admin/banners', '/admin/ads', '/admin/grid-advertisements', '/admin/coupons', '/admin/collections'], 'api' => ['flash-sales', 'coupons', 'collections', 'banners', 'ads', 'grid_ads']],
        'content' => ['label' => 'Blog & Pages', 'ui' => ['/admin/blog', '/admin/pages', '/admin/menus', '/admin/footers'], 'api' => ['blogs', 'pages', 'menus', 'footers']],
        'messages' => ['label' => 'Messages', 'ui' => ['/admin/messages', '/shop/customer-chats', '/admin/customer-chats'], 'api' => ['messages', 'chats']],
        'reports' => ['label' => 'Reports', 'ui' => ['/admin/report'], 'api' => ['reports']],
        'staff' => ['label' => 'Roles, Staff & Logs', 'ui' => ['/admin/roles', '/admin/staff', '/admin/employee', '/admin/activity-logs'], 'api' => ['roles', 'staff', 'activity-logs']],
        'settings' => ['label' => 'Settings & Integrations', 'ui' => ['/admin/settings', '/admin/generale-setting', '/admin/business-setting', '/admin/payment-gateway', '/admin/courier-configuration', '/admin/sms-gateway', '/admin/pusher', '/admin/google', '/admin/mail', '/admin/email-templates', '/admin/ai-prompts', '/admin/firebase', '/admin/currencies', '/admin/vat-taxes', '/admin/theme-color', '/admin/social-links', '/admin/ticket-issue', '/admin/delivery-setting', '/admin/support-item', '/admin/verifications'], 'api' => ['settings', 'settings-group', 'gateways', 'currencies', 'vat-taxes', 'test-sms', 'send-test-mail', 'email-templates']],
    ];

    /** Reads every signed-in staff member needs just to use the panel. */
    private const OPEN = ['dashboard', 'statistics', 'bell', 'notifications', 'lookup', 'upload', 'options', 'permissions-catalog'];

    public static function catalog(): array
    {
        $out = [];
        foreach (self::MODULES as $key => $m) {
            $out[] = ['key' => $key, 'label' => $m['label'], 'ui' => $m['ui']];
        }

        return $out;
    }

    /** Module that owns an API path such as "admin/r/banners" or "admin/products/5". */
    public static function moduleForApi(string $path): ?string
    {
        $parts = explode('/', trim(preg_replace('#^api/admin/?#', '', $path), '/'));
        $seg = $parts[0] ?? '';
        if ($seg === 'r' && isset($parts[1])) {
            $seg = $parts[1];
        }
        if ($seg === 'settings-group' && isset($parts[1]) && $parts[1] === 'mail') {
            return 'settings';
        }
        if ($seg === '' || in_array($seg, self::OPEN, true)) {
            return null; // open to every staff member
        }
        foreach (self::MODULES as $key => $m) {
            if (in_array($seg, $m['api'], true)) {
                return $key;
            }
        }

        return 'settings'; // anything unmapped is treated as an administrative setting
    }

    public static function actionFor(string $method): string
    {
        return match (strtoupper($method)) {
            'POST' => 'add', 'PUT', 'PATCH' => 'edit', 'DELETE' => 'delete', default => 'view',
        };
    }

    public static function allows(?array $permissions, ?string $module, string $action): bool
    {
        if ($permissions === null || $module === null) {
            return true; // super admin, or an open resource
        }

        return in_array($action, $permissions[$module] ?? [], true);
    }

    /** Sidebar visibility for a UI path. Unknown paths stay visible (the API still enforces access). */
    public static function canSeeUi(?array $permissions, string $path): bool
    {
        if ($permissions === null) {
            return true;
        }
        foreach (self::MODULES as $key => $m) {
            foreach ($m['ui'] as $prefix) {
                if ($path === $prefix || str_starts_with($path, $prefix)) {
                    return in_array('view', $permissions[$key] ?? [], true);
                }
            }
        }

        return true;
    }

    public static function clean(array $input): array
    {
        $out = [];
        foreach (self::MODULES as $key => $_) {
            $acts = array_values(array_intersect(self::ACTIONS, (array) ($input[$key] ?? [])));
            if ($acts) {
                // add/edit/delete are useless without being able to see the page
                $out[$key] = in_array('view', $acts, true) ? $acts : array_merge(['view'], $acts);
            }
        }

        return $out;
    }
}
