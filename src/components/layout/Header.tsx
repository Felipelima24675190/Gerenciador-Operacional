import { Bell, Search, UserCircle } from 'lucide-react';
import { User } from '../../types';

interface HeaderProps {
  title: string;
  user: User;
}

export default function Header({ title, user }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      
      <div className="flex items-center gap-6">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar motorista..." 
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 w-64 bg-slate-50"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        
        <button className="relative text-gray-500 hover:text-slate-800 transition-colors">
          <Bell size={24} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center gap-2 cursor-pointer border-l pl-6 border-gray-200">
          <UserCircle size={32} className="text-slate-700" />
          <div className="text-sm">
            <p className="font-semibold text-slate-800 leading-tight">{user.nome}</p>
            <p className="text-xs text-gray-500 leading-tight uppercase font-bold tracking-tighter">{user.titulo || user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
