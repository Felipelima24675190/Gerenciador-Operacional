import { useMemo, useState } from 'react';
import { ParadaIndevida, UserRole } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { subDays, format, parse } from 'date-fns';
import { Calendar } from 'lucide-react';

interface ViewStopsScreenProps {
  paradas: ParadaIndevida[];
  userRole?: UserRole;
}

const StatCard = ({ title, value }: { title: string, value: string | number }) => (
  <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
    <p className="text-2xs text-gray-500 font-bold uppercase tracking-wide">{title}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

// Normaliza endereço: pega só o nome da rua/avenida sem número
const normalizeLocal = (local: string): string => {
  if (!local) return 'Desconhecido';
  // Pega tudo antes da primeira vírgula
  const semBairro = local.split(',')[0].trim();
  // Remove número no final (ex: "Rua São Domingos 57" → "Rua São Domingos")
  return semBairro.replace(/\s+\d+(\s*[-–]\s*\d+)?$/, '').trim() || semBairro;
};

export default function ViewStopsScreen({ paradas }: ViewStopsScreenProps) {
  const [dataFim, setDataFim] = useState(new Date());
  const [dataInicio, setDataInicio] = useState(subDays(new Date(), 7));

  const paradasFiltradas = useMemo(() => {
    return paradas.filter(p => {
      try {
        const dataParada = parse(p.data, 'dd/MM/yyyy', new Date());
        return dataParada >= dataInicio && dataParada <= dataFim;
      } catch (e) {
        return false;
      }
    });
  }, [paradas, dataInicio, dataFim]);

  const kpis = useMemo(() => {
    if (paradasFiltradas.length === 0) {
      return { total: 0, topMotorista: 'N/A', topLocal: 'N/A' };
    }

    const motoristaCounts = paradasFiltradas.reduce((acc, p) => {
      acc[p.motorista] = (acc[p.motorista] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const localCounts = paradasFiltradas.reduce((acc, p) => {
      const key = normalizeLocal(p.local);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topMotorista = Object.entries(motoristaCounts).sort((a, b) => b[1] - a[1])[0][0];
    const topLocal = Object.entries(localCounts).sort((a, b) => b[1] - a[1])[0][0];

    return { total: paradasFiltradas.length, topMotorista, topLocal };
  }, [paradasFiltradas]);

  const trendData = useMemo(() => {
    const trend: Record<string, number> = {};
    paradasFiltradas.forEach(p => {
      try {
        const formattedDate = format(parse(p.data, 'dd/MM/yyyy', new Date()), 'dd/MM');
        trend[formattedDate] = (trend[formattedDate] || 0) + 1;
      } catch {}
    });
    return Object.entries(trend).map(([date, count]) => ({ date, count }));
  }, [paradasFiltradas]);

  const top10Motoristas = useMemo(() => {
    const counts = paradasFiltradas.reduce((acc, p) => {
      const key = p.motorista || p.matricula || 'Desconhecido';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [paradasFiltradas]);

  const top10Veiculos = useMemo(() => {
    const counts = paradasFiltradas.reduce((acc, p) => {
      if (p.veiculo) {
        acc[p.veiculo] = (acc[p.veiculo] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [paradasFiltradas]);

  const top10Locais = useMemo(() => {
    const counts = paradasFiltradas.reduce((acc, p) => {
      const key = normalizeLocal(p.local);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [paradasFiltradas]);

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
        <div className="flex items-center gap-4">
          <div>
            <label htmlFor="stops-data-inicio" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Início</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="stops-data-inicio"
                type="date"
                value={format(dataInicio, 'yyyy-MM-dd')}
                onChange={e => setDataInicio(new Date(e.target.value + 'T00:00:00'))}
                aria-label="Data de início do filtro"
                className="px-3 py-2 pl-8 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="stops-data-fim" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Fim</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="stops-data-fim"
                type="date"
                value={format(dataFim, 'yyyy-MM-dd')}
                onChange={e => setDataFim(new Date(e.target.value + 'T23:59:59'))}
                aria-label="Data de fim do filtro"
                className="px-3 py-2 pl-8 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="bg-slate-800 p-4 flex gap-3 overflow-x-auto rounded-xl">
        {[
          { l: 'Total de Paradas', v: kpis.total },
          { l: 'Motorista com Mais Paradas', v: kpis.topMotorista },
          { l: 'Local com Mais Paradas', v: kpis.topLocal },
        ].map((k, i) => (
          <div key={i} className="bg-slate-700 rounded-lg p-3 text-center min-w-[120px] flex-1">
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-wide">{k.l}</p>
            <p className="text-lg font-black text-white mt-0.5 truncate" title={String(k.v)}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tendência */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-4 h-72">
        <h3 className="font-bold mb-4">Tendência de Paradas Indevidas</h3>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#ef4444" name="Paradas" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
        )}
      </div>

      {/* Top 10 Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 10 Motoristas */}
        <div className="bg-white rounded-card border border-gray-200 shadow-card p-6">
          <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wide mb-4">Top 10 - Motoristas</h4>
          {top10Motoristas.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10Motoristas} layout="vertical" margin={{ left: 5, right: 25 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={120} interval={0} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={14} label={{ position: 'right', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
          )}
        </div>

        {/* Top 10 Veículos */}
        <div className="bg-white rounded-card border border-gray-200 shadow-card p-6">
          <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wide mb-4">Top 10 - Veículos</h4>
          {top10Veiculos.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10Veiculos} layout="vertical" margin={{ left: 5, right: 25 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={80} interval={0} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} label={{ position: 'right', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-2xs text-slate-400 text-center py-10">Sem dados de veículo</p>
          )}
        </div>

        {/* Top 10 Locais */}
        <div className="bg-white rounded-card border border-gray-200 shadow-card p-6">
          <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wide mb-4">Top 10 - Locais</h4>
          <p className="text-2xs text-slate-400 mb-2">Agrupado por nome da rua/avenida, sem número</p>
          {top10Locais.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10Locais} layout="vertical" margin={{ left: 5, right: 25 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={130} interval={0} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={14} label={{ position: 'right', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-2xs text-slate-400 text-center py-10">Sem dados de local</p>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-800 text-white text-2xs uppercase tracking-wide">
                <th className="px-3 py-2.5">Data</th>
                <th className="px-3 py-2.5">Motorista</th>
                <th className="px-3 py-2.5">Linha</th>
                <th className="px-3 py-2.5">Local</th>
                <th className="px-3 py-2.5">Tempo Parado</th>
              </tr>
            </thead>
            <tbody>
              {paradasFiltradas.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                  <td className="px-3 py-2">{p.data}</td>
                  <td className="px-3 py-2">{p.motorista}</td>
                  <td className="px-3 py-2">{p.linha}</td>
                  <td className="px-3 py-2 max-w-[250px] truncate" title={p.local}>{p.local}</td>
                  <td className="px-3 py-2">{p.tempoParado}</td>
                </tr>
              ))}
              {paradasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
