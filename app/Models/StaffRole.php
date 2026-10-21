<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class StaffRole extends Model
{
    protected $casts = ['permissions' => 'array'];

    public function users() { return $this->hasMany(User::class); }
}
