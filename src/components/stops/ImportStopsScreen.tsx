import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { ParadaIndevida, UserRole, Motorista, Viagem } from '../../types';
import { buildLinhaLookup } from '../../utils/linhaLookup';

interface ImportStopsScreenProps {
  setParadas: React.Dispatch<React.SetStateAction<ParadaIndevida[]>>;
  motoristas: Motorista[];
  viagens: Viagem[];
  userRole?: UserRole;
}

export default function ImportStopsScreen({ setParadas, motoristas, viagens, userRole }: ImportStopsScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ count: number; found: number; notFound: number } | null>(null);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar a base de paradas indevidas.</p>
      </div>
    );
  }

  // Mapas para lookup rápido
  const motoristasMap = new Map(motoristas.map(m => [m.matricula, m]));
  const resolveLinha = buildLinhaLookup(viagens);

  const processFile = (text: string) => {
    const lines = text.split('\n').slice(1); // Pular cabeçalho
    const novasParadas: ParadaIndevida[] = [];
    let found = 0;
    let notFound = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(/[,;]|\t/).map(p => p.trim());
      if (parts.length < 5) continue;

      // Formato esperado (baseado na imagem):
      // [0] Data, [1] Linha (código), [2] Sentido, [3] Horário Linha, [4] Matrícula,
      // [5] Motorista (opcional, será sobrescrito pelo lookup), [6] Área, [7] Veículo,
      // [8] Local, [9] Início, [10] Fim, [11] Tempo Parado
      const matricula = (parts[4] || '').trim();
      const codigoLinha = (parts[1] || '').trim();

      // Lookup motorista na base
      const motoristaBase = motoristasMap.get(matricula);
      const nomeMotorista = motoristaBase ? motoristaBase.nome : (parts[5] || 'Desconhecido');
      const area = motoristaBase ? motoristaBase.area : (parts[6] || '');

      // Lookup linha na base (flexible: by numero, servico, partial name)
      const nomeLinha = resolveLinha(codigoLinha) || codigoLinha;

      if (motoristaBase) found++;
      else if (matricula) notFound++;

      const parada: ParadaIndevida = {
        id: crypto.randomUUID(),
        data: parts[0] || '',
        linha: nomeLinha,
        sentido: parts[2] || '',
        horarioLinha: parts[3] || '',
        matricula,
        motorista: nomeMotorista,
        area,
        veiculo: parts[7] || '',
        local: parts[8] || '',
        inicio: parts[9] || '',
        fim: parts[10] || '',
        tempoParado: parts[11] || '',
      };
      novasParadas.push(parada);
    }

    if (novasParadas.length > 0) {
      setParadas(novasParadas);
      setUploadStatus('success');
      setStats({ count: novasParadas.length, found, notFound });
      setTimeout(() => setUploadStatus('idle'), 10000);
    } else {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 5000);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      const reader = new FileReader();
      reader.onload = (event) => processFile(event.target?.result as string);
      reader.readAsText(file, 'UTF-8');
    } else {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 5000);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => processFile(event.target?.result as string);
      reader.readAsText(file, 'UTF-8');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Legenda do formato */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-800 mb-2">Formato esperado do arquivo (CSV/TXT com separador vírgula, ponto-e-vírgula ou tab):</p>
            <div className="overflow-x-auto">
              <table className="text-[10px] text-blue-700 font-mono">
                <thead><tr className="font-black uppercase text-blue-900">
                  {['Data','Linha (Cód)','Sentido','Horário Linha','Matrícula','Motorista','Área','Veículo','Local','Início','Fim','Tempo Parado'].map((h,i) => (
                    <th key={i} className="px-2 py-1 bg-blue-100 border border-blue-200">{`[${i}] ${h}`}</th>
                  ))}
                </tr></thead>
                <tbody><tr>
                  {['01/03/2026','1234','Ida','06:00','12345','JOÃO SILVA','MACEIÓ','9001','Rua X, Feitosa...','06:10','06:25','15min'].map((v,i) => (
                    <td key={i} className="px-2 py-1 border border-blue-100 text-center">{v}</td>
                  ))}
                </tr></tbody>
              </table>
            </div>
            <p className="text-[10px] text-blue-600 mt-2">O nome do motorista e a área serão buscados automaticamente na base de motoristas pela matrícula. O nome da linha será buscado pela base de linhas pelo código.</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <h3 className="text-xl font-bold text-slate-800">Importar Paradas Indevidas</h3>
        <p className="text-sm text-gray-500 mt-2">Arraste o arquivo ou clique para selecionar.</p>

        <label
          className={`mt-6 border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
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
              <p className="font-semibold text-slate-700">Arraste o arquivo aqui ou clique para selecionar</p>
              <p className="text-xs text-gray-400 mt-1">Formatos aceitos: .csv, .txt</p>
            </>
          )}
          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4 mx-auto w-16 flex items-center justify-center">
                <CheckCircle size={32} />
              </div>
              <p className="font-bold text-emerald-700 text-lg">Base de paradas importada!</p>
              <p className="text-sm text-emerald-500 mt-1">{stats.count} registros carregados.</p>
              <div className="mt-3 flex gap-4 justify-center text-xs font-bold">
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">{stats.found} motoristas identificados</span>
                {stats.notFound > 0 && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full">{stats.notFound} matrícula(s) não encontrada(s)</span>}
              </div>
            </div>
          )}
          {uploadStatus === 'error' && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="p-4 bg-red-100 text-red-600 rounded-full mb-4 mx-auto w-16 flex items-center justify-center">
                <AlertTriangle size={32} />
              </div>
              <p className="font-semibold text-red-600">Erro na Importação</p>
              <p className="text-sm text-red-500 mt-1">Verifique o formato do arquivo e das colunas.</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
}
