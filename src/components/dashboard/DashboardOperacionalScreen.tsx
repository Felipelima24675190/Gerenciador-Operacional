import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Calendar, TrendingDown, AlertTriangle, Gauge, FileWarning, StopCircle, RadioTower, Car } from 'lucide-react';
import { Ocorrencia, ExcessoVelocidade, MultaANTT, MultaTransito, Avaria, ParadaIndevida, Monitriip } from '../../types';
import MetricCard from '../shared/MetricCard';


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

const CHART_COLORS = { current: '#082f55', previous: '#3d7fd2' }; // brand-800, brand-400

export default function DashboardOperacionalScreen({
  ocorrencias, excessos, multasAntt, multasTransito, avarias, paradas, monitriips,
}: DashboardOperacionalProps) {
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 7);

  const [dataInicio, setDataInicio] = useState(defaultStart.toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(defaultEnd.toISOString().split('T')[0]);

  const periods = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    const prevStart = new Date(prevEnd.getTime() - durationMs);
    prevStart.setHours(0, 0, 0, 0);
    return {
      current: { start, end, label: `${fmtDateBR(start)} a ${fmtDateBR(end)}` },
      previous: { start: prevStart, end: prevEnd, label: `${fmtDateBR(prevStart)} a ${fmtDateBR(prevEnd)}` },
    };
  }, [dataInicio, dataFim]);

  const computeStats = (start: Date, end: Date) => {
    const ocWeek = ocorrencias.filter(o => { const d = parseDateBR(o.prevInicio); return d && dateInRange(d, start, end); });
    const totalViagens = ocWeek.length;
    const atrasosInicio = ocWeek.filter(o => o.statusInicio === 'Atraso').length;
    const atrasosPerc = totalViagens > 0 ? +((atrasosInicio / totalViagens) * 100).toFixed(1) : 0;
    const exWeek = excessos.filter(e => { const d = parseDateBR(e.dataOcorrencia); return d && dateInRange(d, start, end); });
    const anttWeek = multasAntt.filter(m => { const d = parseDateBR(m.dataHora) || parseDateISO(m.dataHora); return d && dateInRange(d, start, end); });
    const anttValor = anttWeek.reduce((s, m) => s + m.valor, 0);
    const transitWeek = multasTransito.filter(m => { const d = parseDateBR(m.dataInfracao); return d && dateInRange(d, start, end); });
    const transitValor = transitWeek.reduce((s, m) => s + m.valorCobrado, 0);
    const avarWeek = avarias.filter(a => { const d = parseDateBR(a.data); return d && dateInRange(d, start, end); });
    const avarValor = avarWeek.reduce((s, a) => s + a.valorAvaria, 0);
    const parWeek = paradas.filter(p => { const d = parseDateBR(p.data); return d && dateInRange(d, start, end); });
    const monWeek = monitriips.filter(m => { const d = parseDateBR(m.data); return d && dateInRange(d, start, end); });
    const monInvalidas = monWeek.filter(m => !m.viagemValida).length;
    return { totalViagens, atrasosInicio, atrasosPerc, excessos: exWeek.length, multasAntt: anttWeek.length, anttValor, multasTransito: transitWeek.length, transitValor, avarias: avarWeek.length, avarValor, paradas: parWeek.length, monitriip: monWeek.length, monInvalidas };
  };

  const periodStats = useMemo(() => ({
    current: computeStats(periods.current.start, periods.current.end),
    previous: computeStats(periods.previous.start, periods.previous.end),
  }), [periods, ocorrencias, excessos, multasAntt, multasTransito, avarias, paradas, monitriips]);

  const cur = periodStats.current;
  const prev = periodStats.previous;

  function trendPct(c: number, p: number): number {
    if (p === 0) return c > 0 ? 100 : 0;
    return +((c - p) / p * 100).toFixed(1);
  }

  const individualCharts = useMemo(() => [
    { title: 'Atrasos', data: [{ name: 'Atrasos', current: cur.atrasosInicio, previous: prev.atrasosInicio }] },
    { title: 'Excessos Vel.', data: [{ name: 'Excessos', current: cur.excessos, previous: prev.excessos }] },
    { title: 'Multas ANTT', data: [{ name: 'ANTT', current: cur.multasAntt, previous: prev.multasAntt }] },
    { title: 'Multas Trânsito', data: [{ name: 'Trânsito', current: cur.multasTransito, previous: prev.multasTransito }] },
    { title: 'Avarias', data: [{ name: 'Avarias', current: cur.avarias, previous: prev.avarias }] },
    { title: 'Paradas Ind.', data: [{ name: 'Paradas', current: cur.paradas, previous: prev.paradas }] },
    { title: 'Monitriip Inv.', data: [{ name: 'Monitriip', current: cur.monInvalidas, previous: prev.monInvalidas }] },
  ], [cur, prev]);

  const individualValorCharts = useMemo(() => [
    { title: 'Valor ANTT', data: [{ name: 'ANTT', current: cur.anttValor, previous: prev.anttValor }] },
    { title: 'Valor Trânsito', data: [{ name: 'Trânsito', current: cur.transitValor, previous: prev.transitValor }] },
    { title: 'Valor Avarias', data: [{ name: 'Avarias', current: cur.avarValor, previous: prev.avarValor }] },
  ], [cur, prev]);

  const trendLabel = 'vs período anterior';

  return (
    <div className="space-y-5">
      {/* Header with date filters */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label htmlFor="dash-op-inicio" className="text-2xs font-bold text-slate-500 uppercase">Início</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="dash-op-inicio"
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="dash-op-fim" className="text-2xs font-bold text-slate-500 uppercase">Fim</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="dash-op-fim"
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>
          <span className="text-2xs text-slate-400 ml-auto">
            Comparando: <span className="font-bold text-slate-500">{periods.previous.label}</span>
          </span>
        </div>
      </div>

      {/* KPI Grid — unified 4-column layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Atrasos na Partida" value={cur.atrasosInicio} icon={TrendingDown} variant="danger"
          trend={{ value: trendPct(cur.atrasosInicio, prev.atrasosInicio), label: trendLabel, invertColor: true }} />
        <MetricCard label="% Atraso" value={`${cur.atrasosPerc}%`} icon={TrendingDown} variant="warning"
          trend={{ value: trendPct(cur.atrasosPerc, prev.atrasosPerc), label: trendLabel, invertColor: true }} />
        <MetricCard label="Excessos de Velocidade" value={cur.excessos} icon={Gauge} variant="danger"
          trend={{ value: trendPct(cur.excessos, prev.excessos), label: trendLabel, invertColor: true }} />
        <MetricCard label="Paradas Indevidas" value={cur.paradas} icon={StopCircle}
          trend={{ value: trendPct(cur.paradas, prev.paradas), label: trendLabel, invertColor: true }} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Multas ANTT" value={cur.multasAntt} icon={FileWarning} variant="warning"
          trend={{ value: trendPct(cur.multasAntt, prev.multasAntt), label: trendLabel, invertColor: true }} />
        <MetricCard label="Multas Trânsito" value={cur.multasTransito} icon={AlertTriangle} variant="warning"
          trend={{ value: trendPct(cur.multasTransito, prev.multasTransito), label: trendLabel, invertColor: true }} />
        <MetricCard label="Avarias" value={cur.avarias} icon={Car}
          trend={{ value: trendPct(cur.avarias, prev.avarias), label: trendLabel, invertColor: true }} />
        <MetricCard label="Monitriip Inválidas" value={cur.monInvalidas} icon={RadioTower}
          trend={{ value: trendPct(cur.monInvalidas, prev.monInvalidas), label: trendLabel, invertColor: true }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricCard label="Valor ANTT" value={Math.round(cur.anttValor)} unit="R$" icon={FileWarning} variant="info"
          trend={{ value: trendPct(cur.anttValor, prev.anttValor), label: trendLabel, invertColor: true }} />
        <MetricCard label="Valor Trânsito" value={Math.round(cur.transitValor)} unit="R$" icon={AlertTriangle} variant="info"
          trend={{ value: trendPct(cur.transitValor, prev.transitValor), label: trendLabel, invertColor: true }} />
        <MetricCard label="Valor Avarias" value={Math.round(cur.avarValor)} unit="R$" icon={Car} variant="info"
          trend={{ value: trendPct(cur.avarValor, prev.avarValor), label: trendLabel, invertColor: true }} />
      </div>

      {/* Individual Comparison Charts — Ocorrências */}
      <div>
        <h4 className="text-2xs font-black text-slate-600 uppercase tracking-tight mb-3">Comparativo de Ocorrências — Período Atual vs Anterior</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {individualCharts.map((chart) => (
            <div key={chart.title} className="bg-white rounded-card border border-gray-200 shadow-card p-4">
              <p className="text-2xs font-bold text-slate-500 uppercase tracking-wide mb-2 text-center">{chart.title}</p>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={chart.data} layout="vertical" margin={{ left: 0, right: 5 }}>
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis dataKey="name" type="category" hide />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="current" name={periods.current.label} fill={CHART_COLORS.current} radius={[0, 3, 3, 0]} barSize={16} />
                  <Bar dataKey="previous" name={periods.previous.label} fill={CHART_COLORS.previous} radius={[0, 3, 3, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-2xs mt-1 px-1">
                <span className="text-slate-800 font-bold">{chart.data[0].current}</span>
                <span className="text-blue-400 font-medium">{chart.data[0].previous}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-2">
          <span className="flex items-center gap-1.5 text-2xs text-slate-500"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: CHART_COLORS.current }} />{periods.current.label}</span>
          <span className="flex items-center gap-1.5 text-2xs text-slate-500"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: CHART_COLORS.previous }} />{periods.previous.label}</span>
        </div>
      </div>

      {/* Individual Comparison Charts — Valores */}
      <div>
        <h4 className="text-2xs font-black text-slate-600 uppercase tracking-tight mb-3">Comparativo de Valores (R$) — Período Atual vs Anterior</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {individualValorCharts.map((chart) => (
            <div key={chart.title} className="bg-white rounded-card border border-gray-200 shadow-card p-4">
              <p className="text-2xs font-bold text-slate-500 uppercase tracking-wide mb-2 text-center">{chart.title}</p>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={chart.data} layout="vertical" margin={{ left: 0, right: 5 }}>
                  <XAxis type="number" tickFormatter={(v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`} tick={{ fontSize: 9 }} />
                  <YAxis dataKey="name" type="category" hide />
                  <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="current" name={periods.current.label} fill={CHART_COLORS.current} radius={[0, 3, 3, 0]} barSize={16} />
                  <Bar dataKey="previous" name={periods.previous.label} fill={CHART_COLORS.previous} radius={[0, 3, 3, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-2xs mt-1 px-1">
                <span className="text-slate-800 font-bold">R$ {chart.data[0].current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="text-blue-400 font-medium">R$ {chart.data[0].previous.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-2">
          <span className="flex items-center gap-1.5 text-2xs text-slate-500"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: CHART_COLORS.current }} />{periods.current.label}</span>
          <span className="flex items-center gap-1.5 text-2xs text-slate-500"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: CHART_COLORS.previous }} />{periods.previous.label}</span>
        </div>
      </div>

      {/* Period detail table */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-5 overflow-x-auto">
        <h4 className="text-2xs font-black text-slate-600 uppercase tracking-tight mb-4">Detalhamento por Período</h4>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-800 text-white text-2xs uppercase">
            <tr>
              <th className="px-4 py-2.5">Período</th>
              <th className="px-4 py-2.5 text-right">Viagens</th>
              <th className="px-4 py-2.5 text-right">Atrasos</th>
              <th className="px-4 py-2.5 text-right">%</th>
              <th className="px-4 py-2.5 text-right">Excessos</th>
              <th className="px-4 py-2.5 text-right">ANTT</th>
              <th className="px-4 py-2.5 text-right">Trânsito</th>
              <th className="px-4 py-2.5 text-right">Avarias</th>
              <th className="px-4 py-2.5 text-right">Paradas</th>
              <th className="px-4 py-2.5 text-right">Monitriip</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: periods.current.label, s: cur, highlight: true },
              { label: periods.previous.label, s: prev, highlight: false },
            ].map((row, i) => (
              <tr key={i} className={`border-b border-gray-100 ${row.highlight ? 'bg-brand-50 font-bold' : 'hover:bg-slate-50'} transition-colors`}>
                <td className="px-4 py-2.5 font-mono text-2xs">{row.label}</td>
                <td className="px-4 py-2.5 text-right">{row.s.totalViagens}</td>
                <td className="px-4 py-2.5 text-right">{row.s.atrasosInicio}</td>
                <td className="px-4 py-2.5 text-right">{row.s.atrasosPerc}%</td>
                <td className="px-4 py-2.5 text-right">{row.s.excessos}</td>
                <td className="px-4 py-2.5 text-right">{row.s.multasAntt}</td>
                <td className="px-4 py-2.5 text-right">{row.s.multasTransito}</td>
                <td className="px-4 py-2.5 text-right">{row.s.avarias}</td>
                <td className="px-4 py-2.5 text-right">{row.s.paradas}</td>
                <td className="px-4 py-2.5 text-right">{row.s.monInvalidas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
