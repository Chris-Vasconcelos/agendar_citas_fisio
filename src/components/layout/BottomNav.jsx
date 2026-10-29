import React from 'react';
import { Calendar, Users, Clock, Download } from 'lucide-react';

export function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav
        aria-label="Navegación principal del sistema fisio-citas"
        className="fixed bottom-0 inset-x-0 z-20 bg-white border-t-2 border-[#595959]"
      >
        <div className="max-w-4xl mx-auto grid grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`py-2.5 flex flex-col items-center gap-1 text-xs font-bold cursor-pointer ${
              activeTab === 'agenda' ? 'text-[#004070] bg-slate-100' : 'text-[#222222]'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Agenda (2x Hora)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('patients')}
            className={`py-2.5 flex flex-col items-center gap-1 text-xs font-bold cursor-pointer ${
              activeTab === 'patients' ? 'text-[#004070] bg-slate-100' : 'text-[#222222]'
            }`}
          >
            <Users className="w-5 h-5" />
            Expedientes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('availability')}
            className={`py-2.5 flex flex-col items-center gap-1 text-xs font-bold cursor-pointer ${
              activeTab === 'availability' ? 'text-[#004070] bg-slate-100' : 'text-[#222222]'
            }`}
          >
            <Clock className="w-5 h-5" />
            Horarios
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-2.5 flex flex-col items-center gap-1 text-xs font-bold cursor-pointer ${
              activeTab === 'security' ? 'text-[#004070] bg-slate-100' : 'text-[#222222]'
            }`}
          >
            <Download className="w-5 h-5" />
            Respaldos
          </button>
        </div>
      </nav>
  );
}
