import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { ExcessoVelocidade, UserRole } from '../../types';

interface ImportSpeedScreenProps {
  setExcessos: React.Dispatch<React.SetStateAction<ExcessoVelocidade[]>>;
  userRole?: UserRole;
}

export default function ImportSpeedScreen({ setExcessos, userRole }: ImportSpeedScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ count: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar dados de excesso de velocidade.</p>
      </div>
    );
  }

  const processFile = (file: File) => {
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          if (!text) {
            setErrorMessage("O arquivo está vazio ou não pôde ser lido.");
            setUploadStatus('error');
            return;
          }

          const lines = text.split('\n');
          const novosExcessos: ExcessoVelocidade[] = [];

          for (const line of lines) {
            if (!line.trim()) continue;

            const parts = line.split(/\t/).map(p => p.trim());

            if (parts[0].toLowerCase().includes('matr')) continue;

            if (parts.length < 8) continue;

            const excesso: ExcessoVelocidade = {
              id: crypto.randomUUID(),
              matricula: parts[0],
              tempoExcedidoMinutos: parseInt(parts[1], 10) || 0,
              velocidadeMediaKmh: parseInt(parts[2], 10) || 0,
              endereco: parts[3],
              dataOcorrencia: parts[4],
              inicioFimOcorrencia: parts[5],
              nomeLinha: parts[6],
              veiculo: parts[7],
            };
            novosExcessos.push(excesso);
          }

          if (novosExcessos.length > 0) {
            setExcessos(novosExcessos);
            setUploadStatus('success');
            setStats({ count: novosExcessos.length });
          } else {
            setErrorMessage("Nenhuma linha válida encontrada. Verifique o separador de colunas (deve ser tabulação) e o conteúdo do arquivo.");
            setUploadStatus('error');
          }
        } catch (err) {
          setErrorMessage("Ocorreu um erro inesperado ao processar o arquivo.");
          setUploadStatus('error');
        } finally {
          setTimeout(() => setUploadStatus('idle'), 8000);
        }
      };
      reader.onerror = () => {
        setErrorMessage("Não foi possível ler o arquivo.");
        setUploadStatus('error');
        setTimeout(() => setUploadStatus('idle'), 8000);
      };
      reader.readAsText(file);
    } else {
      setErrorMessage("Por favor, selecione um arquivo .csv ou .txt.");
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 8000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMessage('');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleClick     = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setErrorMessage(''); processFile(file); }
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-8 text-center">
        <h3 className="text-xl font-bold text-slate-800">Importar Excesso de Velocidade</h3>

        <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />

        <div
          className={`mt-6 border-2 border-dashed rounded-card p-8 text-center flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-brand-400' : 'border-gray-300 hover:border-brand-400'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          aria-label="Área de upload de arquivo"
        >
          {uploadStatus === 'idle' && (
            <>
              <UploadCloud size={32} />
              <p className="font-semibold mt-4">Clique ou arraste o arquivo aqui</p>
            </>
          )}
          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in">
              <CheckCircle size={32} className="text-emerald-500 mx-auto" />
              <p className="font-bold text-emerald-700 mt-4">Base de excessos importada!</p>
              <p className="text-sm text-emerald-500">{stats.count} registros carregados.</p>
            </div>
          )}
          {uploadStatus === 'error' && (
             <div className="animate-in fade-in zoom-in">
              <AlertTriangle size={32} className="text-red-500 mx-auto" />
              <p className="font-semibold text-red-600 mt-4">Erro na Importação</p>
              {errorMessage && <p className="text-sm text-red-500 mt-2">{errorMessage}</p>}
            </div>
          )}
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-card flex items-start gap-4">
        <FileText className="text-blue-600 h-8 w-8 mt-1" />
        <div>
          <h4 className="font-bold text-blue-800">Instruções de Formato</h4>
          <p className="text-sm text-blue-700 mt-1">
            Certifique-se de que o arquivo seja um <strong>.csv</strong> ou <strong>.txt</strong> com colunas separadas por tabulação (copiado do Excel).
          </p>
          <p className="text-xs text-blue-600 mt-2">
            A primeira linha do arquivo (cabeçalho) será ignorada. As colunas devem seguir a ordem: <br/>
            <strong>Matrícula, Tempo Excedido em Minutos, Velocidade Média em Km/h, Endereço, Data da Ocorrência, Início e Fim da Ocorrência, Nome da Linha, Veículo</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
