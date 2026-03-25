import { useMemo, useState } from 'react';
import { MultaANTT, AnttCodeDescription, Motorista } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Search } from 'lucide-react';

interface ViewAnttScreenProps {
  multas: MultaANTT[];
  anttCodeDescriptions: AnttCodeDescription[];
  motoristas: Motorista[];
}

const COLORS = ['#0e4f8f', '#3d7fd2', '#1a6abf', '#6b9ede', '#0b3f72', '#9fbfea', '#082f55', '#c5daf3', '#051e38', '#e8f1fb'];
const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

export default function ViewAnttScreen({ multas, anttCodeDescriptions, motoristas }: ViewAnttScreenProps) {
  const [dataInicio, setDataInicio] = useState('2026-03-01');
  const [dataFim, setDataFim] = useState('2026-03-31');
  const [empresaFilter, setEmpresaFilter] = useState('Todas');
  const [setorFilter, setSetorFilter] = useState('Todos');
  const [codigoFilter, setCodigoFilter] = useState('');
  const [searchTable, setSearchTable] = useState('');

  const setoresUnicos = useMemo(() => ['Todos', 'OPERACAO', 'MANUTENCAO', 'COMERCIAL', 'ATRASO', 'RH'], []);
  const motoristaMap = useMemo(() => new Map(motoristas.map(m => [m.matricula, m])), [motoristas]);
  const codeDescriptionMap = useMemo(() => new Map(anttCodeDescriptions.map(item => [item.codigo, item.descricao])), [anttCodeDescriptions]);

  const filteredMultas = useMemo(() => {
    const startDate = new Date(dataInicio);
    const endDate = new Date(dataFim);
    endDate.setHours(23, 59, 59, 999);

    return multas.filter(m => {
      const matchEmpresa = empresaFilter === 'Todas' || m.empresa === empresaFilter;
      const matchSetor = setorFilter === 'Todos' || m.setor === setorFilter;
      const matchCodigo = !codigoFilter || m.codigoInfracao.includes(codigoFilter);

      try {
        const [datePart] = m.dataHora.split(' ');
        const [day, month, year] = datePart.split('/').map(Number);
        const multaDate = new Date(year, month - 1, day);
        const matchDate = multaDate >= startDate && multaDate <= endDate;
        return matchEmpresa && matchDate && matchSetor && matchCodigo;
      } catch { return false; }
    });
  }, [multas, empresaFilter, dataInicio, dataFim, setorFilter, codigoFilter]);

  const kpis = useMemo(() => {
    const totalMultas = filteredMultas.length;
    const totalValor = filteredMultas.reduce((acc, curr) => acc + curr.valor, 0);
    const progressoMultas = filteredMultas.filter(m => m.empresa === 'PROGRESSO');
    const cruzeiroMultas = filteredMultas.filter(m => m.empresa === 'CRUZEIRO');
    return {
      totalValor,
      valorProgresso: progressoMultas.reduce((acc, curr) => acc + curr.valor, 0),
      valorCruzeiro: cruzeiroMultas.reduce((acc, curr) => acc + curr.valor, 0),
      totalMultas,
      totalProgresso: progressoMultas.length,
      totalCruzeiro: cruzeiroMultas.length,
    };
  }, [filteredMultas]);

  const chartSetor = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => counts[m.setor] = (counts[m.setor] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredMultas]);

  const chartCodigo = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => counts[m.codigoInfracao] = (counts[m.codigoInfracao] || 0) + 1);
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredMultas]);

  const chartTerminal = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => counts[m.terminal] = (counts[m.terminal] || 0) + 1);
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredMultas]);

  const chartMotorista = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => {
      if (m.matriculaMotorista) {
        const nome = motoristaMap.get(m.matriculaMotorista)?.nome || m.matriculaMotorista;
        counts[nome] = (counts[nome] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredMultas, motoristaMap]);

  const chartDataMensal = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyCounts: Record<string, { Atual: number; Anterior: number }> = {};
    months.forEach(month => { monthlyCounts[month] = { Atual: 0, Anterior: 0 }; });

    multas.forEach(m => {
      try {
        const [datePart] = m.dataHora.split(' ');
        const [, month, year] = datePart.split('/').map(Number);
        const fineDate = new Date(year, month - 1, 1);
        if (fineDate.getFullYear() === currentYear) monthlyCounts[months[fineDate.getMonth()]].Atual++;
        else if (fineDate.getFullYear() === previousYear) monthlyCounts[months[fineDate.getMonth()]].Anterior++;
      } catch {}
    });
    return months.map(month => ({ name: month, ...monthlyCounts[month] }));
  }, [multas]);

  const tableFiltered = useMemo(() => {
    if (!searchTable.trim()) return filteredMultas;
    const q = searchTable.toLowerCase();
    return filteredMultas.filter(m =>
      m.autoInfracao.toLowerCase().includes(q) ||
      m.codigoInfracao.toLowerCase().includes(q) ||
      (codeDescriptionMap.get(m.codigoInfracao) || m.descricaoInfracao).toLowerCase().includes(q)
    );
  }, [filteredMultas, searchTable, codeDescriptionMap]);

  return (
    <div className="space-y-4">
      {/* KPI Bar */}
      <div className="bg-white p-4 flex gap-4 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        {[
          { l: 'Valor Total', v: kpis.totalValor, c: true },
          { l: 'Valor Progresso', v: kpis.valorProgresso, c: true },
          { l: 'Valor Cruzeiro', v: kpis.valorCruzeiro, c: true },
          { l: 'Total Multas', v: kpis.totalMultas },
          { l: 'Progresso', v: kpis.totalProgresso },
          { l: 'Cruzeiro', v: kpis.totalCruzeiro },
        ].map((k, i) => (
          <div key={i} className="bg-slate-50 border border-gray-200 rounded-lg p-4 text-center min-w-[120px] flex-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase">{k.l}</p>
            <p className="text-xl font-black text-slate-800 mt-1">{k.c ? formatCurrency(k.v) : k.v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Empresa</label>
          <select value={empresaFilter} onChange={e => setEmpresaFilter(e.target.value)} className="text-xs p-2 rounded-lg border border-gray-200 bg-slate-50">
            <option value="Todas">Todas</option>
            <option value="PROGRESSO">PROGRESSO</option>
            <option value="CRUZEIRO">CRUZEIRO</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Setor Responsavel</label>
          <select value={setorFilter} onChange={e => setSetorFilter(e.target.value)} className="text-xs p-2 rounded-lg border border-gray-200 bg-slate-50">
            {setoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Codigo Infracao</label>
          <input type="text" placeholder="Ex: 501" value={codigoFilter} onChange={e => setCodigoFilter(e.target.value)} className="text-xs p-2 rounded-lg border border-gray-200 bg-slate-50 w-28" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Inicio</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="text-xs p-2 rounded-lg border border-gray-200" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Fim</label>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="text-xs p-2 rounded-lg border border-gray-200" />
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-600 uppercase text-center mb-3">Quantitativo Mensal</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataMensal}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Atual" fill="#0e4f8f" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Anterior" fill="#9fbfea" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-600 uppercase text-center mb-3">Distribuicao por Setor</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartSetor} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={25} label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(1)}%)`} labelLine={true} fontSize={9}>
                  {chartSetor.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Multas']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-600 uppercase text-center mb-3">Top 10 Codigos</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartCodigo} layout="vertical" margin={{ left: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={50} interval={0} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1a6abf" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-600 uppercase text-center mb-3">Top 10 Terminais</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartTerminal} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} interval={0} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3d7fd2" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-600 uppercase text-center mb-3">Top 10 Motoristas</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartMotorista} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={({ x, y, payload }: any) => {
                  const label = payload.value.length > 20 ? payload.value.substring(0, 20) + '...' : payload.value;
                  return <text x={x} y={y} dy={4} textAnchor="end" fontSize={9} fill="#334155">{label}</text>;
                }} width={120} interval={0} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0b3f72" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Buscar na tabela (auto, codigo, descricao)..."
            value={searchTable}
            onChange={e => setSearchTable(e.target.value)}
            className="flex-1 text-xs border-0 outline-none placeholder:text-slate-400"
          />
          <span className="text-[10px] text-slate-400 font-bold">{tableFiltered.length} registros</span>
        </div>
        <div className="overflow-y-auto max-h-[400px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white text-[10px] uppercase sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Auto</th>
                <th className="px-3 py-2">Codigo</th>
                <th className="px-3 py-2">Descricao</th>
                <th className="px-3 py-2">Setor</th>
                <th className="px-3 py-2">Terminal</th>
                <th className="px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {tableFiltered.slice(0, 200).map(m => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 font-mono text-[10px]">{m.dataHora}</td>
                  <td className="px-3 py-2 font-bold">{m.autoInfracao}</td>
                  <td className="px-3 py-2 font-mono">{m.codigoInfracao}</td>
                  <td className="px-3 py-2 text-slate-600">{codeDescriptionMap.get(m.codigoInfracao) || m.descricaoInfracao}</td>
                  <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold">{m.setor}</span></td>
                  <td className="px-3 py-2">{m.terminal}</td>
                  <td className="px-3 py-2 text-right font-bold">{formatCurrency(m.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
