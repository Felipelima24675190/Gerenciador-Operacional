import React, { useMemo, useState, useEffect } from 'react';
import { Avaria, Motorista, UserRole, ResumoAvaria } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { subDays, format } from 'date-fns';
import { X, Edit3, Save, Calendar } from 'lucide-react';

interface ConsultAvariasScreenProps {
  avarias: Avaria[];
  setAvarias: React.Dispatch<React.SetStateAction<Avaria[]>>;
  motoristas: Motorista[];
  userRole?: UserRole;
  resumos: ResumoAvaria[];
  setResumos: React.Dispatch<React.SetStateAction<ResumoAvaria[]>>;
  acidentes?: any[];
}

const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AvariaDetailModal = ({ group, motoristasMap, onClose, onSave, acidentes }: { group: Avaria[], motoristasMap: Map<string, Motorista>, onClose: () => void, onSave: (a: Avaria) => void, acidentes?: any[] }) => {
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
    <div className="fixed inset-y-0 right-0 bg-black/60 z-50 flex justify-center items-center p-4 transition-all duration-300" style={{ left: 'var(--sidebar-width, 0px)' }} onClick={onClose}>
      <div className="bg-white rounded-card shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
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
                        <p className="text-2xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Motorista: {motoristasMap.get(avaria.matriculaMotorista)?.nome || avaria.matriculaMotorista} ({avaria.matriculaMotorista})</p>
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
                        <p className="text-2xs font-bold text-slate-400 uppercase mb-1">Status Globus</p>
                        {isEditing ? (
                          <select className="w-full text-xs font-bold border rounded p-1" value={editForm.lancadoNoGlobus || ''} onChange={e => setEditForm({...editForm, lancadoNoGlobus: e.target.value})}>
                            <option value="SIM">SIM</option>
                            <option value="NÃO">NÃO</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 text-2xs font-black rounded uppercase ${avaria.lancadoNoGlobus === 'SIM' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {avaria.lancadoNoGlobus === 'SIM' ? 'LANÇADO' : 'PENDENTE'}
                          </span>
                        )}
                     </div>

                     <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-2xs font-bold text-slate-400 uppercase mb-1">Culpado?</p>
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
                        <p className="text-2xs font-bold text-slate-400 uppercase mb-1">Valor Avaria</p>
                        {isEditing ? (
                           <input type="number" className="w-full text-xs font-bold border rounded p-1" value={editForm.valorAvaria || ''} onChange={e => setEditForm({...editForm, valorAvaria: parseFloat(e.target.value) || 0})} />
                        ) : (
                           <p className="font-black text-red-600">{formatCurrency(avaria.valorAvaria)}</p>
                        )}
                     </div>

                     <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-2xs font-bold text-slate-400 uppercase mb-1">Valor Cobrado</p>
                        {isEditing ? (
                           <input type="number" className="w-full text-xs font-bold border rounded p-1" value={editForm.valorCobrado || ''} onChange={e => setEditForm({...editForm, valorCobrado: parseFloat(e.target.value) || 0})} />
                        ) : (
                           <p className="font-black text-emerald-600">{formatCurrency(avaria.valorCobrado)}</p>
                        )}
                     </div>
                  </div>

                  {(() => {
                    // If an accident is linked to this avaria, use its causa/acao
                    const linkedAccident = acidentes?.find((ac: any) => ac.avariaVinculadaId === avaria.id);
                    const causa = linkedAccident?.causaAvaria || avaria.causaAvaria;
                    const acao = linkedAccident?.acaoTomada || avaria.acaoTomada;
                    const showSection = avaria.descricaoAvaria || avaria.tipoAvaria || causa || acao;
                    if (!showSection) return null;
                    return (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {avaria.descricaoAvaria && (
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-2xs font-bold text-slate-400 uppercase mb-1">Descrição</p>
                            <p className="text-xs text-slate-700">{avaria.descricaoAvaria}</p>
                          </div>
                        )}
                        {avaria.tipoAvaria && (
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-2xs font-bold text-slate-400 uppercase mb-1">Tipo de Avaria</p>
                            <p className="text-xs font-bold text-slate-700">{avaria.tipoAvaria}</p>
                          </div>
                        )}
                        {causa && (
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-2xs font-bold text-slate-400 uppercase mb-1">Causa{linkedAccident?.causaAvaria ? ' (via Acidente)' : ''}</p>
                            <p className="text-xs text-slate-700">{causa}</p>
                          </div>
                        )}
                        {acao && (
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-2xs font-bold text-slate-400 uppercase mb-1">Ação Tomada{linkedAccident?.acaoTomada ? ' (via Acidente)' : ''}</p>
                            <p className="text-xs text-slate-700">{acao}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ConsultAvariasScreen({ avarias, setAvarias, motoristas, resumos, setResumos, acidentes = [] }: ConsultAvariasScreenProps) {
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
    const locCount: Record<string, number> = {};
    const locValor: Record<string, number> = {};
    let totalSemLocalCount = 0;
    let totalSemLocalValor = 0;

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
      // Combined locations (free text) — split by "/" and count each location separately
      const raw = (resumo?.localizacao || '').trim();
      const locCountValue = parseInt(resumo?.total || '', 10);
      const totalCount = isNaN(locCountValue) ? group.length : locCountValue;

      if (raw) {
        const parts = raw.split('/').map(s => s.trim()).filter(Boolean);
        if (parts.length > 0) {
          const perPartCount = totalCount / parts.length;
          const perPartValor = groupValor / parts.length;
          parts.forEach(p => {
            const name = p;
            locCount[name] = (locCount[name] || 0) + perPartCount;
            locValor[name] = (locValor[name] || 0) + perPartValor;
          });
        } else {
          totalSemLocalCount += group.length;
          totalSemLocalValor += groupValor;
        }
      } else {
        totalSemLocalCount += group.length;
        totalSemLocalValor += groupValor;
      }
    });

    const byCount = [
      ...Object.entries(locCount).map(([name, count]) => ({ name, count: Math.round(count * 100) / 100 })),
      ...(totalSemLocalCount > 0 ? [{ name: 'Sem Local', count: totalSemLocalCount }] : []),
    ]
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const byValue = [
      ...Object.entries(locValor).map(([name, valor]) => ({ name, valor })),
      ...(totalSemLocalValor > 0 ? [{ name: 'Sem Local', valor: totalSemLocalValor }] : []),
    ]
      .filter(d => d.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

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
    const existing = resumos.find(r => r.key === key);
    if (existing) {
      // Backfill localizacao / total from legacy fields if not set
      if (!existing.localizacao && !existing.total) {
        const legacyParts: string[] = [];
        const front = parseFloat(existing.frontal || '0') || 0;
        const lat = parseFloat(existing.lateral || '0') || 0;
        const tras = parseFloat(existing.traseira || '0') || 0;
        if (front > 0) legacyParts.push('Frontal');
        if (lat > 0) legacyParts.push('Lateral');
        if (tras > 0) legacyParts.push('Traseira');
        const legacyTotal = front + lat + tras;
        return {
          ...existing,
          localizacao: legacyParts.join('/'),
          total: legacyTotal > 0 ? String(legacyTotal) : '',
        };
      }
      return existing;
    }
    return { key, tipoAvaria: '', localizacao: '', total: '' };
  };

  const handleStartEditResumo = (key: string) => {
    setEditingResumoKey(key);
    setEditResumoForm({ ...getResumo(key) });
  };

  const handleSaveResumo = () => {
    if (!editingResumoKey || !editResumoForm) return;
    const updated: ResumoAvaria = {
      key: editingResumoKey,
      tipoAvaria: editResumoForm.tipoAvaria || '',
      localizacao: editResumoForm.localizacao || '',
      total: editResumoForm.total || '',
    };
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
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-card border border-gray-200 shadow-card flex items-center gap-4">
        <div className="flex-1 max-w-xs">
          <label htmlFor="av-data-inicio" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Início</label>
          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
            <input id="av-data-inicio" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} aria-label="Data de início do filtro" className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 max-w-xs">
          <label htmlFor="av-data-fim" className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Fim</label>
          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
            <input id="av-data-fim" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} aria-label="Data de fim do filtro" className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-4 flex gap-3 overflow-x-auto rounded-xl">
        <div className="bg-slate-700 rounded-lg p-3 text-center min-w-[130px] flex-1">
          <p className="text-2xs font-bold text-slate-400 uppercase tracking-wide">Valor Total Avarias</p>
          <p className="text-lg font-black text-white mt-0.5 whitespace-nowrap">{formatCurrency(kpis.valorTotal)}</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 text-center min-w-[150px] flex-1">
          <p className="text-2xs font-bold text-slate-400 uppercase tracking-wide">Recuperado (Cobrado)</p>
          <p className="text-lg font-black text-white mt-0.5 whitespace-nowrap">{formatCurrency(kpis.valorRecuperado)}</p>
          <p className="text-xs font-bold text-emerald-400">{kpis.percRecuperado}%</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 text-center min-w-[150px] flex-1">
          <p className="text-2xs font-bold text-slate-400 uppercase tracking-wide">Não Recuperado</p>
          <p className="text-lg font-black text-white mt-0.5 whitespace-nowrap">{formatCurrency(kpis.valorNaoRecuperado)}</p>
          <p className="text-xs font-bold text-red-400">{kpis.percNaoRecuperado}%</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 text-center min-w-[120px] flex-1">
          <p className="text-2xs font-bold text-slate-400 uppercase tracking-wide">Filial Crítica</p>
          <p className="text-lg font-black text-white mt-0.5 truncate" title={kpis.topFilial}>{kpis.topFilial}</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 text-center min-w-[120px] flex-1">
          <p className="text-2xs font-bold text-slate-400 uppercase tracking-wide">Total Ocorrências</p>
          <p className="text-lg font-black text-white mt-0.5">{kpis.totalCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-card border border-gray-200 shadow-card"><h4 className="text-2xs font-bold text-slate-400 uppercase mb-4">Top 5 - Veículos</h4><ResponsiveContainer width="100%" height={250}><BarChart data={topStats.topVeiculos} layout="vertical" margin={{ left: 10, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11}} width={60} interval={0} /><Tooltip cursor={{fill: '#f1f5f9'}} /><Bar dataKey="count" fill="#f59e0b" radius={[0,2,2,0]} barSize={15} label={{ position: 'right', fontSize: 11 }} /></BarChart></ResponsiveContainer></div>
        <div className="bg-white p-6 rounded-card border border-gray-200 shadow-card"><h4 className="text-2xs font-bold text-slate-400 uppercase mb-4">Top 5 - Tipos (Qtd)</h4><ResponsiveContainer width="100%" height={250}><BarChart data={topStats.byCount} layout="vertical" margin={{ left: 10, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11}} width={100} interval={0} /><Tooltip cursor={{fill: '#f1f5f9'}} /><Bar dataKey="count" fill="#3b82f6" radius={[0,2,2,0]} barSize={15} label={{ position: 'right', fontSize: 11 }} /></BarChart></ResponsiveContainer></div>
        <div className="bg-white p-6 rounded-card border border-gray-200 shadow-card"><h4 className="text-2xs font-bold text-slate-400 uppercase mb-4">Top 5 - Tipos (Prejuízo)</h4><ResponsiveContainer width="100%" height={250}><BarChart data={topStats.byValue} layout="vertical" margin={{ left: 10, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11}} width={100} interval={0} /><Tooltip cursor={{fill: '#f1f5f9'}} formatter={(val: number) => formatCurrency(val)} /><Bar dataKey="valor" fill="#ef4444" radius={[0,2,2,0]} barSize={15} label={{ position: 'right', fontSize: 11, formatter: (v: number) => `R$${Math.floor(v)}` }} /></BarChart></ResponsiveContainer></div>
      </div>

      <div className="bg-white p-6 rounded-card border border-gray-200 shadow-card"><h4 className="text-2xs font-bold text-slate-400 uppercase mb-4">Tendência Mensal</h4><ResponsiveContainer width="100%" height={300}><LineChart data={chartDataMensal} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="Atual" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} /><Line type="monotone" dataKey="Anterior" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} /></LineChart></ResponsiveContainer></div>

      {/* Tabela principal com resumo editável */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800 uppercase">Avarias por Ocorrência</h3>
          <span className="text-xs font-bold bg-white border px-3 py-1 rounded text-slate-500">{groupedAvarias.length} ocorrências</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr className="text-2xs uppercase tracking-wide">
                <th className="px-3 py-2.5">Data</th>
                <th className="px-3 py-2.5">Veículo</th>
                <th className="px-3 py-2.5">Motorista</th>
                <th className="px-3 py-2.5">Tipo de Avaria</th>
                <th className="px-3 py-2.5 text-center">Localização e Total</th>
                <th className="px-3 py-2.5 text-right">Valor</th>
                <th className="px-3 py-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {groupedAvarias.map(group => {
                const a = group[0];
                const key = `${a.data}_${a.veiculo}`;
                const resumo = getResumo(key);
                const totalValor = group.reduce((sum, it) => sum + it.valorAvaria, 0);
                const isEditing = editingResumoKey === key;

                const totalNumeric = parseInt(resumo.total || '', 10);
                const totalDisplay = isNaN(totalNumeric) ? group.length : totalNumeric;

                return (
                  <tr key={key} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs">{a.data}</td>
                    <td className="px-3 py-2 font-bold text-blue-900 text-lg">{a.veiculo}</td>
                    <td className="px-3 py-2"><p className="font-bold text-slate-800 text-xs">{motoristaMap.get(a.matriculaMotorista)?.nome || a.matriculaMotorista}</p></td>
                    <td className="px-3 py-2 max-w-[180px]">
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
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            className="flex-1 min-w-[120px] text-xs font-bold border border-blue-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                            value={editResumoForm.localizacao || ''}
                            onChange={e => setEditResumoForm({ ...editResumoForm, localizacao: e.target.value })}
                            placeholder="Ex: Frontal/Superior"
                          />
                          <input
                            className="w-14 text-xs font-bold text-center border border-blue-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500"
                            value={editResumoForm.total || ''}
                            onChange={e => setEditResumoForm({ ...editResumoForm, total: e.target.value })}
                            placeholder="Qtd"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-center">
                          <span className="text-xs font-bold text-slate-700">{resumo.localizacao || <span className="text-slate-300 italic">—</span>}</span>
                          <span className="text-2xs font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{totalDisplay}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-black text-red-600 text-xs">{formatCurrency(totalValor)}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <button onClick={handleSaveResumo} aria-label="Salvar alterações" className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1.5 rounded-lg text-2xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-200">
                            <Save size={12}/> Salvar
                          </button>
                        ) : (
                          <button onClick={() => handleStartEditResumo(key)} aria-label="Editar resumo de avaria" className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg text-2xs font-bold hover:bg-slate-200 transition-colors">
                            <Edit3 size={12}/> Editar
                          </button>
                        )}
                        <button onClick={() => setSelectedGroup(group)} aria-label="Ver detalhes da ocorrência" className="text-2xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors border border-blue-100">
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

      {selectedGroup && <AvariaDetailModal group={selectedGroup} motoristasMap={motoristaMap} onClose={() => setSelectedGroup(null)} onSave={handleUpdateAvaria} acidentes={acidentes} />}
    </div>
  );
}
