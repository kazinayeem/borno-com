<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class VatTax extends Model
{
    protected $casts = ['percentage' => 'float', 'active' => 'boolean'];
}
