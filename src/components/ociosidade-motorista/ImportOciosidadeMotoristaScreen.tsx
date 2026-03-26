import { useRef, useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { OciosidadeMotorista, UserRole } from '../../types';

interface Props {
  ociosidades: OciosidadeMotorista[];
  setOciosidades: React.Dispatch<React.SetStateAction<OciosidadeMotorista[]>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  motoristas?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viagens?: any[];
  userRole?: UserRole;
}

// Parse HH:MM:SS string to total minutes (integer)
function parseHMS(s: string): number {
  if (!s || !s.includes(':')) return 0;
  const parts = s.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const sec = parts[2] || 0;
  return h * 60 + m + Math.round(sec / 60);
}

// Parse Brazilian decimal number: "258,12" → 258.12
function parseBRFloat(s: string): number {
  if (!s) return 0;
  const cleaned = s.trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export default function ImportOciosidadeMotoristaScreen({ ociosidades, setOciosidades, userRole }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ total: number; veiculos: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar dados de Quilometragem.</p>
      </div>
    );
  }

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setUploadStatus('error');
      setErrorMsg('Formato não suportado. Use .csv ou .txt');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = cleaned.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        setUploadStatus('error');
        setErrorMsg('Arquivo vazio ou inválido.');
        setTimeout(() => setUploadStatus('idle'), 4000);
        return;
      }

      const novas: OciosidadeMotorista[] = [];
      // Skip header line (contains "Descri" in first column)
      const startIdx = lines[0].toLowerCase().includes('descri') || lines[0].toLowerCase().includes('unidade') ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(';');
        if (cols.length < 10) continue;

        const prefixo    = cols[0]?.trim() || '';
        const dataHora   = cols[1]?.trim() || '';
        const areaFinal  = cols[2]?.trim() || '';
        const areaInicial = cols[3]?.trim() || '';
        const combustivel = parseInt(cols[4]?.trim().replace(/[^\d]/g, '') || '0') || 0;
        const distancia  = parseBRFloat(cols[5]?.trim() || '0');
        const eficiencia = parseBRFloat(cols[6]?.trim() || '0');
        const paradoML   = parseHMS(cols[7]?.trim() || '00:00:00');
        const movimento  = parseHMS(cols[8]?.trim() || '00:00:00');
        const parado     = parseHMS(cols[9]?.trim() || '00:00:00');
        const total      = cols[10] ? parseHMS(cols[10].trim()) : 0;

        if (!prefixo || !dataHora) continue;

        // Extract date part: "25/03/2026 20:02" → "25/03/2026"
        const data = dataHora.split(' ')[0] || dataHora;

        novas.push({
          id: crypto.randomUUID(),
          prefixo,
          data,
          dataHora,
          areaFinal,
          areaInicial,
          combustivelMl: combustivel,
          distanciaKm: distancia,
          eficiencia,
          paradoMotorLigadoMin: paradoML,
          tempoMovimentoMin: movimento,
          tempoParadoMin: parado,
          tempoTotalMin: total,
        });
      }

      if (novas.length > 0) {
        setOciosidades(novas);
        const veiculos = new Set(novas.map(r => r.prefixo)).size;
        setStats({ total: novas.length, veiculos });
        setUploadStatus('success');
      } else {
        setUploadStatus('error');
        setErrorMsg('Nenhum registro válido encontrado. Verifique o formato do arquivo.');
      }
      setTimeout(() => setUploadStatus('idle'), 10000);
    };
    reader.readAsText(file, 'latin1');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleClear = () => {
    if (confirm('Limpar todos os registros de quilometragem?')) {
      setOciosidades([]);
      setStats(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Importar Quilometragem de Veículos</h3>
        <p className="text-sm text-gray-500">
          Arquivo CSV separado por <strong>;</strong> com colunas: <span className="font-semibold text-slate-600">Descrição da Unidade · Data · Área Final · Área Inicial · Combustível (ml) · Distância (km) · Eficiência · Parado c/ Motor Ligado · Tempo em Movimento · Tempo Total Parado · Total</span>
        </p>
        <p className="text-xs text-amber-600 mt-2 font-semibold">A importação substitui todos os registros existentes.</p>

        <div
          className={`mt-6 border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden"
            onChange={ev => { const f = ev.target.files?.[0]; if (f) processFile(f); ev.target.value = ''; }} />

          {uploadStatus === 'idle' && (
            <>
              <UploadCloud size={40} className="text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-600">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-slate-400 mt-1">CSV ou TXT separado por ;</p>
            </>
          )}
          {uploadStatus === 'success' && stats && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle size={40} className="text-emerald-500" />
              <p className="text-base font-bold text-emerald-600">Importado com sucesso!</p>
              <p className="text-sm text-slate-500">{stats.total} registros · {stats.veiculos} veículos</p>
            </div>
          )}
          {uploadStatus === 'error' && (
            <div className="flex flex-col items-center gap-2">
              <AlertTriangle size={40} className="text-red-500" />
              <p className="text-base font-bold text-red-600">Erro na importação</p>
              <p className="text-sm text-slate-500">{errorMsg}</p>
            </div>
          )}
        </div>
      </div>

      {ociosidades.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-700">Base Ativa</p>
            <p className="text-xs text-slate-400">{ociosidades.length} registros · {new Set(ociosidades.map(r => r.prefixo)).size} veículos</p>
          </div>
          <button onClick={handleClear} className="flex items-center gap-2 px-4 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
            <Trash2 size={14} /> Limpar Base
          </button>
        </div>
      )}
    </div>
  );
}
