<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Shop extends Model
{
    protected $casts = ['online' => 'boolean', 'active' => 'boolean', 'rating' => 'float'];

    public function products() { return $this->hasMany(Product::class); }
    public function orders() { return $this->hasMany(Order::class); }
    public function user() { return $this->belongsTo(User::class); }
}
