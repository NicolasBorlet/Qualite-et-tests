import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser');
  await worker.start();
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
