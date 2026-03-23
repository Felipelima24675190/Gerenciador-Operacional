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
  'RECIFE': 'REC',
};

function parseDataBR(s: string): Date | null {
  try {
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y, m - 1, d);
  } catch { return null; }
}

export default function ViewTransitScreen({ multas, motoristas }: ViewTransitScreenProps) {
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-12-31');
  const [filialFilter, setFilialFilter] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  const motoristaMap = useMemo(() => new Map(motoristas.map(m => [m.matricula, m])), [motoristas]);

  const filiaisDisponiveis = useMemo(() => ['Todas', ...[...new Set(multas.map(m => m.filial).filter(Boolean))].sort()], [multas]);

  const filteredMultas = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');

    return multas.filter(m => {
      const d = parseDataBR(m.dataInfracao);
      const matchDate = d ? d >= start && d <= end : false;
      const matchFilial = filialFilter === 'Todas' || m.filial === filialFilter;
      return matchDate && matchFilial;
    });
  }, [multas, dataInicio, dataFim, filialFilter]);

  const kpis = useMemo(() => {
    const valorCobrado = filteredMultas.reduce((s, m) => s + m.valorCobrado, 0);
    const valorRecuperado = filteredMultas.reduce((s, m) => s + m.valorRecuperado, 0);
    const motoristasUnicos = new Set(filteredMultas.map(m => m.matriculaMotorista).filter(Boolean)).size;
    const identificadas = filteredMultas.filter(m => m.motoristaIdentificado).length;
    return { total: filteredMultas.length, valorCobrado, valorRecuperado, motoristasUnicos, identificadas };
  }, [filteredMultas]);

  const topMotoristas = useMemo(() => {
    const counts: Record<string, { multas: number; valor: number }> = {};
    filteredMultas.filter(m => m.motoristaIdentificado && m.matriculaMotorista).forEach(m => {
      if (!counts[m.matriculaMotorista]) counts[m.matriculaMotorista] = { multas: 0, valor: 0 };
      counts[m.matriculaMotorista].multas++;
      counts[m.matriculaMotorista].valor += m.valorCobrado;
    });
    return Object.entries(counts)
      .map(([matricula, data]) => {
        const mot = motoristaMap.get(matricula);
        const nomeCsv = filteredMultas.find(m => m.matriculaMotorista === matricula)?.nomeMotorista || '';
        const nome = mot
          ? mot.nome.split(' ').slice(0, 2).join(' ')
          : (nomeCsv ? nomeCsv.split(' ').slice(0, 2).join(' ') : `Desligado`);
        return { name: nome, matricula, count: data.multas, valor: data.valor, found: !!mot };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredMultas, motoristaMap]);

  const topFiliais = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => {
      const filial = m.filial || 'Não informada';
      counts[filial] = (counts[filial] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([filial, count]) => ({ name: FILIAL_SIGLAS[filial.toUpperCase()] || filial, fullName: filial, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredMultas]);

  const topOrgaos = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => {
      const org = m.orgaoAtuador || 'Não informado';
      counts[org] = (counts[org] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 17) + '…' : name, fullName: name, count }))
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
          m.veiculo.toLowerCase().includes(term) ||
          m.matriculaMotorista.includes(term) ||
          m.nomeMotorista.toLowerCase().includes(term) ||
          m.numeroAuto.toLowerCase().includes(term) ||
          m.descricaoMulta.toLowerCase().includes(term) ||
          m.orgaoAtuador.toLowerCase().includes(term) ||
          (mot?.nome.toLowerCase().includes(term) ?? false)
        );
      })
      .slice(0, 150);
  }, [filteredMultas, searchTerm, motoristaMap]);

  if (multas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800">Nenhuma Multa Importada</h2>
        <p className="text-slate-500 max-w-md mt-2">Importe as multas de trânsito para visualizar o dashboard.</p>
      </div>
    );
  }

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="bg-slate-800 p-4 flex gap-3 overflow-x-auto rounded-xl">
        {[
          { l: 'Total Multas', v: kpis.total },
          { l: 'Valor Cobrado', v: fmtBRL(kpis.valorCobrado) },
          { l: 'Valor Recuperado', v: fmtBRL(kpis.valorRecuperado) },
          { l: 'Motoristas', v: kpis.motoristasUnicos },
          { l: 'Identificadas', v: kpis.identificadas },
        ].map((k, i) => (
          <div key={i} className="bg-slate-700 rounded-lg p-3 text-center min-w-[130px] flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{k.l}</p>
            <p className="text-lg font-black text-white mt-0.5">{k.v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Filial</label>
            <select value={filialFilter} onChange={e => setFilialFilter(e.target.value)} className="w-full text-sm p-2 rounded-lg border border-gray-300">
              {filiaisDisponiveis.map(f => <option key={f} value={f}>{f}</option>)}
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
                  <Tooltip
                    formatter={(v: number) => [`${v} multas`, 'Qtd']}
                    labelFormatter={(label: string, payload: any[]) => {
                      const e = payload?.[0]?.payload;
                      return e ? `${label} (${e.matricula}) — ${fmtBRL(e.valor)}` : label;
                    }}
                  />
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
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={55} interval={0} axisLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} multas`, 'Qtd']} labelFormatter={(l) => topFiliais.find(f => f.name === l)?.fullName || l} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {topFiliais.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-xs text-slate-400 text-center py-8">Sem dados</p>}
        </div>

        {/* Top Órgãos Atuadores */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">Órgãos Atuadores</h4>
          {topOrgaos.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOrgaos} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={90} interval={0} axisLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} multas`, 'Qtd']} labelFormatter={(l) => topOrgaos.find(o => o.name === l)?.fullName || l} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {topOrgaos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
            placeholder="Buscar por veículo, matrícula, auto, motorista, órgão..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 text-sm outline-none"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-3 py-2 font-bold uppercase tracking-tight whitespace-nowrap">Data</th>
                <th className="px-3 py-2 font-bold uppercase tracking-tight">Veículo</th>
                <th className="px-3 py-2 font-bold uppercase tracking-tight">Motorista</th>
                <th className="px-3 py-2 font-bold uppercase tracking-tight">Filial</th>
                <th className="px-3 py-2 font-bold uppercase tracking-tight">Órgão</th>
                <th className="px-3 py-2 font-bold uppercase tracking-tight max-w-[200px]">Infração</th>
                <th className="px-3 py-2 font-bold uppercase tracking-tight whitespace-nowrap">Auto</th>
                <th className="px-3 py-2 font-bold uppercase tracking-tight whitespace-nowrap">Vl. Cobrado</th>
                <th className="px-3 py-2 font-bold uppercase tracking-tight whitespace-nowrap">Vl. Recuperado</th>
                <th className="px-3 py-2 font-bold uppercase tracking-tight">Globus</th>
                <th className="px-3 py-2 font-bold uppercase tracking-tight">Status</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map(m => {
                const mot = motoristaMap.get(m.matriculaMotorista);
                const nomeExibir = mot ? mot.nome : m.nomeMotorista;
                const filialSigla = FILIAL_SIGLAS[m.filial?.toUpperCase()] || m.filial || '-';
                return (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{m.dataInfracao}</td>
                    <td className="px-3 py-2 font-bold text-slate-800">{m.veiculo}</td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {m.motoristaIdentificado ? (
                        <>
                          <p className="font-semibold text-slate-800 leading-tight">{nomeExibir || '—'}</p>
                          <p className="text-[10px] text-slate-400">{m.matriculaMotorista}</p>
                          {!mot && <p className="text-[9px] text-amber-600 italic">Desligado</p>}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Não identificado</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{filialSigla}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[120px] truncate" title={m.orgaoAtuador}>{m.orgaoAtuador}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={m.descricaoMulta}>{m.descricaoMulta}</td>
                    <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{m.numeroAuto}</td>
                    <td className="px-3 py-2 font-bold text-red-700 whitespace-nowrap">
                      {m.valorCobrado > 0 ? fmtBRL(m.valorCobrado) : '-'}
                    </td>
                    <td className="px-3 py-2 font-bold text-emerald-700 whitespace-nowrap">
                      {m.valorRecuperado > 0 ? fmtBRL(m.valorRecuperado) : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        m.lancadoGlobus?.toUpperCase().startsWith('SIM') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{m.lancadoGlobus?.toUpperCase().startsWith('SIM') ? 'Sim' : 'Não'}</span>
                    </td>
                    <td className="px-3 py-2">
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
                <tr><td colSpan={11} className="py-8 text-center text-gray-400">Nenhuma multa encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
