<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Product extends Model
{
    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->image ? '/storage/'.$this->image : null;
    }

    protected $casts = [
        'price' => 'float', 'old_price' => 'float', 'discount_price' => 'float', 'buy_price' => 'float', 'weight' => 'float', 'color_ids' => 'array', 'size_ids' => 'array', 'meta_keywords' => 'array', 'rating' => 'float',
        'is_digital' => 'boolean', 'is_preorder' => 'boolean', 'is_flash_sale' => 'boolean', 'active' => 'boolean',
    ];

    public function orderItems() { return $this->hasMany(OrderItem::class); }
    public function shop() { return $this->belongsTo(Shop::class); }
    public function category() { return $this->belongsTo(Category::class); }
    public function brand() { return $this->belongsTo(Brand::class); }
}
