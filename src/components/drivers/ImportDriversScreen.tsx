import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import { Motorista } from '../../types';

interface ImportDriversScreenProps {
  motoristas: Motorista[];
  setMotoristas: React.Dispatch<React.SetStateAction<Motorista[]>>;
  userRole: string;
  onNavigate: React.Dispatch<React.SetStateAction<string>>;
}

export default function ImportDriversScreen({ setMotoristas }: ImportDriversScreenProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseTxt = (text: string): Motorista[] => {
    // Remove BOM and normalize line endings
    const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleaned.trim().split('\n');
    const motoristas: Motorista[] = [];

    // Detect separator from first non-header data line or header itself
    const sampleLine = lines[0] || '';
    const sep = sampleLine.includes('\t') ? '\t' : sampleLine.includes(';') ? ';' : '\t';

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(sep).map(c => c.trim());
      if (cols.length >= 5) {
        const [matricula, nome, filial, area, status] = cols;
        if (matricula && nome) {
          motoristas.push({
            matricula,
            nome,
            filial: filial || '',
            area: area || '',
            status: (status as Motorista['status']) || 'ATIVO - EM OPERAÇÃO',
          });
        }
      }
    }
    return motoristas;
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseTxt(text);
        if (parsed.length === 0) {
          setStatus('error');
          setErrorMsg('Nenhum motorista encontrado. Verifique se o arquivo usa TAB ou ";" como separador e tem as colunas: MATRÍCULA, NOME, FILIAL, ÁREA, STATUS.');
          setTimeout(() => setStatus('idle'), 8000);
          return;
        }
        setMotoristas(parsed);
        setStats({ total: parsed.length });
        setStatus('success');
        setTimeout(() => setStatus('idle'), 8000);
      } catch (err) {
        setStatus('error');
        setErrorMsg('Erro ao processar o arquivo. Verifique o formato.');
        setTimeout(() => setStatus('idle'), 5000);
        console.error(err);
      }
    };
    reader.readAsText(file, 'latin1');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    event.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Importar Base de Motoristas</h2>
        <p className="text-sm text-gray-500 mb-1">
          Arquivo <strong>.txt</strong> ou <strong>.csv</strong> com colunas:{' '}
          <span className="font-semibold text-slate-600">MATRÍCULA · NOME · FILIAL · ÁREA · STATUS</span>
        </p>
        <p className="text-xs text-slate-400 mb-6">Suporta separadores TAB ou ponto-e-vírgula. A importação substitui a base atual.</p>

        <div
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${status === 'idle' ? 'border-gray-300 bg-gray-50 hover:bg-gray-100' : ''}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.csv"
            onChange={handleFileChange}
          />

          {status === 'idle' && (
            <>
              <UploadCloud size={40} className="text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-600">Clique para selecionar ou arraste o arquivo</p>
              <p className="text-xs text-slate-400 mt-1">.txt ou .csv</p>
            </>
          )}
          {status === 'success' && stats && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle size={40} className="text-emerald-500" />
              <p className="text-base font-bold text-emerald-600">Importado com sucesso!</p>
              <p className="text-sm text-slate-500">{stats.total} motoristas carregados</p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-2">
              <AlertTriangle size={40} className="text-red-500" />
              <p className="text-base font-bold text-red-600">Erro na importação</p>
              <p className="text-sm text-slate-500 max-w-sm text-center">{errorMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
