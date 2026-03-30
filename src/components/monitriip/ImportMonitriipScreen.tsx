import { useRef, useState, useMemo } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Trash2, Info, Search } from 'lucide-react';
import { Monitriip, Viagem, UserRole } from '../../types';

interface Props {
  monitriips: Monitriip[];
  setMonitriips: React.Dispatch<React.SetStateAction<Monitriip[]>>;
  userRole?: UserRole;
  viagens?: Viagem[];
}

type UploadState = 'idle' | 'success' | 'error';

interface ImportStats {
  total: number;
  validas: number;
  comAtraso: number;
}

export default function ImportMonitriipScreen({ monitriips, setMonitriips, userRole, viagens = [] }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadState>('idle');
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [linhaSelecionada, setLinhaSelecionada] = useState('');
  const [linhaSearch, setLinhaSearch] = useState('');
  const [showLinhaDropdown, setShowLinhaDropdown] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unique line names from base de linhas
  const linhasDisponiveis = useMemo(() => {
    const names = new Map<string, string>();
    viagens.forEach(v => {
      if (v.nomeLinha && !names.has(v.nomeLinha)) {
        names.set(v.nomeLinha, v.numeroLinha || '');
      }
    });
    return Array.from(names.entries()).map(([nome, numero]) => ({ nome, numero })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [viagens]);

  const linhasFiltradas = useMemo(() => {
    if (!linhaSearch.trim()) return linhasDisponiveis;
    const q = linhaSearch.toLowerCase();
    return linhasDisponiveis.filter(l => l.nome.toLowerCase().includes(q) || l.numero.toLowerCase().includes(q));
  }, [linhasDisponiveis, linhaSearch]);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">
          Apenas Administradores podem importar dados do Monitriip.
        </p>
      </div>
    );
  }

  const processFile = (file: File, linha: string) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const text = (e.target?.result as string).replace(/^\uFEFF/, '');
      const lines = text.split('\n');
      const novas: Monitriip[] = [];

      // Detect separator and Imei column from header
      const headerLine = (lines[0] || '').trim();
      const sep = headerLine.includes(';') ? ';' : ',';
      const headerCols = headerLine.split(sep).map(h => h.trim().toLowerCase());
      const hasImei = headerCols[0]?.includes('imei');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const rawCols = line.split(sep);

        // Skip header
        const first = rawCols[0]?.trim().toLowerCase() || '';
        if (first.includes('imei') || first.includes('partida')) continue;

        // If Imei column exists, skip it (offset by 1)
        const offset = hasImei ? 1 : 0;
        const cols = rawCols.slice(offset);

        if (cols.length < 10) continue;

        const partidaPrevista = cols[0]?.trim() || '';
        if (!partidaPrevista) continue;

        // data = first 10 chars of col[0]
        const data = partidaPrevista.substring(0, 10);

        const partida = cols[1]?.trim() || '';
        const chegada = cols[2]?.trim() || '';
        const servico = cols[3]?.trim() || '';
        const viagemValida = cols[4]?.trim().toLowerCase() === 'sim';
        const atraso30min = cols[5]?.trim().toLowerCase() === 'sim';

        const vendaPassagem = parseInt(cols[6]?.trim() || '0', 10) || 0;
        const cancelPassagem = parseInt(cols[7]?.trim() || '0', 10) || 0;
        const embarque = parseInt(cols[8]?.trim() || '0', 10) || 0;
        const noShow = parseInt(cols[9]?.trim() || '0', 10) || 0;

        const inicioFimViagem = cols[10]?.trim() || 'N/A';
        const jornadaMotorista = cols[11]?.trim() || 'N/A';
        const detectorParada = cols[12]?.trim() || 'N/A';
        const velTempoLocalizacao = cols[13]?.trim() || 'N/A';
        const velTempLocMinima = cols[14]?.trim() || 'N/A';

        novas.push({
          id: crypto.randomUUID(),
          data,
          partidaPrevista,
          partida,
          chegada,
          servico,
          viagemValida,
          atraso30min,
          vendaPassagem,
          cancelPassagem,
          embarque,
          noShow,
          inicioFimViagem,
          jornadaMotorista,
          detectorParada,
          velTempoLocalizacao,
          velTempLocMinima,
          linhaAssociada: linha || undefined,
        });
      }

      if (novas.length > 0) {
        // Accumulate: append new records, dedup by data+servico+partidaPrevista
        setMonitriips(prev => {
          const existingKeys = new Set(novas.map(r => `${r.data}|${r.servico}|${r.partidaPrevista}`));
          const kept = prev.filter(r => !existingKeys.has(`${r.data}|${r.servico}|${r.partidaPrevista}`));
          return [...kept, ...novas];
        });

        const validas = novas.filter(r => r.viagemValida).length;
        const comAtraso = novas.filter(r => r.atraso30min).length;

        setStats({ total: novas.length, validas, comAtraso });
        setUploadStatus('success');
        setPendingFile(null);
      } else {
        setUploadStatus('error');
      }
      setTimeout(() => setUploadStatus('idle'), 12000);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileSelected = (file: File) => {
    if (linhasDisponiveis.length > 0 && !linhaSelecionada) {
      // Store file and ask user to select a line first
      setPendingFile(file);
      return;
    }
    processFile(file, linhaSelecionada);
  };

  const handleConfirmImport = () => {
    if (pendingFile) {
      processFile(pendingFile, linhaSelecionada);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  };

  const handleClear = () => {
    if (confirm('Limpar todos os dados do Monitriip?')) {
      setMonitriips([]);
      setStats(null);
      setUploadStatus('idle');
      setPendingFile(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
        <div>
          <p className="font-bold">Importação — Monitriip</p>
          <p className="text-xs mt-0.5 text-blue-700">
            Arquivo CSV com separador <strong>;</strong> ou <strong>,</strong>. Colunas: Partida Prevista, Partida, Chegada, Servi\u00e7o, Viagem Valida?, Atraso &gt;30min, Venda Passagem, Cancel. Passagem, Embarque, NoShow, Inicio/Fim Viagem, Jornada Motorista, Detector Parada, Vel. Tempo Localiza\u00e7\u00e3o, Vel. Temp. Loc. M\u00ednima. A coluna Imei (se presente) \u00e9 ignorada automaticamente.
            <br />A importação <strong>acumula</strong> registros (dados duplicados são substituídos).
          </p>
        </div>
      </div>

      {/* Line selection */}
      {linhasDisponiveis.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-2">Linha Associada</h4>
          <p className="text-xs text-slate-500 mb-3">Selecione a linha (da Base de Linhas) à qual esses dados Monitriip se referem.</p>
          <div className="relative">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar linha por nome ou código..."
                value={showLinhaDropdown ? linhaSearch : linhaSelecionada || linhaSearch}
                onChange={e => {
                  setLinhaSearch(e.target.value);
                  setShowLinhaDropdown(true);
                  if (!e.target.value) setLinhaSelecionada('');
                }}
                onFocus={() => setShowLinhaDropdown(true)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            {showLinhaDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {linhasFiltradas.length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-400">Nenhuma linha encontrada</p>
                )}
                {linhasFiltradas.map(l => (
                  <button
                    key={l.nome}
                    onClick={() => {
                      setLinhaSelecionada(l.nome);
                      setLinhaSearch('');
                      setShowLinhaDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-brand-50 transition-colors flex items-center justify-between ${linhaSelecionada === l.nome ? 'bg-brand-50 font-bold text-brand-700' : 'text-slate-700'}`}
                  >
                    <span>{l.nome}</span>
                    {l.numero && <span className="text-[10px] text-slate-400 font-mono">{l.numero}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {linhaSelecionada && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{linhaSelecionada}</span>
              <button onClick={() => { setLinhaSelecionada(''); setLinhaSearch(''); }} className="text-[10px] text-red-500 hover:underline">Limpar</button>
            </div>
          )}
        </div>
      )}

      {/* Pending file warning - needs line selection */}
      {pendingFile && !linhaSelecionada && linhasDisponiveis.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-xs text-amber-800 font-semibold flex items-center gap-2 justify-between">
          <span>Arquivo "<strong>{pendingFile.name}</strong>" selecionado. Escolha uma linha acima para concluir a importação.</span>
        </div>
      )}

      {/* Pending file ready - line selected */}
      {pendingFile && linhaSelecionada && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-xs text-emerald-800 font-semibold">
            Arquivo "<strong>{pendingFile.name}</strong>" pronto. Linha: <strong>{linhaSelecionada}</strong>
          </span>
          <button
            onClick={handleConfirmImport}
            className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Importar Agora
          </button>
        </div>
      )}

      {/* Upload area */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-6 text-center">
          <h3 className="text-xl font-bold text-slate-800">Importar Dados Monitriip</h3>
          <p className="text-sm text-gray-500 mt-1">Arraste o arquivo ou clique para selecionar</p>
        </div>

        <label
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={ev => {
              const f = ev.target.files?.[0];
              if (f) handleFileSelected(f);
              ev.target.value = '';
            }}
          />

          {uploadStatus === 'idle' && (
            <>
              <div className="p-4 bg-white shadow-sm border border-gray-200 rounded-full mb-4 text-slate-700">
                <UploadCloud size={32} />
              </div>
              <p className="font-semibold text-slate-700">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-gray-400 mt-1">.CSV ou .TXT com separador ;</p>
            </>
          )}

          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in duration-300 text-center w-full">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                  <CheckCircle size={32} />
                </div>
              </div>
              <p className="font-bold text-emerald-700 text-lg mb-4">Importação concluída!</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 min-w-[110px]">
                  <p className="text-xs text-emerald-600 font-bold uppercase">Total Viagens</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.total}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 min-w-[110px]">
                  <p className="text-xs text-emerald-600 font-bold uppercase">Viagens Válidas</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.validas}</p>
                </div>
                {stats.comAtraso > 0 && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 min-w-[110px]">
                    <p className="text-xs text-amber-600 font-bold uppercase">Com Atraso</p>
                    <p className="text-2xl font-bold text-amber-700">{stats.comAtraso}</p>
                  </div>
                )}
              </div>
              {linhaSelecionada && (
                <p className="text-xs text-slate-500 mt-3">Linha associada: <strong>{linhaSelecionada}</strong></p>
              )}
            </div>
          )}

          {uploadStatus === 'error' && (
            <>
              <div className="p-4 bg-red-100 text-red-600 rounded-full mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="font-semibold text-red-600">Erro na leitura do arquivo</p>
              <p className="text-sm text-red-500 mt-1">Verifique o formato e separadores.</p>
            </>
          )}
        </label>
      </div>

      {/* Active base summary */}
      {monitriips.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-700">
              Base ativa: <span className="text-slate-900">{monitriips.length}</span> viagens
              &nbsp;·&nbsp;
              <span className="text-emerald-700">{monitriips.filter(r => r.viagemValida).length} válidas</span>
              &nbsp;·&nbsp;
              <span className="text-amber-700">{monitriips.filter(r => r.atraso30min).length} com atraso</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {monitriips[0]?.data && <>Período: {monitriips[0].data} — {monitriips[monitriips.length - 1]?.data}</>}
              {monitriips[0]?.linhaAssociada && <> · Linha: <strong>{monitriips[0].linhaAssociada}</strong></>}
            </p>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-1.5 border border-red-400 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 shrink-0"
          >
            <Trash2 size={14} /> Limpar
          </button>
        </div>
      )}
    </div>
  );
}
