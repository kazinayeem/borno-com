<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Payment extends Model
{
    protected $casts = ['order_ids' => 'array', 'raw' => 'array', 'amount' => 'float'];

    public function orders()
    {
        return Order::whereIn('id', $this->order_ids ?? []);
    }
}
