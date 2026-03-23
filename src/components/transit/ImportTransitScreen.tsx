import { useState, Dispatch, SetStateAction } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { MultaTransito, UserRole, Motorista } from '../../types';

interface ImportTransitScreenProps {
  multas: MultaTransito[];
  setMultas: Dispatch<SetStateAction<MultaTransito[]>>;
  motoristas: Motorista[];
  userRole?: UserRole;
}

export default function ImportTransitScreen({ multas, setMultas, motoristas, userRole }: ImportTransitScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ total: number; notFound: number } | null>(null);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar Multas de Trânsito.</p>
      </div>
    );
  }

  const motoristasMap = new Map(motoristas.map(m => [m.matricula, m]));

  const processFile = (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const novasMultas: MultaTransito[] = [];
      let notFound = 0;

      const headerLine = lines.find(l => l.trim()) || '';
      const sep = headerLine.includes('\t') ? '\t' : ';';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(sep);

        // Skip header
        if (parts[0].trim().toLowerCase() === 'placa') continue;

        // Expected columns: PLACA, ORDEM, EMPRESA, LINHA, MATRÍCULA, DATA, LOCAL, HORA, CÓDIGO, DESCRIÇÃO, AUTO, SETOR, VALOR
        if (parts.length >= 11) {
          const placa = parts[0].trim();
          const empresa = parts[2].trim();
          const matricula = parts[4].trim();
          const data = parts[5].trim();
          const local = parts[6].trim();
          const hora = parts[7].trim();
          const codigo = parts[8].trim();
          const descricao = parts[9].trim();
          const auto = parts[10].trim();
          const setor = parts.length >= 12 ? parts[11].trim().toUpperCase() : '';
          const valorRaw = parts.length >= 13 ? parts[12].trim().replace(',', '.') : '0';
          const valor = parseFloat(valorRaw) || 0;

          const dataHora = `${data} ${hora}`;

          const motoristaData = motoristasMap.get(matricula);
          if (!motoristaData) notFound++;

          novasMultas.push({
            id: crypto.randomUUID(),
            placaVeiculo: placa,
            empresa,
            matriculaMotorista: matricula,
            dataHora,
            local,
            codigoInfracao: codigo,
            descricaoInfracao: descricao,
            autoInfracao: auto,
            setor,
            valor,
            status: 'Aguardando',
          });
        }
      }

      if (novasMultas.length > 0) {
        setMultas(novasMultas);
        setStats({ total: novasMultas.length, notFound });
        setUploadStatus('success');
      } else {
        setUploadStatus('error');
      }
      setTimeout(() => setUploadStatus('idle'), 10000);
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
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleLimpar = () => {
    if (confirm('Tem certeza que deseja apagar todas as multas de trânsito importadas?')) {
      setMultas([]);
      setStats(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-800">Importar Multas de Trânsito</h3>
          <p className="text-sm text-gray-500 mt-2">
            Arquivo CSV/TXT com separador TAB ou ponto-e-vírgula. Colunas esperadas: PLACA, ORDEM, EMPRESA, LINHA, MATRÍCULA, DATA, LOCAL, HORA, CÓDIGO, DESCRIÇÃO, AUTO DE INFRAÇÃO, SETOR, VALOR (opcional).
          </p>
        </div>

        <label
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-brand-blue bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileInput} />

          {uploadStatus === 'idle' && (
            <>
              <div className="p-4 bg-white shadow-sm border border-gray-200 rounded-full mb-4 text-slate-700">
                <UploadCloud size={32} />
              </div>
              <p className="font-semibold text-slate-700">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-gray-400 mt-1">.CSV ou .TXT</p>
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
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total Multas</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.total}</p>
                </div>
                {stats.notFound > 0 && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Motoristas Não Encontrados</p>
                    <p className="text-2xl font-bold text-amber-700">{stats.notFound}</p>
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
              <p className="text-sm text-red-500 mt-1">Verifique o formato das colunas.</p>
            </>
          )}
        </label>
      </div>

      {multas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-slate-800">Base Ativa ({multas.length} registros)</h4>
            <button
              onClick={handleLimpar}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-500 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              Limpar Multas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
