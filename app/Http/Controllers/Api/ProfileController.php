<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return $request->user()->only(['id', 'name', 'email', 'phone', 'gender', 'role']);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => 'required|string|max:120', 'phone' => 'nullable|string|max:30', 'gender' => 'nullable|in:male,female',
            'email' => 'required|email|max:160|unique:users,email,'.$user->id,
        ]);
        $user->update($data);

        return $this->show($request);
    }

    public function password(Request $request)
    {
        $data = $request->validate(['current_password' => 'required|string', 'password' => ['required', 'confirmed', Password::min(6)]]);
        if (! Hash::check($data['current_password'], $request->user()->password)) {
            return response()->json(['message' => 'The current password is incorrect.', 'errors' => ['current_password' => ['The current password is incorrect.']]], 422);
        }
        $request->user()->update(['password' => $data['password']]);
        // Other devices are signed out; this session keeps working.
        $request->user()->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete();

        return response()->noContent();
    }

    private function shop(Request $request): Shop
    {
        return Shop::where('user_id', $request->user()->id)->firstOrFail();
    }

    public function shopShow(Request $request)
    {
        return $this->shop($request);
    }

    public function shopUpdate(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120', 'name_ar' => 'nullable|string|max:120', 'address' => 'nullable|string|max:255', 'description' => 'nullable|string|max:2000',
            'logo' => ['nullable', 'string', 'regex:/^uploads\/[\w.\-]+$/'], 'online' => 'boolean',
        ]);
        $shop = $this->shop($request);
        $shop->update($data);

        return $shop;
    }
}
