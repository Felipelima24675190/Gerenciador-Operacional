import { useMemo, useState, Dispatch, SetStateAction } from 'react';
import { ManutencaoVeiculo, HistoricoManutencao, Veiculo } from '../../types';
import { Search, Wrench, Clock, TrendingUp, Trash2, Bus, CheckCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { subDays, format, addDays } from 'date-fns';

interface ConsultMaintenanceScreenProps {
  manutencoes: ManutencaoVeiculo[];
  historicoManutencao: HistoricoManutencao[];
  setHistoricoManutencao: Dispatch<SetStateAction<HistoricoManutencao[]>>;
  veiculos: Veiculo[];
}

const COLORS = ['#0e4f8f', '#3d7fd2', '#1a6abf', '#6b9ede', '#0b3f72', '#9fbfea', '#082f55', '#c5daf3'];

export default function ConsultMaintenanceScreen({ manutencoes, historicoManutencao, setHistoricoManutencao, veiculos }: ConsultMaintenanceScreenProps) {
  const [search, setSearch] = useState('');
  const [tabView, setTabView] = useState<'atual' | 'historico'>('atual');

  const handleLimparHistorico = () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico de manutenção?')) {
      setHistoricoManutencao([]);
    }
  };

  const hoje = new Date();
  const veiculoMap = useMemo(() => new Map(veiculos.map(v => [v.prefixo, v])), [veiculos]);

  const getPlaca = (prefixo: string) => veiculoMap.get(prefixo)?.placa || '-';

  const filteredAtual = useMemo(() => {
    if (!search.trim()) return manutencoes;
    const q = search.toLowerCase();
    return manutencoes.filter(m =>
      m.prefixo.toLowerCase().includes(q) ||
      (getPlaca(m.prefixo)).toLowerCase().includes(q) ||
      m.descricaoServico.toLowerCase().includes(q) ||
      m.local.toLowerCase().includes(q)
    );
  }, [manutencoes, search, veiculoMap]);

  const filteredHistorico = useMemo(() => {
    if (!search.trim()) return historicoManutencao;
    const q = search.toLowerCase();
    return historicoManutencao.filter(h =>
      h.prefixo.toLowerCase().includes(q) ||
      (getPlaca(h.prefixo)).toLowerCase().includes(q) ||
      h.descricaoServico.toLowerCase().includes(q) ||
      h.local.toLowerCase().includes(q)
    );
  }, [historicoManutencao, search, veiculoMap]);

  // KPIs
  const kpis = useMemo(() => {
    const naOficina = manutencoes.length;
    const totalHistorico = historicoManutencao.length;
    const avgTempo = totalHistorico > 0
      ? Math.round(historicoManutencao.reduce((acc, h) => acc + h.tempoOficinaHoras, 0) / totalHistorico)
      : 0;
    const veiculosAtivos = veiculos.filter(v => v.status?.toUpperCase() !== 'INATIVO');
    const totalVeiculos = veiculosAtivos.length;
    const prefixosNaOficina = new Set(manutencoes.map(m => m.prefixo));
    const disponiveis = veiculosAtivos.filter(v => !prefixosNaOficina.has(v.prefixo)).length;
    return { naOficina, totalHistorico, avgTempo, totalVeiculos, disponiveis };
  }, [manutencoes, historicoManutencao, veiculos]);

  // Line chart: vehicle types over time
  const [chartDataInicio, setChartDataInicio] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [chartDataFim, setChartDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  const tiposDisponiveis = useMemo(() => {
    const tipos = new Set<string>();
    veiculos.forEach(v => { if (v.tipo) tipos.add(v.tipo); });
    return Array.from(tipos).sort();
  }, [veiculos]);

  const [tiposSelecionados, setTiposSelecionados] = useState<string[]>([]);

  const toggleTipo = (tipo: string) => {
    setTiposSelecionados(prev => prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]);
  };

  const lineChartData = useMemo(() => {
    if (tiposSelecionados.length === 0) return [];
    const start = new Date(chartDataInicio + 'T00:00:00');
    const end = new Date(chartDataFim + 'T23:59:59');
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays < 1 || diffDays > 30) return [];

    const prevStart = subDays(start, diffDays);

    // Build lookup: for each date, which prefixos were in manutencao
    const parseDtBR = (s: string) => {
      try { const [d, m, y] = s.split('/').map(Number); return new Date(y, m - 1, d); } catch { return null; }
    };

    // Active manutencoes: retidoDesde -> still active (no end date in ManutencaoVeiculo)
    // Historico: dataEntrada -> dataSaida
    const getMaintenancePrefixosOnDate = (dt: Date): Set<string> => {
      const pset = new Set<string>();
      manutencoes.forEach(m => {
        const entrada = parseDtBR(m.retidoDesde);
        if (entrada && entrada <= dt) pset.add(m.prefixo);
      });
      historicoManutencao.forEach(h => {
        const entrada = parseDtBR(h.dataEntrada);
        const saida = parseDtBR(h.dataSaida);
        if (entrada && saida && entrada <= dt && saida >= dt) pset.add(h.prefixo);
      });
      return pset;
    };

    const veiculosByTipo: Record<string, string[]> = {};
    tiposSelecionados.forEach(tipo => {
      veiculosByTipo[tipo] = veiculos.filter(v => v.tipo === tipo).map(v => v.prefixo);
    });

    const data: any[] = [];

    for (let i = 0; i < diffDays; i++) {
      const currentDate = addDays(start, i);
      const prevDate = addDays(prevStart, i);
      const maintenanceCurrent = getMaintenancePrefixosOnDate(currentDate);
      const maintenancePrev = getMaintenancePrefixosOnDate(prevDate);

      // Only include days that have at least one vehicle in maintenance
      if (maintenanceCurrent.size === 0 && maintenancePrev.size === 0) continue;

      const label = format(currentDate, 'dd/MM');
      const entry: any = { name: label };

      tiposSelecionados.forEach(tipo => {
        const prefixos = veiculosByTipo[tipo] || [];
        entry[tipo] = prefixos.filter(p => maintenanceCurrent.has(p)).length;
        entry[`${tipo} (Anterior)`] = prefixos.filter(p => maintenancePrev.has(p)).length;
      });

      data.push(entry);
    }
    return data;
  }, [tiposSelecionados, chartDataInicio, chartDataFim, manutencoes, historicoManutencao, veiculos]);

  // Top veiculos mais frequentes (historico + atuais)
  const topVeiculos = useMemo(() => {
    const counts: Record<string, number> = {};
    historicoManutencao.forEach(h => { counts[h.prefixo] = (counts[h.prefixo] || 0) + 1; });
    manutencoes.forEach(m => { counts[m.prefixo] = (counts[m.prefixo] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [historicoManutencao, manutencoes]);

  // Motivos distribution (using descricaoServico) - only current manutencoes
  const motivoChart = useMemo(() => {
    const counts: Record<string, number> = {};
    manutencoes.map(m => m.descricaoServico).forEach(desc => {
      counts[desc] = (counts[desc] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [manutencoes]);

  const parseDateBR = (str: string) => {
    try {
      const [d, m, y] = str.split('/').map(Number);
      return new Date(y, m - 1, d);
    } catch { return new Date(); }
  };

  const diasNaOficina = (retidoDesde: string) => {
    const entrada = parseDateBR(retidoDesde);
    return Math.max(0, Math.round((hoje.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const topTempoOficina = useMemo(() => {
    return manutencoes
      .map(m => ({
        name: m.prefixo,
        dias: diasNaOficina(m.retidoDesde),
      }))
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 10);
  }, [manutencoes]);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-card border border-gray-200 p-5 shadow-card flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Bus size={24} /></div>
          <div>
            <p className="text-2xs font-bold text-slate-500 uppercase">Veículos Totais</p>
            <p className="text-3xl font-black text-slate-800">{kpis.totalVeiculos}</p>
          </div>
        </div>
        <div className="bg-white rounded-card border border-gray-200 p-5 shadow-card flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-xl text-green-600"><CheckCircle size={24} /></div>
          <div>
            <p className="text-2xs font-bold text-slate-500 uppercase">Veículos Disponíveis</p>
            <p className="text-3xl font-black text-slate-800">{kpis.disponiveis}</p>
          </div>
        </div>
        <div className="bg-white rounded-card border border-gray-200 p-5 shadow-card flex items-center gap-4">
          <div className="p-3 bg-brand-50 rounded-xl text-brand-600"><Wrench size={24} /></div>
          <div>
            <p className="text-2xs font-bold text-slate-500 uppercase">Na Oficina Agora</p>
            <p className="text-3xl font-black text-slate-800">{kpis.naOficina}</p>
          </div>
        </div>
        <div className="bg-white rounded-card border border-gray-200 p-5 shadow-card flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><TrendingUp size={24} /></div>
          <div>
            <p className="text-2xs font-bold text-slate-500 uppercase">Total Historico</p>
            <p className="text-3xl font-black text-slate-800">{kpis.totalHistorico}</p>
          </div>
        </div>
        <div className="bg-white rounded-card border border-gray-200 p-5 shadow-card flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><Clock size={24} /></div>
          <div>
            <p className="text-2xs font-bold text-slate-500 uppercase">Tempo Médio na Oficina</p>
            <p className="text-3xl font-black text-slate-800">{Math.floor(kpis.avgTempo / 24)}d {kpis.avgTempo % 24}h</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
          <h4 className="text-2xs font-black text-slate-600 uppercase text-center mb-3">Veiculos Mais Frequentes na Oficina</h4>
          <div style={{ height: Math.max(200, topVeiculos.length * 28) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topVeiculos} layout="vertical" margin={{ left: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} interval={0} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0e4f8f" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
          <h4 className="text-2xs font-black text-slate-600 uppercase text-center mb-3">Distribuicao por Servico</h4>
          <div style={{ height: Math.max(200, motivoChart.length * 32) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={motivoChart} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, width: 200 }} width={200} interval={0} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fontSize: 9 }}>
                  {motivoChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Line chart: veículos na manutenção por tipo */}
      <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
        <h4 className="text-2xs font-black text-slate-600 uppercase text-center mb-3">Veículos na Manutenção por Tipo</h4>
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="text-2xs font-bold text-slate-400 uppercase block mb-1">Início</label>
            <input type="date" value={chartDataInicio} onChange={e => setChartDataInicio(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="text-2xs font-bold text-slate-400 uppercase block mb-1">Fim</label>
            <input type="date" value={chartDataFim} onChange={e => setChartDataFim(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-brand-400" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tiposDisponiveis.map(tipo => (
              <button key={tipo} onClick={() => toggleTipo(tipo)} className={`px-2.5 py-1 text-2xs font-bold rounded-full border transition-colors ${tiposSelecionados.includes(tipo) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                {tipo}
              </button>
            ))}
          </div>
        </div>
        {tiposSelecionados.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-10">Selecione um ou mais tipos de veículo acima</p>
        ) : lineChartData.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-10">Intervalo máximo: 30 dias</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9 }} axisLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {tiposSelecionados.map((tipo, i) => (
                  <Line key={tipo} type="monotone" dataKey={tipo} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
                {tiposSelecionados.map((tipo, i) => (
                  <Line key={`${tipo}-prev`} type="monotone" dataKey={`${tipo} (Anterior)`} stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} strokeDasharray="5 5" dot={false} opacity={0.5} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Veículos há mais tempo na oficina */}
      {topTempoOficina.length > 0 && (
        <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
          <h4 className="text-2xs font-black text-slate-600 uppercase text-center mb-3">Veículos há Mais Tempo na Oficina</h4>
          <div style={{ height: Math.max(200, topTempoOficina.length * 28) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTempoOficina} layout="vertical" margin={{ left: 5, right: 50 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} interval={0} axisLine={false} />
                <Tooltip formatter={(v: number) => [`${v} dias`, 'Na Oficina']} />
                <Bar dataKey="dias" fill="#0e4f8f" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fontSize: 9, formatter: (v: number) => `${v}d` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setTabView('atual')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${tabView === 'atual' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              Na Oficina ({manutencoes.length})
            </button>
            <button onClick={() => setTabView('historico')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${tabView === 'historico' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              Historico ({historicoManutencao.length})
            </button>
          </div>
          {tabView === 'historico' && historicoManutencao.length > 0 && (
            <button onClick={handleLimparHistorico} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 size={12} /> Limpar Histórico
            </button>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2 text-slate-400" size={14} />
            <input
              id="search-manutencao"
              type="text"
              placeholder="Buscar prefixo, placa, servico ou local..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Buscar veículo por prefixo, placa, serviço ou local"
              className="w-full pl-9 pr-4 px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[500px]">
          {tabView === 'atual' ? (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white text-2xs uppercase tracking-wide sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5">Veiculo</th>
                  <th className="px-3 py-2.5">Placa</th>
                  <th className="px-3 py-2.5">Retido Desde</th>
                  <th className="px-3 py-2.5">KM Atual</th>
                  <th className="px-3 py-2.5">Descricao Servico</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Local</th>
                  <th className="px-3 py-2.5">Prev. Lib.</th>
                  <th className="px-3 py-2.5">Dias</th>
                </tr>
              </thead>
              <tbody>
                {filteredAtual.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">Nenhum veiculo na oficina</td></tr>
                )}
                {filteredAtual.map(m => {
                  const dias = diasNaOficina(m.retidoDesde);
                  const atrasado = m.previsaoLiberacao ? parseDateBR(m.previsaoLiberacao) < hoje : false;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                      <td className="px-3 py-2 font-bold font-mono text-brand-700">
                        {m.prefixo}
                        {veiculoMap.get(m.prefixo)?.tipo && (
                          <span className="ml-1 text-2xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{veiculoMap.get(m.prefixo)!.tipo}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-2xs">{getPlaca(m.prefixo)}</td>
                      <td className="px-3 py-2 font-mono text-2xs">{m.retidoDesde}</td>
                      <td className="px-3 py-2 text-right">{m.kmAtual.toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={m.descricaoServico}>{m.descricaoServico}</td>
                      <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-2xs font-bold">{m.statusManutencao}</span></td>
                      <td className="px-3 py-2">{m.local}</td>
                      <td className={`px-3 py-2 font-mono text-2xs ${atrasado ? 'text-red-600 font-bold' : ''}`}>{m.previsaoLiberacao}{atrasado && ' ⚠'}</td>
                      <td className="px-3 py-2 font-bold">{dias}d</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white text-2xs uppercase tracking-wide sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5">Veiculo</th>
                  <th className="px-3 py-2.5">Placa</th>
                  <th className="px-3 py-2.5">Servico</th>
                  <th className="px-3 py-2.5">Entrada</th>
                  <th className="px-3 py-2.5">Saida</th>
                  <th className="px-3 py-2.5">Previsao</th>
                  <th className="px-3 py-2.5">Local</th>
                  <th className="px-3 py-2.5">Tempo (h)</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistorico.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Nenhum registro no historico</td></tr>
                )}
                {filteredHistorico.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                    <td className="px-3 py-2 font-bold text-slate-700">{h.prefixo}</td>
                    <td className="px-3 py-2 font-mono text-2xs">{getPlaca(h.prefixo)}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={h.descricaoServico}>{h.descricaoServico}</td>
                    <td className="px-3 py-2 font-mono text-2xs">{h.dataEntrada}</td>
                    <td className="px-3 py-2 font-mono text-2xs">{h.dataSaida}</td>
                    <td className="px-3 py-2 font-mono text-2xs">{h.previsaoLiberacao}</td>
                    <td className="px-3 py-2">{h.local}</td>
                    <td className="px-3 py-2 font-bold">{h.tempoOficinaHoras}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
