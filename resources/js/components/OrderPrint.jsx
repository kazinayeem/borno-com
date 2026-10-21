import React from 'react';
import { t } from '../i18n';

const num = (v) => Number(v || 0);
const fmtDate = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const label = (s) => String(s ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Invoice / receipt sheet. `size` is "a4" (full invoice) or "pos" (80 mm thermal receipt). Only this block prints. */
export function OrderPrint({ o, brand, size = 'a4', kind = 'invoice', money }) {
    const pos = size === 'pos';
    const slip = kind === 'slip';
    const company = brand?.company_name || brand?.app_name || '';
    const logo = brand?.web_logo || '/assets/logo.png';
    const paid = o.payment_status === 'paid';
    const lines = (o.items ?? []).map((i) => ({ ...i, total: num(i.price) * num(i.qty), opt: [i.size, i.color].filter(Boolean).join(', ') }));
    const sums = [
        [t('Sub Total'), money(o.subtotal)],
        num(o.coupon_discount) > 0 && [t('Discount'), `- ${money(o.coupon_discount)}`],
        [t('Delivery Charge'), money(o.shipping)],
        num(o.vat_tax) > 0 && [t('VAT & Tax'), money(o.vat_tax)],
    ].filter(Boolean);
    return (
        <>
            <style>{pos ? '@page { size: 80mm auto; margin: 3mm; }' : '@page { size: A4; margin: 12mm; }'}</style>
            <article className={`inv-root inv ${pos ? 'inv-pos' : 'inv-a4'}`}>
                {pos ? (
                    <header className="inv-pos-head">
                        <img src={logo} alt={company} />
                        <h1>{company}</h1>
                        {brand?.mobile && <p>{brand.mobile}</p>}{brand?.email && <p>{brand.email}</p>}
                        <hr />
                        <p><b>{slip ? t('Payment Slip') : t('Receipt')}</b> #{o.number}</p>
                        <p>{fmtDate(o.created_at)}</p>
                        {o.user?.name && <p>{t('Customer')}: {o.user.name}</p>}
                    </header>
                ) : (
                    <header className="inv-head">
                        <div className="inv-brand"><img src={logo} alt={company} /><div><h2>{company}</h2>{brand?.email && <p>{brand.email}</p>}{brand?.mobile && <p>{brand.mobile}</p>}{brand?.address && <p>{brand.address}</p>}</div></div>
                        <div className="inv-title"><h1>{slip ? t('Payment Slip') : t('Invoice')}</h1><dl><dt>{t('Invoice No')}</dt><dd>#{o.number}</dd><dt>{t('Date')}</dt><dd>{fmtDate(o.created_at)}</dd><dt>{t('Status')}</dt><dd>{label(o.status)}</dd></dl>
                            <span className={`inv-stamp ${paid ? 'paid' : 'due'}`}>{paid ? t('Paid') : t('Pending')}</span></div>
                    </header>
                )}

                {!pos && (
                    <section className="inv-parties">
                        <div><h3>{t('Billed to')}</h3><p><b>{o.user?.name}</b></p><p>{o.user?.phone}</p><p>{o.user?.email}</p></div>
                        <div><h3>{t('Ship to')}</h3><p><b>{o.address_name}</b></p><p>{o.shipping_address}{o.area ? `, ${o.area}` : ''}</p><p>{o.address_phone}</p></div>
                        <div><h3>{t('Payment')}</h3><p><b>{o.payment_method}</b></p>{o.shop && <p>{t('Shop:')} {o.shop.name}</p>}</div>
                    </section>
                )}

                {!slip && (
                    <table className="inv-table">
                        <thead><tr>{pos ? <><th>{t('Item')}</th><th>{t('Qty')}</th><th>{t('Total')}</th></> : <><th>#</th><th>{t('Item')}</th><th>{t('Qty')}</th><th>{t('Price')}</th><th>{t('Total')}</th></>}</tr></thead>
                        <tbody>{lines.map((i, n) => pos ? (
                            <tr key={i.id}><td>{i.name}{i.opt && <small> ({i.opt})</small>}<small className="inv-sub">{i.qty} × {money(i.price)}</small></td><td>{i.qty}</td><td>{money(i.total)}</td></tr>
                        ) : (
                            <tr key={i.id}><td>{n + 1}</td><td>{i.name}{i.opt && <small> ({i.opt})</small>}</td><td>{i.qty}</td><td>{money(i.price)}</td><td>{money(i.total)}</td></tr>
                        ))}</tbody>
                    </table>
                )}

                <dl className="inv-sums">
                    {!slip && sums.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                    <div className="inv-grand"><dt>{slip ? t('Amount') : t('Grand Total')}</dt><dd>{money(o.total)}</dd></div>
                    {pos && <div><dt>{t('Payment')}</dt><dd>{o.payment_method} · {paid ? t('Paid') : t('Pending')}</dd></div>}
                </dl>

                <footer className="inv-foot">
                    <p>{t('Thank you for shopping with {name}.', { name: company })}</p>
                    <p className="inv-dev">Developed by bornosoft.bd</p>
                </footer>
            </article>
        </>
    );
}

/** A4 / POS switch + print button shown above the sheet (never printed). */
export function PrintBar({ size, onSize, onBack, backLabel, kind }) {
    return (
        <div className="inv-bar">
            {onBack ? <button className="btn" onClick={onBack}>{backLabel}</button> : <span />}
            <div className="inv-seg" role="group" aria-label={t('Paper size')}>
                <button className={size === 'a4' ? 'on' : ''} aria-pressed={size === 'a4'} onClick={() => onSize('a4')}>A4</button>
                <button className={size === 'pos' ? 'on' : ''} aria-pressed={size === 'pos'} onClick={() => onSize('pos')}>{t('POS 80mm')}</button>
            </div>
            <button className="btn primary" onClick={() => window.print()}>{kind === 'slip' ? t('Print / Save Slip') : t('Print / Save PDF')}</button>
        </div>
    );
}
