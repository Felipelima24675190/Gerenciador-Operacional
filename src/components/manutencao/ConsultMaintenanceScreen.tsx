import { useMemo, useState } from 'react';
import { ManutencaoVeiculo, HistoricoManutencao, Veiculo } from '../../types';
import { Search, Wrench, Clock, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface ConsultMaintenanceScreenProps {
  manutencoes: ManutencaoVeiculo[];
  historicoManutencao: HistoricoManutencao[];
  veiculos: Veiculo[];
}

const COLORS = ['#0e4f8f', '#3d7fd2', '#1a6abf', '#6b9ede', '#0b3f72', '#9fbfea', '#082f55', '#c5daf3'];

export default function ConsultMaintenanceScreen({ manutencoes, historicoManutencao, veiculos }: ConsultMaintenanceScreenProps) {
  const [search, setSearch] = useState('');
  const [tabView, setTabView] = useState<'atual' | 'historico'>('atual');

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
    return { naOficina, totalHistorico, avgTempo };
  }, [manutencoes, historicoManutencao]);

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

  // Motivos distribution (using descricaoServico)
  const motivoChart = useMemo(() => {
    const counts: Record<string, number> = {};
    [...manutencoes.map(m => m.descricaoServico), ...historicoManutencao.map(h => h.descricaoServico)].forEach(desc => {
      const label = desc.length > 30 ? desc.substring(0, 30) + '...' : desc;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [manutencoes, historicoManutencao]);

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

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-brand-50 rounded-xl text-brand-600"><Wrench size={24} /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Na Oficina Agora</p>
            <p className="text-3xl font-black text-slate-800">{kpis.naOficina}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><TrendingUp size={24} /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Historico</p>
            <p className="text-3xl font-black text-slate-800">{kpis.totalHistorico}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><Clock size={24} /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Tempo Medio (horas)</p>
            <p className="text-3xl font-black text-slate-800">{kpis.avgTempo}h</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-600 uppercase text-center mb-3">Veiculos Mais Frequentes na Oficina</h4>
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

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-600 uppercase text-center mb-3">Distribuicao por Servico</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={motivoChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={25}
                  label={({ name, percent }: any) => `${name.length > 15 ? name.substring(0, 15) + '...' : name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={true} fontSize={9}>
                  {motivoChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setTabView('atual')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${tabView === 'atual' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              Na Oficina ({manutencoes.length})
            </button>
            <button onClick={() => setTabView('historico')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${tabView === 'historico' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              Historico ({historicoManutencao.length})
            </button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar prefixo, placa, servico ou local..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[500px]">
          {tabView === 'atual' ? (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white text-[10px] uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2">Veiculo</th>
                  <th className="px-3 py-2">Placa</th>
                  <th className="px-3 py-2">Retido Desde</th>
                  <th className="px-3 py-2">KM Atual</th>
                  <th className="px-3 py-2">Descricao Servico</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Local</th>
                  <th className="px-3 py-2">Prev. Lib.</th>
                  <th className="px-3 py-2">Dias</th>
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
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-bold text-slate-700">{m.prefixo}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{getPlaca(m.prefixo)}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{m.retidoDesde}</td>
                      <td className="px-3 py-2 text-right">{m.kmAtual.toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={m.descricaoServico}>{m.descricaoServico}</td>
                      <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold">{m.statusManutencao}</span></td>
                      <td className="px-3 py-2">{m.local}</td>
                      <td className={`px-3 py-2 font-mono text-[10px] ${atrasado ? 'text-red-600 font-bold' : ''}`}>{m.previsaoLiberacao}{atrasado && ' ⚠'}</td>
                      <td className="px-3 py-2 font-bold">{dias}d</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white text-[10px] uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2">Veiculo</th>
                  <th className="px-3 py-2">Placa</th>
                  <th className="px-3 py-2">Servico</th>
                  <th className="px-3 py-2">Entrada</th>
                  <th className="px-3 py-2">Saida</th>
                  <th className="px-3 py-2">Previsao</th>
                  <th className="px-3 py-2">Local</th>
                  <th className="px-3 py-2">Tempo (h)</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistorico.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Nenhum registro no historico</td></tr>
                )}
                {filteredHistorico.map(h => (
                  <tr key={h.id} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 font-bold text-slate-700">{h.prefixo}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{getPlaca(h.prefixo)}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={h.descricaoServico}>{h.descricaoServico}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{h.dataEntrada}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{h.dataSaida}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{h.previsaoLiberacao}</td>
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
