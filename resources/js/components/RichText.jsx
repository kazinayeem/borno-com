import React from 'react';
import DOMPurify from 'dompurify';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
});

const PURIFY = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'blockquote', 'pre', 'code', 'hr', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'span', 'div', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'width', 'height', 'class', 'style', 'dir', 'target', 'rel'],
};

/** Renders stored HTML for shoppers. Sanitized again in the browser as defence in depth. */
export function Html({ html, className = '' }) {
    if (!html) return null;
    // Older plain-text descriptions have no tags: keep their line breaks.
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(html);
    const safe = DOMPurify.sanitize(isHtml ? html : html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>'), PURIFY);
    return <div className={`rich-html ${className}`} dangerouslySetInnerHTML={{ __html: safe }} />;
}

/** Text-only preview (cards, meta). */
export function stripHtml(html) {
    return (html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
