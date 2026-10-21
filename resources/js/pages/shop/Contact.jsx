import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { errorMessage, useSendContactMutation } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Icon } from '../../components/ui';
import { t } from '../../i18n';

const empty = { name: '', email: '', subject: '', message: '' };

export default function Contact() {
    const [form, setForm] = useState(empty);
    const [send, { isLoading, error }] = useSendContactMutation();
    const dispatch = useDispatch();
    const errs = error?.data?.errors ?? {};
    const submit = async (e) => {
        e.preventDefault();
        const r = await send(form);
        if (r.error) dispatch(pushToast(errorMessage(r.error), 'error'));
        else { dispatch(pushToast(r.data.message)); setForm(empty); }
    };
    const F = ({ k, label, area }) => (
        <div><label className="mb-1 block text-sm font-medium">{label} <span className="text-primary">*</span></label>
            {area ? <textarea rows={5} className="field" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /> : <input className="field" type={k === 'email' ? 'email' : 'text'} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
            {errs[k] && <p className="mt-1 text-xs text-red-500">{errs[k][0]}</p>}</div>
    );
    return (
        <div className="py-8">
            <div className="mx-auto mb-8 max-w-xl text-center text-sm text-muted">{t('We\'d love to hear from you! Whether you have a question about our products, orders, or anything else, our team is here to help.')}<div className="mx-auto mt-2 h-0.5 w-12 bg-primary" /></div>
            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
                <div className="rounded-2xl bg-primary-soft p-6"><h2 className="text-lg font-semibold">{t('Get in Touch')}</h2><p className="mb-5 text-sm text-muted">{t('Choose the way that works best for you.')}</p>
                    {[['mail', 'Email Us', 'support@readyecommerce.com'], ['truck', 'Call Us', '+8801700000000'], ['store', 'Visit Us', 'Dhaka, Bangladesh']].map(([i, title, d]) => (
                        <div key={title} className="mb-4 flex gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-sa-surface text-primary"><Icon name={i} /></span><div><p className="text-sm font-semibold">{t(title)}</p><p className="text-sm text-muted">{d}</p></div></div>))}</div>
                <form onSubmit={submit} className="card space-y-4 p-6"><h2 className="text-lg font-semibold">{t('Send Us a Message')}</h2>
                    <div className="grid gap-4 sm:grid-cols-2"><F k="name" label={t('Name')} /><F k="email" label={t('Email')} /></div>
                    <F k="subject" label={t('Subject')} /><F k="message" label={t('Message')} area />
                    <button disabled={isLoading} className="btn-primary">{isLoading ? t('Sending…') : t('Send Message')}</button></form>
            </div>
        </div>
    );
}
