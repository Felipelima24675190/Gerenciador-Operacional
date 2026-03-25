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
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        onLogin(user);
      } else {
        setError('Credenciais invalidas. Tente novamente.');
        setTimeout(() => setError(''), 3000);
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-4 font-sans relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-brand-900/30 overflow-hidden border border-white/50 flex flex-col relative z-10">
        <div className="bg-gradient-to-br from-brand-900 to-brand-800 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[140%] border-[40px] border-white rounded-full"></div>
          </div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-brand-900/40 rotate-6">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight leading-tight">Viação Progresso</h1>
            <p className="text-brand-300 text-xs font-bold uppercase tracking-[0.2em] mt-2">Gerenciamento Operacional</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 page-enter">
              <AlertCircle size={18} />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Login de Acesso</label>
            <input
              required
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-all font-semibold text-slate-700 placeholder:text-slate-300"
              placeholder="Ex: admin"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Senha Secreta</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-all font-semibold text-slate-700 placeholder:text-slate-300"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                Entrar no Sistema
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <p className="text-xs text-slate-400 font-medium">Ambiente restrito aos supervisores de frota.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
