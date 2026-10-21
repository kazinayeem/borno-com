<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class ContactMessage extends Model
{
    protected $casts = ['read' => 'boolean'];
}
