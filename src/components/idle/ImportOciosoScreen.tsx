import { useState, Dispatch, SetStateAction } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import { RegistroOciosidade, RegistroLinha, Viagem, UserRole } from '../../types';
import { buildLinhaLookup } from '../../utils/linhaLookup';

interface ImportOciosoScreenProps {
  registros: RegistroOciosidade[];
  setRegistros: Dispatch<SetStateAction<RegistroOciosidade[]>>;
  linhas: RegistroLinha[];
  setLinhas: Dispatch<SetStateAction<RegistroLinha[]>>;
  viagens: Viagem[];
  userRole?: UserRole;
}

type UploadState = 'idle' | 'success' | 'error';

export default function ImportOciosoScreen({ registros, setRegistros, linhas, setLinhas, viagens, userRole }: ImportOciosoScreenProps) {
  const [veicDrag, setVeicDrag] = useState(false);
  const [veicStatus, setVeicStatus] = useState<UploadState>('idle');
  const [veicStats, setVeicStats] = useState<{ total: number; veiculos: number } | null>(null);

  const [linhaDrag, setLinhaDrag] = useState(false);
  const [linhaStatus, setLinhaStatus] = useState<UploadState>('idle');
  const [linhaStats, setLinhaStats] = useState<{ total: number; pendentes: number } | null>(null);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar dados de Tempo Ocioso.</p>
      </div>
    );
  }

  // Build flexible lookup for line matching
  const resolveLinha = buildLinhaLookup(viagens);
  const linhasCadastradas = new Set(viagens.map(v => v.numeroLinha.trim()));
  // Also index by servico for broader matching
  viagens.forEach(v => { if (v.servico) linhasCadastradas.add(v.servico.trim()); });

  // ─── File 2: Operacional e Ocioso por Veículo ───────────────────────────────
  const processVeicFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setVeicStatus('error'); setTimeout(() => setVeicStatus('idle'), 3000); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const novosRegistros: RegistroOciosidade[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(';');
        // Skip header
        if (parts[0].trim().toLowerCase().includes('prefixo')) continue;
        if (parts.length < 4) continue;

        const prefixo = parts[0].trim();
        const data = parts[1].trim();
        const operacionalKm = parseFloat(parts[2].trim().replace(',', '.')) || 0;
        const ociosaKm = parseFloat(parts[3].trim().replace(',', '.')) || 0;
        const totalKm = parseFloat(parts[4]?.trim().replace(',', '.')) || 0;

        if (!prefixo || !data) continue;

        novosRegistros.push({
          id: crypto.randomUUID(),
          prefixo,
          data,
          operacionalKm,
          ociosaKm,
          totalKm,
        });
      }

      if (novosRegistros.length > 0) {
        setRegistros(novosRegistros);
        const veiculosUnicos = new Set(novosRegistros.map(r => r.prefixo)).size;
        setVeicStats({ total: novosRegistros.length, veiculos: veiculosUnicos });
        setVeicStatus('success');
      } else {
        setVeicStatus('error');
      }
      setTimeout(() => setVeicStatus('idle'), 10000);
    };
    reader.readAsText(file, 'utf-8');
  };

  // ─── File 1: Tempo Total por Linha ─────────────────────────────────────────
  const processLinhaFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setLinhaStatus('error'); setTimeout(() => setLinhaStatus('idle'), 3000); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const fileLines = text.split('\n');
      const novosRegistros: RegistroLinha[] = [];

      for (let i = 0; i < fileLines.length; i++) {
        const line = fileLines[i].trim();
        if (!line) continue;
        const parts = line.split(';');
        // Skip header
        if (parts[0].trim().toLowerCase().includes('numero') || parts[0].trim().toLowerCase().includes('número')) continue;

        const numeroLinha = parts[0].trim();
        const km = parseFloat(parts[1]?.trim().replace(',', '.')) || 0;
        const veiculosRaw = parts[2]?.trim() || '';
        const veiculos = veiculosRaw ? veiculosRaw.split(',').map(v => v.trim()).filter(Boolean) : [];

        if (!numeroLinha) continue;

        const pendenteCadastro = !linhasCadastradas.has(numeroLinha) && !resolveLinha(numeroLinha);

        novosRegistros.push({
          id: crypto.randomUUID(),
          numeroLinha,
          km,
          veiculos,
          pendenteCadastro,
        });
      }

      if (novosRegistros.length > 0) {
        setLinhas(novosRegistros);
        const pendentes = novosRegistros.filter(r => r.pendenteCadastro).length;
        setLinhaStats({ total: novosRegistros.length, pendentes });
        setLinhaStatus('success');
      } else {
        setLinhaStatus('error');
      }
      setTimeout(() => setLinhaStatus('idle'), 10000);
    };
    reader.readAsText(file, 'utf-8');
  };

  const UploadArea = ({
    title, desc, isDragging, status, stats, statsContent,
    onDragOver, onDragLeave, onDrop, onFile
  }: {
    title: string; desc: string;
    isDragging: boolean; status: UploadState;
    stats: object | null; statsContent: React.ReactNode;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onFile: (f: File) => void;
  }) => (
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
      <div className="mb-6 text-center">
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-gray-500 mt-2">{desc}</p>
      </div>
      <label
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
          ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      >
        <input type="file" accept=".csv,.txt" className="hidden" onChange={ev => { const f = ev.target.files?.[0]; if (f) onFile(f); }} />
        {status === 'idle' && (
          <>
            <div className="p-4 bg-white shadow-sm border border-gray-200 rounded-full mb-4 text-slate-700"><UploadCloud size={32} /></div>
            <p className="font-semibold text-slate-700">Clique ou arraste o arquivo aqui</p>
            <p className="text-xs text-gray-400 mt-1">.CSV ou .TXT com separador ;</p>
          </>
        )}
        {status === 'success' && stats && (
          <div className="animate-in fade-in zoom-in duration-300 text-center">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4 mx-auto w-16"><CheckCircle size={32} /></div>
            <p className="font-bold text-emerald-700 text-lg">Importação concluída!</p>
            <div className="mt-4 flex gap-4 justify-center">{statsContent}</div>
          </div>
        )}
        {status === 'error' && (
          <>
            <div className="p-4 bg-red-100 text-red-600 rounded-full mb-4"><AlertTriangle size={32} /></div>
            <p className="font-semibold text-red-600">Erro na leitura do arquivo</p>
            <p className="text-sm text-red-500 mt-1">Verifique o formato e separadores.</p>
          </>
        )}
      </label>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Veículos */}
      <UploadArea
        title="Importar: Operacional e Ocioso por Veículo"
        desc="Arquivo CSV com colunas: Prefixo do Veículo; Data (DD/MM/YYYY); Operacional (KM); Ociosa (KM); Total (KM)"
        isDragging={veicDrag}
        status={veicStatus}
        stats={veicStats}
        statsContent={
          <div className="flex gap-4">
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 min-w-[100px]">
              <p className="text-xs text-emerald-600 font-bold uppercase">Registros</p>
              <p className="text-2xl font-bold text-emerald-700">{veicStats?.total}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 min-w-[100px]">
              <p className="text-xs text-emerald-600 font-bold uppercase">Veículos</p>
              <p className="text-2xl font-bold text-emerald-700">{veicStats?.veiculos}</p>
            </div>
          </div>
        }
        onDragOver={e => { e.preventDefault(); setVeicDrag(true); }}
        onDragLeave={e => { e.preventDefault(); setVeicDrag(false); }}
        onDrop={e => { e.preventDefault(); setVeicDrag(false); const f = e.dataTransfer.files[0]; if (f) processVeicFile(f); }}
        onFile={processVeicFile}
      />

      {registros.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
          <p className="text-sm font-bold text-slate-700">Base ativa: {registros.length} registros · {new Set(registros.map(r => r.prefixo)).size} veículos</p>
          <button onClick={() => { if (confirm('Limpar todos os registros de veículos?')) { setRegistros([]); setVeicStats(null); } }} className="flex items-center gap-2 px-3 py-1.5 border border-red-400 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50">
            <Trash2 size={14} /> Limpar
          </button>
        </div>
      )}

      {/* Linhas */}
      <UploadArea
        title="Importar: Tempo Total por Linha"
        desc="Arquivo CSV com colunas: Numero da linha; Km; Veiculos (lista separada por vírgula)"
        isDragging={linhaDrag}
        status={linhaStatus}
        stats={linhaStats}
        statsContent={
          <div className="flex gap-4">
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 min-w-[100px]">
              <p className="text-xs text-emerald-600 font-bold uppercase">Linhas</p>
              <p className="text-2xl font-bold text-emerald-700">{linhaStats?.total}</p>
            </div>
            {(linhaStats?.pendentes ?? 0) > 0 && (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 min-w-[120px]">
                <p className="text-xs text-amber-600 font-bold uppercase">Pendentes Cadastro</p>
                <p className="text-2xl font-bold text-amber-700">{linhaStats?.pendentes}</p>
              </div>
            )}
          </div>
        }
        onDragOver={e => { e.preventDefault(); setLinhaDrag(true); }}
        onDragLeave={e => { e.preventDefault(); setLinhaDrag(false); }}
        onDrop={e => { e.preventDefault(); setLinhaDrag(false); const f = e.dataTransfer.files[0]; if (f) processLinhaFile(f); }}
        onFile={processLinhaFile}
      />

      {linhas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-700">Base ativa: {linhas.length} linhas</p>
            <button onClick={() => { if (confirm('Limpar todos os registros de linhas?')) { setLinhas([]); setLinhaStats(null); } }} className="flex items-center gap-2 px-3 py-1.5 border border-red-400 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50">
              <Trash2 size={14} /> Limpar
            </button>
          </div>
          {linhas.some(l => l.pendenteCadastro) && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <p><strong>Linhas pendentes de cadastro:</strong> {linhas.filter(l => l.pendenteCadastro).map(l => l.numeroLinha).join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
