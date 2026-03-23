import { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Trash2, Info } from 'lucide-react';
import { Ocorrencia, Motorista, Viagem, UserRole } from '../../types';
import { processarOcorrenciaIndividual } from '../../utils/pontualidade';

interface ImportOccurrencesScreenProps {
  ocorrencias: Ocorrencia[];
  setOcorrencias: React.Dispatch<React.SetStateAction<Ocorrencia[]>>;
  motoristas: Motorista[];
  viagens: Viagem[];
  userRole?: UserRole;
}

export default function ImportOccurrencesScreen({ ocorrencias, setOcorrencias, motoristas, viagens, userRole }: ImportOccurrencesScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [unmatchedLines, setUnmatchedLines] = useState<Record<string, number>>({});
  
  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar novas ocorrências no sistema.</p>
      </div>
    );
  }

  const [stats, setStats] = useState<{ 
    lines: number, 
    trips: number, 
    missingStart: number, 
    missingEnd: number,
    unknownDrivers: number,
    unknownLines: number
  } | null>(null);

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
    setUnmatchedLines({}); // Reset before new import
    
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const lines = text.split('\n');
          const novasOcorrencias: Ocorrencia[] = [];
          const localUnmatched: Record<string, number> = {};
          
          let missingStart = 0;
          let missingEnd = 0;
          let unknownDrivers = 0;

          const viagensMap = new Map(viagens.map(v => [v.numeroLinha, v.nomeLinha]));

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(/[,;]/).map(p => p.trim());
            
            // Skip header
            if (parts[0].toLowerCase().includes('número') || parts[0].toLowerCase().includes('numero')) continue;

            if (parts.length >= 11) { // Ajustado para 11 colunas
              const matricula = parts[6];
              const numLinha = parts[0];

              // Validar contra a base
              const motoristaExiste = motoristas.some(m => m.matricula === matricula);
              const nomeLinhaDaBase = viagensMap.get(numLinha);

              if (!motoristaExiste) unknownDrivers++;
              
              if (nomeLinhaDaBase) {
                  const rawOcorrencia: Partial<Ocorrencia> = {
                    id: crypto.randomUUID(),
                    numeroLinha: numLinha,
                    atendimento: parts[1],
                    nomeLinha: nomeLinhaDaBase, // Usar o nome da base
                    sentido: parts[2],
                    pontoInicio: parts[3],
                    pontoFim: parts[4],
                    veiculo: parts[5],
                    matriculaMotorista: matricula,
                    prevInicio: parts[7],
                    prevFim: parts[8],
                    realInicio: parts[9],
                    realFim: parts[10]
                  };

                  if (!rawOcorrencia.realInicio) missingStart++;
                  if (!rawOcorrencia.realFim) missingEnd++;

                  // Process logic (fallback, diffs, status)
                  const processed = processarOcorrenciaIndividual(rawOcorrencia);
                  novasOcorrencias.push(processed);
              } else {
                // Linha não encontrada, registrar para aviso
                if (localUnmatched[numLinha]) {
                  localUnmatched[numLinha]++;
                } else {
                  localUnmatched[numLinha] = 1;
                }
              }
            }
          }
          
          setUnmatchedLines(localUnmatched);
          const unknownLinesCount = Object.keys(localUnmatched).length;

          if (novasOcorrencias.length > 0 || unknownLinesCount > 0) {
            setOcorrencias(prevOcorrencias => [...prevOcorrencias, ...novasOcorrencias]);
            setStats({
              lines: new Set(novasOcorrencias.map(o => o.numeroLinha)).size,
              trips: novasOcorrencias.length,
              missingStart,
              missingEnd,
              unknownDrivers,
              unknownLines: unknownLinesCount
            });
            setUploadStatus('success');
          } else {
            setUploadStatus('error');
          }
          setTimeout(() => setUploadStatus('idle'), 15000);
        };
        reader.readAsText(file);
      } else {
        setUploadStatus('error');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    }
  };

  const handleLimparTodos = () => {
    if (confirm('Tem certeza que deseja apagar todas as ocorrências importadas?')) {
      setOcorrencias([]);
      setStats(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-800">Importar Ocorrências Diárias</h3>
          <p className="text-sm text-gray-500 mt-2">
            Selecione o arquivo CSV/TXT com os horários Realizados da operação.
          </p>
        </div>

        <div 
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-brand-red bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
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
              <p className="text-sm text-gray-400 mt-1">Colunas: Número Linha, Atendimento, Linha, Sentido, ..., Real Início, Real Fim</p>
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
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Linhas</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.lines}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Viagens</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.trips}</p>
                </div>
              </div>
              
              {(stats.missingStart > 0 || stats.missingEnd > 0 || stats.unknownDrivers > 0 || stats.unknownLines > 0) && (
                <div className="mt-6 space-y-3 text-left">
                  {(stats.missingStart > 0 || stats.missingEnd > 0) && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                      <Info className="text-amber-600 shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-bold text-amber-800">Horários não realizados detectados</p>
                        <p className="text-xs text-amber-700 mt-1">
                          O sistema identificou {stats.missingStart} saídas e {stats.missingEnd} chegadas em branco. 
                          Para estas viagens, o horário Previsto foi repetido automaticamente como Realizado.
                        </p>
                      </div>
                    </div>
                  )}

                  {(stats.unknownDrivers > 0 || stats.unknownLines > 0) && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="text-red-600 shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-bold text-red-800">Dados não encontrados na base</p>
                        {stats.unknownDrivers > 0 && (
                           <p className="text-xs text-red-700 mt-1">
                             Detectamos {stats.unknownDrivers} matrículas de motoristas que não constam no seu cadastro atual.
                           </p>
                        )}
                        {stats.unknownLines > 0 && (
                          <div className="text-xs text-red-700 mt-2">
                            <p className="font-bold">{Object.values(unmatchedLines).reduce((a, b) => a + b, 0)} ocorrências foram ignoradas.</p>
                            <p>Os seguintes códigos de linha não foram encontrados na base de Linhas:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1 font-mono text-[11px] bg-red-100 p-2 rounded-md">
                                {Object.entries(unmatchedLines).map(([code, count]) => (
                                    <li key={code}>Linha <strong>{code}</strong>: {count} ocorrência(s)</li>
                                ))}
                            </ul>
                            <p className="mt-2">Por favor, atualize a base de linhas na tela "Importar Base de Linhas" e importe este arquivo de ocorrências novamente para incluir os registros ignorados.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {uploadStatus === 'error' && (
            <>
              <div className="p-4 bg-red-100 text-red-600 rounded-full mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="font-semibold text-red-600">Erro na leitura do arquivo</p>
              <p className="text-sm text-red-500 mt-1">Verifique se o formato das colunas está correto.</p>
            </>
          )}
        </div>
      </div>

      {ocorrencias.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-slate-800">Dados Atuais</h4>
            <button 
              onClick={handleLimparTodos}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-500 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              Limpar Ocorrências
            </button>
          </div>
          <div className="flex gap-6">
            <div className="flex-1 p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-bold text-slate-500 uppercase">Total de Ocorrências</p>
              <p className="text-3xl font-black text-slate-800">{ocorrencias.length}</p>
            </div>
            <div className="flex-1 p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-bold text-slate-500 uppercase">Motoristas Únicos</p>
              <p className="text-3xl font-black text-slate-800">
                {new Set(ocorrencias.map(o => o.matriculaMotorista)).size}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
