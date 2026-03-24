import { useState, useMemo } from 'react';
import { Calendar, Filter, FileBarChart, Users, Bus, FileDown } from 'lucide-react';
import { Motorista, Ocorrencia, ExcessoVelocidade, MultaANTT, Avaria, ParadaIndevida, MultaTransito, RegistroOciosidade, RegistroLinha } from '../../types';
import StatCard from '../dashboard/StatCard';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';


interface ReportsScreenProps {
  motoristas: Motorista[];
  ocorrencias: Ocorrencia[];
  excessos?: ExcessoVelocidade[];
  multasAntt?: MultaANTT[];
  avarias?: Avaria[];
  paradas?: ParadaIndevida[];
  multasTransito?: MultaTransito[];
  registrosOciosidade?: RegistroOciosidade[];
  registrosLinhas?: RegistroLinha[];
}

type Tab = 'pontualidade' | 'velocidade' | 'antt' | 'avarias' | 'paradas' | 'transito' | 'quilometragem';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pontualidade', label: 'Pontualidade' },
  { id: 'velocidade', label: 'Velocidade' },
  { id: 'antt', label: 'Multas ANTT' },
  { id: 'avarias', label: 'Avarias' },
  { id: 'paradas', label: 'Paradas Indevidas' },
  { id: 'transito', label: 'Multas de Trânsito' },
  { id: 'quilometragem', label: 'Quilometragem Op.' },
];

function parseDate(str: string): Date | null {
  // Handles "DD/MM/YYYY HH:MM" or "DD/MM/YYYY"
  try {
    const datePart = str.split(' ')[0];
    const [d, m, y] = datePart.split('/').map(Number);
    return new Date(y, m - 1, d);
  } catch { return null; }
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── Pontualidade ──────────────────────────────────────────────────────────────
function PontualidadeTab({ motoristas, ocorrencias }: { motoristas: Motorista[]; ocorrencias: Ocorrencia[] }) {
  const [dataInicio, setDataInicio] = useState('2026-03-18');
  const [dataFim, setDataFim] = useState('2026-03-18');
  const [areaSelecionada, setAreaSelecionada] = useState('Todas as áreas (Geral)');

  const areasDisponiveis = useMemo(() => {
    const areas = new Set(motoristas.map(m => m.area));
    return ['Todas as áreas (Geral)', ...Array.from(areas)];
  }, [motoristas]);

  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter(o => {
      const dataOcorrencia = parseDate(o.prevInicio);
      if (!dataOcorrencia) return false;
      const start = startOfDay(new Date(dataInicio + 'T00:00:00'));
      const end = endOfDay(new Date(dataFim + 'T23:59:59'));
      const dentroDasDatas = isWithinInterval(dataOcorrencia, { start, end });
      const motorista = motoristas.find(m => m.matricula === o.matriculaMotorista);
      const areaMatch = areaSelecionada === 'Todas as áreas (Geral)' || (motorista && motorista.area === areaSelecionada);
      const comDesvio = o.statusInicio !== 'No Horário';
      return dentroDasDatas && areaMatch && comDesvio;
    });
  }, [dataInicio, dataFim, areaSelecionada, motoristas, ocorrencias]);

  const metricas = useMemo(() => ({
    ocorrencias: ocorrenciasFiltradas.length,
    motoristas: new Set(ocorrenciasFiltradas.map(o => o.matriculaMotorista)).size,
    veiculos: new Set(ocorrenciasFiltradas.map(o => o.veiculo)).size,
  }), [ocorrenciasFiltradas]);

  const handleExport = () => {
    if (!ocorrenciasFiltradas.length) return;
    const headers = ['Numero Linha', 'Atendimento', 'Linha', 'Sentido', 'Veiculo', 'Matricula Motorista', 'Prev. Inicio', 'Real Inicio', 'Status Inicio', 'Prev. Fim', 'Real Fim', 'Status Fim'];
    const rows = ocorrenciasFiltradas.map(o => [o.numeroLinha, o.atendimento, o.nomeLinha, o.sentido, o.veiculo, o.matriculaMotorista, o.prevInicio, o.realInicio, o.statusInicio, o.prevFim, o.realFim, o.statusFim]);
    downloadCSV([headers, ...rows].map(r => r.join(';')).join('\n'), `pontualidade_${dataInicio}_${dataFim}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Filter className="text-gray-500" size={18} /><h3 className="font-bold text-slate-800">Filtros</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <div className="relative"><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <div className="relative"><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
            <select value={areaSelecionada} onChange={e => setAreaSelecionada(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50">
              {areasDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>
      {metricas.ocorrencias > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Ocorrências" value={metricas.ocorrencias} icon={FileBarChart} color="orange" />
          <StatCard title="Motoristas" value={metricas.motoristas} icon={Users} color="orange" />
          <StatCard title="Veículos" value={metricas.veiculos} icon={Bus} color="orange" />
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-center text-orange-700">
          <p className="font-semibold">Nenhuma ocorrência encontrada para os filtros selecionados.</p>
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={handleExport} disabled={!metricas.ocorrencias} className="flex items-center gap-2 bg-brand-500 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          <FileDown size={20} /> Exportar CSV
        </button>
      </div>
    </div>
  );
}

// ── Velocidade ────────────────────────────────────────────────────────────────
function VelocidadeTab({ excessos }: { excessos: ExcessoVelocidade[] }) {
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-12-31');

  const filtered = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    return excessos.filter(e => {
      const d = parseDate(e.dataOcorrencia);
      return d && d >= start && d <= end;
    });
  }, [excessos, dataInicio, dataFim]);

  const metricas = useMemo(() => ({
    total: filtered.length,
    motoristas: new Set(filtered.map(e => e.matricula)).size,
    veiculos: new Set(filtered.map(e => e.veiculo)).size,
    mediaVelocidade: filtered.length ? Math.round(filtered.reduce((s, e) => s + e.velocidadeMediaKmh, 0) / filtered.length) : 0,
  }), [filtered]);

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ['Data', 'Matrícula', 'Veículo', 'Linha', 'Velocidade Média (km/h)', 'Tempo Excedido (min)', 'Endereço'];
    const rows = filtered.map(e => [e.dataOcorrencia, e.matricula, e.veiculo, e.nomeLinha, e.velocidadeMediaKmh, e.tempoExcedidoMinutos, e.endereco]);
    downloadCSV([headers, ...rows].map(r => r.join(';')).join('\n'), `velocidade_${dataInicio}_${dataFim}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Filter className="text-gray-500" size={18} /><h3 className="font-bold text-slate-800">Filtros</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label><div className="relative"><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label><div className="relative"><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Ocorrências', value: metricas.total },
          { label: 'Motoristas', value: metricas.motoristas },
          { label: 'Veículos', value: metricas.veiculos },
          { label: 'Velocidade Média', value: `${metricas.mediaVelocidade} km/h` },
        ].map((k, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={handleExport} disabled={!filtered.length} className="flex items-center gap-2 bg-brand-500 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          <FileDown size={20} /> Exportar CSV
        </button>
      </div>
    </div>
  );
}

// ── ANTT ──────────────────────────────────────────────────────────────────────
function AnttTab({ multas }: { multas: MultaANTT[] }) {
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-12-31');
  const [empresa, setEmpresa] = useState('Todas');

  const filtered = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    return multas.filter(m => {
      const d = parseDate(m.dataHora);
      const matchDate = d && d >= start && d <= end;
      const matchEmpresa = empresa === 'Todas' || m.empresa === empresa;
      return matchDate && matchEmpresa;
    });
  }, [multas, dataInicio, dataFim, empresa]);

  const metricas = useMemo(() => ({
    total: filtered.length,
    valor: filtered.reduce((s, m) => s + m.valor, 0),
    motoristas: new Set(filtered.map(m => m.matriculaMotorista).filter(Boolean)).size,
  }), [filtered]);

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ['Data/Hora', 'Placa', 'Empresa', 'Setor', 'Terminal', 'Código', 'Descrição', 'Auto', 'Matrícula', 'Valor', 'Status'];
    const rows = filtered.map(m => [m.dataHora, m.placaVeiculo, m.empresa, m.setor, m.terminal, m.codigoInfracao, m.descricaoInfracao, m.autoInfracao, m.matriculaMotorista, m.valor, m.status]);
    downloadCSV([headers, ...rows].map(r => r.join(';')).join('\n'), `multas_antt_${dataInicio}_${dataFim}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Filter className="text-gray-500" size={18} /><h3 className="font-bold text-slate-800">Filtros</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label><div className="relative"><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label><div className="relative"><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label><select value={empresa} onChange={e => setEmpresa(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50"><option value="Todas">Todas</option><option value="PROGRESSO">PROGRESSO</option><option value="CRUZEIRO">CRUZEIRO</option></select></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Multas', value: metricas.total },
          { label: 'Valor Total', value: metricas.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
          { label: 'Motoristas', value: metricas.motoristas },
        ].map((k, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={handleExport} disabled={!filtered.length} className="flex items-center gap-2 bg-brand-500 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          <FileDown size={20} /> Exportar CSV
        </button>
      </div>
    </div>
  );
}

// ── Avarias ───────────────────────────────────────────────────────────────────
function AvariasTab({ avarias }: { avarias: Avaria[] }) {
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-12-31');

  const filtered = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    return avarias.filter(a => {
      const d = parseDate(a.data);
      return d && d >= start && d <= end;
    });
  }, [avarias, dataInicio, dataFim]);

  const metricas = useMemo(() => ({
    total: filtered.length,
    valor: filtered.reduce((s, a) => s + a.valorAvaria, 0),
    cobrado: filtered.reduce((s, a) => s + a.valorCobrado, 0),
    motoristas: new Set(filtered.map(a => a.matriculaMotorista)).size,
  }), [filtered]);

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ['Data', 'Veículo', 'Motorista', 'Matrícula', 'Tipo', 'Valor Avaria', 'Valor Cobrado', 'Culpado', 'Globus', 'Mês Lançamento', 'Gerente'];
    const rows = filtered.map(a => [a.data, a.veiculo, a.matriculaMotorista, a.matriculaMotorista, a.tipoAvaria, a.valorAvaria, a.valorCobrado, a.motoristaCulpado, a.lancadoNoGlobus, a.mesLancamento, a.gerente]);
    downloadCSV([headers, ...rows].map(r => r.join(';')).join('\n'), `avarias_${dataInicio}_${dataFim}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Filter className="text-gray-500" size={18} /><h3 className="font-bold text-slate-800">Filtros</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label><div className="relative"><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label><div className="relative"><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Avarias', value: metricas.total },
          { label: 'Valor Total', value: metricas.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
          { label: 'Valor Cobrado', value: metricas.cobrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
          { label: 'Motoristas', value: metricas.motoristas },
        ].map((k, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={handleExport} disabled={!filtered.length} className="flex items-center gap-2 bg-brand-500 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          <FileDown size={20} /> Exportar CSV
        </button>
      </div>
    </div>
  );
}

// ── Paradas Indevidas ─────────────────────────────────────────────────────────
function ParadasTab({ paradas }: { paradas: ParadaIndevida[] }) {
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-12-31');

  const filtered = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    return paradas.filter(p => {
      const d = parseDate(p.data);
      return d && d >= start && d <= end;
    });
  }, [paradas, dataInicio, dataFim]);

  const metricas = useMemo(() => ({
    total: filtered.length,
    motoristas: new Set(filtered.map(p => p.matricula)).size,
    veiculos: new Set(filtered.map(p => p.veiculo)).size,
  }), [filtered]);

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ['Data', 'Linha', 'Sentido', 'Matrícula', 'Motorista', 'Área', 'Veículo', 'Local', 'Início', 'Fim', 'Tempo Parado'];
    const rows = filtered.map(p => [p.data, p.linha, p.sentido, p.matricula, p.motorista, p.area, p.veiculo, p.local, p.inicio, p.fim, p.tempoParado]);
    downloadCSV([headers, ...rows].map(r => r.join(';')).join('\n'), `paradas_indevidas_${dataInicio}_${dataFim}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Filter className="text-gray-500" size={18} /><h3 className="font-bold text-slate-800">Filtros</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label><div className="relative"><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label><div className="relative"><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Paradas', value: metricas.total },
          { label: 'Motoristas', value: metricas.motoristas },
          { label: 'Veículos', value: metricas.veiculos },
        ].map((k, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={handleExport} disabled={!filtered.length} className="flex items-center gap-2 bg-brand-500 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          <FileDown size={20} /> Exportar CSV
        </button>
      </div>
    </div>
  );
}

// ── Multas de Trânsito ────────────────────────────────────────────────────────
function TransitoTab({ motoristas, multas }: { motoristas: Motorista[]; multas: MultaTransito[] }) {
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-12-31');
  const [filial, setFilial] = useState('Todas');

  const filtered = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    return multas.filter(m => {
      try {
        const [d, mo, y] = m.dataInfracao.split('/').map(Number);
        const dt = new Date(y, mo - 1, d);
        const matchDate = dt >= start && dt <= end;
        const matchFilial = filial === 'Todas' || m.filial === filial;
        return matchDate && matchFilial;
      } catch { return false; }
    });
  }, [multas, dataInicio, dataFim, filial]);

  const filiaisDisponiveis = useMemo(() => [...new Set(multas.map(m => m.filial).filter(Boolean))].sort(), [multas]);

  const metricas = useMemo(() => ({
    total: filtered.length,
    valorCobrado: filtered.reduce((s, m) => s + m.valorCobrado, 0),
    valorRecuperado: filtered.reduce((s, m) => s + m.valorRecuperado, 0),
    motoristas: new Set(filtered.filter(m => m.motoristaIdentificado).map(m => m.matriculaMotorista)).size,
    veiculos: new Set(filtered.map(m => m.veiculo)).size,
  }), [filtered]);

  const handleExport = () => {
    if (!filtered.length) return;
    const motMap = new Map(motoristas.map(m => [m.matricula, m]));
    const headers = ['Data Infração', 'Veículo', 'Órgão Atuador', 'Descrição', 'Nº Auto', 'Valor Cobrado', 'Valor Recuperado', 'Motorista Identificado', 'Matrícula', 'Nome Motorista', 'Nome na Base', 'Gestor', 'Filial', 'Enviado Gerente', 'Gerente Devolveu', 'Lançado Globus', 'Observação', 'Status'];
    const rows = filtered.map(m => {
      const mot = motMap.get(m.matriculaMotorista);
      return [m.dataInfracao, m.veiculo, m.orgaoAtuador, m.descricaoMulta, m.numeroAuto, m.valorCobrado.toFixed(2).replace('.', ','), m.valorRecuperado.toFixed(2).replace('.', ','), m.motoristaIdentificado ? 'SIM' : 'NÃO', m.matriculaMotorista, m.nomeMotorista, mot?.nome || '', m.gestor, m.filial, m.enviadoGerente, m.gerenteDevolveu, m.lancadoGlobus, m.observacao, m.status];
    });
    downloadCSV([headers, ...rows].map(r => r.join(';')).join('\n'), `multas_transito_${dataInicio}_${dataFim}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Filter className="text-gray-500" size={18} /><h3 className="font-bold text-slate-800">Filtros</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label><div className="relative"><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label><div className="relative"><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Filial</label>
            <select value={filial} onChange={e => setFilial(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50">
              <option value="Todas">Todas</option>
              {filiaisDisponiveis.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Multas', value: metricas.total },
          { label: 'Valor Cobrado', value: metricas.valorCobrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
          { label: 'Valor Recuperado', value: metricas.valorRecuperado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
          { label: 'Motoristas', value: metricas.motoristas },
          { label: 'Veículos', value: metricas.veiculos },
        ].map((k, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={handleExport} disabled={!filtered.length} className="flex items-center gap-2 bg-brand-500 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          <FileDown size={20} /> Exportar CSV
        </button>
      </div>
    </div>
  );
}

// ── Quilometragem Operacional ─────────────────────────────────────────────────
const fmtKmR = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;

function QuilometragemTab({ registros, linhas }: { registros: RegistroOciosidade[]; linhas: RegistroLinha[] }) {
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-12-31');

  const filtered = useMemo(() => {
    const start = new Date(dataInicio + 'T00:00:00');
    const end = new Date(dataFim + 'T23:59:59');
    return registros.filter(r => {
      try {
        const [d, m, y] = r.data.split('/').map(Number);
        const dt = new Date(y, m - 1, d);
        return dt >= start && dt <= end;
      } catch { return false; }
    });
  }, [registros, dataInicio, dataFim]);

  const kpis = useMemo(() => {
    const totalOp = filtered.reduce((s, r) => s + r.operacionalKm, 0);
    const totalOcio = filtered.reduce((s, r) => s + r.ociosaKm, 0);
    const totalKm = filtered.reduce((s, r) => s + r.totalKm, 0);
    const pctOp = totalKm > 0 ? (totalOp / totalKm) * 100 : 0;
    const pctOcio = totalKm > 0 ? (totalOcio / totalKm) * 100 : 0;
    return { veiculos: new Set(filtered.map(r => r.prefixo)).size, totalOp, totalOcio, totalKm, pctOp, pctOcio, linhas: linhas.length };
  }, [filtered, linhas]);

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ['Prefixo', 'Data', 'KM Operacional', 'KM Ociosa', 'KM Total'];
    const rows = filtered.map(r => [r.prefixo, r.data, r.operacionalKm.toFixed(1), r.ociosaKm.toFixed(1), r.totalKm.toFixed(1)]);
    downloadCSV([headers, ...rows].map(r => r.join(';')).join('\n'), `quilometragem_${dataInicio}_${dataFim}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Filter className="text-gray-500" size={18} /><h3 className="font-bold text-slate-800">Filtros</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label><div className="relative"><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label><div className="relative"><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-slate-50" /><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} /></div></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Veículos', value: kpis.veiculos, cls: 'text-slate-800' },
          { label: 'KM Operacional', value: fmtKmR(kpis.totalOp), cls: 'text-slate-800' },
          { label: 'KM Ociosa', value: fmtKmR(kpis.totalOcio), cls: 'text-slate-800' },
          { label: 'KM Total', value: fmtKmR(kpis.totalKm), cls: 'text-slate-800' },
          { label: 'Linhas', value: kpis.linhas, cls: 'text-slate-800' },
          { label: '% Operante', value: `${kpis.pctOp.toFixed(1)}%`, cls: 'text-emerald-700' },
          { label: '% Ociosa', value: `${kpis.pctOcio.toFixed(1)}%`, cls: 'text-amber-600' },
        ].map((k, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] text-gray-500 uppercase font-bold">{k.label}</p>
            <p className={`text-lg font-black ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={handleExport} disabled={!filtered.length} className="flex items-center gap-2 bg-brand-500 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          <FileDown size={20} /> Exportar CSV
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReportsScreen({ motoristas, ocorrencias, excessos = [], multasAntt = [], avarias = [], paradas = [], multasTransito = [], registrosOciosidade = [], registrosLinhas = [] }: ReportsScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pontualidade');

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 flex gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pontualidade' && <PontualidadeTab motoristas={motoristas} ocorrencias={ocorrencias} />}
      {activeTab === 'velocidade' && <VelocidadeTab excessos={excessos} />}
      {activeTab === 'antt' && <AnttTab multas={multasAntt} />}
      {activeTab === 'avarias' && <AvariasTab avarias={avarias} />}
      {activeTab === 'paradas' && <ParadasTab paradas={paradas} />}
      {activeTab === 'transito' && <TransitoTab motoristas={motoristas} multas={multasTransito} />}
      {activeTab === 'quilometragem' && <QuilometragemTab registros={registrosOciosidade} linhas={registrosLinhas} />}
    </div>
  );
}
