import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { errorMessage, useAdminCollectionQuery, useAdminCollectionsQuery, useCollectionProductSearchQuery, useDeleteCollectionMutation, useSaveCollectionMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { ActBtn, Card, Modal, money, PageHead, SaIcon, Switch, Thumb, useDebounced } from '../../components/sa';
import { RichEditor } from '../../components/RichEditor';
import { t } from '../../i18n';

const MAX = 10;
const blank = { title: '', slug: '', description: '', show_on_home: true, active: true, sort: 0 };

function ProductPicker({ items, onChange, error }) {
    const [q, setQ] = useState('');
    const dq = useDebounced(q, 250);
    const { data: found = [], isFetching } = useCollectionProductSearchQuery(dq);
    const has = (id) => items.some((p) => p.id === id);
    const full = items.length >= MAX;
    const move = (i, d) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
    return (
        <div className="sa-field wide">
            <label>{t('Products')} <small className="muted">({items.length}/{MAX})</small></label>
            <div className="cart-box" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 8, marginBottom: 8 }}>
                {items.length === 0 && <p className="muted" style={{ margin: 6 }}>{t('Search below and click a product to add it.')}</p>}
                {items.map((p, i) => (
                    <div key={p.id} className="row" style={{ alignItems: 'center', padding: '4px 0' }}>
                        <span className="muted" style={{ width: 22 }}>{i + 1}</span><Thumb src={p.image_url} name={p.name} id={p.id} /><span style={{ flex: 1 }}>{p.name}</span><span className="muted">{money(p.price)}</span>
                        <button type="button" className="act" aria-label={t('Move up')} onClick={() => move(i, -1)}>↑</button>
                        <button type="button" className="act" aria-label={t('Move down')} onClick={() => move(i, 1)}>↓</button>
                        <button type="button" className="act" aria-label={t('Remove')} onClick={() => onChange(items.filter((x) => x.id !== p.id))}><SaIcon name="x" /></button>
                    </div>))}
            </div>
            <input className="input" aria-label={t('Search products')} placeholder={full ? t('Maximum of {n} products reached', { n: MAX }) : t('Search product by name or SKU')} value={q} onChange={(e) => setQ(e.target.value)} disabled={full} />
            {!full && <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 6, opacity: isFetching ? 0.6 : 1 }}>
                {found.map((p) => (
                    <button type="button" key={p.id} disabled={has(p.id)} onClick={() => onChange([...items, p])} className="row" style={{ width: '100%', textAlign: 'start', alignItems: 'center', padding: '6px 4px', background: 'none', border: 0, cursor: has(p.id) ? 'default' : 'pointer', opacity: has(p.id) ? 0.45 : 1, color: 'inherit' }}>
                        <Thumb src={p.image_url} name={p.name} id={p.id} /><span style={{ flex: 1 }}>{p.name}</span><span className="muted">{money(p.price)}</span><span>{has(p.id) ? '✓' : '+'}</span>
                    </button>))}
            </div>}
            {error && <span className="err">{error}</span>}
        </div>
    );
}

function CollectionForm({ id, onClose }) {
    const dispatch = useDispatch();
    const { data: rec } = useAdminCollectionQuery(id, { skip: !id });
    const [f, setF] = useState(null);
    const [items, setItems] = useState(null);
    const [save, { isLoading, error }] = useSaveCollectionMutation();
    const form = f ?? (id ? (rec ? { ...blank, ...rec } : null) : blank);
    const list = items ?? (id ? rec?.items : []);
    const errs = error?.data?.errors ?? {};
    if (!form || !list) return <Modal title={t('Collection')} onClose={onClose}><p className="muted">{t('Loading…')}</p></Modal>;
    const set = (k) => (v) => setF({ ...form, [k]: v });
    const submit = async (e) => {
        e.preventDefault();
        const r = await save({ id, title: form.title, slug: form.slug || null, description: form.description, show_on_home: !!form.show_on_home, active: !!form.active, sort: Number(form.sort) || 0, product_ids: list.map((p) => p.id) });
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        dispatch(pushToast(t('Collection saved'))); onClose();
    };
    const row = (k, label, props = {}) => <div className="sa-field"><label htmlFor={`c_${k}`}>{label}</label><input id={`c_${k}`} className="input" value={form[k] ?? ''} onChange={(e) => set(k)(e.target.value)} {...props} /><span className="err">{errs[k]?.[0]}</span></div>;
    return (
        <Modal wide title={id ? t('Edit Collection') : t('New Collection')} onClose={onClose} footer={<><button type="button" className="btn" onClick={onClose}>{t('Cancel')}</button><button form="col-form" className="btn primary" disabled={isLoading}>{isLoading ? t('Saving…') : t('Save')}</button></>}>
            <form id="col-form" className="form-grid" onSubmit={submit}>
                {row('title', t('Title (e.g. New Sell)'), { required: true })}{row('slug', t('URL slug (optional)'), { placeholder: 'new-sell' })}
                <div className="sa-field wide"><label>{t('Description')}</label><RichEditor value={form.description} onChange={set('description')} placeholder={t('Shown above the products on the collection page')} minHeight={110} /></div>
                <ProductPicker items={list} onChange={setItems} error={errs.product_ids?.[0]} />
                <div className="sa-field check"><Switch checked={!!form.show_on_home} label={t('Show on home page')} onChange={() => set('show_on_home')(!form.show_on_home)} /><label>{t('Show on home page')}</label></div>
                <div className="sa-field check"><Switch checked={!!form.active} label={t('Active')} onChange={() => set('active')(!form.active)} /><label>{t('Active')}</label></div>
                {row('sort', t('Order on home page (lower first)'), { type: 'number', min: 0 })}
            </form>
        </Modal>
    );
}

export default function Collections() {
    const dispatch = useDispatch();
    const { data = [], isLoading } = useAdminCollectionsQuery();
    const [del] = useDeleteCollectionMutation();
    const [edit, setEdit] = useState(null); // null | 'new' | id
    return (
        <>
            <PageHead title={t('Collections')}><button className="btn primary" onClick={() => setEdit('new')}><SaIcon name="plus" /> {t('New Collection')}</button></PageHead>
            <Card>
                <p className="muted" style={{ padding: '14px 20px 0', margin: 0 }}>{t('Group up to {n} products (like “New Sell”). Each collection gets its own page and can also appear on the home page.', { n: MAX })}</p>
                <div className="table-wrap"><table>
                    <thead><tr><th>{t('Title')}</th><th>{t('Page')}</th><th>{t('Products')}</th><th>{t('Home')}</th><th>{t('Status')}</th><th>{t('Action')}</th></tr></thead>
                    <tbody>
                        {data.map((c) => (
                            <tr key={c.id}><td>{c.title}</td><td><a href={`/collections/${c.slug}`} target="_blank" rel="noreferrer">/collections/{c.slug}</a></td><td>{c.count}</td><td>{c.show_on_home ? '✓' : '—'}</td><td>{c.active ? t('Active') : t('Inactive')}</td>
                                <td><div className="actions"><ActBtn icon="edit" title={t('Edit')} onClick={() => setEdit(c.id)} />
                                    <ActBtn icon="trash" title={t('Delete')} onClick={async () => { if (window.confirm(t('Delete this collection?'))) { const r = await del(c.id); dispatch(pushToast(r.error ? errorMessage(r.error) : t('Collection deleted'), r.error ? 'error' : 'success')); } }} /></div></td></tr>))}
                        {isLoading && <tr><td colSpan={6} className="empty">{t('Loading…')}</td></tr>}
                        {!isLoading && data.length === 0 && <tr><td colSpan={6} className="empty">{t('No collections yet. Create one such as “New Sell”.')}</td></tr>}
                    </tbody>
                </table></div>
            </Card>
            {edit && <CollectionForm key={edit} id={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
        </>
    );
}
