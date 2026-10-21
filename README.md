# ReadyEcommerce clone (Laravel + React + Redux Toolkit)

Stack: Laravel 13 (Sanctum bearer tokens) · React 19 · Redux Toolkit + RTK Query · Tailwind 4 · Vite · SQLite by default (MySQL-ready).

## Run
```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed
npm run build            # or `npm run dev`
php artisan serve --port=8765
```
Seeded accounts: `root@readyecommerce.com` / `secret` (admin), `shop@readyecommerce.com` / `secret` (shop owner, products only).

### MySQL (optional; project uses SQLite)
Set `DB_CONNECTION=mysql`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` in `.env`, then re-run migrations. (MySQL was not installed on the dev machine, so only SQLite was tested.)

## Layout
- `app/Http/Controllers/Api` – Auth, public Store, generic Admin CRUD; `EnsureStaff` role middleware
- `resources/js/app` – store, slices, RTK Query `api.js`
- `resources/js/pages/shop|admin` – storefront and admin pages

## Fidelity status
Inspected on the reference (signed in via the user's own Chrome session): admin dashboard, sidebar menu tree, orders, categories, product list, customers, shops, brands; plus the public storefront and login.
- Matched: sidebar (290px, #fee5e8 active), topbar, dashboard sections, orders status tabs/columns, list-table columns and status toggles, seed shapes (RC-numbered orders, 7 order statuses, payment methods, customer phone/gender/DOB).
- Sidebar items that exist in the reference but have no page here open a "not built yet" placeholder (POS, pre-orders, purchase, promotion, drivers, employees, etc.).
- Add/Edit pages are simple modals, not the reference's full-page forms. Settings, notifications, product variants and sub-categories are not built.
- Seed data is generated, not copied from the demo. Images are placeholders.
- No pixel-diff was run; matching is from measured styles and screenshots.
