<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class PosDraft extends Model
{
    protected $casts = ['items' => 'array', 'subtotal' => 'float', 'discount' => 'float', 'total' => 'float'];

    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
}
