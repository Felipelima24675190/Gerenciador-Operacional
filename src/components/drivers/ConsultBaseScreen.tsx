import { useState, useMemo, type Dispatch, type SetStateAction } from 'react';
import { Search, Filter, X, Plus, Trash2, ClipboardList, Pencil, Save } from 'lucide-react';
import { Motorista, StatusMotorista, EventoMotorista, TipoEventoMotorista, UserRole, JornadaMotorista, CodigoJornadaDescription } from '../../types';
import { BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar } from 'recharts';

const FILIAL_SIGLAS: Record<string, string> = {
  'RECIFE': 'REC',
  'ARCOVERDE': 'ACV',
  'PETROLINA': 'PNZ',
  'CARUARU': 'CAUA',
  'JOÃO PESSOA': 'JPA',
  'NATAL': 'NAT',
  'SÃO LUÍS': 'SLZ',
  'IMPERATRIZ': 'ITZ',
  'BALSAS': 'BLA',
  'MACEIÓ': 'MCZ',
  'CAMPINA GRANDE': 'CGE',
  'TERESINA': 'THE',
};

interface ConsultBaseScreenProps {
  motoristas: Motorista[];
  setMotoristas?: Dispatch<SetStateAction<Motorista[]>>;
  userRole?: UserRole;
  eventosMotorista?: EventoMotorista[];
  setEventosMotorista?: Dispatch<SetStateAction<EventoMotorista[]>>;
  jornadasMotorista?: JornadaMotorista[];
  codigosJornada?: CodigoJornadaDescription[];
}

// ─── Driver History Modal ───────────────────────────────────────────────────
const TIPO_COLORS: Record<TipoEventoMotorista, string> = {
  FALTA: 'bg-red-100 text-red-700',
  ATESTADO: 'bg-blue-100 text-blue-700',
  FOLGA: 'bg-amber-100 text-amber-700',
  TRABALHADO: 'bg-emerald-100 text-emerald-700',
};

function DriverHistoryModal({
  motorista,
  eventos,
  setEventos,
  onClose,
  jornadasMotorista = [],
  codigosJornada = [],
}: {
  motorista: Motorista;
  eventos: EventoMotorista[];
  setEventos: Dispatch<SetStateAction<EventoMotorista[]>>;
  onClose: () => void;
  jornadasMotorista?: JornadaMotorista[];
  codigosJornada?: CodigoJornadaDescription[];
}) {
  const [activeTab, setActiveTab] = useState<'eventos' | 'jornada'>('eventos');

  const codeMap = useMemo(() => new Map(codigosJornada.map(c => [c.codigo, c])), [codigosJornada]);

  const mJornadas = useMemo(
    () => jornadasMotorista.filter(j => j.matricula === motorista.matricula).sort((a, b) => {
      const parse = (d: string) => { const [dd, mm, yyyy] = d.split('/').map(Number); return new Date(yyyy, mm - 1, dd).getTime(); };
      return parse(b.data) - parse(a.data);
    }),
    [jornadasMotorista, motorista.matricula]
  );

  const jornadaResumo = useMemo(() => {
    let trabalhados = 0;
    let folgas = 0;
    let faltas = 0;
    let atestados = 0;
    for (const j of mJornadas) {
      const code = codeMap.get(j.codigoAtividade);
      const cat = code?.categoria || 'OUTROS';
      if (cat === 'ATIVIDADE' && !j.semJornada) trabalhados++;
      else if (cat === 'FOLGA') folgas++;
      else if (cat === 'FALTA') faltas++;
      else if (cat === 'ATESTADO') atestados++;
    }
    return { trabalhados, folgas, faltas, atestados };
  }, [mJornadas, codeMap]);

  const CAT_BADGE: Record<string, string> = {
    ATIVIDADE: 'bg-emerald-100 text-emerald-700',
    FOLGA: 'bg-amber-100 text-amber-700',
    ATESTADO: 'bg-blue-100 text-blue-700',
    FALTA: 'bg-red-100 text-red-700',
    OUTROS: 'bg-slate-100 text-slate-600',
  };
  const mEventos = useMemo(
    () => eventos.filter(e => e.matricula === motorista.matricula).sort((a, b) => {
      const parse = (d: string) => { const [dd, mm, yyyy] = d.split('/').map(Number); return new Date(yyyy, mm - 1, dd).getTime(); };
      return parse(b.data) - parse(a.data);
    }),
    [eventos, motorista.matricula]
  );

  const resumo = useMemo(() => ({
    FALTA: mEventos.filter(e => e.tipo === 'FALTA').length,
    ATESTADO: mEventos.filter(e => e.tipo === 'ATESTADO').length,
    FOLGA: mEventos.filter(e => e.tipo === 'FOLGA').length,
    TRABALHADO: mEventos.filter(e => e.tipo === 'TRABALHADO').length,
  }), [mEventos]);

  const [novoData, setNovoData] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoEventoMotorista>('TRABALHADO');
  const [novoObs, setNovoObs] = useState('');

  const handleAdd = () => {
    if (!novoData) return;
    // Convert yyyy-MM-dd → DD/MM/YYYY
    const [y, m, d] = novoData.split('-');
    const dataFmt = `${d}/${m}/${y}`;
    const novo: EventoMotorista = {
      id: crypto.randomUUID(),
      matricula: motorista.matricula,
      data: dataFmt,
      tipo: novoTipo,
      observacao: novoObs.trim() || undefined,
    };
    setEventos(prev => [...prev, novo]);
    setNovoData('');
    setNovoObs('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Remover este evento?')) setEventos(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-900 p-5 text-white rounded-t-2xl flex justify-between items-center shrink-0">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Histórico de Presença</p>
            <h2 className="text-lg font-black">{motorista.nome}</h2>
            <p className="text-slate-400 text-xs font-mono mt-0.5">{motorista.matricula} • {motorista.filial}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Tabs */}
          {mJornadas.length > 0 && (
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => setActiveTab('eventos')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${activeTab === 'eventos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Eventos Manuais</button>
              <button onClick={() => setActiveTab('jornada')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${activeTab === 'jornada' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Jornada ({mJornadas.length})</button>
            </div>
          )}

          {activeTab === 'jornada' && mJornadas.length > 0 ? (
            <>
              {/* Jornada Resumo */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-xl text-center bg-emerald-100 text-emerald-700">
                  <p className="text-2xs font-black uppercase tracking-wider">Trabalhados</p>
                  <p className="text-2xl font-black">{jornadaResumo.trabalhados}</p>
                </div>
                <div className="p-3 rounded-xl text-center bg-amber-100 text-amber-700">
                  <p className="text-2xs font-black uppercase tracking-wider">Folgas</p>
                  <p className="text-2xl font-black">{jornadaResumo.folgas}</p>
                </div>
                <div className="p-3 rounded-xl text-center bg-blue-100 text-blue-700">
                  <p className="text-2xs font-black uppercase tracking-wider">Atestados</p>
                  <p className="text-2xl font-black">{jornadaResumo.atestados}</p>
                </div>
                <div className="p-3 rounded-xl text-center bg-red-100 text-red-700">
                  <p className="text-2xs font-black uppercase tracking-wider">Faltas</p>
                  <p className="text-2xl font-black">{jornadaResumo.faltas}</p>
                </div>
              </div>

              {/* Jornada List */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {mJornadas.map(j => {
                  const code = codeMap.get(j.codigoAtividade);
                  const tipo = code?.descricao || j.codigoAtividade;
                  const cat = code?.categoria || 'OUTROS';
                  return (
                    <div key={j.id} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-slate-500">{j.data}</span>
                        <span className={`px-2 py-0.5 rounded text-2xs font-black ${CAT_BADGE[cat] || CAT_BADGE.OUTROS}`}>{tipo}</span>
                        {!j.semJornada && (
                          <span className="text-xs text-slate-400">
                            {j.horaEntrada} - {j.horaSaida}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
          {/* Resumo */}
          <div className="grid grid-cols-4 gap-3">
            {(['TRABALHADO', 'FOLGA', 'ATESTADO', 'FALTA'] as TipoEventoMotorista[]).map(tipo => (
              <div key={tipo} className={`p-3 rounded-xl text-center ${TIPO_COLORS[tipo]}`}>
                <p className="text-2xs font-black uppercase tracking-wider">{tipo}</p>
                <p className="text-2xl font-black">{resumo[tipo]}</p>
                <p className="text-2xs">dia(s)</p>
              </div>
            ))}
          </div>

          {/* Adicionar evento */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">Registrar Evento</p>
            <div className="flex gap-2 items-end flex-wrap">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Data</label>
                <input type="date" value={novoData} onChange={e => setNovoData(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tipo</label>
                <select value={novoTipo} onChange={e => setNovoTipo(e.target.value as TipoEventoMotorista)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
                  <option value="TRABALHADO">TRABALHADO</option>
                  <option value="FOLGA">FOLGA</option>
                  <option value="ATESTADO">ATESTADO</option>
                  <option value="FALTA">FALTA</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 block mb-1">Observação (opcional)</label>
                <input type="text" value={novoObs} onChange={e => setNovoObs(e.target.value)} placeholder="Ex: Atestado médico INSS" className="w-full border rounded-lg px-3 py-1.5 text-sm" />
              </div>
              <button onClick={handleAdd} disabled={!novoData} className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>

          {/* Lista de eventos */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {mEventos.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">Nenhum evento registrado.</p>
            ) : mEventos.map(ev => (
              <div key={ev.id} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500">{ev.data}</span>
                  <span className={`px-2 py-0.5 rounded text-2xs font-black ${TIPO_COLORS[ev.tipo]}`}>{ev.tipo}</span>
                  {ev.observacao && <span className="text-xs text-slate-400 italic">{ev.observacao}</span>}
                </div>
                <button onClick={() => handleDelete(ev.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConsultBaseScreen({ motoristas, setMotoristas, userRole, eventosMotorista = [], setEventosMotorista, jornadasMotorista = [], codigosJornada = [] }: ConsultBaseScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusMotorista | 'Todos'>('Todos');
  const [filialFilter, setFilialFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedHistorico, setSelectedHistorico] = useState<Motorista | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Motorista>>({});
  const itemsPerPage = 15;

  const isAdmin = userRole === 'admin';

  const handleStartEdit = (m: Motorista) => {
    setEditingId(m.matricula);
    setEditData({ nome: m.nome, filial: m.filial, area: m.area, status: m.status });
  };

  const handleSaveEdit = (matricula: string) => {
    if (!setMotoristas) return;
    setMotoristas(prev => prev.map(m => m.matricula === matricula ? { ...m, ...editData } as Motorista : m));
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = (matricula: string, nome: string) => {
    if (!setMotoristas) return;
    if (!confirm(`Excluir motorista ${nome} (${matricula})?`)) return;
    setMotoristas(prev => prev.filter(m => m.matricula !== matricula));
  };

  const filiais = useMemo(() => ['Todos', ...Array.from(new Set(motoristas.map(m => m.filial)))], [motoristas]);

  const filteredMotoristas = useMemo(() => {
    return motoristas.filter(m => {
      const matchSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        m.matricula.includes(searchTerm);
      const matchStatus = statusFilter === 'Todos' || m.status === statusFilter;
      const matchFilial = filialFilter === 'Todos' || m.filial === filialFilter;
      
      return matchSearch && matchStatus && matchFilial;
    });
  }, [motoristas, searchTerm, statusFilter, filialFilter]);

  const dashboardData = useMemo(() => {
    const totalAtivos = motoristas.filter(m => m.status === 'ATIVO - EM OPERAÇÃO').length;
    const motoristasPorFilial = motoristas.reduce((acc, m) => {
      if (m.status === 'ATIVO - EM OPERAÇÃO') {
        acc[m.filial] = (acc[m.filial] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      total: motoristas.length,
      totalAtivos,
      motoristasPorFilial: Object.entries(motoristasPorFilial).map(([name, count]) => ({ name: FILIAL_SIGLAS[name.toUpperCase()] || name, fullName: name, count })).sort((a,b) => b.count - a.count),
    };
  }, [motoristas]);

  const paginatedMotoristas = useMemo(() => {
    return filteredMotoristas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredMotoristas, currentPage]);

  const totalPages = Math.ceil(filteredMotoristas.length / itemsPerPage);

  const getStatusColor = (status: StatusMotorista) => {
    switch(status) {
      case 'ATIVO - EM OPERAÇÃO': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'DESLIGADO': return 'bg-red-100 text-red-700 border border-red-200';
      case 'INSS': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'INSTRUTOR': return 'bg-purple-100 text-purple-700 border border-purple-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-card border border-gray-200 shadow-card">
          <p className="text-sm text-gray-500">Total Motoristas</p>
          <p className="text-3xl font-bold">{dashboardData.total}</p>
        </div>
        <div className="bg-white p-4 rounded-card border border-gray-200 shadow-card">
          <p className="text-sm text-gray-500">Motoristas Ativos</p>
          <p className="text-3xl font-bold text-green-600">{dashboardData.totalAtivos}</p>
        </div>
        <div className="md:col-span-2 bg-white p-4 rounded-card border border-gray-200 shadow-card">
          <h4 className="text-sm text-gray-500 mb-2">Ativos por Filial</h4>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.motoristasPorFilial}>
                <XAxis dataKey="name" fontSize={10} />
                <YAxis width={30}/>
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="Motoristas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-card border border-gray-200 shadow-card relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                id="search-motorista"
                type="text"
                placeholder="Buscar por nome ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar motorista por nome ou matrícula"
                className="w-full pl-10 pr-4 py-2 px-3 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              id="filial-filter"
              value={filialFilter}
              onChange={(e) => setFilialFilter(e.target.value)}
              aria-label="Filtrar por filial"
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none w-full"
            >
              {filiais.map(f => <option key={f} value={f}>{f === 'Todos' ? 'Todas as Filiais' : f}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusMotorista | 'Todos')}
              aria-label="Filtrar por status"
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none w-full"
            >
              <option value="Todos">Todos os Status</option>
              <option value="ATIVO - EM OPERAÇÃO">ATIVO - EM OPERAÇÃO</option>
              <option value="DESLIGADO">DESLIGADO</option>
              <option value="INSS">INSS</option>
              <option value="INSTRUTOR">INSTRUTOR</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-2xs uppercase tracking-wide">
                <th className="px-3 py-2.5 font-semibold w-24">Matrícula</th>
                <th className="px-3 py-2.5 font-semibold">Nome</th>
                <th className="px-3 py-2.5 font-semibold w-32">Filial</th>
                <th className="px-3 py-2.5 font-semibold w-32">Área</th>
                <th className="px-3 py-2.5 font-semibold w-48">Status</th>
                <th className="px-3 py-2.5 font-semibold w-24">Histórico</th>
                {isAdmin && setMotoristas && <th className="px-3 py-2.5 font-semibold w-28">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedMotoristas.map((motorista, index) => {
                const isEditing = editingId === motorista.matricula;
                return (
                <tr key={`${motorista.matricula}-${index}`} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                  <td className="py-3 px-6 font-medium text-slate-800">{motorista.matricula}</td>
                  <td className="py-3 px-6 text-slate-600">
                    {isEditing ? <input value={editData.nome || ''} onChange={e => setEditData(p => ({ ...p, nome: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" /> : motorista.nome}
                  </td>
                  <td className="py-3 px-6 text-slate-600">
                    {isEditing ? <input value={editData.filial || ''} onChange={e => setEditData(p => ({ ...p, filial: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" /> : motorista.filial}
                  </td>
                  <td className="py-3 px-6 text-slate-600">
                    {isEditing ? <input value={editData.area || ''} onChange={e => setEditData(p => ({ ...p, area: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" /> : motorista.area}
                  </td>
                  <td className="py-3 px-6">
                    {isEditing ? (
                      <select value={editData.status || ''} onChange={e => setEditData(p => ({ ...p, status: e.target.value as StatusMotorista }))} className="border rounded px-2 py-1 text-xs bg-white">
                        <option value="ATIVO - EM OPERAÇÃO">ATIVO - EM OPERAÇÃO</option>
                        <option value="DESLIGADO">DESLIGADO</option>
                        <option value="INSS">INSS</option>
                        <option value="INSTRUTOR">INSTRUTOR</option>
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-2xs font-bold tracking-wider ${getStatusColor(motorista.status)}`}>
                        {motorista.status}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6">
                    <button
                      onClick={() => setSelectedHistorico(motorista)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <ClipboardList size={12} /> Ver
                    </button>
                  </td>
                  {isAdmin && setMotoristas && (
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveEdit(motorista.matricula)} className="p-1.5 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50" title="Salvar">
                              <Save size={13} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50" title="Cancelar">
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleStartEdit(motorista)} className="p-1.5 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50" title="Editar">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDelete(motorista.matricula, motorista.nome)} className="p-1.5 text-red-500 border border-red-200 rounded-lg hover:bg-red-50" title="Excluir">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
                );
              })}
              {filteredMotoristas.length === 0 && (
                <tr>
                  <td colSpan={isAdmin && setMotoristas ? 7 : 6} className="py-8 text-center text-gray-500">Nenhum motorista encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="pt-4 flex justify-between items-center">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
              Anterior
            </button>
            <span className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </span>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
              Próxima
            </button>
        </div>
      </div>

      {selectedHistorico && setEventosMotorista && (
        <DriverHistoryModal
          motorista={selectedHistorico}
          eventos={eventosMotorista}
          setEventos={setEventosMotorista}
          onClose={() => setSelectedHistorico(null)}
          jornadasMotorista={jornadasMotorista}
          codigosJornada={codigosJornada}
        />
      )}
    </div>
  );
}

