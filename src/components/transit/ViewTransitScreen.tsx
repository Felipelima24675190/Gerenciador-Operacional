import { useMemo, useState } from 'react';
import { MultaTransito, Motorista } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, Search } from 'lucide-react';

interface ViewTransitScreenProps {
  multas: MultaTransito[];
  motoristas: Motorista[];
}

const COLORS = ['#0f172a', '#1e40af', '#0369a1', '#0891b2', '#0d9488', '#059669', '#16a34a', '#ca8a04', '#dc2626', '#9333ea'];

const FILIAL_SIGLAS: Record<string, string> = {
  'ARCOVERDE': 'ACV', 'PETROLINA': 'PNZ', 'CARUARU': 'CAUA',
  'JOÃO PESSOA': 'JPA', 'NATAL': 'NAT', 'SÃO LUÍS': 'SLZ',
  'IMPERATRIZ': 'ITZ', 'BALSAS': 'BLA', 'MACEIÓ': 'MCZ', 'CAMPINA GRANDE': 'CGE',
};

export default function ViewTransitScreen({ multas, motoristas }: ViewTransitScreenProps) {
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-12-31');
  const [empresaFilter, setEmpresaFilter] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  const motoristaMap = useMemo(() => new Map(motoristas.map(m => [m.matricula, m])), [motoristas]);

  const filteredMultas = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');

    return multas.filter(m => {
      const matchEmpresa = empresaFilter === 'Todas' || m.empresa === empresaFilter;
      try {
        const [datePart] = m.dataHora.split(' ');
        const [day, month, year] = datePart.split('/').map(Number);
        const d = new Date(year, month - 1, day);
        const matchDate = d >= start && d <= end;
        return matchEmpresa && matchDate;
      } catch { return false; }
    });
  }, [multas, dataInicio, dataFim, empresaFilter]);

  const kpis = useMemo(() => {
    const totalValor = filteredMultas.reduce((s, m) => s + m.valor, 0);
    const empresas = new Set(filteredMultas.map(m => m.empresa));
    return { total: filteredMultas.length, totalValor, empresas: empresas.size };
  }, [filteredMultas]);

  const topMotoristas = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => {
      const key = m.matriculaMotorista;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([matricula, count]) => {
        const mot = motoristaMap.get(matricula);
        return { name: mot ? mot.nome.split(' ').slice(0, 2).join(' ') : `Desligado (${matricula})`, matricula, count, found: !!mot };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredMultas, motoristaMap]);

  const topFiliais = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => {
      const mot = motoristaMap.get(m.matriculaMotorista);
      const filial = mot?.filial || 'Desconhecida';
      counts[filial] = (counts[filial] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([filial, count]) => ({ name: FILIAL_SIGLAS[filial.toUpperCase()] || filial, fullName: filial, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredMultas, motoristaMap]);

  const topCodigos = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => {
      counts[m.codigoInfracao] = (counts[m.codigoInfracao] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredMultas]);

  const tableData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return filteredMultas
      .filter(m => {
        if (!term) return true;
        const mot = motoristaMap.get(m.matriculaMotorista);
        return (
          m.placaVeiculo.toLowerCase().includes(term) ||
          m.matriculaMotorista.includes(term) ||
          m.codigoInfracao.toLowerCase().includes(term) ||
          m.autoInfracao.toLowerCase().includes(term) ||
          (mot?.nome.toLowerCase().includes(term) ?? false)
        );
      })
      .slice(0, 100);
  }, [filteredMultas, searchTerm, motoristaMap]);

  if (multas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800">Nenhuma Multa Importada</h2>
        <p className="text-slate-500 max-w-md mt-2">Importe as multas de trânsito para visualizar o dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="bg-slate-800 p-4 flex gap-4 overflow-x-auto rounded-xl">
        {[
          { l: 'Total Multas', v: kpis.total },
          { l: 'Valor Total', v: kpis.totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), raw: true },
          { l: 'Empresas', v: kpis.empresas },
        ].map((k, i) => (
          <div key={i} className="bg-slate-700 rounded-lg p-4 text-center min-w-[140px] flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{k.l}</p>
            <p className="text-xl font-black text-white mt-1">{k.raw ? k.v : k.v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Empresa</label>
            <select value={empresaFilter} onChange={e => setEmpresaFilter(e.target.value)} className="w-full text-sm p-2 rounded-lg border border-gray-300">
              <option value="Todas">Todas</option>
              {[...new Set(multas.map(m => m.empresa))].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Início</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Fim</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </div>
          </div>
          <div className="flex items-end">
            <p className="text-sm text-slate-500">{filteredMultas.length} registros</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Motoristas */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">Top Motoristas com Mais Multas</h4>
          {topMotoristas.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMotoristas} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={90} interval={0} axisLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} multas`, 'Qtd']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {topMotoristas.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-xs text-slate-400 text-center py-8">Sem dados</p>}
        </div>

        {/* Top Filiais */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">Filiais com Mais Multas</h4>
          {topFiliais.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFiliais} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={60} interval={0} axisLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} multas`, 'Qtd']} labelFormatter={(l) => topFiliais.find(f => f.name === l)?.fullName || l} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {topFiliais.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-xs text-slate-400 text-center py-8">Sem dados</p>}
        </div>

        {/* Top Códigos */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">Tipos de Infração Mais Comuns</h4>
          {topCodigos.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCodigos} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={70} interval={0} axisLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} multas`, 'Qtd']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {topCodigos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-xs text-slate-400 text-center py-8">Sem dados</p>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por placa, matrícula, código ou auto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 text-sm outline-none"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-4 py-2 font-bold uppercase tracking-tight">Data/Hora</th>
                <th className="px-4 py-2 font-bold uppercase tracking-tight">Placa</th>
                <th className="px-4 py-2 font-bold uppercase tracking-tight">Motorista</th>
                <th className="px-4 py-2 font-bold uppercase tracking-tight">Filial</th>
                <th className="px-4 py-2 font-bold uppercase tracking-tight">Código</th>
                <th className="px-4 py-2 font-bold uppercase tracking-tight">Descrição</th>
                <th className="px-4 py-2 font-bold uppercase tracking-tight">Auto</th>
                <th className="px-4 py-2 font-bold uppercase tracking-tight">Valor</th>
                <th className="px-4 py-2 font-bold uppercase tracking-tight">Status</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map(m => {
                const mot = motoristaMap.get(m.matriculaMotorista);
                return (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 font-mono text-slate-500">{m.dataHora}</td>
                    <td className="px-4 py-2 font-bold text-slate-800">{m.placaVeiculo}</td>
                    <td className="px-4 py-2">
                      {mot ? (
                        <>
                          <p className="font-semibold text-slate-800 leading-tight">{mot.nome}</p>
                          <p className="text-[10px] text-slate-400">{m.matriculaMotorista}</p>
                        </>
                      ) : (
                        <>
                          <p className="italic text-slate-500 text-[10px]">Não consta na base (Desligado)</p>
                          <p className="text-[10px] text-slate-400 font-mono">{m.matriculaMotorista}</p>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{mot ? (FILIAL_SIGLAS[mot.filial.toUpperCase()] || mot.filial) : '-'}</td>
                    <td className="px-4 py-2 font-mono font-bold text-slate-700">{m.codigoInfracao}</td>
                    <td className="px-4 py-2 text-slate-600 max-w-[200px] truncate" title={m.descricaoInfracao}>{m.descricaoInfracao}</td>
                    <td className="px-4 py-2 font-mono text-slate-600">{m.autoInfracao}</td>
                    <td className="px-4 py-2 font-bold text-slate-700">{m.valor > 0 ? m.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        m.status === 'Pago' ? 'bg-green-100 text-green-700' :
                        m.status === 'Cancelado' ? 'bg-red-100 text-red-700' :
                        m.status === 'Defesa' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{m.status}</span>
                    </td>
                  </tr>
                );
              })}
              {tableData.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-gray-400">Nenhuma multa encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
