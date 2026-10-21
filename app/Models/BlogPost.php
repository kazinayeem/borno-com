<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class BlogPost extends Model
{
    protected $casts = ['published' => 'boolean'];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        if (! $this->image) {
            return null;
        }

        return preg_match('#^https?://#', $this->image) ? $this->image : '/storage/'.$this->image;
    }
}
