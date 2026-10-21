<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Category extends Model
{
    protected $casts = ['active' => 'boolean'];

    public function products() { return $this->hasMany(Product::class); }
}
