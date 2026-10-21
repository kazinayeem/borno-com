// Takes a full-page screenshot of every page of the storefront, admin panel and seller panel.
// Usage: node scripts/screenshots.mjs [baseUrl]   (needs the app running and Google Chrome installed)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8765';
const OUT = path.resolve('screenshots');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIEW = { width: 1440, height: 900, deviceScaleFactor: 1 };

const slug = (p) => (p.replace(/^\//, '').replace(/[?&=]/g, '-').replace(/[^a-zA-Z0-9-]+/g, '_').replace(/^_|_$/g, '') || 'home');
const api = async (p, body) => (await fetch(`${BASE}/api${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })).json();

async function session(browser, storage) {
    const page = await browser.newPage();
    await page.setViewport(VIEW);
    await page.evaluateOnNewDocument((kv) => { for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); }, { lang: 'en', theme: 'light', ...storage });
    return page;
}

async function shoot(page, area, routes, log) {
    const dir = path.join(OUT, area);
    fs.mkdirSync(dir, { recursive: true });
    let n = 0;
    for (const r of routes) {
        n += 1;
        const file = path.join(dir, `${String(n).padStart(3, '0')}-${slug(r)}.png`);
        try {
            await page.goto(BASE + r, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise((res) => setTimeout(res, 1400));            // let entrance animations and lazy images settle
            await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } window.scrollTo(0, 0); });
            await new Promise((res) => setTimeout(res, 500));
            await page.screenshot({ path: file, fullPage: true });
            log.push(`${area}\t${r}\tok`);
        } catch (e) { log.push(`${area}\t${r}\tFAILED ${e.message.slice(0, 80)}`); }
    }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
const log = [];
try {
    // ---- storefront, signed out (guest checkout is on for the demo, so /checkout renders the guest form) ----
    const shopPage = await session(browser, {});
    const prod = (await (await fetch(`${BASE}/api/products?per_page=1`)).json()).data[0].id;
    // a cart so cart/checkout are not empty
    const cart = JSON.stringify([{ id: prod, name: 'Sample', price: 49.99, qty: 1, stock: 10, image_url: null }]);
    await shopPage.evaluateOnNewDocument((c) => { if (!localStorage.getItem('cart') || localStorage.getItem('cart') === '[]') localStorage.setItem('cart', c); }, cart);
    const blogId = (await (await fetch(`${BASE}/api/blogs`)).json()).posts.data[0].id;
    const col = (await (await fetch(`${BASE}/api/collections`)).json())[0]?.slug;
    const shopRoutes = ['/', '/products', `/products/${prod}/details`, '/products?flash=1', '/shops', '/brands', '/blogs', `/blogs/${blogId}`, '/contact-us', '/pages/faq', '/pages/terms-conditions', '/pages/privacy-policy', '/pages/about-us', ...(col ? [`/collections/${col}`] : []), '/cart', '/wishlist', '/login', '/login?mode=register', '/checkout'];
    await shoot(shopPage, 'user-end', shopRoutes, log);
    await shopPage.close();

    // ---- storefront, signed in as the demo customer ----
    const c = await api('/account/login', { email: 'test@example.com', password: 'secret' });
    const custPage = await session(browser, { ctoken: JSON.stringify(c.token), cuser: JSON.stringify(c.user), cart });
    const orders = await (await fetch(`${BASE}/api/account/orders`, { headers: { Authorization: `Bearer ${c.token}`, Accept: 'application/json' } })).json();
    const oid = orders.data?.[0]?.id;
    await shoot(custPage, 'user-end-signed-in', ['/account', '/account/orders', ...(oid ? [`/account/orders/${oid}`] : []), '/account/addresses', '/account/profile', '/wishlist', '/checkout'], log);
    await custPage.close();

    // ---- admin: every sidebar page, plus the detail / form pages ----
    const a = await api('/auth/login', { email: 'root@readyecommerce.com', password: 'secret' });
    const adminStore = { token: JSON.stringify(a.token), user: JSON.stringify(a.user) };
    const adminPage = await session(browser, adminStore);
    await adminPage.goto(`${BASE}/admin`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    const links = await adminPage.evaluate(() => [...document.querySelectorAll('nav.menu a[href]')].map((x) => x.getAttribute('href')));
    const extra = ['/admin/orders/1/show', '/admin/orders/1/invoice', '/admin/orders/1/invoice?size=pos', '/admin/customers/8', '/admin/product/create', '/admin/digital-product/create', '/admin/products/8/edit', '/admin/category/create', '/admin/shops/create', '/admin/pos', '/admin/pos/sales', '/admin/pos/draft', '/admin/settings', '/admin/business-setting', '/admin/payment-gateway', '/admin/roles', '/admin/staff', '/admin/activity-logs', '/admin/email-templates', '/admin/collections', '/admin/messages'];
    const adminRoutes = [...new Set(['/admin', ...links.filter((h) => h.startsWith('/admin') || h.startsWith('/shop')), ...extra])];
    await shoot(adminPage, 'admin', adminRoutes, log);
    await adminPage.close();

    // ---- seller panel ----
    const s = await api('/auth/login', { email: 'shop@readyecommerce.com', password: 'secret' });
    const sellerPage = await session(browser, { token: JSON.stringify(s.token), user: JSON.stringify(s.user) });
    await sellerPage.goto(`${BASE}/shop`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    const sLinks = await sellerPage.evaluate(() => [...document.querySelectorAll('nav.menu a[href]')].map((x) => x.getAttribute('href')));
    await shoot(sellerPage, 'seller', [...new Set(['/shop', ...sLinks.filter((h) => h.startsWith('/shop') || h.startsWith('/admin'))])], log);
    await sellerPage.close();

    // ---- login page, signed out ----
    const loginPage = await session(browser, {});
    await shoot(loginPage, 'admin-login', ['/admin/login'], log);
} finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT, '_index.tsv'), `area\tpage\tresult\n${log.join('\n')}\n`);
    console.log(`${log.filter((l) => l.endsWith('ok')).length} captured, ${log.filter((l) => l.includes('FAILED')).length} failed`);
}
