import { useState, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { ValidadeAntt } from '../../types';

interface ImportValidadeAnttScreenProps {
  validades: ValidadeAntt[];
  setValidades: Dispatch<SetStateAction<ValidadeAntt[]>>;
}

function normalizeDate(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  // Already in DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed.replace(/-/g, '/');
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${d}/${m}/${y}`;
  }
  return trimmed;
}

export default function ImportValidadeAnttScreen({ validades, setValidades }: ImportValidadeAnttScreenProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 8000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) { setUploadStatus('error'); return; }

        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
        const result: ValidadeAntt[] = [];
        const seen = new Set<string>();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          // Determine separator
          const sep = trimmed.includes(';') ? ';' : trimmed.includes('\t') ? '\t' : ',';
          const parts = trimmed.split(sep).map(p => p.trim());
          const firstCol = (parts[0] || '').toUpperCase();
          // skip header
          if (firstCol.includes('MATR')) continue;
          if (parts.length < 3) continue;

          const rawMatricula = parts[0];
          if (!/^\d+$/.test(rawMatricula)) continue;
          const matricula = rawMatricula.slice(-5);
          if (seen.has(matricula)) continue;
          seen.add(matricula);

          const cpf = parts[1] || '';
          const dataAdmissao = normalizeDate(parts[2]);
          const validadeProgresso = normalizeDate(parts[3] || '');
          const validadeCruzeiro = normalizeDate(parts[4] || '');

          result.push({
            matricula,
            cpf,
            dataAdmissao,
            validadeProgresso: validadeProgresso || undefined,
            validadeCruzeiro: validadeCruzeiro || undefined,
          });
        }

        if (result.length === 0) {
          setUploadStatus('error');
          setTimeout(() => setUploadStatus('idle'), 8000);
          return;
        }

        // Merge with existing (replace by matricula)
        setValidades(prev => {
          const map = new Map(prev.map(v => [v.matricula, v]));
          result.forEach(v => map.set(v.matricula, v));
          return Array.from(map.values());
        });

        setStats({ total: result.length });
        setUploadStatus('success');
      } catch {
        setUploadStatus('error');
      }
      setTimeout(() => setUploadStatus('idle'), 8000);
    };
    reader.readAsText(file, 'utf-8');
  }, [setValidades]);

  const handleLimpar = () => {
    if (confirm('Tem certeza que deseja limpar todas as validades ANTT cadastradas?')) {
      setValidades([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-8 text-center">
        <h3 className="text-xl font-bold text-slate-800">Importar Validade ANTT</h3>
        <p className="text-sm text-gray-500 mt-2">
          Atualize o cadastro de Validade ANTT e Data de Admissão dos motoristas.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }}
        />

        <div
          className={`mt-6 border-2 border-dashed rounded-card p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${isDragging ? 'border-brand-400' : 'border-gray-300 hover:border-brand-400'}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Área de upload Validade ANTT"
        >
          {uploadStatus === 'idle' && (
            <>
              <UploadCloud size={32} className="text-slate-400" />
              <p className="font-semibold mt-4 text-slate-700">Clique ou arraste o arquivo CSV aqui</p>
              <p className="text-xs text-slate-400 mt-1">.csv ou .txt (separador ; ou TAB)</p>
            </>
          )}
          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in">
              <CheckCircle size={32} className="text-emerald-500 mx-auto" />
              <p className="font-bold text-emerald-700 mt-4">Importação concluída!</p>
              <p className="text-sm text-emerald-500">{stats.total} motoristas atualizados.</p>
            </div>
          )}
          {uploadStatus === 'error' && (
            <div className="animate-in fade-in zoom-in">
              <AlertTriangle size={32} className="text-red-500 mx-auto" />
              <p className="font-semibold text-red-600 mt-4">Erro na importação</p>
              <p className="text-sm text-red-500 mt-1">Verifique o formato esperado abaixo.</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">{validades.length} registro(s) cadastrado(s)</p>
          {validades.length > 0 && (
            <button onClick={handleLimpar} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">
              Limpar Todos os Registros
            </button>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-6 rounded-card flex items-start gap-4">
        <FileText className="text-blue-600 h-8 w-8 mt-1 shrink-0" />
        <div>
          <h4 className="font-bold text-blue-800">Formato Esperado</h4>
          <p className="text-sm text-blue-700 mt-1">
            CSV separado por <strong>;</strong> (ponto e vírgula) com as colunas:
          </p>
          <p className="text-xs text-blue-600 mt-2 font-mono bg-blue-100 p-2 rounded">
            MATRÍCULA;CPF;ADMISSÃO;VALIDADE ANTT PROGRESSO;VALIDADE ANTT CRUZEIRO<br />
            25555;563.752.804-78;20/06/2019;27/05/2024;27/05/2024
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Os motoristas são encontrados pela <strong>Matrícula</strong> (últimos 5 dígitos). Campos de validade em branco serão considerados como "Não Cadastrado".
          </p>
        </div>
      </div>
    </div>
  );
}
