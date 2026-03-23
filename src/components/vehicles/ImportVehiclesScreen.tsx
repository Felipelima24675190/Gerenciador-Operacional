import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Veiculo, UserRole } from '../../types';

interface ImportVehiclesScreenProps {
  setVeiculos: React.Dispatch<React.SetStateAction<Veiculo[]>>;
  userRole?: UserRole;
}

export default function ImportVehiclesScreen({ setVeiculos, userRole }: ImportVehiclesScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ count: number; empresas: number } | null>(null);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar a base de veículos.</p>
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
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').slice(1); // Pular cabeçalho
        const novosVeiculos: Veiculo[] = [];

        for (const line of lines) {
          const parts = line.split(/[,;]/).map(p => p.trim());
          if (parts.length < 15) continue;

          const veiculo: Veiculo = {
            id: crypto.randomUUID(),
            prefixo: parts[0],
            placa: parts[1],
            empresa: parts[2],
            status: parts[3],
            uf: parts[4],
            anoFabricacao: parseInt(parts[5], 10),
            anoModelo: parseInt(parts[6], 10),
            marca: parts[7],
            modelo: parts[8],
            tipo: parts[9],
            eixos: parseInt(parts[10], 10),
            poltronas: parseInt(parts[11], 10),
            potencia: parseInt(parts[12], 10),
            chassi: parts[13],
            renavam: parts[14],
          };
          novosVeiculos.push(veiculo);
        }

        if (novosVeiculos.length > 0) {
          setVeiculos(novosVeiculos);
          setUploadStatus('success');
          setStats({
            count: novosVeiculos.length,
            empresas: new Set(novosVeiculos.map(v => v.empresa)).size,
          });
          setTimeout(() => setUploadStatus('idle'), 8000);
        } else {
          setUploadStatus('error');
          setTimeout(() => setUploadStatus('idle'), 5000);
        }
      };
      reader.readAsText(file);
    } else {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <h3 className="text-xl font-bold text-slate-800">Importar Base de Veículos</h3>
        <p className="text-sm text-gray-500 mt-2">
          Arraste e solte o arquivo CSV ou TXT contendo os dados da frota.
        </p>

        <div 
          className={`mt-6 border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {uploadStatus === 'idle' && (
            <>
              <div className="p-4 bg-white shadow-sm border border-gray-200 rounded-full mb-4 text-slate-700">
                <UploadCloud size={32} />
              </div>
              <p className="font-semibold text-slate-700">Arraste o arquivo aqui</p>
              <p className="text-xs text-gray-400 mt-1">Colunas: CARRO, PLACA, EMPRESA, STATUS, ...</p>
            </>
          )}
          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4 mx-auto w-16">
                <CheckCircle size={32} />
              </div>
              <p className="font-bold text-emerald-700 text-lg">Base de veículos importada!</p>
              <p className="text-sm text-emerald-500 mt-1">
                {stats.count} veículos de {stats.empresas} empresas foram carregados.
              </p>
            </div>
          )}
          {uploadStatus === 'error' && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="p-4 bg-red-100 text-red-600 rounded-full mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="font-semibold text-red-600">Erro na Importação</p>
              <p className="text-sm text-red-500 mt-1">Verifique o formato do arquivo e das colunas.</p>
            </div>
          )}
        </div>
      </div>
       <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl flex items-start gap-4">
        <FileText className="text-blue-600 h-8 w-8 mt-1" />
        <div>
          <h4 className="font-bold text-blue-800">Instruções de Formato</h4>
          <p className="text-sm text-blue-700 mt-1">
            Certifique-se de que o arquivo seja um <strong>.csv</strong> ou <strong>.txt</strong> com colunas separadas por vírgula (,) ou ponto e vírgula (;).
          </p>
          <p className="text-xs text-blue-600 mt-2">
            A primeira linha do arquivo (cabeçalho) será ignorada. As colunas devem seguir a ordem: <br/>
            <strong>CARRO, PLACA, EMPRESA, STATUS, UF, ANO FAB., ANO MOD., MARCA, MODELO, TIPO, EIXO, QTD. POLT, POT. MOTOR, CHASSI, RENAVAM</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
