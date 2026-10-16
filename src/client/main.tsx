import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { audio } from './audio/engine.ts';
import './styles/base.css';
import './styles/screens.css';
import './styles/game.css';

// Déverrouille l'audio au premier geste (jamais de son avant une interaction).
const unlock = () => void audio.unlock();
// À chaque geste (sans effet une fois le son actif) : iOS ne reconnaît que certains événements.
for (const type of ['pointerdown', 'touchend', 'click', 'keydown']) window.addEventListener(type, unlock, { capture: true, passive: true });

// Application installable (PWA) : mise en cache hors ligne du jeu solo.
if (!__STATIC__ && 'serviceWorker' in navigator && location.protocol !== 'file:' && !location.hostname.includes('localhost-nosw')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
