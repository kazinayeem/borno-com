<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class FlashSale extends Model
{
    protected $appends = ['image_url'];
    protected $casts = ['active' => 'boolean', 'discount' => 'integer', 'starts_at' => 'datetime', 'ends_at' => 'datetime'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->image ? '/storage/'.$this->image : null;
    }
}
