import React from 'react';
import { Shield, Lock, LogOut, Plus } from 'lucide-react';
import { signOutUser } from '../../lib/supabase';

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
    <header className="sticky top-0 z-20 bg-[#f7f3e8]/95 backdrop-blur-sm border-b border-[#78684c]">
        <div className="dash-navbar">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#46371e] text-white flex items-center justify-center text-xs font-extrabold shadow-xs">
              FC
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold m-0">Fisio Citas</h1>
                <span className="hidden sm:inline-flex typeui-badge typeui-badge-primary">
                  2 espacios / hora
                </span>
              </div>
              <p className="hidden md:block text-[11px] m-0 opacity-85">
                Consultorio Lic. Ft. Eduardo · Sesiones de 60 min
              </p>
            </div>
          </div>

          <nav aria-label="Secciones principales" className="header-nav-tabs hidden lg:flex">
             {/* Navigation inside header is primarily handled by BottomNav for mobile, but keeping logic consistent with original for desktop if present */}
          </nav>

          <div className="flex items-center gap-1.5">
            <select
              id="typeui-skill-selector"
              value={designSkill}
              onChange={(e) => setDesignSkill(e.target.value)}
              className="header-theme-select"
              aria-label="Cambiar tema visual"
              title="Cambiar tema visual"
            >
              <option value="craft">Tema: Craft</option>
              <option value="bento">Tema: Bento</option>
              <option value="clean">Tema: Clínico</option>
              <option value="shadcn">Tema: Shadcn</option>
              <option value="paper">Tema: Papel</option>
            </select>

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

            <button
              type="button"
              onClick={() => openCreateAppointmentModal('09:00', 'auto', selectedDate)}
              className="header-primary-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              Agendar Cita
            </button>
          </div>
        </div>
      </header>
  );
}
