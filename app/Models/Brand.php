<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Brand extends Model
{
    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->logo ? '/storage/'.$this->logo : null;
    }

    protected $casts = ['active' => 'boolean'];

    public function products() { return $this->hasMany(Product::class); }
}
