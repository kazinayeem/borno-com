<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

/** Everything a signed-in customer can see or change about their own account. */
class AccountController extends Controller
{
    public function me(Request $request)
    {
        return CustomerAuthController::view($request->user());
    }

    public function update(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:120', 'phone' => 'nullable|string|max:30', 'gender' => 'nullable|in:male,female', 'birth_date' => 'nullable|date|before:today']);
        $request->user()->update($data);

        return $this->me($request);
    }

    public function password(Request $request)
    {
        $user = $request->user();
        $rules = ['password' => ['required', 'confirmed', Password::min(8)]];
        if ($user->password_set) {
            $rules['current_password'] = 'required|string';
        }
        $data = $request->validate($rules);
        if ($user->password_set && ! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password is incorrect.', 'errors' => ['current_password' => ['The current password is incorrect.']]], 422);
        }
        $user->update(['password' => $data['password'], 'password_set' => true]);
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return response()->noContent();
    }

    // ---- addresses ------------------------------------------------------------------------------------------------
    private function addressRules(): array
    {
        return ['name' => 'required|string|max:120', 'phone' => 'required|string|max:30', 'type' => 'nullable|in:home,office,other', 'area' => 'nullable|string|max:120', 'address_line' => 'required|string|max:255', 'is_default' => 'boolean'];
    }

    public function addresses(Request $request)
    {
        return Address::where('user_id', $request->user()->id)->orderByDesc('is_default')->orderByDesc('id')->get();
    }

    public function storeAddress(Request $request)
    {
        $data = $request->validate($this->addressRules());
        $uid = $request->user()->id;
        $address = DB::transaction(function () use ($data, $uid) {
            $first = ! Address::where('user_id', $uid)->exists();
            if (! empty($data['is_default']) || $first) {
                Address::where('user_id', $uid)->update(['is_default' => false]);
                $data['is_default'] = true;
            }

            return Address::create($data + ['user_id' => $uid, 'type' => $data['type'] ?? 'home']);
        });

        return response()->json($address, 201);
    }

    public function updateAddress(Request $request, int $id)
    {
        $address = Address::where('user_id', $request->user()->id)->findOrFail($id);
        $data = $request->validate($this->addressRules());
        DB::transaction(function () use ($address, $data, $request) {
            if (! empty($data['is_default'])) {
                Address::where('user_id', $request->user()->id)->update(['is_default' => false]);
            }
            $address->update($data);
        });

        return $address->refresh();
    }

    public function destroyAddress(Request $request, int $id)
    {
        $uid = $request->user()->id;
        $address = Address::where('user_id', $uid)->findOrFail($id);
        DB::transaction(function () use ($address, $uid) {
            $address->delete();
            // Keep exactly one default whenever any address is left.
            if (! Address::where('user_id', $uid)->where('is_default', true)->exists()) {
                Address::where('user_id', $uid)->orderBy('id')->limit(1)->update(['is_default' => true]);
            }
        });

        return response()->noContent();
    }

    // ---- orders ---------------------------------------------------------------------------------------------------
    public function summary(Request $request)
    {
        $q = Order::where('user_id', $request->user()->id);

        return [
            'orders' => (clone $q)->count(),
            'by_status' => (clone $q)->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status'),
            'spent' => round((float) (clone $q)->where('status', '!=', 'cancelled')->sum('total'), 2),
            'latest' => (clone $q)->latest('id')->limit(3)->get(['id', 'number', 'status', 'total', 'created_at']),
        ];
    }

    public function orders(Request $request)
    {
        $q = Order::where('user_id', $request->user()->id)->with('shop:id,name')->withCount('items');
        if ($st = $request->query('status')) {
            $q->where('status', $st);
        }

        return $q->latest('id')->paginate(10);
    }

    public function order(Request $request, int $id)
    {
        return Order::where('user_id', $request->user()->id)->with(['items.product:id,image', 'shop:id,name', 'rider:id,name'])->findOrFail($id);
    }

    /** Customers may cancel only while the order is still pending; stock goes back on the shelf. */
    public function cancel(Request $request, int $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $order = Order::where('user_id', $request->user()->id)->with('items')->lockForUpdate()->findOrFail($id);
            abort_unless($order->status === 'pending', 422, 'Only pending orders can be cancelled.');
            foreach ($order->items as $i) {
                if ($i->product_id) {
                    Product::whereKey($i->product_id)->increment('stock', $i->qty);
                }
            }
            $order->update(['status' => 'cancelled']);

            return $order->load(['items.product:id,image', 'shop:id,name']);
        });
    }
}
