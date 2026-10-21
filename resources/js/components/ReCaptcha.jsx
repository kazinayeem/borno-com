import React, { useEffect, useRef } from 'react';

let loading;
const loadScript = () => {
    if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha);
    loading ??= new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        s.async = true; s.onload = () => window.grecaptcha.ready(() => resolve(window.grecaptcha)); s.onerror = () => { loading = null; reject(new Error('reCAPTCHA failed to load')); };
        document.head.appendChild(s);
    });
    return loading;
};

/** Google reCAPTCHA v2 checkbox. Renders nothing unless a site key is set; reports the token (or '' once it expires). */
export default function ReCaptcha({ siteKey, onToken, resetKey }) {
    const box = useRef(null);
    const id = useRef(null);
    useEffect(() => {
        if (!siteKey) return undefined;
        let dead = false;
        loadScript().then((g) => {
            if (dead || !box.current) return;
            box.current.innerHTML = '';
            id.current = g.render(box.current, { sitekey: siteKey, callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onToken('') });
        }).catch(() => {});
        return () => { dead = true; };
    }, [siteKey]); // eslint-disable-line
    useEffect(() => { if (id.current != null) { window.grecaptcha?.reset(id.current); onToken(''); } }, [resetKey]); // eslint-disable-line
    return siteKey ? <div ref={box} className="my-3 flex justify-center" /> : null;
}
