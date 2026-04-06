import { useMemo, useState, Dispatch, SetStateAction } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';
import { clsx } from 'clsx';
import { Motorista, Ocorrencia, Viagem, UserRole } from '../../types';
import StatCard from './StatCard';
import { AlertCircle, Clock, CheckCircle2, TrendingUp, Edit3, Save, X, Calendar, Search, Settings } from 'lucide-react';
import { getDay, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { TipoStatus } from '../../types';

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const text = payload.value;
  
  if (text.includes(' - ')) {
    const [code, ...nameParts] = text.split(' - ');
    const name = nameParts.join(' - ');
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={-10} y={-5} dy={0} textAnchor="end" fill="#64748b" fontSize={11} fontWeight={700}>{name}</text>
        <text x={-10} y={10} dy={0} textAnchor="end" fill="#94a3b8" fontSize={11} fontWeight={600}>{code}</text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-10} y={0} dy={4} textAnchor="end" fill="#64748b" fontSize={11} fontWeight={600}>{text}</text>
    </g>
  );
};

interface DashboardScreenProps {
  motoristas: Motorista[];
  ocorrencias: Ocorrencia[];
  viagens: Viagem[];
  setOcorrencias: Dispatch<SetStateAction<Ocorrencia[]>>;
  userRole?: UserRole;
}

export default function DashboardScreen({ motoristas, ocorrencias, viagens, setOcorrencias, userRole }: DashboardScreenProps) {
  const [editingOccId, setEditingOccId] = useState<string | null>(null);
  const [motivoTemp, setMotivoTemp] = useState('');
  const [dataInicio, setDataInicio] = useState('2026-03-18');
  const [dataFim, setDataFim] = useState('2026-03-18');
  const [filialFilter, setFilialFilter] = useState('Todas');
  const [linhaFilter, setLinhaFilter] = useState('Todas');
  const [linePreviewId, setLinePreviewId] = useState<string | null>(null);
  const [showToleranciaSettings, setShowToleranciaSettings] = useState(false);

  // Editable threshold (persisted in localStorage)
  const [toleranciaAtraso, setToleranciaAtraso] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('toleranciaAtraso') || '5') || 5; } catch { return 5; }
  });
  const [toleranciaAdiantamento, setToleranciaAdiantamento] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('toleranciaAdiantamento') || '5') || 5; } catch { return 5; }
  });

  const saveTolerancia = (atraso: number, adiant: number) => {
    setToleranciaAtraso(atraso);
    setToleranciaAdiantamento(adiant);
    localStorage.setItem('toleranciaAtraso', String(atraso));
    localStorage.setItem('toleranciaAdiantamento', String(adiant));
  };

  // Compute status dynamically based on editable thresholds
  const calcStatus = (diff: number): TipoStatus => {
    if (diff > toleranciaAtraso) return 'Atraso';
    if (diff < -toleranciaAdiantamento) return 'Adiantamento';
    return 'No Horário';
  };

  const getStatusInicio = (o: Ocorrencia): TipoStatus => calcStatus(o.diffMinutosInicio);
  const getStatusFim = (o: Ocorrencia): TipoStatus => calcStatus(o.diffMinutosFim);

  const filiaisUnicas = useMemo(() => {
    const filiais = new Set(motoristas.map(m => m.filial));
    return ['Todas', ...Array.from(filiais)].sort();
  }, [motoristas]);

  // Build a resolver to map codes/numbers to full line names
  const resolveLinha = useMemo(() => {
    const byNome = new Map<string, string>();
    const byNumero = new Map<string, string>();
    const byServico = new Map<string, string>();
    viagens.forEach(v => {
      byNome.set(v.nomeLinha, v.nomeLinha);
      if (v.numeroLinha) byNumero.set(v.numeroLinha, v.nomeLinha);
      if (v.servico) {
        v.servico.split('/').forEach(s => byServico.set(s.trim(), v.nomeLinha));
      }
    });
    return (codeOrName: string): string => {
      const t = codeOrName.trim();
      return byNome.get(t) || byNumero.get(t) || byServico.get(t) || t;
    };
  }, [viagens]);

  const linhasUnicas = useMemo(() => {
    const uniqueNames = new Set<string>();
    // Build from voyages base
    viagens.forEach(v => uniqueNames.add(v.nomeLinha));
    // Add lines from occurrences, resolving codes to names
    ocorrencias.forEach(o => {
      const resolved = resolveLinha(o.nomeLinha) || resolveLinha(o.numeroLinha);
      uniqueNames.add(resolved);
    });
    return ['Todas', ...Array.from(uniqueNames).sort()];
  }, [viagens, ocorrencias, resolveLinha]);

  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter(o => {
      // Data Filter
      const datePart = o.prevInicio.split(' ')[0];
      const [day, month, year] = datePart.split('/').map(Number);
      const dataOcorrencia = new Date(year, month - 1, day);
      const start = startOfDay(new Date(dataInicio + 'T00:00:00'));
      const end = endOfDay(new Date(dataFim + 'T23:59:59'));
      const matchDate = isWithinInterval(dataOcorrencia, { start, end });

      // Filial Filter - Don't hide unknown drivers if "Todas" is selected
      const motorista = motoristas.find(m => m.matricula === o.matriculaMotorista);
      const filial = motorista ? motorista.filial : 'Desconhecida';
      const matchFilial = filialFilter === 'Todas' || filial === filialFilter;

      // Linha Filter — resolve code to name for consistent matching
      const resolvedLinha = resolveLinha(o.nomeLinha) || resolveLinha(o.numeroLinha);
      const matchLinha = linhaFilter === 'Todas' || resolvedLinha === linhaFilter || o.nomeLinha === linhaFilter || o.numeroLinha === linhaFilter;
      
      return matchDate && matchFilial && matchLinha;
    });
  }, [ocorrencias, dataInicio, dataFim, filialFilter, linhaFilter, motoristas]);

  const isAdmin = userRole === 'admin';

  const metricasGlobais = useMemo(() => {
    let atrasos = 0;
    let adiantamentos = 0;
    let noHorario = 0;

    ocorrenciasFiltradas.forEach(o => {
      const statusIn = getStatusInicio(o);
      const statusOut = getStatusFim(o);

      const isAtraso = statusIn === 'Atraso' || statusOut === 'Atraso';
      const isAdiantamento = statusIn === 'Adiantamento' || statusOut === 'Adiantamento';

      if (isAtraso) atrasos++;
      else if (isAdiantamento) adiantamentos++;
      else noHorario++;
    });

    const totalCalculado = atrasos + adiantamentos + noHorario;
    const percPontual = totalCalculado > 0 ? ((noHorario / totalCalculado) * 100).toFixed(1) : '0.0';
    const percAtraso = totalCalculado > 0 ? ((atrasos / totalCalculado) * 100).toFixed(1) : '0.0';
    const percAdiantamento = totalCalculado > 0 ? ((adiantamentos / totalCalculado) * 100).toFixed(1) : '0.0';

    return { atrasos, adiantamentos, noHorario, total: totalCalculado, percPontual, percAtraso, percAdiantamento };
  }, [ocorrenciasFiltradas, toleranciaAtraso, toleranciaAdiantamento]);

  const linhaMaisAtrasada = useMemo(() => {
    const contagem: Record<string, { count: number, nome: string, atendimento: string }> = {};
    ocorrenciasFiltradas.forEach(o => {
      if (getStatusInicio(o) === 'Atraso' || getStatusFim(o) === 'Atraso') {
        if (!contagem[o.numeroLinha]) {
          contagem[o.numeroLinha] = { count: 0, nome: o.nomeLinha, atendimento: o.atendimento };
        }
        contagem[o.numeroLinha].count++;
      }
    });

    const sorted = Object.entries(contagem).sort((a, b) => b[1].count - a[1].count);
    return sorted.length > 0 ? { id: sorted[0][0], ...sorted[0][1] } : null;
  }, [ocorrenciasFiltradas, toleranciaAtraso, toleranciaAdiantamento]);

  const saveMotivo = (id: string) => {
    setOcorrencias(prev => prev.map(o => o.id === id ? { ...o, motivoAtraso: motivoTemp } : o));
    setEditingOccId(null);
  };

  const renderDashboardTitle = (baseTitle: string, filterValue: string) => {
    if (filterValue === 'Todas') return baseTitle;
    if (filterValue.includes(' - ')) {
      const [code, ...nameParts] = filterValue.split(' - ');
      const name = nameParts.join(' - ');
      return (
        <div className="flex flex-col">
          <span className="text-lg font-bold text-slate-800 leading-tight">{name}</span>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{code}</span>
        </div>
      );
    }
    return <span className="text-lg font-bold text-slate-800">{baseTitle}: {filterValue}</span>;
  };

  const dadosGraficoFilial = useMemo(() => {
    const contagem: Record<string, { Atraso: number; Adiantamento: number; NoHorario: number }> = {};
    
    ocorrenciasFiltradas.forEach(o => {
      const motorista = motoristas.find(m => m.matricula === o.matriculaMotorista);
      const label = motorista ? motorista.filial : 'Desconhecida';

      if (!contagem[label]) {
        contagem[label] = { Atraso: 0, Adiantamento: 0, NoHorario: 0 };
      }

      const isAtraso = getStatusInicio(o) === 'Atraso' || getStatusFim(o) === 'Atraso';
      const isAdiantamento = getStatusInicio(o) === 'Adiantamento' || getStatusFim(o) === 'Adiantamento';

      if (isAtraso) contagem[label].Atraso++;
      else if (isAdiantamento) contagem[label].Adiantamento++;
      else contagem[label].NoHorario++;
    });

    return Object.entries(contagem).map(([name, data]) => ({ name, ...data }));
  }, [ocorrenciasFiltradas, motoristas, toleranciaAtraso, toleranciaAdiantamento]);

  const dadosLinhaDoTempo = useMemo(() => {
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const contagem: Record<string, number> = { Dom: 0, Seg: 0, Ter: 0, Qua: 0, Qui: 0, Sex: 0, Sáb: 0 };
    
    ocorrenciasFiltradas.forEach(o => {
      if (getStatusInicio(o) !== 'No Horário') {
        const datePart = o.prevInicio.split(' ')[0];
        const [day, month, year] = datePart.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        const diaIndex = getDay(date);
        const diaNome = diasSemana[diaIndex];
        if (contagem[diaNome] !== undefined) {
          contagem[diaNome]++;
        }
      }
    });

    return Object.entries(contagem).map(([name, Ocorrencias]) => ({ name, Ocorrencias }));
  }, [ocorrenciasFiltradas, toleranciaAtraso, toleranciaAdiantamento]);

  const rankingMotoristas = useMemo(() => {
    const rank: Record<string, { nome: string, filial: string, total: number }> = {};
    
    ocorrenciasFiltradas.forEach(o => {
      if (getStatusInicio(o) !== 'No Horário') {
        const m = motoristas.find(m => m.matricula === o.matriculaMotorista);
        if (m) {
          if (!rank[m.matricula]) {
            rank[m.matricula] = { nome: m.nome, filial: m.filial, total: 0 };
          }
          rank[m.matricula].total++;
        }
      }
    });

    return Object.values(rank).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [ocorrenciasFiltradas, motoristas, toleranciaAtraso, toleranciaAdiantamento]);

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="bg-white p-6 rounded-card border border-gray-200 shadow-card space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Calendar size={20} className="text-red-500" />
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Filtros do Dashboard</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label htmlFor="filter-data-inicio" className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Intervalo de Data</label>
            <div className="flex items-center gap-2">
              <div className="relative w-full">
                <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="filter-data-inicio"
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  aria-label="Data de início"
                  className="w-full pl-7 pr-2 py-2 border border-gray-200 rounded-button text-xs font-medium bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none transition-all"
                />
              </div>
              <span className="text-slate-300">→</span>
              <div className="relative w-full">
                <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="filter-data-fim"
                  type="date"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  aria-label="Data de fim"
                  className="w-full pl-7 pr-2 py-2 border border-gray-200 rounded-button text-xs font-medium bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="filter-filial" className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Filial</label>
            <select
              id="filter-filial"
              value={filialFilter}
              onChange={e => setFilialFilter(e.target.value)}
              aria-label="Filtrar por filial"
              className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
            >
              {filiaisUnicas.map(f => <option key={f} value={f}>{f === 'Todas' ? 'Todas as Filiais' : f}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="filter-linha" className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Linha / Operação</label>
            <select
              id="filter-linha"
              value={linhaFilter}
              onChange={e => setLinhaFilter(e.target.value)}
              aria-label="Filtrar por linha"
              className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
            >
              {linhasUnicas.map(l => <option key={l} value={l}>{l === 'Todas' ? 'Todas as Linhas' : l}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-2xs font-bold text-slate-500 uppercase tracking-wide">Tolerância</label>
            <button
              onClick={() => setShowToleranciaSettings(!showToleranciaSettings)}
              aria-label="Configurar tolerância de pontualidade"
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 hover:bg-slate-100 transition-colors focus:ring-2 focus:ring-brand-400 focus:outline-none"
            >
              <Settings size={12} />
              Atraso: {toleranciaAtraso}min · Adiant: {toleranciaAdiantamento}min
            </button>
          </div>
        </div>

        {/* Tolerance settings panel */}
        {showToleranciaSettings && (
          <div className="mt-4 p-4 bg-slate-50 border border-gray-200 rounded-card space-y-3">
            <p className="text-xs font-bold text-slate-700">Configurar Tolerância de Pontualidade</p>
            <p className="text-2xs text-slate-500">Define o limite em minutos para classificar viagens como Atraso ou Adiantamento. O sistema recalcula automaticamente.</p>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <label htmlFor="tolerancia-atraso" className="text-2xs font-bold text-slate-600 uppercase tracking-wide">Atraso (min):</label>
                <input
                  id="tolerancia-atraso"
                  type="number"
                  min={1}
                  max={60}
                  value={toleranciaAtraso}
                  onChange={e => saveTolerancia(Math.max(1, parseInt(e.target.value) || 5), toleranciaAdiantamento)}
                  aria-label="Tolerância de atraso em minutos"
                  className="w-16 px-2 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none text-center"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="tolerancia-adiantamento" className="text-2xs font-bold text-slate-600 uppercase tracking-wide">Adiantamento (min):</label>
                <input
                  id="tolerancia-adiantamento"
                  type="number"
                  min={1}
                  max={60}
                  value={toleranciaAdiantamento}
                  onChange={e => saveTolerancia(toleranciaAtraso, Math.max(1, parseInt(e.target.value) || 5))}
                  aria-label="Tolerância de adiantamento em minutos"
                  className="w-16 px-2 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none text-center"
                />
              </div>
              <p className="text-2xs text-slate-500 ml-auto">
                Exemplo: com tolerância de {toleranciaAtraso}min, viagens com diferença &gt; {toleranciaAtraso}min são <span className="font-bold text-red-500">Atraso</span> e &lt; -{toleranciaAdiantamento}min são <span className="font-bold text-orange-500">Adiantamento</span>.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Taxa de Pontualidade" 
          value={`${metricasGlobais.percPontual}%`} 
          icon={CheckCircle2} 
          color="green" 
        />
        <StatCard 
          title="Taxa de Atrasos" 
          value={`${metricasGlobais.percAtraso}%`} 
          icon={Clock} 
          color="red" 
        />
        <StatCard 
          title="Taxa de Adiantamentos" 
          value={`${metricasGlobais.percAdiantamento}%`} 
          icon={TrendingUp} 
          color="orange" 
        />
        <StatCard 
          title="Viagens Analisadas" 
          value={metricasGlobais.total} 
          icon={AlertCircle} 
          color="blue" 
        />
      </div>

      {linhaMaisAtrasada && (
        <div className="bg-red-50 border border-red-100 rounded-card p-6 flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Linha Crítica (Mais Atrasos)</p>
              <h4 className="text-lg font-black text-slate-800">{linhaMaisAtrasada.nome}</h4>
              <p className="text-xs font-bold text-slate-400">{linhaMaisAtrasada.id}</p>
              <p className="text-sm text-slate-500 mt-1">{linhaMaisAtrasada.count} ocorrências de atraso no intervalo selecionado.</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <button 
              onClick={() => setLinePreviewId(linhaMaisAtrasada.id)}
              aria-label="Visualizar todas as viagens da linha crítica"
              className="px-6 py-2 bg-slate-900 text-white rounded-card text-xs font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Search size={14} />
              Visualizar Todas as Viagens
            </button>
            <p className="text-2xs font-bold text-slate-400 uppercase text-center">Clique para preview detalhado</p>
          </div>
        </div>
      )}

      {/* Modal de Preview de Linha */}
      {linePreviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-card shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">Detalhamento da Operação</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{linePreviewId} - {ocorrenciasFiltradas.find(o => o.numeroLinha === linePreviewId)?.nomeLinha}</p>
              </div>
              <button onClick={() => setLinePreviewId(null)} aria-label="Fechar detalhamento" className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {(() => {
                // Parse "DD/MM/YYYY HH:MM" → sortable number
                const parsePrev = (s: string) => {
                  try {
                    const [datePart, timePart] = s.split(' ');
                    const [d, m, y] = datePart.split('/').map(Number);
                    const [h, min] = (timePart || '00:00').split(':').map(Number);
                    return new Date(y, m - 1, d, h, min).getTime();
                  } catch { return 0; }
                };

                // Group by motorista, sort trips within each group by prevInicio asc
                const lineOccs = ocorrenciasFiltradas.filter(o => o.numeroLinha === linePreviewId);
                const grupos: Record<string, typeof lineOccs> = {};
                lineOccs.forEach(o => {
                  if (!grupos[o.matriculaMotorista]) grupos[o.matriculaMotorista] = [];
                  grupos[o.matriculaMotorista].push(o);
                });
                // Sort trips within each group ascending
                Object.values(grupos).forEach(arr => arr.sort((a, b) => parsePrev(a.prevInicio) - parsePrev(b.prevInicio)));
                // Sort groups by first trip time
                const gruposOrdenados = Object.entries(grupos).sort(([, a], [, b]) => parsePrev(a[0].prevInicio) - parsePrev(b[0].prevInicio));

                return (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white text-2xs uppercase tracking-wide">
                        <th className="px-3 py-2.5">Atendimento</th>
                        <th className="px-3 py-2.5">Sentido</th>
                        <th className="px-3 py-2.5">Veículo</th>
                        <th className="px-3 py-2.5">Previsto (Início/Fim)</th>
                        <th className="px-3 py-2.5">Realizado (Início/Fim)</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gruposOrdenados.map(([matricula, occs]) => {
                        const mot = motoristas.find(m => m.matricula === matricula);
                        return (
                          <>
                            {/* Driver group header */}
                            <tr key={`header-${matricula}`} className="bg-slate-100 border-t-2 border-slate-300">
                              <td colSpan={7} className="px-3 py-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-white text-2xs font-black">
                                    {(mot?.nome || matricula).charAt(0)}
                                  </div>
                                  <span className="font-black text-slate-700 text-xs">{mot?.nome || `Matrícula ${matricula}`}</span>
                                  {mot && <span className="text-2xs text-slate-400 font-bold uppercase">{mot.filial} · {mot.area}</span>}
                                  <span className="ml-auto text-2xs font-black text-slate-500 bg-white px-2 py-0.5 rounded border">{occs.length} viagem{occs.length !== 1 ? 'ns' : ''}</span>
                                </div>
                              </td>
                            </tr>
                            {/* Driver's trips */}
                            {occs.map((occ, idx) => (
                              <tr key={occ.id} className={`hover:bg-slate-50 transition-colors border-b border-gray-100 ${idx === occs.length - 1 ? 'border-b-2 border-slate-200' : ''}`}>
                                <td className="py-3 pl-10 font-bold text-slate-700 text-sm">{occ.atendimento}</td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded text-2xs font-black uppercase ${occ.sentido === 'Ida' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {occ.sentido}
                                  </span>
                                </td>
                                <td className="py-3 text-xs font-semibold text-slate-500">{occ.veiculo}</td>
                                <td className="py-3 font-mono text-xs text-slate-400">
                                  <div>{occ.prevInicio}</div>
                                  <div>{occ.prevFim}</div>
                                </td>
                                <td className="py-3 font-mono text-xs font-bold text-slate-700">
                                  <div>{occ.realInicio}</div>
                                  <div>{occ.realFim}</div>
                                </td>
                                <td className="py-3">
                                  {(() => {
                                    const st = getStatusInicio(occ);
                                    return (
                                      <span className={`px-2 py-1 rounded-full text-2xs font-bold ${st === 'Atraso' ? 'bg-red-100 text-red-600' : st === 'Adiantamento' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {st}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="py-3 text-right">
                                  {editingOccId === occ.id && isAdmin ? (
                                    <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                                      <input className="w-32 text-2xs p-1 border border-gray-200 rounded focus:ring-2 focus:ring-brand-400 focus:outline-none" aria-label="Justificativa do atraso" value={motivoTemp} onChange={e => setMotivoTemp(e.target.value)} placeholder="Justificativa..." autoFocus />
                                      <button onClick={() => saveMotivo(occ.id)} aria-label="Salvar justificativa" className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={14} /></button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-2">
                                      <p className="text-2xs text-slate-500 italic max-w-[120px] truncate">{occ.motivoAtraso || ''}</p>
                                      {isAdmin && (
                                        <button onClick={() => { setEditingOccId(occ.id); setMotivoTemp(occ.motivoAtraso || ''); }} aria-label="Editar justificativa" className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                          <Edit3 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-2xs font-bold text-slate-400 uppercase tracking-widest">Fim da listagem de Pontualidade</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Ocorrências por Filial / Linha */}
        <div className="bg-white p-6 rounded-card border border-gray-200 shadow-card">
          <div className="mb-6">
            {renderDashboardTitle(linhaFilter === 'Todas' ? 'Ocorrências por Filial' : 'Desvios da Linha', linhaFilter)}
          </div>
          {dadosGraficoFilial.length === 0 && <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>}
          {dadosGraficoFilial.length > 0 && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGraficoFilial} layout="vertical" margin={{ left: 60, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={120}
                    interval={0}
                    tick={<CustomYAxisTick />}
                  />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="Atraso" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                  <Bar dataKey="Adiantamento" stackId="a" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Gráfico de Linha do Tempo */}
        <div className="bg-white p-6 rounded-card border border-gray-200 shadow-card">
          <div className="mb-6">
            {renderDashboardTitle(linhaFilter === 'Todas' ? 'Volume de Ocorrências (Semana)' : 'Tendência Semanal', linhaFilter)}
          </div>
          {dadosLinhaDoTempo.every(d => d.Ocorrencias === 0) && <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>}
          {!dadosLinhaDoTempo.every(d => d.Ocorrencias === 0) && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosLinhaDoTempo}>
                  <defs>
                    <linearGradient id="colorOcorrencias" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="Ocorrencias" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorOcorrencias)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Ranking de Motoristas */}
      <div className="bg-white p-6 rounded-card border border-gray-200 shadow-card">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Top 10 Motoristas com mais Ocorrências</h3>
        {rankingMotoristas.length === 0 && <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>}
        {rankingMotoristas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-2xs uppercase tracking-wide">
                  <th className="px-3 py-2.5 pl-4">Posição</th>
                  <th className="px-3 py-2.5">Motorista</th>
                  <th className="px-3 py-2.5">Filial</th>
                  <th className="px-3 py-2.5 text-right pr-4">Ocorrências (Atraso/Adiantamento)</th>
                </tr>
              </thead>
              <tbody>
                {rankingMotoristas.map((motorista, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors border-b border-gray-100 last:border-0">
                    <td className="py-4 pl-4">
                      <span className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                        index === 0 ? "bg-red-100 text-red-600" :
                        index === 1 ? "bg-orange-100 text-orange-600" :
                        index === 2 ? "bg-yellow-100 text-yellow-600" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-4 font-medium text-slate-800">{motorista.nome}</td>
                    <td className="py-4 text-gray-500">
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        {motorista.filial}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-4 font-bold text-red-600">{motorista.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
