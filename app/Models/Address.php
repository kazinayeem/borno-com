<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class Address extends Model
{
    protected $casts = ['is_default' => 'boolean'];
}
