import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { errorMessage, useGetMasterQuery, useLoginMutation } from '../../app/api';
import { loggedIn, pushToast, setLang, toggleTheme } from '../../app/slices';
import { Icon } from '../../components/ui';
import { LANGS, t } from '../../i18n';

// Demo logins (all use the password "secret"); the second value says what each can open.
const demos = [
    ['Demo Admin Credentials', 'root@readyecommerce.com', 'Full access'],
    ['Demo Shop Credentials', 'shop@readyecommerce.com', 'Seller panel'],
    ['Demo Staff · Manager', 'manager@readyecommerce.com', 'Orders, POS, products, promotions, content'],
    ['Demo Staff · Order Handler', 'order.handler@readyecommerce.com', 'View and update orders, POS sales'],
    ['Demo Staff · Content Editor', 'content.editor@readyecommerce.com', 'Blog, pages, promotions'],
    ['Demo Staff · Support Agent', 'support.agent@readyecommerce.com', 'View orders and customers, reply to messages'],
];

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [show, setShow] = useState(false);
    const [login, { isLoading, error }] = useLoginMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { token, user } = useSelector((s) => s.auth);
    const lang = useSelector((s) => s.ui.lang);
    const dark = useSelector((s) => s.ui.theme) === 'dark';
    const { data: master } = useGetMasterQuery();
    const brand = master?.data;
    const name = brand?.app_name || t('ReadyEcommerce');
    if (token) return <Navigate to={user?.role === 'shop' ? '/shop' : '/admin'} replace />;
    const errs = error?.data?.errors ?? {};

    const signIn = async (creds) => {
        const r = await login(creds);
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        dispatch(loggedIn(r.data));
        navigate(r.data.user?.role === 'shop' ? '/shop' : '/admin');
    };
    const submit = (e) => { e.preventDefault(); signIn(form); };

    return (
        <section className="login-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
            <div className="absolute end-4 top-4 flex items-center gap-2">
                <select aria-label={t('Language')} value={lang} onChange={(e) => dispatch(setLang(e.target.value))} className="field !w-auto !py-1.5 text-xs">{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select>
                <button type="button" onClick={() => dispatch(toggleTheme())} aria-label={dark ? t('Switch to Light') : t('Switch to Dark')} title={dark ? t('Switch to Light') : t('Switch to Dark')} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-sa-surface transition hover:border-primary hover:text-primary"><Icon name={dark ? 'sun' : 'moon'} size={16} /></button>
            </div>
            <div className="relative w-full max-w-[480px] rounded-2xl border border-line bg-sa-surface p-6 shadow-xl sm:p-8">
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                    <span>{t('Powered by')} <b className="text-primary">bornosoft.bd</b> ©2026</span>
                    <span className="rounded bg-primary-soft px-2 py-1 font-bold text-primary">{t('v4.6.1')}</span>
                </div>
                <div className="mt-6 text-center"><img src={(dark && brand?.web_dark_logo) || brand?.web_logo || '/assets/logo.png'} alt={name} className="mx-auto h-14 max-w-[220px] object-contain" /></div>
                <div className="my-5 text-center"><p className="mb-1 text-sm text-muted">{t('Welcome to')} <b className="text-primary">{name}</b></p><h1 className="text-2xl font-semibold text-ink">{t('Login To Admin')}</h1></div>
                <form onSubmit={submit} noValidate>
                    <div className="mb-4"><label htmlFor="email" className="mb-1 block text-sm font-medium">{t('Enter Address')}</label>
                        <input id="email" type="email" autoComplete="username" placeholder={t('Enter Email Address')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field !py-3" />
                        {errs.email && <p className="mt-1 text-xs text-red-500">{errs.email[0]}</p>}</div>
                    <div className="mb-5"><label htmlFor="password" className="mb-1 block text-sm font-medium">{t('Password')}</label>
                        <div className="relative"><input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder={t('Enter Password')} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field !py-3 pe-11" />
                            <button type="button" onClick={() => setShow(!show)} aria-label={t('Toggle password')} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"><Icon name={show ? 'eye' : 'eyeOff'} /></button></div>
                        {errs.password && <p className="mt-1 text-xs text-red-500">{errs.password[0]}</p>}</div>
                    <button disabled={isLoading} className="btn-primary w-full !rounded-md !py-3 text-base">{isLoading ? t('Logging in…') : t('Login')}</button>
                    <div className="mt-5 text-xs leading-5 text-muted">
                        <p>{t('This is a public demo environment for the ReadyEcommerce software.')}</p>
                        <p>{t('The accounts below are demo accounts for testing purposes only and do not contain real user data.')}</p>
                        <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pe-1">{demos.map(([title, email, access]) => (
                            <div key={email} className="overflow-hidden rounded-lg border border-line bg-surface"><div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5"><span className="font-semibold text-ink">{t(title)}</span><span className="truncate text-[11px] text-muted">{t(access)}</span></div>
                                <div className="flex items-center justify-between gap-2 px-3 py-2"><div className="flex min-w-0 flex-col text-ink"><span className="truncate">{t('Email: {v}', { v: email })}</span><span>{t('Password: {v}', { v: 'secret' })}</span></div>
                                    <div className="flex shrink-0 gap-1.5">
                                        <button type="button" aria-label={t('Fill credentials')} title={t('Fill credentials')} onClick={() => setForm({ email, password: 'secret' })} className="grid h-8 w-8 place-items-center rounded border border-line bg-sa-surface transition hover:border-primary hover:text-primary"><Icon name="copy" size={15} /></button>
                                        <button type="button" disabled={isLoading} onClick={() => signIn({ email, password: 'secret' })} className="rounded bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60">{t('Quick login')}</button></div></div></div>))}</div>
                    </div>
                </form>
            </div>
        </section>
    );
}
