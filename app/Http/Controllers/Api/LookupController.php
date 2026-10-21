<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Color;
use App\Models\Currency;
use App\Models\Record;
use App\Models\Rider;
use App\Models\Shop;
use App\Models\Size;
use App\Models\SubCategory;
use App\Models\Unit;
use App\Models\User;
use App\Support\Spec;

/** Option lists ({id, name}) for the spec's `@resource` select fields. */
class LookupController extends Controller
{
    public function show(string $resource)
    {
        $tables = [
            'categories' => Category::class, 'subcategories' => SubCategory::class, 'brands' => Brand::class, 'colors' => Color::class,
            'sizes' => Size::class, 'units' => Unit::class, 'shops' => Shop::class, 'riders' => Rider::class, 'currencies' => Currency::class,
        ];
        if (isset($tables[$resource])) {
            $m = $tables[$resource];

            return $m::orderBy('name')->get(['id', 'name'])->map->only(['id', 'name']);
        }
        if ($resource === 'customers') {
            abort_unless(request()->user()->role === 'admin', 403);

            return User::where('role', 'customer')->orderBy('name')->get(['id', 'name'])->map->only(['id', 'name']);
        }
        abort_unless(in_array($resource, Spec::RECORD_RESOURCES, true), 404);

        return Record::where('resource', $resource)->orderBy('rid')->get()
            ->map(fn (Record $r) => ['id' => $r->rid, 'name' => $r->data['name'] ?? $r->data['title'] ?? $r->data['code'] ?? "#{$r->rid}"])->values();
    }
}
