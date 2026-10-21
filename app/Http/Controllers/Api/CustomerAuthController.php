<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

/** Storefront customer sign-up / sign-in: email + password, or Google. Staff accounts can never sign in here. */
class CustomerAuthController extends Controller
{
    private function session(User $user): array
    {
        return ['token' => $user->createToken('customer')->plainTextToken, 'user' => $this->view($user)];
    }

    public static function view(User $u): array
    {
        return ['id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'gender' => $u->gender, 'birth_date' => $u->birth_date, 'has_password' => (bool) $u->password_set, 'google' => (bool) $u->google_id];
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120', 'email' => 'required|email:rfc|max:160|unique:users,email',
            'phone' => 'nullable|string|max:30', 'password' => ['required', 'confirmed', Password::min(8)],
        ]);
        $user = User::create($data + ['role' => 'customer']);

        return response()->json($this->session($user), 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required|string']);
        $user = User::where('email', $data['email'])->first();
        // One message for "no such user" and "wrong password" so accounts cannot be enumerated.
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'These credentials do not match our records.', 'errors' => ['email' => ['These credentials do not match our records.']]], 422);
        }
        if ($user->role !== 'customer') {
            return response()->json(['message' => 'This is a staff account. Please use the admin login.'], 403);
        }

        return $this->session($user);
    }

    /** Verifies a Google ID token (from Google Identity Services) and signs the matching customer in. */
    public function google(Request $request)
    {
        $clientId = config('services.google.client_id');
        abort_if(! $clientId, 503, 'Google sign-in is not configured.');
        $token = $request->validate(['credential' => 'required|string|max:4096'])['credential'];

        $res = Http::timeout(8)->get('https://oauth2.googleapis.com/tokeninfo', ['id_token' => $token]);
        $c = $res->ok() ? $res->json() : null;
        $valid = $c
            && ($c['aud'] ?? null) === $clientId                                         // issued for THIS app
            && in_array($c['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)
            && filter_var($c['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN)       // never trust an unverified email
            && ($c['exp'] ?? 0) > time()
            && ! empty($c['sub']) && ! empty($c['email']);
        if (! $valid) {
            return response()->json(['message' => 'Google sign-in could not be verified. Please try again.'], 401);
        }

        $user = User::where('google_id', $c['sub'])->first() ?? User::where('email', $c['email'])->first();
        if ($user && $user->role !== 'customer') {
            return response()->json(['message' => 'This email belongs to a staff account. Please use the admin login.'], 403);
        }
        if (! $user) {
            $user = User::create(['name' => $c['name'] ?? Str::before($c['email'], '@'), 'email' => $c['email'], 'role' => 'customer', 'password' => Str::random(40), 'password_set' => false, 'google_id' => $c['sub']]);
        } elseif (! $user->google_id) {
            $user->update(['google_id' => $c['sub']]);
        }

        return $this->session($user);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
