import { useState, FormEvent } from 'react';
import { UserPlus, Save, X, CheckCircle2 } from 'lucide-react';
import { Motorista, StatusMotorista } from '../../types';

interface ManualDriverScreenProps {
  onSave: (newDriver: Motorista) => void;
}

export default function ManualDriverScreen({ onSave }: ManualDriverScreenProps) {
  const [formData, setFormData] = useState<Omit<Motorista, 'id'>>({
    matricula: '',
    nome: '',
    filial: '',
    area: 'Operação',
    status: 'ATIVO - EM OPERAÇÃO'
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.matricula && formData.nome && formData.filial) {
      onSave(formData as Motorista);
      setFormData({
        matricula: '',
        nome: '',
        filial: '',
        area: 'Operação',
        status: 'ATIVO - EM OPERAÇÃO'
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-blue-900 p-6 text-white">
          <div className="flex items-center gap-3">
            <UserPlus size={24} className="text-red-500" />
            <div>
              <h3 className="text-xl font-bold">Cadastrar Motorista Manualmente</h3>
              <p className="text-blue-200 text-sm">Preencha as informações para adicionar à base.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Matrícula</label>
              <input 
                required
                type="text" 
                value={formData.matricula}
                onChange={e => setFormData({...formData, matricula: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: 26646"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Nome Completo</label>
              <input 
                required
                type="text" 
                value={formData.nome}
                onChange={e => setFormData({...formData, nome: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Filial</label>
              <input 
                required
                type="text" 
                value={formData.filial}
                onChange={e => setFormData({...formData, filial: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: CARUARU"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Área</label>
              <input 
                required
                type="text" 
                value={formData.area}
                onChange={e => setFormData({...formData, area: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: Manutenção"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Status Atual</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as StatusMotorista})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
              >
                <option value="ATIVO - EM OPERAÇÃO">ATIVO - EM OPERAÇÃO</option>
                <option value="DESLIGADO">DESLIGADO</option>
                <option value="INSS">INSS</option>
                <option value="INSTRUTOR">INSTRUTOR</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            {showSuccess ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in fade-in slide-in-from-left-2">
                <CheckCircle2 size={20} /> Motorista cadastrado!
              </div>
            ) : <div />}
            
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setFormData({ matricula: '', nome: '', filial: '', area: 'Operação', status: 'ATIVO - EM OPERAÇÃO' })}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <X size={18} /> Limpar
              </button>
              <button 
                type="submit"
                className="px-8 py-2.5 rounded-xl bg-brand-500 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center gap-2"
              >
                <Save size={18} /> Salvar Motorista
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
