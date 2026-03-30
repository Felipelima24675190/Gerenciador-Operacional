import { useMemo, useState } from 'react';
import { Monitriip, Viagem } from '../../types';
import { buildLinhaLookup } from '../../utils/linhaLookup';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Calendar, Search } from 'lucide-react';

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
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
    <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">{title}</h4>
    {data.length > 0 ? (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 9 }}
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
      <p className="text-xs text-slate-400 text-center py-10">Sem dados no período</p>
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
  const getLinhaName = (r: Monitriip) => r.linhaAssociada || resolveLinha(r.servico) || r.servico;

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
        const linhaName = getLinhaName(r).toLowerCase();
        if (!linhaName.includes(linhaTerm)) return false;
      }
      return true;
    });
  }, [monitriips, dataInicio, dataFim, servicoBusca, linhaBusca]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const validas = filtered.filter(r => r.viagemValida).length;
    const atrasos = filtered.filter(r => r.atraso30min).length;
    const totalEmbarque = filtered.reduce((s, r) => s + r.embarque, 0);
    const totalNoShow = filtered.reduce((s, r) => s + r.noShow, 0);
    const pctValidas = total > 0 ? ((validas / total) * 100).toFixed(1) : '0.0';
    const pctAtrasos = total > 0 ? ((atrasos / total) * 100).toFixed(1) : '0.0';
    return { total, validas, atrasos, totalEmbarque, totalNoShow, pctValidas, pctAtrasos };
  }, [filtered]);

  // Chart 1: Top 15 viagens by total count (resolved by line name)
  const topServicosCount = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.forEach(r => { const nome = getLinhaName(r); acc[nome] = (acc[nome] || 0) + 1; });
    return Object.entries(acc)
      .map(([name, value]) => ({ name: name.length > 35 ? name.slice(0, 34) + '…' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [filtered, getLinhaName]);

  // Chart 2: Top 10 viagens with most atrasos
  const topServicosAtraso = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.filter(r => r.atraso30min).forEach(r => { const nome = getLinhaName(r); acc[nome] = (acc[nome] || 0) + 1; });
    return Object.entries(acc)
      .map(([name, value]) => ({ name: name.length > 35 ? name.slice(0, 34) + '…' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered, getLinhaName]);

  // Chart 3: Top 10 viagens with most invalid trips
  const topServicosInvalidas = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.filter(r => !r.viagemValida).forEach(r => { const nome = getLinhaName(r); acc[nome] = (acc[nome] || 0) + 1; });
    return Object.entries(acc)
      .map(([name, value]) => ({ name: name.length > 35 ? name.slice(0, 34) + '…' : name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered, getLinhaName]);

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
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800">Nenhum Dado Importado</h2>
        <p className="text-slate-500 max-w-md mt-2">
          Importe o arquivo do Monitriip para visualizar o painel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="bg-slate-800 p-4 flex gap-3 overflow-x-auto rounded-xl">
        {[
          { l: 'Total de Viagens', v: kpis.total },
          { l: 'Viagens Válidas', v: `${kpis.validas} (${kpis.pctValidas}%)` },
          { l: 'Viagens Inválidas', v: `${kpis.total - kpis.validas} (${((kpis.total - kpis.validas) / Math.max(1, kpis.total) * 100).toFixed(1)}%)` },
          { l: 'Total Embarques', v: kpis.totalEmbarque },
          { l: 'NoShow Total', v: kpis.totalNoShow },
        ].map((k, i) => (
          <div key={i} className="bg-slate-700 rounded-lg p-3 text-center min-w-[150px] flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{k.l}</p>
            <p className="text-lg font-black text-white mt-0.5">{k.v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Início</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input
                type="date"
                value={dataInicio}
                onChange={e => { setDataInicio(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Fim</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input
                type="date"
                value={dataFim}
                onChange={e => { setDataFim(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Serviço</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Buscar serviço..."
                value={servicoBusca}
                onChange={e => { setServicoBusca(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Linha</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Buscar linha..."
                value={linhaBusca}
                onChange={e => { setLinhaBusca(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
          <p className="text-sm text-slate-500 pb-2">
            {filtered.length} viagem{filtered.length !== 1 ? 's' : ''} no período
          </p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Viagens por Serviço (Top 15)" data={topServicosCount} valueLabel="Viagens" />
        <ChartCard title="Serviços com Mais Atrasos (Top 10)" data={topServicosAtraso} valueLabel="Atrasos" />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Serviços com Mais Viagens Inválidas (Top 10)"
          data={topServicosInvalidas}
          valueLabel="Inválidas"
        />
        {/* GPS problems summary card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">
            Problemas de GPS — Vel. Localização Fora do Intervalo (10–100)
          </h4>
          {gpsProblems.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">Nenhuma anomalia detectada no período</p>
          ) : (
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-800 text-white sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-bold uppercase text-left">Data</th>
                    <th className="px-3 py-2 font-bold uppercase text-left">Serviço</th>
                    <th className="px-3 py-2 font-bold uppercase text-right">Vel. Loc.</th>
                  </tr>
                </thead>
                <tbody>
                  {gpsProblems.slice(0, 50).map((r, i) => (
                    <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
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

      {/* Data table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter">
            Registros Detalhados
          </h4>
          <span className="text-xs text-slate-400">
            Pág. {page}/{totalPages} — {filtered.length} viagens
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                {[
                  'Data', 'Partida Prev.', 'Partida Real', 'Chegada',
                  'Serviço', 'Linha', 'Válida', 'Atraso', 'Embarque', 'NoShow', 'Vel. Loc.',
                ].map(h => (
                  <th key={h} className="px-3 py-2 font-bold uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((r, i) => {
                const velBad = isVelBad(r.velTempoLocalizacao);
                return (
                  <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">{r.data}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.partidaPrevista}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.partida}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.chegada}</td>
                    <td className="px-3 py-2 font-bold text-slate-800">{r.servico}</td>
                    <td className="px-3 py-2 text-slate-600 truncate max-w-[200px]" title={getLinhaName(r)}>{getLinhaName(r)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${r.viagemValida ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {r.viagemValida ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.atraso30min ? (
                        <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-700">Sim</span>
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
              className="px-3 py-1 text-xs font-bold border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-500">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
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
