import { useRef, useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Trash2, Info } from 'lucide-react';
import { OciosidadeMotorista, Motorista, Viagem, UserRole } from '../../types';

interface Props {
  ociosidades: OciosidadeMotorista[];
  setOciosidades: React.Dispatch<React.SetStateAction<OciosidadeMotorista[]>>;
  motoristas: Motorista[];
  viagens: Viagem[];
  userRole?: UserRole;
}

type UploadState = 'idle' | 'success' | 'error';

interface ImportStats {
  total: number;
  uniqueDrivers: number;
  unknownDrivers: number;
}

export default function ImportOciosidadeMotoristaScreen({
  ociosidades,
  setOciosidades,
  motoristas,
  viagens,
  userRole,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadState>('idle');
  const [stats, setStats] = useState<ImportStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">
          Apenas Administradores podem importar dados de Ociosidade de Motorista.
        </p>
      </div>
    );
  }

  // Build lookup maps
  const viagensMap = new Map(viagens.map(v => [v.numeroLinha.trim(), v.nomeLinha]));
  const motoristasSet = new Set(motoristas.map(m => m.matricula.trim()));

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const novas: OciosidadeMotorista[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(';');

        // Skip header
        if (cols[0] && (cols[0].toLowerCase().includes('data') || cols[0].toLowerCase().includes('data/hora'))) {
          continue;
        }
        if (cols.length < 6) continue;

        const dataHora = cols[0].trim();
        if (!dataHora) continue;

        const data = dataHora.split(',')[0].trim();

        // Parse linha / codigoLinha
        const linhaRaw = cols[1]?.trim() || '';
        const dashIdx = linhaRaw.indexOf('-');
        const codigoLinha = dashIdx !== -1 ? linhaRaw.substring(0, dashIdx).trim() : linhaRaw;
        const nomeLinha = viagensMap.get(codigoLinha) || linhaRaw;

        const sentido = cols[2]?.trim() || '';
        const prefixo = cols[3]?.trim() || '';

        const motoristaRaw = cols[4]?.trim() || '';
        const matricula = motoristaRaw.slice(-5);

        const eventoOcorrido = cols[5]?.trim() || '';
        const tempoMatch = eventoOcorrido.match(/há (\d+) minutos?/i);
        const tempoMinutos = tempoMatch ? parseInt(tempoMatch[1], 10) : 0;

        const endereco = cols[6]?.trim() || '';

        novas.push({
          id: crypto.randomUUID(),
          dataHora,
          data,
          codigoLinha,
          nomeLinha,
          sentido,
          prefixo,
          matricula,
          eventoOcorrido,
          tempoMinutos,
          endereco,
        });
      }

      if (novas.length > 0) {
        setOciosidades(prev => [...prev, ...novas]);

        const uniqueDrivers = new Set(novas.map(r => r.matricula)).size;
        const unknownDrivers = new Set(
          novas.filter(r => !motoristasSet.has(r.matricula)).map(r => r.matricula)
        ).size;

        setStats({ total: novas.length, uniqueDrivers, unknownDrivers });
        setUploadStatus('success');
      } else {
        setUploadStatus('error');
      }
      setTimeout(() => setUploadStatus('idle'), 12000);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleClear = () => {
    if (confirm('Limpar todos os registros de Ociosidade de Motorista?')) {
      setOciosidades([]);
      setStats(null);
      setUploadStatus('idle');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
        <div>
          <p className="font-bold">Importação — Ociosidade de Motorista</p>
          <p className="text-xs mt-0.5 text-blue-700">
            Arquivo CSV com separador <strong>;</strong>. Colunas esperadas: Data/Hora; Linha; Sentido; Prefixo; Motorista; Evento Ocorrido; Endereço.
            Os registros importados são <strong>adicionados</strong> aos existentes.
          </p>
        </div>
      </div>

      {/* Upload area */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-6 text-center">
          <h3 className="text-xl font-bold text-slate-800">Importar Ociosidade de Motorista</h3>
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
              if (f) processFile(f);
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
                  <p className="text-xs text-emerald-600 font-bold uppercase">Registros</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.total}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 min-w-[110px]">
                  <p className="text-xs text-emerald-600 font-bold uppercase">Motoristas Únicos</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.uniqueDrivers}</p>
                </div>
                {stats.unknownDrivers > 0 && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 min-w-[130px]">
                    <p className="text-xs text-amber-600 font-bold uppercase">Não Cadastrados</p>
                    <p className="text-2xl font-bold text-amber-700">{stats.unknownDrivers}</p>
                  </div>
                )}
              </div>
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

      {/* Unknown drivers warning */}
      {stats && stats.unknownDrivers > 0 && uploadStatus === 'success' && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
          <p>
            <strong>{stats.unknownDrivers} matrícula(s)</strong> não encontrada(s) na base de motoristas. Os registros foram importados, mas esses motoristas não terão dados de nome/filial disponíveis.
          </p>
        </div>
      )}

      {/* Active base summary */}
      {ociosidades.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-700">
              Base ativa: <span className="text-slate-900">{ociosidades.length}</span> registros
              &nbsp;·&nbsp;
              <span className="text-slate-900">{new Set(ociosidades.map(r => r.matricula)).size}</span> motoristas únicos
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Período: {ociosidades[0]?.data} — {ociosidades[ociosidades.length - 1]?.data}
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
