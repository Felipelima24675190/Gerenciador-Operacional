import { useMemo, useState } from 'react';
import { OciosidadeMotorista, Motorista, Viagem } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Calendar } from 'lucide-react';

interface Props {
  ociosidades: OciosidadeMotorista[];
  motoristas: Motorista[];
  viagens: Viagem[];
}

const COLORS = ['#0f172a', '#1e40af', '#0369a1', '#0891b2', '#0d9488', '#059669', '#16a34a', '#ca8a04', '#dc2626', '#9333ea'];

function parseDataBR(s: string): Date | null {
  try {
    const [d, m, y] = s.split('/').map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
  } catch { return null; }
}

function fmtMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

const ChartCard = ({
  title,
  data,
  yAxisWidth = 120,
  valueFormatter,
  valueLabel = 'Ocorrências',
}: {
  title: string;
  data: { name: string; value: number }[];
  yAxisWidth?: number;
  valueFormatter?: (v: number) => string;
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
            <Tooltip
              formatter={(v: number) => [valueFormatter ? valueFormatter(v) : v, valueLabel]}
            />
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

export default function ViewOciosidadeMotoristaScreen({ ociosidades, motoristas, viagens: _viagens }: Props) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filialFiltro, setFilialFiltro] = useState('');
  const [page, setPage] = useState(1);

  // Build driver lookup map: matricula -> motorista
  const motoristasMap = useMemo(
    () => new Map(motoristas.map(m => [m.matricula.trim(), m])),
    [motoristas]
  );

  const driverName = (matricula: string) =>
    motoristasMap.get(matricula)?.nome || matricula;

  // Build filial list
  const filiais = useMemo(
    () => Array.from(new Set(motoristas.map(m => m.filial).filter(Boolean))).sort(),
    [motoristas]
  );

  // Filter
  const filtered = useMemo(() => {
    const start = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const end = dataFim ? new Date(dataFim + 'T23:59:59') : null;

    return ociosidades.filter(r => {
      if (start || end) {
        const d = parseDataBR(r.data);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
      }
      if (filialFiltro) {
        const m = motoristasMap.get(r.matricula);
        if (!m || m.filial !== filialFiltro) return false;
      }
      return true;
    });
  }, [ociosidades, dataInicio, dataFim, filialFiltro, motoristasMap]);

  // KPIs
  const kpis = useMemo(() => {
    const count = filtered.length;
    const uniqueDrivers = new Set(filtered.map(r => r.matricula)).size;
    const totalMinutes = filtered.reduce((s, r) => s + r.tempoMinutos, 0);
    const avgMin = count > 0 ? Math.round(totalMinutes / count) : 0;
    return { count, uniqueDrivers, totalMinutes, avgMin };
  }, [filtered]);

  // Chart 1: Top 10 drivers by total tempo ocioso
  const topDriversTempo = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.forEach(r => { acc[r.matricula] = (acc[r.matricula] || 0) + r.tempoMinutos; });
    return Object.entries(acc)
      .map(([mat, total]) => ({ name: driverName(mat), value: total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered, motoristasMap]);

  // Chart 2: Top 10 drivers by occurrence count
  const topDriversCount = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.forEach(r => { acc[r.matricula] = (acc[r.matricula] || 0) + 1; });
    return Object.entries(acc)
      .map(([mat, count]) => ({ name: driverName(mat), value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered, motoristasMap]);

  // Chart 3: Top 10 lines by occurrence count
  const topLinhasCount = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.forEach(r => { acc[r.nomeLinha] = (acc[r.nomeLinha] || 0) + 1; });
    return Object.entries(acc)
      .map(([name, value]) => ({ name: name.length > 35 ? name.slice(0, 34) + '…' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  // Chart 4: Top 10 lines with lowest avg tempo per occurrence (ascending)
  const topLinhasMenorMedia = useMemo(() => {
    const acc: Record<string, { total: number; count: number }> = {};
    filtered.forEach(r => {
      if (!acc[r.nomeLinha]) acc[r.nomeLinha] = { total: 0, count: 0 };
      acc[r.nomeLinha].total += r.tempoMinutos;
      acc[r.nomeLinha].count += 1;
    });
    return Object.entries(acc)
      .filter(([, v]) => v.count > 0)
      .map(([name, v]) => ({
        name: name.length > 35 ? name.slice(0, 34) + '…' : name,
        value: Math.round(v.total / v.count),
      }))
      .sort((a, b) => a.value - b.value)
      .slice(0, 10);
  }, [filtered]);

  // Paginated table
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (ociosidades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800">Nenhum Dado Importado</h2>
        <p className="text-slate-500 max-w-md mt-2">
          Importe o arquivo de Ociosidade de Motorista para visualizar o painel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="bg-slate-800 p-4 flex gap-3 overflow-x-auto rounded-xl">
        {[
          { l: 'Total de Ocorrências', v: kpis.count },
          { l: 'Motoristas Únicos', v: kpis.uniqueDrivers },
          { l: 'Tempo Total Ocioso', v: fmtMinutes(kpis.totalMinutes) },
          { l: 'Média por Ocorrência', v: `${kpis.avgMin} min` },
        ].map((k, i) => (
          <div key={i} className="bg-slate-700 rounded-lg p-3 text-center min-w-[150px] flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{k.l}</p>
            <p className="text-lg font-black text-white mt-0.5">{k.v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Filial</label>
            <select
              value={filialFiltro}
              onChange={e => { setFilialFiltro(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Todas</option>
              {filiais.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <p className="text-sm text-slate-500 pb-2">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''} no período
          </p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Top 10 — Motoristas com Mais Tempo Ocioso"
          data={topDriversTempo}
          valueFormatter={fmtMinutes}
          valueLabel="Tempo Ocioso"
        />
        <ChartCard
          title="Top 10 — Motoristas com Mais Ocorrências"
          data={topDriversCount}
          valueLabel="Ocorrências"
        />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Top 10 — Linhas com Mais Ocorrências de Ociosidade"
          data={topLinhasCount}
          yAxisWidth={160}
          valueLabel="Ocorrências"
        />
        <ChartCard
          title="Top 10 — Linhas com Menor Tempo Médio Ocioso por Ocorrência"
          data={topLinhasMenorMedia}
          yAxisWidth={160}
          valueFormatter={v => `${v} min`}
          valueLabel="Média (min)"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter">
            Registros Detalhados
          </h4>
          <span className="text-xs text-slate-400">
            Pág. {page}/{totalPages} — {filtered.length} registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                {['Data/Hora', 'Linha', 'Sentido', 'Prefixo', 'Motorista', 'Tempo', 'Evento', 'Endereço'].map(h => (
                  <th key={h} className="px-3 py-2 font-bold uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-700">{r.dataHora}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate text-slate-700" title={r.nomeLinha}>{r.nomeLinha}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.sentido}</td>
                  <td className="px-3 py-2 font-bold text-slate-800">{r.prefixo}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-700">{driverName(r.matricula)}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-bold text-amber-700">{r.tempoMinutos} min</td>
                  <td className="px-3 py-2 max-w-[200px] truncate text-slate-600" title={r.eventoOcorrido}>{r.eventoOcorrido}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate text-slate-500" title={r.endereco}>
                    {r.endereco.length > 40 ? r.endereco.slice(0, 40) + '…' : r.endereco}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
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
