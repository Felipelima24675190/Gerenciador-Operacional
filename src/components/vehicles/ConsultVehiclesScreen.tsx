import { useMemo, useState } from 'react';
import { Veiculo, MultaANTT, Avaria, MultaTransito, RegistroOciosidade, Motorista } from '../../types';
import { Search, X, Truck, Info, AlertCircle } from 'lucide-react';

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
            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Placa</p><p className="font-black text-slate-800">{vehicle.placa}</p></div>
            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Empresa</p><p className="font-black text-slate-800">{vehicle.empresa}</p></div>
            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Marca</p><p className="font-black text-slate-800">{vehicle.marca}</p></div>
            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Modelo</p><p className="font-black text-slate-800">{vehicle.modelo}</p></div>
            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Tipo</p><span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">{vehicle.tipo}</span></div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h4 className="font-black text-xs text-slate-500 border-b pb-2 mb-4 uppercase tracking-tighter">Histórico de Multas ANTT ({multasDoVeiculo.length})</h4>
              {multasDoVeiculo.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {multasDoVeiculo.map(multa => (
                    <div key={multa.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-black text-slate-700 text-[10px]">Cód: {multa.codigoInfracao}</p>
                        <p className="font-mono text-slate-400 text-[9px]">{multa.dataHora}</p>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight italic">{multa.descricaoInfracao}</p>
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
                          <p className="font-black text-orange-700 text-[10px]">{av.tipoAvaria || av.descricaoAvaria}</p>
                          <p className="font-mono text-slate-400 text-[9px]">{av.data}</p>
                       </div>
                       {av.descricaoAvaria && av.tipoAvaria && (
                         <p className="text-[9px] text-slate-500 italic mb-1">{av.descricaoAvaria}</p>
                       )}
                       <p className="text-[9px] text-slate-500 uppercase font-bold">Mot: {motoristasMap.get(av.matriculaMotorista) || av.matriculaMotorista}</p>
                       <div className="flex justify-between items-center mt-2 border-t border-orange-100/30 pt-1">
                          <span className="text-[9px] font-black text-red-600">R$ {av.valorAvaria.toFixed(2)}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${av.lancadoNoGlobus === 'SIM' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
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
                    <div key={m.id} className="grid grid-cols-6 gap-2 bg-red-50/40 p-2 rounded-lg border border-red-100/60 text-[10px]">
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
                  <table className="w-full text-[10px] text-left">
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

export default function ConsultVehiclesScreen({ veiculos, multasAntt, avarias, multasTransito = [], registrosOciosidade = [], motoristas = [] }: ConsultVehiclesScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('Todas');
  const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);

  const empresas = useMemo(() => ['Todas', ...Array.from(new Set(veiculos.map(v => v.empresa)))], [veiculos]);

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
      const matchSearch = searchTerm === '' ||
        v.prefixo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.chassi.toLowerCase().includes(searchTerm.toLowerCase());
      return matchEmpresa && matchSearch;
    });
  }, [veiculos, searchTerm, empresaFilter]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-500">Total de Veículos</p>
          <p className="text-3xl font-bold">{dashboardData.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-500">Veículos Ativos</p>
          <p className="text-3xl font-bold text-green-600">{dashboardData.totalAtivos}</p>
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por Prefixo, Placa, Modelo ou Chassi..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <select
              value={empresaFilter}
              onChange={e => setEmpresaFilter(e.target.value)}
              className="w-full border rounded-lg text-sm py-2 px-3"
            >
              {empresas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-bold w-20">Prefixo</th>
              <th className="px-4 py-3 font-bold w-28">Placa</th>
              <th className="px-4 py-3 font-bold">Veículo</th>
              <th className="px-4 py-3 font-bold w-28">Empresa</th>
              <th className="px-4 py-3 font-bold w-32 text-center">Especificações</th>
              <th className="px-4 py-3 font-bold w-20 text-center">Ano</th>
              <th className="px-4 py-3 font-bold w-24 text-center">Status</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map(vehicle => (
              <tr key={vehicle.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors group">
                <td className="px-4 py-3">
                  <span className="text-xl font-black text-slate-800">{vehicle.prefixo}</span>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-slate-700 text-sm">{vehicle.placa}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[10px] uppercase tracking-tight">{vehicle.tipo}</span>
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{vehicle.marca} {vehicle.modelo}</span>
                    <span className="text-[10px] text-slate-400 font-mono">CH: {vehicle.chassi}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-bold text-slate-600 text-sm">{vehicle.empresa}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col gap-0.5 items-center text-[10px] text-slate-500 font-bold">
                    <span className="bg-slate-100 rounded px-1.5 py-0.5">{vehicle.eixos} eixos</span>
                    <span className="bg-slate-100 rounded px-1.5 py-0.5">{vehicle.poltronas} lugares</span>
                    <span className="bg-slate-100 rounded px-1.5 py-0.5">{vehicle.potencia} cv</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-bold text-slate-600 text-sm">{vehicle.anoModelo}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2.5 py-1 text-[10px] font-black rounded-full ${vehicle.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{vehicle.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setSelectedVehicle(vehicle)} className="font-black text-[10px] text-slate-600 hover:text-white bg-slate-100 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-tighter transition-colors">Histórico</button>
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
