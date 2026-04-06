import { useState, Dispatch, SetStateAction, FormEvent } from 'react';
import { Users, UserPlus, Trash2, Shield, User as UserIcon, Check, X } from 'lucide-react';
import { User, UserRole } from '../../types';

interface UserManagementScreenProps {
  users: User[];
  setUsers: Dispatch<SetStateAction<User[]>>;
}

export default function UserManagementScreen({ users, setUsers }: UserManagementScreenProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', nome: '', role: 'viewer' as UserRole, titulo: '' });

  const handleAddUser = (e: FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;

    const user: User = {
      id: crypto.randomUUID(),
      username: newUser.username,
      password: newUser.password,
      nome: newUser.nome || newUser.username,
      role: newUser.role,
      titulo: newUser.titulo
    };

    setUsers(prev => [...prev, user]);
    setNewUser({ username: '', password: '', nome: '', role: 'viewer', titulo: '' });
    setShowAddForm(false);
  };

  const deleteUser = (id: string) => {
    if (confirm('Deseja realmente excluir este usuário?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex justify-between items-center bg-white p-6 rounded-card border border-gray-200 shadow-card">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Gerenciamento de Usuários</h3>
            <p className="text-sm text-gray-500">Controle quem tem acesso ao sistema e quais são as permissões.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          {showAddForm ? <X size={18} /> : <UserPlus size={18} />}
          {showAddForm ? 'Cancelar' : 'Novo Usuário'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-8 rounded-2xl border-2 border-blue-100 shadow-xl animate-in zoom-in-95 duration-200">
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="user-nome" className="text-2xs font-black text-slate-400 uppercase tracking-widest">Nome do Funcionário</label>
              <input
                id="user-nome"
                required
                type="text"
                value={newUser.nome}
                onChange={e => setNewUser({...newUser, nome: e.target.value})}
                aria-label="Nome do funcionário"
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                placeholder="Ex: Pedro Alvares"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="user-username" className="text-2xs font-black text-slate-400 uppercase tracking-widest">Login / Username</label>
              <input
                id="user-username"
                required
                type="text"
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
                aria-label="Login ou username"
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                placeholder="Ex: pedro.alvares"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="user-titulo" className="text-2xs font-black text-slate-400 uppercase tracking-widest">Título / Cargo</label>
              <input
                id="user-titulo"
                type="text"
                value={newUser.titulo}
                onChange={e => setNewUser({...newUser, titulo: e.target.value})}
                aria-label="Título ou cargo do usuário"
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                placeholder="Ex: Supervisor de Frota"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="user-password" className="text-2xs font-black text-slate-400 uppercase tracking-widest">Senha de Acesso</label>
              <input
                id="user-password"
                required
                type="password"
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
                aria-label="Senha de acesso"
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="user-role" className="text-2xs font-black text-slate-400 uppercase tracking-widest">Nível de Acesso</label>
              <select
                id="user-role"
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                aria-label="Nível de acesso do usuário"
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
              >
                <option value="viewer">Visualizador (Filtros e Relatórios)</option>
                <option value="admin">Administrador (Master - Tudo)</option>
              </select>
            </div>
            <div className="md:col-span-2 pt-4">
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                <Check size={20} /> Cadastrar e Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-800 text-white text-2xs uppercase tracking-wide">
              <th className="px-6 py-2.5">Usuário</th>
              <th className="px-6 py-2.5">Acesso</th>
              <th className="px-6 py-2.5">Status</th>
              <th className="px-6 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100 last:border-0">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                      <UserIcon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">{u.nome}</p>
                      <p className="text-xs text-slate-400 font-medium">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-1.5 text-xs font-bold ${u.role === 'admin' ? 'text-red-600' : 'text-blue-600'}`}>
                    <Shield size={14} />
                    {u.titulo || (u.role === 'admin' ? 'Administrador Master' : 'Visualizador')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-2xs font-black rounded-card uppercase">Ativo</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    disabled={u.username === 'admin'}
                    onClick={() => deleteUser(u.id)}
                    aria-label={`Excluir usuário ${u.nome}`}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
