import { useState, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { JornadaMotorista, CodigoJornadaDescription, Motorista } from '../../types';
import {
  Search, Calendar, Filter, Download, Clock, AlertTriangle, X,
  Pencil, Save, Plus, Trash2,
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

/** Calculate work minutes (entrada→saida minus intervalo), handling midnight crossing */
function calcJornadaMinutes(j: JornadaMotorista): number {
  if (j.semJornada) return 0;
  const entrada = timeToMinutes(j.horaEntrada);
  let saida = timeToMinutes(j.horaSaida);
  if (j.jornadaCruzaMeiaNoite) saida += 24 * 60;
  let total = saida - entrada;

  // Subtract interval
  if (!j.semIntervalo && j.horaEntradaIntervalo && j.horaSaidaIntervalo) {
    const intIn = timeToMinutes(j.horaEntradaIntervalo);
    let intOut = timeToMinutes(j.horaSaidaIntervalo);
    if (intOut < intIn) intOut += 24 * 60;
    total -= (intOut - intIn);
  }
  return Math.max(0, total);
}

/** Calculate interval minutes */
function calcIntervaloMinutes(j: JornadaMotorista): number {
  if (j.semJornada || j.semIntervalo) return 0;
  const intIn = timeToMinutes(j.horaEntradaIntervalo);
  let intOut = timeToMinutes(j.horaSaidaIntervalo);
  if (intOut < intIn) intOut += 24 * 60;
  return Math.max(0, intOut - intIn);
}

/** Calculate interjornada (rest between day X saida and day X+1 entrada) */
function calcInterjornadaMinutes(prev: JornadaMotorista, next: JornadaMotorista): number {
  if (prev.semJornada || next.semJornada) return Infinity;
  let saida = timeToMinutes(prev.horaSaida);
  if (prev.jornadaCruzaMeiaNoite) saida -= 24 * 60; // normalize to next day
  const prevDate = parseDateBR(prev.data);
  const nextDate = parseDateBR(next.data);
  if (!prevDate || !nextDate) return Infinity;

  const dayDiff = Math.round((nextDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

  // Saida in minutes from midnight of prev day
  let saidaAbsolute = timeToMinutes(prev.horaSaida);
  if (prev.jornadaCruzaMeiaNoite) saidaAbsolute += 24 * 60;

  // Entrada in minutes from midnight of next day
  const entradaAbsolute = timeToMinutes(next.horaEntrada);

  // Rest = (dayDiff * 24 * 60) + entrada - saida
  const rest = (dayDiff * 24 * 60) + entradaAbsolute - saidaAbsolute;
  return rest;
}

const COLORS_TOP = ['#0e4f8f', '#1565c0', '#1976d2', '#1e88e5', '#2196f3', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb', '#e3f2fd'];
const COLORS_BOTTOM = ['#dc2626', '#e53935', '#ef5350', '#f44336', '#e57373', '#ef9a9a', '#ffcdd2', '#ffebee', '#fff5f5', '#fff'];

interface Props {
  jornadasMotorista: JornadaMotorista[];
  setJornadasMotorista: Dispatch<SetStateAction<JornadaMotorista[]>>;
  codigosJornada: CodigoJornadaDescription[];
  motoristas: Motorista[];
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string;
  color: string; icon?: typeof Clock;
}) {
  const bgMap: Record<string, string> = {
    purple: 'bg-purple-50 border-purple-200',
    blue: 'bg-blue-50 border-blue-200',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-emerald-50 border-emerald-200',
    red: 'bg-red-50 border-red-200',
    slate: 'bg-slate-50 border-slate-200',
    pink: 'bg-pink-50 border-pink-200',
    cyan: 'bg-cyan-50 border-cyan-200',
    orange: 'bg-orange-50 border-orange-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    teal: 'bg-teal-50 border-teal-200',
    yellow: 'bg-yellow-50 border-yellow-200',
  };
  const textMap: Record<string, string> = {
    purple: 'text-purple-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    green: 'text-emerald-700',
    red: 'text-red-700',
    slate: 'text-slate-700',
    pink: 'text-pink-700',
    cyan: 'text-cyan-700',
    orange: 'text-orange-700',
    indigo: 'text-indigo-700',
    teal: 'text-teal-700',
    yellow: 'text-yellow-700',
  };
  const labelMap: Record<string, string> = {
    purple: 'text-purple-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    green: 'text-emerald-500',
    red: 'text-red-500',
    slate: 'text-slate-500',
    pink: 'text-pink-500',
    cyan: 'text-cyan-500',
    orange: 'text-orange-500',
    indigo: 'text-indigo-500',
    teal: 'text-teal-500',
    yellow: 'text-yellow-500',
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

// ─── Driver Detail Modal ─────────────────────────────────────────────────────

function DriverDetailModal({
  motorista,
  jornadas,
  setJornadas,
  codigosJornada,
  allJornadas,
  onClose,
}: {
  motorista: Motorista;
  jornadas: JornadaMotorista[];
  setJornadas: Dispatch<SetStateAction<JornadaMotorista[]>>;
  codigosJornada: CodigoJornadaDescription[];
  allJornadas: JornadaMotorista[];
  onClose: () => void;
}) {
  const codeMap = useMemo(() => new Map(codigosJornada.map(c => [c.codigo, c])), [codigosJornada]);

  const sorted = useMemo(() =>
    [...jornadas].sort((a, b) => {
      const da = parseDateBR(a.data);
      const db = parseDateBR(b.data);
      return (da?.getTime() || 0) - (db?.getTime() || 0);
    }),
    [jornadas]
  );

  // KPIs for this driver
  const kpis = useMemo(() => {
    let totalWorkMins = 0;
    let diasTrabalhados = 0;
    let folgas = 0;
    let folgasCompensadas = 0;
    let faltas = 0;
    let foraEscala = 0;
    let intervalos = 0;
    let treinamentos = 0;
    let atestados = 0;
    let ferias = 0;
    let interjornadasViolations = 0;
    let excessoDiario = 0;

    const workJornadas: JornadaMotorista[] = [];

    for (const j of sorted) {
      const code = codeMap.get(j.codigoAtividade);
      const cat = code?.categoria || 'OUTROS';
      const codNum = j.codigoAtividade;

      if (!j.semJornada) {
        const mins = calcJornadaMinutes(j);
        totalWorkMins += mins;
        diasTrabalhados++;
        workJornadas.push(j);
        if (mins > 11 * 60) excessoDiario++;

        const intMins = calcIntervaloMinutes(j);
        if (intMins > 0) intervalos++;
      }

      if (codNum === '202') folgas++;
      else if (codNum === '126') folgasCompensadas++;
      else if (codNum === '019') faltas++;
      else if (codNum === '122') foraEscala++;
      else if (codNum === '437') treinamentos++;
      else if (codNum === '033' || codNum === '041') atestados++;
      else if (codNum === '066') ferias++;
    }

    // Interjornada violations
    for (let i = 0; i < workJornadas.length - 1; i++) {
      const rest = calcInterjornadaMinutes(workJornadas[i], workJornadas[i + 1]);
      if (rest < 11 * 60 && rest > 0) interjornadasViolations++;
    }

    // Weekly excess (group by ISO week)
    const weekMap = new Map<string, number>();
    for (const j of workJornadas) {
      const d = parseDateBR(j.data);
      if (!d) continue;
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = toDateKey(weekStart);
      weekMap.set(key, (weekMap.get(key) || 0) + calcJornadaMinutes(j));
    }
    const excessoSemanal = Array.from(weekMap.values()).filter(m => m > 44 * 60).length;

    // Monthly excess
    const monthMap = new Map<string, number>();
    for (const j of workJornadas) {
      const d = parseDateBR(j.data);
      if (!d) continue;
      const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
      monthMap.set(key, (monthMap.get(key) || 0) + calcJornadaMinutes(j));
    }
    const excessoMensal = Array.from(monthMap.values()).filter(m => m > 220 * 60).length;

    return {
      totalWorkMins, diasTrabalhados, folgas, folgasCompensadas, faltas,
      foraEscala, intervalos, treinamentos, atestados, ferias,
      interjornadasViolations, excessoDiario, excessoSemanal, excessoMensal,
    };
  }, [sorted, codeMap]);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<JornadaMotorista>>({});

  const startEdit = (j: JornadaMotorista) => {
    setEditingId(j.id);
    setEditData({ ...j });
  };

  const saveEdit = () => {
    if (!editingId) return;
    setJornadas(prev => prev.map(j => {
      if (j.id !== editingId) return j;
      const updated = { ...j, ...editData } as JornadaMotorista;
      // Recalculate flags
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
    if (confirm('Remover esta ocorrencia?')) {
      setJornadas(prev => prev.filter(j => j.id !== id));
    }
  };

  // Add manual record
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
      matricula: motorista.matricula,
      data: dataFmt,
      codigoAtividade: newCode.padStart(3, '0'),
      horaEntrada: semJornada ? undefined : newEntrada || undefined,
      horaEntradaIntervalo: semJornada || semIntervalo ? undefined : newEntInt || undefined,
      horaSaidaIntervalo: semJornada || semIntervalo ? undefined : newSaiInt || undefined,
      horaSaida: semJornada ? undefined : newSaida || undefined,
      jornadaCruzaMeiaNoite,
      semIntervalo: semJornada ? true : semIntervalo,
      semJornada,
    };

    setJornadas(prev => {
      const existing = prev.find(j => j.id === record.id);
      if (existing) return prev.map(j => j.id === record.id ? record : j);
      return [...prev, record];
    });

    setAddMode(false);
    setNewDate('');
    setNewEntrada('');
    setNewEntInt('');
    setNewSaiInt('');
    setNewSaida('');
  };

  // Export TXT
  const handleExport = () => {
    const lines = sorted.map(j => {
      const code = codeMap.get(j.codigoAtividade);
      const tipo = code?.descricao || j.codigoAtividade;
      const jornMin = calcJornadaMinutes(j);
      const intMin = calcIntervaloMinutes(j);
      return [
        j.data,
        tipo,
        j.horaEntrada || '-',
        j.horaEntradaIntervalo || '-',
        j.horaSaidaIntervalo || '-',
        j.horaSaida || '-',
        jornMin > 0 ? minutesToHM(jornMin) : '-',
        intMin > 0 ? minutesToHM(intMin) : '-',
      ].join('\t');
    });
    const header = 'DATA\tTIPO\tENTRADA\tENT.INTERV.\tSAI.INTERV.\tSAIDA\tJORNADA\tINTERVALO';
    const headerInfo = `MOTORISTA: ${motorista.nome}\nMATRICULA: ${motorista.matricula}\nFILIAL: ${motorista.filial}\n\n`;
    const content = headerInfo + header + '\n' + lines.join('\n');
    const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jornada_${motorista.matricula}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-start p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-8 flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 p-5 text-white rounded-t-2xl flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-lg font-black">{motorista.nome}</h2>
            <p className="text-white/70 text-xs font-mono mt-0.5">
              Mat. {motorista.matricula} · {sorted.length} registro(s) · {motorista.filial} · {motorista.area}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors">
              <Download size={14} /> Exportar Relatorio TXT
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full"><X size={20} /></button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total Trabalhado" value={minutesToHM(kpis.totalWorkMins)} sub="Limite: 220h/mes" color="purple" icon={Clock} />
            <KpiCard label="Dias Trabalhados" value={kpis.diasTrabalhados} color="blue" icon={Calendar} />
            <KpiCard label="Folgas" value={kpis.folgas} color="green" />
            <KpiCard label="Folgas Compensadas" value={kpis.folgasCompensadas} sub="-7h20 por FC" color="green" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Faltas" value={kpis.faltas} color="red" />
            <KpiCard label="Fora de Escala" value={kpis.foraEscala} color="teal" />
            <KpiCard label="Intervalos" value={kpis.intervalos} color="indigo" />
            <KpiCard label="Interjornadas" value={kpis.interjornadasViolations} sub="Descanso < 11h" color="orange" icon={AlertTriangle} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Treinamentos" value={kpis.treinamentos} color="cyan" />
            <KpiCard label="Atestados" value={kpis.atestados} color="blue" />
            <KpiCard label="Ferias" value={kpis.ferias} color="amber" />
            <KpiCard label="Excessos" value={`${kpis.excessoDiario}d / ${kpis.excessoSemanal}s / ${kpis.excessoMensal > 0 ? kpis.excessoMensal : '-'}`} sub="Diario / Semanal / Mensal" color="red" icon={AlertTriangle} />
          </div>

          {/* Add button */}
          <div className="flex justify-end">
            <button onClick={() => setAddMode(!addMode)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-brand-600 text-white rounded-button hover:bg-brand-700">
              <Plus size={14} /> Adicionar Registro
            </button>
          </div>

          {addMode && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-end gap-2 flex-wrap">
              <div>
                <label className="text-2xs font-bold text-slate-500 block mb-1">Data</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-2xs font-bold text-slate-500 block mb-1">Codigo</label>
                <select value={newCode} onChange={e => setNewCode(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs bg-white">
                  {codigosJornada.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} - {c.descricao}</option>)}
                </select>
              </div>
              <div>
                <label className="text-2xs font-bold text-slate-500 block mb-1">Entrada</label>
                <input type="time" value={newEntrada} onChange={e => setNewEntrada(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-2xs font-bold text-slate-500 block mb-1">Ent. Interv.</label>
                <input type="time" value={newEntInt} onChange={e => setNewEntInt(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-2xs font-bold text-slate-500 block mb-1">Sai. Interv.</label>
                <input type="time" value={newSaiInt} onChange={e => setNewSaiInt(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-2xs font-bold text-slate-500 block mb-1">Saida</label>
                <input type="time" value={newSaida} onChange={e => setNewSaida(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs" />
              </div>
              <button onClick={handleAdd} disabled={!newDate} className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-button hover:bg-emerald-700 disabled:opacity-50">
                <Save size={14} />
              </button>
              <button onClick={() => setAddMode(false)} className="px-3 py-1.5 text-xs font-bold bg-slate-300 text-slate-700 rounded-button hover:bg-slate-400">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Detail Table */}
          <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
            <p className="px-4 pt-3 text-xs font-black text-slate-500 uppercase tracking-wider">Detalhamento das Jornadas</p>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
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

                    // Alerts
                    const alerts: string[] = [];
                    if (jornMin > 11 * 60) alerts.push(`Jornada Diaria Excessiva (${minutesToHM(jornMin)})`);
                    // Interjornada
                    if (idx > 0 && !j.semJornada) {
                      const prevWork = sorted.slice(0, idx).reverse().find(p => !p.semJornada);
                      if (prevWork) {
                        const rest = calcInterjornadaMinutes(prevWork, j);
                        if (rest > 0 && rest < 11 * 60) alerts.push(`Interjornada ${minutesToHM(rest)}`);
                      }
                    }

                    const catBadge: Record<string, string> = {
                      ATIVIDADE: 'bg-emerald-100 text-emerald-700',
                      FOLGA: 'bg-amber-100 text-amber-700',
                      ATESTADO: 'bg-blue-100 text-blue-700',
                      FALTA: 'bg-red-100 text-red-700',
                      OUTROS: 'bg-slate-100 text-slate-600',
                    };

                    return (
                      <tr key={j.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
                        <td className="px-3 py-2 font-mono text-slate-700">{j.data}</td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <select value={editData.codigoAtividade || ''} onChange={e => setEditData(p => ({ ...p, codigoAtividade: e.target.value }))} className="border rounded px-1 py-0.5 text-xs bg-white">
                              {codigosJornada.map(c => <option key={c.codigo} value={c.codigo}>{c.descricao}</option>)}
                            </select>
                          ) : j.semJornada && cat !== 'ATIVIDADE' ? (
                            <span className={`px-2 py-0.5 rounded text-2xs font-bold ${catBadge[cat] || catBadge.OUTROS}`}>{tipo}</span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-2xs font-bold ${catBadge.ATIVIDADE}`}>{tipo}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {isEditing ? (
                            <input type="time" value={editData.horaEntrada || ''} onChange={e => setEditData(p => ({ ...p, horaEntrada: e.target.value }))} className="border rounded px-1 py-0.5 text-xs w-20" />
                          ) : j.semJornada ? <span className="text-slate-300">{cat !== 'ATIVIDADE' ? '\u2014' : 'Sem apontamento'}</span> : j.horaEntrada || '\u2014'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {isEditing ? (
                            <input type="time" value={editData.horaEntradaIntervalo || ''} onChange={e => setEditData(p => ({ ...p, horaEntradaIntervalo: e.target.value }))} className="border rounded px-1 py-0.5 text-xs w-20" />
                          ) : j.semJornada || j.semIntervalo ? <span className="text-slate-300">{'\u2014'}</span> : j.horaEntradaIntervalo || '\u2014'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {isEditing ? (
                            <input type="time" value={editData.horaSaidaIntervalo || ''} onChange={e => setEditData(p => ({ ...p, horaSaidaIntervalo: e.target.value }))} className="border rounded px-1 py-0.5 text-xs w-20" />
                          ) : j.semJornada || j.semIntervalo ? <span className="text-slate-300">{'\u2014'}</span> : j.horaSaidaIntervalo || '\u2014'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {isEditing ? (
                            <input type="time" value={editData.horaSaida || ''} onChange={e => setEditData(p => ({ ...p, horaSaida: e.target.value }))} className="border rounded px-1 py-0.5 text-xs w-20" />
                          ) : j.semJornada ? <span className="text-slate-300">{'\u2014'}</span> : j.horaSaida || '\u2014'}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-800">
                          {j.semJornada ? <span className="text-slate-300">{'\u2014'}</span> : minutesToHM(jornMin)}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {j.semJornada || j.semIntervalo ? <span className="text-slate-300">{'\u2014'}</span> : minutesToHM(intMin)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {alerts.length > 0 && (
                              <div className="space-y-0.5">
                                {alerts.map((a, i) => (
                                  <p key={i} className="text-2xs font-bold text-red-500 flex items-center gap-1">
                                    <AlertTriangle size={10} className="shrink-0" /> {a}
                                  </p>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-0.5 ml-auto shrink-0">
                              {isEditing ? (
                                <>
                                  <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={14} /></button>
                                  <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={14} /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEdit(j)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                                  <button onClick={() => handleDelete(j.id)} className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                </>
                              )}
                            </div>
                            {j.semJornada && cat === 'ATIVIDADE' && !isEditing && (
                              <button onClick={() => startEdit(j)} className="p-1 text-slate-300 hover:text-blue-500 rounded"><Plus size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-10 text-slate-400">Nenhum registro encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function JornadaDashboardScreen({ jornadasMotorista, setJornadasMotorista, codigosJornada, motoristas }: Props) {
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
  const codeMap = useMemo(() => new Map(codigosJornada.map(c => [c.codigo, c])), [codigosJornada]);
  const motoristaMap = useMemo(() => new Map(motoristas.map(m => [m.matricula, m])), [motoristas]);

  const filialMotoristas = useMemo(() => {
    if (filialFilter === 'Todas') return new Set(motoristas.map(m => m.matricula));
    return new Set(motoristas.filter(m => m.filial === filialFilter).map(m => m.matricula));
  }, [motoristas, filialFilter]);

  // Filtered jornadas
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

  // Global KPIs
  const globalKpis = useMemo(() => {
    let totalWorkMins = 0;
    let totalMotoristas = new Set<string>();
    let folgas = 0;
    let folgasComp = 0;
    let faltas = 0;
    let foraEscala = 0;
    let treinamentos = 0;
    let atestados = 0;
    let ferias = 0;
    let excessoDiario = 0;
    let interjornadaViolations = 0;

    // Group by motorista for interjornada + weekly/monthly calc
    const byMotorista = new Map<string, JornadaMotorista[]>();

    for (const j of filtered) {
      totalMotoristas.add(j.matricula);
      const codNum = j.codigoAtividade;
      if (!j.semJornada) {
        const mins = calcJornadaMinutes(j);
        totalWorkMins += mins;
        if (mins > 11 * 60) excessoDiario++;
      }
      if (codNum === '202') folgas++;
      else if (codNum === '126') folgasComp++;
      else if (codNum === '019') faltas++;
      else if (codNum === '122') foraEscala++;
      else if (codNum === '437') treinamentos++;
      else if (codNum === '033' || codNum === '041') atestados++;
      else if (codNum === '066') ferias++;

      if (!byMotorista.has(j.matricula)) byMotorista.set(j.matricula, []);
      byMotorista.get(j.matricula)!.push(j);
    }

    // Interjornada violations
    let excessoSemanal = 0;
    let excessoMensal = 0;
    for (const [, records] of byMotorista) {
      const workRecords = records.filter(r => !r.semJornada).sort((a, b) => {
        const da = parseDateBR(a.data);
        const db = parseDateBR(b.data);
        return (da?.getTime() || 0) - (db?.getTime() || 0);
      });

      for (let i = 0; i < workRecords.length - 1; i++) {
        const rest = calcInterjornadaMinutes(workRecords[i], workRecords[i + 1]);
        if (rest > 0 && rest < 11 * 60) interjornadaViolations++;
      }

      // Weekly
      const weekMap = new Map<string, number>();
      for (const r of workRecords) {
        const d = parseDateBR(r.data);
        if (!d) continue;
        const ws = new Date(d); ws.setDate(ws.getDate() - ws.getDay());
        const key = toDateKey(ws);
        weekMap.set(key, (weekMap.get(key) || 0) + calcJornadaMinutes(r));
      }
      excessoSemanal += Array.from(weekMap.values()).filter(m => m > 44 * 60).length;

      // Monthly
      const monthMap = new Map<string, number>();
      for (const r of workRecords) {
        const d = parseDateBR(r.data);
        if (!d) continue;
        const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
        monthMap.set(key, (monthMap.get(key) || 0) + calcJornadaMinutes(r));
      }
      excessoMensal += Array.from(monthMap.values()).filter(m => m > 220 * 60).length;
    }

    return {
      totalWorkMins, totalMotoristas: totalMotoristas.size,
      folgas, folgasComp, faltas, foraEscala, treinamentos, atestados, ferias,
      excessoDiario, excessoSemanal, excessoMensal, interjornadaViolations,
      totalRegistros: filtered.length,
    };
  }, [filtered]);

  // Top 10 charts
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

    const getName = (mat: string) => {
      const m = motoristaMap.get(mat);
      return m ? `${m.nome.split(' ')[0]} ${m.nome.split(' ').slice(-1)[0]}` : mat;
    };

    const entries = Array.from(byMat.entries());

    const topHoras = entries
      .sort((a, b) => b[1].workMins - a[1].workMins)
      .slice(0, 10)
      .map(([mat, v]) => ({ name: getName(mat), value: Math.round(v.workMins / 60), mat }));

    const topFaltas = entries
      .filter(([, v]) => v.faltas > 0)
      .sort((a, b) => b[1].faltas - a[1].faltas)
      .slice(0, 10)
      .map(([mat, v]) => ({ name: getName(mat), value: v.faltas, mat }));

    const topAtestados = entries
      .filter(([, v]) => v.atestados > 0)
      .sort((a, b) => b[1].atestados - a[1].atestados)
      .slice(0, 10)
      .map(([mat, v]) => ({ name: getName(mat), value: v.atestados, mat }));

    const topMaioresJornadas = entries
      .filter(([, v]) => v.maxJornada > 0)
      .sort((a, b) => b[1].maxJornada - a[1].maxJornada)
      .slice(0, 10)
      .map(([mat, v]) => ({ name: getName(mat), value: Math.round(v.maxJornada / 60 * 10) / 10, mat }));

    const topMenoresJornadas = entries
      .filter(([, v]) => v.minJornada > 0 && v.minJornada < Infinity)
      .sort((a, b) => a[1].minJornada - b[1].minJornada)
      .slice(0, 10)
      .map(([mat, v]) => ({ name: getName(mat), value: Math.round(v.minJornada / 60 * 10) / 10, mat }));

    return { topHoras, topFaltas, topAtestados, topMaioresJornadas, topMenoresJornadas };
  }, [filtered, motoristaMap]);

  // Search driver
  const handleSearchDriver = useCallback(() => {
    const q = searchMatricula.trim();
    if (!q) return;
    const m = motoristas.find(m => m.matricula === q || m.nome.toLowerCase().includes(q.toLowerCase()));
    if (m) setSelectedMotorista(m);
  }, [searchMatricula, motoristas]);

  const driverJornadas = useMemo(() => {
    if (!selectedMotorista) return [];
    return jornadasMotorista.filter(j => j.matricula === selectedMotorista.matricula);
  }, [jornadasMotorista, selectedMotorista]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-card border border-gray-200 p-4 shadow-card">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Data Inicio</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2 top-2.5 text-slate-400" />
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Data Fim</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2 top-2.5 text-slate-400" />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Filial</label>
            <div className="relative">
              <Filter size={14} className="absolute left-2 top-2.5 text-slate-400" />
              <select value={filialFilter} onChange={e => setFilialFilter(e.target.value)} className="pl-7 pr-8 py-2 text-xs border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none">
                {filiais.map(f => <option key={f} value={f}>{f === 'Todas' ? 'Todas as Filiais' : f}</option>)}
              </select>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-2xs font-bold text-slate-500 uppercase block mb-1">Buscar Motorista</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchMatricula}
                  onChange={e => setSearchMatricula(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchDriver()}
                  placeholder="Matricula ou nome..."
                  className="w-full pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
                />
              </div>
              <button onClick={handleSearchDriver} className="px-4 py-2 text-xs font-bold bg-brand-600 text-white rounded-button hover:bg-brand-700">
                Detalhar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Registros" value={globalKpis.totalRegistros} sub={`${globalKpis.totalMotoristas} motorista(s)`} color="purple" />
        <KpiCard label="Total Trabalhado" value={minutesToHM(globalKpis.totalWorkMins)} sub="Todas as jornadas" color="blue" icon={Clock} />
        <KpiCard label="Folgas" value={globalKpis.folgas} sub={`+ ${globalKpis.folgasComp} compensadas`} color="green" />
        <KpiCard label="Faltas" value={globalKpis.faltas} color="red" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Fora de Escala" value={globalKpis.foraEscala} color="teal" />
        <KpiCard label="Atestados" value={globalKpis.atestados} color="blue" />
        <KpiCard label="Treinamentos" value={globalKpis.treinamentos} color="cyan" />
        <KpiCard label="Ferias" value={globalKpis.ferias} color="amber" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Interjornadas < 11h" value={globalKpis.interjornadaViolations} sub="Descanso insuficiente" color="orange" icon={AlertTriangle} />
        <KpiCard label="Excesso Diario (>11h)" value={globalKpis.excessoDiario} color="red" icon={AlertTriangle} />
        <KpiCard label="Excesso Semanal (>44h)" value={globalKpis.excessoSemanal} color="red" />
        <KpiCard label="Excesso Mensal (>220h)" value={globalKpis.excessoMensal} color="red" />
      </div>

      {/* Top 10 Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopChart title="Top 10 - Mais Horas Trabalhadas" data={tops.topHoras} unit="h" colors={COLORS_TOP} />
        <TopChart title="Top 10 - Mais Faltas" data={tops.topFaltas} unit="" colors={COLORS_BOTTOM} />
        <TopChart title="Top 10 - Mais Atestados" data={tops.topAtestados} unit="" colors={COLORS_TOP} />
        <TopChart title="Top 10 - Maiores Jornadas (dia)" data={tops.topMaioresJornadas} unit="h" colors={COLORS_BOTTOM} />
        <TopChart title="Top 10 - Menores Jornadas (dia)" data={tops.topMenoresJornadas} unit="h" colors={COLORS_TOP} />
      </div>

      {/* Driver Detail Modal */}
      {selectedMotorista && (
        <DriverDetailModal
          motorista={selectedMotorista}
          jornadas={driverJornadas}
          setJornadas={setJornadasMotorista}
          codigosJornada={codigosJornada}
          allJornadas={jornadasMotorista}
          onClose={() => setSelectedMotorista(null)}
        />
      )}
    </div>
  );
}

// ─── Top Chart Component ─────────────────────────────────────────────────────

function TopChart({ title, data, unit, colors }: {
  title: string;
  data: { name: string; value: number; mat?: string }[];
  unit: string;
  colors: string[];
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
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
