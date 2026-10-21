import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { errorMessage, useEmailTemplatesQuery, useGetGroupQuery, useSaveEmailTemplateMutation, useSaveGroupMutation, useSendTestMailMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Card, PageHead, Switch } from '../../components/sa';
import { RichEditor } from '../../components/RichEditor';
import { Html } from '../../components/RichText';
import { t } from '../../i18n';

const SAMPLE = { app_name: 'Your Store', customer_name: 'Sample Customer', order_number: 'RC000123', order_total: '$129.00', order_status: 'Confirmed', order_link: 'https://example.com/account/orders/1', product_name: 'Sample product', stock_left: '2' };
const fill = (s) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => SAMPLE[k] ?? m);

export default function EmailTemplates() {
    const dispatch = useDispatch();
    const { data } = useEmailTemplatesQuery();
    const { data: mail } = useGetGroupQuery('mail');
    const [saveGroup] = useSaveGroupMutation();
    const [save, { isLoading }] = useSaveEmailTemplateMutation();
    const [sendTest, { isLoading: sending }] = useSendTestMailMutation();
    const [key, setKey] = useState('order_placed');
    const [draft, setDraft] = useState(null);
    const [to, setTo] = useState('');
    const tpl = data?.templates.find((x) => x.key === key);
    useEffect(() => { if (tpl) setDraft({ subject: tpl.subject, body: tpl.body }); }, [key, tpl?.subject, tpl?.body]); // eslint-disable-line
    const toast = (r, ok) => dispatch(pushToast(r.error ? errorMessage(r.error) : ok, r.error ? 'error' : 'success'));
    if (!data || !tpl || !draft) return <div className="skeleton" style={{ height: 300 }} />;
    const masterOn = mail ? mail.is_active !== false : data.enabled;
    const dirty = draft.subject !== tpl.subject || draft.body !== tpl.body;
    return (
        <>
            <PageHead title={t('Email Templates')} />
            <Card>
                <div className="card-b" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Switch checked={masterOn} label={t('Send emails')} onChange={async () => toast(await saveGroup({ key: 'mail', is_active: !masterOn }), masterOn ? t('Emails are now off') : t('Emails are now on'))} />
                    <div><b>{t('Send emails')}</b><small className="muted" style={{ display: 'block' }}>{masterOn ? t('Customers receive the emails below.') : t('No emails are sent at all while this is off.')}</small></div>
                </div>
            </Card>
            <div className="sa-grid" style={{ gridTemplateColumns: '260px minmax(0,1fr)', alignItems: 'start' }}>
                <Card><div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.templates.map((x) => (
                        <button key={x.key} onClick={() => setKey(x.key)} className={`btn ${x.key === key ? 'primary' : ''}`} style={{ justifyContent: 'space-between', textAlign: 'start' }}>
                            <span>{t(x.label)}</span><small>{x.enabled ? t('On') : t('Off')}</small></button>))}
                </div></Card>
                <Card>
                    <div className="card-h"><h3 style={{ flex: 1 }}>{t(tpl.label)}</h3>
                        <Switch checked={tpl.enabled} label={t('This email is on')} onChange={async () => toast(await save({ key, enabled: !tpl.enabled }), t('Saved'))} /></div>
                    <div className="card-b">
                        <div className="sa-field"><label htmlFor="et-subject">{t('Subject')}</label><input id="et-subject" className="input" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></div>
                        <div className="sa-field"><label>{t('Message')}</label><RichEditor key={key} value={draft.body} onChange={(v) => setDraft((d) => ({ ...d, body: v }))} minHeight={180} /></div>
                        <p className="muted" style={{ fontSize: 12 }}>{t('Placeholders')}: {data.variables.map((v) => <code key={v} style={{ marginInlineEnd: 6 }}>{v}</code>)}</p>
                        <h4 style={{ margin: '14px 0 6px' }}>{t('Preview')}</h4>
                        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: '#fff', color: '#1f2330' }}>
                            <p style={{ margin: '0 0 10px', fontWeight: 700 }}>{fill(draft.subject)}</p><Html html={fill(draft.body)} className="text-sm" />
                        </div>
                        <div className="row" style={{ marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                            <button className="btn primary" disabled={isLoading || !dirty} onClick={async () => toast(await save({ key, ...draft }), t('Template saved'))}>{isLoading ? t('Saving…') : t('Save template')}</button>
                            {tpl.customized && <button className="btn" onClick={async () => { if (window.confirm(t('Restore the default text?'))) toast(await save({ key, reset: true }), t('Restored')); }}>{t('Reset to default')}</button>}
                            <span style={{ flex: 1 }} />
                            <input className="input" type="email" style={{ maxWidth: 220 }} aria-label={t('Send a test to')} placeholder={t('Send a test to…')} value={to} onChange={(e) => setTo(e.target.value)} />
                            <button className="btn" disabled={sending || !to} onClick={async () => { const r = await sendTest({ to, template: key }); toast(r, r.data?.message ?? t('Test sent')); }}>{sending ? t('Sending…') : t('Send test')}</button>
                        </div>
                        <small className="muted">{t('Tests are sent with your SMTP settings and ignore the on/off switches. Save first to test your edits.')}</small>
                    </div>
                </Card>
            </div>
        </>
    );
}
