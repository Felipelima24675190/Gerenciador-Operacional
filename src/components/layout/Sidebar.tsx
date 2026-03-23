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
      "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-lg",
      isActive ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-blue-100 hover:bg-blue-800 hover:text-white"
    )
  );

  return (
    <aside className="w-64 bg-[#0e4f8f] text-white flex flex-col h-screen fixed top-0 left-0 shadow-2xl z-20 overflow-y-auto">
      <div className="p-6 border-b border-[#0d5e87] bg-[#0d5e87]">
        <div className="flex items-center gap-3">
          <img src="/progresso-logo.png" alt="Progresso" className="w-12 h-12 object-contain rounded-md border border-white/30 bg-white/10" loading="lazy" onError={(e) => { const target = e.currentTarget as HTMLImageElement; target.src = '/fallback-logo.png'; target.style.objectFit = 'contain'; }} />
          <div>
            <p className="text-lg font-black">Gerenciador da Operação Progresso</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-8">
        <div>
          <button 
            onClick={() => setPontualidadeOpen(!pontualidadeOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-white uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Pontualidade</span>
            {pontualidadeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {pontualidadeOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              <button 
                className={menuButtonClass(activeTab === 'dashboard')}
                onClick={() => onTabChange('dashboard')}
              >
                <BarChart3 size={18} /> Dashboard
              </button>
              {isAdmin && (
                <button 
                  className={menuButtonClass(activeTab === 'import-occurrences')}
                  onClick={() => onTabChange('import-occurrences')}
                >
                  <UploadCloud size={18} /> Importar Ocorrências
                </button>
              )}
              <button 
                className={menuButtonClass(activeTab === 'consult-driver')}
                onClick={() => onTabChange('consult-driver')}
              >
                <Users size={18} /> Consultar Motorista
              </button>
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={() => setSpeedOpen(!speedOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Velocidade</span>
            {speedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {speedOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button 
                  className={menuButtonClass(activeTab === 'import-speed')}
                  onClick={() => onTabChange('import-speed')}
                >
                  <UploadCloud size={18} /> Importar Excessos
                </button>
              )}
              <button 
                className={menuButtonClass(activeTab === 'view-speed')}
                onClick={() => onTabChange('view-speed')}
              >
                <Gauge size={18} /> Consultar Excessos
              </button>
              <button 
                className={menuButtonClass(activeTab === 'consult-speed-driver')}
                onClick={() => onTabChange('consult-speed-driver')}
              >
                <Users size={18} /> Consultar Motorista
              </button>
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={() => setAnttOpen(!anttOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Multas ANTT</span>
            {anttOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {anttOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button 
                  className={menuButtonClass(activeTab === 'import-antt')}
                  onClick={() => onTabChange('import-antt')}
                >
                  <UploadCloud size={18} /> Importar Multas
                </button>
              )}
              <button 
                className={menuButtonClass(activeTab === 'view-antt')}
                onClick={() => onTabChange('view-antt')}
              >
                <FileWarning size={18} /> Consultar Multas
              </button>
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={() => setTransitOpen(!transitOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Multas Trânsito</span>
            {transitOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {transitOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button 
                  className={menuButtonClass(activeTab === 'import-transit')}
                  onClick={() => onTabChange('import-transit')}
                >
                  <UploadCloud size={18} /> Importar Multas
                </button>
              )}
              <button 
                className={menuButtonClass(activeTab === 'view-transit')}
                onClick={() => onTabChange('view-transit')}
              >
                <AlertTriangle size={18} /> Consultar Multas
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setStopsOpen(!stopsOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Paradas Indevidas</span>
            {stopsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {stopsOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button 
                  className={menuButtonClass(activeTab === 'import-stops')}
                  onClick={() => onTabChange('import-stops')}
                >
                  <UploadCloud size={18} /> Importar Paradas
                </button>
              )}
              <button 
                className={menuButtonClass(activeTab === 'view-stops')}
                onClick={() => onTabChange('view-stops')}
              >
                <StopCircle size={18} /> Consultar Paradas
              </button>
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={() => setAvariaOpen(!avariaOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Avaria</span>
            {avariaOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {avariaOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button 
                  className={menuButtonClass(activeTab === 'create-avaria')}
                  onClick={() => onTabChange('create-avaria')}
                >
                  <AlertTriangle size={18} /> Cadastrar Avaria
                </button>
              )}
              <button 
                className={menuButtonClass(activeTab === 'view-avaria')}
                onClick={() => onTabChange('view-avaria')}
              >
                <AlertTriangle size={18} /> Consultar Avarias
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setQuilometragemOpen(!quilometragemOpen)}
            className="w-full flex items-start justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-wider hover:text-white transition-colors"
          >
            <span>Quilometragem Operacional</span>
            <span className="mt-0.5 shrink-0">{quilometragemOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </button>

          {quilometragemOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button
                  className={menuButtonClass(activeTab === 'import-ocioso')}
                  onClick={() => onTabChange('import-ocioso')}
                >
                  <UploadCloud size={18} /> Importar Quilometragem
                </button>
              )}
              <button
                className={menuButtonClass(activeTab === 'view-ocioso')}
                onClick={() => onTabChange('view-ocioso')}
              >
                <Clock size={18} /> Consultar Quilometragem
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setOciosidadeMotoOpen(!ociosidadeMotoOpen)}
            className="w-full flex items-start justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-wider hover:text-white transition-colors"
          >
            <span>Ociosidade Motorista</span>
            <span className="mt-0.5 shrink-0">{ociosidadeMotoOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </button>

          {ociosidadeMotoOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button
                  className={menuButtonClass(activeTab === 'import-ociosidade-motorista')}
                  onClick={() => onTabChange('import-ociosidade-motorista')}
                >
                  <UploadCloud size={18} /> Importar Ociosidade
                </button>
              )}
              <button
                className={menuButtonClass(activeTab === 'view-ociosidade-motorista')}
                onClick={() => onTabChange('view-ociosidade-motorista')}
              >
                <CarFront size={18} /> Consultar Ociosidade
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setMonitriipOpen(!monitriipOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Monitriip</span>
            {monitriipOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {monitriipOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button
                  className={menuButtonClass(activeTab === 'import-monitriip')}
                  onClick={() => onTabChange('import-monitriip')}
                >
                  <UploadCloud size={18} /> Importar Monitriip
                </button>
              )}
              <button
                className={menuButtonClass(activeTab === 'view-monitriip')}
                onClick={() => onTabChange('view-monitriip')}
              >
                <RadioTower size={18} /> Consultar Monitriip
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setRelatoriosOpen(!relatoriosOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Relatórios</span>
            {relatoriosOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {relatoriosOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              <button
                className={menuButtonClass(activeTab === 'reports')}
                onClick={() => onTabChange('reports')}
              >
                <FileText size={18} /> Relatórios e Métricas
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setMotoristasOpen(!motoristasOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Base de Motoristas</span>
            {motoristasOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {motoristasOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button 
                  className={menuButtonClass(activeTab === 'import-drivers')}
                  onClick={() => onTabChange('import-drivers')}
                >
                  <Database size={18} /> Importar Base
                </button>
              )}
              {isAdmin && (
                <button 
                  className={menuButtonClass(activeTab === 'manual-driver')}
                  onClick={() => onTabChange('manual-driver')}
                >
                  <UserPlus size={18} /> Cadastrar Manualmente
                </button>
              )}
              <button 
                className={menuButtonClass(activeTab === 'consult-base')}
                onClick={() => onTabChange('consult-base')}
              >
                <Users size={18} /> Consultar Base
              </button>
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={() => setLinhasOpen(!linhasOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Base de Linhas</span>
            {linhasOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {linhasOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button 
                  className={menuButtonClass(activeTab === 'import-lines')}
                  onClick={() => onTabChange('import-lines')}
                >
                  <Database size={18} /> Importar Linhas
                </button>
              )}
              <button 
                className={menuButtonClass(activeTab === 'consult-lines')}
                onClick={() => onTabChange('consult-lines')}
              >
                <Map size={18} /> Consultar Linhas
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setVeiculosOpen(!veiculosOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Base de Veículos</span>
            {veiculosOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {veiculosOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button 
                  className={menuButtonClass(activeTab === 'import-vehicles')}
                  onClick={() => onTabChange('import-vehicles')}
                >
                  <Database size={18} /> Importar Veículos
                </button>
              )}
              <button 
                className={menuButtonClass(activeTab === 'consult-vehicles')}
                onClick={() => onTabChange('consult-vehicles')}
              >
                <Bus size={18} /> Consultar Veículos
              </button>
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={() => setConfigOpen(!configOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Configurações</span>
            {configOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {configOpen && (
            <div className="mt-2 space-y-1 flex flex-col">
              {isAdmin && (
                <button 
                  className={menuButtonClass(activeTab === 'users')}
                  onClick={() => onTabChange('users')}
                >
                  <UserCog size={18} /> Usuários
                </button>
              )}
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors rounded-lg"
              >
                <LogOut size={18} /> Sair
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="p-6 mt-auto border-t border-blue-900 bg-blue-900/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center text-blue-300 font-bold text-xs">
            {user.nome.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black truncate">{user.nome}</p>
            <p className="text-[10px] text-blue-500 font-bold uppercase">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
