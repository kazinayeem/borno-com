<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class SubCategory extends Model
{
    protected $table = 'sub_categories';
    protected $appends = ['image_url'];
    protected $casts = ['active' => 'boolean'];

    public function category() { return $this->belongsTo(Category::class); }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image ? '/storage/'.$this->image : null;
    }
}
