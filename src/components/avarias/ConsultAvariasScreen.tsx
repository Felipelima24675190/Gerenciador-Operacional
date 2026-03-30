import React, { useMemo, useState, useEffect } from 'react';
import { Avaria, Motorista, UserRole, ResumoAvaria } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { subDays, format } from 'date-fns';
import { X, Edit3, Save } from 'lucide-react';

interface ConsultAvariasScreenProps {
  avarias: Avaria[];
  setAvarias: React.Dispatch<React.SetStateAction<Avaria[]>>;
  motoristas: Motorista[];
  userRole?: UserRole;
  resumos: ResumoAvaria[];
  setResumos: React.Dispatch<React.SetStateAction<ResumoAvaria[]>>;
}

const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AvariaDetailModal = ({ group, motoristasMap, onClose, onSave }: { group: Avaria[], motoristasMap: Map<string, Motorista>, onClose: () => void, onSave: (a: Avaria) => void }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Avaria>>({});

  const handleEditClick = (avaria: Avaria) => {
    setEditingId(avaria.id);
    setEditForm({ ...avaria });
  };

  const handleSave = () => {
    if (editingId && editForm) {
      onSave(editForm as Avaria);
      setEditingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white rounded-t-xl">
          <div>
            <h3 className="text-xl font-black">Detalhes das Avarias</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Veículo: {group[0].veiculo} • Data: {group[0].data}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="space-y-4">
            {group.map((avaria, index) => {
              const isEditing = editingId === avaria.id;

              return (
                <div key={avaria.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input className="text-sm font-bold border rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 w-full mb-1" value={editForm.tipoAvaria || ''} onChange={e => setEditForm({...editForm, tipoAvaria: e.target.value})} placeholder="Tipo de Avaria" />
                        ) : (
                          <h4 className="text-base font-black text-slate-800 break-words">{avaria.tipoAvaria}</h4>
                        )}
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Motorista: {motoristasMap.get(avaria.matriculaMotorista)?.nome || avaria.matriculaMotorista} ({avaria.matriculaMotorista})</p>
                      </div>
                    </div>
                    {isEditing ? (
                      <button onClick={handleSave} className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors ml-4 shrink-0"><Save size={14}/> Salvar</button>
                    ) : (
                      <button onClick={() => handleEditClick(avaria)} className="flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors ml-4 shrink-0"><Edit3 size={14}/> Editar</button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                     <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status Globus</p>
                        {isEditing ? (
                          <select className="w-full text-xs font-bold border rounded p-1" value={editForm.lancadoNoGlobus || ''} onChange={e => setEditForm({...editForm, lancadoNoGlobus: e.target.value})}>
                            <option value="SIM">SIM</option>
                            <option value="NÃO">NÃO</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 text-[9px] font-black rounded uppercase ${avaria.lancadoNoGlobus === 'SIM' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {avaria.lancadoNoGlobus === 'SIM' ? 'LANÇADO' : 'PENDENTE'}
                          </span>
                        )}
                     </div>

                     <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Culpado?</p>
                        {isEditing ? (
                          <select className="w-full text-xs font-bold border rounded p-1" value={editForm.motoristaCulpado || ''} onChange={e => setEditForm({...editForm, motoristaCulpado: e.target.value})}>
                            <option value="SIM">SIM</option>
                            <option value="NÃO">NÃO</option>
                          </select>
                        ) : (
                          <p className="font-bold text-slate-700">{avaria.motoristaCulpado}</p>
                        )}
                     </div>

                     <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Avaria</p>
                        {isEditing ? (
                           <input type="number" className="w-full text-xs font-bold border rounded p-1" value={editForm.valorAvaria || ''} onChange={e => setEditForm({...editForm, valorAvaria: parseFloat(e.target.value) || 0})} />
                        ) : (
                           <p className="font-black text-red-600">{formatCurrency(avaria.valorAvaria)}</p>
                        )}
                     </div>

                     <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Cobrado</p>
                        {isEditing ? (
                           <input type="number" className="w-full text-xs font-bold border rounded p-1" value={editForm.valorCobrado || ''} onChange={e => setEditForm({...editForm, valorCobrado: parseFloat(e.target.value) || 0})} />
                        ) : (
                           <p className="font-black text-emerald-600">{formatCurrency(avaria.valorCobrado)}</p>
                        )}
                     </div>
                  </div>

                  {(avaria.descricaoAvaria || avaria.tipoAvaria || avaria.causaAvaria || avaria.acaoTomada) && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {avaria.descricaoAvaria && (
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Descrição</p>
                          <p className="text-xs text-slate-700">{avaria.descricaoAvaria}</p>
                        </div>
                      )}
                      {avaria.tipoAvaria && (
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Avaria</p>
                          <p className="text-xs font-bold text-slate-700">{avaria.tipoAvaria}</p>
                        </div>
                      )}
                      {avaria.causaAvaria && (
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Causa</p>
                          <p className="text-xs text-slate-700">{avaria.causaAvaria}</p>
                        </div>
                      )}
                      {avaria.acaoTomada && avaria.causaAvaria && (
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ação Tomada</p>
                          <p className="text-xs text-slate-700">{avaria.acaoTomada}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ConsultAvariasScreen({ avarias, setAvarias, motoristas, resumos, setResumos }: ConsultAvariasScreenProps) {
  // Auto-detect date range from actual data
  const defaultDates = useMemo(() => {
    if (avarias.length === 0) return { start: format(subDays(new Date(), 90), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') };
    let minDate = new Date(9999, 0, 1);
    let maxDate = new Date(1970, 0, 1);
    avarias.forEach(a => {
      try {
        const [d, m, y] = a.data.split('/').map(Number);
        const dt = new Date(y, m - 1, d);
        if (dt < minDate) minDate = dt;
        if (dt > maxDate) maxDate = dt;
      } catch {}
    });
    return { start: format(minDate, 'yyyy-MM-dd'), end: format(maxDate, 'yyyy-MM-dd') };
  }, [avarias]);

  const [dataInicio, setDataInicio] = useState(defaultDates.start);
  const [dataFim, setDataFim] = useState(defaultDates.end);

  // Sync dates when avarias load asynchronously
  useEffect(() => {
    setDataInicio(defaultDates.start);
    setDataFim(defaultDates.end);
  }, [defaultDates.start, defaultDates.end]);
  const [selectedGroup, setSelectedGroup] = useState<Avaria[] | null>(null);
  const [editingResumoKey, setEditingResumoKey] = useState<string | null>(null);
  const [editResumoForm, setEditResumoForm] = useState<Partial<ResumoAvaria>>({});

  const motoristaMap = useMemo(() => new Map(motoristas.map(m => [m.matricula, m])), [motoristas]);

  const filteredAvarias = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');

    return avarias.filter(a => {
      try {
          const [day, month, year] = a.data.split('/').map(Number);
          const avariaDate = new Date(year, month - 1, day);
          return avariaDate >= start && avariaDate <= end;
      } catch (e) { return false; }
    });
  }, [avarias, dataInicio, dataFim]);

  const kpis = useMemo(() => {
    let valorTotal = 0;
    let valorRecuperado = 0;
    const filiaisCount: Record<string, number> = {};

    filteredAvarias.forEach(a => {
      valorTotal += a.valorAvaria;
      valorRecuperado += a.valorCobrado;

      if (a.matriculaMotorista !== 'Não Identificado') {
        const motorista = motoristaMap.get(a.matriculaMotorista);
        if (motorista && motorista.filial && motorista.filial !== 'Desconhecida') {
          filiaisCount[motorista.filial] = (filiaisCount[motorista.filial] || 0) + 1;
        }
      }
    });

    const valorNaoRecuperado = Math.max(0, valorTotal - valorRecuperado);
    const percRecuperado = valorTotal > 0 ? ((valorRecuperado / valorTotal) * 100).toFixed(1) : '0.0';
    const percNaoRecuperado = valorTotal > 0 ? ((valorNaoRecuperado / valorTotal) * 100).toFixed(1) : '0.0';

    const sortedFiliais = Object.entries(filiaisCount).sort((a,b) => b[1] - a[1]);
    const topFilial = sortedFiliais.length > 0 ? sortedFiliais[0][0] : 'Sem Dados';

    return { valorTotal, valorRecuperado, valorNaoRecuperado, percRecuperado, percNaoRecuperado, topFilial, totalCount: filteredAvarias.length };
  }, [filteredAvarias, motoristaMap]);

  const topStats = useMemo(() => {
    const countsVeiculos: Record<string, number> = {};
    let totalFrontal = 0, totalLateral = 0, totalTraseira = 0, totalOutro = 0;
    let valorFrontal = 0, valorLateral = 0, valorTraseira = 0, valorOutro = 0;

    // Group avarias por veiculo+data (same as groupedAvarias logic)
    const groupMap = new Map<string, Avaria[]>();
    filteredAvarias.forEach(a => {
      const key = `${a.data}_${a.veiculo}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(a);
      countsVeiculos[a.veiculo] = (countsVeiculos[a.veiculo] || 0) + 1;
    });

    groupMap.forEach((group, key) => {
      const resumo = resumos.find(r => r.key === key);
      const groupValor = group.reduce((s, a) => s + a.valorAvaria, 0);
      const front = parseFloat(resumo?.frontal || '0') || 0;
      const lat = parseFloat(resumo?.lateral || '0') || 0;
      const tras = parseFloat(resumo?.traseira || '0') || 0;
      const total = front + lat + tras;

      if (total > 0) {
        totalFrontal += front;
        totalLateral += lat;
        totalTraseira += tras;
        const share = (loc: number) => total > 0 ? (loc / total) * groupValor : 0;
        valorFrontal += share(front);
        valorLateral += share(lat);
        valorTraseira += share(tras);
      } else {
        totalOutro += group.length;
        valorOutro += groupValor;
      }
    });

    const byCount = [
      { name: 'Frontal', count: totalFrontal },
      { name: 'Lateral', count: totalLateral },
      { name: 'Traseira', count: totalTraseira },
      ...(totalOutro > 0 ? [{ name: 'Sem Local', count: totalOutro }] : []),
    ].filter(d => d.count > 0);

    const byValue = [
      { name: 'Frontal', valor: valorFrontal },
      { name: 'Lateral', valor: valorLateral },
      { name: 'Traseira', valor: valorTraseira },
      ...(valorOutro > 0 ? [{ name: 'Sem Local', valor: valorOutro }] : []),
    ].filter(d => d.valor > 0);

    const topVeiculos = Object.entries(countsVeiculos).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5);

    return { byCount, byValue, topVeiculos };
  }, [filteredAvarias, resumos]);

  const chartDataMensal = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const monthlyCounts: Record<string, { Atual: number; Anterior: number }> = {};
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    months.forEach(month => { monthlyCounts[month] = { Atual: 0, Anterior: 0 }; });

    avarias.forEach(a => {
      try {
        const [day, month, year] = a.data.split('/').map(Number);
        const avariaDate = new Date(year, month - 1, day);
        const aYear = avariaDate.getFullYear();
        const aMonthName = months[avariaDate.getMonth()];
        if (aYear === currentYear) monthlyCounts[aMonthName].Atual++;
        else if (aYear === previousYear) monthlyCounts[aMonthName].Anterior++;
      } catch(e) {}
    });

    return months.map(month => ({ name: month, Atual: monthlyCounts[month].Atual, Anterior: monthlyCounts[month].Anterior }));
  }, [avarias]);

  const groupedAvarias = useMemo(() => {
    const groups = new Map<string, Avaria[]>();
    filteredAvarias.forEach(a => {
      const key = `${a.data}_${a.veiculo}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    });
    return Array.from(groups.values()).sort((a, b) => b[0].data.localeCompare(a[0].data));
  }, [filteredAvarias]);

  const getResumo = (key: string): ResumoAvaria => {
    return resumos.find(r => r.key === key) || { key, tipoAvaria: '', frontal: '', lateral: '', traseira: '' };
  };

  const handleStartEditResumo = (key: string) => {
    setEditingResumoKey(key);
    setEditResumoForm({ ...getResumo(key) });
  };

  const handleSaveResumo = () => {
    if (!editingResumoKey || !editResumoForm) return;
    const updated: ResumoAvaria = { key: editingResumoKey, tipoAvaria: editResumoForm.tipoAvaria || '', frontal: editResumoForm.frontal || '', lateral: editResumoForm.lateral || '', traseira: editResumoForm.traseira || '' };
    setResumos(prev => {
      const exists = prev.find(r => r.key === editingResumoKey);
      if (exists) return prev.map(r => r.key === editingResumoKey ? updated : r);
      return [...prev, updated];
    });
    setEditingResumoKey(null);
  };

  const handleUpdateAvaria = (updated: Avaria) => {
    setAvarias(prev => prev.map(a => a.id === updated.id ? updated : a));
    if (selectedGroup) setSelectedGroup(prev => prev ? prev.map(a => a.id === updated.id ? updated : a) : null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
        <div className="flex-1 max-w-xs"><label className="text-[10px] font-bold text-slate-400 uppercase">Data Início</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-blue-500" /></div>
        <div className="flex-1 max-w-xs"><label className="text-[10px] font-bold text-slate-400 uppercase">Data Fim</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-blue-500" /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm"><p className="text-[10px] font-bold text-blue-500 uppercase">Valor Total Avarias</p><p className="text-2xl font-black text-blue-900 mt-1">{formatCurrency(kpis.valorTotal)}</p></div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm"><p className="text-[10px] font-bold text-emerald-600 uppercase">Recuperado (Cobrado)</p><p className="text-2xl font-black text-emerald-900 mt-1">{formatCurrency(kpis.valorRecuperado)}</p><p className="text-[10px] text-emerald-600 font-bold">{kpis.percRecuperado}% recuperado</p></div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm"><p className="text-[10px] font-bold text-red-500 uppercase">Não Recuperado</p><p className="text-2xl font-black text-red-900 mt-1">{formatCurrency(kpis.valorNaoRecuperado)}</p><p className="text-[10px] text-red-600 font-bold">{kpis.percNaoRecuperado}% prejuízo</p></div>
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg text-white flex flex-col justify-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Filial Crítica</p>
          <p className="text-2xl font-black mt-1">{kpis.topFilial}</p>
          <p className="text-[9px] text-slate-500 mt-1 uppercase">*Apenas Identificados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm"><h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4">Top 5 - Veículos</h4><ResponsiveContainer width="100%" height={250}><BarChart data={topStats.topVeiculos} layout="vertical" margin={{ left: 10, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9}} width={60} interval={0} /><Tooltip cursor={{fill: '#f1f5f9'}} /><Bar dataKey="count" fill="#f59e0b" radius={[0,2,2,0]} barSize={15} label={{ position: 'right', fontSize: 10 }} /></BarChart></ResponsiveContainer></div>
        <div className="bg-white p-6 rounded-xl border shadow-sm"><h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4">Top 5 - Tipos (Qtd)</h4><ResponsiveContainer width="100%" height={250}><BarChart data={topStats.byCount} layout="vertical" margin={{ left: 10, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9}} width={100} interval={0} /><Tooltip cursor={{fill: '#f1f5f9'}} /><Bar dataKey="count" fill="#3b82f6" radius={[0,2,2,0]} barSize={15} label={{ position: 'right', fontSize: 10 }} /></BarChart></ResponsiveContainer></div>
        <div className="bg-white p-6 rounded-xl border shadow-sm"><h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4">Top 5 - Tipos (Prejuízo)</h4><ResponsiveContainer width="100%" height={250}><BarChart data={topStats.byValue} layout="vertical" margin={{ left: 10, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9}} width={100} interval={0} /><Tooltip cursor={{fill: '#f1f5f9'}} formatter={(val: number) => formatCurrency(val)} /><Bar dataKey="valor" fill="#ef4444" radius={[0,2,2,0]} barSize={15} label={{ position: 'right', fontSize: 10, formatter: (v: number) => `R$${Math.floor(v)}` }} /></BarChart></ResponsiveContainer></div>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm"><h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4">Tendência Mensal</h4><ResponsiveContainer width="100%" height={300}><LineChart data={chartDataMensal} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="Atual" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} /><Line type="monotone" dataKey="Anterior" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} /></LineChart></ResponsiveContainer></div>

      {/* Tabela principal com resumo editável */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800 uppercase">Avarias por Ocorrência</h3>
          <span className="text-xs font-bold bg-white border px-3 py-1 rounded text-slate-500">{groupedAvarias.length} ocorrências</span>
        </div>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">Data</th>
                <th className="p-4">Veículo</th>
                <th className="p-4">Motorista</th>
                <th className="p-4">Tipo de Avaria</th>
                <th className="p-4 text-center">Frontal</th>
                <th className="p-4 text-center">Lateral</th>
                <th className="p-4 text-center">Traseira</th>
                <th className="p-4 text-center">Total</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {groupedAvarias.map(group => {
                const a = group[0];
                const key = `${a.data}_${a.veiculo}`;
                const resumo = getResumo(key);
                const totalValor = group.reduce((sum, it) => sum + it.valorAvaria, 0);
                const isEditing = editingResumoKey === key;

                // Calcular total como soma dos campos de localização (se preenchidos como números)
                const frontalNum = parseFloat(resumo.frontal) || 0;
                const lateralNum = parseFloat(resumo.lateral) || 0;
                const traseiraNum = parseFloat(resumo.traseira) || 0;
                const totalLocal = frontalNum + lateralNum + traseiraNum;

                return (
                  <tr key={key} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-xs">{a.data}</td>
                    <td className="p-4 font-bold text-blue-900 text-lg">{a.veiculo}</td>
                    <td className="p-4"><p className="font-bold text-slate-800 text-xs">{motoristaMap.get(a.matriculaMotorista)?.nome || a.matriculaMotorista}</p></td>
                    <td className="p-4 max-w-[180px]">
                      {isEditing ? (
                        <input
                          className="w-full text-xs font-bold border border-blue-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                          value={editResumoForm.tipoAvaria || ''}
                          onChange={e => setEditResumoForm({...editResumoForm, tipoAvaria: e.target.value})}
                          placeholder="Tipo..."
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700">{resumo.tipoAvaria || <span className="text-slate-300 italic">—</span>}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {isEditing ? (
                        <input className="w-16 text-xs text-center border border-blue-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500" value={editResumoForm.frontal || ''} onChange={e => setEditResumoForm({...editResumoForm, frontal: e.target.value})} placeholder="0" />
                      ) : (
                        <span className="text-xs font-bold text-slate-600">{resumo.frontal || '—'}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {isEditing ? (
                        <input className="w-16 text-xs text-center border border-blue-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500" value={editResumoForm.lateral || ''} onChange={e => setEditResumoForm({...editResumoForm, lateral: e.target.value})} placeholder="0" />
                      ) : (
                        <span className="text-xs font-bold text-slate-600">{resumo.lateral || '—'}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {isEditing ? (
                        <input className="w-16 text-xs text-center border border-blue-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500" value={editResumoForm.traseira || ''} onChange={e => setEditResumoForm({...editResumoForm, traseira: e.target.value})} placeholder="0" />
                      ) : (
                        <span className="text-xs font-bold text-slate-600">{resumo.traseira || '—'}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-black text-slate-800">{totalLocal > 0 ? totalLocal : group.length}</span>
                    </td>
                    <td className="p-4 text-right font-black text-red-600 text-xs">{formatCurrency(totalValor)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <button onClick={handleSaveResumo} className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors border border-emerald-200">
                            <Save size={12}/> Salvar
                          </button>
                        ) : (
                          <button onClick={() => handleStartEditResumo(key)} className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-colors">
                            <Edit3 size={12}/> Editar
                          </button>
                        )}
                        <button onClick={() => setSelectedGroup(group)} className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors border border-blue-100">
                          Ver Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedGroup && <AvariaDetailModal group={selectedGroup} motoristasMap={motoristaMap} onClose={() => setSelectedGroup(null)} onSave={handleUpdateAvaria} />}
    </div>
  );
}
