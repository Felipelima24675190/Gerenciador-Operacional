import { useState, useMemo, Dispatch, SetStateAction } from 'react';
import { CodigoJornadaDescription, UserRole } from '../../types';
import { Search, Plus, Trash2, Save, X } from 'lucide-react';

interface Props {
  codigosJornada: CodigoJornadaDescription[];
  setCodigosJornada: Dispatch<SetStateAction<CodigoJornadaDescription[]>>;
  userRole?: UserRole;
}

const CATEGORIAS = ['ATIVIDADE', 'FOLGA', 'ATESTADO', 'FALTA', 'OUTROS'] as const;

const CAT_BADGE: Record<string, string> = {
  ATIVIDADE: 'bg-emerald-100 text-emerald-700',
  FOLGA: 'bg-amber-100 text-amber-700',
  ATESTADO: 'bg-blue-100 text-blue-700',
  FALTA: 'bg-red-100 text-red-700',
  OUTROS: 'bg-slate-100 text-slate-600',
};

export default function CodigosJornadaScreen({ codigosJornada, setCodigosJornada, userRole }: Props) {
  const [busca, setBusca] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CodigoJornadaDescription>>({});
  const [addMode, setAddMode] = useState(false);
  const [newCode, setNewCode] = useState<CodigoJornadaDescription>({ codigo: '', descricao: '', categoria: 'OUTROS', contaComoFalta: false });

  const isAdmin = userRole === 'admin';

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return codigosJornada;
    return codigosJornada.filter(c =>
      c.codigo.toLowerCase().includes(q) ||
      c.descricao.toLowerCase().includes(q) ||
      c.categoria.toLowerCase().includes(q)
    );
  }, [codigosJornada, busca]);

  const handleAdd = () => {
    if (!newCode.codigo.trim() || !newCode.descricao.trim()) return;
    if (codigosJornada.some(c => c.codigo === newCode.codigo.trim())) return;
    setCodigosJornada(prev => [...prev, { ...newCode, codigo: newCode.codigo.trim().padStart(3, '0') }]);
    setNewCode({ codigo: '', descricao: '', categoria: 'OUTROS', contaComoFalta: false });
    setAddMode(false);
  };

  const handleDelete = (codigo: string) => {
    setCodigosJornada(prev => prev.filter(c => c.codigo !== codigo));
  };

  const startEdit = (c: CodigoJornadaDescription) => {
    setEditId(c.codigo);
    setEditData({ ...c });
  };

  const saveEdit = () => {
    if (!editId || !editData.descricao?.trim()) return;
    setCodigosJornada(prev => prev.map(c => c.codigo === editId ? { ...c, ...editData } as CodigoJornadaDescription : c));
    setEditId(null);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Buscar codigo, descricao..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => setAddMode(!addMode)}
              className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-brand-600 text-white rounded-button hover:bg-brand-700 transition-colors"
            >
              <Plus size={14} /> Adicionar
            </button>
          )}
          <span className="text-xs text-slate-400">{codigosJornada.length} codigo(s)</span>
        </div>

        {addMode && isAdmin && (
          <div className="mt-4 p-4 bg-slate-50 border border-gray-200 rounded-card flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Codigo</label>
              <input
                type="text"
                value={newCode.codigo}
                onChange={e => setNewCode({ ...newCode, codigo: e.target.value })}
                placeholder="001"
                className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-button bg-white focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Descricao</label>
              <input
                type="text"
                value={newCode.descricao}
                onChange={e => setNewCode({ ...newCode, descricao: e.target.value })}
                placeholder="Jornada Normal"
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-button bg-white focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Categoria</label>
              <select
                value={newCode.categoria}
                onChange={e => setNewCode({ ...newCode, categoria: e.target.value })}
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-button bg-white focus:ring-2 focus:ring-brand-400 focus:outline-none"
              >
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={newCode.contaComoFalta}
                onChange={e => setNewCode({ ...newCode, contaComoFalta: e.target.checked })}
                className="rounded border-gray-300"
              />
              Conta como Falta
            </label>
            <button onClick={handleAdd} className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-button hover:bg-emerald-700"><Save size={12} /></button>
            <button onClick={() => setAddMode(false)} className="px-3 py-1.5 text-xs font-bold bg-slate-300 text-slate-700 rounded-button hover:bg-slate-400"><X size={12} /></button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr className="text-2xs uppercase tracking-wide">
                <th className="px-3 py-2.5 font-bold">Codigo</th>
                <th className="px-3 py-2.5 font-bold">Descricao</th>
                <th className="px-3 py-2.5 font-bold">Categoria</th>
                <th className="px-3 py-2.5 font-bold text-center">Conta como Falta</th>
                {isAdmin && <th className="px-3 py-2.5 font-bold text-right">Acoes</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.codigo} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                  <td className="px-3 py-2 font-mono font-bold text-slate-800">{c.codigo}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {editId === c.codigo ? (
                      <input
                        type="text"
                        value={editData.descricao || ''}
                        onChange={e => setEditData({ ...editData, descricao: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                      />
                    ) : c.descricao}
                  </td>
                  <td className="px-3 py-2">
                    {editId === c.codigo ? (
                      <select
                        value={editData.categoria || 'OUTROS'}
                        onChange={e => setEditData({ ...editData, categoria: e.target.value })}
                        className="px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                      >
                        {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-2xs font-bold uppercase ${CAT_BADGE[c.categoria] || CAT_BADGE.OUTROS}`}>
                        {c.categoria}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {editId === c.codigo ? (
                      <input
                        type="checkbox"
                        checked={editData.contaComoFalta || false}
                        onChange={e => setEditData({ ...editData, contaComoFalta: e.target.checked })}
                      />
                    ) : (
                      c.contaComoFalta ? <span className="text-red-600 font-bold">Sim</span> : <span className="text-slate-400">Nao</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2 text-right">
                      {editId === c.codigo ? (
                        <div className="flex gap-1 justify-end">
                          <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={14} /></button>
                          <button onClick={() => setEditId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => startEdit(c)} className="p-1 text-blue-500 hover:bg-blue-50 rounded text-2xs font-bold">Editar</button>
                          <button onClick={() => handleDelete(c.codigo)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">Nenhum codigo encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
