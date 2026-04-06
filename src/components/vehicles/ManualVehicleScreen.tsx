import { useState, FormEvent, Dispatch, SetStateAction } from 'react';
import { Bus, Save, X, CheckCircle2 } from 'lucide-react';
import { Veiculo } from '../../types';

interface ManualVehicleScreenProps {
  setVeiculos: Dispatch<SetStateAction<Veiculo[]>>;
}

const INITIAL_FORM = {
  prefixo: '',
  placa: '',
  empresa: '',
  status: 'ATIVO',
  uf: '',
  anoFabricacao: '',
  anoModelo: '',
  marca: '',
  modelo: '',
  tipo: '',
  eixos: '',
  poltronas: '',
  potencia: '',
  chassi: '',
  renavam: '',
};

export default function ManualVehicleScreen({ setVeiculos }: ManualVehicleScreenProps) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.prefixo || !formData.placa || !formData.empresa || !formData.marca || !formData.modelo) return;

    const novoVeiculo: Veiculo = {
      id: crypto.randomUUID(),
      prefixo: formData.prefixo.toUpperCase(),
      placa: formData.placa.toUpperCase(),
      empresa: formData.empresa.toUpperCase(),
      status: formData.status,
      uf: formData.uf.toUpperCase(),
      anoFabricacao: Number(formData.anoFabricacao) || new Date().getFullYear(),
      anoModelo: Number(formData.anoModelo) || new Date().getFullYear(),
      marca: formData.marca.toUpperCase(),
      modelo: formData.modelo.toUpperCase(),
      tipo: formData.tipo.toUpperCase() || 'RODOVIÁRIO',
      eixos: Number(formData.eixos) || 2,
      poltronas: Number(formData.poltronas) || 0,
      potencia: Number(formData.potencia) || 0,
      chassi: formData.chassi.toUpperCase(),
      renavam: formData.renavam,
    };

    setVeiculos(prev => [...prev, novoVeiculo]);
    setFormData(INITIAL_FORM);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 8000);
  };

  const set = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <div className="bg-blue-900 p-6 text-white">
          <div className="flex items-center gap-3">
            <Bus size={24} className="text-amber-400" />
            <div>
              <h3 className="text-xl font-bold">Cadastrar Veículo Manualmente</h3>
              <p className="text-blue-200 text-sm">Preencha as informações para adicionar um veículo à base.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Identification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="veh-prefixo" className="text-xs font-black text-slate-400 uppercase tracking-wider">Prefixo</label>
              <input id="veh-prefixo" required type="text" value={formData.prefixo} onChange={e => set('prefixo', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: 12345" aria-label="Prefixo do veículo" />
            </div>
            <div className="space-y-2">
              <label htmlFor="veh-placa" className="text-xs font-black text-slate-400 uppercase tracking-wider">Placa</label>
              <input id="veh-placa" required type="text" value={formData.placa} onChange={e => set('placa', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: ABC1D23" aria-label="Placa do veículo" />
            </div>
            <div className="space-y-2">
              <label htmlFor="veh-empresa" className="text-xs font-black text-slate-400 uppercase tracking-wider">Empresa</label>
              <input id="veh-empresa" required type="text" value={formData.empresa} onChange={e => set('empresa', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: VIACAO PROGRESSO" aria-label="Empresa do veículo" />
            </div>
          </div>

          {/* Status & UF */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="veh-status" className="text-xs font-black text-slate-400 uppercase tracking-wider">Status</label>
              <select id="veh-status" value={formData.status} onChange={e => set('status', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                aria-label="Status do veículo">
                <option value="ATIVO">ATIVO</option>
                <option value="MANUTENÇÃO">MANUTENÇÃO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="veh-uf" className="text-xs font-black text-slate-400 uppercase tracking-wider">UF</label>
              <input id="veh-uf" required type="text" maxLength={2} value={formData.uf} onChange={e => set('uf', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: PE" aria-label="UF do veículo" />
            </div>
            <div className="space-y-2">
              <label htmlFor="veh-tipo" className="text-xs font-black text-slate-400 uppercase tracking-wider">Tipo</label>
              <input id="veh-tipo" required type="text" value={formData.tipo} onChange={e => set('tipo', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: RODOVIÁRIO" aria-label="Tipo do veículo" />
            </div>
          </div>

          {/* Make & Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="veh-marca" className="text-xs font-black text-slate-400 uppercase tracking-wider">Marca</label>
              <input id="veh-marca" required type="text" value={formData.marca} onChange={e => set('marca', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: MERCEDES-BENZ" aria-label="Marca do veículo" />
            </div>
            <div className="space-y-2">
              <label htmlFor="veh-modelo" className="text-xs font-black text-slate-400 uppercase tracking-wider">Modelo</label>
              <input id="veh-modelo" required type="text" value={formData.modelo} onChange={e => set('modelo', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: O 500 RSD" aria-label="Modelo do veículo" />
            </div>
          </div>

          {/* Year & Specs */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label htmlFor="veh-anoFab" className="text-xs font-black text-slate-400 uppercase tracking-wider">Ano Fab.</label>
              <input id="veh-anoFab" required type="number" min="1990" max="2030" value={formData.anoFabricacao} onChange={e => set('anoFabricacao', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="2024" aria-label="Ano de fabricação" />
            </div>
            <div className="space-y-2">
              <label htmlFor="veh-anoMod" className="text-xs font-black text-slate-400 uppercase tracking-wider">Ano Mod.</label>
              <input id="veh-anoMod" required type="number" min="1990" max="2030" value={formData.anoModelo} onChange={e => set('anoModelo', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="2025" aria-label="Ano modelo" />
            </div>
            <div className="space-y-2">
              <label htmlFor="veh-eixos" className="text-xs font-black text-slate-400 uppercase tracking-wider">Eixos</label>
              <input id="veh-eixos" required type="number" min="1" max="10" value={formData.eixos} onChange={e => set('eixos', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="3" aria-label="Número de eixos" />
            </div>
            <div className="space-y-2">
              <label htmlFor="veh-poltronas" className="text-xs font-black text-slate-400 uppercase tracking-wider">Poltronas</label>
              <input id="veh-poltronas" required type="number" min="0" max="100" value={formData.poltronas} onChange={e => set('poltronas', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="46" aria-label="Quantidade de poltronas" />
            </div>
            <div className="space-y-2">
              <label htmlFor="veh-potencia" className="text-xs font-black text-slate-400 uppercase tracking-wider">Potência (cv)</label>
              <input id="veh-potencia" required type="number" min="0" value={formData.potencia} onChange={e => set('potencia', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="360" aria-label="Potência do motor em cavalos" />
            </div>
          </div>

          {/* Chassis & RENAVAM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="veh-chassi" className="text-xs font-black text-slate-400 uppercase tracking-wider">Chassi</label>
              <input id="veh-chassi" required type="text" value={formData.chassi} onChange={e => set('chassi', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: 9BM384078FB123456" aria-label="Número do chassi" />
            </div>
            <div className="space-y-2">
              <label htmlFor="veh-renavam" className="text-xs font-black text-slate-400 uppercase tracking-wider">RENAVAM</label>
              <input id="veh-renavam" required type="text" value={formData.renavam} onChange={e => set('renavam', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: 01234567890" aria-label="Número do RENAVAM" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            {showSuccess ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in fade-in slide-in-from-left-2">
                <CheckCircle2 size={20} /> Veículo cadastrado com sucesso!
              </div>
            ) : <div />}

            <div className="flex gap-3">
              <button type="button" onClick={() => setFormData(INITIAL_FORM)}
                className="px-6 py-2.5 rounded-button border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs"
                aria-label="Limpar formulário">
                <X size={18} /> Limpar
              </button>
              <button type="submit"
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-button text-xs font-bold flex items-center gap-2 transition-colors"
                aria-label="Salvar veículo">
                <Save size={18} /> Salvar Veículo
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
