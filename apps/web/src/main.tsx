/// <reference types="vite-plugin-pwa/client" />
import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';

// Register PWA Service Worker
registerSW({ immediate: true });

// Mount React Root
createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
