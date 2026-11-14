import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary.jsx';
import './fonts.css';
import './index.css';
import './styles/agenda-profesional.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
