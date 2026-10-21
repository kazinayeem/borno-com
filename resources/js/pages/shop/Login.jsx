import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { errorMessage, useCustGoogleMutation, useCustLoginMutation, useCustRegisterMutation, useGetMasterQuery } from '../../app/api';
import { customerLoggedIn, pushToast } from '../../app/slices';
import { Field, TextInput } from '../../components/FormKit';

// Only same-site paths are honoured, so a crafted ?next= cannot send people to another website.
const safeNext = (n) => (n && /^\/(?!\/)/.test(n) ? n : '/account');

function GoogleButton({ clientId, onCredential }) {
    const box = useRef(null);
    const cb = useRef(onCredential);
    const [err, setErr] = useState(null);
    cb.current = onCredential;
    useEffect(() => {
        let dead = false;
        const init = () => {
            if (dead || !window.google?.accounts?.id || !box.current) return;
            window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => cb.current(r.credential) });
            window.google.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', width: Math.min(box.current.offsetWidth || 340, 400), text: 'continue_with', shape: 'rectangular' });
        };
        if (window.google?.accounts?.id) init();
        else {
            let s = document.querySelector('script[data-gsi]');
            if (!s) { s = Object.assign(document.createElement('script'), { src: 'https://accounts.google.com/gsi/client', async: true, defer: true }); s.dataset.gsi = '1'; document.head.appendChild(s); }
            s.addEventListener('load', init);
            s.addEventListener('error', () => setErr('Could not load Google sign-in. Check your connection.'));
        }
        return () => { dead = true; };
    }, [clientId]);
    return <div><div ref={box} className="flex min-h-[44px] justify-center" />{err && <p className="mt-1 text-center text-xs text-red-500">{err}</p>}</div>;
}

export default function Login() {
    const [sp] = useSearchParams();
    const next = safeNext(sp.get('next'));
    const [mode, setMode] = useState(sp.get('mode') === 'register' ? 'register' : 'login');
    const [f, setF] = useState({ name: '', email: '', phone: '', password: '', password_confirmation: '' });
    const [login, { isLoading: l1, error: e1 }] = useCustLoginMutation();
    const [register, { isLoading: l2, error: e2 }] = useCustRegisterMutation();
    const [google] = useCustGoogleMutation();
    const { data: master } = useGetMasterQuery();
    const token = useSelector((s) => s.customer.token);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    if (token) return <Navigate to={next} replace />;
    const errs = (mode === 'login' ? e1 : e2)?.data?.errors ?? {};
    const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
    const done = (r) => { dispatch(customerLoggedIn(r.data)); dispatch(pushToast('Signed in')); navigate(next, { replace: true }); };
    const submit = async (e) => {
        e.preventDefault();
        const r = mode === 'login' ? await login({ email: f.email, password: f.password }) : await register(f);
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        done(r);
    };
    const onGoogle = async (credential) => {
        const r = await google(credential);
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        done(r);
    };
    const clientId = master?.data?.google_client_id;

    return (
        <div className="mx-auto my-8 max-w-md">
            <div className="card p-6">
                <div className="mb-5 grid grid-cols-2 rounded-lg bg-surface p-1 text-sm font-medium" role="tablist">
                    {[['login', 'Sign in'], ['register', 'Create account']].map(([k, label]) => <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`rounded-md py-2 ${mode === k ? 'bg-sa-surface shadow-sm' : 'text-muted'}`}>{label}</button>)}
                </div>
                <form onSubmit={submit} noValidate>
                    {mode === 'register' && <Field label="Full name" required error={errs.name?.[0]}><TextInput value={f.name} onChange={set('name')} autoComplete="name" /></Field>}
                    <Field label="Email" required error={errs.email?.[0]}><TextInput type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
                    {mode === 'register' && <Field label="Phone (optional)" error={errs.phone?.[0]}><TextInput value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>}
                    <Field label="Password" required error={errs.password?.[0]} hint={mode === 'register' ? 'At least 8 characters.' : undefined}><TextInput type="password" value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
                    {mode === 'register' && <Field label="Confirm password" required><TextInput type="password" value={f.password_confirmation} onChange={set('password_confirmation')} autoComplete="new-password" /></Field>}
                    <button disabled={l1 || l2} className="btn-primary w-full !py-3">{l1 || l2 ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
                </form>
                <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
                {clientId ? <GoogleButton clientId={clientId} onCredential={onGoogle} /> : <p className="rounded-lg bg-surface p-3 text-center text-xs text-muted">Google sign-in is not set up on this site yet.</p>}
                <p className="mt-5 text-center text-xs text-muted">Store staff? <Link to="/admin/login" className="text-primary underline">Admin login</Link></p>
            </div>
        </div>
    );
}
