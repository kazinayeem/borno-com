<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

/** Key/value site settings (the reference's "Business Settings"). */
#[Guarded([])]
class Setting extends Model
{
    public $incrementing = false;
    protected $primaryKey = 'key';
    protected $keyType = 'string';

    public static function all_(): array
    {
        return static::query()->pluck('value', 'key')->map(fn ($v) => json_decode($v, true))->all();
    }

    public static function put(array $values): void
    {
        foreach ($values as $k => $v) {
            static::updateOrCreate(['key' => $k], ['value' => json_encode($v)]);
        }
    }
}
