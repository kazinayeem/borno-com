<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class ChatMessage extends Model
{
    protected $casts = ['from_staff' => 'boolean', 'read_at' => 'datetime'];

    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
}
