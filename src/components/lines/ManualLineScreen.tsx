import { useState, FormEvent, Dispatch, SetStateAction } from 'react';
import { MapPin, Save, X, CheckCircle2 } from 'lucide-react';
import { Viagem } from '../../types';

const DIAS_SEMANA = [
  { id: 0, label: 'Dom' },
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
];

interface ManualLineScreenProps {
  setViagens: Dispatch<SetStateAction<Viagem[]>>;
}

const INITIAL_FORM = {
  nomeLinha: '',
  numeroLinha: '',
  atendimento: '',
  sentido: 'Ida',
  pontoInicio: '',
  pontoFim: '',
  horarioSaida: '',
  servico: '',
  empresa: '',
  regiao: '',
};

export default function ManualLineScreen({ setViagens }: ManualLineScreenProps) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [diasOperantes, setDiasOperantes] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [showSuccess, setShowSuccess] = useState(false);

  const toggleDia = (id: number) => {
    setDiasOperantes(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id].sort()
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.nomeLinha || !formData.numeroLinha || !formData.atendimento || !formData.pontoInicio || !formData.pontoFim || !formData.horarioSaida) return;

    const novaViagem: Viagem = {
      id: crypto.randomUUID(),
      nomeLinha: formData.nomeLinha.toUpperCase(),
      numeroLinha: formData.numeroLinha,
      atendimento: formData.atendimento.toUpperCase(),
      sentido: formData.sentido,
      pontoInicio: formData.pontoInicio.toUpperCase(),
      pontoFim: formData.pontoFim.toUpperCase(),
      prevInicio: `01/01/2026 ${formData.horarioSaida}`,
      prevFim: '',
      ordem: 0,
      diasOperantes,
      horarioSaida: formData.horarioSaida,
      servico: formData.servico || undefined,
      empresa: formData.empresa?.toUpperCase() || undefined,
      regiao: formData.regiao?.toUpperCase() || undefined,
      origem: formData.pontoInicio.toUpperCase(),
      destino: formData.pontoFim.toUpperCase(),
    };

    setViagens(prev => [...prev, novaViagem]);
    setFormData(INITIAL_FORM);
    setDiasOperantes([0, 1, 2, 3, 4, 5, 6]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 8000);
  };

  const set = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <div className="bg-blue-900 p-6 text-white">
          <div className="flex items-center gap-3">
            <MapPin size={24} className="text-emerald-400" />
            <div>
              <h3 className="text-xl font-bold">Cadastrar Linha Manualmente</h3>
              <p className="text-blue-200 text-sm">Preencha as informações para adicionar uma linha à base.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Identification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label htmlFor="line-nomeLinha" className="text-xs font-black text-slate-400 uppercase tracking-wider">Nome da Linha</label>
              <input id="line-nomeLinha" required type="text" value={formData.nomeLinha} onChange={e => set('nomeLinha', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: RECIFE(PE) X PETROLINA(PE)" aria-label="Nome da linha" />
            </div>
            <div className="space-y-2">
              <label htmlFor="line-numeroLinha" className="text-xs font-black text-slate-400 uppercase tracking-wider">Código da Linha</label>
              <input id="line-numeroLinha" required type="text" value={formData.numeroLinha} onChange={e => set('numeroLinha', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: 102" aria-label="Código da linha" />
            </div>
            <div className="space-y-2">
              <label htmlFor="line-atendimento" className="text-xs font-black text-slate-400 uppercase tracking-wider">Atendimento</label>
              <input id="line-atendimento" required type="text" value={formData.atendimento} onChange={e => set('atendimento', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: RECIFE X PETROLINA" aria-label="Atendimento" />
            </div>
          </div>

          {/* Route Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="line-pontoInicio" className="text-xs font-black text-slate-400 uppercase tracking-wider">Ponto de Início</label>
              <input id="line-pontoInicio" required type="text" value={formData.pontoInicio} onChange={e => set('pontoInicio', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: RECIFE(PE)" aria-label="Ponto de início" />
            </div>
            <div className="space-y-2">
              <label htmlFor="line-pontoFim" className="text-xs font-black text-slate-400 uppercase tracking-wider">Ponto Final</label>
              <input id="line-pontoFim" required type="text" value={formData.pontoFim} onChange={e => set('pontoFim', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: PETROLINA(PE)" aria-label="Ponto final" />
            </div>
            <div className="space-y-2">
              <label htmlFor="line-sentido" className="text-xs font-black text-slate-400 uppercase tracking-wider">Sentido</label>
              <select id="line-sentido" value={formData.sentido} onChange={e => set('sentido', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                aria-label="Sentido da viagem">
                <option value="Ida">IDA</option>
                <option value="Volta">VOLTA</option>
              </select>
            </div>
          </div>

          {/* Schedule & Service */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="line-horarioSaida" className="text-xs font-black text-slate-400 uppercase tracking-wider">Horário de Saída</label>
              <input id="line-horarioSaida" required type="time" value={formData.horarioSaida} onChange={e => set('horarioSaida', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                aria-label="Horário de saída" />
            </div>
            <div className="space-y-2">
              <label htmlFor="line-servico" className="text-xs font-black text-slate-400 uppercase tracking-wider">Serviço ANTT</label>
              <input id="line-servico" type="text" value={formData.servico} onChange={e => set('servico', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: 10202990 (opcional)" aria-label="Código do serviço ANTT" />
            </div>
            <div className="space-y-2">
              <label htmlFor="line-empresa" className="text-xs font-black text-slate-400 uppercase tracking-wider">Empresa</label>
              <input id="line-empresa" type="text" value={formData.empresa} onChange={e => set('empresa', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: VIACAO PROGRESSO (opcional)" aria-label="Empresa" />
            </div>
          </div>

          {/* Region */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="line-regiao" className="text-xs font-black text-slate-400 uppercase tracking-wider">Região</label>
              <input id="line-regiao" type="text" value={formData.regiao} onChange={e => set('regiao', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700"
                placeholder="Ex: NORDESTE (opcional)" aria-label="Região" />
            </div>
          </div>

          {/* Operating Days */}
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Dias Operantes</p>
            <div className="flex gap-2 flex-wrap">
              {DIAS_SEMANA.map(d => (
                <button key={d.id} type="button" onClick={() => toggleDia(d.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${diasOperantes.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-slate-50 text-slate-500 border-gray-200 hover:bg-slate-100'}`}
                  aria-label={`Dia operante: ${d.label}`} aria-pressed={diasOperantes.includes(d.id)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            {showSuccess ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in fade-in slide-in-from-left-2">
                <CheckCircle2 size={20} /> Linha cadastrada com sucesso!
              </div>
            ) : <div />}

            <div className="flex gap-3">
              <button type="button" onClick={() => { setFormData(INITIAL_FORM); setDiasOperantes([0, 1, 2, 3, 4, 5, 6]); }}
                className="px-6 py-2.5 rounded-button border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs"
                aria-label="Limpar formulário">
                <X size={18} /> Limpar
              </button>
              <button type="submit"
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-button text-xs font-bold flex items-center gap-2 transition-colors"
                aria-label="Salvar linha">
                <Save size={18} /> Salvar Linha
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
