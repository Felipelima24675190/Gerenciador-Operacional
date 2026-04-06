import { useState, useRef, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { Bell, Database, Search, ChevronRight, X } from 'lucide-react';
import { User, AppNotification } from '../../types';

interface HeaderProps {
  title: string;
  breadcrumb?: string;
  user: User;
  notifications: AppNotification[];
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  onTabChange?: (tab: string) => void;
}

// Searchable pages for Ctrl+K
const SEARCH_PAGES = [
  { tab: 'dashboard-operacional', label: 'Dashboard Operacional', section: 'Dashboard' },
  { tab: 'dashboard', label: 'Dashboard Pontualidade', section: 'Pontualidade' },
  { tab: 'consult-driver', label: 'Consultar Motorista', section: 'Pontualidade' },
  { tab: 'view-speed', label: 'Consultar Excessos', section: 'Velocidade' },
  { tab: 'view-antt', label: 'Consultar Multas ANTT', section: 'Multas ANTT' },
  { tab: 'view-transit', label: 'Consultar Multas Trânsito', section: 'Multas Trânsito' },
  { tab: 'view-stops', label: 'Consultar Paradas', section: 'Paradas' },
  { tab: 'view-avaria', label: 'Consultar Avarias', section: 'Avarias' },
  { tab: 'view-ociosidade-motorista', label: 'Consultar Quilometragem', section: 'Quilometragem' },
  { tab: 'view-monitriip', label: 'Consultar Monitriip', section: 'Monitriip' },
  { tab: 'view-manutencao', label: 'Consultar Manutenção', section: 'Manutenção' },
  { tab: 'reports', label: 'Relatórios e Métricas', section: 'Relatórios' },
  { tab: 'consult-base', label: 'Base de Motoristas', section: 'Cadastros' },
  { tab: 'consult-lines', label: 'Base de Linhas', section: 'Cadastros' },
  { tab: 'manual-line', label: 'Cadastrar Linha Manual', section: 'Cadastros' },
  { tab: 'consult-vehicles', label: 'Base de Veículos', section: 'Cadastros' },
  { tab: 'manual-vehicle', label: 'Cadastrar Veículo Manual', section: 'Cadastros' },
  { tab: 'score-motoristas', label: 'Score de Motoristas', section: 'Dashboard' },
];

export default function Header({ title, breadcrumb, user, notifications, setNotifications, onTabChange }: HeaderProps) {
  const [bellOpen, setBellOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const bellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter(n => !n.lida[user.id]).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, lida: { ...n.lida, [user.id]: true } } : n
    ));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, lida: { ...n.lida, [user.id]: true } })));
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setSearchQuery('');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setBellOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filteredPages = searchQuery.trim()
    ? SEARCH_PAGES.filter(p => p.label.toLowerCase().includes(searchQuery.toLowerCase()) || p.section.toLowerCase().includes(searchQuery.toLowerCase()))
    : SEARCH_PAGES;

  const handleSelectPage = useCallback((tab: string) => {
    onTabChange?.(tab);
    setSearchOpen(false);
    setSearchQuery('');
  }, [onTabChange]);

  return (
    <header className="h-14 bg-white border-b border-gray-100 shadow-sm flex items-center justify-between px-5 sticky top-0 z-10">
      {/* Breadcrumb + Title */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumb && (
          <>
            <span className="text-2xs text-slate-400 font-medium truncate">{breadcrumb}</span>
            <ChevronRight size={12} className="text-slate-300 shrink-0" />
          </>
        )}
        <h2 className="text-sm font-bold text-brand-800 truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Search trigger */}
        <button
          onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
          className="flex items-center gap-2 px-3 py-1.5 text-2xs text-slate-400 bg-slate-50 border border-gray-200 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Buscar páginas (Ctrl+K)"
        >
          <Search size={13} />
          <span className="hidden sm:inline">Buscar...</span>
          <kbd className="hidden sm:inline text-2xs bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-slate-400">Ctrl K</kbd>
        </button>

        {/* Notification bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen(!bellOpen)}
            className="relative text-slate-400 hover:text-brand-600 transition-colors p-1.5 rounded-lg hover:bg-brand-50"
            aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
            aria-expanded={bellOpen}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-2xs font-bold rounded-full border-2 border-white px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white border border-gray-200 rounded-card shadow-dropdown z-50 overflow-hidden" role="dialog" aria-label="Notificações">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-slate-50">
                <h4 className="text-2xs font-black text-slate-700 uppercase">Notificações</h4>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-2xs font-bold text-brand-500 hover:text-brand-700">
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-6 text-center text-2xs text-slate-400">Nenhuma notificação</p>
                ) : (
                  notifications.map(n => {
                    const isUnread = !n.lida[user.id];
                    return (
                      <button
                        key={n.id}
                        className={`w-full text-left px-4 py-2.5 border-b border-gray-50 hover:bg-slate-50 transition-colors ${isUnread ? 'bg-brand-50/50' : ''}`}
                        onClick={() => markAsRead(n.id)}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 p-1.5 rounded-lg ${isUnread ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Database size={11} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-2xs ${isUnread ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{n.descricao}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-2xs font-bold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">{n.tabela}</span>
                              <span className="text-2xs text-slate-400">{n.data}</span>
                            </div>
                          </div>
                          {isUnread && <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-1.5 shrink-0" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-2xs">
            {user.nome.charAt(0)}
          </div>
          <div className="hidden sm:block">
            <p className="text-2xs font-semibold text-slate-800 leading-tight">{user.nome}</p>
            <p className="text-2xs text-slate-400 leading-tight uppercase font-bold tracking-wider">{user.titulo || user.role}</p>
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30" onClick={() => setSearchOpen(false)}>
          <div
            ref={searchRef}
            className="w-full max-w-md bg-white rounded-xl shadow-dropdown border border-gray-200 overflow-hidden animate-fade-in"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Busca global"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar página..."
                className="flex-1 text-sm outline-none bg-transparent placeholder-slate-400"
                aria-label="Buscar página"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Fechar busca"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {filteredPages.length === 0 ? (
                <p className="py-6 text-center text-2xs text-slate-400">Nenhuma página encontrada</p>
              ) : (
                filteredPages.map(p => (
                  <button
                    key={p.tab}
                    onClick={() => handleSelectPage(p.tab)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-brand-50 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-700">{p.label}</p>
                      <p className="text-2xs text-slate-400">{p.section}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
