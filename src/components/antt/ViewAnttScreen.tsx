import { useMemo, useState } from 'react';
import { MultaANTT, AnttCodeDescription, Motorista } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { Search } from 'lucide-react';

interface ViewAnttScreenProps {
  multas: MultaANTT[];
  anttCodeDescriptions: AnttCodeDescription[];
  motoristas: Motorista[];
}

const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

export default function ViewAnttScreen({ multas, anttCodeDescriptions, motoristas }: ViewAnttScreenProps) {
  const [dataInicio, setDataInicio] = useState('2026-03-01');
  const [dataFim, setDataFim] = useState('2026-03-31');
  const [empresaFilter, setEmpresaFilter] = useState('Todas');
  
  const [activeSetor, setActiveSetor] = useState<string | null>(null);
  const [activeTerminal, setActiveTerminal] = useState<string | null>(null);
  const [activeCodigo, setActiveCodigo] = useState<string | null>(null);
  const [activeMotorista, setActiveMotorista] = useState<string | null>(null);

  const clearCrossFilters = () => {
    setActiveSetor(null);
    setActiveTerminal(null);
    setActiveCodigo(null);
    setActiveMotorista(null);
  };

  const setoresUnicos = useMemo(() => ['Todos', 'OPERAÇÃO', 'MANUTENÇÃO', 'COMERCIAL', 'ATRASO', 'RH'], []);
  const motoristaMap = useMemo(() => new Map(motoristas.map(m => [m.matricula, m])), [motoristas]);
  const codeDescriptionMap = useMemo(() => {
    return new Map(anttCodeDescriptions.map((item: AnttCodeDescription) => [item.codigo, item.descricao]));
  }, [anttCodeDescriptions]);

  const filteredMultas = useMemo(() => {
    const startDate = new Date(dataInicio);
    const endDate = new Date(dataFim);
    endDate.setHours(23, 59, 59, 999);

    return multas.filter(m => {
      const matchEmpresa = empresaFilter === 'Todas' || m.empresa === empresaFilter;
      const matchCrossSetor = !activeSetor || m.setor === activeSetor;
      const matchCrossTerminal = !activeTerminal || m.terminal === activeTerminal;
      const matchCrossCodigo = !activeCodigo || m.codigoInfracao === activeCodigo;
      const matchCrossMotorista = !activeMotorista || m.matriculaMotorista === activeMotorista;

      try {
        const [datePart] = m.dataHora.split(' ');
        const [day, month, year] = datePart.split('/').map(Number);
        const multaDate = new Date(year, month - 1, day);
        const matchDate = multaDate >= startDate && multaDate <= endDate;
        return matchEmpresa && matchDate && matchCrossSetor && matchCrossTerminal && matchCrossCodigo && matchCrossMotorista;
      } catch { return false; }
    });
  }, [multas, empresaFilter, dataInicio, dataFim, activeSetor, activeTerminal, activeCodigo, activeMotorista]);

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
      totalCruzeiro: cruzeiroMultas.length
    };
  }, [filteredMultas]);

  const chartSetor = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => counts[m.setor] = (counts[m.setor] || 0) + 1);
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredMultas]);

  const chartTerminal = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => counts[m.terminal] = (counts[m.terminal] || 0) + 1);
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredMultas]);

  const chartCodigo = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => counts[m.codigoInfracao] = (counts[m.codigoInfracao] || 0) + 1);
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredMultas]);

  const chartMotorista = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMultas.forEach(m => {
      if (m.matriculaMotorista) counts[m.matriculaMotorista] = (counts[m.matriculaMotorista] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredMultas]);

  const chartDataMensal = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyCounts: Record<string, { Atual: number; Anterior: number }> = {};
    months.forEach(month => { monthlyCounts[month] = { Atual: 0, Anterior: 0 }; });

    multas.forEach(m => {
        try {
          const [datePart] = m.dataHora.split(' ');
          const [day, month, year] = datePart.split('/').map(Number);
          const fineDate = new Date(year, month - 1, day); 
          if (fineDate.getFullYear() === currentYear) monthlyCounts[months[fineDate.getMonth()]].Atual++;
          else if (fineDate.getFullYear() === previousYear) monthlyCounts[months[fineDate.getMonth()]].Anterior++;
        } catch(e) {}
    });
    return months.map(month => ({ name: month, ...monthlyCounts[month] }));
  }, [multas]);

  const motoristaAtivoDados = activeMotorista ? motoristaMap.get(activeMotorista) : null;

  return (
    <div className="space-y-4">
      <div className="bg-slate-300 p-4 flex gap-4 overflow-x-auto shadow-inner rounded-xl border border-slate-400">
        {[
          { l: 'Valor Total', v: kpis.totalValor, c: true },
          { l: 'Valor Progresso', v: kpis.valorProgresso, c: true },
          { l: 'Valor Cruzeiro', v: kpis.valorCruzeiro, c: true },
          { l: 'Total Multas', v: kpis.totalMultas },
          { l: 'Progresso', v: kpis.totalProgresso },
          { l: 'Cruzeiro', v: kpis.totalCruzeiro }
        ].map((k, i) => (
          <div key={i} className="bg-slate-200 border-2 border-slate-400 rounded p-4 text-center min-w-[120px] flex-1 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase">{k.l}</p>
            <p className="text-xl font-black text-slate-800 mt-1">{k.c ? formatCurrency(k.v) : k.v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-64 flex flex-col gap-4">
          <div className="bg-slate-300 p-3 rounded-xl border border-slate-400 space-y-4 shadow-sm">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Empresa</label>
              <select value={empresaFilter} onChange={e => setEmpresaFilter(e.target.value)} className="w-full text-xs p-1.5 rounded border border-slate-400">
                <option value="Todas">Todas</option>
                <option value="PROGRESSO">PROGRESSO</option>
                <option value="CRUZEIRO">CRUZEIRO</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase text-center block border-b border-slate-400 pb-1">Setor</label>
              <select value={activeSetor || 'Todos'} onChange={e => setActiveSetor(e.target.value === 'Todos' ? null : e.target.value)} className="w-full text-xs p-1.5 rounded bg-slate-100 border border-slate-400">
                {setoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
               <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Período</label>
               <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full text-xs p-1 rounded border mb-1" />
               <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full text-xs p-1 rounded border" />
            </div>
          </div>

          {(activeMotorista || activeTerminal || activeSetor || activeCodigo) && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl shadow-sm text-sm space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                 <h3 className="font-bold text-blue-900 flex items-center gap-1 text-xs uppercase leading-none"><Search size={12}/> FILTRO ATIVO</h3>
                 <button onClick={clearCrossFilters} className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black hover:bg-red-200">LIMPAR</button>
              </div>
              {activeMotorista && (
                <div className="bg-white p-2 rounded border border-blue-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Motorista</p>
                  <p className="font-black text-blue-900 truncate text-xs">{motoristaAtivoDados?.nome || activeMotorista}</p>
                  {motoristaAtivoDados && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <span className="text-[8px] bg-slate-100 px-1 rounded font-bold">{motoristaAtivoDados.filial}</span>
                      <span className={`text-[8px] px-1 rounded font-black ${motoristaAtivoDados.status.includes('ATIVO') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{motoristaAtivoDados.status}</span>
                    </div>
                  )}
                </div>
              )}
              {activeTerminal && <div className="bg-white p-2 rounded border border-blue-100 text-[9px] font-bold uppercase text-blue-900">Terminal: {activeTerminal}</div>}
              {activeSetor && <div className="bg-white p-2 rounded border border-blue-100 text-[9px] font-bold uppercase text-blue-900">Setor: {activeSetor}</div>}
              {activeCodigo && <div className="bg-white p-2 rounded border border-blue-100 text-[9px] font-bold uppercase text-blue-900">Infração: {activeCodigo}</div>}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[280px]">
             <div className="bg-slate-200 border-2 border-slate-400 rounded-xl p-3 flex flex-col shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-600 uppercase text-center mb-2 tracking-tighter">Quantitativo Mensal</h4>
                <div className="flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartDataMensal}><XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} /><Tooltip/><Bar dataKey="Atual" fill="#0f172a" /><Bar dataKey="Anterior" fill="#94a3b8" /></BarChart></ResponsiveContainer></div>
             </div>
             <div className="bg-slate-200 border-2 border-slate-400 rounded-xl p-3 flex flex-col shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-600 uppercase text-center mb-2 tracking-tighter">Por Código</h4>
                <div className="flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartCodigo}><XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} /><Tooltip/><Bar dataKey="count" fill="#0369a1" onClick={(e: any) => setActiveCodigo(e?.name || e?.activeLabel)} className="cursor-pointer" /></BarChart></ResponsiveContainer></div>
             </div>
             <div className="bg-slate-200 border-2 border-slate-400 rounded-xl p-3 flex flex-col shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-600 uppercase text-center mb-2 tracking-tighter">Por Terminal</h4>
                <div className="flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartTerminal} layout="vertical"><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{fontSize: 8}} width={80} interval={0} axisLine={false} /><Tooltip/><Bar dataKey="count" fill="#0369a1" onClick={(e: any) => setActiveTerminal(e?.name)} className="cursor-pointer" /></BarChart></ResponsiveContainer></div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[350px]">
             <div className="bg-slate-200 border-2 border-slate-400 rounded-xl p-3 flex flex-col shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-600 uppercase text-center mb-2 tracking-tighter">Por Setor</h4>
                <div className="flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartSetor} layout="vertical" margin={{left: 20}}><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{fontSize: 8}} width={90} interval={0} axisLine={false} /><Tooltip/><Bar dataKey="count" fill="#0369a1" onClick={(e: any) => setActiveSetor(e?.name)} className="cursor-pointer" /></BarChart></ResponsiveContainer></div>
             </div>
             <div className="bg-slate-200 border-2 border-slate-400 rounded-xl p-3 flex flex-col shadow-sm">
                <h4 className="text-[10px] font-bold text-slate-600 uppercase text-center mb-2 tracking-tighter">Por Motorista</h4>
                <div className="flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartMotorista} layout="vertical"><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{fontSize: 8}} width={60} interval={0} axisLine={false} /><Tooltip/><Bar dataKey="count" fill="#0369a1" onClick={(e: any) => setActiveMotorista(e?.name)} className="cursor-pointer" /></BarChart></ResponsiveContainer></div>
             </div>
             <div className="bg-white border-2 border-slate-400 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="bg-[#002f4b] text-white text-[10px] font-black grid grid-cols-12 p-2 text-center sticky top-0 z-10">
                   <div className="col-span-3">Data</div><div className="col-span-6">Descrição</div><div className="col-span-3">Auto</div>
                </div>
                <div className="overflow-y-auto flex-1 text-[9px] text-slate-700 p-1 space-y-1 bg-slate-50">
                   {filteredMultas.map(m => (
                    <div key={m.id} className="grid grid-cols-12 gap-1 border-b pb-1 hover:bg-white transition-colors cursor-default">
                       <div className="col-span-3 font-mono text-[8px] leading-tight pt-1">{m.dataHora}</div>
                       <div className="col-span-6 leading-tight font-medium text-slate-800">{codeDescriptionMap.get(m.codigoInfracao) || m.descricaoInfracao}</div>
                       <div className="col-span-3 text-center font-black text-slate-900 pt-1">{m.autoInfracao}</div>
                    </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
