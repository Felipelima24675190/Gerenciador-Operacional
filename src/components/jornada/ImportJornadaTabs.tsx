import { useState, Dispatch, SetStateAction } from 'react';
import { Calendar, Gavel } from 'lucide-react';
import ImportJornadaScreen from './ImportJornadaScreen';
import ImportComiteScreen from './ImportComiteScreen';
import {
  JornadaMotorista,
  ComiteDisciplinar,
  Motorista,
  CodigoJornadaDescription,
  UserRole,
} from '../../types';

interface Props {
  jornadas: JornadaMotorista[];
  setJornadas: Dispatch<SetStateAction<JornadaMotorista[]>>;
  comite: ComiteDisciplinar[];
  setComite: Dispatch<SetStateAction<ComiteDisciplinar[]>>;
  motoristas: Motorista[];
  codigosJornada: CodigoJornadaDescription[];
  userRole: UserRole;
}

type SubTab = 'jornada' | 'comite';

export default function ImportJornadaTabs({
  jornadas,
  setJornadas,
  comite,
  setComite,
  motoristas,
  codigosJornada,
  userRole,
}: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('jornada');

  const tabs: Array<{ id: SubTab; label: string; icon: typeof Calendar }> = [
    { id: 'jornada', label: 'Importar Jornada', icon: Calendar },
    { id: 'comite', label: 'Importar Comitê', icon: Gavel },
  ];

  return (
    <div className="space-y-5">
      {/* Top Tabs */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-1 flex gap-1">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                active
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeSubTab === 'jornada' && (
        <ImportJornadaScreen
          jornadas={jornadas}
          setJornadas={setJornadas}
          motoristas={motoristas}
          codigosJornada={codigosJornada}
          userRole={userRole}
        />
      )}
      {activeSubTab === 'comite' && (
        <ImportComiteScreen
          comite={comite}
          setComite={setComite}
          motoristas={motoristas}
          userRole={userRole}
        />
      )}
    </div>
  );
}
