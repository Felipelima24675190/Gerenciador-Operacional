import { useMemo, useState } from 'react';
import { OciosidadeMotorista } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Search } from 'lucide-react';

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

export default function ViewOciosidadeMotoristaScreen({ ociosidades }: Props) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'km' | 'ocioso' | 'viagens'>('km');

  // Detect stale data (old format had 'tempoMinutos' instead of 'paradoMotorLigadoMin')
  const isStaleFormat = useMemo(() =>
    ociosidades.length > 0 && (ociosidades[0] as any).tempoMinutos !== undefined,
  [ociosidades]);

  // KPIs
  const kpis = useMemo(() => {
    const kmTotal        = ociosidades.reduce((s, r) => s + (r.distanciaKm || 0), 0);
    // KM Ociosa: sum of all distances in the dataset
    const kmOciosa       = ociosidades.reduce((s, r) => s + (r.distanciaKm || 0), 0);
    const tempoOcioso    = ociosidades.reduce((s, r) => s + (r.paradoMotorLigadoMin || 0), 0);
    const combustivelTotal = ociosidades.reduce((s, r) => s + (r.combustivelMl || 0), 0);
    const eficienciaMedia = ociosidades.length > 0
      ? ociosidades.reduce((s, r) => s + (r.eficiencia || 0), 0) / ociosidades.length
      : 0;
    const veiculosUnicos = new Set(ociosidades.map(r => r.prefixo)).size;
    return { kmTotal, kmOciosa, tempoOcioso, combustivelTotal, eficienciaMedia, veiculosUnicos };
  }, [ociosidades]);

  // Top 10 by idle time (Parado c/ Motor Ligado)
  const topOcioso = useMemo(() => {
    const acc: Record<string, number> = {};
    ociosidades.forEach(r => { acc[r.prefixo] = (acc[r.prefixo] || 0) + (r.paradoMotorLigadoMin || 0); });
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [ociosidades]);

  // Top 10 by KM (most traveled)
  const topKm = useMemo(() => {
    const acc: Record<string, number> = {};
    ociosidades.forEach(r => { acc[r.prefixo] = (acc[r.prefixo] || 0) + r.distanciaKm; });
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [ociosidades]);

  // Per-vehicle aggregated data for table
  const veiculoStats = useMemo(() => {
    const acc: Record<string, { viagens: number; kmTotal: number; paradoMin: number; movMin: number }> = {};
    ociosidades.forEach(r => {
      if (!acc[r.prefixo]) acc[r.prefixo] = { viagens: 0, kmTotal: 0, paradoMin: 0, movMin: 0 };
      acc[r.prefixo].viagens++;
      acc[r.prefixo].kmTotal    += r.distanciaKm;
      acc[r.prefixo].paradoMin  += r.paradoMotorLigadoMin;
      acc[r.prefixo].movMin     += r.tempoMovimentoMin;
    });
    return Object.entries(acc).map(([prefixo, s]) => ({ prefixo, ...s }));
  }, [ociosidades]);

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
    <div className="space-y-4">
      {/* Stale data warning */}
      {isStaleFormat && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-xs text-amber-800 font-semibold flex items-center gap-2">
          ⚠️ Os dados salvos estão no formato antigo. Reimporte o arquivo em "Importar Quilometragem" para visualizar corretamente.
        </div>
      )}

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'KM Total',                  value: fmtKm(kpis.kmTotal),            color: 'text-brand-700' },
          { label: 'KM Ociosa',                   value: fmtKm(kpis.kmOciosa),           color: 'text-amber-600' },
          { label: 'Motor Ligado Parado',        value: fmtMinutes(kpis.tempoOcioso),   color: 'text-red-600' },
          { label: 'Eficiência Média (km/l)',    value: kpis.eficienciaMedia.toFixed(2) + ' km/l', color: 'text-emerald-600' },
          { label: 'Combustível Total (L)',       value: (kpis.combustivelTotal / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' L', color: 'text-purple-600' },
          { label: 'Veículos',                   value: kpis.veiculosUnicos.toString(), color: 'text-slate-700' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">{k.label}</p>
            <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-600 uppercase text-center mb-3">Top 10 — Maior Tempo Ocioso (Motor Ligado)</h4>
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

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-600 uppercase text-center mb-3">Top 10 — Veículos que Mais Rodaram (KM)</h4>
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="Buscar veículo..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
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
          <span className="text-[10px] text-slate-400 font-bold">{filtered.length} veículos</span>
        </div>
        <div className="overflow-y-auto max-h-[500px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white text-[10px] uppercase sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2">Veículo</th>
                <th className="px-3 py-2 text-right">Viagens</th>
                <th className="px-3 py-2 text-right">KM Total</th>
                <th className="px-3 py-2 text-right">Motor Ligado Parado</th>
                <th className="px-3 py-2 text-right">Tempo em Movimento</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Nenhum resultado</td></tr>
              )}
              {filtered.map(v => (
                <tr key={v.prefixo} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
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
