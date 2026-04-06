import { useState, useMemo } from 'react';
import { Search, FileDown, User, MapPin, Briefcase, Calendar, X, BarChart2 } from 'lucide-react';
import { Motorista, Ocorrencia, MultaTransito } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface ConsultDriverScreenProps {
  motoristas: Motorista[];
  ocorrencias: Ocorrencia[];
  multasTransito?: MultaTransito[];
}

const COLORS = ['#10b981', '#ef4444', '#f97316'];

const DriverChartsModal = ({ motorista, ocorrencias, multasTransito, onClose }: { motorista: Motorista; ocorrencias: Ocorrencia[]; multasTransito: MultaTransito[]; onClose: () => void }) => {
  const multasDoMotorista = multasTransito.filter(m => m.matriculaMotorista === motorista.matricula);
  const mOccs = ocorrencias.filter(o => o.matriculaMotorista === motorista.matricula);

  const pieData = useMemo(() => {
    const atrasos = mOccs.filter(o => o.statusInicio === 'Atraso' || o.statusFim === 'Atraso').length;
    const adiantamentos = mOccs.filter(o => (o.statusInicio === 'Adiantamento' || o.statusFim === 'Adiantamento') && !(o.statusInicio === 'Atraso' || o.statusFim === 'Atraso')).length;
    const pontuais = mOccs.length - atrasos - adiantamentos;
    return [
      { name: 'Pontual', value: pontuais },
      { name: 'Atraso', value: atrasos },
      { name: 'Adiantamento', value: adiantamentos },
    ].filter(d => d.value > 0);
  }, [mOccs]);

  const dailyData = useMemo(() => {
    const days: Record<string, { pontual: number; atraso: number; adiantamento: number }> = {};
    mOccs.forEach(o => {
      const day = o.prevInicio.split(' ')[0];
      if (!days[day]) days[day] = { pontual: 0, atraso: 0, adiantamento: 0 };
      const isAtraso = o.statusInicio === 'Atraso' || o.statusFim === 'Atraso';
      const isAdiantamento = (o.statusInicio === 'Adiantamento' || o.statusFim === 'Adiantamento') && !isAtraso;
      if (isAtraso) days[day].atraso++;
      else if (isAdiantamento) days[day].adiantamento++;
      else days[day].pontual++;
    });
    return Object.entries(days)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, data]) => ({ day: day.substring(0, 5), ...data }));
  }, [mOccs]);

  const linhaData = useMemo(() => {
    const linhas: Record<string, { atraso: number; total: number; nome: string }> = {};
    mOccs.forEach(o => {
      if (!linhas[o.numeroLinha]) linhas[o.numeroLinha] = { atraso: 0, total: 0, nome: o.nomeLinha };
      linhas[o.numeroLinha].total++;
      if (o.statusInicio === 'Atraso' || o.statusFim === 'Atraso') linhas[o.numeroLinha].atraso++;
    });
    return Object.entries(linhas)
      .map(([cod, d]) => ({ name: `${cod} - ${d.nome}`.substring(0, 30), atraso: d.atraso, total: d.total }))
      .sort((a, b) => b.atraso - a.atraso)
      .slice(0, 8);
  }, [mOccs]);

  const total = mOccs.length;
  const atrasos = mOccs.filter(o => o.statusInicio === 'Atraso' || o.statusFim === 'Atraso').length;
  const percPontual = total > 0 ? ((total - atrasos) / total * 100).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-card shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-900 p-6 text-white rounded-t-2xl flex justify-between items-center sticky top-0 z-10">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Relatório Gráfico</p>
            <h2 className="text-xl font-black">{motorista.nome}</h2>
            <p className="text-slate-400 text-xs font-mono mt-0.5">{motorista.matricula} • {motorista.filial} • {motorista.area}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-card text-center">
              <p className="text-2xs font-bold text-slate-400 uppercase">Total Viagens</p>
              <p className="text-3xl font-black text-slate-800">{total}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-card text-center">
              <p className="text-2xs font-bold text-emerald-600 uppercase">Pontualidade</p>
              <p className="text-3xl font-black text-emerald-600">{percPontual}%</p>
            </div>
            <div className="bg-red-50 p-4 rounded-card text-center">
              <p className="text-2xs font-bold text-red-500 uppercase">Atrasos</p>
              <p className="text-3xl font-black text-red-600">{atrasos}</p>
            </div>
          </div>

          {/* Pizza + Barras por dia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-card p-5 shadow-card">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Distribuição de Status</h4>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-card p-5 shadow-card">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Ocorrências por Dia</h4>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyData} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend iconType="circle" />
                    <Bar dataKey="pontual" stackId="a" fill="#10b981" name="Pontual" />
                    <Bar dataKey="atraso" stackId="a" fill="#ef4444" name="Atraso" />
                    <Bar dataKey="adiantamento" stackId="a" fill="#f97316" name="Adiantamento" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
              )}
            </div>
          </div>

          {/* Atrasos por linha */}
          {linhaData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-card p-5 shadow-card">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Atrasos por Linha (Top 8)</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={linhaData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={180} interval={0} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="atraso" fill="#ef4444" name="Atrasos" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Histórico de Multas de Trânsito */}
          <div className="bg-white border border-gray-200 rounded-card p-5 shadow-card">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">
              Histórico de Multas de Trânsito ({multasDoMotorista.length})
            </h4>
            {multasDoMotorista.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800 text-white sticky top-0">
                    <tr className="text-2xs uppercase tracking-wide">
                      <th className="px-3 py-2.5 font-bold text-left">Data</th>
                      <th className="px-3 py-2.5 font-bold text-left">Veículo</th>
                      <th className="px-3 py-2.5 font-bold text-left">Órgão</th>
                      <th className="px-3 py-2.5 font-bold text-left">Infração</th>
                      <th className="px-3 py-2.5 font-bold text-left">Vl. Cobrado</th>
                      <th className="px-3 py-2.5 font-bold text-left">Vl. Recuperado</th>
                      <th className="px-3 py-2.5 font-bold text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {multasDoMotorista.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                        <td className="px-3 py-2 font-mono">{m.dataInfracao}</td>
                        <td className="px-3 py-2 font-bold">{m.veiculo}</td>
                        <td className="px-3 py-2">{m.orgaoAtuador}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate">{m.descricaoMulta}</td>
                        <td className="px-3 py-2 font-bold text-red-600">R$ {m.valorCobrado.toFixed(2)}</td>
                        <td className="px-3 py-2 font-bold text-emerald-600">R$ {m.valorRecuperado.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-2xs font-black ${
                            m.status === 'Pago' ? 'bg-green-100 text-green-700' :
                            m.status === 'Cancelado' ? 'bg-gray-100 text-gray-600' :
                            m.status === 'Defesa' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>{m.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-2xs text-slate-400 text-center py-4">Nenhuma multa de trânsito registrada para este motorista.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ConsultDriverScreen({ motoristas, ocorrencias, multasTransito = [] }: ConsultDriverScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filialFilter, setFilialFilter] = useState('Todas');
  const [areaFilter, setAreaFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [dataInicio, setDataInicio] = useState('2026-03-18');
  const [dataFim, setDataFim] = useState('2026-03-18');
  const [selectedDriverChart, setSelectedDriverChart] = useState<Motorista | null>(null);

  const filiais = useMemo(() => ['Todas', ...Array.from(new Set(motoristas.map(m => m.filial)))], [motoristas]);
  const areas = useMemo(() => ['Todas', ...Array.from(new Set(motoristas.map(m => m.area)))], [motoristas]);
  const statuses = ['Todos', 'ATIVO - EM OPERAÇÃO', 'DESLIGADO', 'INSS', 'INSTRUTOR'];

  const filteredMotoristas = useMemo(() => {
    return motoristas.filter(m => {
      const matchSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || m.matricula.includes(searchTerm);
      const matchFilial = filialFilter === 'Todas' || m.filial === filialFilter;
      const matchArea = areaFilter === 'Todas' || m.area === areaFilter;
      const matchStatus = statusFilter === 'Todos' || m.status === statusFilter;
      return matchSearch && matchFilial && matchArea && matchStatus;
    });
  }, [motoristas, searchTerm, filialFilter, areaFilter, statusFilter]);

  const generatePDF = (motorista: Motorista) => {
    const doc = new jsPDF();
    const driverOccurrences = ocorrencias.filter(o => o.matriculaMotorista === motorista.matricula);

    const total = driverOccurrences.length;
    const atrasos = driverOccurrences.filter(o => o.statusInicio === 'Atraso' || o.statusFim === 'Atraso').length;
    const adiantamentos = driverOccurrences.filter(o => (o.statusInicio === 'Adiantamento' || o.statusFim === 'Adiantamento') && !(o.statusInicio === 'Atraso' || o.statusFim === 'Atraso')).length;
    const pontuais = total - atrasos - adiantamentos;
    const percPontual = total > 0 ? (pontuais / total) * 100 : 0;
    const isMediaPontual = percPontual >= 75;

    doc.setFontSize(18);
    doc.text(`Relatório de Pontualidade - ${motorista.nome}`, 14, 20);

    doc.setFontSize(12);
    doc.text(`Matrícula: ${motorista.matricula} | Filial: ${motorista.filial} | Área: ${motorista.area}`, 14, 30);
    doc.text(`Período: ${dataInicio} a ${dataFim}`, 14, 37);

    doc.setFontSize(14);
    doc.text('Resumo de Performance', 14, 50);

    autoTable(doc, {
      startY: 55,
      head: [['Métrica', 'Quantidade', 'Porcentagem']],
      body: [
        ['Pontual (No Horário)', pontuais, `${percPontual.toFixed(1)}%`],
        ['Atrasos (> 5min)', atrasos, `${total > 0 ? ((atrasos/total)*100).toFixed(1) : 0}%`],
        ['Adiantamentos (> 15min)', adiantamentos, `${total > 0 ? ((adiantamentos/total)*100).toFixed(1) : 0}%`],
        ['Total de Viagens', total, '100%']
      ],
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] }
    });

    doc.text(`Classificação: ${isMediaPontual ? 'MOTORISTA PONTUAL' : 'ABAIXO DA MÉDIA'}`, 14, (doc as any).lastAutoTable.finalY + 15);
    doc.text('Performance por Dia', 14, (doc as any).lastAutoTable.finalY + 30);

    const dayMap: Record<string, { total: number, pontual: number }> = {};
    driverOccurrences.forEach(o => {
      const day = o.prevInicio.split(' ')[0];
      if (!dayMap[day]) dayMap[day] = { total: 0, pontual: 0 };
      dayMap[day].total++;
      if (o.statusInicio === 'No Horário') dayMap[day].pontual++;
    });

    const dayBody = Object.entries(dayMap).map(([day, stats]) => [
      day, stats.total, `${((stats.pontual / stats.total) * 100).toFixed(0)}%`
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 35,
      head: [['Data', 'Total Viagens', '% Pontualidade']],
      body: dayBody,
      theme: 'striped'
    });

    doc.text('Detalhamento de Viagens', 14, (doc as any).lastAutoTable.finalY + 15);

    const tableBody = driverOccurrences.map(o => [
      o.prevInicio.split(' ')[1],
      o.numeroLinha,
      o.atendimento,
      o.sentido,
      o.statusInicio,
      o.realInicio.split(' ')[1],
      o.motivoAtraso || '-'
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Hora Prev', 'Linha', 'Atend.', 'Sent.', 'Status', 'Realizado', 'Motivo']],
      body: tableBody,
      styles: { fontSize: 8 }
    });

    doc.save(`Relatorio_${motorista.matricula}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-6 rounded-card border border-gray-200 shadow-card flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center gap-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-red-500" />
            <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Período do Relatório</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input
                id="dr-data-inicio"
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                aria-label="Data de início do período"
                className="pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
            <span className="text-gray-400">até</span>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input
                id="dr-data-fim"
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                aria-label="Data de fim do período"
                className="pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1 relative">
            <label htmlFor="dr-search" className="text-2xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Nome ou Matrícula</label>
            <div className="relative">
              <input
                id="dr-search"
                type="text"
                placeholder="Ex: 26646..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar motorista por nome ou matrícula"
                className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            </div>
          </div>
          <div>
            <label htmlFor="dr-filial" className="text-2xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Filial</label>
            <select id="dr-filial" value={filialFilter} onChange={(e) => setFilialFilter(e.target.value)} aria-label="Filtrar por filial" className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none">
              {filiais.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dr-area" className="text-2xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Área</label>
            <select id="dr-area" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} aria-label="Filtrar por área" className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none">
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dr-status" className="text-2xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Status</label>
            <select id="dr-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrar por status" className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none">
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMotoristas.map(m => {
          const mOccs = ocorrencias.filter(o => o.matriculaMotorista === m.matricula);
          const pontuais = mOccs.filter(o => o.statusInicio === 'No Horário' && o.statusFim === 'No Horário').length;
          const perc = mOccs.length > 0 ? (pontuais / mOccs.length) * 100 : 0;

          return (
            <div key={m.matricula} className="bg-white rounded-card border border-gray-200 p-5 shadow-card hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                    <User size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 leading-tight">{m.nome}</h4>
                    <p className="text-xs text-gray-500 font-medium">Matrícula: {m.matricula}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedDriverChart(m)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Ver Gráficos"
                    aria-label={`Ver gráficos de ${m.nome}`}
                  >
                    <BarChart2 size={18} />
                  </button>
                  <button
                    onClick={() => generatePDF(m)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Gerar Relatório PDF"
                    aria-label={`Gerar PDF de ${m.nome}`}
                  >
                    <FileDown size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin size={14} className="text-slate-400" /> {m.filial}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Briefcase size={14} className="text-slate-400" /> {m.area}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider
                    ${m.status === 'ATIVO - EM OPERAÇÃO' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {m.status}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-2xs font-black text-slate-400 uppercase tracking-tighter">Média Pontualidade</p>
                    <p className={`text-2xl font-black ${perc >= 75 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {perc.toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xs font-black text-slate-400 uppercase tracking-tighter">Viagens</p>
                    <p className="text-lg font-bold text-slate-700">{mOccs.length}</p>
                  </div>
                </div>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${perc >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${perc}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedDriverChart && (
        <DriverChartsModal
          motorista={selectedDriverChart}
          ocorrencias={ocorrencias}
          multasTransito={multasTransito}
          onClose={() => setSelectedDriverChart(null)}
        />
      )}
    </div>
  );
}
