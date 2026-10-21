<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

/** One row of a generic admin resource: `rid` is the id the API exposes (unique per resource). */
#[Guarded([])]
class Record extends Model
{
    protected $casts = ['data' => 'array'];

    /** API shape: the stored fields flattened next to id/created_at. */
    public function flat(): array
    {
        return ['id' => $this->rid, 'created_at' => $this->created_at?->toIso8601String()] + ($this->data ?? []);
    }
}
