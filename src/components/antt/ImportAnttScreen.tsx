import { useState, Dispatch, SetStateAction } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { MultaANTT, UserRole, AnttCodeDescription } from '../../types';

interface ImportAnttScreenProps {
  multas: MultaANTT[];
  setMultas: Dispatch<SetStateAction<MultaANTT[]>>;
  userRole?: UserRole;
  anttCodeDescriptions: AnttCodeDescription[];
  setAnttCodeDescriptions: Dispatch<SetStateAction<AnttCodeDescription[]>>;
}

export default function ImportAnttScreen({ multas, setMultas, userRole, anttCodeDescriptions, setAnttCodeDescriptions }: ImportAnttScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ total: number, valor: number } | null>(null);

  // NEW: State for importing code descriptions
  const [isCodeDragging, setIsCodeDragging] = useState(false);
  const [codeUploadStatus, setCodeUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [codeStats, setCodeStats] = useState<{ total: number } | null>(null);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar a base de Multas da ANTT.</p>
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const lines = text.split('\n');
          const novasMultas: MultaANTT[] = [];

          // Detect separator from header line
          const headerLine = lines.find(l => l.trim()) || '';
          const sep = headerLine.includes('\t') ? '\t' : ';';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(sep);
            
            // Ignorar cabeçalho, verificando a primeira coluna
            if (parts[0].trim().toLowerCase() === 'placa') continue;

            // Verificar se temos o número mínimo de colunas esperadas
            if (parts.length >= 12) { // 12 colunas: PLACA, ORDEM, EMPRESA, LINHA, MATRÍCULA, DATA, LOCAL, HORA, CÓDIGO, DESCRIÇÃO, AUTO, SETOR
              const placa = parts[0].trim();
              const empresa = parts[2].trim();
              const matriculaMotorista = parts[4].trim();
              const data = parts[5].trim();
              const local = parts[6].trim();
              const hora = parts[7].trim();
              const codigoInfracao = parts[8].trim();
              const descricaoInfracao = parts[9].trim();
              const autoInfracao = parts[10].trim();
              
              // Padronizar o Setor para UPPERCASE
              let setor = parts[11].trim().toUpperCase();
              // Corrigir possíveis variações para as categorias padrão
              if (setor.includes('OPERA')) setor = 'OPERAÇÃO';
              else if (setor.includes('MANUT')) setor = 'MANUTENÇÃO';
              else if (setor.includes('COMER')) setor = 'COMERCIAL';
              else if (setor.includes('ATRASO')) setor = 'ATRASO';
              else if (setor === 'RH') setor = 'RH';

              const dataHora = `${data} ${hora}`; // Formato "DD/MM/YYYY HH:MM"

              // Use valor from code descriptions if available
              const codeDesc = anttCodeDescriptions.find(cd => cd.codigo === codigoInfracao);
              const valorMulta = codeDesc?.valor || 0;

              novasMultas.push({
                id: crypto.randomUUID(),
                placaVeiculo: placa,
                empresa: empresa,
                matriculaMotorista: matriculaMotorista,
                dataHora: dataHora,
                terminal: local, // Mapeando LOCAL para terminal
                codigoInfracao: codigoInfracao,
                descricaoInfracao: descricaoInfracao,
                autoInfracao: autoInfracao,
                setor: setor,
                valor: valorMulta,
                status: 'Aguardando'
              });
            }
          }
          
          if (novasMultas.length > 0) {
            setMultas(novasMultas);
            setStats({
              total: novasMultas.length,
              valor: novasMultas.reduce((acc, m) => acc + m.valor, 0)
            });
            setUploadStatus('success');
          } else {
            setUploadStatus('error');
          }
          setTimeout(() => setUploadStatus('idle'), 10000);
        };
        reader.readAsText(file);
      } else {
        setUploadStatus('error');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    }
  };

  const handleDropCodeFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCodeDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const lines = text.split('\n');
          const newCodeDescriptions: AnttCodeDescription[] = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(/[,;]/).map(p => p.trim());

            // Assuming header "COD,DESCRIÇÃO" or similar - skip it
            if (parts[0].toLowerCase() === 'cod' || parts[0].toLowerCase().includes('código')) continue;

            // Expected: COD, DESCRIÇÃO, VALOR (valor is optional)
            if (parts.length >= 2) {
              const valorStr = parts.length >= 3 ? parts[2].replace(/[^\d.,]/g, '').replace(',', '.') : '0';
              newCodeDescriptions.push({
                codigo: parts[0],
                descricao: parts[1],
                valor: parseFloat(valorStr) || 0,
              });
            }
          }

          if (newCodeDescriptions.length > 0) {
            setAnttCodeDescriptions(newCodeDescriptions); // Update the state
            setCodeStats({
              total: newCodeDescriptions.length,
            });
            setCodeUploadStatus('success');
          } else {
            setCodeUploadStatus('error');
          }
          setTimeout(() => setCodeUploadStatus('idle'), 10000);
        };
        reader.readAsText(file);
      } else {
        setCodeUploadStatus('error');
        setTimeout(() => setCodeUploadStatus('idle'), 3000);
      }
    }
  };

  const handleLimparTodos = () => {
    if (confirm('Tem certeza que deseja apagar todas as multas importadas?')) {
      setMultas([]);
      setStats(null);
    }
  };

  const handleLimparCodigos = () => {
    if (confirm('Tem certeza que deseja apagar todos os códigos de multa importados?')) {
      setAnttCodeDescriptions([]);
      setCodeStats(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-800">Importar Multas ANTT</h3>
          <p className="text-sm text-gray-500 mt-2">
            Selecione o arquivo CSV/TXT com os autos de infração. Colunas esperadas (separadas por TAB): PLACA, ORDEM, EMPRESA, LINHA, MATRÍCULA DO MOTORISTA, DATA, LOCAL, HORA, CÓDIGO INFRAÇÃO, DESCRIÇÃO DO FISCAL, Nº DO AUTO DE INFRAÇÃO, SETOR RESPONSÁVEL.
          </p>
        </div>

        <div 
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-brand-blue bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {uploadStatus === 'idle' && (
            <>
              <div className="p-4 bg-white shadow-sm border border-gray-200 rounded-full mb-4 text-slate-700">
                <UploadCloud size={32} />
              </div>
              <p className="font-semibold text-slate-700">Clique ou arraste o arquivo aqui</p>
            </>
          )}

          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4 mx-auto w-16">
                <CheckCircle size={32} />
              </div>
              <p className="font-bold text-emerald-700 text-lg">Importação concluída!</p>
              <div className="mt-4 grid grid-cols-2 gap-4 text-left max-w-md mx-auto">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total Autos</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.total}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Valor Processado</p>
                  <p className="text-xl font-bold text-emerald-700">
                    {stats.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <>
              <div className="p-4 bg-red-100 text-red-600 rounded-full mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="font-semibold text-red-600">Erro na leitura do arquivo</p>
              <p className="text-sm text-red-500 mt-1">Verifique o formato das colunas do CSV.</p>
            </>
          )}
        </div>
      </div>

      {multas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-slate-800">Base Ativa ({multas.length} registros)</h4>
            <button 
              onClick={handleLimparTodos}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-500 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              Limpar Multas
            </button>
          </div>
        </div>
      )}

      {/* NEW: Importar Código de Multas ANTT */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-800">Importar Códigos de Multas ANTT</h3>
          <p className="text-sm text-gray-500 mt-2">
            Selecione o arquivo CSV/TXT com os códigos de infração e suas descrições. Colunas: COD, DESCRIÇÃO, VALOR.
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isCodeDragging ? 'border-brand-blue bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDropCodeFile}
        >
          {codeUploadStatus === 'idle' && (
            <>
              <div className="p-4 bg-white shadow-sm border border-gray-200 rounded-full mb-4 text-slate-700">
                <UploadCloud size={32} />
              </div>
              <p className="font-semibold text-slate-700">Clique ou arraste o arquivo aqui</p>
            </>
          )}

          {codeUploadStatus === 'success' && codeStats && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4 mx-auto w-16">
                <CheckCircle size={32} />
              </div>
              <p className="font-bold text-emerald-700 text-lg">Importação de códigos concluída!</p>
              <div className="mt-4 text-left max-w-md mx-auto">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total Códigos</p>
                  <p className="text-2xl font-bold text-emerald-700">{codeStats.total}</p>
                </div>
              </div>
            </div>
          )}

          {codeUploadStatus === 'error' && (
            <>
              <div className="p-4 bg-red-100 text-red-600 rounded-full mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="font-semibold text-red-600">Erro na leitura do arquivo de códigos</p>
              <p className="text-sm text-red-500 mt-1">Verifique o formato das colunas do CSV (COD, DESCRIÇÃO, VALOR).</p>
            </>
          )}
        </div>
      </div>

      {anttCodeDescriptions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-slate-800">Códigos de Multas Ativos ({anttCodeDescriptions.length} registros)</h4>
            <button
              onClick={handleLimparCodigos}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-500 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              Limpar Códigos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
