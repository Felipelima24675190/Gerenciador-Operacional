import { useState } from 'react';
import {
  BarChart3,
  UploadCloud,
  Users,
  FileText,
  Database,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Map,
  UserCog,
  LogOut,
  Gauge,
  FileWarning,
  AlertTriangle,
  StopCircle,
  Bus,
  Clock,
  CarFront,
  RadioTower,
  LayoutDashboard,
  BookOpen,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { User } from '../../types';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: User;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, onTabChange, user, onLogout }: SidebarProps) {
  const [pontualidadeOpen, setPontualidadeOpen] = useState(true);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [anttOpen, setAnttOpen] = useState(false);
  const [transitOpen, setTransitOpen] = useState(false);
  const [stopsOpen, setStopsOpen] = useState(false);
  const [motoristasOpen, setMotoristasOpen] = useState(false);
  const [linhasOpen, setLinhasOpen] = useState(false);
  const [veiculosOpen, setVeiculosOpen] = useState(false);
  const [avariaOpen, setAvariaOpen] = useState(false);
  const [quilometragemOpen, setQuilometragemOpen] = useState(false);
  const [ociosidadeMotoOpen, setOciosidadeMotoOpen] = useState(false);
  const [monitriipOpen, setMonitriipOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const isAdmin = user.role === 'admin';

  const menuButtonClass = (isActive: boolean) => twMerge(
    clsx(
      "w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-200",
      isActive
        ? "bg-white/15 text-white shadow-lg shadow-black/10 border-l-[3px] border-white pl-[13px]"
        : "text-white/70 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent pl-[13px]"
    )
  );

  const sectionHeaderClass = "w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-white/50 uppercase tracking-widest hover:text-white/80 transition-colors";

  return (
    <aside className="w-64 bg-gradient-to-b from-brand-800 via-brand-700 to-brand-800 text-white flex flex-col h-screen fixed top-0 left-0 shadow-2xl z-20 overflow-y-auto">
      {/* Logo */}
      <div className="p-5 border-b border-white/10 bg-brand-900/50">
        <div className="flex items-center gap-3">
          <img src="/progresso-logo.png" alt="Progresso" className="w-11 h-11 object-contain rounded-xl border border-white/20 bg-white/10 p-0.5" loading="lazy" onError={(e) => { const target = e.currentTarget as HTMLImageElement; target.src = '/fallback-logo.png'; target.style.objectFit = 'contain'; }} />
          <div>
            <p className="text-sm font-black leading-tight">Gerenciador</p>
            <p className="text-[11px] font-bold text-white/60 leading-tight">Operacao Progresso</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-5">
        {/* Dashboard Operacional - Top Item */}
        <div>
          <button
            className={twMerge(clsx(
              "w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold rounded-xl transition-all duration-200",
              activeTab === 'dashboard-operacional'
                ? "bg-brand-400 text-white shadow-lg shadow-brand-900/40"
                : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white border border-white/10"
            ))}
            onClick={() => onTabChange('dashboard-operacional')}
          >
            <LayoutDashboard size={18} /> Dashboard Operacional
          </button>
        </div>

        {/* Dicionario de Linha - Standalone */}
        <div>
          <button
            className={twMerge(clsx(
              "w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold rounded-xl transition-all duration-200",
              activeTab === 'line-dictionary'
                ? "bg-brand-400 text-white shadow-lg shadow-brand-900/40"
                : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white border border-white/10"
            ))}
            onClick={() => onTabChange('line-dictionary')}
          >
            <BookOpen size={18} /> Dicionario de Linha
          </button>
        </div>

        <div className="border-t border-white/10 pt-4">
          <button onClick={() => setPontualidadeOpen(!pontualidadeOpen)} className={sectionHeaderClass}>
            <span>Pontualidade</span>
            {pontualidadeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {pontualidadeOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              <button className={menuButtonClass(activeTab === 'dashboard')} onClick={() => onTabChange('dashboard')}>
                <BarChart3 size={17} /> Dashboard Pontualidade
              </button>
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'import-occurrences')} onClick={() => onTabChange('import-occurrences')}>
                  <UploadCloud size={17} /> Importar Ocorrencias
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'consult-driver')} onClick={() => onTabChange('consult-driver')}>
                <Users size={17} /> Consultar Motorista
              </button>
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setSpeedOpen(!speedOpen)} className={sectionHeaderClass}>
            <span>Velocidade</span>
            {speedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {speedOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'import-speed')} onClick={() => onTabChange('import-speed')}>
                  <UploadCloud size={17} /> Importar Excessos
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'view-speed')} onClick={() => onTabChange('view-speed')}>
                <Gauge size={17} /> Consultar Excessos
              </button>
              <button className={menuButtonClass(activeTab === 'consult-speed-driver')} onClick={() => onTabChange('consult-speed-driver')}>
                <Users size={17} /> Consultar Motorista
              </button>
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setAnttOpen(!anttOpen)} className={sectionHeaderClass}>
            <span>Multas ANTT</span>
            {anttOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {anttOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'import-antt')} onClick={() => onTabChange('import-antt')}>
                  <UploadCloud size={17} /> Importar Multas
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'view-antt')} onClick={() => onTabChange('view-antt')}>
                <FileWarning size={17} /> Consultar Multas
              </button>
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setTransitOpen(!transitOpen)} className={sectionHeaderClass}>
            <span>Multas Transito</span>
            {transitOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {transitOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'import-transit')} onClick={() => onTabChange('import-transit')}>
                  <UploadCloud size={17} /> Importar Multas
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'view-transit')} onClick={() => onTabChange('view-transit')}>
                <AlertTriangle size={17} /> Consultar Multas
              </button>
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setStopsOpen(!stopsOpen)} className={sectionHeaderClass}>
            <span>Paradas Indevidas</span>
            {stopsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {stopsOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'import-stops')} onClick={() => onTabChange('import-stops')}>
                  <UploadCloud size={17} /> Importar Paradas
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'view-stops')} onClick={() => onTabChange('view-stops')}>
                <StopCircle size={17} /> Consultar Paradas
              </button>
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setAvariaOpen(!avariaOpen)} className={sectionHeaderClass}>
            <span>Avaria</span>
            {avariaOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {avariaOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'create-avaria')} onClick={() => onTabChange('create-avaria')}>
                  <AlertTriangle size={17} /> Cadastrar Avaria
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'view-avaria')} onClick={() => onTabChange('view-avaria')}>
                <AlertTriangle size={17} /> Consultar Avarias
              </button>
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setQuilometragemOpen(!quilometragemOpen)} className={sectionHeaderClass}>
            <span>Quilometragem Op.</span>
            {quilometragemOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {quilometragemOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'import-ocioso')} onClick={() => onTabChange('import-ocioso')}>
                  <UploadCloud size={17} /> Importar Quilometragem
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'view-ocioso')} onClick={() => onTabChange('view-ocioso')}>
                <Clock size={17} /> Consultar Quilometragem
              </button>
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setOciosidadeMotoOpen(!ociosidadeMotoOpen)} className={sectionHeaderClass}>
            <span>Ociosidade Motorista</span>
            {ociosidadeMotoOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {ociosidadeMotoOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'import-ociosidade-motorista')} onClick={() => onTabChange('import-ociosidade-motorista')}>
                  <UploadCloud size={17} /> Importar Ociosidade
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'view-ociosidade-motorista')} onClick={() => onTabChange('view-ociosidade-motorista')}>
                <CarFront size={17} /> Consultar Ociosidade
              </button>
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setMonitriipOpen(!monitriipOpen)} className={sectionHeaderClass}>
            <span>Monitriip</span>
            {monitriipOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {monitriipOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'import-monitriip')} onClick={() => onTabChange('import-monitriip')}>
                  <UploadCloud size={17} /> Importar Monitriip
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'view-monitriip')} onClick={() => onTabChange('view-monitriip')}>
                <RadioTower size={17} /> Consultar Monitriip
              </button>
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setRelatoriosOpen(!relatoriosOpen)} className={sectionHeaderClass}>
            <span>Relatorios</span>
            {relatoriosOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {relatoriosOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              <button className={menuButtonClass(activeTab === 'reports')} onClick={() => onTabChange('reports')}>
                <FileText size={17} /> Relatorios e Metricas
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <button onClick={() => setMotoristasOpen(!motoristasOpen)} className={sectionHeaderClass}>
            <span>Base de Motoristas</span>
            {motoristasOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {motoristasOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'import-drivers')} onClick={() => onTabChange('import-drivers')}>
                  <Database size={17} /> Importar Base
                </button>
              )}
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'manual-driver')} onClick={() => onTabChange('manual-driver')}>
                  <UserPlus size={17} /> Cadastrar Manualmente
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'consult-base')} onClick={() => onTabChange('consult-base')}>
                <Users size={17} /> Consultar Base
              </button>
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setLinhasOpen(!linhasOpen)} className={sectionHeaderClass}>
            <span>Base de Linhas</span>
            {linhasOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {linhasOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'import-lines')} onClick={() => onTabChange('import-lines')}>
                  <Database size={17} /> Importar Linhas
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'consult-lines')} onClick={() => onTabChange('consult-lines')}>
                <Map size={17} /> Consultar Linhas
              </button>
              <button className={menuButtonClass(activeTab === 'line-dictionary')} onClick={() => onTabChange('line-dictionary')}>
                <BookOpen size={17} /> Dicionario de Linhas
              </button>
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setVeiculosOpen(!veiculosOpen)} className={sectionHeaderClass}>
            <span>Base de Veiculos</span>
            {veiculosOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {veiculosOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'import-vehicles')} onClick={() => onTabChange('import-vehicles')}>
                  <Database size={17} /> Importar Veiculos
                </button>
              )}
              <button className={menuButtonClass(activeTab === 'consult-vehicles')} onClick={() => onTabChange('consult-vehicles')}>
                <Bus size={17} /> Consultar Veiculos
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <button onClick={() => setConfigOpen(!configOpen)} className={sectionHeaderClass}>
            <span>Configuracoes</span>
            {configOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {configOpen && (
            <div className="mt-1.5 space-y-0.5 flex flex-col sidebar-collapse-enter">
              {isAdmin && (
                <button className={menuButtonClass(activeTab === 'users')} onClick={() => onTabChange('users')}>
                  <UserCog size={17} /> Usuarios
                </button>
              )}
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all rounded-lg border-l-[3px] border-transparent pl-[13px]"
              >
                <LogOut size={17} /> Sair
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-4 mt-auto border-t border-white/10 bg-brand-900/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-400 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md">
            {user.nome.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{user.nome}</p>
            <p className="text-[10px] text-white/40 font-bold uppercase">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
