import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { errorMessage, useLoginMutation } from '../../app/api';
import { loggedIn, pushToast } from '../../app/slices';
import { Icon } from '../../components/ui';
import { t } from '../../i18n';

const demos = [['Demo Admin Credentials', 'root@readyecommerce.com'], ['Demo Shop Credentials', 'shop@readyecommerce.com']];

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [show, setShow] = useState(false);
    const [login, { isLoading, error }] = useLoginMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { token, user } = useSelector((s) => s.auth);
    if (token) return <Navigate to={user?.role === 'shop' ? '/shop' : '/admin'} replace />;
    const errs = error?.data?.errors ?? {};

    const submit = async (e) => {
        e.preventDefault();
        const r = await login(form);
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        dispatch(loggedIn(r.data));
        navigate(r.data.user?.role === 'shop' ? '/shop' : '/admin');
    };

    return (
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fdf7f3] px-4 py-8">
            <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 10% 20%, #fde8c9 0, transparent 35%), radial-gradient(circle at 15% 85%, #dff3ee 0, transparent 35%), radial-gradient(circle at 90% 90%, #fdecf0 0, transparent 30%)' }} />
            <div className="absolute bottom-[28%] left-0 hidden items-center gap-2 lg:flex">
                <img src="/assets/favicon.png" alt={t('logo')} className="h-10 w-10" />
                <span className="text-xl font-bold text-gray-500">{t('ReadyEcommerce')}</span>
            </div>
            <div className="relative w-full max-w-[600px] rounded-2xl border border-line bg-sa-surface p-[18px] shadow-xl sm:p-[18px]">
                <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                    <span>{t('Powered by')} <a href="https://razinsoft.com/" target="_blank" rel="noreferrer" className="font-bold text-primary">{t('RazinSoft')}</a> ©2026</span>
                    <span className="rounded bg-primary-soft px-2 py-1 font-bold text-primary">{t('v4.6.1')}</span>
                </div>
                <div className="mt-6 text-center"><img src="/assets/logo.png" alt={t('ReadyEcommerce')} className="mx-auto h-20 max-w-full" /></div>
                <div className="my-4 text-center"><p className="my-3 text-sm">{t('Welcome to')} <b className="text-primary">{t('ReadyEcommerce')}</b></p><h2 className="text-2xl font-medium text-ink">{t('Login To Admin')}</h2></div>
                <hr className="mb-5 border-line" />
                <form onSubmit={submit} noValidate>
                    <div className="mb-4"><label htmlFor="email" className="mb-1 block text-[15px]">{t('Enter Address')}</label>
                        <input id="email" type="email" autoComplete="username" placeholder={t('Enter Email Address')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field !border-primary/70 !py-3" />
                        {errs.email && <p className="mt-1 text-xs text-red-500">{errs.email[0]}</p>}</div>
                    <div className="mb-5"><label htmlFor="password" className="mb-1 block text-[15px]">{t('Password')}</label>
                        <div className="relative"><input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder={t('Enter Password')} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field !border-primary/70 !py-3 pr-11" />
                            <button type="button" onClick={() => setShow(!show)} aria-label={t('Toggle password')} className="absolute right-3 top-1/2 -translate-y-1/2"><Icon name={show ? 'eye' : 'eyeOff'} /></button></div>
                        {errs.password && <p className="mt-1 text-xs text-red-500">{errs.password[0]}</p>}</div>
                    <button disabled={isLoading} className="btn-primary w-full !rounded-md !py-3 text-base">{isLoading ? t('Logging in…') : t('Login')}</button>
                    <div className="mt-3 text-xs leading-5 text-gray-600">
                        <p>{t('This is a public demo environment for the ReadyEcommerce software.')}</p>
                        <p>{t('The accounts below are demo accounts for testing purposes only and do not contain real user data.')}</p>
                        {demos.map(([title, email]) => (
                            <div key={title} className="mt-2 overflow-hidden rounded border border-line bg-surface"><div className="border-b border-line px-2 py-1 font-semibold text-ink">{t(title)}</div>
                                <div className="flex items-center justify-between px-2 py-2"><div className="flex flex-col"><span>{t('Email: {v}', { v: email })}</span><span>{t('Password: {v}', { v: 'secret' })}</span></div>
                                    <button type="button" aria-label="Fill credentials" onClick={() => setForm({ email, password: 'secret' })} className="grid h-8 w-8 place-items-center rounded bg-primary text-white"><Icon name="copy" size={15} /></button></div></div>))}
                    </div>
                </form>
            </div>
        </section>
    );
}
