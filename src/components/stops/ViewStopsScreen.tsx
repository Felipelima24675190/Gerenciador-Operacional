import { useMemo, useState } from 'react';
import { ParadaIndevida, UserRole } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { subDays, format, parse } from 'date-fns';

interface ViewStopsScreenProps {
  paradas: ParadaIndevida[];
  userRole?: UserRole;
}

const StatCard = ({ title, value }: { title: string, value: string | number }) => (
  <div className="bg-white p-4 rounded-lg shadow border">
    <p className="text-sm text-gray-500">{title}</p>
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
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium">Data Início</label>
            <input
              type="date"
              value={format(dataInicio, 'yyyy-MM-dd')}
              onChange={e => setDataInicio(new Date(e.target.value + 'T00:00:00'))}
              className="w-full border rounded-lg text-sm p-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Data Fim</label>
            <input
              type="date"
              value={format(dataFim, 'yyyy-MM-dd')}
              onChange={e => setDataFim(new Date(e.target.value + 'T23:59:59'))}
              className="w-full border rounded-lg text-sm p-2"
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total de Paradas" value={kpis.total} />
        <StatCard title="Motorista com Mais Paradas" value={kpis.topMotorista} />
        <StatCard title="Local com Mais Paradas" value={kpis.topLocal} />
      </div>

      {/* Tendência */}
      <div className="bg-white p-4 rounded-xl border shadow-sm h-72">
        <h3 className="font-bold mb-4">Tendência de Paradas Indevidas</h3>
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
      </div>

      {/* Top 10 Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 10 Motoristas */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4">Top 10 - Motoristas</h4>
          {top10Motoristas.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10Motoristas} layout="vertical" margin={{ left: 5, right: 25 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} width={120} interval={0} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={14} label={{ position: 'right', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
          )}
        </div>

        {/* Top 10 Veículos */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4">Top 10 - Veículos</h4>
          {top10Veiculos.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10Veiculos} layout="vertical" margin={{ left: 5, right: 25 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} width={80} interval={0} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} label={{ position: 'right', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados de veículo</div>
          )}
        </div>

        {/* Top 10 Locais */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4">Top 10 - Locais</h4>
          <p className="text-[9px] text-slate-400 mb-2">Agrupado por nome da rua/avenida, sem número</p>
          {top10Locais.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10Locais} layout="vertical" margin={{ left: 5, right: 25 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 8 }} width={130} interval={0} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={14} label={{ position: 'right', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados de local</div>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-50">
            <tr>
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3">Motorista</th>
              <th className="px-6 py-3">Linha</th>
              <th className="px-6 py-3">Local</th>
              <th className="px-6 py-3">Tempo Parado</th>
            </tr>
          </thead>
          <tbody>
            {paradasFiltradas.map(p => (
              <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4">{p.data}</td>
                <td className="px-6 py-4">{p.motorista}</td>
                <td className="px-6 py-4">{p.linha}</td>
                <td className="px-6 py-4 max-w-[250px] truncate" title={p.local}>{p.local}</td>
                <td className="px-6 py-4">{p.tempoParado}</td>
              </tr>
            ))}
            {paradasFiltradas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma parada indevida no período selecionado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
