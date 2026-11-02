import React from 'react';
import { Shield, Lock, LogOut, Plus, Settings2 } from 'lucide-react';
import { signOutUser, isSupabaseConfigured } from '../../lib/supabase';

export function Header({
  designSkill,
  setDesignSkill,
  textSize,
  setTextSize,
  session,
  setShowPrivacyNoticeModal,
  setAuthError,
  setAuthSuccess,
  setShowAuthModal,
  openCreateAppointmentModal,
  selectedDate
}) {
  return (
    <header className="mina-app-header">
      <div className="dash-navbar mina-header-inner">
        <div className="mina-brand" aria-label="MINA — El valor del movimiento">
          <div className="mina-brand-mark" aria-hidden="true">M</div>
          <div className="mina-brand-copy">
            <span className="mina-brand-title">MINA</span>
            <span className="mina-brand-subtitle">El valor del movimiento</span>
          </div>
        </div>

        <div className="mina-header-actions">
          <div className="mina-text-size-control" role="group" aria-label="Tamaño del texto">
            {[
              { value: 'sm', label: 'A−', title: 'Texto más pequeño' },
              { value: 'md', label: 'A', title: 'Texto normal' },
              { value: 'lg', label: 'A+', title: 'Texto más grande' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`mina-text-size-button ${textSize === item.value ? 'active' : ''}`}
                aria-pressed={textSize === item.value}
                aria-label={item.title}
                title={item.title}
                onClick={() => setTextSize(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <details className="mina-settings">
            <summary className="mina-icon-button" title="Apariencia" aria-label="Apariencia">
              <Settings2 className="w-4 h-4" aria-hidden="true" />
            </summary>
            <div className="mina-settings-popover">
              <label htmlFor="typeui-skill-selector">Apariencia</label>
              <select
                id="typeui-skill-selector"
                value={designSkill}
                onChange={(e) => setDesignSkill(e.target.value)}
                className="header-theme-select"
              >
                <option value="clean">Clínico</option>
                <option value="craft">Craft</option>
                <option value="bento">Bento</option>
                <option value="shadcn">Shadcn</option>
                <option value="paper">Papel</option>
              </select>
            </div>
          </details>

          <button type="button" className="mina-icon-button" title="Aviso de privacidad"
            aria-label="Aviso de privacidad" onClick={() => setShowPrivacyNoticeModal(true)}>
            <Shield className="w-4 h-4" aria-hidden="true" />
          </button>

          {session ? (
            <button type="button" className="mina-icon-button" title="Cerrar sesión"
              aria-label="Cerrar sesión" onClick={signOutUser}>
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="mina-icon-button" title="Iniciar sesión"
              aria-label="Iniciar sesión"
              onClick={() => {
                setAuthError('');
                setAuthSuccess('');
                setShowAuthModal(true);
              }}>
              <Lock className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          {(!isSupabaseConfigured || session) && (
            <button type="button" className="mina-new-appointment"
              onClick={() => openCreateAppointmentModal('09:00', 'auto', selectedDate)}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Nueva cita</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
