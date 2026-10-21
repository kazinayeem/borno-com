<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

#[Guarded([])]
class Product extends Model
{
    public function getImageUrlAttribute(): ?string
    {
        if (! $this->image) {
            return null;
        }

        // Seeded demo products point at hosted image URLs; uploaded files live under /storage.
        return preg_match('#^https://#', $this->image) ? $this->image : '/storage/'.$this->image;
    }

    protected $casts = [
        'price' => 'float', 'old_price' => 'float', 'discount_price' => 'float', 'buy_price' => 'float', 'weight' => 'float', 'color_ids' => 'array', 'size_ids' => 'array', 'variants' => 'array', 'meta_keywords' => 'array', 'gallery' => 'array', 'rating' => 'float',
        'is_digital' => 'boolean', 'is_preorder' => 'boolean', 'is_flash_sale' => 'boolean', 'active' => 'boolean',
    ];

    protected $appends = ['image_url', 'colors', 'sizes'];

    public function orderItems() { return $this->hasMany(OrderItem::class); }
    public function shop() { return $this->belongsTo(Shop::class); }
    public function category() { return $this->belongsTo(Category::class); }
    public function brand() { return $this->belongsTo(Brand::class); }

    public function getColorsAttribute(): array
    {
        return $this->namedOptions(Color::class, $this->color_ids ?? []);
    }

    public function getSizesAttribute(): array
    {
        return $this->namedOptions(Size::class, $this->size_ids ?? []);
    }

    /** Empty means "no color / no size". Zero from a form is treated the same way. */
    public static function optionId(mixed $id): ?int
    {
        if ($id === null || $id === '' || (int) $id === 0) {
            return null;
        }

        return (int) $id;
    }

    /**
     * Price and stock for the chosen color and size.
     * Products with no variants ignore the choice and use the product's own price and stock.
     *
     * @return array{price: float, stock: int, color_id: ?int, size_id: ?int, color: ?string, size: ?string}|null
     */
    public function selection(?int $colorId, ?int $sizeId): ?array
    {
        $variants = $this->variants ?? [];
        if ($variants === []) {
            return ['price' => (float) $this->price, 'stock' => (int) $this->stock, 'color_id' => null, 'size_id' => null, 'color' => null, 'size' => null];
        }

        $colorId = self::optionId($colorId);
        $sizeId = self::optionId($sizeId);
        foreach ($variants as $v) {
            if (self::optionId($v['color_id'] ?? null) !== $colorId || self::optionId($v['size_id'] ?? null) !== $sizeId) {
                continue;
            }
            $color = $colorId ? ($this->optionMap(Color::class)[$colorId] ?? null) : null;
            $size = $sizeId ? ($this->optionMap(Size::class)[$sizeId] ?? null) : null;

            return [
                'price' => round((float) $v['price'], 2), 'stock' => (int) $v['stock'],
                'color_id' => $colorId, 'size_id' => $sizeId, 'color' => $color->name ?? null, 'size' => $size->name ?? null,
            ];
        }

        return null;
    }

    /** Decrement the matching variant, or the product stock when there are no variants. */
    public function take(int $qty, ?int $colorId = null, ?int $sizeId = null): void
    {
        $variants = $this->variants ?? [];
        if ($variants === []) {
            $this->decrement('stock', $qty);

            return;
        }

        $colorId = self::optionId($colorId);
        $sizeId = self::optionId($sizeId);
        $found = false;
        foreach ($variants as $i => $v) {
            if (self::optionId($v['color_id'] ?? null) === $colorId && self::optionId($v['size_id'] ?? null) === $sizeId) {
                $variants[$i]['stock'] = max(0, (int) $v['stock'] - $qty);
                $found = true;
                break;
            }
        }
        if (! $found) {
            throw ValidationException::withMessages(['items' => ["Choose a color and size for {$this->name}."]]);
        }

        $this->variants = $variants;
        $this->stock = (int) collect($variants)->sum(fn ($v) => (int) $v['stock']);
        $this->save();
    }

    private function namedOptions(string $model, array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $map = $this->optionMap($model);

        return collect($ids)->map(function ($id) use ($map, $model) {
            $row = $map[(int) $id] ?? null;
            if (! $row) {
                return null;
            }

            return ['id' => $row->id, 'name' => $row->name, 'code' => $model === Color::class ? $row->code : null];
        })->filter()->values()->all();
    }

    private function optionMap(string $model)
    {
        $cols = $model === Color::class ? ['id', 'name', 'code'] : ['id', 'name'];

        return once(fn () => $model::query()->get($cols)->keyBy('id'));
    }
}
