import { useState, useMemo, useCallback } from 'react';
import {
  BarChart3, UploadCloud, Users, FileText, Database,
  ChevronDown, ChevronUp, Map, UserCog, LogOut, Gauge, FileWarning,
  AlertTriangle, StopCircle, Bus, CarFront, RadioTower, LayoutDashboard,
  BookOpen, Wrench, ShieldAlert, Award, Search, PanelLeftClose, PanelLeftOpen,
  LucideIcon,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { User } from '../../types';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: User;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface MenuItem {
  tab: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface MenuSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
  separator?: boolean;
}

const FEATURED_ITEMS: MenuItem[] = [
  { tab: 'dashboard-operacional', label: 'Dashboard Operacional', icon: LayoutDashboard },
  { tab: 'score-motoristas', label: 'Score Motoristas', icon: Award },
];

const SECTIONS: MenuSection[] = [
  {
    id: 'pontualidade', label: 'Pontualidade', icon: BarChart3, separator: true,
    items: [
      { tab: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { tab: 'import-occurrences', label: 'Importar Ocorrências', icon: UploadCloud, adminOnly: true },
      { tab: 'consult-driver', label: 'Consultar Motorista', icon: Users },
    ],
  },
  {
    id: 'velocidade', label: 'Velocidade', icon: Gauge,
    items: [
      { tab: 'import-speed', label: 'Importar Excessos', icon: UploadCloud, adminOnly: true },
      { tab: 'view-speed', label: 'Consultar Excessos', icon: Gauge },
      { tab: 'consult-speed-driver', label: 'Consultar Motorista', icon: Users },
    ],
  },
  {
    id: 'antt', label: 'Multas ANTT', icon: FileWarning,
    items: [
      { tab: 'import-antt', label: 'Importar Multas', icon: UploadCloud, adminOnly: true },
      { tab: 'view-antt', label: 'Consultar Multas', icon: FileWarning },
      { tab: 'antt-codes', label: 'Consultar Códigos', icon: BookOpen },
    ],
  },
  {
    id: 'transito', label: 'Multas Trânsito', icon: AlertTriangle,
    items: [
      { tab: 'import-transit', label: 'Importar Multas', icon: UploadCloud, adminOnly: true },
      { tab: 'view-transit', label: 'Consultar Multas', icon: AlertTriangle },
    ],
  },
  {
    id: 'paradas', label: 'Paradas Indevidas', icon: StopCircle,
    items: [
      { tab: 'import-stops', label: 'Importar Paradas', icon: UploadCloud, adminOnly: true },
      { tab: 'view-stops', label: 'Consultar Paradas', icon: StopCircle },
    ],
  },
  {
    id: 'avaria', label: 'Avarias', icon: AlertTriangle,
    items: [
      { tab: 'create-avaria', label: 'Cadastrar Avaria', icon: AlertTriangle, adminOnly: true },
      { tab: 'view-avaria', label: 'Consultar Avarias', icon: AlertTriangle },
      { tab: 'acidentes', label: 'Acidentes', icon: ShieldAlert },
    ],
  },
  {
    id: 'quilometragem', label: 'Quilometragem', icon: CarFront,
    items: [
      { tab: 'import-ociosidade-motorista', label: 'Importar Quilometragem', icon: UploadCloud, adminOnly: true },
      { tab: 'view-ociosidade-motorista', label: 'Consultar Quilometragem', icon: CarFront },
    ],
  },
  {
    id: 'monitriip', label: 'Monitriip', icon: RadioTower,
    items: [
      { tab: 'import-monitriip', label: 'Importar Monitriip', icon: UploadCloud, adminOnly: true },
      { tab: 'view-monitriip', label: 'Consultar Monitriip', icon: RadioTower },
    ],
  },
  {
    id: 'manutencao', label: 'Manutenção', icon: Wrench,
    items: [
      { tab: 'import-manutencao', label: 'Importar Status', icon: UploadCloud, adminOnly: true },
      { tab: 'view-manutencao', label: 'Consultar Veículos', icon: Wrench },
    ],
  },
  {
    id: 'relatorios', label: 'Relatórios', icon: FileText,
    items: [
      { tab: 'reports', label: 'Relatórios e Métricas', icon: FileText },
    ],
  },
  {
    id: 'motoristas', label: 'Base Motoristas', icon: Users, separator: true,
    items: [
      { tab: 'import-drivers', label: 'Importar Base', icon: Database, adminOnly: true },
      { tab: 'consult-base', label: 'Consultar Base', icon: Users },
    ],
  },
  {
    id: 'jornada', label: 'Jornada Motoristas', icon: BookOpen,
    items: [
      { tab: 'dashboard-jornada', label: 'Dashboard Jornada', icon: BarChart3 },
      { tab: 'import-jornada', label: 'Importar Jornada', icon: UploadCloud, adminOnly: true },
      { tab: 'codigos-jornada', label: 'Códigos de Jornada', icon: BookOpen },
      { tab: 'import-comite', label: 'Importar Comitê', icon: UploadCloud, adminOnly: true },
    ],
  },
  {
    id: 'linhas', label: 'Base Linhas', icon: Map,
    items: [
      { tab: 'import-lines', label: 'Importar Linhas', icon: Database, adminOnly: true },
      { tab: 'consult-lines', label: 'Consultar Linhas', icon: Map },
      { tab: 'line-dictionary', label: 'Dicionário de Linhas', icon: BookOpen },
    ],
  },
  {
    id: 'veiculos', label: 'Base Veículos', icon: Bus,
    items: [
      { tab: 'import-vehicles', label: 'Importar Veículos', icon: Database, adminOnly: true },
      { tab: 'consult-vehicles', label: 'Consultar Veículos', icon: Bus },
    ],
  },
  {
    id: 'config', label: 'Configurações', icon: UserCog, separator: true,
    items: [
      { tab: 'users', label: 'Usuários', icon: UserCog, adminOnly: true },
    ],
  },
];

export default function Sidebar({ activeTab, onTabChange, user, onLogout, collapsed, onToggleCollapse }: SidebarProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    // Auto-open the section that contains the active tab
    const activeSection = SECTIONS.find(s => s.items.some(i => i.tab === activeTab));
    return new Set(activeSection ? [activeSection.id] : ['pontualidade']);
  });
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = user.role === 'admin';

  const toggleSection = useCallback((id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.label.toLowerCase().includes(q) || section.label.toLowerCase().includes(q)
      ),
    })).filter(s => s.items.length > 0);
  }, [searchQuery]);

  const handleTabChange = useCallback((tab: string) => {
    onTabChange(tab);
    setSearchQuery('');
  }, [onTabChange]);

  const menuButtonClass = (isActive: boolean) => twMerge(clsx(
    'w-full flex items-center gap-3 text-2xs font-medium rounded-lg transition-all duration-150',
    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
    isActive
      ? 'bg-white/15 text-white shadow-lg shadow-black/10 border-l-[3px] border-white'
      : 'text-white/70 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent'
  ));

  const featuredButtonClass = (isActive: boolean) => twMerge(clsx(
    'w-full flex items-center gap-3 font-bold rounded-xl transition-all duration-150',
    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5 text-2xs',
    isActive
      ? 'bg-brand-400 text-white shadow-lg shadow-brand-900/40'
      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white border border-white/10'
  ));

  return (
    <aside
      className={twMerge(clsx(
        'bg-gradient-to-b from-brand-800 via-brand-700 to-brand-800 text-white flex flex-col h-screen fixed top-0 left-0 shadow-sidebar z-20 transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-64'
      ))}
      aria-label="Menu lateral"
    >
      {/* Logo */}
      <div className={clsx('border-b border-white/10 bg-brand-900/50 flex items-center', collapsed ? 'p-3 justify-center' : 'p-4 gap-3')}>
        <img
          src="/progresso-logo.png"
          alt="Viação Progresso"
          className="w-10 h-10 object-contain rounded-xl border border-white/20 bg-white/10 p-0.5 shrink-0"
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/fallback-logo.png'; }}
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-black leading-tight truncate">Gerenciamento</p>
            <p className="text-2xs font-bold text-white/60 leading-tight truncate">Viação Progresso</p>
          </div>
        )}
      </div>

      {/* Search (expanded only) */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar menu..."
              className="w-full pl-8 pr-3 py-1.5 text-2xs bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-brand-400"
              aria-label="Buscar no menu"
            />
          </div>
        </div>
      )}

      <nav className={clsx('flex-1 overflow-y-auto scroll-shadow', collapsed ? 'px-1.5 py-3' : 'px-3 py-3 space-y-1')}>
        {/* Featured items */}
        <div className={clsx(collapsed ? 'space-y-1' : 'space-y-1 mb-3')}>
          {FEATURED_ITEMS.map(item => (
            <button
              key={item.tab}
              className={featuredButtonClass(activeTab === item.tab)}
              onClick={() => handleTabChange(item.tab)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              aria-current={activeTab === item.tab ? 'page' : undefined}
            >
              <item.icon size={17} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </div>

        {/* Sections */}
        {filteredSections.map(section => {
          const visibleItems = section.items.filter(i => !i.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;
          const isOpen = openSections.has(section.id) || searchQuery.trim().length > 0;
          const hasActiveChild = visibleItems.some(i => i.tab === activeTab);

          return (
            <div key={section.id} className={section.separator ? 'border-t border-white/10 pt-2 mt-2' : ''}>
              {collapsed ? (
                // Collapsed: show section icon, click opens first item
                <button
                  className={twMerge(clsx(
                    'w-full flex justify-center py-2.5 rounded-lg transition-colors',
                    hasActiveChild ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                  ))}
                  onClick={() => handleTabChange(visibleItems[0].tab)}
                  title={section.label}
                  aria-label={section.label}
                >
                  <section.icon size={17} />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-2xs font-black text-white/50 uppercase tracking-wider hover:text-white/80 transition-colors rounded"
                    aria-expanded={isOpen}
                    aria-controls={`section-${section.id}`}
                  >
                    <span className="flex items-center gap-2">
                      <section.icon size={13} className="shrink-0" />
                      {section.label}
                    </span>
                    {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {isOpen && (
                    <div id={`section-${section.id}`} className="mt-0.5 space-y-0.5 sidebar-collapse-enter" role="group">
                      {visibleItems.map(item => (
                        <button
                          key={item.tab}
                          className={menuButtonClass(activeTab === item.tab)}
                          onClick={() => handleTabChange(item.tab)}
                          aria-current={activeTab === item.tab ? 'page' : undefined}
                        >
                          <item.icon size={15} className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout — always visible */}
      <div className={clsx('border-t border-white/10', collapsed ? 'px-1.5 py-2' : 'px-3 py-2')}>
        <button
          onClick={onLogout}
          className={twMerge(clsx(
            'w-full flex items-center gap-3 text-2xs font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all rounded-lg',
            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
          ))}
          title={collapsed ? 'Sair' : undefined}
          aria-label="Sair do sistema"
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className={clsx('border-t border-white/10', collapsed ? 'px-1.5 py-2' : 'px-3 py-2')}>
        <button
          onClick={onToggleCollapse}
          className={twMerge(clsx(
            'w-full flex items-center gap-3 text-2xs font-medium text-white/50 hover:text-white/80 hover:bg-white/10 transition-all rounded-lg',
            collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
          ))}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>

      {/* User Footer */}
      <div className={clsx('border-t border-white/10 bg-brand-900/30', collapsed ? 'p-2' : 'p-3')}>
        <div className={clsx('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="w-8 h-8 bg-brand-400 rounded-lg flex items-center justify-center text-white font-bold text-2xs shadow-md shrink-0">
            {user.nome.charAt(0)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-2xs font-bold truncate">{user.nome}</p>
              <p className="text-2xs text-white/40 font-bold uppercase">{user.titulo || user.role}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
