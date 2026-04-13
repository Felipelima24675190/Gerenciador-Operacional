import { useMemo, useState } from 'react';
import { Monitriip, Viagem } from '../../types';
import { buildLinhaLookup } from '../../utils/linhaLookup';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Calendar, Search, TrendingDown, TrendingUp } from 'lucide-react';

interface Props {
  monitriips: Monitriip[];
  viagens: Viagem[];
}

const COLORS = ['#0f172a', '#1e40af', '#0369a1', '#0891b2', '#0d9488', '#059669', '#16a34a', '#ca8a04', '#dc2626', '#9333ea'];

function parseDataBR(s: string): Date | null {
  try {
    // Accepts DD/MM/YYYY
    const [d, m, y] = s.split('/').map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
  } catch { return null; }
}

function isVelBad(v: string): boolean {
  if (!v || v === 'N/A') return true;
  const n = parseFloat(v);
  if (isNaN(n)) return false;
  return n > 100 || n < 10;
}

const ChartCard = ({
  title,
  data,
  yAxisWidth = 100,
  valueLabel = 'Viagens',
}: {
  title: string;
  data: { name: string; value: number }[];
  yAxisWidth?: number;
  valueLabel?: string;
}) => (
  <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
    <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">{title}</h4>
    {data.length > 0 ? (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 11 }}
              width={yAxisWidth}
              interval={0}
              axisLine={false}
            />
            <Tooltip formatter={(v: number) => [v, valueLabel]} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_entry, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
    )}
  </div>
);

const PAGE_SIZE = 50;

export default function ViewMonitriipScreen({ monitriips, viagens }: Props) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [servicoBusca, setServicoBusca] = useState('');
  const [page, setPage] = useState(1);

  const [linhaBusca, setLinhaBusca] = useState('');

  const resolveLinha = useMemo(() => buildLinhaLookup(viagens), [viagens]);
  // Use linhaAssociada if available, otherwise fallback to servico-based lookup
  const getLinhaName = (r: Monitriip) => {
    if (r.linhaAssociada) return r.linhaAssociada;
    const resolved = resolveLinha(r.servico);
    if (resolved) return resolved;
    const numMatch = r.servico.match(/^\d+/);
    if (numMatch) {
      const byNum = resolveLinha(numMatch[0]);
      if (byNum) return byNum;
    }
    return r.servico;
  };

  // Filter
  const filtered = useMemo(() => {
    const start = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const end = dataFim ? new Date(dataFim + 'T23:59:59') : null;
    const svcTerm = servicoBusca.trim().toLowerCase();
    const linhaTerm = linhaBusca.trim().toLowerCase();

    return monitriips.filter(r => {
      if (start || end) {
        const d = parseDataBR(r.data);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
      }
      if (svcTerm && !r.servico.toLowerCase().includes(svcTerm)) return false;
      if (linhaTerm) {
        const linhaName = getLinhaName(r);
        if (linhaName !== linhaBusca) return false;
      }
      return true;
    });
  }, [monitriips, dataInicio, dataFim, servicoBusca, linhaBusca]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const validas = filtered.filter(r => r.viagemValida).length;
    const atrasos = filtered.filter(r => r.atraso30min).length;
    const validTrips = filtered.filter(r => r.viagemValida);
    const totalEmbarque = validTrips.reduce((s, r) => s + r.embarque, 0);
    const totalNoShow = validTrips.reduce((s, r) => s + r.noShow, 0);
    const totalVendaPassagem = validTrips.reduce((s, r) => s + r.vendaPassagem, 0);
    const pctValidas = total > 0 ? ((validas / total) * 100).toFixed(2) : '0.00';
    const pctAtrasos = total > 0 ? ((atrasos / total) * 100).toFixed(1) : '0.0';
    const pctNoShow = totalVendaPassagem > 0 ? ((totalNoShow / totalVendaPassagem) * 100).toFixed(1) : '0.0';
    const pctEmbarque = totalVendaPassagem > 0 ? ((totalEmbarque / totalVendaPassagem) * 100).toFixed(1) : '0.0';

    return { total, validas, atrasos, totalEmbarque, totalNoShow, totalVendaPassagem, pctValidas, pctAtrasos, pctNoShow, pctEmbarque };
  }, [filtered]);

  // Chart 1: Top 5 viagens by total count (resolved by line name)
  const topServicosCount = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.forEach(r => { const nome = getLinhaName(r); acc[nome] = (acc[nome] || 0) + 1; });
    return Object.entries(acc)
      .map(([name, value]) => ({ name: name.length > 35 ? name.slice(0, 34) + '…' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filtered, getLinhaName]);

  // Chart 2: Top 5 linhas with most No Show
  const topLinhasNoShow = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.filter(r => r.viagemValida).forEach(r => { if (r.noShow > 0) { const nome = getLinhaName(r); acc[nome] = (acc[nome] || 0) + r.noShow; } });
    return Object.entries(acc)
      .map(([name, value]) => ({ name: name.length > 35 ? name.slice(0, 34) + '…' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filtered, getLinhaName]);

  // Chart 3: Top 5 viagens with most invalid trips
  const topServicosInvalidas = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.filter(r => !r.viagemValida).forEach(r => { const nome = getLinhaName(r); acc[nome] = (acc[nome] || 0) + 1; });
    return Object.entries(acc)
      .map(([name, value]) => ({ name: name.length > 35 ? name.slice(0, 34) + '…' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filtered, getLinhaName]);

  // Min/max valid trip percentage by line
  const { minLine, maxLine } = useMemo(() => {
    const acc: Record<string, { total: number; validas: number }> = {};
    filtered.forEach(r => {
      const nome = getLinhaName(r);
      if (!acc[nome]) acc[nome] = { total: 0, validas: 0 };
      acc[nome].total++;
      if (r.viagemValida) acc[nome].validas++;
    });
    const entries = Object.entries(acc).filter(([, v]) => v.total >= 5); // min 5 trips to be meaningful
    if (entries.length === 0) return { minLine: null, maxLine: null };
    const withPct = entries.map(([name, v]) => ({ name, pct: (v.validas / v.total) * 100 }));
    withPct.sort((a, b) => a.pct - b.pct);
    return { minLine: withPct[0], maxLine: withPct[withPct.length - 1] };
  }, [filtered, getLinhaName]);

  // Available lines in filtered period (for dropdown filter)
  const availableLines = useMemo(() => {
    const start = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const end = dataFim ? new Date(dataFim + 'T23:59:59') : null;
    const svcTerm = servicoBusca.trim().toLowerCase();

    const lineSet = new Set<string>();
    for (const r of monitriips) {
      if (start || end) {
        const d = parseDataBR(r.data);
        if (!d) continue;
        if (start && d < start) continue;
        if (end && d > end) continue;
      }
      if (svcTerm && !r.servico.toLowerCase().includes(svcTerm)) continue;
      lineSet.add(getLinhaName(r));
    }
    return [...lineSet].sort();
  }, [monitriips, dataInicio, dataFim, servicoBusca, getLinhaName]);

  // 12-month average valid trips chart
  const monthlyAvgChart = useMemo(() => {
    const monthMap: Record<string, { total: number; validas: number }> = {};
    for (const r of monitriips) {
      const d = parseDataBR(r.data);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { total: 0, validas: 0 };
      monthMap[key].total++;
      if (r.viagemValida) monthMap[key].validas++;
    }
    const months = Object.keys(monthMap).sort().slice(-12);
    const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return months.map(k => {
      const m = monthMap[k];
      const [, mm] = k.split('-');
      return {
        name: MONTH_NAMES[parseInt(mm, 10) - 1],
        value: m.total > 0 ? parseFloat(((m.validas / m.total) * 100).toFixed(1)) : 0,
      };
    });
  }, [monitriips]);

  // GPS quality rows: velTempoLocalizacao not N/A and (>100 or <10)
  const gpsProblems = useMemo(() => {
    return filtered.filter(r => {
      if (!r.velTempoLocalizacao || r.velTempoLocalizacao === 'N/A') return false;
      const n = parseFloat(r.velTempoLocalizacao);
      if (isNaN(n)) return false;
      return n > 100 || n < 10;
    });
  }, [filtered]);

  // Paginated table
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (monitriips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-card border border-gray-100 shadow-card">
        <h2 className="text-2xl font-black text-slate-800">Nenhum Dado Importado</h2>
        <p className="text-slate-500 max-w-md mt-2">
          Importe o arquivo do Monitriip para visualizar o painel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="bg-slate-800 p-4 flex gap-3 overflow-x-auto rounded-card">
        {[
          { l: 'Número de Viagens', v: kpis.total.toLocaleString('pt-BR') },
          { l: 'Viagens Válidas', v: kpis.validas.toLocaleString('pt-BR') },
          { l: 'Viagens Inválidas', v: (kpis.total - kpis.validas).toLocaleString('pt-BR') },
          { l: '% de Viagens Válidas', v: `${kpis.pctValidas}%` },
          { l: 'No Show', v: kpis.totalNoShow.toLocaleString('pt-BR'), pct: `${kpis.pctNoShow}%` },
          { l: 'Embarques', v: kpis.totalEmbarque.toLocaleString('pt-BR'), pct: `${kpis.pctEmbarque}%` },
        ].map((k: any, i: number) => (
          <div key={i} className="bg-slate-700 rounded-lg p-3 text-center min-w-[150px] flex-1">
            <p className="text-2xs font-bold text-slate-400 uppercase">{k.l}</p>
            <p className="text-lg font-black text-white mt-0.5">{k.v}</p>
            {k.pct && <p className="text-xs font-bold text-brand-300">{k.pct}</p>}
          </div>
        ))}
      </div>

      {/* Min/Max valid trip lines */}
      {(minLine || maxLine) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {minLine && (
            <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} className="text-red-500" />
                <p className="text-2xs font-bold text-slate-400 uppercase">Linha com Menor Percentual de Viagens Válidas</p>
              </div>
              <p className="text-lg font-black text-slate-800">{minLine.name}</p>
              <p className="text-sm font-bold text-red-600 mt-0.5">{minLine.pct.toFixed(2)}%</p>
            </div>
          )}
          {maxLine && (
            <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-emerald-500" />
                <p className="text-2xs font-bold text-slate-400 uppercase">Linha com Maior Percentual de Viagens Válidas</p>
              </div>
              <p className="text-lg font-black text-slate-800">{maxLine.name}</p>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">{maxLine.pct.toFixed(2)}%</p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label htmlFor="mt-data-inicio" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Início</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input
                id="mt-data-inicio"
                type="date"
                value={dataInicio}
                onChange={e => { setDataInicio(e.target.value); setPage(1); }}
                aria-label="Data de início do filtro"
                className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="mt-data-fim" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Fim</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input
                id="mt-data-fim"
                type="date"
                value={dataFim}
                onChange={e => { setDataFim(e.target.value); setPage(1); }}
                aria-label="Data de fim do filtro"
                className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="mt-servico" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Serviço</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input
                id="mt-servico"
                type="text"
                placeholder="Buscar serviço..."
                value={servicoBusca}
                onChange={e => { setServicoBusca(e.target.value); setPage(1); }}
                aria-label="Buscar por serviço"
                className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="mt-linha" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Linha</label>
            <select
              id="mt-linha"
              value={linhaBusca}
              onChange={e => { setLinhaBusca(e.target.value); setPage(1); }}
              aria-label="Filtrar por linha"
              className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
            >
              <option value="">Todas as linhas</option>
              {availableLines.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-slate-500 pb-2">
            {filtered.length} viagem{filtered.length !== 1 ? 's' : ''} no período
          </p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Viagens por Serviço (Top 5)" data={topServicosCount} valueLabel="Viagens" />
        <ChartCard title="Linhas com Mais No Show (Top 5)" data={topLinhasNoShow} valueLabel="No Show" />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Serviços com Mais Viagens Inválidas (Top 5)"
          data={topServicosInvalidas}
          valueLabel="Inválidas"
        />
        {/* GPS problems summary card */}
        <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">
            Problemas de GPS — Vel. Localização Fora do Intervalo (10–100)
          </h4>
          {gpsProblems.length === 0 ? (
            <p className="text-2xs text-slate-400 text-center py-10">Nenhuma anomalia detectada no período</p>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-800 text-white sticky top-0">
                  <tr className="text-2xs uppercase tracking-wide">
                    <th className="px-3 py-2.5 font-bold text-left">Data</th>
                    <th className="px-3 py-2.5 font-bold text-left">Serviço</th>
                    <th className="px-3 py-2.5 font-bold text-right">Vel. Loc.</th>
                  </tr>
                </thead>
                <tbody>
                  {gpsProblems.slice(0, 50).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                      <td className="px-3 py-1.5 font-mono text-slate-700">{r.data}</td>
                      <td className="px-3 py-1.5 text-slate-700">{r.servico}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-red-600">{r.velTempoLocalizacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {gpsProblems.length > 50 && (
                <p className="text-xs text-slate-400 text-center py-2">
                  Mostrando 50 de {gpsProblems.length} ocorrências
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 12-month average valid trips chart */}
      {monthlyAvgChart.length > 0 && (
        <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">Viagens Válidas dos Últimos Meses (%)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAvgChart} margin={{ left: 0, right: 16 }}>
                <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v}%`, '% Válidas']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#e91e8c" label={{ position: 'top', fontSize: 10, fill: '#64748b', formatter: (v: number) => `${v}%` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data table */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter">
            Registros Detalhados
          </h4>
          <span className="text-xs text-slate-400">
            Pág. {page}/{totalPages} — {filtered.length} viagens
          </span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white sticky top-0">
              <tr className="text-2xs uppercase tracking-wide">
                {[
                  'Data', 'Partida Prev.', 'Partida Real', 'Chegada',
                  'Serviço', 'Linha', 'Válida', 'Atraso', 'Embarque', 'NoShow', 'Vel. Loc.',
                ].map(h => (
                  <th key={h} className="px-3 py-2.5 font-bold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => {
                const velBad = isVelBad(r.velTempoLocalizacao);
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                    <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">{r.data}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.partidaPrevista}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.partida}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.chegada}</td>
                    <td className="px-3 py-2 font-bold text-slate-800">{r.servico}</td>
                    <td className="px-3 py-2 text-slate-600 truncate max-w-[200px]" title={getLinhaName(r)}>{getLinhaName(r)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-2xs ${r.viagemValida ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {r.viagemValida ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.atraso30min ? (
                        <span className="px-1.5 py-0.5 rounded font-bold text-2xs bg-amber-100 text-amber-700">Sim</span>
                      ) : (
                        <span className="text-slate-400">Não</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700 text-right">{r.embarque}</td>
                    <td className="px-3 py-2 text-slate-700 text-right">{r.noShow}</td>
                    <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${velBad ? 'text-red-600 bg-red-50' : 'text-slate-700'}`}>
                      {r.velTempoLocalizacao}
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-400">
                    Nenhum registro no período selecionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
              className="px-3 py-1 text-xs font-bold border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-500">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Próxima página"
              className="px-3 py-1 text-xs font-bold border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
