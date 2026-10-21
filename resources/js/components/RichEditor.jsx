import React, { useEffect, useRef } from 'react';
import Quill from 'quill';
import DOMPurify from 'dompurify';
import 'quill/dist/quill.snow.css';
import { t } from '../i18n';

const TOOLBAR = [
    [{ header: [2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote', 'code-block', 'link', 'image'],
    ['clean'],
];

/** Rich-text editor (Quill). `value` / `onChange` carry HTML; the server sanitizes again on save. */
export function RichEditor({ value, onChange, placeholder, minHeight = 180, id }) {
    const host = useRef(null);
    const quill = useRef(null);
    const last = useRef(value ?? '');
    const cb = useRef(onChange);
    cb.current = onChange;

    useEffect(() => {
        const el = host.current;
        const q = new Quill(el, {
            theme: 'snow',
            placeholder: placeholder ?? '',
            modules: {
                toolbar: {
                    container: TOOLBAR,
                    handlers: {
                        // Images are linked by URL; embedding base64 would bloat every product row.
                        image() {
                            const url = window.prompt(t('Image URL (https://…)'));
                            if (url && /^https?:\/\//i.test(url)) q.insertEmbed(q.getSelection(true).index, 'image', url, 'user');
                        },
                    },
                },
            },
        });
        quill.current = q;
        if (last.current) q.clipboard.dangerouslyPasteHTML(DOMPurify.sanitize(last.current), 'silent');
        q.on('text-change', (_d, _o, source) => {
            if (source === 'silent') return;
            const html = q.getText().trim() === '' && !q.root.querySelector('img') ? '' : q.root.innerHTML;
            last.current = html;
            cb.current?.(html);
        });
        return () => { quill.current = null; el.innerHTML = ''; el.previousSibling?.classList?.contains('ql-toolbar') && el.previousSibling.remove(); };
    }, []);

    // An outside change (loading a record, reset) replaces the content; our own typing is skipped.
    useEffect(() => {
        const q = quill.current;
        if (!q || (value ?? '') === last.current) return;
        last.current = value ?? '';
        q.setContents([], 'silent');
        if (value) q.clipboard.dangerouslyPasteHTML(DOMPurify.sanitize(value), 'silent');
    }, [value]);

    return <div className="rich-editor" id={id} style={{ '--re-min': `${minHeight}px` }}><div ref={host} /></div>;
}

