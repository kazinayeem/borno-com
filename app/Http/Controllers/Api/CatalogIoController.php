<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class CatalogIoController extends Controller
{
    private const COLUMNS = ['name', 'short_description', 'description', 'sku', 'category', 'brand', 'price', 'buy_price', 'stock'];

    private function shopIds(Request $request)
    {
        return $request->user()->role === 'shop' ? Shop::where('user_id', $request->user()->id)->pluck('id') : null;
    }

    /** Spreadsheet apps run cells starting with = + - @ as formulas, so those are defused with a leading quote. */
    private function cell($v): string
    {
        $s = (string) $v;
        $s = preg_match('/^[=+\-@\t\r]/', $s) ? "'".$s : $s;

        return '"'.str_replace('"', '""', $s).'"';
    }

    public function export(Request $request)
    {
        $q = Product::with(['category:id,name', 'brand:id,name'])->orderBy('id');
        if (($ids = $this->shopIds($request)) !== null) {
            $q->whereIn('shop_id', $ids);
        }
        $lines = [implode(',', self::COLUMNS)];
        $q->lazy(200)->each(function (Product $p) use (&$lines) {
            $lines[] = implode(',', array_map([$this, 'cell'], [$p->name, $p->short_description, $p->description, $p->sku, $p->category?->name, $p->brand?->name, $p->price, $p->buy_price, $p->stock]));
        });

        return response(implode("\r\n", $lines)."\r\n", 200, ['Content-Type' => 'text/csv; charset=utf-8', 'Content-Disposition' => 'attachment; filename="products.csv"']);
    }

    /** All-or-nothing: every row is validated first; one bad row rejects the whole file with row-level messages. */
    public function import(Request $request)
    {
        $request->validate(['csv' => 'required|string|max:2000000', 'shop_id' => 'nullable|exists:shops,id']);
        $rows = array_map('str_getcsv', preg_split('/\r\n|\n|\r/', trim($request->input('csv'))));
        $header = array_map(fn ($h) => strtolower(trim($h)), array_shift($rows) ?? []);
        $missing = array_diff(['name', 'sku', 'price', 'buy_price'], $header);
        abort_if($missing, 422, 'Missing required column(s): '.implode(', ', $missing));
        abort_if(count($rows) > 500, 422, 'Import at most 500 rows at a time.');

        $ids = $this->shopIds($request);
        $shopId = $ids !== null ? $ids->first() : ($request->input('shop_id') ?? Shop::value('id'));
        abort_unless($shopId, 422, 'No shop to import into.');
        $cats = Category::pluck('id', 'name')->mapWithKeys(fn ($id, $n) => [strtolower($n) => $id]);
        $brands = Brand::pluck('id', 'name')->mapWithKeys(fn ($id, $n) => [strtolower($n) => $id]);

        $errors = [];
        $clean = [];
        foreach ($rows as $i => $row) {
            if (count(array_filter($row, fn ($c) => trim((string) $c) !== '')) === 0) {
                continue;
            }
            $r = array_combine($header, array_pad(array_slice($row, 0, count($header)), count($header), null));
            $v = Validator::make($r, ['name' => 'required|string|max:255', 'sku' => 'required|string|max:60', 'price' => 'required|numeric|min:0', 'buy_price' => 'required|numeric|min:0', 'stock' => 'nullable|integer|min:0']);
            $catId = $cats[strtolower(trim((string) ($r['category'] ?? '')))] ?? null;
            if ($v->fails() || ! $catId) {
                $errors[] = ['row' => $i + 2, 'errors' => array_merge($v->errors()->all(), $catId ? [] : ['Unknown category "'.($r['category'] ?? '').'"'])];
                continue;
            }
            $clean[] = [
                'shop_id' => $shopId, 'category_id' => $catId, 'brand_id' => $brands[strtolower(trim((string) ($r['brand'] ?? '')))] ?? null,
                'name' => trim($r['name']), 'short_description' => $r['short_description'] ?? null, 'description' => $r['description'] ?? null, 'sku' => trim($r['sku']),
                'price' => (float) $r['price'], 'buy_price' => (float) $r['buy_price'], 'stock' => (int) ($r['stock'] ?? 0),
                'approval' => $ids !== null ? 'pending' : 'accepted',
            ];
        }
        if ($errors) {
            return response()->json(['message' => count($errors).' row(s) have problems. Nothing was imported.', 'row_errors' => array_slice($errors, 0, 50)], 422);
        }
        abort_if(! $clean, 422, 'The file has no data rows.');
        DB::transaction(fn () => collect($clean)->each(fn ($p) => Product::create($p)));

        return response()->json(['imported' => count($clean)], 201);
    }

    public function gallery()
    {
        $disk = Storage::disk('public');

        return collect($disk->files('uploads'))->map(fn ($f) => ['name' => basename($f), 'path' => $f, 'url' => '/storage/'.$f, 'size' => $disk->size($f), 'modified' => $disk->lastModified($f)])
            ->sortByDesc('modified')->values();
    }

    public function destroyImage(string $name)
    {
        abort_unless(preg_match('/^[\w.\-]+$/', $name), 422);
        abort_unless(Storage::disk('public')->exists("uploads/$name"), 404);
        Storage::disk('public')->delete("uploads/$name");

        return response()->noContent();
    }
}
