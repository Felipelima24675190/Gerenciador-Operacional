import { useState, useMemo, type Dispatch, type SetStateAction } from 'react';
import { Search, Filter, X, Plus, Trash2, ClipboardList } from 'lucide-react';
import { Motorista, StatusMotorista, EventoMotorista, TipoEventoMotorista, UserRole } from '../../types';
import { BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar } from 'recharts';

const FILIAL_SIGLAS: Record<string, string> = {
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
};

interface ConsultBaseScreenProps {
  motoristas: Motorista[];
  setMotoristas?: Dispatch<SetStateAction<Motorista[]>>;
  userRole?: UserRole;
  eventosMotorista?: EventoMotorista[];
  setEventosMotorista?: Dispatch<SetStateAction<EventoMotorista[]>>;
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
}: {
  motorista: Motorista;
  eventos: EventoMotorista[];
  setEventos: Dispatch<SetStateAction<EventoMotorista[]>>;
  onClose: () => void;
}) {
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
          {/* Resumo */}
          <div className="grid grid-cols-4 gap-3">
            {(['TRABALHADO', 'FOLGA', 'ATESTADO', 'FALTA'] as TipoEventoMotorista[]).map(tipo => (
              <div key={tipo} className={`p-3 rounded-xl text-center ${TIPO_COLORS[tipo]}`}>
                <p className="text-[9px] font-black uppercase tracking-wider">{tipo}</p>
                <p className="text-2xl font-black">{resumo[tipo]}</p>
                <p className="text-[9px]">dia(s)</p>
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
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${TIPO_COLORS[ev.tipo]}`}>{ev.tipo}</span>
                  {ev.observacao && <span className="text-xs text-slate-400 italic">{ev.observacao}</span>}
                </div>
                <button onClick={() => handleDelete(ev.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConsultBaseScreen({ motoristas, eventosMotorista = [], setEventosMotorista }: ConsultBaseScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusMotorista | 'Todos'>('Todos');
  const [filialFilter, setFilialFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedHistorico, setSelectedHistorico] = useState<Motorista | null>(null);
  const itemsPerPage = 15;

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-500">Total Motoristas</p>
          <p className="text-3xl font-bold">{dashboardData.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-500">Motoristas Ativos</p>
          <p className="text-3xl font-bold text-green-600">{dashboardData.totalAtivos}</p>
        </div>
        <div className="md:col-span-2 bg-white p-4 rounded-xl border shadow-sm">
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
      <div className="bg-white p-6 rounded-xl border shadow-sm relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50"
              />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filialFilter}
              onChange={(e) => setFilialFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white w-full"
            >
              {filiais.map(f => <option key={f} value={f}>{f === 'Todos' ? 'Todas as Filiais' : f}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusMotorista | 'Todos')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white w-full"
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
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                <th className="py-3 px-6 font-semibold w-24">Matrícula</th>
                <th className="py-3 px-6 font-semibold">Nome</th>
                <th className="py-3 px-6 font-semibold w-32">Filial</th>
                <th className="py-3 px-6 font-semibold w-32">Área</th>
                <th className="py-3 px-6 font-semibold w-48">Status</th>
                <th className="py-3 px-6 font-semibold w-24">Histórico</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMotoristas.map((motorista, index) => (
                <tr key={`${motorista.matricula}-${index}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6 font-medium text-slate-800">{motorista.matricula}</td>
                  <td className="py-3 px-6 text-slate-600">{motorista.nome}</td>
                  <td className="py-3 px-6 text-slate-600">{motorista.filial}</td>
                  <td className="py-3 px-6 text-slate-600">{motorista.area}</td>
                  <td className="py-3 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${getStatusColor(motorista.status)}`}>
                      {motorista.status}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <button
                      onClick={() => setSelectedHistorico(motorista)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <ClipboardList size={12} /> Ver
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMotoristas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Nenhum motorista encontrado.</td>
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
        />
      )}
    </div>
  );
}

