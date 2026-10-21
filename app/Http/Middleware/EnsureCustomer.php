<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Only signed-in storefront customers; staff tokens (admin/shop) are refused. */
class EnsureCustomer
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->user() || $request->user()->role !== 'customer') {
            return response()->json(['message' => 'Customer sign-in required.'], 403);
        }

        return $next($request);
    }
}
