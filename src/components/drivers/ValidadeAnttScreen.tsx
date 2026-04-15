import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ShieldCheck, AlertTriangle, Clock, HelpCircle, Search } from 'lucide-react';
import { Motorista, ValidadeAntt } from '../../types';

interface ValidadeAnttScreenProps {
  validades: ValidadeAntt[];
  motoristas: Motorista[];
}

type Status = 'Cadastrado' | 'Não Cadastrado' | 'Vencido' | 'A Vencer';

const STATUS_COLORS: Record<Status, string> = {
  'Cadastrado': '#10b981',
  'A Vencer': '#f59e0b',
  'Vencido': '#ef4444',
  'Não Cadastrado': '#94a3b8',
};

function parseDDMMYYYY(s?: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return isNaN(dt.getTime()) ? null : dt;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function classifyValidity(value: string | undefined, today: Date): Status {
  if (!value || !value.trim()) return 'Não Cadastrado';
  const d = parseDDMMYYYY(value);
  if (!d) return 'Não Cadastrado';
  const diff = daysBetween(today, d);
  if (diff < 0) return 'Vencido';
  if (diff <= 30) return 'A Vencer';
  return 'Cadastrado';
}

export default function ValidadeAnttScreen({ validades, motoristas }: ValidadeAnttScreenProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | Status>('TODOS');
  const [empresaFilter, setEmpresaFilter] = useState<'AMBOS' | 'PROGRESSO' | 'CRUZEIRO'>('AMBOS');

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const rows = useMemo(() => {
    const motMap = new Map(motoristas.map(m => [m.matricula, m]));
    return validades.map(v => {
      const mot = motMap.get(v.matricula);
      const statusProgresso = classifyValidity(v.validadeProgresso, today);
      const statusCruzeiro = classifyValidity(v.validadeCruzeiro, today);
      // Overall status (worst case counts)
      const worstRank: Record<Status, number> = { 'Vencido': 0, 'A Vencer': 1, 'Não Cadastrado': 2, 'Cadastrado': 3 };
      const statusOverall: Status = worstRank[statusProgresso] <= worstRank[statusCruzeiro] ? statusProgresso : statusCruzeiro;
      return {
        ...v,
        nome: mot?.nome ?? 'Não encontrado na base',
        filial: mot?.filial ?? '-',
        area: mot?.area ?? '-',
        statusMotorista: mot?.status ?? 'Desconhecido',
        statusProgresso,
        statusCruzeiro,
        statusOverall,
      };
    });
  }, [validades, motoristas, today]);

  const { pieData, totals } = useMemo(() => {
    const counts: Record<Status, number> = { 'Cadastrado': 0, 'Não Cadastrado': 0, 'Vencido': 0, 'A Vencer': 0 };
    rows.forEach(r => {
      const applyTo = (s: Status) => { counts[s]++; };
      if (empresaFilter === 'PROGRESSO') applyTo(r.statusProgresso);
      else if (empresaFilter === 'CRUZEIRO') applyTo(r.statusCruzeiro);
      else applyTo(r.statusOverall);
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return {
      totals: { ...counts, total },
      pieData: [
        { name: 'Cadastrados', value: counts['Cadastrado'], color: STATUS_COLORS['Cadastrado'] },
        { name: 'A Vencer', value: counts['A Vencer'], color: STATUS_COLORS['A Vencer'] },
        { name: 'Vencidos', value: counts['Vencido'], color: STATUS_COLORS['Vencido'] },
        { name: 'Não Cadastrados', value: counts['Não Cadastrado'], color: STATUS_COLORS['Não Cadastrado'] },
      ].filter(x => x.value > 0),
    };
  }, [rows, empresaFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter !== 'TODOS' && r.statusOverall !== statusFilter) return false;
      if (!term) return true;
      return (
        r.matricula.toLowerCase().includes(term) ||
        r.nome.toLowerCase().includes(term) ||
        r.cpf.toLowerCase().includes(term)
      );
    });
  }, [rows, search, statusFilter]);

  const pct = (n: number) => totals.total === 0 ? '0%' : `${((n / totals.total) * 100).toFixed(1)}%`;

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={<ShieldCheck size={22} className="text-emerald-500" />} label="Cadastrados" value={totals.Cadastrado} percent={pct(totals.Cadastrado)} colorClass="text-emerald-600" />
        <KpiCard icon={<Clock size={22} className="text-amber-500" />} label="A Vencer (30d)" value={totals['A Vencer']} percent={pct(totals['A Vencer'])} colorClass="text-amber-600" />
        <KpiCard icon={<AlertTriangle size={22} className="text-red-500" />} label="Vencidos" value={totals.Vencido} percent={pct(totals.Vencido)} colorClass="text-red-600" />
        <KpiCard icon={<HelpCircle size={22} className="text-slate-400" />} label="Não Cadastrados" value={totals['Não Cadastrado']} percent={pct(totals['Não Cadastrado'])} colorClass="text-slate-500" />
      </div>

      {/* Pie + filter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-card border border-gray-200 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Distribuição de Validade ANTT</h3>
            <select
              value={empresaFilter}
              onChange={e => setEmpresaFilter(e.target.value as typeof empresaFilter)}
              className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white"
            >
              <option value="AMBOS">Ambas Empresas</option>
              <option value="PROGRESSO">Só Progresso</option>
              <option value="CRUZEIRO">Só Cruzeiro</option>
            </select>
          </div>
          {pieData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-slate-400">Nenhum dado cadastrado</div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  labelLine={false}
                  label={({ percent }) => {
                    const p = (percent ?? 0) * 100;
                    return p >= 5 ? `${p.toFixed(1)}%` : '';
                  }}
                >
                  {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Pie>
                <Tooltip formatter={(v: number, n: string) => [`${v} motorista(s)`, n]} />
                <Legend
                  verticalAlign="bottom"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-card border border-gray-200 shadow-card p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Resumo por Empresa</h3>
          <div className="space-y-3">
            <EmpresaRow label="Viação Progresso" rows={rows} getStatus={r => r.statusProgresso} />
            <EmpresaRow label="Viação Cruzeiro" rows={rows} getStatus={r => r.statusCruzeiro} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por matrícula, nome ou CPF..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white"
        >
          <option value="TODOS">Todos os status</option>
          <option value="Cadastrado">Cadastrado</option>
          <option value="A Vencer">A Vencer</option>
          <option value="Vencido">Vencido</option>
          <option value="Não Cadastrado">Não Cadastrado</option>
        </select>
        <div className="text-xs text-slate-500">{filtered.length} de {rows.length}</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Matrícula</th>
                <th className="px-4 py-3 text-left font-semibold">Nome</th>
                <th className="px-4 py-3 text-left font-semibold">CPF</th>
                <th className="px-4 py-3 text-left font-semibold">Admissão</th>
                <th className="px-4 py-3 text-left font-semibold">Val. Progresso</th>
                <th className="px-4 py-3 text-left font-semibold">Val. Cruzeiro</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
              ) : filtered.slice(0, 500).map(r => (
                <tr key={r.matricula} className="border-t border-gray-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">{r.matricula}</td>
                  <td className="px-4 py-2">{r.nome}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.cpf}</td>
                  <td className="px-4 py-2">{r.dataAdmissao}</td>
                  <td className="px-4 py-2"><StatusBadge status={r.statusProgresso} value={r.validadeProgresso} /></td>
                  <td className="px-4 py-2"><StatusBadge status={r.statusCruzeiro} value={r.validadeCruzeiro} /></td>
                  <td className="px-4 py-2"><StatusBadge status={r.statusOverall} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 500 && (
          <div className="px-4 py-2 text-xs text-slate-500 bg-slate-50 border-t border-gray-100">
            Exibindo as primeiras 500 linhas. Use os filtros acima para refinar.
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, percent, colorClass }: { icon: React.ReactNode; label: string; value: number; percent: string; colorClass: string }) {
  return (
    <div className="bg-white rounded-card border border-gray-200 shadow-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
          <p className="text-xs text-slate-400 mt-0.5">{percent} do total</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
      </div>
    </div>
  );
}

function EmpresaRow({ label, rows, getStatus }: { label: string; rows: { statusProgresso: Status; statusCruzeiro: Status }[]; getStatus: (r: { statusProgresso: Status; statusCruzeiro: Status }) => Status }) {
  const counts: Record<Status, number> = { 'Cadastrado': 0, 'Não Cadastrado': 0, 'Vencido': 0, 'A Vencer': 0 };
  rows.forEach(r => { counts[getStatus(r)]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const pct = (n: number) => total === 0 ? 0 : (n / total) * 100;
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-2">{label}</p>
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
        <div style={{ width: `${pct(counts.Cadastrado)}%`, backgroundColor: STATUS_COLORS.Cadastrado }} />
        <div style={{ width: `${pct(counts['A Vencer'])}%`, backgroundColor: STATUS_COLORS['A Vencer'] }} />
        <div style={{ width: `${pct(counts.Vencido)}%`, backgroundColor: STATUS_COLORS.Vencido }} />
        <div style={{ width: `${pct(counts['Não Cadastrado'])}%`, backgroundColor: STATUS_COLORS['Não Cadastrado'] }} />
      </div>
      <div className="grid grid-cols-4 gap-2 mt-2 text-[10px]">
        <LegendItem color={STATUS_COLORS.Cadastrado} label="Cadastrado" value={counts.Cadastrado} />
        <LegendItem color={STATUS_COLORS['A Vencer']} label="A Vencer" value={counts['A Vencer']} />
        <LegendItem color={STATUS_COLORS.Vencido} label="Vencido" value={counts.Vencido} />
        <LegendItem color={STATUS_COLORS['Não Cadastrado']} label="N/ Cadastrado" value={counts['Não Cadastrado']} />
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-600">{label}: <strong>{value}</strong></span>
    </div>
  );
}

function StatusBadge({ status, value }: { status: Status; value?: string }) {
  const classes: Record<Status, string> = {
    'Cadastrado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'A Vencer': 'bg-amber-50 text-amber-700 border-amber-200',
    'Vencido': 'bg-red-50 text-red-700 border-red-200',
    'Não Cadastrado': 'bg-slate-50 text-slate-500 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${classes[status]}`}>
      {status}
      {value ? <span className="opacity-70 font-mono">({value})</span> : null}
    </span>
  );
}
