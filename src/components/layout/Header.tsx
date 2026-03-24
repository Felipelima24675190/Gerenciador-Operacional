import { Bell, Search, UserCircle } from 'lucide-react';
import { User } from '../../types';

interface HeaderProps {
  title: string;
  user: User;
}

export default function Header({ title, user }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 shadow-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h2 className="text-lg font-bold text-brand-800">{title}</h2>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar motorista..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-button text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 w-60 bg-slate-50 placeholder:text-slate-400"
          />
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
        </div>

        <button className="relative text-slate-400 hover:text-brand-600 transition-colors p-1.5 rounded-lg hover:bg-brand-50">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

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
