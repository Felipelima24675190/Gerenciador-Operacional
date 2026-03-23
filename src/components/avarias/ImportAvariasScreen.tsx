import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Avaria, UserRole, Motorista } from '../../types';

interface ImportAvariasScreenProps {
  setAvarias: React.Dispatch<React.SetStateAction<Avaria[]>>;
  motoristas: Motorista[];
  userRole?: UserRole;
}

export default function ImportAvariasScreen({ setAvarias, motoristas, userRole }: ImportAvariasScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ count: number, totalAvaria: number, notFoundDrivers: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar base de Avarias.</p>
      </div>
    );
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMessage('');
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          if (!text) {
            setErrorMessage("Arquivo vazio.");
            setUploadStatus('error');
            return;
          }

          const lines = text.split('\n');
          const novasAvarias: Avaria[] = [];
          
          const motoristaMap = new Map(motoristas.map(m => [m.matricula, m.nome]));
          let totalValue = 0;
          let missingDrivers = 0;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(/\t/).map(p => p.trim());
            
            if (parts[0].toLowerCase().includes('ve') && parts[0].toLowerCase().includes('culo')) continue; // Skip header VEÍCULO

            if (parts.length >= 12) { // Esperado A a L
              const veiculo = parts[0];
              const data = parts[1];
              const isMotoristaIdentificado = parts[2]; // Col C
              const matriculaRaw = parts[3]; // Col D
              const isCulpado = parts[4]; // Col E
              const isGlobus = parts[5]; // Col F
              const mesLancamento = parts[6]; // Col G
              const gerente = parts[7]; // Col H
              const tipoAvaria = parts[8]; // Col I
              const horario = parts[9]; // Col J
              const valorAvariaStr = parts[10]?.replace('R$ ', '').replace('.', '').replace(',', '.') || '0'; // Col K
              const valorCobradoStr = parts[11]?.replace('R$ ', '').replace('.', '').replace(',', '.') || '0'; // Col L

              const matricula = isMotoristaIdentificado === 'SIM' ? matriculaRaw : 'Não Identificado';
              let nomeMotorista = 'Não Identificado';
              
              if (matricula !== 'Não Identificado') {
                if (motoristaMap.has(matricula)) {
                  nomeMotorista = motoristaMap.get(matricula)!;
                } else {
                  missingDrivers++;
                  nomeMotorista = `Motorista ${matricula}`; // Fallback se não encontrar nome
                }
              }

              const avariaObj: Avaria = {
                id: crypto.randomUUID(),
                veiculo,
                data,
                matriculaMotorista: matricula,
                nomeMotorista,
                motoristaCulpado: isCulpado,
                lancadoNoGlobus: isGlobus,
                mesLancamento,
                gerente,
                tipoAvaria,
                horario,
                valorAvaria: parseFloat(valorAvariaStr) || 0,
                valorCobrado: parseFloat(valorCobradoStr) || 0
              };

              totalValue += avariaObj.valorAvaria;
              novasAvarias.push(avariaObj);
            }
          }

          if (novasAvarias.length > 0) {
            setAvarias(novasAvarias);
            setUploadStatus('success');
            setStats({ count: novasAvarias.length, totalAvaria: totalValue, notFoundDrivers: missingDrivers });
          } else {
            setErrorMessage("Formato inválido. Use as 16 colunas padrões de Avarias via tabulação.");
            setUploadStatus('error');
          }
        } catch (err) {
          setErrorMessage("Erro inesperado processando CSV.");
          setUploadStatus('error');
        } finally {
          setTimeout(() => setUploadStatus('idle'), 10000);
        }
      };
      reader.onerror = () => { setUploadStatus('error'); setTimeout(() => setUploadStatus('idle'), 5000); };
      reader.readAsText(file);
    } else {
      setErrorMessage("Somente .txt ou .csv copiados do excel.");
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <h3 className="text-xl font-bold text-slate-800">Importar Relatório de Avarias</h3>
        <p className="text-sm text-gray-500 mt-2">Arraste e solte o conteúdo copiado da planilha gerencial de Avarias.</p>
        <div 
          className={`mt-6 border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {uploadStatus === 'idle' && (
            <><UploadCloud size={32} /><p className="font-semibold mt-4">Arraste o arquivo CSV/TXT aqui</p></>
          )}
          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in text-center">
              <CheckCircle size={32} className="text-emerald-500 mx-auto" />
              <p className="font-bold text-emerald-700 mt-4">Avarias importadas!</p>
              <p className="text-sm font-mono text-emerald-600 mt-2">Valor Identificado: R$ {stats.totalAvaria.toFixed(2)}</p>
              {stats.notFoundDrivers > 0 && <p className="text-[10px] mt-2 font-bold text-red-500">Atenção: {stats.notFoundDrivers} matrículas não constam na base de motoristas.</p>}
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
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl flex items-start gap-4">
        <FileText className="text-blue-600 h-8 w-8 mt-1" />
        <div>
          <h4 className="font-bold text-blue-800">Atenção às Colunas (Separador TAB)</h4>
          <p className="text-xs text-blue-600 mt-2">
            <strong>VEÍCULO, DATA, MOTORISTA IDENTIFICADO?, MATRÍCULA MOTORISTA, CULPADO?, LANÇADO NO GLOBUS?, MÊS DE LANÇAMENTO, GERENTE, TIPO DE AVARIA, HORÁRIO, VALOR DA AVARIA, VALOR COBRADO</strong>
          </p>
        </div>
      </div>
    </div>
  );
}