import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';

/** Honors the visitor's "reduce motion" setting everywhere framer-motion is used. */
export const MotionRoot = ({ children }) => <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>{children}</MotionConfig>;

/** Fades and lifts the page in whenever the route changes (opacity + small slide only, so fixed/sticky children keep working). */
export function PageTransition({ children, className }) {
    const { pathname } = useLocation();
    return <motion.div key={pathname} className={className} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>{children}</motion.div>;
}

/** Scroll-reveal for page sections: rises once as it enters the viewport. */
export const rise = { initial: { opacity: 0, y: 26 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5 } };

/** Grid/list item with a stagger based on its index (capped so long lists do not drag). */
export const staggerItem = (i = 0) => ({ initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-40px' }, transition: { duration: 0.4, delay: Math.min(i, 8) * 0.05 } });

export { motion };
