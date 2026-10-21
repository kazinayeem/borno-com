<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Record;
use App\Models\Shop;
use Illuminate\Http\Request;

/** Read-only analytics. Sellers only ever see their own shop's numbers. */
class ReportController extends Controller
{
    private function orders()
    {
        $q = Order::where('status', '!=', 'cancelled');
        $u = request()->user();
        if ($u->role === 'shop') {
            $q->whereIn('shop_id', Shop::where('user_id', $u->id)->pluck('id'));
        }

        return $q;
    }

    /** Monthly series: earning = paid totals, sale = all non-cancelled totals, cost = total minus 10% commission margin proxy. */
    public function analytics(Request $request)
    {
        $type = $request->validate(['type' => 'required|in:earning,sale,cost', 'year' => 'nullable|integer|min:2000|max:2100'])['type'];
        $year = (int) $request->query('year', now()->year);
        $labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        $values = array_fill(0, 12, 0.0);
        foreach ($this->orders()->whereYear('created_at', $year)->get(['total', 'subtotal', 'payment_status', 'created_at']) as $o) {
            $m = (int) $o->created_at->format('n') - 1;
            $values[$m] += match ($type) {
                'earning' => $o->payment_status === 'paid' ? $o->total : 0,
                'sale' => $o->total,
                'cost' => $o->subtotal * 0.7,
            };
        }

        return ['labels' => $labels, 'values' => array_map(fn ($v) => round($v, 2), $values), 'total' => round(array_sum($values), 2), 'year' => $year];
    }

    public function earningSummary()
    {
        $o = $this->orders();
        $paid = (clone $o)->where('payment_status', 'paid')->sum('total');
        $commission = Record::where('resource', 'commissions')->get()->sum(fn ($r) => (float) ($r->data['admin_commission'] ?? 0));

        return [
            'total_orders' => (clone $o)->count(), 'total_sales' => round((float) (clone $o)->sum('total'), 2), 'total_earning' => round((float) $paid, 2),
            'admin_commission' => round($commission, 2), 'net_earning' => round((float) $paid - $commission, 2),
            'pending_payment' => round((float) (clone $o)->where('payment_status', '!=', 'paid')->sum('total'), 2),
        ];
    }

    public function preorderAnalytics()
    {
        $count = fn (string $r) => Record::where('resource', $r)->count();

        return [
            'orders' => $count('preorders'), 'products' => $count('preorder_products'), 'commissions' => $count('preorder_commissions'),
            'profit' => round(Record::where('resource', 'preorder_profits')->get()->sum(fn ($r) => (float) ($r->data['profit'] ?? 0)), 2),
        ];
    }
}
