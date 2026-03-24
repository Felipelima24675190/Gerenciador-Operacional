import { useState, useMemo, type Dispatch, type SetStateAction } from 'react';
import { Search, Plus, Trash2, BookOpen, Save, X } from 'lucide-react';
import { Viagem, UserRole, LinhaAbreviacao } from '../../types';

interface LineDictionaryScreenProps {
  dicionario: LinhaAbreviacao[];
  setDicionario: Dispatch<SetStateAction<LinhaAbreviacao[]>>;
  viagens: Viagem[];
  userRole?: UserRole;
}

export const DEFAULT_ENTRIES: LinhaAbreviacao[] = [
  { id: '1', sigla: 'BLA', nomeCompleto: 'Balsas(MA)' },
  { id: '2', sigla: 'REC', nomeCompleto: 'Recife(PE)' },
  { id: '3', sigla: 'JPA', nomeCompleto: 'João Pessoa(PB)' },
  { id: '4', sigla: 'NAT', nomeCompleto: 'Natal(RN)' },
  { id: '5', sigla: 'THE', nomeCompleto: 'Teresina(PI)' },
  { id: '6', sigla: 'SLZ', nomeCompleto: 'São Luís(MA)' },
  { id: '7', sigla: 'ITZ', nomeCompleto: 'Imperatriz(MA)' },
  { id: '8', sigla: 'MCZ', nomeCompleto: 'Maceió(AL)' },
  { id: '9', sigla: 'PNZ', nomeCompleto: 'Petrolina(PE)' },
  { id: '10', sigla: 'CGE', nomeCompleto: 'Campina Grande(PB)' },
  { id: '11', sigla: 'ACV', nomeCompleto: 'Arcoverde(PE)' },
  { id: '12', sigla: 'CAUA', nomeCompleto: 'Caruaru(PE)' },
];

export default function LineDictionaryScreen({ dicionario, setDicionario, viagens, userRole }: LineDictionaryScreenProps) {
  const [search, setSearch] = useState('');
  const [novaSigla, setNovaSigla] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSigla, setEditSigla] = useState('');
  const [editNome, setEditNome] = useState('');

  const isAdmin = userRole === 'admin';

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return dicionario;
    return dicionario.filter(d =>
      d.sigla.toLowerCase().includes(term) || d.nomeCompleto.toLowerCase().includes(term)
    );
  }, [dicionario, search]);

  // Extract unique city names from viagens for suggestions
  const citiesFromViagens = useMemo(() => {
    const cities = new Set<string>();
    viagens.forEach(v => {
      if (v.origem) cities.add(v.origem);
      if (v.destino) cities.add(v.destino);
    });
    return Array.from(cities).sort();
  }, [viagens]);

  const handleAdd = () => {
    const sigla = novaSigla.trim().toUpperCase();
    const nome = novoNome.trim();
    if (!sigla || !nome) return;
    if (dicionario.some(d => d.sigla === sigla)) {
      alert(`A sigla "${sigla}" já existe no dicionário.`);
      return;
    }
    setDicionario(prev => [...prev, { id: crypto.randomUUID(), sigla, nomeCompleto: nome }]);
    setNovaSigla('');
    setNovoNome('');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remover esta entrada do dicionário?')) return;
    setDicionario(prev => prev.filter(d => d.id !== id));
  };

  const handleStartEdit = (d: LinhaAbreviacao) => {
    setEditingId(d.id);
    setEditSigla(d.sigla);
    setEditNome(d.nomeCompleto);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setDicionario(prev => prev.map(d =>
      d.id === editingId ? { ...d, sigla: editSigla.trim().toUpperCase(), nomeCompleto: editNome.trim() } : d
    ));
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-5 flex items-center gap-4">
        <BookOpen className="text-blue-400" size={28} />
        <div>
          <h2 className="text-lg font-black text-white">Dicionário de Linhas</h2>
          <p className="text-slate-400 text-xs mt-0.5">Abreviações utilizadas nos nomes das linhas (ex: BLA = Balsas(MA), REC = Recife(PE))</p>
        </div>
        <div className="ml-auto bg-slate-700 rounded-lg px-4 py-2 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Entradas</p>
          <p className="text-xl font-black text-white">{dicionario.length}</p>
        </div>
      </div>

      {/* Search + Add */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Buscar</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar sigla ou nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          {isAdmin && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Sigla</label>
                <input
                  type="text"
                  placeholder="Ex: BLA"
                  value={novaSigla}
                  onChange={e => setNovaSigla(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-24 uppercase"
                  maxLength={6}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Balsas(MA)"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  list="city-suggestions"
                />
                {citiesFromViagens.length > 0 && (
                  <datalist id="city-suggestions">
                    {citiesFromViagens.map(c => <option key={c} value={c} />)}
                  </datalist>
                )}
              </div>
              <button
                onClick={handleAdd}
                disabled={!novaSigla.trim() || !novoNome.trim()}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus size={14} /> Adicionar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white text-[10px] uppercase">
            <tr>
              <th className="px-6 py-3 font-bold w-32">Sigla</th>
              <th className="px-6 py-3 font-bold">Nome Completo</th>
              {isAdmin && <th className="px-6 py-3 font-bold w-28 text-center">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-3 font-mono font-black text-slate-800">
                  {editingId === d.id ? (
                    <input value={editSigla} onChange={e => setEditSigla(e.target.value)} className="border rounded px-2 py-1 text-sm uppercase w-20" />
                  ) : d.sigla}
                </td>
                <td className="px-6 py-3 text-slate-600">
                  {editingId === d.id ? (
                    <input value={editNome} onChange={e => setEditNome(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                  ) : d.nomeCompleto}
                </td>
                {isAdmin && (
                  <td className="px-6 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {editingId === d.id ? (
                        <>
                          <button onClick={handleSaveEdit} className="p-1.5 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50" title="Salvar">
                            <Save size={13} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50" title="Cancelar">
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleStartEdit(d)} className="p-1.5 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50" title="Editar">
                            <Search size={13} />
                          </button>
                          <button onClick={() => handleDelete(d.id)} className="p-1.5 text-red-500 border border-red-200 rounded-lg hover:bg-red-50" title="Excluir">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 3 : 2} className="px-6 py-8 text-center text-gray-400">Nenhuma entrada encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
