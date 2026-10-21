<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            ActivityLog::record('login_failed', $user && in_array($user->role, ['admin', 'shop']) ? $user : null, null, null, 'Wrong password or unknown account', $data['email']);
            return response()->json(['message' => 'These credentials do not match our records.', 'errors' => ['email' => ['These credentials do not match our records.']]], 422);
        }
        if (! in_array($user->role, ['admin', 'shop'])) {
            return response()->json(['message' => 'You are not authorized to access the admin panel.'], 403);
        }

        ActivityLog::record('login', $user, null, null, 'Signed in');

        return ['token' => $user->createToken('admin')->plainTextToken, 'user' => $this->withAccess($user)];
    }

    public function me(Request $request)
    {
        return $this->withAccess($request->user());
    }

    /** Staff roles travel with the user so the sidebar can hide what they may not open (null = everything). */
    private function withAccess(User $user): User
    {
        return $user->setAttribute('permissions', $user->staffPermissions())->setAttribute('staff_role', $user->staffRole?->name);
    }

    public function logout(Request $request)
    {
        ActivityLog::record('logout', $request->user(), null, null, 'Signed out');
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
