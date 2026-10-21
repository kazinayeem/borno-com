<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Everything about one customer in one place: profile, spending, addresses, every order and what they buy. */
class CustomerProfileController extends Controller
{
    public function show(Request $request, int $id)
    {
        $u = User::where('role', 'customer')->findOrFail($id);
        $orders = Order::where('user_id', $u->id);
        $live = (clone $orders)->where('status', '!=', 'cancelled');
        $count = (clone $orders)->count();
        $spent = round((float) (clone $live)->sum('total'), 2);

        $top = OrderItem::join('orders', 'orders.id', '=', 'order_items.order_id')->where('orders.user_id', $u->id)->where('orders.status', '!=', 'cancelled')
            ->groupBy('order_items.product_id', 'order_items.name')->select('order_items.product_id', 'order_items.name', DB::raw('SUM(order_items.qty) qty'), DB::raw('SUM(order_items.qty*order_items.price) spent'))
            ->orderByDesc('qty')->limit(5)->get();

        return [
            'customer' => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'gender' => $u->gender, 'birth_date' => $u->birth_date,
                'joined' => $u->created_at, 'google' => (bool) $u->google_id, 'has_password' => (bool) ($u->password_set ?? true),
            ],
            'stats' => [
                'orders' => $count, 'spent' => $spent, 'avg_order' => $count ? round($spent / max(1, (clone $live)->count()), 2) : 0,
                'cancelled' => (clone $orders)->where('status', 'cancelled')->count(), 'delivered' => (clone $orders)->where('status', 'delivered')->count(),
                'unpaid' => round((float) (clone $live)->where('payment_status', '!=', 'paid')->sum('total'), 2),
                'first_order' => (clone $orders)->min('created_at'), 'last_order' => (clone $orders)->max('created_at'),
                'items' => (int) OrderItem::whereIn('order_id', (clone $live)->pluck('id'))->sum('qty'),
            ],
            'by_status' => (clone $orders)->select('status', DB::raw('COUNT(*) n'))->groupBy('status')->pluck('n', 'status'),
            'payment_methods' => (clone $live)->select('payment_method', DB::raw('COUNT(*) n'), DB::raw('SUM(total) total'))->groupBy('payment_method')->get(),
            'addresses' => Address::where('user_id', $u->id)->orderByDesc('is_default')->get(),
            'top_products' => $top,
            'orders' => (clone $orders)->with('items:id,order_id,name,qty,price,color,size', 'shop:id,name')->latest('id')->paginate(10)
                ->through(fn ($o) => $o->only(['id', 'number', 'status', 'payment_status', 'payment_method', 'subtotal', 'coupon_discount', 'shipping', 'total', 'source', 'created_at']) + ['shop' => $o->shop?->name, 'items' => $o->items]),
        ];
    }
}
