<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Coupon extends Model
{
    protected $casts = ['active' => 'boolean', 'discount' => 'float', 'min_amount' => 'float', 'starts_at' => 'datetime', 'expires_at' => 'datetime'];
}
