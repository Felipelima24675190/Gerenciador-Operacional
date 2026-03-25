import { useState, useMemo, Dispatch, SetStateAction } from 'react';
import { Search, Pencil, Trash2, Save, X } from 'lucide-react';
import { AnttCodeDescription, UserRole } from '../../types';

interface AnttCodesScreenProps {
  anttCodeDescriptions: AnttCodeDescription[];
  setAnttCodeDescriptions: Dispatch<SetStateAction<AnttCodeDescription[]>>;
  userRole: UserRole;
}

export default function AnttCodesScreen({ anttCodeDescriptions, setAnttCodeDescriptions, userRole }: AnttCodesScreenProps) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCodigo, setEditCodigo] = useState('');
  const [editDescricao, setEditDescricao] = useState('');

  const isAdmin = userRole === 'admin';

  const filtered = useMemo(() => {
    if (!search.trim()) return anttCodeDescriptions;
    const q = search.toLowerCase();
    return anttCodeDescriptions.filter(c =>
      c.codigo.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q)
    );
  }, [anttCodeDescriptions, search]);

  const startEdit = (item: AnttCodeDescription) => {
    setEditingId(item.codigo);
    setEditCodigo(item.codigo);
    setEditDescricao(item.descricao);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setAnttCodeDescriptions(prev => prev.map(c =>
      c.codigo === editingId ? { codigo: editCodigo, descricao: editDescricao } : c
    ));
    setEditingId(null);
  };

  const deleteCode = (codigo: string) => {
    if (!confirm(`Excluir codigo ${codigo}?`)) return;
    setAnttCodeDescriptions(prev => prev.filter(c => c.codigo !== codigo));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por codigo ou descricao..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <span className="text-xs text-slate-400 font-bold">{filtered.length} codigos</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white text-[10px] uppercase">
            <tr>
              <th className="px-4 py-3 w-36">Codigo</th>
              <th className="px-4 py-3">Descricao</th>
              {isAdmin && <th className="px-4 py-3 w-28 text-right">Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Nenhum codigo encontrado</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.codigo} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                {editingId === c.codigo ? (
                  <>
                    <td className="px-4 py-2">
                      <input value={editCodigo} onChange={e => setEditCodigo(e.target.value)} className="w-full px-2 py-1 border rounded text-xs font-mono" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editDescricao} onChange={e => setEditDescricao(e.target.value)} className="w-full px-2 py-1 border rounded text-xs" />
                    </td>
                    <td className="px-4 py-2 text-right space-x-1">
                      <button onClick={saveEdit} className="p-1.5 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50"><Save size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"><X size={14} /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{c.codigo}</td>
                    <td className="px-4 py-3 text-slate-600">{c.descricao}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right space-x-1">
                        <button onClick={() => startEdit(c)} className="p-1.5 text-brand-500 border border-brand-200 rounded-lg hover:bg-brand-50"><Pencil size={14} /></button>
                        <button onClick={() => deleteCode(c.codigo)} className="p-1.5 text-red-500 border border-red-200 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
