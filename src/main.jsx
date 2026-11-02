import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './styles/mina-professional.css';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
  </React.StrictMode>
);
