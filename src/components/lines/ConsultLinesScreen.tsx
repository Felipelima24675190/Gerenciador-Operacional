import { useState, useMemo, Dispatch, SetStateAction, MouseEvent, DragEvent } from 'react';
import { Search, ChevronDown, ChevronRight, Edit2, Check, X, GripVertical, Calendar as CalendarIcon, List, PlusCircle } from 'lucide-react';
import { Viagem, UserRole } from '../../types';

const DIAS_SEMANA = [
  { id: 0, label: 'Dom', full: 'Domingo' },
  { id: 1, label: 'Seg', full: 'Segunda-feira' },
  { id: 2, label: 'Ter', full: 'Terça-feira' },
  { id: 3, label: 'Qua', full: 'Quarta-feira' },
  { id: 4, label: 'Qui', full: 'Quinta-feira' },
  { id: 5, label: 'Sex', full: 'Sexta-feira' },
  { id: 6, label: 'Sáb', full: 'Sábado' },
];

interface ConsultLinesScreenProps {
  viagens: Viagem[];
  setViagens: Dispatch<SetStateAction<Viagem[]>>;
  userRole?: UserRole;
}

const COLORS = [
  'transparent',
  '#3b82f6', // blue
  '#10b981', // green
  '#a855f7', // purple
  '#f59e0b', // orange
  '#ef4444', // red
  '#ec4899', // pink
];

export default function ConsultLinesScreen({ viagens, setViagens, userRole }: ConsultLinesScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sentidoFilter, setSentidoFilter] = useState('Ambos');

  const dashboardData = useMemo(() => {
    return {
      totalLinhas: new Set(viagens.map(v => v.numeroLinha)).size,
      totalViagens: viagens.length,
    };
  }, [viagens]);

  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<Record<string, 'list' | 'weekly'>>({});
  
  const isAdmin = userRole === 'admin';

  // Edit Line Name State
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLineName, setEditLineName] = useState<string>('');
  const [editLineCode, setEditLineCode] = useState<string>('');

  // Add Trip State
  const [isAddingTrip, setIsAddingTrip] = useState<string | null>(null);
  const [newTrip, setNewTrip] = useState<Partial<Viagem>>({
    atendimento: '',
    sentido: 'Ida',
    pontoInicio: '',
    pontoFim: '',
    prevInicio: '00:00',
    prevFim: '00:00'
  });

  // Drag and Drop State
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Group trips by line number
  const groupedViagens = useMemo(() => {
    const map = new Map<string, Viagem[]>();
    viagens.forEach(v => {
      if (!map.has(v.numeroLinha)) {
        map.set(v.numeroLinha, []);
      }
      map.get(v.numeroLinha)!.push(v);
    });

    // Sort trips within each line by order
    Array.from(map.values()).forEach(list => list.sort((a, b) => a.ordem - b.ordem));

    return map;
  }, [viagens]);

  const linhasUnicas = useMemo(() => {
    return Array.from(groupedViagens.entries()).map(([numeroLinha, vgs]) => ({
      numeroLinha,
      nomeLinha: vgs[0]?.nomeLinha || '',
      totalViagens: vgs.length
    })).filter(l => 
      l.numeroLinha.includes(searchTerm) || 
      l.nomeLinha.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groupedViagens, searchTerm, sentidoFilter]);

  const toggleExpand = (numeroLinha: string) => {
    if (expandedLine === numeroLinha) {
      setExpandedLine(null);
    } else {
      setExpandedLine(numeroLinha);
    }
  };

  const toggleViewMode = (numeroLinha: string) => {
    setViewMode(prev => ({
      ...prev,
      [numeroLinha]: prev[numeroLinha] === 'weekly' ? 'list' : 'weekly'
    }));
  };

  const toggleOperatingDay = (viagemId: string, dayId: number) => {
    setViagens(prev => prev.map(v => {
      if (v.id === viagemId) {
        const dias = v.diasOperantes || [0, 1, 2, 3, 4, 5, 6];
        const novosDias = dias.includes(dayId) 
          ? dias.filter(d => d !== dayId)
          : [...dias, dayId].sort();
        return { ...v, diasOperantes: novosDias };
      }
      return v;
    }));
  };

  const handleAddTrip = (numeroLinha: string, nomeLinha: string) => {
    if (!newTrip.atendimento) return;
    
    const trips = groupedViagens.get(numeroLinha) || [];
    const maxOrder = trips.length > 0 ? Math.max(...trips.map(t => t.ordem)) : 0;

    const viagemCompleta: Viagem = {
      id: crypto.randomUUID(),
      numeroLinha,
      nomeLinha,
      atendimento: newTrip.atendimento!,
      sentido: newTrip.sentido!,
      pontoInicio: newTrip.pontoInicio!,
      pontoFim: newTrip.pontoFim!,
      prevInicio: `18/03/2026 ${newTrip.prevInicio}`,
      prevFim: `18/03/2026 ${newTrip.prevFim}`,
      ordem: maxOrder + 1,
      diasOperantes: [0, 1, 2, 3, 4, 5, 6]
    };

    setViagens(prev => [...prev, viagemCompleta]);
    setIsAddingTrip(null);
    setNewTrip({
      atendimento: '',
      sentido: 'Ida',
      pontoInicio: '',
      pontoFim: '',
      prevInicio: '00:00',
      prevFim: '00:00'
    });
  };

  const startEditingLine = (numeroLinha: string, currentName: string, e: MouseEvent) => {
    e.stopPropagation();
    setEditingLineId(numeroLinha);
    setEditLineName(currentName);
    setEditLineCode(numeroLinha);
  };

  const saveLineName = (numeroLinha: string, e: MouseEvent) => {
    e.stopPropagation();
    setViagens(prev => prev.map(v => 
      v.numeroLinha === numeroLinha 
        ? { ...v, nomeLinha: editLineName, numeroLinha: editLineCode } 
        : v
    ));
    setEditingLineId(null);
  };

  const cancelEditingLine = (e: MouseEvent) => {
    e.stopPropagation();
    setEditingLineId(null);
  };

  const saveTripEdit = (viagemId: string, field: keyof Viagem, value: string) => {
    setViagens(prev => prev.map(v => v.id === viagemId ? { ...v, [field]: value } : v));
  };

  const handleDragStart = (e: DragEvent, index: number) => {
    setDraggedItemIndex(index);
    // Needed for Firefox
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    setTimeout(() => {
      const target = e.target as HTMLElement;
      target.classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnd = (e: DragEvent) => {
    setDraggedItemIndex(null);
    const target = e.target as HTMLElement;
    target.classList.remove('opacity-50');
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent, numeroLinha: string, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    const currentLineTrips = [...groupedViagens.get(numeroLinha)!];
    const itemToMove = currentLineTrips[draggedItemIndex];
    
    // Remove from old position and insert at new position
    currentLineTrips.splice(draggedItemIndex, 1);
    currentLineTrips.splice(dropIndex, 0, itemToMove);

    // Update order property based on new index
    const updatedLineTrips = currentLineTrips.map((trip, idx) => ({
      ...trip,
      ordem: idx + 1
    }));

    // Save back to main state, preserving order to prevent the list from re-rendering out of place
    setViagens(prev => prev.map(v => {
      if (v.numeroLinha === numeroLinha) {
        return updatedLineTrips.find(u => u.id === v.id) || v;
      }
      return v;
    }));
    
    setDraggedItemIndex(null);
  };

  const formatTimeOnly = (dateTimeStr: string) => {
    const parts = dateTimeStr.split(' ');
    return parts.length > 1 ? parts[1] : dateTimeStr;
  };

  const cycleColor = (e: MouseEvent, viagemId: string, currentColor: string | undefined) => {
    e.stopPropagation();
    const currentIndex = COLORS.indexOf(currentColor || 'transparent');
    const nextColor = COLORS[(currentIndex + 1) % COLORS.length];
    setViagens(prev => prev.map(v => 
      v.id === viagemId 
        ? { ...v, grupoCor: nextColor === 'transparent' ? undefined : nextColor } 
        : v
    ));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-500">Total de Linhas</p>
          <p className="text-3xl font-bold">{dashboardData.totalLinhas}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-500">Total de Viagens Programadas</p>
          <p className="text-3xl font-bold">{dashboardData.totalViagens}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="Buscar linha por código ou nome..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        <div className="text-sm text-gray-500 font-medium">
          Total de linhas: {linhasUnicas.length}
        </div>
      </div>

      <div className="space-y-3">
        {linhasUnicas.length > 0 ? (
          linhasUnicas.map(linha => {
            const isExpanded = expandedLine === linha.numeroLinha;
            const trips = groupedViagens.get(linha.numeroLinha) || [];

            return (
              <div key={linha.numeroLinha} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200">
                {/* Header (Line info) */}
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50 border-b border-gray-100' : ''}`}
                  onClick={() => toggleExpand(linha.numeroLinha)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {isExpanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                    
                    <span className="font-bold text-slate-800 bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">
                      {linha.numeroLinha}
                    </span>
                    
                    {editingLineId === linha.numeroLinha && isAdmin ? (
                      <div className="flex items-center gap-3 flex-1 max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-1 w-24">
                          <label className="text-[8px] font-bold text-slate-400 uppercase">Cód. Linha</label>
                          <input 
                            type="text" 
                            value={editLineCode}
                            onChange={e => setEditLineCode(e.target.value)}
                            className="px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 text-xs font-bold text-blue-700 bg-blue-50"
                          />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-[8px] font-bold text-slate-400 uppercase">Nome da Linha</label>
                          <input 
                            type="text" 
                            value={editLineName}
                            onChange={e => setEditLineName(e.target.value)}
                            className="px-3 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 text-sm font-semibold text-slate-700"
                          />
                        </div>
                        <div className="flex gap-1 pt-4">
                          <button onClick={(e) => saveLineName(linha.numeroLinha, e)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded">
                            <Check size={16} />
                          </button>
                          <button onClick={cancelEditingLine} className="p-1.5 text-red-600 hover:bg-red-100 rounded">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700">{linha.nomeLinha}</span>
                        {isAdmin && (
                          <button 
                            onClick={(e) => startEditingLine(linha.numeroLinha, linha.nomeLinha, e)} 
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Editar nome da linha"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500 font-medium px-4">
                    {linha.totalViagens} viagens
                  </div>
                </div>

                {/* Expanded Content (Trips) */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => toggleViewMode(linha.numeroLinha)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode[linha.numeroLinha] !== 'weekly' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                        >
                          <List size={14} />
                          Lista Sequencial
                        </button>
                        <button 
                          onClick={() => toggleViewMode(linha.numeroLinha)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode[linha.numeroLinha] === 'weekly' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                        >
                          <CalendarIcon size={14} />
                          Visualização Semanal
                        </button>
                      </div>

                      {isAdmin && (
                        <button 
                          onClick={() => setIsAddingTrip(linha.numeroLinha)}
                          className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md"
                        >
                          <PlusCircle size={14} />
                          Adicionar Viagem
                        </button>
                      )}
                    </div>

                    {isAddingTrip === linha.numeroLinha && isAdmin && (
                      <div className="mb-4 bg-white border-2 border-emerald-100 rounded-xl p-4 shadow-sm animate-in zoom-in-95 duration-200">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Atendimento</label>
                            <input 
                              type="text" 
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm font-semibold focus:ring-1 focus:ring-emerald-500"
                              placeholder="REC X ..."
                              value={newTrip.atendimento}
                              onChange={e => setNewTrip({...newTrip, atendimento: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Sentido</label>
                            <select 
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm font-semibold"
                              value={newTrip.sentido}
                              onChange={e => setNewTrip({...newTrip, sentido: e.target.value})}
                            >
                              <option value="Ida">Ida</option>
                              <option value="Volta">Volta</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Início</label>
                            <input 
                              type="text" 
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm font-semibold"
                              placeholder="REC Tip"
                              value={newTrip.pontoInicio}
                              onChange={e => setNewTrip({...newTrip, pontoInicio: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Fim</label>
                            <input 
                              type="text" 
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm font-semibold"
                              placeholder="CAU"
                              value={newTrip.pontoFim}
                              onChange={e => setNewTrip({...newTrip, pontoFim: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Prev. Início (HH:mm)</label>
                            <input 
                              type="time" 
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm font-semibold"
                              value={newTrip.prevInicio}
                              onChange={e => setNewTrip({...newTrip, prevInicio: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Prev. Fim (HH:mm)</label>
                            <input 
                              type="time" 
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm font-semibold"
                              value={newTrip.prevFim}
                              onChange={e => setNewTrip({...newTrip, prevFim: e.target.value})}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleAddTrip(linha.numeroLinha, linha.nomeLinha)}
                              className="flex-1 bg-emerald-600 text-white py-1.5 rounded font-bold text-xs hover:bg-emerald-700"
                            >
                              Gravar
                            </button>
                            <button 
                              onClick={() => setIsAddingTrip(null)}
                              className="px-3 bg-slate-100 text-slate-500 py-1.5 rounded font-bold text-xs hover:bg-slate-200"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {viewMode[linha.numeroLinha] === 'weekly' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {DIAS_SEMANA.map(dia => {
                          const tripsOnDay = trips.filter(v => (v.diasOperantes || [0,1,2,3,4,5,6]).includes(dia.id));
                          return (
                            <div key={dia.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-[150px]">
                              <div className="bg-slate-100 p-2 text-center border-b border-gray-200">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{dia.full}</span>
                              </div>
                              <div className="p-2 flex-1 space-y-1">
                                {tripsOnDay.length > 0 ? (
                                  tripsOnDay.map(v => (
                                    <div key={v.id} className="text-[10px] p-1.5 rounded border border-slate-100 bg-slate-50 flex flex-col gap-0.5">
                                      <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-700">{v.atendimento}</span>
                                        <span className={`px-1 rounded-[2px] font-black text-[8px] ${v.sentido === 'Ida' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                          {v.sentido === 'Ida' ? 'I' : 'V'}
                                        </span>
                                      </div>
                                      <span className="font-mono text-slate-500">{formatTimeOnly(v.prevInicio)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="h-full flex items-center justify-center italic text-[10px] text-slate-400">
                                    Não opera
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <>
                        <div className={`mb-3 grid ${isAdmin ? 'grid-cols-[32px_1fr_64px_1.5fr_1.5fr_1.5fr_1.5fr_48px_120px]' : 'grid-cols-[32px_1fr_64px_1.5fr_1.5fr_1.5fr_1.5fr]'} gap-4 items-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-3`}>
                          <span className="text-center">Ord</span>
                          <span>Atendimento</span>
                          <span>Sentido</span>
                          <span>Ponto Início</span>
                          <span>Ponto Fim</span>
                          <span>Início (Previsto)</span>
                          <span>Fim (Previsto)</span>
                          {isAdmin && <span className="text-center">Grupo</span>}
                          {isAdmin && <span className="text-center">Dias Operantes</span>}
                        </div>

                        <div className="space-y-2">
                          {trips.map((viagem, index) => (
                            <div
                              key={viagem.id}
                              draggable={isAdmin}
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragEnd={handleDragEnd}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, linha.numeroLinha, index)}
                              className={`grid ${isAdmin ? 'grid-cols-[32px_1fr_64px_1.5fr_1.5fr_1.5fr_1.5fr_48px_120px]' : 'grid-cols-[32px_1fr_64px_1.5fr_1.5fr_1.5fr_1.5fr]'} gap-4 items-center bg-white border border-gray-200 rounded-lg p-3 text-sm hover:border-blue-300 hover:shadow-sm transition-all ${isAdmin ? 'cursor-move' : ''} group relative`}
                              style={{ borderLeft: (isAdmin && viagem.grupoCor) ? `4px solid ${viagem.grupoCor}` : '1px solid #e5e7eb' }}
                            >
                              <div className="flex justify-center text-gray-400 group-hover:text-blue-500">
                                {isAdmin ? <GripVertical size={16} /> : <span className="text-[10px] font-bold">{viagem.ordem}</span>}
                              </div>
                              <div className="font-medium text-slate-700 truncate" title={viagem.atendimento}>{viagem.atendimento}</div>
                              <div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${viagem.sentido === 'Ida' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {viagem.sentido}
                                </span>
                              </div>
                              <div className="text-slate-600 truncate" title={viagem.pontoInicio}>{viagem.pontoInicio}</div>
                              <div className="text-slate-600 truncate" title={viagem.pontoFim}>{viagem.pontoFim}</div>
                              <div className="font-mono text-slate-700 text-xs truncate flex items-center gap-1">
                                {isAdmin ? (
                                  <input 
                                    type="time" 
                                    value={formatTimeOnly(viagem.prevInicio)} 
                                    onChange={(e) => saveTripEdit(viagem.id, 'prevInicio', `18/03/2026 ${e.target.value}`)}
                                    className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 w-[75px] focus:ring-1 focus:ring-blue-500 text-center"
                                  />
                                ) : <span>{formatTimeOnly(viagem.prevInicio)}</span>}
                              </div>
                              <div className="font-mono text-slate-700 text-xs truncate flex items-center gap-1">
                                {isAdmin ? (
                                  <input 
                                    type="time" 
                                    value={formatTimeOnly(viagem.prevFim)} 
                                    onChange={(e) => saveTripEdit(viagem.id, 'prevFim', `18/03/2026 ${e.target.value}`)}
                                    className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 w-[75px] focus:ring-1 focus:ring-blue-500 text-center"
                                  />
                                ) : <span>{formatTimeOnly(viagem.prevFim)}</span>}
                              </div>
                              {isAdmin && (
                                <div className="flex justify-center">
                                  <button
                                    onClick={(e) => cycleColor(e, viagem.id, viagem.grupoCor)}
                                    className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    style={{ backgroundColor: viagem.grupoCor || '#f3f4f6' }}
                                    title="Clique para colorir e agrupar viagens"
                                  />
                                </div>
                              )}
                              {isAdmin && (
                                <div className="flex gap-0.5 justify-center">
                                  {DIAS_SEMANA.map(dia => (
                                    <button
                                      key={dia.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleOperatingDay(viagem.id, dia.id);
                                      }}
                                      className={`w-4 h-4 flex items-center justify-center rounded-[2px] text-[8px] font-bold transition-colors ${
                                        (viagem.diasOperantes || [0,1,2,3,4,5,6]).includes(dia.id)
                                          ? 'bg-emerald-500 text-white'
                                          : 'bg-slate-200 text-slate-400'
                                      }`}
                                      title={dia.full}
                                    >
                                      {dia.label[0]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {isAdmin && (
                      <div className="mt-4 text-xs text-gray-400 text-center">
                        Arraste e solte as viagens para reorganizar a ordem. Clique nos dias da semana (S, T, Q...) para definir quais viagens operam em cada dia.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Nenhuma linha encontrada. Verifique se a base foi importada.
          </div>
        )}
      </div>
    </div>
  );
}
