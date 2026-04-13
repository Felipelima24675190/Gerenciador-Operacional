import { useState, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { JornadaMotorista, CodigoJornadaDescription, Motorista, JornadaFaltante, ComiteDisciplinar } from '../../types';
import {
  Search, Calendar, Filter, Download, Clock, AlertTriangle, X,
  Pencil, Save, Plus, Trash2, Bell, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateBR(s: string): Date | null {
  if (!s) return null;
  try {
    const [d, m, y] = s.split('/').map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
  } catch { return null; }
}

function toDateKey(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function timeToMinutes(t?: string): number {
  if (!t || t === '00:00') return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHM(mins: number): string {
  if (mins <= 0) return '0min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function minutesToHHMM(mins: number): string {
  if (mins <= 0) return '00:00';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calcJornadaMinutes(j: JornadaMotorista): number {
  if (j.semJornada) return 0;
  const entrada = timeToMinutes(j.horaEntrada);
  let saida = timeToMinutes(j.horaSaida);
  if (j.jornadaCruzaMeiaNoite) saida += 24 * 60;
  let total = saida - entrada;
  if (!j.semIntervalo && j.horaEntradaIntervalo && j.horaSaidaIntervalo) {
    const intIn = timeToMinutes(j.horaEntradaIntervalo);
    let intOut = timeToMinutes(j.horaSaidaIntervalo);
    if (intOut < intIn) intOut += 24 * 60;
    total -= (intOut - intIn);
  }
  return Math.max(0, total);
}

function calcIntervaloMinutes(j: JornadaMotorista): number {
  if (j.semJornada || j.semIntervalo) return 0;
  const intIn = timeToMinutes(j.horaEntradaIntervalo);
  let intOut = timeToMinutes(j.horaSaidaIntervalo);
  if (intOut < intIn) intOut += 24 * 60;
  return Math.max(0, intOut - intIn);
}

function calcInterjornadaMinutes(prev: JornadaMotorista, next: JornadaMotorista): number {
  if (prev.semJornada || next.semJornada) return Infinity;
  const prevDate = parseDateBR(prev.data);
  const nextDate = parseDateBR(next.data);
  if (!prevDate || !nextDate) return Infinity;
  const dayDiff = Math.round((nextDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
  let saidaAbsolute = timeToMinutes(prev.horaSaida);
  if (prev.jornadaCruzaMeiaNoite) saidaAbsolute += 24 * 60;
  const entradaAbsolute = timeToMinutes(next.horaEntrada);
  return (dayDiff * 24 * 60) + entradaAbsolute - saidaAbsolute;
}

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
const WEEKDAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const COLORS_TOP = ['#0e4f8f', '#1565c0', '#1976d2', '#1e88e5', '#2196f3', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb', '#e3f2fd'];
const COLORS_BOTTOM = ['#dc2626', '#e53935', '#ef5350', '#f44336', '#e57373', '#ef9a9a', '#ffcdd2', '#ffebee', '#fff5f5', '#fff'];

interface Props {
  jornadasMotorista: JornadaMotorista[];
  setJornadasMotorista: Dispatch<SetStateAction<JornadaMotorista[]>>;
  codigosJornada: CodigoJornadaDescription[];
  motoristas: Motorista[];
  jornadasFaltantes: JornadaFaltante[];
  setJornadasFaltantes: Dispatch<SetStateAction<JornadaFaltante[]>>;
  comiteDisciplinar: ComiteDisciplinar[];
  setComiteDisciplinar: Dispatch<SetStateAction<ComiteDisciplinar[]>>;
}

type DashboardTab = 'dashboard' | 'detalhamento' | 'notificacoes' | 'comite';

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string;
  color: string; icon?: typeof Clock;
}) {
  const bgMap: Record<string, string> = {
    purple: 'bg-purple-50 border-purple-200', blue: 'bg-blue-50 border-blue-200',
    amber: 'bg-amber-50 border-amber-200', green: 'bg-emerald-50 border-emerald-200',
    red: 'bg-red-50 border-red-200', slate: 'bg-slate-50 border-slate-200',
    pink: 'bg-pink-50 border-pink-200', cyan: 'bg-cyan-50 border-cyan-200',
    orange: 'bg-orange-50 border-orange-200', indigo: 'bg-indigo-50 border-indigo-200',
    teal: 'bg-teal-50 border-teal-200', yellow: 'bg-yellow-50 border-yellow-200',
  };
  const textMap: Record<string, string> = {
    purple: 'text-purple-700', blue: 'text-blue-700', amber: 'text-amber-700',
    green: 'text-emerald-700', red: 'text-red-700', slate: 'text-slate-700',
    pink: 'text-pink-700', cyan: 'text-cyan-700', orange: 'text-orange-700',
    indigo: 'text-indigo-700', teal: 'text-teal-700', yellow: 'text-yellow-700',
  };
  const labelMap: Record<string, string> = {
    purple: 'text-purple-500', blue: 'text-blue-500', amber: 'text-amber-500',
    green: 'text-emerald-500', red: 'text-red-500', slate: 'text-slate-500',
    pink: 'text-pink-500', cyan: 'text-cyan-500', orange: 'text-orange-500',
    indigo: 'text-indigo-500', teal: 'text-teal-500', yellow: 'text-yellow-500',
  };
  return (
    <div className={`rounded-xl border p-4 ${bgMap[color] || bgMap.slate}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={13} className={labelMap[color] || ''} />}
        <p className={`text-2xs font-black uppercase tracking-wider ${labelMap[color] || 'text-slate-500'}`}>{label}</p>
      </div>
      <p className={`text-xl font-black ${textMap[color] || 'text-slate-800'}`}>{value}</p>
      {sub && <p className={`text-2xs mt-0.5 ${labelMap[color] || 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}

// ─── Weekday Breakdown ───────────────────────────────────────────────────────

function WeekdayBreakdown({ filtered }: { filtered: JornadaMotorista[] }) {
  const weekdayData = useMemo(() => {
    const data = Array.from({ length: 7 }, () => ({ count: 0, totalMins: 0 }));
    for (const j of filtered) {
      if (j.semJornada) continue;
      const d = parseDateBR(j.data);
      if (!d) continue;
      const dow = d.getDay();
      const mins = calcJornadaMinutes(j);
      data[dow].count++;
      data[dow].totalMins += mins;
    }
    return data.map((d, i) => ({
      name: WEEKDAY_NAMES[i],
      short: WEEKDAY_SHORT[i],
      count: d.count,
      totalMins: d.totalMins,
      avgMins: d.count > 0 ? Math.round(d.totalMins / d.count) : 0,
    }));
  }, [filtered]);

  return (
    <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-black text-slate-700">Jornadas por Dia da Semana</h4>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekdayData.map(d => (
          <div key={d.short} className="border rounded-xl p-3 text-center">
            <p className="text-2xs font-black text-slate-500 uppercase">{d.short}</p>
            <p className="text-lg font-black text-slate-800">{d.count}</p>
            <p className="text-2xs text-slate-400">jornadas</p>
            <p className="text-2xs font-bold text-blue-600 mt-1">Media {minutesToHHMM(d.avgMins)}</p>
          </div>
        ))}
      </div>
      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs font-bold text-slate-500 uppercase">
            <th className="text-left py-2 px-3">Dia da Semana</th>
            <th className="text-center py-2 px-3">Total Jornadas</th>
            <th className="text-center py-2 px-3">Total Horas</th>
            <th className="text-center py-2 px-3">Media Horas/Jornada</th>
          </tr>
        </thead>
        <tbody>
          {weekdayData.map(d => (
            <tr key={d.name} className="border-b border-gray-100 hover:bg-slate-50">
              <td className="py-2 px-3 font-medium text-slate-700">{d.name}</td>
              <td className="py-2 px-3 text-center font-bold text-blue-700">{d.count}</td>
              <td className="py-2 px-3 text-center font-mono text-slate-500">{minutesToHHMM(d.totalMins)}</td>
              <td className="py-2 px-3 text-center font-bold text-blue-600">{minutesToHHMM(d.avgMins)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Top Chart ───────────────────────────────────────────────────────────────

function TopChart({ title, data, unit, colors }: {
  title: string; data: { name: string; value: number }[]; unit: string; colors: string[];
}) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">{title}</h4>
        <p className="text-xs text-slate-400 text-center py-6">Sem dados no periodo</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">{title}</h4>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 30 }}>
            <XAxis type="number" fontSize={10} tickFormatter={v => `${v}${unit}`} />
            <YAxis type="category" dataKey="name" fontSize={10} width={110} tick={{ fill: '#475569' }} />
            <Tooltip formatter={(v: number) => [`${v}${unit}`, 'Valor']} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Driver Detail (inline, not modal) ───────────────────────────────────────

function DriverDetailView({
  motorista, jornadas, setJornadas, codigosJornada, dataInicio, dataFim,
}: {
  motorista: Motorista;
  jornadas: JornadaMotorista[];
  setJornadas: Dispatch<SetStateAction<JornadaMotorista[]>>;
  codigosJornada: CodigoJornadaDescription[];
  dataInicio: string;
  dataFim: string;
}) {
  const codeMap = useMemo(() => new Map(codigosJornada.map(c => [c.codigo, c])), [codigosJornada]);

  // Filter by date range
  const sorted = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    return jornadas
      .filter(j => {
        const d = parseDateBR(j.data);
        return d && d >= start && d <= end;
      })
      .sort((a, b) => {
        const da = parseDateBR(a.data);
        const db = parseDateBR(b.data);
        return (da?.getTime() || 0) - (db?.getTime() || 0);
      });
  }, [jornadas, dataInicio, dataFim]);

  // KPIs
  const kpis = useMemo(() => {
    let totalWorkMins = 0;
    let diasTrabalhados = 0;
    let folgas = 0;
    let folgasCompensadas = 0;
    let faltas = 0;
    let foraEscala = 0;
    let intervalos = 0; // count code 088 records only
    let treinamentos = 0;
    let atestados = 0;
    let ferias = 0;
    let interjornadasViolations = 0;
    let excessoDiario = 0;
    const workJornadas: JornadaMotorista[] = [];

    for (const j of sorted) {
      const codNum = j.codigoAtividade;
      if (!j.semJornada) {
        const mins = calcJornadaMinutes(j);
        totalWorkMins += mins;
        diasTrabalhados++;
        workJornadas.push(j);
        if (mins > 11 * 60) excessoDiario++;
      }
      // Intervalos = records with code 088
      if (codNum === '088') intervalos++;
      if (codNum === '202') folgas++;
      else if (codNum === '126') folgasCompensadas++;
      else if (codNum === '019') faltas++;
      else if (codNum === '122') foraEscala++;
      else if (codNum === '437') treinamentos++;
      else if (codNum === '033' || codNum === '041') atestados++;
      else if (codNum === '066') ferias++;
    }

    for (let i = 0; i < workJornadas.length - 1; i++) {
      const rest = calcInterjornadaMinutes(workJornadas[i], workJornadas[i + 1]);
      if (rest < 11 * 60 && rest > 0) interjornadasViolations++;
    }

    const weekMap = new Map<string, number>();
    for (const j of workJornadas) {
      const d = parseDateBR(j.data);
      if (!d) continue;
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekMap.set(toDateKey(weekStart), (weekMap.get(toDateKey(weekStart)) || 0) + calcJornadaMinutes(j));
    }
    const excessoSemanal = Array.from(weekMap.values()).filter(m => m > 44 * 60).length;

    const monthMap = new Map<string, number>();
    for (const j of workJornadas) {
      const d = parseDateBR(j.data);
      if (!d) continue;
      const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
      monthMap.set(key, (monthMap.get(key) || 0) + calcJornadaMinutes(j));
    }
    const excessoMensal = Array.from(monthMap.values()).filter(m => m > 220 * 60).length;

    const mediaHorasTrabalhadas = diasTrabalhados > 0 ? Math.round(totalWorkMins / diasTrabalhados) : 0;

    return {
      totalWorkMins, diasTrabalhados, folgas, folgasCompensadas, faltas,
      foraEscala, intervalos, treinamentos, atestados, ferias,
      interjornadasViolations, excessoDiario, excessoSemanal, excessoMensal,
      mediaHorasTrabalhadas,
    };
  }, [sorted, codeMap]);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<JornadaMotorista>>({});

  const startEdit = (j: JornadaMotorista) => { setEditingId(j.id); setEditData({ ...j }); };
  const saveEdit = () => {
    if (!editingId) return;
    setJornadas(prev => prev.map(j => {
      if (j.id !== editingId) return j;
      const updated = { ...j, ...editData } as JornadaMotorista;
      const semJornada = !updated.horaEntrada && !updated.horaSaida;
      const semIntervalo = !updated.horaEntradaIntervalo && !updated.horaSaidaIntervalo;
      let jornadaCruzaMeiaNoite = false;
      if (updated.horaEntrada && updated.horaSaida) {
        const [hE] = updated.horaEntrada.split(':').map(Number);
        const [hS] = updated.horaSaida.split(':').map(Number);
        if (hE > hS) jornadaCruzaMeiaNoite = true;
      }
      return { ...updated, semJornada, semIntervalo, jornadaCruzaMeiaNoite };
    }));
    setEditingId(null);
  };
  const handleDelete = (id: string) => {
    if (confirm('Remover esta ocorrencia?')) setJornadas(prev => prev.filter(j => j.id !== id));
  };

  // Add
  const [addMode, setAddMode] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newCode, setNewCode] = useState('001');
  const [newEntrada, setNewEntrada] = useState('');
  const [newEntInt, setNewEntInt] = useState('');
  const [newSaiInt, setNewSaiInt] = useState('');
  const [newSaida, setNewSaida] = useState('');

  const handleAdd = () => {
    if (!newDate) return;
    const [y, m, d] = newDate.split('-');
    const dataFmt = `${d}/${m}/${y}`;
    const rawDate = `${d}${m}${y}`;
    const semJornada = !newEntrada && !newSaida;
    const semIntervalo = !newEntInt && !newSaiInt;
    let jornadaCruzaMeiaNoite = false;
    if (newEntrada && newSaida) {
      const [hE] = newEntrada.split(':').map(Number);
      const [hS] = newSaida.split(':').map(Number);
      if (hE > hS) jornadaCruzaMeiaNoite = true;
    }
    const record: JornadaMotorista = {
      id: `${motorista.matricula}_${rawDate}_${newCode}`,
      matricula: motorista.matricula, data: dataFmt,
      codigoAtividade: newCode.padStart(3, '0'),
      horaEntrada: semJornada ? undefined : newEntrada || undefined,
      horaEntradaIntervalo: semJornada || semIntervalo ? undefined : newEntInt || undefined,
      horaSaidaIntervalo: semJornada || semIntervalo ? undefined : newSaiInt || undefined,
      horaSaida: semJornada ? undefined : newSaida || undefined,
      jornadaCruzaMeiaNoite, semIntervalo: semJornada ? true : semIntervalo, semJornada,
    };
    setJornadas(prev => {
      const existing = prev.find(j => j.id === record.id);
      if (existing) return prev.map(j => j.id === record.id ? record : j);
      return [...prev, record];
    });
    setAddMode(false); setNewDate(''); setNewEntrada(''); setNewEntInt(''); setNewSaiInt(''); setNewSaida('');
  };

  // Export TXT
  const handleExport = () => {
    const lines = sorted.map(j => {
      const code = codeMap.get(j.codigoAtividade);
      const tipo = code?.descricao || j.codigoAtividade;
      const jornMin = calcJornadaMinutes(j);
      const intMin = calcIntervaloMinutes(j);
      return [j.data, tipo, j.horaEntrada || '-', j.horaEntradaIntervalo || '-', j.horaSaidaIntervalo || '-', j.horaSaida || '-', jornMin > 0 ? minutesToHM(jornMin) : '-', intMin > 0 ? minutesToHM(intMin) : '-'].join('\t');
    });
    const header = 'DATA\tTIPO\tENTRADA\tENT.INTERV.\tSAI.INTERV.\tSAIDA\tJORNADA\tINTERVALO';
    const headerInfo = `MOTORISTA: ${motorista.nome}\nMATRICULA: ${motorista.matricula}\nFILIAL: ${motorista.filial}\n\n`;
    const blob = new Blob(['\ufeff' + headerInfo + header + '\n' + lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `jornada_${motorista.matricula}.txt`; link.click(); URL.revokeObjectURL(url);
  };

  const catBadge: Record<string, string> = {
    ATIVIDADE: 'bg-emerald-100 text-emerald-700', FOLGA: 'bg-amber-100 text-amber-700',
    ATESTADO: 'bg-blue-100 text-blue-700', FALTA: 'bg-red-100 text-red-700', OUTROS: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="space-y-4">
      {/* Driver header */}
      <div className="bg-gradient-to-r from-brand-800 to-brand-600 p-5 text-white rounded-card flex justify-between items-start">
        <div>
          <h2 className="text-lg font-black">{motorista.nome}</h2>
          <p className="text-white/70 text-xs font-mono mt-0.5">
            Mat. {motorista.matricula} · {sorted.length} registro(s) · {motorista.filial} · {motorista.area}
          </p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors">
          <Download size={14} /> Exportar Relatorio TXT
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Trabalhado" value={minutesToHM(kpis.totalWorkMins)} sub="Limite: 220h/mes" color="purple" icon={Clock} />
        <KpiCard label="Dias Trabalhados" value={kpis.diasTrabalhados} color="blue" icon={Calendar} />
        <KpiCard label="Media/Jornada" value={minutesToHM(kpis.mediaHorasTrabalhadas)} sub="Media de horas por dia" color="indigo" icon={Clock} />
        <KpiCard label="Folgas" value={kpis.folgas} color="green" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Folgas Compensadas" value={kpis.folgasCompensadas} sub="-7h20 por FC" color="green" />
        <KpiCard label="Faltas" value={kpis.faltas} color="red" />
        <KpiCard label="Fora de Escala" value={kpis.foraEscala} color="teal" />
        <KpiCard label="Intervalos" value={kpis.intervalos} sub="Apontamentos cod. 088" color="indigo" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Interjornadas" value={kpis.interjornadasViolations} sub="Descanso < 11h" color="orange" icon={AlertTriangle} />
        <KpiCard label="Treinamentos" value={kpis.treinamentos} color="cyan" />
        <KpiCard label="Atestados" value={kpis.atestados} color="blue" />
        <KpiCard label="Excessos" value={`${kpis.excessoDiario}d / ${kpis.excessoSemanal}s / ${kpis.excessoMensal > 0 ? kpis.excessoMensal : '-'}`} sub="Diario / Semanal / Mensal" color="red" icon={AlertTriangle} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Ferias" value={kpis.ferias} color="amber" />
      </div>

      {/* Weekday breakdown for this driver */}
      <WeekdayBreakdown filtered={sorted} />

      {/* Add */}
      <div className="flex justify-end">
        <button onClick={() => setAddMode(!addMode)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-brand-600 text-white rounded-button hover:bg-brand-700">
          <Plus size={14} /> Adicionar Registro
        </button>
      </div>

      {addMode && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-end gap-2 flex-wrap">
          <div><label className="text-2xs font-bold text-slate-500 block mb-1">Data</label><input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs" /></div>
          <div><label className="text-2xs font-bold text-slate-500 block mb-1">Codigo</label><select value={newCode} onChange={e => setNewCode(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs bg-white">{codigosJornada.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} - {c.descricao}</option>)}</select></div>
          <div><label className="text-2xs font-bold text-slate-500 block mb-1">Entrada</label><input type="time" value={newEntrada} onChange={e => setNewEntrada(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs" /></div>
          <div><label className="text-2xs font-bold text-slate-500 block mb-1">Ent. Interv.</label><input type="time" value={newEntInt} onChange={e => setNewEntInt(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs" /></div>
          <div><label className="text-2xs font-bold text-slate-500 block mb-1">Sai. Interv.</label><input type="time" value={newSaiInt} onChange={e => setNewSaiInt(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs" /></div>
          <div><label className="text-2xs font-bold text-slate-500 block mb-1">Saida</label><input type="time" value={newSaida} onChange={e => setNewSaida(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs" /></div>
          <button onClick={handleAdd} disabled={!newDate} className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-button hover:bg-emerald-700 disabled:opacity-50"><Save size={14} /></button>
          <button onClick={() => setAddMode(false)} className="px-3 py-1.5 text-xs font-bold bg-slate-300 text-slate-700 rounded-button hover:bg-slate-400"><X size={14} /></button>
        </div>
      )}

      {/* Detail Table */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <p className="px-4 pt-3 text-xs font-black text-slate-500 uppercase tracking-wider">Detalhamento das Jornadas</p>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr className="text-2xs uppercase tracking-wide">
                <th className="px-3 py-2.5 font-bold">Data</th>
                <th className="px-3 py-2.5 font-bold">Tipo</th>
                <th className="px-3 py-2.5 font-bold">Entrada</th>
                <th className="px-3 py-2.5 font-bold">Ent. Interv.</th>
                <th className="px-3 py-2.5 font-bold">Sai. Interv.</th>
                <th className="px-3 py-2.5 font-bold">Saida</th>
                <th className="px-3 py-2.5 font-bold">Jornada</th>
                <th className="px-3 py-2.5 font-bold">Intervalo</th>
                <th className="px-3 py-2.5 font-bold">Alertas / Acoes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((j, idx) => {
                const code = codeMap.get(j.codigoAtividade);
                const tipo = code?.descricao || j.codigoAtividade;
                const cat = code?.categoria || 'OUTROS';
                const jornMin = calcJornadaMinutes(j);
                const intMin = calcIntervaloMinutes(j);
                const isEditing = editingId === j.id;
                const alerts: string[] = [];
                if (jornMin > 11 * 60) alerts.push(`Jornada Diaria Excessiva (${minutesToHM(jornMin)})`);
                if (idx > 0 && !j.semJornada) {
                  const prevWork = sorted.slice(0, idx).reverse().find(p => !p.semJornada);
                  if (prevWork) {
                    const rest = calcInterjornadaMinutes(prevWork, j);
                    if (rest > 0 && rest < 11 * 60) alerts.push(`Interjornada ${minutesToHM(rest)}`);
                  }
                }
                return (
                  <tr key={j.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                    <td className="px-3 py-2 font-mono text-slate-700">{j.data}</td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select value={editData.codigoAtividade || ''} onChange={e => setEditData(p => ({ ...p, codigoAtividade: e.target.value }))} className="border rounded px-1 py-0.5 text-xs bg-white">
                          {codigosJornada.map(c => <option key={c.codigo} value={c.codigo}>{c.descricao}</option>)}
                        </select>
                      ) : <span className={`px-2 py-0.5 rounded text-2xs font-bold ${catBadge[cat] || catBadge.OUTROS}`}>{tipo}</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {isEditing ? <input type="time" value={editData.horaEntrada || ''} onChange={e => setEditData(p => ({ ...p, horaEntrada: e.target.value }))} className="border rounded px-1 py-0.5 text-xs w-20" />
                        : j.semJornada ? <span className="text-slate-300">{cat !== 'ATIVIDADE' ? '\u2014' : 'Sem apontamento'}</span> : j.horaEntrada || '\u2014'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {isEditing ? <input type="time" value={editData.horaEntradaIntervalo || ''} onChange={e => setEditData(p => ({ ...p, horaEntradaIntervalo: e.target.value }))} className="border rounded px-1 py-0.5 text-xs w-20" />
                        : j.semJornada || j.semIntervalo ? <span className="text-slate-300">{'\u2014'}</span> : j.horaEntradaIntervalo || '\u2014'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {isEditing ? <input type="time" value={editData.horaSaidaIntervalo || ''} onChange={e => setEditData(p => ({ ...p, horaSaidaIntervalo: e.target.value }))} className="border rounded px-1 py-0.5 text-xs w-20" />
                        : j.semJornada || j.semIntervalo ? <span className="text-slate-300">{'\u2014'}</span> : j.horaSaidaIntervalo || '\u2014'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {isEditing ? <input type="time" value={editData.horaSaida || ''} onChange={e => setEditData(p => ({ ...p, horaSaida: e.target.value }))} className="border rounded px-1 py-0.5 text-xs w-20" />
                        : j.semJornada ? <span className="text-slate-300">{'\u2014'}</span> : j.horaSaida || '\u2014'}
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-800">{j.semJornada ? <span className="text-slate-300">{'\u2014'}</span> : minutesToHM(jornMin)}</td>
                    <td className="px-3 py-2 text-slate-600">{j.semJornada || j.semIntervalo ? <span className="text-slate-300">{'\u2014'}</span> : minutesToHM(intMin)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {alerts.length > 0 && <div className="space-y-0.5">{alerts.map((a, i) => <p key={i} className="text-2xs font-bold text-red-500 flex items-center gap-1"><AlertTriangle size={10} className="shrink-0" /> {a}</p>)}</div>}
                        <div className="flex gap-0.5 ml-auto shrink-0">
                          {isEditing ? (
                            <><button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={14} /></button><button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={14} /></button></>
                          ) : (
                            <><button onClick={() => startEdit(j)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button><button onClick={() => handleDelete(j.id)} className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button></>
                          )}
                        </div>
                        {j.semJornada && cat === 'ATIVIDADE' && !isEditing && <button onClick={() => startEdit(j)} className="p-1 text-slate-300 hover:text-blue-500 rounded"><Plus size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-slate-400">Nenhum registro encontrado para o periodo selecionado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Tab ───────────────────────────────────────────────────────

function NotificationsView({
  filtered, motoristas, motoristaMap, onSelectMotorista, dataInicio, dataFim,
  jornadasFaltantes, setJornadasFaltantes,
}: {
  filtered: JornadaMotorista[];
  motoristas: Motorista[];
  motoristaMap: Map<string, Motorista>;
  onSelectMotorista: (m: Motorista) => void;
  dataInicio: string;
  dataFim: string;
  jornadasFaltantes: JornadaFaltante[];
  setJornadasFaltantes: Dispatch<SetStateAction<JornadaFaltante[]>>;
}) {
  const [notifTab, setNotifTab] = useState<'sem_apontamento' | 'conflitos' | 'registrados'>('sem_apontamento');

  const handleRegistrarFaltantes = useCallback(() => {
    const today = new Date();
    const dataRegistro = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');

    const motoristaDays = new Map<string, Set<string>>();
    for (const j of filtered) {
      if (!motoristaDays.has(j.matricula)) motoristaDays.set(j.matricula, new Set());
      motoristaDays.get(j.matricula)!.add(j.data);
    }

    const newFaltantes: JornadaFaltante[] = [];
    for (const [mat, days] of motoristaDays) {
      const m = motoristaMap.get(mat);
      if (!m || m.status !== 'ATIVO - EM OPERAÇÃO') continue;
      // Find missing dates
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        if (!days.has(dateKey)) {
          const id = `${mat}_${dateKey.replace(/\//g, '')}`;
          // Skip if already registered
          if (jornadasFaltantes.some(f => f.id === id)) continue;
          newFaltantes.push({
            id, matricula: mat, data: dateKey,
            filial: m.filial, area: m.area, nomeMotorista: m.nome,
            status: 'Pendente', dataRegistro,
          });
        }
      }
    }
    if (newFaltantes.length > 0) {
      setJornadasFaltantes(prev => [...prev, ...newFaltantes]);
    }
  }, [filtered, motoristaMap, dataInicio, dataFim, jornadasFaltantes, setJornadasFaltantes]);

  // Sem apontamento: motoristas in the period that have missing days
  const semApontamento = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Group days with records per motorista
    const motoristaDays = new Map<string, Set<string>>();
    for (const j of filtered) {
      if (!motoristaDays.has(j.matricula)) motoristaDays.set(j.matricula, new Set());
      motoristaDays.get(j.matricula)!.add(j.data);
    }

    const results: { motorista: Motorista; missingDays: number }[] = [];
    // Check all motoristas who have at least 1 record in the period
    for (const [mat, days] of motoristaDays) {
      const m = motoristaMap.get(mat);
      if (!m || m.status !== 'ATIVO - EM OPERAÇÃO') continue;
      const missing = totalDays - days.size;
      if (missing > 0) results.push({ motorista: m, missingDays: missing });
    }

    return results.sort((a, b) => b.missingDays - a.missingDays);
  }, [filtered, motoristas, motoristaMap, dataInicio, dataFim]);

  // Conflitos: records where horaEntradaIntervalo === horaSaidaIntervalo (both != 00:00 and != undefined)
  const conflitos = useMemo(() => {
    const results: { jornada: JornadaMotorista; motorista: Motorista | undefined; tipo: string }[] = [];
    for (const j of filtered) {
      if (j.semJornada) continue;
      // Same entry/exit interval times (not 00:00)
      if (j.horaEntradaIntervalo && j.horaSaidaIntervalo &&
          j.horaEntradaIntervalo !== '00:00' && j.horaSaidaIntervalo !== '00:00' &&
          j.horaEntradaIntervalo === j.horaSaidaIntervalo) {
        results.push({ jornada: j, motorista: motoristaMap.get(j.matricula), tipo: `Intervalo iguais: ${j.horaEntradaIntervalo}` });
      }
    }
    return results;
  }, [filtered, motoristaMap]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <Bell size={18} className="text-amber-500" />
          <h3 className="text-sm font-black text-slate-700">Notificacoes</h3>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 mb-4">
          <button onClick={() => setNotifTab('sem_apontamento')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${notifTab === 'sem_apontamento' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <AlertTriangle size={12} /> Sem apontamento
          </button>
          <button onClick={() => setNotifTab('conflitos')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${notifTab === 'conflitos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <AlertTriangle size={12} /> Conflitos de jornada
          </button>
          <button onClick={() => setNotifTab('registrados')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${notifTab === 'registrados' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Clock size={12} /> Faltantes Registrados ({jornadasFaltantes.length})
          </button>
        </div>

        {notifTab === 'sem_apontamento' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500">{semApontamento.length} motorista(s) com pendencias</p>
              {semApontamento.length > 0 && (
                <button onClick={handleRegistrarFaltantes} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-button hover:bg-amber-700">
                  <Save size={12} /> Registrar Faltantes no Banco
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {semApontamento.map(({ motorista: m, missingDays }) => (
                <button key={m.matricula} onClick={() => onSelectMotorista(m)}
                  className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors flex items-center justify-between group">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-500" />
                      <span className="text-xs font-mono text-slate-500">{m.matricula}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{m.nome}</p>
                    <p className="text-2xs text-slate-500">{m.filial} · {m.area}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-bold">{missingDays} dias sem apontamento</span>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500" />
                  </div>
                </button>
              ))}
              {semApontamento.length === 0 && <p className="text-center text-xs text-slate-400 py-8">Nenhuma pendencia encontrada</p>}
            </div>
          </div>
        )}

        {notifTab === 'conflitos' && (
          <div>
            <p className="text-xs text-slate-500 mb-3">{conflitos.length} conflito(s) encontrado(s)</p>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {conflitos.map(({ jornada: j, motorista: m, tipo }) => (
                <button key={j.id} onClick={() => m && onSelectMotorista(m)}
                  className="w-full text-left bg-red-50 border border-red-200 rounded-xl p-4 hover:bg-red-100 transition-colors flex items-center justify-between group">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-500" />
                      <span className="text-xs font-mono text-slate-500">{j.matricula}</span>
                      <span className="text-xs font-mono text-slate-400">{j.data}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{m?.nome || j.matricula}</p>
                    <p className="text-2xs text-red-600 font-bold">{tipo}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500" />
                </button>
              ))}
              {conflitos.length === 0 && <p className="text-center text-xs text-slate-400 py-8">Nenhum conflito encontrado</p>}
            </div>
          </div>
        )}

        {notifTab === 'registrados' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500">{jornadasFaltantes.length} registro(s) de jornadas faltantes</p>
              {jornadasFaltantes.length > 0 && (
                <button onClick={() => { if (confirm('Limpar todos os registros de faltantes?')) setJornadasFaltantes([]); }} className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-button">
                  <Trash2 size={12} className="inline mr-1" /> Limpar Todos
                </button>
              )}
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-white sticky top-0 z-10">
                  <tr className="text-2xs uppercase tracking-wide">
                    <th className="px-3 py-2.5 font-bold">Matricula</th>
                    <th className="px-3 py-2.5 font-bold">Motorista</th>
                    <th className="px-3 py-2.5 font-bold">Filial</th>
                    <th className="px-3 py-2.5 font-bold">Data Faltante</th>
                    <th className="px-3 py-2.5 font-bold">Status</th>
                    <th className="px-3 py-2.5 font-bold">Justificativa</th>
                    <th className="px-3 py-2.5 font-bold">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {jornadasFaltantes.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                      <td className="px-3 py-2 font-mono text-slate-700">{f.matricula}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{f.nomeMotorista}</td>
                      <td className="px-3 py-2 text-slate-500">{f.filial}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{f.data}</td>
                      <td className="px-3 py-2">
                        <select value={f.status} onChange={e => setJornadasFaltantes(prev => prev.map(x => x.id === f.id ? { ...x, status: e.target.value as JornadaFaltante['status'] } : x))}
                          className={`text-2xs font-bold px-2 py-0.5 rounded border ${f.status === 'Pendente' ? 'bg-amber-50 text-amber-700 border-amber-200' : f.status === 'Justificado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          <option value="Pendente">Pendente</option>
                          <option value="Justificado">Justificado</option>
                          <option value="Ignorado">Ignorado</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={f.justificativa || ''} placeholder="Motivo..."
                          onChange={e => setJornadasFaltantes(prev => prev.map(x => x.id === f.id ? { ...x, justificativa: e.target.value } : x))}
                          className="w-full border rounded px-2 py-0.5 text-xs bg-white" />
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => setJornadasFaltantes(prev => prev.filter(x => x.id !== f.id))} className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {jornadasFaltantes.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhuma jornada faltante registrada</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

// ─── Comitê Disciplinar View ────────────────────────────────────────────────

function ComiteView({
  comite, motoristas, motoristaMap, dataInicio, dataFim, filialMotoristas,
}: {
  comite: ComiteDisciplinar[];
  motoristas: Motorista[];
  motoristaMap: Map<string, Motorista>;
  dataInicio: string;
  dataFim: string;
  filialMotoristas: Set<string>;
}) {
  const [searchMat, setSearchMat] = useState('');

  const filtered = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    return comite.filter(c => {
      if (!filialMotoristas.has(c.matricula)) return false;
      const d = parseDateBR(c.data);
      if (!d) return false;
      if (d < start || d > end) return false;
      if (searchMat) {
        const m = motoristaMap.get(c.matricula);
        const q = searchMat.toLowerCase();
        if (!c.matricula.includes(q) && !(m?.nome.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [comite, dataInicio, dataFim, filialMotoristas, motoristaMap, searchMat]);

  const topMotoristas = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of filtered) counts.set(c.matricula, (counts.get(c.matricula) || 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([mat, count]) => {
        const m = motoristaMap.get(mat);
        const nome = m ? `${m.nome.split(' ')[0]} ${m.nome.split(' ').slice(-1)[0]}` : mat;
        return { name: nome, value: count };
      });
  }, [filtered, motoristaMap]);

  const topPunicoes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of filtered) counts.set(c.punicao, (counts.get(c.punicao) || 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pun, count]) => ({ name: pun.length > 30 ? pun.slice(0, 29) + '...' : pun, value: count }));
  }, [filtered]);

  const topMotivos = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of filtered) counts.set(c.motivo, (counts.get(c.motivo) || 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([mot, count]) => ({ name: mot.length > 30 ? mot.slice(0, 29) + '...' : mot, value: count }));
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Buscar Motorista</label>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-2.5 text-slate-400" />
              <input type="text" value={searchMat} onChange={e => setSearchMat(e.target.value)}
                placeholder="Matricula ou nome..." className="w-full pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" />
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xs text-slate-400 uppercase font-bold">Total no Periodo</p>
            <p className="text-2xl font-black text-slate-800">{filtered.length}</p>
            <p className="text-2xs text-slate-500">{new Set(filtered.map(c => c.matricula)).size} motorista(s)</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Total Ocorrencias" value={filtered.length} sub={`${new Set(filtered.map(c => c.matricula)).size} motoristas`} color="red" icon={AlertTriangle} />
        <KpiCard label="Punicoes Distintas" value={new Set(filtered.map(c => c.punicao)).size} color="orange" />
        <KpiCard label="Motivos Distintos" value={new Set(filtered.map(c => c.motivo)).size} color="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopChart title="Top 10 - Motoristas no Comite" data={topMotoristas} unit="" colors={COLORS_BOTTOM} />
        <TopChart title="Top 10 - Punicao mais Aplicada" data={topPunicoes} unit="" colors={COLORS_TOP} />
        <TopChart title="Top 10 - Motivos mais Frequentes" data={topMotivos} unit="" colors={COLORS_BOTTOM} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <p className="px-4 pt-3 text-xs font-black text-slate-500 uppercase tracking-wider">Registros do Comite Disciplinar</p>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr className="text-2xs uppercase tracking-wide">
                <th className="px-3 py-2.5 font-bold">Matricula</th>
                <th className="px-3 py-2.5 font-bold">Motorista</th>
                <th className="px-3 py-2.5 font-bold">Filial</th>
                <th className="px-3 py-2.5 font-bold">Data</th>
                <th className="px-3 py-2.5 font-bold">Motivo</th>
                <th className="px-3 py-2.5 font-bold">Punicao</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const m = motoristaMap.get(c.matricula);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                    <td className="px-3 py-2 font-mono text-slate-700">{c.matricula}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{m?.nome || c.matricula}</td>
                    <td className="px-3 py-2 text-slate-500">{m?.filial || '-'}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{c.data}</td>
                    <td className="px-3 py-2 text-slate-600">{c.motivo}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-2xs font-bold">{c.punicao}</span></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400">Nenhum registro no periodo</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function JornadaDashboardScreen({ jornadasMotorista, setJornadasMotorista, codigosJornada, motoristas, jornadasFaltantes, setJornadasFaltantes, comiteDisciplinar, setComiteDisciplinar }: Props) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [filialFilter, setFilialFilter] = useState('Todas');
  const [searchMatricula, setSearchMatricula] = useState('');
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);

  const filiais = useMemo(() => ['Todas', ...Array.from(new Set(motoristas.map(m => m.filial)))], [motoristas]);
  const motoristaMap = useMemo(() => new Map(motoristas.map(m => [m.matricula, m])), [motoristas]);

  const filialMotoristas = useMemo(() => {
    if (filialFilter === 'Todas') return new Set(motoristas.map(m => m.matricula));
    return new Set(motoristas.filter(m => m.filial === filialFilter).map(m => m.matricula));
  }, [motoristas, filialFilter]);

  const filtered = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    return jornadasMotorista.filter(j => {
      if (!filialMotoristas.has(j.matricula)) return false;
      const d = parseDateBR(j.data);
      if (!d) return false;
      return d >= start && d <= end;
    });
  }, [jornadasMotorista, dataInicio, dataFim, filialMotoristas]);

  const globalKpis = useMemo(() => {
    let totalWorkMins = 0;
    const totalMotoristas = new Set<string>();
    let totalWorkJornadas = 0;
    let folgas = 0; let folgasComp = 0; let faltas = 0; let foraEscala = 0;
    let treinamentos = 0; let atestados = 0;
    const feriasMotoristas = new Set<string>();
    let excessoDiario = 0; let interjornadaViolations = 0;
    let intervalos = 0;
    const byMotorista = new Map<string, JornadaMotorista[]>();

    for (const j of filtered) {
      totalMotoristas.add(j.matricula);
      const codNum = j.codigoAtividade;
      if (!j.semJornada) {
        const mins = calcJornadaMinutes(j);
        totalWorkMins += mins;
        totalWorkJornadas++;
        if (mins > 11 * 60) excessoDiario++;
      }
      if (codNum === '088') intervalos++;
      if (codNum === '202') folgas++;
      else if (codNum === '126') folgasComp++;
      else if (codNum === '019') faltas++;
      else if (codNum === '122') foraEscala++;
      else if (codNum === '437') treinamentos++;
      else if (codNum === '033' || codNum === '041') atestados++;
      else if (codNum === '066') feriasMotoristas.add(j.matricula);
      if (!byMotorista.has(j.matricula)) byMotorista.set(j.matricula, []);
      byMotorista.get(j.matricula)!.push(j);
    }

    let excessoSemanal = 0; let excessoMensal = 0;
    for (const [, records] of byMotorista) {
      const workRecords = records.filter(r => !r.semJornada).sort((a, b) => (parseDateBR(a.data)?.getTime() || 0) - (parseDateBR(b.data)?.getTime() || 0));
      for (let i = 0; i < workRecords.length - 1; i++) {
        const rest = calcInterjornadaMinutes(workRecords[i], workRecords[i + 1]);
        if (rest > 0 && rest < 11 * 60) interjornadaViolations++;
      }
      const weekMap = new Map<string, number>();
      for (const r of workRecords) { const d = parseDateBR(r.data); if (!d) continue; const ws = new Date(d); ws.setDate(ws.getDate() - ws.getDay()); weekMap.set(toDateKey(ws), (weekMap.get(toDateKey(ws)) || 0) + calcJornadaMinutes(r)); }
      excessoSemanal += Array.from(weekMap.values()).filter(m => m > 44 * 60).length;
      const monthMap = new Map<string, number>();
      for (const r of workRecords) { const d = parseDateBR(r.data); if (!d) continue; const key = `${d.getMonth() + 1}/${d.getFullYear()}`; monthMap.set(key, (monthMap.get(key) || 0) + calcJornadaMinutes(r)); }
      excessoMensal += Array.from(monthMap.values()).filter(m => m > 220 * 60).length;
    }

    const mediaJornada = totalWorkJornadas > 0 ? Math.round(totalWorkMins / totalWorkJornadas) : 0;

    return {
      totalWorkMins, totalMotoristas: totalMotoristas.size, totalWorkJornadas, mediaJornada,
      folgas, folgasComp, faltas, foraEscala, treinamentos, atestados, ferias: feriasMotoristas.size, intervalos,
      excessoDiario, excessoSemanal, excessoMensal, interjornadaViolations,
      totalRegistros: filtered.length,
    };
  }, [filtered]);

  const tops = useMemo(() => {
    const byMat = new Map<string, { workMins: number; faltas: number; atestados: number; maxJornada: number; minJornada: number }>();
    for (const j of filtered) {
      if (!byMat.has(j.matricula)) byMat.set(j.matricula, { workMins: 0, faltas: 0, atestados: 0, maxJornada: 0, minJornada: Infinity });
      const entry = byMat.get(j.matricula)!;
      if (!j.semJornada) {
        const mins = calcJornadaMinutes(j);
        entry.workMins += mins;
        if (mins > entry.maxJornada) entry.maxJornada = mins;
        if (mins > 0 && mins < entry.minJornada) entry.minJornada = mins;
      }
      if (j.codigoAtividade === '019') entry.faltas++;
      if (j.codigoAtividade === '033' || j.codigoAtividade === '041') entry.atestados++;
    }
    const getName = (mat: string) => { const m = motoristaMap.get(mat); return m ? `${m.nome.split(' ')[0]} ${m.nome.split(' ').slice(-1)[0]}` : mat; };
    const entries = Array.from(byMat.entries());
    return {
      topHoras: entries.sort((a, b) => b[1].workMins - a[1].workMins).slice(0, 10).map(([mat, v]) => ({ name: getName(mat), value: Math.round(v.workMins / 60) })),
      topFaltas: entries.filter(([, v]) => v.faltas > 0).sort((a, b) => b[1].faltas - a[1].faltas).slice(0, 10).map(([mat, v]) => ({ name: getName(mat), value: v.faltas })),
      topAtestados: entries.filter(([, v]) => v.atestados > 0).sort((a, b) => b[1].atestados - a[1].atestados).slice(0, 10).map(([mat, v]) => ({ name: getName(mat), value: v.atestados })),
      topMaioresJornadas: entries.filter(([, v]) => v.maxJornada > 0).sort((a, b) => b[1].maxJornada - a[1].maxJornada).slice(0, 10).map(([mat, v]) => ({ name: getName(mat), value: Math.round(v.maxJornada / 60 * 10) / 10 })),
      topMenoresJornadas: entries.filter(([, v]) => v.minJornada > 0 && v.minJornada < Infinity).sort((a, b) => a[1].minJornada - b[1].minJornada).slice(0, 10).map(([mat, v]) => ({ name: getName(mat), value: Math.round(v.minJornada / 60 * 10) / 10 })),
    };
  }, [filtered, motoristaMap]);

  const handleSearchDriver = useCallback(() => {
    const q = searchMatricula.trim();
    if (!q) return;
    const m = motoristas.find(m => m.matricula === q || m.nome.toLowerCase().includes(q.toLowerCase()));
    if (m) { setSelectedMotorista(m); setActiveTab('detalhamento'); }
  }, [searchMatricula, motoristas]);

  const handleSelectMotoristaFromNotif = useCallback((m: Motorista) => {
    setSelectedMotorista(m);
    setActiveTab('detalhamento');
  }, []);

  const driverJornadas = useMemo(() => {
    if (!selectedMotorista) return [];
    return jornadasMotorista.filter(j => j.matricula === selectedMotorista.matricula);
  }, [jornadasMotorista, selectedMotorista]);

  const TAB_ITEMS: { id: DashboardTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'detalhamento', label: selectedMotorista ? `Detalhamento - ${selectedMotorista.nome.split(' ')[0]}` : 'Detalhamento' },
    { id: 'notificacoes', label: 'Notificacoes' },
    { id: 'comite', label: 'Comite Disciplinar' },
  ];

  return (
    <div className="space-y-5">
      {/* Tab Bar */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-1 flex gap-1 overflow-x-auto">
        {TAB_ITEMS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Data Inicio</label>
            <div className="relative"><Calendar size={14} className="absolute left-2 top-2.5 text-slate-400" /><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" /></div>
          </div>
          <div>
            <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Data Fim</label>
            <div className="relative"><Calendar size={14} className="absolute left-2 top-2.5 text-slate-400" /><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" /></div>
          </div>
          <div>
            <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Filial</label>
            <div className="relative"><Filter size={14} className="absolute left-2 top-2.5 text-slate-400" /><select value={filialFilter} onChange={e => setFilialFilter(e.target.value)} className="pl-7 pr-8 py-2 text-xs border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none">{filiais.map(f => <option key={f} value={f}>{f === 'Todas' ? 'Todas as Filiais' : f}</option>)}</select></div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Buscar Motorista</label>
            <div className="flex gap-2">
              <div className="relative flex-1"><Search size={14} className="absolute left-2 top-2.5 text-slate-400" /><input type="text" value={searchMatricula} onChange={e => setSearchMatricula(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchDriver()} placeholder="Matricula ou nome..." className="w-full pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" /></div>
              <button onClick={handleSearchDriver} className="px-4 py-2 text-xs font-bold bg-brand-600 text-white rounded-button hover:bg-brand-700">Detalhar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total Registros" value={globalKpis.totalRegistros} sub={`${globalKpis.totalMotoristas} motorista(s)`} color="purple" />
            <KpiCard label="Total Trabalhado" value={minutesToHM(globalKpis.totalWorkMins)} sub="Todas as jornadas" color="blue" icon={Clock} />
            <KpiCard label="Media/Jornada" value={minutesToHM(globalKpis.mediaJornada)} sub={`${globalKpis.totalWorkJornadas} jornada(s)`} color="indigo" icon={Clock} />
            <KpiCard label="Folgas" value={globalKpis.folgas} sub={`+ ${globalKpis.folgasComp} compensadas`} color="green" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Faltas" value={globalKpis.faltas} color="red" />
            <KpiCard label="Fora de Escala" value={globalKpis.foraEscala} color="teal" />
            <KpiCard label="Atestados" value={globalKpis.atestados} color="blue" />
            <KpiCard label="Ferias" value={globalKpis.ferias} sub="Motoristas de ferias" color="amber" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Intervalos" value={globalKpis.intervalos} sub="Apontamentos cod. 088" color="indigo" />
            <KpiCard label="Interjornadas < 11h" value={globalKpis.interjornadaViolations} sub="Descanso insuficiente" color="orange" icon={AlertTriangle} />
            <KpiCard label="Excesso Diario (>11h)" value={globalKpis.excessoDiario} color="red" icon={AlertTriangle} />
            <KpiCard label="Excesso Semanal (>44h)" value={globalKpis.excessoSemanal} color="red" />
          </div>

          <WeekdayBreakdown filtered={filtered} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TopChart title="Top 10 - Mais Horas Trabalhadas" data={tops.topHoras} unit="h" colors={COLORS_TOP} />
            <TopChart title="Top 10 - Mais Faltas" data={tops.topFaltas} unit="" colors={COLORS_BOTTOM} />
            <TopChart title="Top 10 - Mais Atestados" data={tops.topAtestados} unit="" colors={COLORS_TOP} />
            <TopChart title="Top 10 - Maiores Jornadas (dia)" data={tops.topMaioresJornadas} unit="h" colors={COLORS_BOTTOM} />
            <TopChart title="Top 10 - Menores Jornadas (dia)" data={tops.topMenoresJornadas} unit="h" colors={COLORS_TOP} />
          </div>
        </>
      )}

      {/* Detalhamento Tab */}
      {activeTab === 'detalhamento' && (
        selectedMotorista ? (
          <DriverDetailView
            motorista={selectedMotorista}
            jornadas={driverJornadas}
            setJornadas={setJornadasMotorista}
            codigosJornada={codigosJornada}
            dataInicio={dataInicio}
            dataFim={dataFim}
          />
        ) : (
          <div className="bg-white rounded-card border border-gray-200 shadow-card p-10 text-center">
            <Search size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-bold text-slate-500">Busque um motorista para ver o detalhamento</p>
            <p className="text-xs text-slate-400 mt-1">Use o campo de busca acima para localizar por matricula ou nome</p>
          </div>
        )
      )}

      {/* Notificacoes Tab */}
      {activeTab === 'notificacoes' && (
        <NotificationsView
          filtered={filtered}
          motoristas={motoristas}
          motoristaMap={motoristaMap}
          onSelectMotorista={handleSelectMotoristaFromNotif}
          dataInicio={dataInicio}
          dataFim={dataFim}
          jornadasFaltantes={jornadasFaltantes}
          setJornadasFaltantes={setJornadasFaltantes}
        />
      )}

      {/* Comite Disciplinar Tab */}
      {activeTab === 'comite' && (
        <ComiteView
          comite={comiteDisciplinar}
          motoristas={motoristas}
          motoristaMap={motoristaMap}
          dataInicio={dataInicio}
          dataFim={dataFim}
          filialMotoristas={filialMotoristas}
        />
      )}
    </div>
  );
}
