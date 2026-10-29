import React from 'react';

export function AuthModal({
  showAuthModal,
  setShowAuthModal,
  authMode,
  setAuthMode,
  handleAuthSubmit,
  authForm,
  setAuthForm,
  authError,
  authSuccess,
}) {
  if (!showAuthModal) return null;

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
            {authMode === 'login'
              ? 'Iniciar Sesión del Fisioterapeuta'
              : 'Registrar Cuenta del Consultorio'}
          </h2>
          <button
            type="button"
            onClick={() => setShowAuthModal(false)}
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
            <button
              type="button"
              onClick={() =>
                setAuthMode((prev) => (prev === 'login' ? 'signup' : 'login'))
              }
              className="underline text-xs font-bold text-[#004070] cursor-pointer"
            >
              {authMode === 'login'
                ? '¿Primera vez? Crear cuenta'
                : 'Ya tengo cuenta · Iniciar sesión'}
            </button>

            <button type="submit" className="submit-button">
              {authMode === 'login' ? 'Entrar al Consultorio' : 'Registrar Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
