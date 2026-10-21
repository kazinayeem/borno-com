<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Rider extends Model
{
    protected $casts = ['active' => 'boolean'];

    public function orders() { return $this->hasMany(Order::class); }
}
