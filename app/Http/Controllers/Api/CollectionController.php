<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\Product;
use App\Support\Html;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CollectionController extends Controller
{
    /** Public: collections flagged for the home page, with their products. */
    public function home()
    {
        return Collection::where('active', true)->where('show_on_home', true)->orderBy('sort')->orderBy('id')->get()
            ->map(fn ($c) => $this->shape($c, true))->filter(fn ($c) => count($c['products']) > 0)->values();
    }

    public function show(string $slug)
    {
        return $this->shape(Collection::where('active', true)->where('slug', $slug)->firstOrFail(), true);
    }

    // ---- admin ------------------------------------------------------------------------------------------------------

    public function index()
    {
        return Collection::orderBy('sort')->orderByDesc('id')->get()->map(fn ($c) => $this->shape($c, false));
    }

    public function showAdmin(int $id)
    {
        $c = Collection::findOrFail($id);
        $items = Product::whereIn('id', $c->product_ids ?? [])->get(['id', 'name', 'image', 'price'])->keyBy('id');

        return $this->shape($c, false) + ['items' => collect($c->product_ids)->map(fn ($pid) => $items->get($pid))->filter()->values()];
    }

    public function store(Request $request)
    {
        return response()->json($this->shape(Collection::create($this->data($request)), false), 201);
    }

    public function update(Request $request, int $id)
    {
        $c = Collection::findOrFail($id);
        $c->update($this->data($request, $c));

        return $this->shape($c->refresh(), false);
    }

    public function destroy(int $id)
    {
        Collection::findOrFail($id)->delete();

        return response()->noContent();
    }

    /** Admin product picker: search by name or SKU. */
    public function productSearch(Request $request)
    {
        $q = Product::query()->where('active', true)->where('approval', '!=', 'pending');
        if ($s = trim((string) $request->query('q'))) {
            $q->where(fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhere('sku', 'like', "%{$s}%"));
        }

        return $q->orderBy('name')->limit(20)->get(['id', 'name', 'image', 'price'])->map->setAppends(['image_url']);
    }

    private function data(Request $request, ?Collection $current = null): array
    {
        $v = $request->validate([
            'title' => 'required|string|max:120',
            'slug' => ['nullable', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('collections', 'slug')->ignore($current?->id)],
            'description' => 'nullable|string|max:20000',
            'product_ids' => 'required|array|min:1|max:'.Collection::MAX_PRODUCTS, 'product_ids.*' => 'integer|distinct|exists:products,id',
            'show_on_home' => 'boolean', 'active' => 'boolean', 'sort' => 'nullable|integer|min:0|max:9999',
        ]);
        $v["slug"] = ($v["slug"] ?? null) ?: Str::slug($v["title"]);
        if (Collection::where('slug', $v['slug'])->where('id', '!=', $current?->id ?? 0)->exists()) {
            $v['slug'] .= '-'.substr(md5(uniqid()), 0, 4);
        }
        $v['description'] = Html::clean($v['description'] ?? null);
        $v['product_ids'] = array_map('intval', $v['product_ids']);
        $v['sort'] = $v['sort'] ?? 0;

        return $v;
    }

    private function shape(Collection $c, bool $withProducts): array
    {
        return [
            'id' => $c->id, 'title' => $c->title, 'slug' => $c->slug, 'description' => $c->description, 'show_on_home' => $c->show_on_home,
            'active' => $c->active, 'sort' => $c->sort, 'product_ids' => $c->product_ids, 'count' => count($c->product_ids ?? []),
            'products' => $withProducts ? $c->liveProducts() : [],
        ];
    }
}
