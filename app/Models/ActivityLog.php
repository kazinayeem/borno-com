<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

#[Guarded([])]
class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    /** Writes one row. Never throws: a logging problem must not break the action being logged. */
    public static function record(string $action, ?User $user, ?string $subject = null, ?string $subjectId = null, ?string $description = null, ?string $email = null): void
    {
        try {
            $req = request();
            static::create([
                'user_id' => $user?->id, 'user_name' => $user?->name, 'email' => $email ?? $user?->email, 'action' => $action,
                'subject' => $subject, 'subject_id' => $subjectId, 'description' => $description ? mb_substr($description, 0, 250) : null,
                'ip' => $req?->ip(), 'device' => mb_substr((string) $req?->userAgent(), 0, 250),
            ]);
        } catch (\Throwable) {
        }
    }
}
