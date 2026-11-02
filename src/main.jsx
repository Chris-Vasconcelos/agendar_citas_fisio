import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { missingProdConfig } from './lib/supabase';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary.jsx';
import './index.css';
import './styles/agenda-profesional.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      {missingProdConfig ? (
        <main role="alert" className="min-h-screen grid place-items-center p-8 text-slate-800">
          <div className="max-w-lg rounded-xl border border-red-200 bg-white p-6">
            <h1 className="text-xl font-bold">MINA no está configurada</h1>
            <p className="mt-2">No es seguro guardar expedientes en este dispositivo sin conexión a la base de datos. Contacta al administrador.</p>
          </div>
        </main>
      ) : <App />}
    </AppErrorBoundary>
  </React.StrictMode>
);
