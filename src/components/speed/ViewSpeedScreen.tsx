import { useMemo, useState } from 'react';
import { ExcessoVelocidade, UserRole, Motorista } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { subDays, format, parse } from 'date-fns';
import { Calendar, Search } from 'lucide-react';

interface ViewSpeedScreenProps {
  excessos: ExcessoVelocidade[];
  motoristas: Motorista[];
  userRole?: UserRole;
}

export default function ViewSpeedScreen({ excessos, motoristas }: ViewSpeedScreenProps) {
  const [dataFim, setDataFim] = useState(new Date());
  const [dataInicio, setDataInicio] = useState(subDays(new Date(), 30));
  const [currentPage, setCurrentPage] = useState(1);
  const [filialFilter, setFilialFilter] = useState('Todas');
  const [linhaFilter, setLinhaFilter] = useState('Todas');
  const itemsPerPage = 100;

  const motoristasMap = useMemo(() => new Map(motoristas.map(m => [m.matricula, m])), [motoristas]);

  // Date-filtered first (before filial/linha)
  const excessosByDate = useMemo(() => {
    return excessos.filter(e => {
      const dataOcorrencia = parse(e.dataOcorrencia, 'dd/MM/yyyy', new Date());
      if (isNaN(dataOcorrencia.getTime())) return false;
      return dataOcorrencia >= dataInicio && dataOcorrencia <= dataFim && e.velocidadeMediaKmh > 85;
    });
  }, [excessos, dataInicio, dataFim]);

  // Available filiais from date-filtered data
  const filiaisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    excessosByDate.forEach(e => {
      const mot = motoristasMap.get(e.matricula);
      if (mot?.filial) set.add(mot.filial);
    });
    return ['Todas', ...Array.from(set).sort()];
  }, [excessosByDate, motoristasMap]);

  // After filial filter
  const excessosByFilial = useMemo(() => {
    if (filialFilter === 'Todas') return excessosByDate;
    return excessosByDate.filter(e => {
      const mot = motoristasMap.get(e.matricula);
      return mot?.filial === filialFilter;
    });
  }, [excessosByDate, filialFilter, motoristasMap]);

  // Available lines from filial-filtered data
  const linhasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    excessosByFilial.forEach(e => { if (e.nomeLinha) set.add(e.nomeLinha); });
    return ['Todas', ...Array.from(set).sort()];
  }, [excessosByFilial]);

  // Final filtered
  const excessosFiltrados = useMemo(() => {
    if (linhaFilter === 'Todas') return excessosByFilial;
    return excessosByFilial.filter(e => e.nomeLinha === linhaFilter);
  }, [excessosByFilial, linhaFilter]);

  const kpis = useMemo(() => {
    const motoristasEnvolvidos = new Set(excessosFiltrados.map(e => e.matricula)).size;
    const tempoTotalMin = excessosFiltrados.reduce((acc, e) => acc + e.tempoExcedidoMinutos, 0);
    const tempoTotalStr = `${Math.floor(tempoTotalMin / 60)}h ${tempoTotalMin % 60}min`;
    const velMedia = excessosFiltrados.length > 0
      ? excessosFiltrados.reduce((s, e) => s + e.velocidadeMediaKmh, 0) / excessosFiltrados.length
      : 0;

    return {
      totalOcorrencias: excessosFiltrados.length,
      motoristasEnvolvidos,
      tempoTotalStr,
      velMedia,
    };
  }, [excessosFiltrados]);

  const analiseGrafica = useMemo(() => {
    const ocorrenciasPorDia: Record<string, number> = {};

    excessosFiltrados.forEach(e => {
      const dataFormatada = format(parse(e.dataOcorrencia, 'dd/MM/yyyy', new Date()), 'dd/MM');
      ocorrenciasPorDia[dataFormatada] = (ocorrenciasPorDia[dataFormatada] || 0) + 1;
    });

    return {
      ocorrenciasPorDia: Object.entries(ocorrenciasPorDia).map(([name, count]) => ({ name, count })).sort((a,b) => a.name.localeCompare(b.name)),
      diasMaisCriticos: Object.entries(ocorrenciasPorDia).map(([date, count]) => ({ date, count })).sort((a,b) => b.count - a.count).slice(0, 5),
    };
  }, [excessosFiltrados]);

  const rankings = useMemo(() => {
    const linhas = excessosFiltrados.reduce((acc, e) => {
      acc[e.nomeLinha] = (acc[e.nomeLinha] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const distVelocidade = excessosFiltrados.reduce((acc, e) => {
      if (e.velocidadeMediaKmh >= 86 && e.velocidadeMediaKmh <= 90) acc['86-90']++;
      else if (e.velocidadeMediaKmh >= 91 && e.velocidadeMediaKmh <= 94) acc['91-94']++;
      else if (e.velocidadeMediaKmh >= 95 && e.velocidadeMediaKmh <= 99) acc['95-99']++;
      else if (e.velocidadeMediaKmh >= 100 && e.velocidadeMediaKmh <= 104) acc['100-104']++;
      else if (e.velocidadeMediaKmh >= 105 && e.velocidadeMediaKmh <= 109) acc['105-109']++;
      else if (e.velocidadeMediaKmh >= 110) acc['110+']++;
      return acc;
    }, { '86-90': 0, '91-94': 0, '95-99': 0, '100-104': 0, '105-109': 0, '110+': 0 } as Record<string, number>);

    const motoristasOcorrencias = excessosFiltrados.reduce((acc, e) => {
      const motorista = motoristasMap.get(e.matricula);
      if(motorista) {
        if(!acc[e.matricula]) acc[e.matricula] = { matricula: e.matricula, nome: motorista.nome, ocorrencias: 0, tempoTotal: 0 };
        acc[e.matricula].ocorrencias++;
        acc[e.matricula].tempoTotal += e.tempoExcedidoMinutos;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      topLinhas: Object.entries(linhas).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 10),
      distribuicaoVelocidade: ['86-90', '91-94', '95-99', '100-104', '105-109', '110+'].map(faixa => ({ name: faixa + ' km/h', count: distVelocidade[faixa] || 0 })),
      topMotoristasOcorrencias: Object.values(motoristasOcorrencias).sort((a,b) => b.ocorrencias - a.ocorrencias).slice(0, 10),
      topMotoristasTempo: Object.values(motoristasOcorrencias).sort((a,b) => b.tempoTotal - a.tempoTotal).slice(0, 10),
    }
  }, [excessosFiltrados, motoristasMap]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="speed-data-inicio" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Início</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input id="speed-data-inicio" type="date" value={format(dataInicio, 'yyyy-MM-dd')} onChange={e => setDataInicio(new Date(e.target.value + 'T00:00:00'))} aria-label="Data de início" className="w-full px-3 py-2 pl-8 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label htmlFor="speed-data-fim" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Fim</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input id="speed-data-fim" type="date" value={format(dataFim, 'yyyy-MM-dd')} onChange={e => setDataFim(new Date(e.target.value + 'T23:59:59'))} aria-label="Data fim" className="w-full px-3 py-2 pl-8 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label htmlFor="speed-filial" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Filial</label>
            <select id="speed-filial" value={filialFilter} onChange={e => { setFilialFilter(e.target.value); setLinhaFilter('Todas'); }} aria-label="Filtrar por filial" className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none">
              {filiaisDisponiveis.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="speed-linha" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Linha</label>
            <select id="speed-linha" value={linhaFilter} onChange={e => setLinhaFilter(e.target.value)} aria-label="Filtrar por linha" className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none">
              {linhasDisponiveis.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs + Speedometer */}
      <div className="bg-slate-800 p-4 flex gap-3 overflow-x-auto rounded-xl items-center">
        {[
          { l: 'Total de Ocorrências', v: kpis.totalOcorrencias },
          { l: 'Motoristas Envolvidos', v: kpis.motoristasEnvolvidos },
          { l: 'Tempo Total em Excesso', v: kpis.tempoTotalStr },
        ].map((k, i) => (
          <div key={i} className="bg-slate-700 rounded-lg p-3 text-center min-w-[120px] flex-1">
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-wide">{k.l}</p>
            <p className="text-lg font-black text-white mt-0.5">{k.v}</p>
          </div>
        ))}
        {/* Speedometer inline */}
        <div className="bg-slate-700 rounded-lg p-3 flex flex-col items-center min-w-[140px]">
          <p className="text-2xs font-bold text-slate-400 uppercase tracking-wide mb-1">Vel. Média</p>
          <svg viewBox="0 0 200 120" width="120">
            <path d="M 20 100 A 80 80 0 0 1 100 20" fill="none" stroke="#059669" strokeWidth="16" strokeLinecap="round" />
            <path d="M 100 20 A 80 80 0 0 1 145 35" fill="none" stroke="#f59e0b" strokeWidth="16" strokeLinecap="round" />
            <path d="M 145 35 A 80 80 0 0 1 180 100" fill="none" stroke="#dc2626" strokeWidth="16" strokeLinecap="round" />
            {(() => {
              const maxVel = 120;
              const val = Math.min(maxVel, Math.max(0, kpis.velMedia));
              const angle = 180 - (val / maxVel) * 180;
              const rad = (angle * Math.PI) / 180;
              const nx = 100 + 55 * Math.cos(rad);
              const ny = 100 - 55 * Math.sin(rad);
              return (<><line x1="100" y1="100" x2={nx} y2={ny} stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" /><circle cx="100" cy="100" r="5" fill="#e2e8f0" /></>);
            })()}
            <text x="20" y="115" fontSize="9" fill="#94a3b8">0</text>
            <text x="90" y="16" fontSize="9" fill="#94a3b8">60</text>
            <text x="175" y="115" fontSize="9" fill="#94a3b8">120</text>
          </svg>
          <p className={`text-sm font-black ${kpis.velMedia < 80 ? 'text-emerald-400' : kpis.velMedia <= 90 ? 'text-amber-400' : 'text-red-400'}`}>
            {kpis.velMedia.toFixed(1)} km/h
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-card border border-gray-200 shadow-card p-6">
          <h4 className="font-bold mb-4">Ocorrências por Dia</h4>
          {analiseGrafica.ocorrenciasPorDia.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analiseGrafica.ocorrenciasPorDia}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="Ocorrências"/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
          )}
        </div>
        <div className="bg-white rounded-card border border-gray-200 shadow-card p-6">
          <h4 className="font-bold mb-4">Dias Mais Críticos</h4>
          <ul className="space-y-2">
            {analiseGrafica.diasMaisCriticos.map((dia, i) => (
              <li key={dia.date} className={`p-2 rounded-lg flex justify-between items-center ${i < 3 ? 'bg-yellow-100' : ''}`}>
                <span>{i+1}º - {dia.date}</span>
                <span className="font-bold">{dia.count} ocorr.</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-card border border-gray-200 shadow-card p-6">
        <h4 className="font-bold mb-4">Distribuição por Faixa de Velocidade</h4>
        {rankings.distribuicaoVelocidade.some(d => d.count > 0) ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={rankings.distribuicaoVelocidade} layout="vertical" margin={{ left: 20, right: 30 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={90} interval={0} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(val: number) => [val, 'Ocorrências']} />
              <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
        )}
      </div>

      <div className="bg-white rounded-card border border-gray-200 shadow-card p-6">
        <h4 className="font-bold mb-4">Top 10 - Linhas com Mais Excessos</h4>
        {rankings.topLinhas.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(300, rankings.topLinhas.length * 40)}>
            <BarChart data={rankings.topLinhas} layout="vertical" margin={{ left: 10, right: 50 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={260} interval={0} tick={({ x, y, payload }: any) => {
                const label = payload.value.length > 35 ? payload.value.substring(0, 35) + '...' : payload.value;
                return <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#334155">{label}</text>;
              }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" label={{ position: 'right', fontSize: 11 }} barSize={22} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-2xs text-slate-400 text-center py-10">Sem dados no período</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-card border border-gray-200 shadow-card p-6">
          <h4 className="font-bold mb-4">Top 10 - Mais Ocorrências</h4>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800 text-white text-2xs uppercase tracking-wide">
                  <th className="px-3 py-2.5 text-left">#</th>
                  <th className="px-3 py-2.5 text-left">Matrícula</th>
                  <th className="px-3 py-2.5 text-left">Nome</th>
                  <th className="px-3 py-2.5 text-left">Ocorr.</th>
                </tr>
              </thead>
              <tbody>
                {rankings.topMotoristasOcorrencias.map((m, i) => (
                  <tr key={m.matricula} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                    <td className="px-3 py-2">{i+1}º</td>
                    <td className="px-3 py-2">{m.matricula}</td>
                    <td className="px-3 py-2">{m.nome}</td>
                    <td className="px-3 py-2">{m.ocorrencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-card border border-gray-200 shadow-card p-6">
          <h4 className="font-bold mb-4">Top 10 - Maior Tempo em Excesso</h4>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800 text-white text-2xs uppercase tracking-wide">
                  <th className="px-3 py-2.5 text-left">#</th>
                  <th className="px-3 py-2.5 text-left">Matrícula</th>
                  <th className="px-3 py-2.5 text-left">Nome</th>
                  <th className="px-3 py-2.5 text-left">Tempo Total</th>
                </tr>
              </thead>
              <tbody>
                {rankings.topMotoristasTempo.map((m, i) => (
                  <tr key={m.matricula} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                    <td className="px-3 py-2">{i+1}º</td>
                    <td className="px-3 py-2">{m.matricula}</td>
                    <td className="px-3 py-2">{m.nome}</td>
                    <td className="px-3 py-2">{Math.floor(m.tempoTotal/60)}h {m.tempoTotal%60}min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <h4 className="font-bold p-6">Detalhamento das Ocorrências</h4>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-800 text-white text-2xs uppercase tracking-wide">
                <th className="px-3 py-2.5 text-left">Data/Hora</th>
                <th className="px-3 py-2.5 text-left">Motorista</th>
                <th className="px-3 py-2.5 text-left">Linha</th>
                <th className="px-3 py-2.5 text-left">Local</th>
                <th className="px-3 py-2.5 text-left">Duração</th>
                <th className="px-3 py-2.5 text-left">Vel. Média</th>
              </tr>
            </thead>
            <tbody>
              {excessosFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(e => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                  <td className="px-3 py-2">{e.dataOcorrencia} {e.inicioFimOcorrencia.split(' - ')[0]}</td>
                  <td className="px-3 py-2">{motoristasMap.get(e.matricula)?.nome || e.matricula}</td>
                  <td className="px-3 py-2">{e.nomeLinha}</td>
                  <td className="px-3 py-2">{e.endereco}</td>
                  <td className="px-3 py-2">{e.tempoExcedidoMinutos} min</td>
                  <td className="px-3 py-2">{e.velocidadeMediaKmh} km/h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {excessosFiltrados.length > itemsPerPage && (
          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-slate-50">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Página anterior"
              className="px-3 py-1 bg-white border border-gray-200 rounded text-xs disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-2xs text-gray-500">
              Página {currentPage} de {Math.ceil(excessosFiltrados.length / itemsPerPage)}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(excessosFiltrados.length / itemsPerPage), p + 1))}
              disabled={currentPage === Math.ceil(excessosFiltrados.length / itemsPerPage)}
              aria-label="Próxima página"
              className="px-3 py-1 bg-white border border-gray-200 rounded text-xs disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
