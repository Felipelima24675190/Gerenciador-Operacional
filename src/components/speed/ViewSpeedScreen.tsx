import { useMemo, useState } from 'react';
import { ExcessoVelocidade, UserRole, Motorista } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { subDays, format, parse } from 'date-fns';

interface ViewSpeedScreenProps {
  excessos: ExcessoVelocidade[];
  motoristas: Motorista[];
  userRole?: UserRole;
}

const StatCard = ({ title, value, subValue }: { title: string, value: string | number, subValue?: string }) => (
  <div className="bg-white p-4 rounded-lg shadow-md border flex-1">
    <p className="text-xs text-gray-500 font-bold uppercase">{title}</p>
    <p className="text-3xl font-black">{value}</p>
    {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
  </div>
);

export default function ViewSpeedScreen({ excessos, motoristas }: ViewSpeedScreenProps) {
  const [dataFim, setDataFim] = useState(new Date());
  const [dataInicio, setDataInicio] = useState(subDays(new Date(), 30));
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const excessosFiltrados = useMemo(() => {
    return excessos.filter(e => {
      const dataOcorrencia = parse(e.dataOcorrencia, 'dd/MM/yyyy', new Date());
      if (isNaN(dataOcorrencia.getTime())) return false;
      return dataOcorrencia >= dataInicio && dataOcorrencia <= dataFim && e.velocidadeMediaKmh > 85;
    });
  }, [excessos, dataInicio, dataFim]);
  
  const kpis = useMemo(() => {
    const motoristasEnvolvidos = new Set(excessosFiltrados.map(e => e.matricula)).size;
    const tempoTotalMin = excessosFiltrados.reduce((acc, e) => acc + e.tempoExcedidoMinutos, 0);
    const tempoTotalStr = `${Math.floor(tempoTotalMin / 60)}h ${tempoTotalMin % 60}min`;
    
    return {
      totalOcorrencias: excessosFiltrados.length,
      motoristasEnvolvidos,
      tempoTotalStr,
    };
  }, [excessosFiltrados]);

  const motoristasMap = useMemo(() => new Map(motoristas.map(m => [m.matricula, { nome: m.nome, area: m.area }])), [motoristas]);

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
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4">
        <div>
          <label className="text-sm font-medium">Data Início</label>
          <input type="date" value={format(dataInicio, 'yyyy-MM-dd')} onChange={e => setDataInicio(new Date(e.target.value + 'T00:00:00'))} className="w-full border rounded-lg p-2" />
        </div>
        <div>
          <label className="text-sm font-medium">Data Fim</label>
          <input type="date" value={format(dataFim, 'yyyy-MM-dd')} onChange={e => setDataFim(new Date(e.target.value + 'T23:59:59'))} className="w-full border rounded-lg p-2" />
        </div>
      </div>
      
      <div className="flex gap-4">
        <StatCard title="Total de Ocorrências" value={kpis.totalOcorrencias} />
        <StatCard title="Motoristas Envolvidos" value={kpis.motoristasEnvolvidos} />
        <StatCard title="Tempo Total em Excesso" value={kpis.tempoTotalStr} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white p-6 rounded-xl border shadow-sm">
          <h4 className="font-bold mb-4">Ocorrências por Dia</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analiseGrafica.ocorrenciasPorDia}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" name="Ocorrências"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
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
      
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h4 className="font-bold mb-4">Distribuição por Faixa de Velocidade</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={rankings.distribuicaoVelocidade} layout="vertical" margin={{ left: 20, right: 30 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={90} interval={0} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(val: number) => [val, 'Ocorrências']} />
            <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 11 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

       <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h4 className="font-bold mb-4">Top 10 - Linhas com Mais Excessos</h4>
         <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rankings.topLinhas} layout="vertical" margin={{ left: 200 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={200} interval={0} />
              <Bar dataKey="count" fill="#3b82f6" label={{ position: 'right' }} />
            </BarChart>
          </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h4 className="font-bold mb-4">Top 10 - Mais Ocorrências</h4>
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th>#</th><th>Matrícula</th><th>Nome</th><th>Ocorr.</th></tr></thead>
            <tbody>
              {rankings.topMotoristasOcorrencias.map((m, i) => (
                <tr key={m.matricula} className="border-b">
                  <td>{i+1}º</td><td>{m.matricula}</td><td>{m.nome}</td><td>{m.ocorrencias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h4 className="font-bold mb-4">Top 10 - Maior Tempo em Excesso</h4>
           <table className="w-full text-sm">
            <thead><tr className="text-left"><th>#</th><th>Matrícula</th><th>Nome</th><th>Tempo Total</th></tr></thead>
            <tbody>
              {rankings.topMotoristasTempo.map((m, i) => (
                <tr key={m.matricula} className="border-b">
                  <td>{i+1}º</td><td>{m.matricula}</td><td>{m.nome}</td><td>{Math.floor(m.tempoTotal/60)}h {m.tempoTotal%60}min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <h4 className="font-bold p-6">Detalhamento das Ocorrências</h4>
        <table className="w-full text-sm">
           <thead><tr className="text-left bg-gray-50"><th>Data/Hora</th><th>Motorista</th><th>Linha</th><th>Local</th><th>Duração</th><th>Vel. Média</th></tr></thead>
           <tbody>
            {excessosFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(e => (
              <tr key={e.id} className="border-b">
                <td>{e.dataOcorrencia} {e.inicioFimOcorrencia.split(' - ')[0]}</td>
                <td>{motoristasMap.get(e.matricula)?.nome || e.matricula}</td>
                <td>{e.nomeLinha}</td>
                <td>{e.endereco}</td>
                <td>{e.tempoExcedidoMinutos} min</td>
                <td>{e.velocidadeMediaKmh} km/h</td>
              </tr>
            ))}
           </tbody>
        </table>
        {excessosFiltrados.length > itemsPerPage && (
          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-slate-50">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border border-gray-200 rounded text-sm disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-xs text-gray-500">
              Página {currentPage} de {Math.ceil(excessosFiltrados.length / itemsPerPage)}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(excessosFiltrados.length / itemsPerPage), p + 1))}
              disabled={currentPage === Math.ceil(excessosFiltrados.length / itemsPerPage)}
              className="px-3 py-1 bg-white border border-gray-200 rounded text-sm disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
