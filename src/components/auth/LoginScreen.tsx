import { useState } from 'react';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { User } from '../../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  users: User[];
}

export default function LoginScreen({ onLogin, users }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Credenciais inválidas. Tente novamente.');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl shadow-blue-100 overflow-hidden border border-gray-100 flex flex-col">
        <div className="bg-blue-950 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[140%] border-[40px] border-white rounded-full"></div>
          </div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-900/40 rotate-12">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight leading-tight">Operação Progresso Viação</h1>
            <p className="text-blue-300 text-sm font-bold uppercase tracking-widest mt-2">Gerenciador da Operação Progresso</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="p-10 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Login de Acesso</label>
            <input 
              required
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-slate-700"
              placeholder="Ex: admin"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Secreta</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-slate-700"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-xl shadow-red-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <LogIn size={20} />
            Entrar no Sistema
          </button>
          
          <div className="pt-4 text-center">
            <p className="text-xs text-slate-400 font-medium italic">Ambiente restrito aos supervisores de frota.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
