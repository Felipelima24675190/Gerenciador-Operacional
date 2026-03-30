import { useState, useRef, useEffect, Dispatch, SetStateAction } from 'react';
import { Bell, Database } from 'lucide-react';
import { User, AppNotification } from '../../types';

interface HeaderProps {
  title: string;
  user: User;
  notifications: AppNotification[];
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
}

export default function Header({ title, user, notifications, setNotifications }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.lida[user.id]).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, lida: { ...n.lida, [user.id]: true } } : n
    ));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, lida: { ...n.lida, [user.id]: true } })));
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-100 shadow-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h2 className="text-lg font-bold text-brand-800">{title}</h2>
      </div>

      <div className="flex items-center gap-5">
        {/* Notification bell */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="relative text-slate-400 hover:text-brand-600 transition-colors p-1.5 rounded-lg hover:bg-brand-50"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-white px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-slate-50">
                <h4 className="text-xs font-black text-slate-700 uppercase">Notificacoes</h4>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] font-bold text-brand-500 hover:text-brand-700">
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-400">Nenhuma notificacao</p>
                ) : (
                  notifications.map(n => {
                    const isUnread = !n.lida[user.id];
                    return (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-slate-50 transition-colors ${isUnread ? 'bg-brand-50/50' : ''}`}
                        onClick={() => markAsRead(n.id)}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 p-1.5 rounded-lg ${isUnread ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Database size={12} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${isUnread ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{n.descricao}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-bold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">{n.tabela}</span>
                              <span className="text-[9px] text-slate-400">{n.data}</span>
                            </div>
                          </div>
                          {isUnread && <span className="w-2 h-2 bg-brand-500 rounded-full mt-1.5 shrink-0" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 border-l pl-5 border-gray-200">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            {user.nome.charAt(0)}
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-800 leading-tight">{user.nome}</p>
            <p className="text-[10px] text-slate-400 leading-tight uppercase font-bold tracking-wider">{user.titulo || user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
