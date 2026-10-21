<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Currency extends Model
{
    protected $casts = ['rate' => 'float', 'is_default' => 'boolean'];
}
