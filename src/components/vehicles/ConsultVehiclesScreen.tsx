import { useMemo, useState, useCallback } from 'react';
import { Veiculo, MultaANTT, Avaria, MultaTransito, RegistroOciosidade, Motorista } from '../../types';
import { Search, X, Truck, Info, AlertCircle, Download } from 'lucide-react';

function parseDateBR(s?: string): Date | null {
  if (!s) return null;
  const [d, m, y] = s.split('/').map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function getValidityColor(dateStr?: string): 'green' | 'red' | 'yellow' | 'gray' {
  if (!dateStr) return 'gray';
  const d = parseDateBR(dateStr);
  if (!d) return 'gray';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = d.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return 'red';
  if (days <= 30) return 'yellow';
  return 'green';
}

const VALIDITY_STYLES: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  red: 'bg-red-100 text-red-700 border-red-300',
  yellow: 'bg-amber-100 text-amber-700 border-amber-300',
  gray: 'bg-slate-100 text-slate-400 border-slate-200',
};

interface ConsultVehiclesScreenProps {
  veiculos: Veiculo[];
  multasAntt: MultaANTT[];
  avarias: Avaria[];
  multasTransito?: MultaTransito[];
  registrosOciosidade?: RegistroOciosidade[];
  motoristas?: Motorista[];
}

const VehicleDetailModal = ({
  vehicle,
  multas,
  avarias,
  multasTransito,
  registrosOciosidade,
  motoristas,
  onClose,
}: {
  vehicle: Veiculo;
  multas: MultaANTT[];
  avarias: Avaria[];
  multasTransito: MultaTransito[];
  registrosOciosidade: RegistroOciosidade[];
  motoristas: Motorista[];
  onClose: () => void;
}) => {
  const multasDoVeiculo = multas.filter(m => m.placaVeiculo === vehicle.placa);
  const avariasDoVeiculo = avarias.filter(a => a.veiculo === vehicle.prefixo);
  const multasTransitoDoVeiculo = multasTransito.filter(m => m.veiculo === vehicle.prefixo);

  const motoristasMap = new Map(motoristas.map(m => [m.matricula, m.nome]));

  const registrosVeiculo = (registrosOciosidade || [])
    .filter(r => r.prefixo === vehicle.prefixo)
    .sort((a, b) => {
      const [da, ma, ya] = a.data.split('/').map(Number);
      const [db, mb, yb] = b.data.split('/').map(Number);
      return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
    });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white rounded-t-lg">
          <h3 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Truck size={18} /> Veículo: {vehicle.prefixo}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 text-white/50 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 max-h-[85vh] overflow-y-auto bg-slate-50">
          <div className="md:col-span-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div><p className="text-2xs font-bold text-slate-400 uppercase">Placa</p><p className="font-black text-slate-800">{vehicle.placa}</p></div>
            <div><p className="text-2xs font-bold text-slate-400 uppercase">Empresa</p><p className="font-black text-slate-800">{vehicle.empresa}</p></div>
            <div><p className="text-2xs font-bold text-slate-400 uppercase">Marca</p><p className="font-black text-slate-800">{vehicle.marca}</p></div>
            <div><p className="text-2xs font-bold text-slate-400 uppercase">Modelo</p><p className="font-black text-slate-800">{vehicle.modelo}</p></div>
            <div><p className="text-2xs font-bold text-slate-400 uppercase">Tipo</p><span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">{vehicle.tipo}</span></div>
            <div><p className="text-2xs font-bold text-slate-400 uppercase">Chassi</p><p className="font-mono text-xs text-slate-700">{vehicle.chassi || '-'}</p></div>
            <div><p className="text-2xs font-bold text-slate-400 uppercase">RENAVAM</p><p className="font-mono text-xs text-slate-700">{vehicle.renavam || '-'}</p></div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h4 className="font-black text-xs text-slate-500 border-b pb-2 mb-4 uppercase tracking-tighter">Histórico de Multas ANTT ({multasDoVeiculo.length})</h4>
              {multasDoVeiculo.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {multasDoVeiculo.map(multa => (
                    <div key={multa.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-black text-slate-700 text-2xs">Cód: {multa.codigoInfracao}</p>
                        <p className="font-mono text-slate-400 text-2xs">{multa.dataHora}</p>
                      </div>
                      <p className="text-2xs text-slate-500 leading-tight italic">{multa.descricaoInfracao}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Info className="mx-auto text-slate-200 mb-2" size={24} />
                  <p className="text-xs text-slate-400 font-bold uppercase">Sem registros de multas</p>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h4 className="font-black text-xs text-slate-500 border-b pb-2 mb-4 uppercase tracking-tighter">Histórico de Avarias ({avariasDoVeiculo.length})</h4>
              {avariasDoVeiculo.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {avariasDoVeiculo.map(av => (
                    <div key={av.id} className="bg-orange-50/30 p-3 rounded-lg border border-orange-100/50">
                       <div className="flex justify-between items-center mb-1">
                          <p className="font-black text-orange-700 text-2xs">{av.tipoAvaria || av.descricaoAvaria}</p>
                          <p className="font-mono text-slate-400 text-2xs">{av.data}</p>
                       </div>
                       {av.descricaoAvaria && av.tipoAvaria && (
                         <p className="text-2xs text-slate-500 italic mb-1">{av.descricaoAvaria}</p>
                       )}
                       <p className="text-2xs text-slate-500 uppercase font-bold">Mot: {motoristasMap.get(av.matriculaMotorista) || av.matriculaMotorista}</p>
                       <div className="flex justify-between items-center mt-2 border-t border-orange-100/30 pt-1">
                          <span className="text-2xs font-black text-red-600">R$ {av.valorAvaria.toFixed(2)}</span>
                          <span className={`text-2xs font-black px-1.5 py-0.5 rounded ${av.lancadoNoGlobus === 'SIM' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                             {av.lancadoNoGlobus === 'SIM' ? 'GLOBUS OK' : 'PENDENTE'}
                          </span>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="mx-auto text-slate-200 mb-2" size={24} />
                  <p className="text-xs text-slate-400 font-bold uppercase">Sem registros de avarias</p>
                </div>
              )}
            </div>
          </div>

          {multasTransitoDoVeiculo.length > 0 && (
            <div className="md:col-span-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-red-100">
                <h4 className="font-black text-xs text-red-600 border-b border-red-100 pb-2 mb-4 uppercase tracking-tighter">Multas de Trânsito ({multasTransitoDoVeiculo.length})</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {multasTransitoDoVeiculo.map(m => (
                    <div key={m.id} className="grid grid-cols-6 gap-2 bg-red-50/40 p-2 rounded-lg border border-red-100/60 text-2xs">
                      <div>
                        <p className="text-slate-400 uppercase font-bold">Data</p>
                        <p className="font-mono text-slate-700">{m.dataInfracao}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase font-bold">Veículo</p>
                        <p className="font-black text-slate-700">{m.veiculo}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase font-bold">Órgão</p>
                        <p className="font-black text-red-700 truncate" title={m.orgaoAtuador}>{m.orgaoAtuador || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 uppercase font-bold">Descrição</p>
                        <p className="text-slate-600 italic leading-tight">{m.descricaoMulta}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase font-bold">Valor Cobrado</p>
                        <p className="font-black text-red-700">{m.valorCobrado ? `R$ ${Number(m.valorCobrado).toFixed(2)}` : '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {registrosVeiculo.length > 0 && (
            <div className="md:col-span-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h4 className="font-black text-xs text-slate-500 border-b pb-2 mb-4 uppercase tracking-tighter">Quilometragem por Data ({registrosVeiculo.length} registros)</h4>
                <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                  <table className="w-full text-2xs text-left">
                    <thead className="bg-slate-800 text-white sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-bold uppercase">Data</th>
                        <th className="px-3 py-2 font-bold uppercase text-right">KM Operacional</th>
                        <th className="px-3 py-2 font-bold uppercase text-right">KM Ociosa</th>
                        <th className="px-3 py-2 font-bold uppercase text-right">KM Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrosVeiculo.map((r, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-mono">{r.data}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-emerald-700">{r.operacionalKm.toFixed(1)}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-amber-700">{r.ociosaKm.toFixed(1)}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-slate-700">{r.totalKm.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type LitTcoStatus = 'Todos' | 'Ativo' | 'Inativo' | 'A vencer' | 'Indisponível';

function getLitTcoStatus(dateStr?: string): LitTcoStatus {
  if (!dateStr) return 'Indisponível';
  const d = parseDateBR(dateStr);
  if (!d) return 'Indisponível';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = d.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return 'Inativo';
  if (days <= 30) return 'A vencer';
  return 'Ativo';
}

const LIT_TCO_STATUSES: LitTcoStatus[] = ['Todos', 'Ativo', 'Inativo', 'A vencer', 'Indisponível'];

const STATUS_BADGE: Record<string, string> = {
  'Ativo': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'Inativo': 'bg-red-100 text-red-700 border-red-300',
  'A vencer': 'bg-amber-100 text-amber-700 border-amber-300',
  'Indisponível': 'bg-slate-100 text-slate-400 border-slate-200',
};

function LitTcoTable({ veiculos, litFilter, setLitFilter, tcoFilter, setTcoFilter }: {
  veiculos: Veiculo[];
  litFilter: LitTcoStatus;
  setLitFilter: (v: LitTcoStatus) => void;
  tcoFilter: LitTcoStatus;
  setTcoFilter: (v: LitTcoStatus) => void;
}) {
  const filtered = useMemo(() => {
    return veiculos.filter(v => {
      const litStatus = getLitTcoStatus(v.litValidade);
      const tcoStatus = getLitTcoStatus(v.tcoValidade);
      const matchLit = litFilter === 'Todos' || litStatus === litFilter;
      const matchTco = tcoFilter === 'Todos' || tcoStatus === tcoFilter;
      return matchLit && matchTco;
    });
  }, [veiculos, litFilter, tcoFilter]);

  const counts = useMemo(() => {
    const lit = { Ativo: 0, Inativo: 0, 'A vencer': 0, 'Indisponível': 0 };
    const tco = { Ativo: 0, Inativo: 0, 'A vencer': 0, 'Indisponível': 0 };
    veiculos.forEach(v => {
      const ls = getLitTcoStatus(v.litValidade);
      const ts = getLitTcoStatus(v.tcoValidade);
      lit[ls]++;
      tco[ts]++;
    });
    return { lit, tco };
  }, [veiculos]);

  return (
    <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-2xs font-black text-slate-600 uppercase tracking-tight mb-3">Controle LIT / TCO</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Status LIT</label>
            <div className="flex gap-1.5 flex-wrap">
              {LIT_TCO_STATUSES.map(s => (
                <button key={s} onClick={() => setLitFilter(s)}
                  className={`px-2.5 py-1 text-2xs font-bold rounded-lg border transition-colors ${litFilter === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                  {s}{s !== 'Todos' ? ` (${counts.lit[s]})` : ''}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-2xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Status TCO</label>
            <div className="flex gap-1.5 flex-wrap">
              {LIT_TCO_STATUSES.map(s => (
                <button key={s} onClick={() => setTcoFilter(s)}
                  className={`px-2.5 py-1 text-2xs font-bold rounded-lg border transition-colors ${tcoFilter === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                  {s}{s !== 'Todos' ? ` (${counts.tco[s]})` : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-800 text-white text-2xs uppercase tracking-wide sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5">Prefixo</th>
              <th className="px-3 py-2.5">Placa</th>
              <th className="px-3 py-2.5">Tipo</th>
              <th className="px-3 py-2.5">Empresa</th>
              <th className="px-3 py-2.5 text-center">LIT Validade</th>
              <th className="px-3 py-2.5 text-center">LIT Status</th>
              <th className="px-3 py-2.5 text-center">TCO Validade</th>
              <th className="px-3 py-2.5 text-center">TCO Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => {
              const litStatus = getLitTcoStatus(v.litValidade);
              const tcoStatus = getLitTcoStatus(v.tcoValidade);
              return (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 font-black text-slate-800">{v.prefixo}</td>
                  <td className="px-3 py-2 font-mono font-bold text-slate-600">{v.placa}</td>
                  <td className="px-3 py-2"><span className="font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-2xs">{v.tipo}</span></td>
                  <td className="px-3 py-2 font-bold text-slate-600">{v.empresa}</td>
                  <td className="px-3 py-2 text-center font-mono">{v.litValidade || '—'}</td>
                  <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 text-2xs font-black rounded-full border ${STATUS_BADGE[litStatus]}`}>{litStatus}</span></td>
                  <td className="px-3 py-2 text-center font-mono">{v.tcoValidade || '—'}</td>
                  <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 text-2xs font-black rounded-full border ${STATUS_BADGE[tcoStatus]}`}>{tcoStatus}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-xs">Nenhum veículo encontrado com os filtros selecionados.</div>
        )}
      </div>
      <div className="px-4 py-2 bg-slate-50 border-t border-gray-100 text-2xs text-slate-500 font-bold">
        {filtered.length} veículo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default function ConsultVehiclesScreen({ veiculos, multasAntt, avarias, multasTransito = [], registrosOciosidade = [], motoristas = [] }: ConsultVehiclesScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [tipoFilter, setTipoFilter] = useState('Todos');
  const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);
  const [litFilter, setLitFilter] = useState<LitTcoStatus>('Todos');
  const [tcoFilter, setTcoFilter] = useState<LitTcoStatus>('Todos');

  const empresas = useMemo(() => ['Todas', ...Array.from(new Set(veiculos.map(v => v.empresa)))], [veiculos]);
  const statuses = useMemo(() => ['Todos', ...Array.from(new Set(veiculos.map(v => v.status)))], [veiculos]);
  const tipos = useMemo(() => ['Todos', ...Array.from(new Set(veiculos.map(v => v.tipo)))], [veiculos]);

  const dashboardData = useMemo(() => {
    const totalAtivos = veiculos.filter(v => v.status === 'ATIVO').length;
    return {
      total: veiculos.length,
      totalAtivos,
    };
  }, [veiculos]);

  const filteredVehicles = useMemo(() => {
    return veiculos.filter(v => {
      const matchEmpresa = empresaFilter === 'Todas' || v.empresa === empresaFilter;
      const matchStatus = statusFilter === 'Todos' || v.status === statusFilter;
      const matchTipo = tipoFilter === 'Todos' || v.tipo === tipoFilter;
      const matchSearch = searchTerm === '' ||
        v.prefixo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.chassi.toLowerCase().includes(searchTerm.toLowerCase());
      return matchEmpresa && matchSearch && matchStatus && matchTipo;
    });
  }, [veiculos, searchTerm, empresaFilter, statusFilter, tipoFilter]);

  const exportCSV = useCallback(() => {
    const headers = ['Prefixo', 'Placa', 'Empresa', 'Status', 'UF', 'Ano Fabricacao', 'Ano Modelo', 'Marca', 'Modelo', 'Tipo', 'Eixos', 'Poltronas', 'Potencia (cv)', 'Chassi', 'RENAVAM', 'LIT Validade', 'TCO Validade'];
    const rows = filteredVehicles.map(v => [
      v.prefixo, v.placa, v.empresa, v.status, v.uf,
      v.anoFabricacao, v.anoModelo, v.marca, v.modelo, v.tipo,
      v.eixos, v.poltronas, v.potencia, v.chassi, v.renavam,
      v.litValidade || '', v.tcoValidade || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'base_veiculos.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredVehicles]);

  return (
    <div className="space-y-5">
      <div className="bg-slate-800 p-4 flex gap-3 overflow-x-auto rounded-xl">
        {[
          { l: 'Total de Veículos', v: dashboardData.total },
          { l: 'Veículos Ativos', v: dashboardData.totalAtivos },
        ].map((k, i) => (
          <div key={i} className="bg-slate-700 rounded-lg p-3 text-center min-w-[120px] flex-1">
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-wide">{k.l}</p>
            <p className="text-lg font-black text-white mt-0.5">{k.v}</p>
          </div>
        ))}
      </div>
      <div className="bg-white p-4 rounded-card border border-gray-200 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="search-veiculos"
              type="text"
              placeholder="Buscar por Prefixo, Placa, Modelo ou Chassi..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Buscar veículo por prefixo, placa, modelo ou chassi"
              className="w-full pl-10 pr-4 px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          </div>
          <div>
            <select value={empresaFilter} onChange={e => setEmpresaFilter(e.target.value)} aria-label="Filtrar por empresa" className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none">
              {empresas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filtrar por status" className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none">
              {statuses.map(s => <option key={s} value={s}>{s === 'Todos' ? 'Status: Todos' : s}</option>)}
            </select>
          </div>
          <div>
            <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} aria-label="Filtrar por tipo" className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none">
              {tipos.map(t => <option key={t} value={t}>{t === 'Todos' ? 'Tipo: Todos' : t}</option>)}
            </select>
          </div>
          <div>
            <button onClick={exportCSV} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-button transition-colors" title="Exportar CSV">
              <Download size={14} /> Exportar CSV
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white text-2xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5 font-bold w-20">Prefixo</th>
              <th className="px-3 py-2.5 font-bold w-28">Placa</th>
              <th className="px-3 py-2.5 font-bold">Veículo</th>
              <th className="px-3 py-2.5 font-bold w-28">Empresa</th>
              <th className="px-3 py-2.5 font-bold w-32 text-center">Especificações</th>
              <th className="px-3 py-2.5 font-bold w-20 text-center">Ano</th>
              <th className="px-3 py-2.5 font-bold w-24 text-center">Status</th>
              <th className="px-3 py-2.5 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map(vehicle => (
              <tr key={vehicle.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100 group">
                <td className="px-4 py-3">
                  <span className="text-xl font-black text-slate-800">{vehicle.prefixo}</span>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-slate-700 text-sm">{vehicle.placa}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-2xs uppercase tracking-tight">{vehicle.tipo}</span>
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{vehicle.marca} {vehicle.modelo}</span>
                    <span className="text-2xs text-slate-400 font-mono">CH: {vehicle.chassi}</span>
                    {vehicle.renavam && <span className="text-2xs text-slate-400 font-mono">REN: {vehicle.renavam}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 font-bold text-slate-600 text-sm">{vehicle.empresa}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col gap-0.5 items-center text-2xs text-slate-500 font-bold">
                    <span className="bg-slate-100 rounded px-1.5 py-0.5">{vehicle.eixos} eixos</span>
                    <span className="bg-slate-100 rounded px-1.5 py-0.5">{vehicle.poltronas} lugares</span>
                    <span className="bg-slate-100 rounded px-1.5 py-0.5">{vehicle.potencia} cv</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-bold text-slate-600 text-sm">{vehicle.anoModelo}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className={`px-2.5 py-1 text-2xs font-black rounded-full ${vehicle.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{vehicle.status}</span>
                    <div className="flex gap-1">
                      {(['LIT', 'TCO'] as const).map(tag => {
                        const dateStr = tag === 'LIT' ? vehicle.litValidade : vehicle.tcoValidade;
                        const color = getValidityColor(dateStr);
                        const d = parseDateBR(dateStr);
                        const tooltip = !dateStr ? 'Sem data' : d && d.getTime() < Date.now() ? `Vencido em: ${dateStr}` : `Vence em: ${dateStr}`;
                        return (
                          <span key={tag} title={tooltip} className={`px-1.5 py-0.5 text-[9px] font-black rounded border cursor-default ${VALIDITY_STYLES[color]}`}>
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setSelectedVehicle(vehicle)} className="font-black text-2xs text-slate-600 hover:text-white bg-slate-100 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-tighter transition-colors">Histórico</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredVehicles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>Nenhum veículo encontrado.</p>
          </div>
        )}
      </div>

      {/* LIT / TCO Table */}
      <LitTcoTable veiculos={veiculos} litFilter={litFilter} setLitFilter={setLitFilter} tcoFilter={tcoFilter} setTcoFilter={setTcoFilter} />

      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          multas={multasAntt}
          avarias={avarias}
          multasTransito={multasTransito}
          registrosOciosidade={registrosOciosidade}
          motoristas={motoristas}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}
