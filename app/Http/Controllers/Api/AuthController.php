<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
            return response()->json(['message' => 'These credentials do not match our records.', 'errors' => ['email' => ['These credentials do not match our records.']]], 422);
        }
        if (! in_array($user->role, ['admin', 'shop'])) {
            return response()->json(['message' => 'You are not authorized to access the admin panel.'], 403);
        }

        return ['token' => $user->createToken('admin')->plainTextToken, 'user' => $user];
    }

    public function me(Request $request)
    {
        return $request->user();
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
