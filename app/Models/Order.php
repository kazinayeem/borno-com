<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Order extends Model
{
    public const STATUSES = ['pending', 'confirm', 'processing', 'pickup', 'on_the_way', 'delivered', 'cancelled'];

    protected $appends = ['buyer'];

    /** Who bought: the guest's own details for guest orders, otherwise the account holder. */
    public function getBuyerAttribute(): array
    {
        if ($this->guest_email) {
            return ['name' => $this->guest_name, 'email' => $this->guest_email, 'phone' => $this->guest_phone, 'guest' => true];
        }
        $u = $this->relationLoaded('user') ? $this->user : null;

        return ['name' => $u?->name, 'email' => $u?->email, 'phone' => $u?->phone, 'guest' => false];
    }

    protected $casts = ['subtotal' => 'float', 'coupon_discount' => 'float', 'shipping' => 'float', 'vat_tax' => 'float', 'total' => 'float', 'delivered_at' => 'datetime'];

    public function user() { return $this->belongsTo(User::class); }
    public function shop() { return $this->belongsTo(Shop::class); }
    public function rider() { return $this->belongsTo(Rider::class); }
    public function items() { return $this->hasMany(OrderItem::class); }
}
