import React from 'react';
import { Shield, Lock, LogOut, Plus, Settings2 } from 'lucide-react';
import { signOutUser, isSupabaseConfigured } from '../../lib/supabase';

export function Header({
  designSkill,
  setDesignSkill,
  session,
  setShowPrivacyNoticeModal,
  setAuthError,
  setAuthSuccess,
  setShowAuthModal,
  openCreateAppointmentModal,
  activeTab,
  setActiveTab,
  patientsCount,
  selectedDate
}) {
  return (
    <header className="mina-site-header sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="dash-navbar">
          <div className="flex items-center gap-2.5">
            <div className="mina-brand-mark" aria-hidden="true">
              M
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold m-0">MINA</h1>
              </div>
              <p className="hidden md:block text-[11px] m-0 opacity-85">
                El valor del movimiento
              </p>
            </div>
          </div>

          <nav aria-label="Secciones principales" className="mina-desktop-nav">
            {[
              ['agenda', 'Agenda'],
              ['patients', 'Expedientes'],
              ['availability', 'Horarios'],
              ['security', 'Respaldos'],
            ].map(([tab, label]) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? 'is-active' : ''}
                aria-current={activeTab === tab ? 'page' : undefined}>
                {label}
              </button>
            ))}
          </nav>

          <div className="mina-header-actions flex items-center gap-1.5">
            <details className="relative">
              <summary className="header-compact-btn list-none cursor-pointer" title="Preferencias de apariencia" aria-label="Apariencia">
                <Settings2 className="w-4 h-4" />
              </summary>
              <div className="absolute right-0 top-full mt-2 z-30 bg-white shadow-lg border border-slate-200 rounded-xl p-3 min-w-44">
                <label htmlFor="typeui-skill-selector" className="block text-xs font-semibold mb-1 text-slate-600">Apariencia</label>
                <select
                  id="typeui-skill-selector"
                  value={designSkill}
                  onChange={(e) => setDesignSkill(e.target.value)}
                  className="header-theme-select w-full"
                  aria-label="Cambiar tema visual"
                >
                  <option value="clean">Clínico</option>
                  <option value="craft">Craft</option>
                  <option value="bento">Bento</option>
                  <option value="shadcn">Shadcn</option>
                  <option value="paper">Papel</option>
                </select>
              </div>
            </details>

            <button
              type="button"
              onClick={() => setShowPrivacyNoticeModal(true)}
              className="header-compact-btn"
              title="Ver Aviso de Privacidad del Consultorio"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Privacidad</span>
            </button>

            {session ? (
              <button
                type="button"
                onClick={signOutUser}
                className="header-compact-btn"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthError('');
                  setAuthSuccess('');
                  setShowAuthModal(true);
                }}
                className="header-compact-btn"
                title="Iniciar sesión del fisioterapeuta"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cuenta</span>
              </button>
            )}

            {(!isSupabaseConfigured || session) && (
            <button
              type="button"
              onClick={() => openCreateAppointmentModal('09:00', 'auto', selectedDate)}
              className="header-primary-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva cita
            </button>
            )}
          </div>
        </div>
      </header>
  );
}
