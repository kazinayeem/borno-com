<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

/** A hand-picked set of products (e.g. "New Sell") shown on the home page and on its own page. */
#[Guarded([])]
class Collection extends Model
{
    public const MAX_PRODUCTS = 10;

    protected $casts = ['product_ids' => 'array', 'show_on_home' => 'boolean', 'active' => 'boolean'];

    /** Live products, kept in the order the admin picked them. */
    public function liveProducts()
    {
        $ids = array_values($this->product_ids ?? []);
        $rows = Product::with(['shop:id,name', 'category:id,name,slug'])->whereIn('id', $ids)->where('active', true)->where('approval', '!=', 'pending')->get()->keyBy('id');

        return collect($ids)->map(fn ($id) => $rows->get($id))->filter()->values()->map->makeHidden(['buy_price', 'approval']);
    }
}
