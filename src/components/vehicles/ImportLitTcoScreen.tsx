import { useState, useRef, Dispatch, SetStateAction } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Veiculo } from '../../types';

interface ImportLitTcoScreenProps {
  veiculos: Veiculo[];
  setVeiculos: Dispatch<SetStateAction<Veiculo[]>>;
}

export default function ImportLitTcoScreen({ veiculos, setVeiculos }: ImportLitTcoScreenProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ total: number; matched: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
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
        const updates = new Map<string, { lit?: string; tco?: string }>();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const parts = trimmed.split(';').map(p => p.trim());
          if (parts[0].toLowerCase() === 'prefixo' || parts[0].toLowerCase() === 'veiculo') continue;
          if (parts.length < 3) continue;

          const prefixo = parts[0].toUpperCase();
          const lit = parts[1] || undefined;
          const tco = parts[2] || undefined;
          updates.set(prefixo, { lit, tco });
        }

        if (updates.size === 0) {
          setUploadStatus('error');
          setTimeout(() => setUploadStatus('idle'), 8000);
          return;
        }

        let matched = 0;
        setVeiculos(prev => prev.map(v => {
          const upd = updates.get(v.prefixo.toUpperCase());
          if (upd) {
            matched++;
            return {
              ...v,
              litValidade: upd.lit || v.litValidade,
              tcoValidade: upd.tco || v.tcoValidade,
            };
          }
          return v;
        }));

        setStats({ total: updates.size, matched });
        setUploadStatus('success');
      } catch {
        setUploadStatus('error');
      }
      setTimeout(() => setUploadStatus('idle'), 8000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-8 text-center">
        <h3 className="text-xl font-bold text-slate-800">Importar Validade LIT / TCO</h3>
        <p className="text-sm text-gray-500 mt-2">
          Atualize as datas de validade do LIT e TCO dos veículos cadastrados.
        </p>

        <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />

        <div
          className={`mt-6 border-2 border-dashed rounded-card p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${isDragging ? 'border-brand-400' : 'border-gray-300 hover:border-brand-400'}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Área de upload LIT/TCO"
        >
          {uploadStatus === 'idle' && (
            <>
              <UploadCloud size={32} className="text-slate-400" />
              <p className="font-semibold mt-4 text-slate-700">Clique ou arraste o arquivo aqui</p>
            </>
          )}
          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in">
              <CheckCircle size={32} className="text-emerald-500 mx-auto" />
              <p className="font-bold text-emerald-700 mt-4">Importação concluída!</p>
              <p className="text-sm text-emerald-500">{stats.total} registros lidos, {stats.matched} veículos atualizados.</p>
            </div>
          )}
          {uploadStatus === 'error' && (
            <div className="animate-in fade-in zoom-in">
              <AlertTriangle size={32} className="text-red-500 mx-auto" />
              <p className="font-semibold text-red-600 mt-4">Erro na importação</p>
              <p className="text-sm text-red-500 mt-1">Verifique o formato do arquivo (PREFIXO;LIT;TCO)</p>
            </div>
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
            PREFIXO;LIT;TCO<br />
            12345;15/10/2026;20/12/2026<br />
            67890;01/03/2025;05/05/2025
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Os veículos serão encontrados pelo <strong>Prefixo</strong> na base já importada.
          </p>
        </div>
      </div>
    </div>
  );
}
