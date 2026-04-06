import { useMemo, useState } from 'react';
import { OciosidadeMotorista } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Search, Calendar } from 'lucide-react';

interface Props {
  ociosidades: OciosidadeMotorista[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  motoristas?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viagens?: any[];
}

const COLORS = ['#0e4f8f', '#1a6abf', '#3d7fd2', '#6b9ede', '#0b3f72', '#9fbfea', '#082f55', '#c5daf3', '#051e38', '#e8f1fb'];

function fmtMinutes(total: number): string {
  if (!total || total <= 0) return '0min';
  const d = Math.floor(total / (60 * 24));
  const h = Math.floor((total % (60 * 24)) / 60);
  const m = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}min`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function fmtKm(km: number): string {
  return km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km';
}

function parseDataBR(s: string): Date | null {
  try {
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y, m - 1, d);
  } catch { return null; }
}

export default function ViewOciosidadeMotoristaScreen({ ociosidades }: Props) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'km' | 'ocioso' | 'viagens'>('km');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Detect stale data (old format had 'tempoMinutos' instead of 'paradoMotorLigadoMin')
  const isStaleFormat = useMemo(() =>
    ociosidades.length > 0 && (ociosidades[0] as any).tempoMinutos !== undefined,
  [ociosidades]);

  // Filter by date range
  const filteredByDate = useMemo(() => {
    if (!dataInicio && !dataFim) return ociosidades;
    const start = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const end = dataFim ? new Date(dataFim + 'T23:59:59') : null;
    return ociosidades.filter(r => {
      const d = parseDataBR(r.data);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [ociosidades, dataInicio, dataFim]);

  // KPIs
  const kpis = useMemo(() => {
    const kmTotal = filteredByDate.reduce((s, r) => s + (r.distanciaKm || 0), 0);
    const totalTempoMov = filteredByDate.reduce((s, r) => s + Math.max(r.tempoMovimentoMin || 0, 0), 0);
    const totalMotorParado = filteredByDate.reduce((s, r) => s + Math.max(r.paradoMotorLigadoMin || 0, 0), 0);
    const totalTempoParado = filteredByDate.reduce((s, r) => s + Math.max(r.tempoParadoMin || 0, 0), 0);
    let totalTempoMin = filteredByDate.reduce((s, r) => s + Math.max(r.tempoTotalMin || 0, 0), 0);
    // Fallback: if tempoTotalMin is not populated, compute from components
    if (totalTempoMin === 0 && (totalTempoMov > 0 || totalMotorParado > 0)) {
      totalTempoMin = totalTempoMov + totalTempoParado;
    }
    const pctMovimento = totalTempoMin > 0 ? (totalTempoMov / totalTempoMin) * 100 : 0;
    const pctMotorParado = totalTempoMin > 0 ? (totalMotorParado / totalTempoMin) * 100 : 0;
    const combustivelTotal = filteredByDate.reduce((s, r) => s + (r.combustivelMl || 0), 0);
    const combustivelL = combustivelTotal / 1000;
    const eficienciaMedia = combustivelL > 0 ? kmTotal / combustivelL : 0;
    const veiculosUnicos = new Set(filteredByDate.map(r => r.prefixo)).size;
    return { kmTotal, pctMovimento, pctMotorParado, totalMotorParado, eficienciaMedia, combustivelL, veiculosUnicos };
  }, [filteredByDate]);

  // Top 10 by idle time (Parado c/ Motor Ligado)
  const topOcioso = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredByDate.forEach(r => { acc[r.prefixo] = (acc[r.prefixo] || 0) + (r.paradoMotorLigadoMin || 0); });
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredByDate]);

  // Top 10 by KM (most traveled)
  const topKm = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredByDate.forEach(r => { acc[r.prefixo] = (acc[r.prefixo] || 0) + r.distanciaKm; });
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredByDate]);

  // Per-vehicle aggregated data for table
  const veiculoStats = useMemo(() => {
    const acc: Record<string, { viagens: number; kmTotal: number; paradoMin: number; movMin: number }> = {};
    filteredByDate.forEach(r => {
      if (!acc[r.prefixo]) acc[r.prefixo] = { viagens: 0, kmTotal: 0, paradoMin: 0, movMin: 0 };
      acc[r.prefixo].viagens++;
      acc[r.prefixo].kmTotal    += r.distanciaKm;
      acc[r.prefixo].paradoMin  += r.paradoMotorLigadoMin;
      acc[r.prefixo].movMin     += r.tempoMovimentoMin;
    });
    return Object.entries(acc).map(([prefixo, s]) => ({ prefixo, ...s }));
  }, [filteredByDate]);

  const filtered = useMemo(() => {
    let list = veiculoStats;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => v.prefixo.toLowerCase().includes(q));
    }
    if (sortBy === 'km') return [...list].sort((a, b) => b.kmTotal - a.kmTotal);
    if (sortBy === 'ocioso') return [...list].sort((a, b) => b.paradoMin - a.paradoMin);
    return [...list].sort((a, b) => b.viagens - a.viagens);
  }, [veiculoStats, search, sortBy]);

  if (ociosidades.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
        <p className="text-slate-400 text-sm">Nenhum dado de quilometragem importado.</p>
        <p className="text-slate-400 text-xs mt-1">Vá em "Importar Quilometragem" para importar o relatório de viagens.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stale data warning */}
      {isStaleFormat && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-xs text-amber-800 font-semibold flex items-center gap-2">
          ⚠️ Os dados salvos estão no formato antigo. Reimporte o arquivo em "Importar Quilometragem" para visualizar corretamente.
        </div>
      )}

      {/* Date Filter */}
      <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="ociosidade-data-inicio" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Início</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input id="ociosidade-data-inicio" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} aria-label="Data início do filtro" className="w-full pl-8 pr-3 px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label htmlFor="ociosidade-data-fim" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Fim</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input id="ociosidade-data-fim" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} aria-label="Data fim do filtro" className="w-full pl-8 pr-3 px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" />
            </div>
          </div>
          <p className="text-sm text-slate-500 pb-2">{filteredByDate.length} registros no período</p>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'KM Total',                  value: fmtKm(kpis.kmTotal),            color: 'text-brand-700' },
          { label: 'Tempo em Movimento',         value: `${kpis.pctMovimento.toFixed(1)}%`, color: 'text-emerald-600' },
          { label: 'Motor Ligado Parado',        value: `${kpis.pctMotorParado.toFixed(1)}%`, color: 'text-red-600' },
          { label: 'Eficiência Média (km/l)',    value: kpis.eficienciaMedia.toFixed(2) + ' km/l', color: 'text-purple-600' },
          { label: 'Combustível Total (L)',       value: kpis.combustivelL.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' L', color: 'text-amber-600' },
          { label: 'Veículos',                   value: kpis.veiculosUnicos.toString(), color: 'text-slate-700' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
            <p className="text-2xs font-bold text-slate-500 uppercase leading-tight">{k.label}</p>
            <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
          <h4 className="text-2xs font-black text-slate-600 uppercase text-center mb-3">Top 10 — Maior Tempo Ocioso (Motor Ligado)</h4>
          <div style={{ height: Math.max(200, topOcioso.length * 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topOcioso} layout="vertical" margin={{ left: 5, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={55} interval={0} axisLine={false} />
                <Tooltip formatter={(v: number) => [fmtMinutes(v), 'Ocioso']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 9, formatter: (v: number) => fmtMinutes(v) }}>
                  {topOcioso.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
          <h4 className="text-2xs font-black text-slate-600 uppercase text-center mb-3">Top 10 — Veículos que Mais Rodaram (KM)</h4>
          <div style={{ height: Math.max(200, topKm.length * 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topKm} layout="vertical" margin={{ left: 5, right: 60 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={55} interval={0} axisLine={false} />
                <Tooltip formatter={(v: number) => [fmtKm(v), 'KM']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 9, formatter: (v: number) => v.toFixed(0) + 'km' }}>
                  {topKm.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input id="search-ociosidade" type="text" placeholder="Buscar veículo..." value={search} onChange={e => setSearch(e.target.value)}
              aria-label="Buscar veículo por prefixo"
              className="w-full pl-9 pr-4 px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold">Ordenar:</span>
            {(['km', 'ocioso', 'viagens'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${sortBy === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {s === 'km' ? 'Maior KM' : s === 'ocioso' ? 'Mais Ocioso' : 'Mais Viagens'}
              </button>
            ))}
          </div>
          <span className="text-2xs text-slate-400 font-bold">{filtered.length} veículos</span>
        </div>
        <div className="overflow-y-auto max-h-[500px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white text-2xs uppercase tracking-wide sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5">Veículo</th>
                <th className="px-3 py-2.5 text-right">Viagens</th>
                <th className="px-3 py-2.5 text-right">KM Total</th>
                <th className="px-3 py-2.5 text-right">Motor Ligado Parado</th>
                <th className="px-3 py-2.5 text-right">Tempo em Movimento</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Nenhum resultado</td></tr>
              )}
              {filtered.map(v => (
                <tr key={v.prefixo} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                  <td className="px-3 py-2 font-bold font-mono text-brand-700">{v.prefixo}</td>
                  <td className="px-3 py-2 text-right">{v.viagens}</td>
                  <td className="px-3 py-2 text-right font-bold">{fmtKm(v.kmTotal)}</td>
                  <td className="px-3 py-2 text-right text-amber-600 font-bold">{fmtMinutes(v.paradoMin)}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">{fmtMinutes(v.movMin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
