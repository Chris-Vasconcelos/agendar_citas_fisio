import React, { useState } from 'react';
import { signInWithEmailPassword } from '../../lib/backend';

export function AuthModal({
  isOpen,
  onClose,
  authError,
  setAuthError,
  authSuccess,
  setAuthSuccess,
}) {
  const [busy, setBusy] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });

  if (!isOpen) return null;

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setAuthError('');
    setAuthSuccess('');

    const cleanEmail = authForm.email.trim();
    const cleanPass = authForm.password;

    if (!cleanEmail.includes('@') || cleanPass.length < 6) {
      setAuthError('Ingresa un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await signInWithEmailPassword(cleanEmail, cleanPass);
      if (error) {
        setAuthError(error.message);
        return;
      }
      setAuthForm({ email: '', password: '' });
      onClose();
    } catch (err) {
      setAuthError(err?.message || 'Error de autenticación.');
    } finally { setBusy(false); }
  };

  return (
    <div
      className="fixed inset-0 z-30 bg-slate-900/60 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-auth-title"
    >
      <div className="form-container">
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-auth-title" className="text-lg font-bold text-[#222222]">
            Iniciar Sesión del Fisioterapeuta
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="secondary-button text-xs py-1 px-2.5"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleAuthSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="auth-email-input" className="form-label">
              Correo electrónico <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <input
              id="auth-email-input"
              type="email"
              required
              value={authForm.email}
              onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="eduardo@fisiodeportiva.mx"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password-input" className="form-label">
              Contraseña <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <input
              id="auth-password-input"
              type="password"
              required
              minLength={6}
              value={authForm.password}
              onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
              className="form-input"
            />
          </div>

          <div aria-live="polite" className="mb-4">
            {authError && <div className="error-message active">{authError}</div>}
            {authSuccess && (
              <div className="p-2.5 rounded-sm bg-emerald-50 border border-[#137752] text-xs font-bold text-[#137752]">
                {authSuccess}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600">Acceso exclusivo del consultorio. Las cuentas son administradas por el responsable del sistema.</p>
            <button type="submit" disabled={busy} className="submit-button">
              Entrar al Consultorio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
