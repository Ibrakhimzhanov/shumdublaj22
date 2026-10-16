import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './app.css';

async function boot() {
  // В обычном браузере мостика Electron нет: подставляем заглушку,
  // чтобы можно было посмотреть интерфейс без сборки приложения.
  if (!window.sv && import.meta.env.DEV) await import('./dev-mock.js');
  createRoot(document.getElementById('root')).render(<App />);
}

boot();
