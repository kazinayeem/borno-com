<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class OrderItem extends Model
{
    protected $casts = ['price' => 'float'];

    public function order() { return $this->belongsTo(Order::class); }
}
