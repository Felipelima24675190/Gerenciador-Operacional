import { useMemo, useState } from 'react';
import { MultaANTT, AnttCodeDescription, Motorista } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Search, Calendar } from 'lucide-react';

interface ViewAnttScreenProps {
  multas: MultaANTT[];
  anttCodeDescriptions: AnttCodeDescription[];
  motoristas: Motorista[];
}

const COLORS = ['#0e4f8f', '#3d7fd2', '#1a6abf', '#6b9ede', '#0b3f72', '#9fbfea', '#082f55', '#c5daf3', '#051e38', '#e8f1fb'];
const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const normalizeSetor = (s: string): string => {
  if (!s || !s.trim()) return 'SEM SETOR';
  const upper = s.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (upper.includes('OPERA')) return 'OPERAÇÃO';
  if (upper.includes('MANUT')) return 'MANUTENÇÃO';
  if (upper.includes('COMER')) return 'COMERCIAL';
  if (upper.includes('ATRASO')) return 'ATRASO';
  if (upper === 'RH') return 'RH';
  if (!upper || upper === 'SEM SETOR') return 'SEM SETOR';
  // Non-empty non-standard value: return as stored (don't discard)
  return s.trim().toUpperCase();
};

// Parse date string in DD/MM/YYYY or DD/MM/YYYY HH:MM format
function parseDateBR(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    const datePart = dateStr.split(' ')[0];
    const parts = datePart.split('/');
    if (parts.length < 3) return null;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year || year < 2000) return null;
    return new Date(year, month - 1, day);
  } catch { return null; }
}

export default function ViewAnttScreen({ multas, anttCodeDescriptions, motoristas }: ViewAnttScreenProps) {
  const [dataInicio, setDataInicio] = useState('2026-03-01');
  const [dataFim, setDataFim] = useState('2026-03-31');
  const [empresaFilter, setEmpresaFilter] = useState('Todas');
  const [setorFilter, setSetorFilter] = useState('Todos');
  const [codigoFilter, setCodigoFilter] = useState('');
  const [searchTable, setSearchTable] = useState('');

  const setoresUnicos = useMemo(() => ['Todos', 'OPERAÇÃO', 'MANUTENÇÃO', 'COMERCIAL', 'ATRASO', 'RH', 'SEM SETOR'], []);
  const motoristaMap = useMemo(() => new Map(motoristas.map(m => [m.matricula, m])), [motoristas]);
  const codeDescriptionMap = useMemo(() => new Map(anttCodeDescriptions.map(item => [item.codigo, item])), [anttCodeDescriptions]);

  // Detect unique empresas in data
  const empresasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    multas.forEach(m => { if (m.empresa) set.add(m.empresa.toUpperCase()); });
    return Array.from(set).sort();
  }, [multas]);

  const filteredMultas = useMemo(() => {
    const startDate = new Date(dataInicio + 'T00:00:00');
    const endDate = new Date(dataFim + 'T23:59:59');

    return multas.filter(m => {
      const matchEmpresa = empresaFilter === 'Todas' || (m.empresa || '').toUpperCase() === empresaFilter;
      const normalizedSetor = normalizeSetor(m.setor);
      const matchSetor = setorFilter === 'Todos' || normalizedSetor === setorFilter;
      const matchCodigo = !codigoFilter || (m.codigoInfracao || '').includes(codigoFilter);

      const multaDate = parseDateBR(m.dataHora);
      if (!multaDate) return false;
      const matchDate = multaDate >= startDate && multaDate <= endDate;

      return matchEmpresa && matchDate && matchSetor && matchCodigo;
    });
  }, [multas, empresaFilter, dataInicio, dataFim, setorFilter, codigoFilter]);

  const kpis = useMemo(() => {
    const getValor = (m: MultaANTT) => {
      const codeInfo = codeDescriptionMap.get(m.codigoInfracao);
      return codeInfo?.valor && codeInfo.valor > 0 ? codeInfo.valor : (m.valor || 0);
    };
    const totalMultas = filteredMultas.length;
    const totalValor = filteredMultas.reduce((acc, curr) => acc + getValor(curr), 0);
    const progressoMultas = filteredMultas.filter(m => (m.empresa || '').toUpperCase().includes('PROGRESSO'));
    const cruzeiroMultas  = filteredMultas.filter(m => (m.empresa || '').toUpperCase().includes('CRUZEIRO'));
    return {
      totalValor,
      valorProgresso: progressoMultas.reduce((acc, curr) => acc + getValor(curr), 0),
      valorCruzeiro:  cruzeiroMultas.reduce((acc, curr) => acc + getValor(curr), 0),
      totalMultas,
      totalProgresso: progressoMultas.length,
      totalCruzeiro:  cruzeiroMultas.length,
    };
  }, [filteredMultas, codeDescriptionMap]);

  // Setor chart — normalize and group properly
  const chartSetor = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => {
      const setor = normalizeSetor(m.setor);
      counts[setor] = (counts[setor] || 0) + 1;
    });
    const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    // Group slices beyond top 6 into "Outros"
    if (sorted.length > 6) {
      const top = sorted.slice(0, 6);
      const outrosVal = sorted.slice(6).reduce((acc, s) => acc + s.value, 0);
      if (outrosVal > 0) top.push({ name: 'Outros', value: outrosVal });
      return top;
    }
    return sorted;
  }, [filteredMultas]);

  // Codigos chart — only show actual code values (filter out obvious non-codes)
  const chartCodigo = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => {
      const code = (m.codigoInfracao || '').trim();
      if (code) counts[code] = (counts[code] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredMultas]);

  // Terminal chart — filter out obvious non-terminal values (months, single digits)
  const chartTerminal = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => {
      const t = (m.terminal || '').trim();
      if (t) counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredMultas]);

  const chartMotorista = useMemo(() => {
    const counts: Record<string, { count: number; nome: string; matricula: string; valor: number; codigos: Record<string, number> }> = {};
    filteredMultas.forEach(m => {
      if (m.matriculaMotorista) {
        const mat = m.matriculaMotorista;
        if (!counts[mat]) {
          const mot = motoristaMap.get(mat);
          counts[mat] = { count: 0, nome: mot?.nome || mat, matricula: mat, valor: 0, codigos: {} };
        }
        counts[mat].count++;
        counts[mat].valor += m.valor || 0;
        const cod = m.codigoInfracao || 'N/A';
        counts[mat].codigos[cod] = (counts[mat].codigos[cod] || 0) + 1;
      }
    });
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(d => ({ name: d.matricula, count: d.count, fullName: d.nome, matricula: d.matricula, valor: d.valor, codigos: d.codigos }));
  }, [filteredMultas, motoristaMap]);

  const [selectedAnttMatricula, setSelectedAnttMatricula] = useState<string | null>(null);
  const selectedAnttMotorista = useMemo(() => {
    if (!selectedAnttMatricula) return null;
    return chartMotorista.find(m => m.matricula === selectedAnttMatricula) || null;
  }, [selectedAnttMatricula, chartMotorista]);

  const chartDataMensal = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const keyAtual = `${currentYear}`;
    const keyAnterior = `${previousYear}`;

    const monthlyCounts: Record<string, Record<string, number>> = {};
    months.forEach(month => { monthlyCounts[month] = { [keyAtual]: 0, [keyAnterior]: 0 }; });

    multas.forEach(m => {
      const d = parseDateBR(m.dataHora);
      if (!d) return;
      if (d.getFullYear() === currentYear)     monthlyCounts[months[d.getMonth()]][keyAtual]++;
      else if (d.getFullYear() === previousYear) monthlyCounts[months[d.getMonth()]][keyAnterior]++;
    });
    return { data: months.map(month => ({ name: month, ...monthlyCounts[month] } as Record<string, string | number>)), keyAtual, keyAnterior };
  }, [multas]);

  const tableFiltered = useMemo(() => {
    if (!searchTable.trim()) return filteredMultas;
    const q = searchTable.toLowerCase();
    return filteredMultas.filter(m =>
      (m.autoInfracao || '').toLowerCase().includes(q) ||
      (m.codigoInfracao || '').toLowerCase().includes(q) ||
      (codeDescriptionMap.get(m.codigoInfracao)?.descricao || m.descricaoInfracao || '').toLowerCase().includes(q) ||
      (m.terminal || '').toLowerCase().includes(q) ||
      (m.setor || '').toLowerCase().includes(q)
    );
  }, [filteredMultas, searchTable, codeDescriptionMap]);

  return (
    <div className="space-y-5">
      {/* KPI Bar */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-4 flex gap-4 overflow-x-auto">
        {[
          { l: 'Valor Total', v: kpis.totalValor, c: true },
          { l: 'Valor Progresso', v: kpis.valorProgresso, c: true },
          { l: 'Valor Cruzeiro', v: kpis.valorCruzeiro, c: true },
          { l: 'Total Multas', v: kpis.totalMultas },
          { l: 'Progresso', v: kpis.totalProgresso },
          { l: 'Cruzeiro', v: kpis.totalCruzeiro },
        ].map((k, i) => (
          <div key={i} className="bg-slate-50 border border-gray-200 rounded-lg p-4 text-center min-w-[120px] flex-1">
            <p className="text-2xs font-bold text-slate-500 uppercase tracking-wide">{k.l}</p>
            <p className="text-xl font-black text-slate-800 mt-1">{k.c ? formatCurrency(k.v) : k.v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label htmlFor="antt-empresa" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Empresa</label>
          <select
            id="antt-empresa"
            value={empresaFilter}
            onChange={e => setEmpresaFilter(e.target.value)}
            aria-label="Filtrar por empresa"
            className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
          >
            <option value="Todas">Todas</option>
            {empresasDisponiveis.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="antt-setor" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Setor Responsavel</label>
          <select
            id="antt-setor"
            value={setorFilter}
            onChange={e => setSetorFilter(e.target.value)}
            aria-label="Filtrar por setor"
            className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
          >
            {setoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="antt-codigo" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Codigo Infracao</label>
          <input
            id="antt-codigo"
            type="text"
            placeholder="Ex: 501"
            value={codigoFilter}
            onChange={e => setCodigoFilter(e.target.value)}
            aria-label="Filtrar por código de infração"
            className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none w-28"
          />
        </div>
        <div>
          <label htmlFor="antt-data-inicio" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Inicio</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="antt-data-inicio"
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              aria-label="Data de início do filtro"
              className="px-3 py-2 pl-8 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label htmlFor="antt-data-fim" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Fim</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="antt-data-fim"
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              aria-label="Data de fim do filtro"
              className="px-3 py-2 pl-8 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>
        </div>
        <div className="text-2xs text-slate-400 font-bold pb-2">{filteredMultas.length} multas no período</div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
          <h4 className="text-2xs font-black text-slate-600 uppercase tracking-wide text-center mb-3">Quantitativo Mensal — Ano Atual vs Ano Anterior</h4>
          <div className="h-56">
            {chartDataMensal.data.some(d => (d[chartDataMensal.keyAtual] as number) > 0 || (d[chartDataMensal.keyAnterior] as number) > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataMensal.data}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey={chartDataMensal.keyAtual} name={chartDataMensal.keyAtual} fill="#0e4f8f" radius={[3, 3, 0, 0]} />
                  <Bar dataKey={chartDataMensal.keyAnterior} name={chartDataMensal.keyAnterior} fill="#9fbfea" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
          <h4 className="text-2xs font-black text-slate-600 uppercase tracking-wide text-center mb-3">Distribuicao por Setor</h4>
          <div className="h-56">
            {chartSetor.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartSetor}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    innerRadius={20}
                    label={({ name, percent }: any) => {
                      const label = name.length > 10 ? name.substring(0, 10) + '..' : name;
                      return `${label} ${(percent * 100).toFixed(1)}%`;
                    }}
                    labelLine={true}
                    fontSize={11}
                  >
                    {chartSetor.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} multas`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
          <h4 className="text-2xs font-black text-slate-600 uppercase tracking-wide text-center mb-3">Top 10 Codigos</h4>
          <div className="h-56">
            {chartCodigo.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartCodigo} layout="vertical" margin={{ left: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={50} interval={0} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1a6abf" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
          <h4 className="text-2xs font-black text-slate-600 uppercase tracking-wide text-center mb-3">Top 10 Filiais</h4>
          <div className="h-64">
            {chartTerminal.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartTerminal} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} interval={0} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3d7fd2" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-card border border-gray-200 shadow-card p-4 relative">
          <h4 className="text-2xs font-black text-slate-600 uppercase tracking-wide text-center mb-3">Top 10 Motoristas</h4>
          <div className="h-64">
            {chartMotorista.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartMotorista} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 700, cursor: 'pointer' }} width={80} interval={0} axisLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} multas`, 'Qtd']} labelFormatter={(_: string, payload: any[]) => payload?.[0]?.payload?.fullName || ''} />
                  <Bar
                    dataKey="count"
                    fill="#0b3f72"
                    radius={[0, 4, 4, 0]}
                    barSize={18}
                    label={{ position: 'right', fontSize: 11 }}
                    cursor="pointer"
                    onClick={(data: any) => {
                      const mat = data?.matricula || data?.payload?.matricula;
                      if (mat) setSelectedAnttMatricula(prev => prev === mat ? null : mat);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
            )}
          </div>

          {selectedAnttMotorista && (
            <div
              className="mt-3 bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-blue-300 rounded-xl p-4 shadow-md cursor-pointer"
              onClick={() => setSelectedAnttMatricula(null)}
              aria-label="Fechar detalhes do motorista"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-black text-slate-800">{selectedAnttMotorista.fullName}</p>
                  <p className="text-2xs text-slate-500">Matrícula: <strong>{selectedAnttMotorista.matricula}</strong></p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-800">{selectedAnttMotorista.count} <span className="text-2xs font-bold text-slate-500">multas</span></p>
                  <p className="text-2xs font-bold text-slate-500">{formatCurrency(selectedAnttMotorista.valor)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedAnttMotorista.codigos).sort((a, b) => b[1] - a[1]).map(([cod, qty]) => (
                  <div key={cod} className="bg-white rounded-lg border border-gray-200 px-3 py-1.5 text-center">
                    <p className="text-2xs font-bold text-slate-500">Cód. {cod}</p>
                    <p className="text-xs font-black text-slate-800">{qty}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-2xs text-slate-400 text-center">Clique para fechar</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Buscar na tabela (auto, codigo, descricao, terminal, setor)..."
            value={searchTable}
            onChange={e => setSearchTable(e.target.value)}
            aria-label="Buscar na tabela de multas"
            className="flex-1 text-xs border-0 outline-none placeholder:text-slate-400"
          />
          <span className="text-2xs text-slate-400 font-bold">{tableFiltered.length} registros</span>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-800 text-white text-2xs uppercase tracking-wide">
                <th className="px-3 py-2.5">Data</th>
                <th className="px-3 py-2.5">Auto</th>
                <th className="px-3 py-2.5">Codigo</th>
                <th className="px-3 py-2.5">Descricao</th>
                <th className="px-3 py-2.5">Setor</th>
                <th className="px-3 py-2.5">Filial</th>
                <th className="px-3 py-2.5">Empresa</th>
                <th className="px-3 py-2.5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {tableFiltered.slice(0, 200).map(m => {
                const codeInfo    = codeDescriptionMap.get(m.codigoInfracao);
                const valorExibido = codeInfo?.valor && codeInfo.valor > 0 ? codeInfo.valor : (m.valor || 0);
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                    <td className="px-3 py-2 font-mono text-2xs">{m.dataHora}</td>
                    <td className="px-3 py-2 font-bold">{m.autoInfracao}</td>
                    <td className="px-3 py-2 font-mono">{m.codigoInfracao}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-normal break-words">{m.descricaoInfracao || codeInfo?.descricao || '-'}</td>
                    <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-2xs font-bold">{normalizeSetor(m.setor)}</span></td>
                    <td className="px-3 py-2">{m.terminal}</td>
                    <td className="px-3 py-2 text-2xs font-bold">{m.empresa}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(valorExibido)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
