import { useState, useMemo, Dispatch, SetStateAction } from 'react';
import { Acidente, AcidenteFoto, Avaria, Motorista, UserRole } from '../../types';
import { Plus, Search, Image, Link2, X, ChevronDown, ChevronUp, Trash2, Save } from 'lucide-react';

interface AcidentesScreenProps {
  acidentes: Acidente[];
  setAcidentes: Dispatch<SetStateAction<Acidente[]>>;
  avarias: Avaria[];
  motoristas: Motorista[];
  userRole: UserRole;
}

const TIPOS_ACIDENTE = ['Colisao', 'Tombamento', 'Atropelamento', 'Capotamento', 'Engavetamento', 'Saida de Pista', 'Outro'];
const GRAVIDADES: Acidente['gravidade'][] = ['Leve', 'Moderado', 'Grave'];

export default function AcidentesScreen({ acidentes, setAcidentes, avarias, motoristas, userRole }: AcidentesScreenProps) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vinculandoId, setVinculandoId] = useState<string | null>(null);
  const [vinculoSearch, setVinculoSearch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    data: '',
    hora: '',
    prefixoVeiculo: '',
    placaVeiculo: '',
    matriculaMotorista: '',
    local: '',
    descricao: '',
    tipoAcidente: TIPOS_ACIDENTE[0],
    gravidade: 'Leve' as Acidente['gravidade'],
    valorEstimado: 0,
    status: 'Em Análise' as Acidente['status'],
  });
  const [formFotos, setFormFotos] = useState<AcidenteFoto[]>([]);

  const isAdmin = userRole === 'admin';

  const motoristaMap = useMemo(() => new Map(motoristas.map(m => [m.matricula, m])), [motoristas]);

  const filtered = useMemo(() => {
    if (!search.trim()) return acidentes;
    const q = search.toLowerCase();
    return acidentes.filter(a =>
      a.prefixoVeiculo.toLowerCase().includes(q) ||
      a.placaVeiculo.toLowerCase().includes(q) ||
      a.local.toLowerCase().includes(q) ||
      a.tipoAcidente.toLowerCase().includes(q) ||
      a.matriculaMotorista.toLowerCase().includes(q)
    );
  }, [acidentes, search]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        setFormFotos(prev => [...prev, {
          id: crypto.randomUUID(),
          url,
          descricao: '',
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const updatePhotoDesc = (id: string, descricao: string) => {
    setFormFotos(prev => prev.map(f => f.id === id ? { ...f, descricao } : f));
  };

  const removePhoto = (id: string) => {
    setFormFotos(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = () => {
    if (!formData.data || !formData.prefixoVeiculo) return;

    const novoAcidente: Acidente = {
      id: crypto.randomUUID(),
      ...formData,
      fotos: formFotos,
    };

    setAcidentes(prev => [novoAcidente, ...prev]);
    setFormData({
      data: '',
      hora: '',
      prefixoVeiculo: '',
      placaVeiculo: '',
      matriculaMotorista: '',
      local: '',
      descricao: '',
      tipoAcidente: TIPOS_ACIDENTE[0],
      gravidade: 'Leve',
      valorEstimado: 0,
      status: 'Em Análise',
    });
    setFormFotos([]);
    setShowForm(false);
  };

  const deleteAcidente = (id: string) => {
    if (!confirm('Excluir este acidente?')) return;
    setAcidentes(prev => prev.filter(a => a.id !== id));
  };

  const vincularAvaria = (acidenteId: string, avariaId: string) => {
    setAcidentes(prev => prev.map(a =>
      a.id === acidenteId ? { ...a, avariaVinculadaId: avariaId } : a
    ));
    setVinculandoId(null);
    setVinculoSearch('');
  };

  const desvincularAvaria = (acidenteId: string) => {
    setAcidentes(prev => prev.map(a =>
      a.id === acidenteId ? { ...a, avariaVinculadaId: undefined } : a
    ));
  };

  const avariasFiltered = useMemo(() => {
    if (!vinculoSearch.trim()) return avarias.slice(0, 20);
    const q = vinculoSearch.toLowerCase();
    return avarias.filter(a =>
      a.veiculo.toLowerCase().includes(q) || a.descricaoAvaria.toLowerCase().includes(q) || a.data.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [avarias, vinculoSearch]);

  const gravColor = (g: string) => {
    if (g === 'Grave') return 'bg-red-100 text-red-700';
    if (g === 'Moderado') return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4 flex-wrap">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Buscar por veiculo, placa, local, tipo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <span className="text-xs text-slate-400 font-bold">{filtered.length} acidentes</span>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus size={14} /> Registrar Acidente
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-black text-slate-700 uppercase">Novo Registro de Acidente</h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Data</label>
              <input type="date" value={formData.data} onChange={e => setFormData(p => ({ ...p, data: e.target.value }))} className="w-full text-xs p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Hora</label>
              <input type="time" value={formData.hora} onChange={e => setFormData(p => ({ ...p, hora: e.target.value }))} className="w-full text-xs p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Prefixo Veiculo</label>
              <input type="text" value={formData.prefixoVeiculo} onChange={e => setFormData(p => ({ ...p, prefixoVeiculo: e.target.value }))} className="w-full text-xs p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Placa</label>
              <input type="text" value={formData.placaVeiculo} onChange={e => setFormData(p => ({ ...p, placaVeiculo: e.target.value }))} className="w-full text-xs p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Matricula Motorista</label>
              <input type="text" value={formData.matriculaMotorista} onChange={e => setFormData(p => ({ ...p, matriculaMotorista: e.target.value }))} className="w-full text-xs p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Local</label>
              <input type="text" value={formData.local} onChange={e => setFormData(p => ({ ...p, local: e.target.value }))} className="w-full text-xs p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Tipo Acidente</label>
              <select value={formData.tipoAcidente} onChange={e => setFormData(p => ({ ...p, tipoAcidente: e.target.value }))} className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-white">
                {TIPOS_ACIDENTE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Gravidade</label>
              <select value={formData.gravidade} onChange={e => setFormData(p => ({ ...p, gravidade: e.target.value as Acidente['gravidade'] }))} className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-white">
                {GRAVIDADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Valor Estimado (R$)</label>
              <input type="number" step="0.01" value={formData.valorEstimado} onChange={e => setFormData(p => ({ ...p, valorEstimado: parseFloat(e.target.value) || 0 }))} className="w-full text-xs p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value as Acidente['status'] }))} className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-white">
                <option value="Em Análise">Em Analise</option>
                <option value="Concluído">Concluido</option>
                <option value="Pendente Seguro">Pendente Seguro</option>
              </select>
            </div>
          </div>

          <div className="col-span-full">
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Descricao do Acidente</label>
            <textarea value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} rows={3} className="w-full text-xs p-2 border border-gray-200 rounded-lg resize-none" placeholder="Descreva o acidente em detalhes..." />
          </div>

          {/* Photos */}
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-2">Fotos do Acidente</label>
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="text-xs mb-3" />
            {formFotos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {formFotos.map(foto => (
                  <div key={foto.id} className="relative border border-gray-200 rounded-lg overflow-hidden">
                    <img src={foto.url} alt="" className="w-full h-32 object-cover" />
                    <button onClick={() => removePhoto(foto.id)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"><X size={10} /></button>
                    <input
                      type="text"
                      placeholder="Descricao da foto..."
                      value={foto.descricao}
                      onChange={e => updatePhotoDesc(foto.id, e.target.value)}
                      className="w-full text-[10px] p-2 border-t border-gray-200 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setFormFotos([]); }} className="px-4 py-2 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSubmit} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700"><Save size={14} /> Salvar</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-slate-400 shadow-sm">
            Nenhum acidente registrado
          </div>
        )}
        {filtered.map(acidente => {
          const isExpanded = expandedId === acidente.id;
          const motorista = motoristaMap.get(acidente.matriculaMotorista);
          const avariaVinculada = acidente.avariaVinculadaId ? avarias.find(a => a.id === acidente.avariaVinculadaId) : null;

          return (
            <div key={acidente.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header row */}
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : acidente.id)}
              >
                <div className={`px-2 py-0.5 rounded text-[9px] font-black ${gravColor(acidente.gravidade)}`}>{acidente.gravidade}</div>
                <span className="text-xs font-bold text-slate-700">{acidente.data} {acidente.hora}</span>
                <span className="text-xs text-slate-500">{acidente.tipoAcidente}</span>
                <span className="text-xs font-mono font-bold text-brand-600">{acidente.prefixoVeiculo}</span>
                <span className="text-xs text-slate-500 truncate flex-1">{acidente.local}</span>
                {acidente.fotos.length > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-400"><Image size={12} />{acidente.fotos.length}</span>}
                {acidente.avariaVinculadaId && <span className="flex items-center gap-1 text-[10px] text-brand-500 font-bold"><Link2 size={12} />Vinculado</span>}
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${acidente.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : acidente.status === 'Pendente Seguro' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {acidente.status}
                </span>
                {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-slate-50/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Placa</span>{acidente.placaVeiculo || '-'}</div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Motorista</span>{motorista ? motorista.nome : acidente.matriculaMotorista || '-'}</div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Valor Estimado</span>{acidente.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase block">Local</span>{acidente.local}</div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descricao</span>
                    <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-gray-200">{acidente.descricao || 'Sem descricao'}</p>
                  </div>

                  {/* Photos gallery */}
                  {acidente.fotos.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Fotos ({acidente.fotos.length})</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {acidente.fotos.map(foto => (
                          <div key={foto.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <img src={foto.url} alt="" className="w-full h-32 object-cover" />
                            {foto.descricao && <p className="text-[10px] text-slate-500 p-2 border-t border-gray-100">{foto.descricao}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Avaria link */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Vinculacao com Avaria</span>
                    {avariaVinculada ? (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-brand-200">
                        <Link2 size={14} className="text-brand-500" />
                        <div className="flex-1 text-xs">
                          <span className="font-bold text-brand-600">Avaria #{avariaVinculada.id.substring(0, 8)}</span>
                          <span className="text-slate-500 ml-2">{avariaVinculada.data} - {avariaVinculada.veiculo} - {avariaVinculada.descricaoAvaria.substring(0, 50)}</span>
                        </div>
                        {isAdmin && (
                          <button onClick={() => desvincularAvaria(acidente.id)} className="text-[10px] text-red-500 font-bold hover:text-red-700">Desvincular</button>
                        )}
                      </div>
                    ) : (
                      <div>
                        {vinculandoId === acidente.id ? (
                          <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                            <input
                              type="text"
                              placeholder="Buscar avaria por veiculo, descricao ou data..."
                              value={vinculoSearch}
                              onChange={e => setVinculoSearch(e.target.value)}
                              className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                            />
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {avariasFiltered.map(av => (
                                <div
                                  key={av.id}
                                  onClick={() => vincularAvaria(acidente.id, av.id)}
                                  className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-brand-50 rounded cursor-pointer transition-colors"
                                >
                                  <span className="font-bold text-slate-700">{av.veiculo}</span>
                                  <span className="text-slate-400">{av.data}</span>
                                  <span className="text-slate-500 truncate flex-1">{av.descricaoAvaria.substring(0, 40)}</span>
                                </div>
                              ))}
                              {avariasFiltered.length === 0 && <p className="text-[10px] text-slate-400 text-center py-2">Nenhuma avaria encontrada</p>}
                            </div>
                            <button onClick={() => { setVinculandoId(null); setVinculoSearch(''); }} className="text-[10px] text-slate-400 hover:text-slate-600">Cancelar</button>
                          </div>
                        ) : (
                          isAdmin && (
                            <button
                              onClick={() => setVinculandoId(acidente.id)}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs text-brand-500 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
                            >
                              <Link2 size={12} /> Vincular a uma Avaria
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div className="flex justify-end">
                      <button onClick={() => deleteAcidente(acidente.id)} className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
