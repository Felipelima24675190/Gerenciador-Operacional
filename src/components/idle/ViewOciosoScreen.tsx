import { useMemo, useState } from 'react';
import { RegistroOciosidade, RegistroLinha, Viagem } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Calendar, Search, AlertCircle } from 'lucide-react';

interface ViewOciosoScreenProps {
  registros: RegistroOciosidade[];
  linhas: RegistroLinha[];
  viagens: Viagem[];
}

const COLORS = ['#0f172a', '#1e40af', '#0369a1', '#0891b2', '#0d9488', '#059669', '#16a34a', '#ca8a04', '#dc2626', '#9333ea'];

const TFD_FRETAMENTO_CODES = new Set(['16021.1', '16047.1', '16056-3', '16021', '16047', '16056']);
const isFretamento = (code: string) => TFD_FRETAMENTO_CODES.has(code.trim()) || code.trim().startsWith('16021') || code.trim().startsWith('16047') || code.trim() === '16056-3';

function parseDataBR(s: string): Date | null {
  try {
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y, m - 1, d);
  } catch { return null; }
}

const fmtKm = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;

const ChartCard = ({ title, data, yAxisWidth = 90, valueFormatter, valueLabel = 'KM' }: {
  title: string;
  data: { name: string; value: number; pending?: boolean; fullName?: string; code?: string; media?: number }[];
  yAxisWidth?: number;
  valueFormatter?: (v: number) => string;
  valueLabel?: string;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
    <h4 className="text-xs font-black text-slate-600 uppercase tracking-tighter mb-3">{title}</h4>
    {data.length > 0 ? (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={yAxisWidth} interval={0} axisLine={false} />
            <Tooltip
              formatter={(v: number) => [valueFormatter ? valueFormatter(v) : fmtKm(v), valueLabel]}
              labelFormatter={(label: string, payload: any[]) => {
                const entry = payload?.[0]?.payload;
                let lbl = (entry?.fullName && entry.fullName !== label)
                  ? `${entry.fullName} (${entry.code || label})`
                  : label;
                if (entry?.media !== undefined) lbl += ` — Média: ${fmtKm(entry.media)}/dia`;
                return lbl;
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.pending ? '#f59e0b' : COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) : <p className="text-xs text-slate-400 text-center py-10">Sem dados no período</p>}
  </div>
);

export default function ViewOciosoScreen({ registros, linhas, viagens }: ViewOciosoScreenProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [veiculoBusca, setVeiculoBusca] = useState('');

  const viagensMap = useMemo(() => new Map(viagens.map(v => [v.numeroLinha.trim(), v.nomeLinha])), [viagens]);

  // ─── Filter file-2 records by date range ──────────────────────────────────
  const registrosFiltrados = useMemo(() => {
    if (!dataInicio && !dataFim) return registros;
    const start = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const end = dataFim ? new Date(dataFim + 'T23:59:59') : null;
    return registros.filter(r => {
      const d = parseDataBR(r.data);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [registros, dataInicio, dataFim]);

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const veiculosUnicos = new Set(registrosFiltrados.map(r => r.prefixo)).size;
    const totalOp = registrosFiltrados.reduce((s, r) => s + r.operacionalKm, 0);
    const totalOcio = registrosFiltrados.reduce((s, r) => s + r.ociosaKm, 0);
    const totalKm = registrosFiltrados.reduce((s, r) => s + r.totalKm, 0);
    const totalFretamento = linhas.filter(l => isFretamento(l.numeroLinha)).reduce((s, l) => s + l.km, 0);
    return { veiculosUnicos, totalOp, totalOcio, totalKm, totalFretamento };
  }, [registrosFiltrados, linhas]);

  // ─── Top 10 veículos - mais km operacional ─────────────────────────────────
  const topVeiculosOp = useMemo(() => {
    const acc: Record<string, number> = {};
    registrosFiltrados.forEach(r => { acc[r.prefixo] = (acc[r.prefixo] || 0) + r.operacionalKm; });
    return Object.entries(acc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [registrosFiltrados]);

  // ─── Top 10 veículos - mais km ociosa ─────────────────────────────────────
  const topVeiculosOcio = useMemo(() => {
    const acc: Record<string, number> = {};
    registrosFiltrados.forEach(r => { acc[r.prefixo] = (acc[r.prefixo] || 0) + r.ociosaKm; });
    return Object.entries(acc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [registrosFiltrados]);

  // ─── Veículos mais utilizados (dias ativos + média km/dia) ───────────────
  const veiculosMaisUtilizados = useMemo(() => {
    const dias: Record<string, number> = {};
    const km: Record<string, number> = {};
    registrosFiltrados.forEach(r => {
      if (r.operacionalKm > 0 || r.totalKm > 0) {
        dias[r.prefixo] = (dias[r.prefixo] || 0) + 1;
        km[r.prefixo] = (km[r.prefixo] || 0) + r.totalKm;
      }
    });
    return Object.entries(dias)
      .map(([name, d]) => ({ name, value: d, media: km[name] / d }))
      .sort((a, b) => b.value - a.value || b.media - a.media)
      .slice(0, 10);
  }, [registrosFiltrados]);

  const veiculosMenosUtilizados = useMemo(() => {
    const dias: Record<string, number> = {};
    const km: Record<string, number> = {};
    registrosFiltrados.forEach(r => {
      if (!(r.prefixo in dias)) { dias[r.prefixo] = 0; km[r.prefixo] = 0; }
    });
    registrosFiltrados.forEach(r => {
      if (r.operacionalKm > 0 || r.totalKm > 0) {
        dias[r.prefixo]++;
        km[r.prefixo] += r.totalKm;
      }
    });
    return Object.entries(dias)
      .map(([name, d]) => ({ name, value: d, media: d > 0 ? km[name] / d : 0 }))
      .sort((a, b) => a.value - b.value || b.media - a.media)
      .slice(0, 10);
  }, [registrosFiltrados]);

  const lineDisplayName = (codigo: string) => {
    const nome = viagensMap.get(codigo);
    if (!nome) return codigo;
    // Show short name truncated to 22 chars; tooltip shows full
    return nome.length > 22 ? nome.slice(0, 21) + '…' : nome;
  };

  // ─── Top 10 linhas por km (from file 1 — not date-filtered) ───────────────
  const topLinhasKm = useMemo(() => {
    return [...linhas]
      .filter(l => l.km > 0)
      .sort((a, b) => b.km - a.km)
      .slice(0, 10)
      .map(l => ({ name: lineDisplayName(l.numeroLinha), fullName: viagensMap.get(l.numeroLinha) || l.numeroLinha, code: l.numeroLinha, value: l.km, pending: l.pendenteCadastro }));
  }, [linhas, viagensMap]);

  // ─── Top 10 linhas por km ociosa ──────────────────────────────────────────
  const topLinhasOcio = useMemo(() => {
    const veicOcioMap: Record<string, number> = {};
    registrosFiltrados.forEach(r => { veicOcioMap[r.prefixo] = (veicOcioMap[r.prefixo] || 0) + r.ociosaKm; });

    // TODO: ociosa per-line from vehicle records
    return linhas
      .filter(l => !isFretamento(l.numeroLinha))
      .map(l => {
        const ocioTotal = l.veiculos.reduce((s, v) => s + (veicOcioMap[v] || 0), 0);
        return { name: lineDisplayName(l.numeroLinha), fullName: viagensMap.get(l.numeroLinha) || l.numeroLinha, code: l.numeroLinha, value: ocioTotal, pending: l.pendenteCadastro };
      })
      .filter(l => l.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [linhas, registrosFiltrados, viagensMap]);

  // ─── Fretamento lines chart ────────────────────────────────────────────────
  const topLinhasFretamento = useMemo(() => {
    return linhas
      .filter(l => isFretamento(l.numeroLinha))
      .map(l => ({ name: lineDisplayName(l.numeroLinha), fullName: viagensMap.get(l.numeroLinha) || l.numeroLinha, code: l.numeroLinha, value: l.km, pending: l.pendenteCadastro }))
      .sort((a, b) => b.value - a.value);
  }, [linhas, viagensMap]);

  // ─── Vehicle lookup: which lines does a vehicle run on? ───────────────────
  const veiculoParaLinhas = useMemo(() => {
    const map: Record<string, RegistroLinha[]> = {};
    linhas.forEach(l => {
      l.veiculos.forEach(v => {
        if (!map[v]) map[v] = [];
        map[v].push(l);
      });
    });
    return map;
  }, [linhas]);

  const veiculoBuscaLinhas = useMemo(() => {
    const term = veiculoBusca.trim().toUpperCase();
    if (!term) return null;
    // Find all vehicles whose prefix contains the search term
    const keys = Object.keys(veiculoParaLinhas).filter(k => k.toUpperCase().includes(term));
    if (!keys.length) return [];
    // Return the lines for the first matching vehicle
    const exato = keys.find(k => k.toUpperCase() === term) || keys[0];
    return { prefixo: exato, linhasList: veiculoParaLinhas[exato] };
  }, [veiculoBusca, veiculoParaLinhas]);

  if (registros.length === 0 && linhas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800">Nenhum Dado Importado</h2>
        <p className="text-slate-500 max-w-md mt-2">Importe os arquivos de Quilometragem Operacional para visualizar o dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="bg-slate-800 p-4 flex gap-3 overflow-x-auto rounded-xl">
        {[
          { l: 'Veículos', v: kpis.veiculosUnicos },
          { l: 'KM Operacional', v: fmtKm(kpis.totalOp) },
          { l: 'KM Ociosa', v: fmtKm(kpis.totalOcio) },
          { l: 'KM Total', v: fmtKm(kpis.totalKm) },
          { l: 'KM Fretamento', v: fmtKm(kpis.totalFretamento) },
          { l: 'Linhas', v: linhas.length },
        ].map((k, i) => (
          <div key={i} className="bg-slate-700 rounded-lg p-3 text-center min-w-[130px] flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{k.l}</p>
            <p className="text-lg font-black text-white mt-0.5">{k.v}</p>
          </div>
        ))}
      </div>

      {/* % Operante / Ociosa */}
      {kpis.totalKm > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">% Operante</p>
              <p className="text-3xl font-black text-emerald-700">{((kpis.totalOp / kpis.totalKm) * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-emerald-500 mt-0.5">{fmtKm(kpis.totalOp)} operacional</p>
            </div>
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 font-black text-sm">OP</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-tighter">% Ociosa</p>
              <p className="text-3xl font-black text-amber-700">{((kpis.totalOcio / kpis.totalKm) * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-amber-500 mt-0.5">{fmtKm(kpis.totalOcio)} ociosa</p>
            </div>
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 font-black text-sm">OC</div>
          </div>
        </div>
      )}

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Início</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Fim</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={14} />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </div>
          </div>
          <p className="text-sm text-slate-500 pb-2">{registrosFiltrados.length} registros no período</p>
        </div>
      </div>

      {/* Charts row 1: Operacional e Ociosa por veículo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top 10 Veículos — Mais KM Rodados (Operacional)" data={topVeiculosOp} />
        <ChartCard title="Top 10 Veículos — Mais KM Ociosa" data={topVeiculosOcio} />
      </div>

      {/* Charts row 2: Utilização */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Veículos Mais Utilizados (Dias em Operação)"
          data={veiculosMaisUtilizados}
          valueFormatter={(v) => `${v} ${v === 1 ? 'dia' : 'dias'}`}
          valueLabel="Dias"
        />
        <ChartCard
          title="Veículos Menos Utilizados (Dias em Operação)"
          data={veiculosMenosUtilizados}
          valueFormatter={(v) => `${v} ${v === 1 ? 'dia' : 'dias'}`}
          valueLabel="Dias"
        />
      </div>

      {/* Charts row 3: Linhas */}
      {linhas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <ChartCard title="Top 10 Linhas — Mais KM Rodados" data={topLinhasKm} yAxisWidth={130} />
            {linhas.some(l => l.pendenteCadastro) && (
              <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Barras amarelas = linha pendente de cadastro</p>
            )}
          </div>
          <ChartCard title="Top 10 Linhas — Mais KM Ociosa (Soma dos Veículos)" data={topLinhasOcio} yAxisWidth={130} />
        </div>
      )}

      {/* Fretamento chart */}
      {topLinhasFretamento.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Linhas de Fretamento (TFD) — KM Operados" data={topLinhasFretamento} yAxisWidth={130} />
        </div>
      )}

      {/* Vehicle lookup */}
      {linhas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-tighter mb-4">Consulta por Veículo — Linhas que Opera</h4>
          <div className="relative max-w-sm mb-4">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Digite o prefixo do veículo..."
              value={veiculoBusca}
              onChange={e => setVeiculoBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {veiculoBuscaLinhas === null && (
            <p className="text-sm text-slate-400">Digite o prefixo para ver as linhas.</p>
          )}
          {veiculoBuscaLinhas !== null && typeof veiculoBuscaLinhas === 'object' && !Array.isArray(veiculoBuscaLinhas) && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-3">Veículo <span className="text-slate-800 font-black">{veiculoBuscaLinhas.prefixo}</span> opera nas seguintes linhas:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-800 text-white text-xs">
                    <tr>
                      <th className="px-4 py-2 font-bold uppercase">Código Linha</th>
                      <th className="px-4 py-2 font-bold uppercase">Nome</th>
                      <th className="px-4 py-2 font-bold uppercase text-right">KM Total</th>
                      <th className="px-4 py-2 font-bold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {veiculoBuscaLinhas.linhasList.sort((a, b) => b.km - a.km).map(l => (
                      <tr key={l.id} className="border-b border-gray-100 hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono font-bold text-slate-800">{l.numeroLinha}</td>
                        <td className="px-4 py-2 text-slate-600">{viagensMap.get(l.numeroLinha) || <span className="text-slate-400 italic">Não cadastrada</span>}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-700">{fmtKm(l.km)}</td>
                        <td className="px-4 py-2">
                          {l.pendenteCadastro ? (
                            <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full w-max">
                              <AlertCircle size={10} /> Pendente
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full w-max">Cadastrada</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {Array.isArray(veiculoBuscaLinhas) && veiculoBuscaLinhas.length === 0 && (
            <p className="text-sm text-red-500">Veículo não encontrado na base de linhas.</p>
          )}
        </div>
      )}
    </div>
  );
}
