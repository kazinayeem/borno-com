<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
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

    // ---- detailed reports -----------------------------------------------------------------------------------------

    /** Commission the platform keeps on a sale, in percent (Business Setup → commission_rate, default 10). */
    private function rate(): float
    {
        return max(0, min(100, (float) (Setting::storedGroup('business')['commission_rate'] ?? 10)));
    }

    private function ranged($q, Request $request, string $col = 'orders.created_at')
    {
        if ($f = $request->query('from')) {
            $q->whereDate($col, '>=', $f);
        }
        if ($t = $request->query('to')) {
            $q->whereDate($col, '<=', $t);
        }

        return $q;
    }

    /** Order-item rows of non-cancelled orders in range (sellers: their shops only). */
    private function lines(Request $request)
    {
        $q = OrderItem::query()->join('orders', 'orders.id', '=', 'order_items.order_id')->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.status', '!=', 'cancelled');
        $u = $request->user();
        if ($u->role === 'shop') {
            $q->whereIn('orders.shop_id', Shop::where('user_id', $u->id)->pluck('id'));
        }
        if ($sid = $request->query('shop_id')) {
            $q->where('orders.shop_id', (int) $sid);
        }

        return $this->ranged($q, $request);
    }

    public function overview(Request $request)
    {
        $o = $this->ranged($this->orders(), $request, 'created_at');
        $orders = $o->get(['id', 'user_id', 'shop_id', 'status', 'payment_status', 'payment_method', 'subtotal', 'coupon_discount', 'shipping', 'vat_tax', 'total', 'created_at']);
        $sales = round((float) $orders->sum('total'), 2);
        $byDay = $orders->groupBy(fn ($r) => $r->created_at->format('Y-m-d'))->map(fn ($g, $d) => ['date' => $d, 'orders' => $g->count(), 'sales' => round((float) $g->sum('total'), 2)])->sortKeys()->values();
        $lines = $this->lines($request);
        $top = (clone $lines)->groupBy('order_items.product_id', 'order_items.name')
            ->select('order_items.product_id', 'order_items.name', DB::raw('SUM(order_items.qty) qty'), DB::raw('SUM(order_items.qty*order_items.price) revenue'))
            ->orderByDesc('revenue')->limit(10)->get()->map(fn ($r) => ['id' => $r->product_id, 'name' => $r->name, 'qty' => (int) $r->qty, 'revenue' => round((float) $r->revenue, 2)]);
        $cats = (clone $lines)->leftJoin('categories', 'categories.id', '=', 'products.category_id')->groupBy('categories.name')
            ->select(DB::raw("COALESCE(categories.name,'Other') name"), DB::raw('SUM(order_items.qty*order_items.price) revenue'), DB::raw('SUM(order_items.qty) qty'))->orderByDesc('revenue')->get()
            ->map(fn ($r) => ['name' => $r->name, 'revenue' => round((float) $r->revenue, 2), 'qty' => (int) $r->qty]);
        $custs = $orders->groupBy('user_id')->map(fn ($g) => ['user_id' => $g->first()->user_id, 'orders' => $g->count(), 'spent' => round((float) $g->sum('total'), 2)])->sortByDesc('spent')->take(5)->values();
        $names = \App\Models\User::whereIn('id', $custs->pluck('user_id'))->pluck('name', 'id');
        $shops = $orders->groupBy('shop_id')->map(fn ($g) => ['shop_id' => $g->first()->shop_id, 'orders' => $g->count(), 'sales' => round((float) $g->sum('total'), 2)])->sortByDesc('sales')->take(5)->values();
        $shopNames = Shop::whereIn('id', $shops->pluck('shop_id'))->pluck('name', 'id');

        return [
            'kpi' => [
                'orders' => $orders->count(), 'sales' => $sales, 'paid' => round((float) $orders->where('payment_status', 'paid')->sum('total'), 2),
                'unpaid' => round((float) $orders->where('payment_status', '!=', 'paid')->sum('total'), 2), 'avg_order' => $orders->count() ? round($sales / $orders->count(), 2) : 0,
                'discount' => round((float) $orders->sum('coupon_discount'), 2), 'shipping' => round((float) $orders->sum('shipping'), 2), 'vat' => round((float) $orders->sum('vat_tax'), 2),
                'units' => (int) (clone $lines)->sum('order_items.qty'), 'customers' => $orders->pluck('user_id')->unique()->count(),
                'pos_sales' => round((float) $orders->where('source', 'pos')->sum('total'), 2),
            ],
            'by_day' => $byDay,
            'by_status' => $orders->groupBy('status')->map->count(),
            'by_payment' => $orders->groupBy('payment_method')->map(fn ($g) => ['orders' => $g->count(), 'total' => round((float) $g->sum('total'), 2)]),
            'top_products' => $top, 'by_category' => $cats,
            'top_customers' => $custs->map(fn ($c) => $c + ['name' => $names[$c['user_id']] ?? '—']),
            'top_shops' => $request->user()->role === 'admin' ? $shops->map(fn ($c) => $c + ['name' => $shopNames[$c['shop_id']] ?? '—']) : [],
        ];
    }

    private function csv(string $name, array $head, iterable $rows)
    {
        $esc = fn ($v) => preg_match('/^[=+\-@\t\r]/', (string) $v) ? "'".$v : $v;   // spreadsheets must not run cell values as formulas
        return response()->streamDownload(function () use ($head, $rows, $esc) {
            $f = fopen('php://output', 'w');
            fputcsv($f, $head);
            foreach ($rows as $r) {
                fputcsv($f, array_map($esc, $r));
            }
            fclose($f);
        }, $name, ['Content-Type' => 'text/csv']);
    }

    public function sales(Request $request)
    {
        $q = $this->lines($request);
        if ($cat = $request->query('category_id')) {
            $q->where('products.category_id', (int) $cat);
        }
        $q->groupBy('order_items.product_id', 'order_items.name')->select(
            'order_items.product_id', 'order_items.name', DB::raw('MAX(products.sku) sku'), DB::raw('SUM(order_items.qty) qty'), DB::raw('COUNT(DISTINCT orders.id) orders'),
            DB::raw('SUM(order_items.qty*order_items.price) sales'), DB::raw('SUM(order_items.qty*COALESCE(products.buy_price,0)) cost'),
        )->orderByDesc('sales');
        $map = fn ($r) => ['product_id' => $r->product_id, 'name' => $r->name, 'sku' => $r->sku, 'orders' => (int) $r->orders, 'qty' => (int) $r->qty, 'sales' => round((float) $r->sales, 2), 'cost' => round((float) $r->cost, 2), 'profit' => round((float) $r->sales - (float) $r->cost, 2)];
        if ($request->query('export') === 'csv') {
            return $this->csv('product-sales.csv', ['Product', 'SKU', 'Orders', 'Qty sold', 'Sales', 'Buying cost', 'Profit'], $q->get()->map($map)->map(fn ($r) => [$r['name'], $r['sku'], $r['orders'], $r['qty'], $r['sales'], $r['cost'], $r['profit']]));
        }
        $all = (clone $q)->get();
        $page = $q->paginate(15)->through($map);

        return $page->toArray() + ['totals' => ['qty' => (int) $all->sum('qty'), 'sales' => round((float) $all->sum('sales'), 2), 'cost' => round((float) $all->sum('cost'), 2), 'profit' => round((float) $all->sum('sales') - (float) $all->sum('cost'), 2)]];
    }

    public function commissions(Request $request)
    {
        $rate = $this->rate();
        $q = $this->ranged($this->orders()->where('source', 'web')->with('shop:id,name'), $request, 'created_at')->latest('id');
        $map = function ($o) use ($rate) {
            $base = max(0, (float) $o->subtotal - (float) $o->coupon_discount);
            $com = round($base * $rate / 100, 2);

            return ['id' => $o->id, 'number' => $o->number, 'date' => $o->created_at, 'shop' => $o->shop?->name, 'status' => $o->status, 'selling' => round($base, 2), 'commission' => $com, 'seller_earning' => round($base - $com, 2)];
        };
        if ($request->query('export') === 'csv') {
            return $this->csv('commissions.csv', ['Order', 'Date', 'Shop', 'Status', 'Selling amount', 'Commission', 'Seller earning'], (clone $q)->get()->map($map)->map(fn ($r) => [$r['number'], $r['date']->format('Y-m-d'), $r['shop'], $r['status'], $r['selling'], $r['commission'], $r['seller_earning']]));
        }
        $all = (clone $q)->get()->map($map);

        return $q->paginate(15)->through($map)->toArray() + ['rate' => $rate, 'totals' => ['selling' => round($all->sum('selling'), 2), 'commission' => round($all->sum('commission'), 2), 'seller_earning' => round($all->sum('seller_earning'), 2)]];
    }

    /** What each shop has earned (delivered web orders, minus commission) next to the payouts recorded so far. */
    public function payouts(Request $request)
    {
        $rate = $this->rate();
        $orders = $this->ranged($this->orders()->where('source', 'web')->where('status', 'delivered')->with('shop:id,name'), $request, 'created_at')->get();
        $shops = $orders->groupBy('shop_id')->map(function ($g) use ($rate) {
            $gross = (float) $g->sum(fn ($o) => max(0, $o->subtotal - $o->coupon_discount));

            return ['shop_id' => $g->first()->shop_id, 'shop' => $g->first()->shop?->name, 'orders' => $g->count(), 'gross' => round($gross, 2), 'commission' => round($gross * $rate / 100, 2), 'net' => round($gross - $gross * $rate / 100, 2)];
        })->sortByDesc('net')->values();
        $history = Record::where('resource', 'payouts')->orderByDesc('rid')->limit(50)->get()->map->flat();

        return ['rate' => $rate, 'shops' => $shops, 'totals' => ['gross' => round($shops->sum('gross'), 2), 'commission' => round($shops->sum('commission'), 2), 'net' => round($shops->sum('net'), 2)], 'history' => $history, 'paid_out' => round($history->sum(fn ($h) => (float) ($h['amount'] ?? 0)), 2)];
    }
}
