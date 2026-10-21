import '../css/app.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './app/store';
import App from './App';
import { MotionRoot } from './components/Motion';

// After a new build, an already-open tab asks for chunk files that no longer exist. Reload once to pick up the new build.
const reloadForNewBuild = () => {
    try { if (sessionStorage.getItem('chunk-reload') === String(Math.floor(Date.now() / 60000))) return; sessionStorage.setItem('chunk-reload', String(Math.floor(Date.now() / 60000))); } catch { /* storage blocked: reload anyway */ }
    window.location.reload();
};
window.addEventListener('vite:preloadError', (e) => { e.preventDefault(); reloadForNewBuild(); });

createRoot(document.getElementById('root')).render(
    <Provider store={store}>
        <BrowserRouter>
            <MotionRoot><App /></MotionRoot>
        </BrowserRouter>
    </Provider>,
);
