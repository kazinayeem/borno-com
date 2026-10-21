<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use App\Support\Permissions;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Enforces a staff member's role permissions on /api/admin/* and writes the activity log for changes. */
class StaffAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $module = Permissions::moduleForApi($request->path());
        $action = Permissions::actionFor($request->method());
        // POS quote/search are reads even though they POST
        if (preg_match('#/(quote|product-search)$#', $request->path())) {
            $action = 'view';
        }
        if ($user && ! Permissions::allows($user->staffPermissions(), $module, $action)) {
            return response()->json(['message' => "You don't have permission to {$action} ".(Permissions::MODULES[$module]['label'] ?? 'this').'.'], 403);
        }

        $response = $next($request);

        if ($user && $action !== 'view' && $response->getStatusCode() < 400 && $module !== 'staff-logs') {
            $parts = explode('/', trim(preg_replace('#^api/admin/?#', '', $request->path()), '/'));
            $subject = ($parts[0] === 'r' ? ($parts[1] ?? '') : ($parts[0] ?? ''));
            $id = collect($parts)->first(fn ($p) => ctype_digit($p));
            ActivityLog::record(['add' => 'create', 'edit' => 'update', 'delete' => 'delete'][$action], $user, $subject, $id, ucfirst($request->method() === 'POST' ? 'created' : ($request->method() === 'DELETE' ? 'deleted' : 'updated')).' '.str_replace(['_', '-'], ' ', $subject).($id ? " #{$id}" : ''));
        }

        return $response;
    }
}
