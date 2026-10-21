<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Category extends Model
{
    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        $icon = $this->icon;
        if (! $icon) {
            return null;
        }
        if (str_starts_with($icon, 'http://') || str_starts_with($icon, 'https://') || str_starts_with($icon, '/')) {
            return $icon;
        }

        return '/storage/'.$icon;
    }

    protected $casts = ['active' => 'boolean'];

    public function products() { return $this->hasMany(Product::class); }
}
