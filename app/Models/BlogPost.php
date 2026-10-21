<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class BlogPost extends Model
{
    protected $casts = ['published' => 'boolean'];
}
