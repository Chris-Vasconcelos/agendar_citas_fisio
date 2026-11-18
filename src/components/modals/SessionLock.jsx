import React, { useState } from 'react';
import { localUnlockSession, localSignOut } from '../../local/pocketbaseClient';

export function SessionLock({ email }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unlock = async (event) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { await localUnlockSession(password); setPassword(''); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen grid place-items-center p-6 bg-[#f7f4ed]" aria-label="MINA bloqueada">
    <section className="form-container w-full max-w-md space-y-4">
      <h1 className="text-xl font-bold">MINA está bloqueada</h1>
      <p>Tu trabajo abierto permanece en esta ventana. Desbloquea para continuar.</p>
      <p className="text-sm">{email}</p>
      <form onSubmit={unlock} className="space-y-4">
        <label className="form-label" htmlFor="unlock-password">Contraseña de tu cuenta MINA</label>
        <input id="unlock-password" className="form-input" type="password" autoComplete="current-password"
          required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="error-message active">{error}</p>}
        <button className="submit-button" disabled={busy}>Desbloquear MINA</button>
      </form>
      <button type="button" className="secondary-button" onClick={() => {
        if (window.confirm('Cerrar sesión descarta los formularios sin guardar. ¿Quieres salir?')) localSignOut();
      }}>Cerrar sesión y descartar formularios</button>
    </section>
  </main>;
}
