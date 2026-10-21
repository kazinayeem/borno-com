<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Order extends Model
{
    public const STATUSES = ['pending', 'confirm', 'processing', 'pickup', 'on_the_way', 'delivered', 'cancelled'];

    protected $casts = ['subtotal' => 'float', 'coupon_discount' => 'float', 'shipping' => 'float', 'vat_tax' => 'float', 'total' => 'float', 'delivered_at' => 'datetime'];

    public function user() { return $this->belongsTo(User::class); }
    public function shop() { return $this->belongsTo(Shop::class); }
    public function rider() { return $this->belongsTo(Rider::class); }
    public function items() { return $this->hasMany(OrderItem::class); }
}
