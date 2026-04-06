import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Avaria, UserRole, Motorista } from '../../types';

interface ImportAvariasScreenProps {
  setAvarias: React.Dispatch<React.SetStateAction<Avaria[]>>;
  motoristas: Motorista[];
  userRole?: UserRole;
}

const parseBRL = (s: string) => parseFloat(s.trim().replace(/\./g, '').replace(',', '.')) || 0;

export default function ImportAvariasScreen({ setAvarias, motoristas, userRole }: ImportAvariasScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ count: number, totalAvaria: number, notFoundDrivers: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processFile = (file: File) => {
    setErrorMessage('');
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

          let totalValue = 0;
          let missingDrivers = 0;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(';').map(p => p.trim());

            // Skip header row
            if (parts[0].toLowerCase().includes('ve') && parts[0].toLowerCase().includes('culo')) continue;

            if (parts.length >= 14) {
              const veiculo = parts[0];
              const data = parts[1];
              const motoristaIdentificado = parts[2]; // SIM/NÃO
              const matriculaRaw = parts[3];
              const motoristaCulpado = parts[4];
              const lancadoNoGlobus = parts[5];
              const mesLancamento = parts[6];
              const gerente = parts[7];
              const descricaoAvaria = parts[8];
              const tipoAvaria = parts[9];
              const causaAvaria = parts[10];
              const acaoTomada = parts[11];
              const horario = parts[12];
              const valorAvaria = parseBRL(parts[13] || '0');
              const valorCobrado = parseBRL(parts[14] || '0');

              const matricula = motoristaIdentificado === 'SIM' ? matriculaRaw : 'Não Identificado';

              if (matricula !== 'Não Identificado') {
                const found = motoristas.find(m => m.matricula === matricula);
                if (!found) missingDrivers++;
              }

              const avariaObj: Avaria = {
                id: crypto.randomUUID(),
                veiculo,
                data,
                motoristaIdentificado,
                matriculaMotorista: matricula,
                motoristaCulpado,
                lancadoNoGlobus,
                mesLancamento,
                gerente,
                descricaoAvaria,
                tipoAvaria,
                causaAvaria,
                acaoTomada,
                horario,
                valorAvaria,
                valorCobrado,
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
            setErrorMessage("Formato inválido. Use as 15 colunas padrões de Avarias separadas por ponto e vírgula.");
            setUploadStatus('error');
          }
        } catch (err) {
          setErrorMessage("Erro inesperado processando CSV.");
          setUploadStatus('error');
        } finally {
          setTimeout(() => setUploadStatus('idle'), 10000);
        }
      };
      reader.onerror = () => { setUploadStatus('error'); setTimeout(() => setUploadStatus('idle'), 8000); };
      reader.readAsText(file);
    } else {
      setErrorMessage("Somente .txt ou .csv separados por ponto e vírgula.");
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 8000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-8 text-center">
        <h3 className="text-xl font-bold text-slate-800">Importar Relatório de Avarias</h3>
        <p className="text-sm text-gray-500 mt-2">Arraste e solte o arquivo CSV ou clique para selecionar.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <div
          className={`mt-6 border-2 border-dashed rounded-card p-8 text-center flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-brand-400' : 'border-gray-300 hover:border-brand-400'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Área de upload de avarias"
        >
          {uploadStatus === 'idle' && (
            <><UploadCloud size={32} /><p className="font-semibold mt-4">Arraste o arquivo CSV/TXT aqui ou clique para selecionar</p></>
          )}
          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in text-center">
              <CheckCircle size={32} className="text-emerald-500 mx-auto" />
              <p className="font-bold text-emerald-700 mt-4">Avarias importadas! ({stats.count} registros)</p>
              <p className="text-sm font-mono text-emerald-600 mt-2">Valor Identificado: R$ {stats.totalAvaria.toFixed(2)}</p>
              {stats.notFoundDrivers > 0 && <p className="text-2xs mt-2 font-bold text-red-500">Atenção: {stats.notFoundDrivers} matrículas não constam na base de motoristas.</p>}
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
        <FileText className="text-blue-600 h-8 w-8 mt-1 shrink-0" />
        <div>
          <h4 className="font-bold text-blue-800">Formato Esperado — Separador: ponto e vírgula (;)</h4>
          <p className="text-xs text-blue-700 mt-2 font-semibold">15 colunas na ordem:</p>
          <p className="text-xs text-blue-600 mt-1">
            <strong>VEÍCULO; DATA; MOTORISTA IDENTIFICADO?; MATRÍCULA MOTORISTA; CULPADO?; LANÇADO NO GLOBUS?; MÊS DE LANÇAMENTO; GERENTE; DESCRIÇÃO DE AVARIA; TIPO DE AVARIA; CAUSA DE AVARIA; AÇÃO TOMADA; HORÁRIO; VALOR DA AVARIA; VALOR COBRADO</strong>
          </p>
          <p className="text-2xs text-blue-500 mt-2">Exemplo: <code>6045;31/12/2022;SIM;24723;SIM;SIM;JANEIRO;ROMULO;FRONTAL;;;; X;97,5;97,5</code></p>
        </div>
      </div>
    </div>
  );
}
