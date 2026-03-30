import { useMemo, useState } from 'react';
import { Motorista, Ocorrencia, ExcessoVelocidade, Avaria, Acidente, EventoMotorista } from '../../types';
import { Search, TrendingDown, TrendingUp, AlertTriangle, Award, ChevronDown, ChevronUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface ScoreMotoristasScreenProps {
  motoristas: Motorista[];
  ocorrencias: Ocorrencia[];
  excessos: ExcessoVelocidade[];
  avarias: Avaria[];
  acidentes: Acidente[];
  eventosMotorista: EventoMotorista[];
}

interface MotoristaScore {
  matricula: string;
  nome: string;
  filial: string;
  score: number;
  detalhes: {
    faltas: number;
    excessos: number;
    atrasos: number;
    avarias: number;
    acidentes: number;
  };
  deducoes: {
    faltas: number;
    excessos: number;
    atrasos: number;
    avarias: number;
    acidentes: number;
    total: number;
  };
}

// Deduction weights
const PESOS = {
  falta: 5,       // -5 per falta
  excesso: 3,     // -3 per excesso de velocidade
  atraso: 2,      // -2 per atraso de linha
  avaria: 8,      // -8 per avaria
  acidente: 15,   // -15 per acidente
};

function parseDateBR(s: string): Date | null {
  if (!s) return null;
  try {
    const datePart = s.split(' ')[0];
    const [d, m, y] = datePart.split('/').map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
  } catch { return null; }
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-emerald-50 border-emerald-200';
  if (score >= 70) return 'bg-blue-50 border-blue-200';
  if (score >= 50) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excelente';
  if (score >= 70) return 'Bom';
  if (score >= 50) return 'Regular';
  if (score >= 30) return 'Ruim';
  return 'Crítico';
}

function getBarColor(score: number): string {
  if (score >= 90) return '#059669';
  if (score >= 70) return '#0e4f8f';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

export default function ScoreMotoristasScreen({
  motoristas, ocorrencias, excessos, avarias, acidentes, eventosMotorista,
}: ScoreMotoristasScreenProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'nome' | 'faltas' | 'excessos' | 'atrasos'>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedMatricula, setExpandedMatricula] = useState<string | null>(null);
  const [filterFaixa, setFilterFaixa] = useState('Todas');

  // Date range: last 3 months from today
  const dateRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, []);

  const isInRange = (dateStr: string): boolean => {
    const d = parseDateBR(dateStr);
    if (!d) return false;
    return d >= dateRange.start && d <= dateRange.end;
  };

  // Pre-compute per-motorista data within 3-month window
  const scores = useMemo(() => {
    const faltasMap = new Map<string, number>();
    const excessosMap = new Map<string, number>();
    const atrasosMap = new Map<string, number>();
    const avariasMap = new Map<string, number>();
    const acidentesMap = new Map<string, number>();

    // Count faltas from eventosMotorista
    eventosMotorista.forEach(ev => {
      if (ev.tipo === 'FALTA' && isInRange(ev.data)) {
        faltasMap.set(ev.matricula, (faltasMap.get(ev.matricula) || 0) + 1);
      }
    });

    // Count excessos
    excessos.forEach(ex => {
      if (isInRange(ex.dataOcorrencia) && ex.matricula) {
        excessosMap.set(ex.matricula, (excessosMap.get(ex.matricula) || 0) + 1);
      }
    });

    // Count atrasos (from ocorrencias where statusInicio === 'Atraso')
    ocorrencias.forEach(oc => {
      if (oc.statusInicio === 'Atraso' && oc.matriculaMotorista && isInRange(oc.prevInicio)) {
        atrasosMap.set(oc.matriculaMotorista, (atrasosMap.get(oc.matriculaMotorista) || 0) + 1);
      }
    });

    // Count avarias
    avarias.forEach(av => {
      if (av.matriculaMotorista && isInRange(av.data)) {
        avariasMap.set(av.matriculaMotorista, (avariasMap.get(av.matriculaMotorista) || 0) + 1);
      }
    });

    // Count acidentes
    acidentes.forEach(ac => {
      if (ac.matriculaMotorista && isInRange(ac.data)) {
        acidentesMap.set(ac.matriculaMotorista, (acidentesMap.get(ac.matriculaMotorista) || 0) + 1);
      }
    });

    // Only score active motoristas
    const result: MotoristaScore[] = motoristas
      .filter(m => m.status === 'ATIVO - EM OPERAÇÃO')
      .map(m => {
        const faltas = faltasMap.get(m.matricula) || 0;
        const exc = excessosMap.get(m.matricula) || 0;
        const atr = atrasosMap.get(m.matricula) || 0;
        const avar = avariasMap.get(m.matricula) || 0;
        const acid = acidentesMap.get(m.matricula) || 0;

        const dedFaltas = faltas * PESOS.falta;
        const dedExcessos = exc * PESOS.excesso;
        const dedAtrasos = atr * PESOS.atraso;
        const dedAvarias = avar * PESOS.avaria;
        const dedAcidentes = acid * PESOS.acidente;
        const totalDed = dedFaltas + dedExcessos + dedAtrasos + dedAvarias + dedAcidentes;
        const score = Math.max(0, 100 - totalDed);

        return {
          matricula: m.matricula,
          nome: m.nome,
          filial: m.filial || '-',
          score,
          detalhes: { faltas, excessos: exc, atrasos: atr, avarias: avar, acidentes: acid },
          deducoes: { faltas: dedFaltas, excessos: dedExcessos, atrasos: dedAtrasos, avarias: dedAvarias, acidentes: dedAcidentes, total: totalDed },
        };
      });

    return result;
  }, [motoristas, eventosMotorista, excessos, ocorrencias, avarias, acidentes, dateRange]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = scores;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.nome.toLowerCase().includes(q) || s.matricula.includes(q) || s.filial.toLowerCase().includes(q));
    }
    if (filterFaixa !== 'Todas') {
      if (filterFaixa === 'Excelente') list = list.filter(s => s.score >= 90);
      else if (filterFaixa === 'Bom') list = list.filter(s => s.score >= 70 && s.score < 90);
      else if (filterFaixa === 'Regular') list = list.filter(s => s.score >= 50 && s.score < 70);
      else if (filterFaixa === 'Crítico') list = list.filter(s => s.score < 50);
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'score': cmp = a.score - b.score; break;
        case 'nome': cmp = a.nome.localeCompare(b.nome); break;
        case 'faltas': cmp = a.detalhes.faltas - b.detalhes.faltas; break;
        case 'excessos': cmp = a.detalhes.excessos - b.detalhes.excessos; break;
        case 'atrasos': cmp = a.detalhes.atrasos - b.detalhes.atrasos; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [scores, search, sortBy, sortDir, filterFaixa]);

  // Summary stats
  const summary = useMemo(() => {
    const total = scores.length;
    const excelente = scores.filter(s => s.score >= 90).length;
    const bom = scores.filter(s => s.score >= 70 && s.score < 90).length;
    const regular = scores.filter(s => s.score >= 50 && s.score < 70).length;
    const critico = scores.filter(s => s.score < 50).length;
    const avgScore = total > 0 ? scores.reduce((s, m) => s + m.score, 0) / total : 0;
    return { total, excelente, bom, regular, critico, avgScore };
  }, [scores]);

  // Chart: top 10 piores scores
  const chartPiores = useMemo(() => {
    return [...scores]
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)
      .map(s => {
        // Show first name + last name initial for readability
        const parts = s.nome.split(' ').filter(Boolean);
        let shortName = s.nome;
        if (parts.length > 2) {
          shortName = `${parts[0]} ${parts.slice(1).map(p => p[0] + '.').join(' ')}`;
        }
        if (shortName.length > 22) shortName = shortName.substring(0, 21) + '…';
        return {
          name: shortName,
          score: s.score,
          fullName: s.nome,
        };
      });
  }, [scores]);

  // Chart: score distribution
  const chartDistribuicao = useMemo(() => [
    { name: 'Excelente (≥90)', value: summary.excelente, color: '#059669' },
    { name: 'Bom (70-89)', value: summary.bom, color: '#0e4f8f' },
    { name: 'Regular (50-69)', value: summary.regular, color: '#d97706' },
    { name: 'Crítico (<50)', value: summary.critico, color: '#dc2626' },
  ], [summary]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir(field === 'score' ? 'asc' : 'desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortBy }) => (
    sortBy === field
      ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
      : null
  );

  return (
    <div className="space-y-4">
      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Motoristas Avaliados</p>
          <p className="text-2xl font-black text-slate-800">{summary.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Score Médio</p>
          <p className={`text-2xl font-black ${getScoreColor(summary.avgScore)}`}>{summary.avgScore.toFixed(1)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Excelente (≥90)</p>
          <p className="text-2xl font-black text-emerald-700">{summary.excelente}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-[10px] font-bold text-blue-600 uppercase">Bom (70-89)</p>
          <p className="text-2xl font-black text-blue-700">{summary.bom}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-[10px] font-bold text-amber-600 uppercase">Regular (50-69)</p>
          <p className="text-2xl font-black text-amber-700">{summary.regular}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-[10px] font-bold text-red-600 uppercase">Crítico (&lt;50)</p>
          <p className="text-2xl font-black text-red-700">{summary.critico}</p>
        </div>
      </div>

      {/* Scoring info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Award size={18} className="text-brand-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-700">Algoritmo de Score — Últimos 3 meses</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Cada motorista inicia com <strong>100 pontos</strong>. Deduções:
              Falta <strong>−{PESOS.falta}pts</strong> · Excesso de Velocidade <strong>−{PESOS.excesso}pts</strong> · Atraso de Linha <strong>−{PESOS.atraso}pts</strong> · Avaria <strong>−{PESOS.avaria}pts</strong> · Acidente <strong>−{PESOS.acidente}pts</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">Distribuição por Faixa</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDistribuicao}>
                <XAxis dataKey="name" tick={{ fontSize: 8 }} axisLine={false} interval={0} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartDistribuicao.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">Top 10 — Menores Scores</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartPiores} layout="vertical" margin={{ left: 5 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={130} interval={0} axisLine={false} />
                <Tooltip formatter={(v: number) => [`${v} pts`, 'Score']} labelFormatter={(_: string, payload: any[]) => payload?.[0]?.payload?.fullName || ''} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={14}>
                  {chartPiores.map((entry, i) => <Cell key={i} fill={getBarColor(entry.score)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Buscar Motorista</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Nome, matrícula ou filial..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Faixa</label>
          <select value={filterFaixa} onChange={e => setFilterFaixa(e.target.value)} className="text-xs p-2 rounded-lg border border-gray-200 bg-slate-50">
            <option value="Todas">Todas</option>
            <option value="Excelente">Excelente (≥90)</option>
            <option value="Bom">Bom (70-89)</option>
            <option value="Regular">Regular (50-69)</option>
            <option value="Crítico">Crítico (&lt;50)</option>
          </select>
        </div>
        <div className="text-xs text-slate-400 font-bold pb-2">{filtered.length} motoristas</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full text-xs text-left table-fixed">
            <thead className="bg-slate-800 text-white text-[10px] uppercase sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2.5 w-[36px]">#</th>
                <th className="px-2 py-2.5 cursor-pointer hover:text-brand-300" onClick={() => toggleSort('nome')}>
                  Motorista <SortIcon field="nome" />
                </th>
                <th className="px-2 py-2.5 w-[72px]">Matrícula</th>
                <th className="px-2 py-2.5 w-[90px]">Filial</th>
                <th className="px-2 py-2.5 text-center w-[56px] cursor-pointer hover:text-brand-300" onClick={() => toggleSort('score')}>
                  Score <SortIcon field="score" />
                </th>
                <th className="px-2 py-2.5 text-center w-[72px]">Faixa</th>
                <th className="px-2 py-2.5 text-center w-[52px] cursor-pointer hover:text-amber-300" onClick={() => toggleSort('faltas')}>
                  Faltas <SortIcon field="faltas" />
                </th>
                <th className="px-2 py-2.5 text-center w-[60px] cursor-pointer hover:text-amber-300" onClick={() => toggleSort('excessos')}>
                  Excessos <SortIcon field="excessos" />
                </th>
                <th className="px-2 py-2.5 text-center w-[56px] cursor-pointer hover:text-amber-300" onClick={() => toggleSort('atrasos')}>
                  Atrasos <SortIcon field="atrasos" />
                </th>
                <th className="px-2 py-2.5 text-center w-[56px]">Avarias</th>
                <th className="px-2 py-2.5 text-center w-[64px]">Acidentes</th>
                <th className="px-2 py-2.5 text-center w-[68px]">Deduções</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((s, idx) => {
                const isExpanded = expandedMatricula === s.matricula;
                return (<>
                  <tr
                    key={s.matricula}
                    className={`cursor-pointer transition-colors border-b border-gray-50 ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                    onClick={() => setExpandedMatricula(isExpanded ? null : s.matricula)}
                  >
                    <td className="px-2 py-2.5 text-[10px] text-slate-400">{idx + 1}</td>
                    <td className="px-2 py-2.5 font-bold text-slate-700 truncate" title={s.nome}>{s.nome}</td>
                    <td className="px-2 py-2.5 font-mono text-slate-500">{s.matricula}</td>
                    <td className="px-2 py-2.5 text-slate-500 truncate" title={s.filial}>{s.filial}</td>
                    <td className={`px-2 py-2.5 text-center font-black text-lg ${getScoreColor(s.score)}`}>{s.score}</td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black border ${getScoreBg(s.score)} ${getScoreColor(s.score)}`}>
                        {getScoreLabel(s.score)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">{s.detalhes.faltas > 0 ? <span className="text-red-600 font-bold">{s.detalhes.faltas}</span> : <span className="text-slate-300">0</span>}</td>
                    <td className="px-2 py-2.5 text-center">{s.detalhes.excessos > 0 ? <span className="text-amber-600 font-bold">{s.detalhes.excessos}</span> : <span className="text-slate-300">0</span>}</td>
                    <td className="px-2 py-2.5 text-center">{s.detalhes.atrasos > 0 ? <span className="text-blue-600 font-bold">{s.detalhes.atrasos}</span> : <span className="text-slate-300">0</span>}</td>
                    <td className="px-2 py-2.5 text-center">{s.detalhes.avarias > 0 ? <span className="text-orange-600 font-bold">{s.detalhes.avarias}</span> : <span className="text-slate-300">0</span>}</td>
                    <td className="px-2 py-2.5 text-center">{s.detalhes.acidentes > 0 ? <span className="text-red-700 font-bold">{s.detalhes.acidentes}</span> : <span className="text-slate-300">0</span>}</td>
                    <td className="px-2 py-2.5 text-center font-bold text-red-500">
                      {s.deducoes.total > 0 ? `-${s.deducoes.total}` : <span className="text-slate-300">0</span>}
                    </td>
                  </tr>
                  {/* Expanded detail */}
                  {isExpanded && (
                    <tr key={`${s.matricula}-detail`}>
                      <td colSpan={12} className="p-0">
                        <div className="bg-slate-50 border-b border-gray-200 px-6 py-4">
                          <div className="grid grid-cols-5 gap-3">
                            {[
                              { label: 'Faltas', count: s.detalhes.faltas, ded: s.deducoes.faltas, peso: PESOS.falta, color: 'red' },
                              { label: 'Excessos Vel.', count: s.detalhes.excessos, ded: s.deducoes.excessos, peso: PESOS.excesso, color: 'amber' },
                              { label: 'Atrasos Linha', count: s.detalhes.atrasos, ded: s.deducoes.atrasos, peso: PESOS.atraso, color: 'blue' },
                              { label: 'Avarias', count: s.detalhes.avarias, ded: s.deducoes.avarias, peso: PESOS.avaria, color: 'orange' },
                              { label: 'Acidentes', count: s.detalhes.acidentes, ded: s.deducoes.acidentes, peso: PESOS.acidente, color: 'red' },
                            ].map((item, i) => (
                              <div key={i} className={`bg-white rounded-lg border border-${item.color}-100 p-3`}>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">{item.label}</p>
                                <p className="text-lg font-black text-slate-700">{item.count}</p>
                                <p className="text-[10px] text-slate-400">
                                  {item.count} × {item.peso}pts = <span className="font-bold text-red-500">−{item.ded}pts</span>
                                </p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-600">Score Final:</span>
                              <span className="text-xs text-slate-500">100 − {s.deducoes.total} =</span>
                              <span className={`text-lg font-black ${getScoreColor(s.score)}`}>{s.score}</span>
                            </div>
                            {s.score < 50 && (
                              <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                                <AlertTriangle size={12} /> Atenção: Score crítico
                              </div>
                            )}
                            {s.score >= 90 && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                <TrendingUp size={12} /> Desempenho excelente
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {scores.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <TrendingDown size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-600">Sem motoristas para avaliar</h3>
          <p className="text-sm text-slate-400 mt-1">Importe a base de motoristas com status "ATIVO - EM OPERAÇÃO" para gerar os scores.</p>
        </div>
      )}
    </div>
  );
}
