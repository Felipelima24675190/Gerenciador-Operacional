import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
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
  // DD/MM/YYYY or DD/MM/YYYY HH:MM
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

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekRange(refDate: Date, weeksAgo: number): { start: Date; end: Date; label: string } {
  const end = new Date(refDate);
  end.setDate(end.getDate() - weeksAgo * 7);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end, label: `${fmtDate(start)} a ${fmtDate(end)}` };
}

const COLORS = ['#0f172a', '#3b82f6', '#94a3b8'];

function KpiCard({ label, current, prev, unit = '' }: { label: string; current: number; prev: number; unit?: string }) {
  const diff = current - prev;
  const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : current > 0 ? '100.0' : '0.0';
  const isUp = diff > 0;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{label}</p>
      <p className="text-2xl font-black text-slate-800 mt-1">{current.toLocaleString('pt-BR')}{unit && <span className="text-sm font-bold text-slate-400 ml-1">{unit}</span>}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-slate-400">Sem. anterior: {prev.toLocaleString('pt-BR')}</span>
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
  // Reference date: today - 3 days
  const refDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d;
  }, []);

  const weeks = useMemo(() => [
    getWeekRange(refDate, 0),
    getWeekRange(refDate, 1),
    getWeekRange(refDate, 2),
  ], [refDate]);

  // ─── Compute stats per week ────────────────────────────────────────────────
  const weekStats = useMemo(() => {
    return weeks.map(({ start, end }) => {
      // Ocorrências (pontualidade)
      const ocWeek = ocorrencias.filter(o => {
        const d = parseDateBR(o.prevInicio);
        return d && dateInRange(d, start, end);
      });
      const totalViagens = ocWeek.length;
      const atrasosInicio = ocWeek.filter(o => o.statusInicio === 'Atraso').length;
      const atrasosPerc = totalViagens > 0 ? +((atrasosInicio / totalViagens) * 100).toFixed(1) : 0;

      // Excessos velocidade
      const exWeek = excessos.filter(e => {
        const d = parseDateBR(e.dataOcorrencia);
        return d && dateInRange(d, start, end);
      });

      // Multas ANTT
      const anttWeek = multasAntt.filter(m => {
        const d = parseDateBR(m.dataHora) || parseDateISO(m.dataHora);
        return d && dateInRange(d, start, end);
      });
      const anttValor = anttWeek.reduce((s, m) => s + m.valor, 0);

      // Multas Trânsito
      const transitWeek = multasTransito.filter(m => {
        const d = parseDateBR(m.dataInfracao);
        return d && dateInRange(d, start, end);
      });
      const transitValor = transitWeek.reduce((s, m) => s + m.valorCobrado, 0);

      // Avarias
      const avarWeek = avarias.filter(a => {
        const d = parseDateBR(a.data);
        return d && dateInRange(d, start, end);
      });
      const avarValor = avarWeek.reduce((s, a) => s + a.valorAvaria, 0);

      // Paradas indevidas
      const parWeek = paradas.filter(p => {
        const d = parseDateBR(p.data);
        return d && dateInRange(d, start, end);
      });

      // Monitriip
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
    });
  }, [weeks, ocorrencias, excessos, multasAntt, multasTransito, avarias, paradas, monitriips]);

  const cur = weekStats[0];
  const prev = weekStats[1];

  // ─── Comparison chart data ─────────────────────────────────────────────────
  const chartData = useMemo(() => [
    { name: 'Atrasos', ...Object.fromEntries(weeks.map((_, i) => [`s${i}`, weekStats[i].atrasosInicio])) },
    { name: 'Excessos Vel.', ...Object.fromEntries(weeks.map((_, i) => [`s${i}`, weekStats[i].excessos])) },
    { name: 'Multas ANTT', ...Object.fromEntries(weeks.map((_, i) => [`s${i}`, weekStats[i].multasAntt])) },
    { name: 'Multas Trânsito', ...Object.fromEntries(weeks.map((_, i) => [`s${i}`, weekStats[i].multasTransito])) },
    { name: 'Avarias', ...Object.fromEntries(weeks.map((_, i) => [`s${i}`, weekStats[i].avarias])) },
    { name: 'Paradas Ind.', ...Object.fromEntries(weeks.map((_, i) => [`s${i}`, weekStats[i].paradas])) },
    { name: 'Monitriip Inv.', ...Object.fromEntries(weeks.map((_, i) => [`s${i}`, weekStats[i].monInvalidas])) },
  ], [weeks, weekStats]);

  const valorChartData = useMemo(() => [
    { name: 'ANTT (R$)', ...Object.fromEntries(weeks.map((_, i) => [`s${i}`, weekStats[i].anttValor])) },
    { name: 'Trânsito (R$)', ...Object.fromEntries(weeks.map((_, i) => [`s${i}`, weekStats[i].transitValor])) },
    { name: 'Avarias (R$)', ...Object.fromEntries(weeks.map((_, i) => [`s${i}`, weekStats[i].avarValor])) },
  ], [weeks, weekStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 rounded-xl p-5 text-white">
        <h2 className="text-lg font-black">Dashboard Operacional — Resumo Semanal</h2>
        <p className="text-slate-400 text-xs mt-1">
          Período atual: <span className="font-bold text-white">{weeks[0].label}</span>
          &nbsp;(referência: hoje − 3 dias)
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Viagens" current={cur.totalViagens} prev={prev.totalViagens} />
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
        <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-4">Comparativo de Ocorrências — 3 Semanas</h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} interval={0} />
              <Tooltip />
              <Legend formatter={(v: string) => {
                const idx = parseInt(v.replace('s', ''));
                return weeks[idx]?.label || v;
              }} />
              <Bar dataKey="s0" name="s0" fill={COLORS[0]} radius={[0, 3, 3, 0]} />
              <Bar dataKey="s1" name="s1" fill={COLORS[1]} radius={[0, 3, 3, 0]} />
              <Bar dataKey="s2" name="s2" fill={COLORS[2]} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison Chart — Valores */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-4">Comparativo de Valores (R$) — 3 Semanas</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={valorChartData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} interval={0} />
              <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']} />
              <Legend formatter={(v: string) => {
                const idx = parseInt(v.replace('s', ''));
                return weeks[idx]?.label || v;
              }} />
              <Bar dataKey="s0" name="s0" fill={COLORS[0]} radius={[0, 3, 3, 0]} />
              <Bar dataKey="s1" name="s1" fill={COLORS[1]} radius={[0, 3, 3, 0]} />
              <Bar dataKey="s2" name="s2" fill={COLORS[2]} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly detail table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-x-auto">
        <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-4">Detalhamento por Semana</h4>
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
            {weeks.map((w, i) => {
              const s = weekStats[i];
              return (
                <tr key={i} className={`border-b border-gray-100 ${i === 0 ? 'bg-blue-50 font-bold' : ''}`}>
                  <td className="px-4 py-2 font-mono text-xs">{w.label}</td>
                  <td className="px-4 py-2 text-right">{s.totalViagens}</td>
                  <td className="px-4 py-2 text-right">{s.atrasosInicio}</td>
                  <td className="px-4 py-2 text-right">{s.atrasosPerc}%</td>
                  <td className="px-4 py-2 text-right">{s.excessos}</td>
                  <td className="px-4 py-2 text-right">{s.multasAntt}</td>
                  <td className="px-4 py-2 text-right">{s.multasTransito}</td>
                  <td className="px-4 py-2 text-right">{s.avarias}</td>
                  <td className="px-4 py-2 text-right">{s.paradas}</td>
                  <td className="px-4 py-2 text-right">{s.monInvalidas}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
