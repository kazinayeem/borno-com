# ReadyEcommerce clone (Laravel + React + Redux Toolkit)

Stack: Laravel 13 (Sanctum bearer tokens) · React 19 · Redux Toolkit + RTK Query · Tailwind 4 · Vite · SQLite by default (MySQL-ready).

## Run
```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link
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
- Built from the reference's list pages: Colors, Sizes, Units, Sub Categories, Promo Codes, Flash Deals (full CRUD, status toggles). Seed matches the reference scale: 148 products, 14 shops, 86 orders, 12 customers, 10 categories, 19 brands.
- Also built: General Settings (saves + feeds public `/api/master`), Currency, VAT & Tax, POS (product grid, server-priced cart, coupons, customers, drafts, checkout that deducts stock, sales history), and a seller-scoped dashboard. Seller withdrawals are not implemented (Withdraw button is disabled).
- Spec-driven admin: `resources/js/pages/admin/spec/spec.json` (exported from `~/Downloads/shop-admin/src/resources.js`) defines the 100-page sidebar, list columns, form fields and settings groups. A generic engine (`GenericPages.jsx` + `RecordController`/`Spec.php`) renders and validates every page that has no hand-built screen; their data lives in the `records` table, seeded from `database/seeders/data/reference_seed.json` (synthetic data from the same folder, passwords stripped). All 97 sidebar links render real pages.
- Custom screens built: profile, payment gateways (credentials masked), analytics, earning summary, pre-order analytics, push notifications (recorded only; no device delivery), conversations (admin replies), product export/import CSV, gallery, seller profile.
- Seller dashboard follows the ShopDesk seller panel layout (`~/Downloads/shopdesk`): stat cards, order analytics, wallet, 7-day orders, top products, all scoped to the seller's shop. Sellers still only get Dashboard, Order, POS, Product and My Profile in the sidebar.
- Products: 148 real demo products (names, descriptions, prices, 60 brands) in `database/seeders/data/products.json`, collected from DummyJSON (https://dummyjson.com/products, free demo data). Product photos are **not stored in the project**: `image`/`gallery` hold URLs to the hosted images, so the browser loads them from `cdn.dummyjson.com` (needs internet; images sent with no referrer). Uploads still go to `/storage`. Editing keeps a seeded URL as-is; setting a new arbitrary URL is rejected, only uploads are accepted.
- **Admin UI = the shop-admin UI** (`~/Downloads/shop-admin`): its stylesheet is ported verbatim into `resources/css/sa.css` (scoped under `.sa`, loaded in its own cascade layer so it never touches the storefront). The shell (sidebar with add-on tags and collapse, topbar, notification bell, user menu, light/dark theme saved in `localStorage.theme`), dashboard (stat cards, order analytics, wallet, Daily/Monthly/Yearly statistics with line+bar chart, user-overview donut, latest orders, three rankings), list pages (tabs, search, filters, pager, switches, action buttons), forms, modals, POS and order detail all use its exact markup/classes (`components/sa/`). The ReadyEcommerce logo is kept in the brand area and the admin *login* page keeps the reference look.
- **Storefront customers:** cart (server-priced; stock-aware) → checkout (saved/new address, cash on delivery, coupons, one order per shop) → order success; account area with dashboard, order history + detail + cancel (pending only, stock restored), address book, profile/password, wishlist. Sign in with email/password **or Google**.
  - Google sign-in needs `GOOGLE_CLIENT_ID` in `.env` (already set) and, in Google Cloud Console → Credentials → that OAuth client → *Authorized JavaScript origins*, every origin you use, e.g. `http://localhost:8765` and `http://127.0.0.1:8765` (plus your production domain). The server verifies the Google ID token (audience, issuer, expiry, verified email) and never signs a Google user into a staff account. The client *secret* is not used by this flow and is deliberately not stored.
  - Only cash on delivery is offered; no card/wallet gateway is connected.
- Tests: `php artisan test` (12 API feature tests: auth, roles, CRUD validation, settings, POS pricing/stock/coupons, seller isolation).
- Sidebar items that exist in the reference but have no page here open a "not built yet" placeholder (POS, pre-orders, purchase, promotion, drivers, employees, etc.).
- Category, Shop and Product add/edit are full pages matching the reference forms' fields and sections (inspected, not submitted, on the reference). Images upload for real: the pickers POST to `/api/admin/uploads` (jpg/png/webp/gif, max 2 MB, auth required), files go to `storage/app/public/uploads` (run `php artisan storage:link` once), the record stores the path, lists show thumbnails, and replaced/deleted files are removed. The storefront shows these images on product cards, product detail, home categories, the category menu, shops and brands, with a placeholder/initial when none is set. Product video upload and the 'Additional Thumbnail' picker are not built. The reference's rich-text editor, 'Generate Via AI' and sub-category fields are not built. Brand and Blog still use modals. Settings, notifications, product variants and sub-categories are not built.
- Seed data is generated, not copied from the demo. Images are placeholders.
- No pixel-diff was run; matching is from measured styles and screenshots.
