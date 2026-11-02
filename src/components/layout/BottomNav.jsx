import React from 'react';
import { Calendar, Users, Clock, Download } from 'lucide-react';

const sections = [
  { id: 'agenda', label: 'Agenda', Icon: Calendar },
  { id: 'patients', label: 'Expedientes', Icon: Users },
  { id: 'availability', label: 'Horarios', Icon: Clock },
  { id: 'security', label: 'Respaldos', Icon: Download },
];

export function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav aria-label="Secciones de MINA" className="mina-nav">
      <div className="mina-nav-inner">
        {sections.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? 'page' : undefined}
            className={`mina-nav-item ${activeTab === id ? 'mina-nav-item-active' : ''}`}
          >
            <Icon className="w-4.5 h-4.5" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
