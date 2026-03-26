import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Calendar } from 'lucide-react';
import { Ocorrencia, ExcessoVelocidade, MultaANTT, MultaTransito, Avaria, ParadaIndevida, Monitriip } from '../../types';

interface DashboardOperacionalProps {
  ocorrencias: Ocorrencia[];
  excessos: ExcessoVelocidade[];
  multasAntt: MultaANTT[];
  multasTransito: MultaTransito[];
  avarias: Avaria[];
  paradas: ParadaIndevida[];
  monitriips: Monitriip[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function parseDateBR(s: string): Date | null {
  if (!s) return null;
  const match = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  return new Date(+match[3], +match[2] - 1, +match[1]);
}

function parseDateISO(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function dateInRange(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function fmtDateBR(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const COLORS = ['#0f172a', '#3b82f6'];

function KpiCard({ label, current, prev, unit = '' }: { label: string; current: number; prev: number; unit?: string }) {
  const diff = current - prev;
  const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : current > 0 ? '100.0' : '0.0';
  const isUp = diff > 0;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{label}</p>
      <p className="text-2xl font-black text-slate-800 mt-1">{current.toLocaleString('pt-BR')}{unit && <span className="text-sm font-bold text-slate-400 ml-1">{unit}</span>}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-slate-400">Período anterior: {prev.toLocaleString('pt-BR')}</span>
        {diff !== 0 && (
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isUp ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(+pct)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardOperacionalScreen({
  ocorrencias, excessos, multasAntt, multasTransito, avarias, paradas, monitriips,
}: DashboardOperacionalProps) {
  // Default: last 7 days
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 7);

  const [dataInicio, setDataInicio] = useState(defaultStart.toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(defaultEnd.toISOString().split('T')[0]);

  // Current period and previous period (same duration)
  const periods = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1); // 1ms before current start
    prevEnd.setHours(23, 59, 59, 999);
    const prevStart = new Date(prevEnd.getTime() - durationMs);
    prevStart.setHours(0, 0, 0, 0);
    return {
      current: { start, end, label: `${fmtDateBR(start)} a ${fmtDateBR(end)}` },
      previous: { start: prevStart, end: prevEnd, label: `${fmtDateBR(prevStart)} a ${fmtDateBR(prevEnd)}` },
    };
  }, [dataInicio, dataFim]);

  // ─── Compute stats per period ────────────────────────────────────────────────
  const computeStats = (start: Date, end: Date) => {
    const ocWeek = ocorrencias.filter(o => {
      const d = parseDateBR(o.prevInicio);
      return d && dateInRange(d, start, end);
    });
    const totalViagens = ocWeek.length;
    const atrasosInicio = ocWeek.filter(o => o.statusInicio === 'Atraso').length;
    const atrasosPerc = totalViagens > 0 ? +((atrasosInicio / totalViagens) * 100).toFixed(1) : 0;

    const exWeek = excessos.filter(e => {
      const d = parseDateBR(e.dataOcorrencia);
      return d && dateInRange(d, start, end);
    });

    const anttWeek = multasAntt.filter(m => {
      const d = parseDateBR(m.dataHora) || parseDateISO(m.dataHora);
      return d && dateInRange(d, start, end);
    });
    const anttValor = anttWeek.reduce((s, m) => s + m.valor, 0);

    const transitWeek = multasTransito.filter(m => {
      const d = parseDateBR(m.dataInfracao);
      return d && dateInRange(d, start, end);
    });
    const transitValor = transitWeek.reduce((s, m) => s + m.valorCobrado, 0);

    const avarWeek = avarias.filter(a => {
      const d = parseDateBR(a.data);
      return d && dateInRange(d, start, end);
    });
    const avarValor = avarWeek.reduce((s, a) => s + a.valorAvaria, 0);

    const parWeek = paradas.filter(p => {
      const d = parseDateBR(p.data);
      return d && dateInRange(d, start, end);
    });

    const monWeek = monitriips.filter(m => {
      const d = parseDateBR(m.data);
      return d && dateInRange(d, start, end);
    });
    const monInvalidas = monWeek.filter(m => !m.viagemValida).length;

    return {
      totalViagens, atrasosInicio, atrasosPerc,
      excessos: exWeek.length,
      multasAntt: anttWeek.length, anttValor,
      multasTransito: transitWeek.length, transitValor,
      avarias: avarWeek.length, avarValor,
      paradas: parWeek.length,
      monitriip: monWeek.length, monInvalidas,
    };
  };

  const periodStats = useMemo(() => ({
    current: computeStats(periods.current.start, periods.current.end),
    previous: computeStats(periods.previous.start, periods.previous.end),
  }), [periods, ocorrencias, excessos, multasAntt, multasTransito, avarias, paradas, monitriips]);

  const cur = periodStats.current;
  const prev = periodStats.previous;

  // ─── Comparison chart data ─────────────────────────────────────────────────
  const chartData = useMemo(() => [
    { name: 'Atrasos', current: cur.atrasosInicio, previous: prev.atrasosInicio },
    { name: 'Excessos Vel.', current: cur.excessos, previous: prev.excessos },
    { name: 'Multas ANTT', current: cur.multasAntt, previous: prev.multasAntt },
    { name: 'Multas Trânsito', current: cur.multasTransito, previous: prev.multasTransito },
    { name: 'Avarias', current: cur.avarias, previous: prev.avarias },
    { name: 'Paradas Ind.', current: cur.paradas, previous: prev.paradas },
    { name: 'Monitriip Inv.', current: cur.monInvalidas, previous: prev.monInvalidas },
  ], [cur, prev]);

  const valorChartData = useMemo(() => [
    { name: 'ANTT (R$)', current: cur.anttValor, previous: prev.anttValor },
    { name: 'Trânsito (R$)', current: cur.transitValor, previous: prev.transitValor },
    { name: 'Avarias (R$)', current: cur.avarValor, previous: prev.avarValor },
  ], [cur, prev]);

  return (
    <div className="space-y-6">
      {/* Header with date filters */}
      <div className="bg-slate-900 rounded-xl p-5 text-white">
        <h2 className="text-lg font-black">Dashboard Operacional</h2>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <Calendar size={16} className="text-slate-400" />
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="px-2 py-1.5 text-xs font-bold bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="px-2 py-1.5 text-xs font-bold bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>
          <span className="text-[10px] text-slate-500 ml-auto">
            Comparando com período anterior: <span className="text-slate-400 font-bold">{periods.previous.label}</span>
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Atrasos na Partida" current={cur.atrasosInicio} prev={prev.atrasosInicio} />
        <KpiCard label="% Atraso" current={cur.atrasosPerc} prev={prev.atrasosPerc} unit="%" />
        <KpiCard label="Excessos de Velocidade" current={cur.excessos} prev={prev.excessos} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Multas ANTT" current={cur.multasAntt} prev={prev.multasAntt} />
        <KpiCard label="Multas Trânsito" current={cur.multasTransito} prev={prev.multasTransito} />
        <KpiCard label="Avarias" current={cur.avarias} prev={prev.avarias} />
        <KpiCard label="Paradas Indevidas" current={cur.paradas} prev={prev.paradas} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Monitriip Inválidas" current={cur.monInvalidas} prev={prev.monInvalidas} />
        <KpiCard label="Valor ANTT" current={Math.round(cur.anttValor)} prev={Math.round(prev.anttValor)} unit="R$" />
        <KpiCard label="Valor Trânsito" current={Math.round(cur.transitValor)} prev={Math.round(prev.transitValor)} unit="R$" />
        <KpiCard label="Valor Avarias" current={Math.round(cur.avarValor)} prev={Math.round(prev.avarValor)} unit="R$" />
      </div>

      {/* Comparison Chart — Ocorrências */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-4">Comparativo de Ocorrências — Período Atual vs Anterior</h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} interval={0} />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" name={periods.current.label} fill={COLORS[0]} radius={[0, 3, 3, 0]} />
              <Bar dataKey="previous" name={periods.previous.label} fill={COLORS[1]} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison Chart — Valores */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-4">Comparativo de Valores (R$) — Período Atual vs Anterior</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={valorChartData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} interval={0} />
              <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']} />
              <Legend />
              <Bar dataKey="current" name={periods.current.label} fill={COLORS[0]} radius={[0, 3, 3, 0]} />
              <Bar dataKey="previous" name={periods.previous.label} fill={COLORS[1]} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Period detail table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-x-auto">
        <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-4">Detalhamento por Período</h4>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white text-[10px] uppercase">
            <tr>
              <th className="px-4 py-2">Período</th>
              <th className="px-4 py-2 text-right">Viagens</th>
              <th className="px-4 py-2 text-right">Atrasos</th>
              <th className="px-4 py-2 text-right">%</th>
              <th className="px-4 py-2 text-right">Excessos</th>
              <th className="px-4 py-2 text-right">ANTT</th>
              <th className="px-4 py-2 text-right">Trânsito</th>
              <th className="px-4 py-2 text-right">Avarias</th>
              <th className="px-4 py-2 text-right">Paradas</th>
              <th className="px-4 py-2 text-right">Monitriip Inv.</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: periods.current.label, s: cur, highlight: true },
              { label: periods.previous.label, s: prev, highlight: false },
            ].map((row, i) => (
              <tr key={i} className={`border-b border-gray-100 ${row.highlight ? 'bg-blue-50 font-bold' : ''}`}>
                <td className="px-4 py-2 font-mono text-xs">{row.label}</td>
                <td className="px-4 py-2 text-right">{row.s.totalViagens}</td>
                <td className="px-4 py-2 text-right">{row.s.atrasosInicio}</td>
                <td className="px-4 py-2 text-right">{row.s.atrasosPerc}%</td>
                <td className="px-4 py-2 text-right">{row.s.excessos}</td>
                <td className="px-4 py-2 text-right">{row.s.multasAntt}</td>
                <td className="px-4 py-2 text-right">{row.s.multasTransito}</td>
                <td className="px-4 py-2 text-right">{row.s.avarias}</td>
                <td className="px-4 py-2 text-right">{row.s.paradas}</td>
                <td className="px-4 py-2 text-right">{row.s.monInvalidas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
