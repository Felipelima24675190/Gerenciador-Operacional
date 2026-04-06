import { useState, FormEvent, Dispatch, SetStateAction } from 'react';
import { MapPin, Save, X, CheckCircle2, Plus, Trash2 } from 'lucide-react';
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

interface TripForm {
  atendimento: string;
  sentido: string;
  pontoInicio: string;
  pontoFim: string;
  horarioSaida: string;
  servico: string;
  diasOperantes: number[];
}

const EMPTY_TRIP: TripForm = {
  atendimento: '',
  sentido: 'Ida',
  pontoInicio: '',
  pontoFim: '',
  horarioSaida: '',
  servico: '',
  diasOperantes: [0, 1, 2, 3, 4, 5, 6],
};

export default function ManualLineScreen({ setViagens }: ManualLineScreenProps) {
  const [nomeLinha, setNomeLinha] = useState('');
  const [numeroLinha, setNumeroLinha] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [regiao, setRegiao] = useState('');
  const [trips, setTrips] = useState<TripForm[]>([{ ...EMPTY_TRIP }]);
  const [showSuccess, setShowSuccess] = useState(false);

  const addTrip = () => setTrips(prev => [...prev, { ...EMPTY_TRIP }]);

  const removeTrip = (idx: number) => {
    if (trips.length <= 1) return;
    setTrips(prev => prev.filter((_, i) => i !== idx));
  };

  const updateTrip = (idx: number, field: keyof TripForm, value: string | number[]) => {
    setTrips(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const toggleDia = (idx: number, dayId: number) => {
    const dias = trips[idx].diasOperantes;
    const updated = dias.includes(dayId) ? dias.filter(d => d !== dayId) : [...dias, dayId].sort();
    updateTrip(idx, 'diasOperantes', updated);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!nomeLinha || !numeroLinha) return;

    const validTrips = trips.filter(t => t.atendimento && t.pontoInicio && t.pontoFim && t.horarioSaida);
    if (validTrips.length === 0) return;

    const novasViagens: Viagem[] = validTrips.map((t, idx) => ({
      id: crypto.randomUUID(),
      nomeLinha: nomeLinha.toUpperCase(),
      numeroLinha,
      atendimento: t.atendimento.toUpperCase(),
      sentido: t.sentido,
      pontoInicio: t.pontoInicio.toUpperCase(),
      pontoFim: t.pontoFim.toUpperCase(),
      prevInicio: `01/01/2026 ${t.horarioSaida}`,
      prevFim: '',
      ordem: idx,
      diasOperantes: t.diasOperantes,
      horarioSaida: t.horarioSaida,
      servico: t.servico || undefined,
      empresa: empresa?.toUpperCase() || undefined,
      regiao: regiao?.toUpperCase() || undefined,
      origem: t.pontoInicio.toUpperCase(),
      destino: t.pontoFim.toUpperCase(),
    }));

    setViagens(prev => [...prev, ...novasViagens]);
    setNomeLinha('');
    setNumeroLinha('');
    setEmpresa('');
    setRegiao('');
    setTrips([{ ...EMPTY_TRIP }]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 8000);
  };

  const inputCls = "w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none transition-all font-bold text-slate-700";
  const labelCls = "text-xs font-black text-slate-400 uppercase tracking-wider";

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
        <div className="bg-blue-900 p-6 text-white">
          <div className="flex items-center gap-3">
            <MapPin size={24} className="text-emerald-400" />
            <div>
              <h3 className="text-xl font-bold">Cadastrar Linha Manualmente</h3>
              <p className="text-blue-200 text-sm">Defina a linha e adicione suas viagens.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Line Info */}
          <div>
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4 border-b pb-2">Dados da Linha</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label htmlFor="line-nomeLinha" className={labelCls}>Nome da Linha</label>
                <input id="line-nomeLinha" required type="text" value={nomeLinha} onChange={e => setNomeLinha(e.target.value)}
                  className={inputCls} placeholder="Ex: RECIFE(PE) X PETROLINA(PE)" aria-label="Nome da linha" />
              </div>
              <div className="space-y-2">
                <label htmlFor="line-numeroLinha" className={labelCls}>Código da Linha</label>
                <input id="line-numeroLinha" required type="text" value={numeroLinha} onChange={e => setNumeroLinha(e.target.value)}
                  className={inputCls} placeholder="Ex: PERN003029" aria-label="Código da linha" />
              </div>
              <div className="space-y-2">
                <label htmlFor="line-empresa" className={labelCls}>Empresa (opcional)</label>
                <input id="line-empresa" type="text" value={empresa} onChange={e => setEmpresa(e.target.value)}
                  className={inputCls} placeholder="Ex: VIACAO PROGRESSO" aria-label="Empresa" />
              </div>
              <div className="space-y-2">
                <label htmlFor="line-regiao" className={labelCls}>Região (opcional)</label>
                <input id="line-regiao" type="text" value={regiao} onChange={e => setRegiao(e.target.value)}
                  className={inputCls} placeholder="Ex: NORDESTE" aria-label="Região" />
              </div>
            </div>
          </div>

          {/* Trips */}
          <div>
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-wide">Viagens ({trips.length})</h4>
              <button type="button" onClick={addTrip}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-button transition-colors"
                aria-label="Adicionar viagem">
                <Plus size={14} /> Adicionar Viagem
              </button>
            </div>

            <div className="space-y-4">
              {trips.map((trip, idx) => (
                <div key={idx} className="bg-slate-50 border border-gray-200 rounded-xl p-5 space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-brand-700 uppercase">Viagem {idx + 1}</span>
                    {trips.length > 1 && (
                      <button type="button" onClick={() => removeTrip(idx)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1" aria-label={`Remover viagem ${idx + 1}`}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <label className={labelCls}>Atendimento</label>
                      <input required type="text" value={trip.atendimento} onChange={e => updateTrip(idx, 'atendimento', e.target.value)}
                        className={inputCls} placeholder="Ex: RECIFE X PETROLINA" aria-label={`Atendimento viagem ${idx + 1}`} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Sentido</label>
                      <select value={trip.sentido} onChange={e => updateTrip(idx, 'sentido', e.target.value)}
                        className={inputCls} aria-label={`Sentido viagem ${idx + 1}`}>
                        <option value="Ida">IDA</option>
                        <option value="Volta">VOLTA</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className={labelCls}>Ponto de Início</label>
                      <input required type="text" value={trip.pontoInicio} onChange={e => updateTrip(idx, 'pontoInicio', e.target.value)}
                        className={inputCls} placeholder="RECIFE(PE)" aria-label={`Ponto início viagem ${idx + 1}`} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Ponto Final</label>
                      <input required type="text" value={trip.pontoFim} onChange={e => updateTrip(idx, 'pontoFim', e.target.value)}
                        className={inputCls} placeholder="PETROLINA(PE)" aria-label={`Ponto final viagem ${idx + 1}`} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Horário de Saída</label>
                      <input required type="time" value={trip.horarioSaida} onChange={e => updateTrip(idx, 'horarioSaida', e.target.value)}
                        className={inputCls} aria-label={`Horário saída viagem ${idx + 1}`} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Serviço ANTT</label>
                      <input type="text" value={trip.servico} onChange={e => updateTrip(idx, 'servico', e.target.value)}
                        className={inputCls} placeholder="Opcional" aria-label={`Serviço viagem ${idx + 1}`} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>Dias Operantes</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DIAS_SEMANA.map(d => (
                        <button key={d.id} type="button" onClick={() => toggleDia(idx, d.id)}
                          className={`px-2.5 py-1 rounded-lg text-2xs font-bold border transition-colors ${trip.diasOperantes.includes(d.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-gray-200 hover:bg-slate-100'}`}
                          aria-label={`Dia ${d.label} viagem ${idx + 1}`} aria-pressed={trip.diasOperantes.includes(d.id)}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            {showSuccess ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in fade-in slide-in-from-left-2">
                <CheckCircle2 size={20} /> Linha cadastrada com {trips.length} viagen{trips.length !== 1 ? 's' : ''}!
              </div>
            ) : <div />}

            <div className="flex gap-3">
              <button type="button" onClick={() => { setNomeLinha(''); setNumeroLinha(''); setEmpresa(''); setRegiao(''); setTrips([{ ...EMPTY_TRIP }]); }}
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
