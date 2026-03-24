import { useRef, useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Trash2, Info } from 'lucide-react';
import { Ocorrencia, Motorista, Viagem, UserRole } from '../../types';
import { processarOcorrenciaIndividual } from '../../utils/pontualidade';
import { buildLinhaLookup } from '../../utils/linhaLookup';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    lines: number;
    trips: number;
    missingStart: number;
    missingEnd: number;
    unknownDrivers: number;
    unknownLines: number;
  } | null>(null);

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
      const novasOcorrencias: Ocorrencia[] = [];
      const localUnmatched: Record<string, number> = {};

      let missingStart = 0;
      let missingEnd = 0;
      let unknownDrivers = 0;

      // Build flexible lookup (matches by numero, servico, partial name, city extraction)
      const resolveLinha = buildLinhaLookup(viagens);
      const motoristasSet = new Set(motoristas.map(m => m.matricula));

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(/[,;]/).map(p => p.trim());

        // Skip header row
        if (parts[0].toLowerCase().includes('número') || parts[0].toLowerCase().includes('numero')) continue;

        if (parts.length < 11) continue;

        const numLinha   = parts[0];
        const atendimento = parts[1];
        const sentido    = parts[2];
        const pontoInicio = parts[3];
        const pontoFim   = parts[4];
        const veiculo    = parts[5];
        const matricula  = parts[6];
        const prevInicio = parts[7];
        const prevFim    = parts[8];
        const realInicio = parts[9];
        const realFim    = parts[10];

        if (!motoristasSet.has(matricula)) unknownDrivers++;

        // Resolve line name: try flexible lookup, only use nomeLinha (not atendimento code)
        const nomeLinha = resolveLinha(numLinha) || resolveLinha(atendimento);
        if (!nomeLinha) {
          localUnmatched[numLinha] = (localUnmatched[numLinha] || 0) + 1;
        }

        const rawOcorrencia: Partial<Ocorrencia> = {
          id: crypto.randomUUID(),
          numeroLinha: numLinha,
          atendimento,
          nomeLinha: nomeLinha || numLinha,
          sentido,
          pontoInicio,
          pontoFim,
          veiculo,
          matriculaMotorista: matricula,
          prevInicio,
          prevFim,
          realInicio,
          realFim,
        };

        if (!realInicio) missingStart++;
        if (!realFim)    missingEnd++;

        const processed = processarOcorrenciaIndividual(rawOcorrencia);
        novasOcorrencias.push(processed);
      }

      setUnmatchedLines(localUnmatched);
      const unknownLinesCount = Object.keys(localUnmatched).length;

      if (novasOcorrencias.length > 0) {
        setOcorrencias(prev => [...prev, ...novasOcorrencias]);
        setStats({
          lines: new Set(novasOcorrencias.map(o => o.numeroLinha)).size,
          trips: novasOcorrencias.length,
          missingStart,
          missingEnd,
          unknownDrivers,
          unknownLines: unknownLinesCount,
        });
        setUploadStatus('success');
      } else {
        setUploadStatus('error');
      }
      setTimeout(() => setUploadStatus('idle'), 15000);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUnmatchedLines({});
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUnmatchedLines({});
      processFile(file);
    }
    // Reset so same file can be re-selected
    e.target.value = '';
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
            Selecione o arquivo CSV com os horários Realizados da operação.
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        <div
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-brand-red bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          {uploadStatus === 'idle' && (
            <>
              <div className="p-4 bg-white shadow-sm border border-gray-200 rounded-full mb-4 text-slate-700">
                <UploadCloud size={32} />
              </div>
              <p className="font-semibold text-slate-700">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                Número Linha · Atendimento · Sentido · Ponto Início · Ponto Fim · Veículo · Matrícula · Prev. Início · Prev. Fim · Real. Início · Real. Fim
              </p>
            </>
          )}

          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
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
                          {stats.missingStart} saídas e {stats.missingEnd} chegadas em branco.
                          O horário Previsto foi repetido automaticamente como Realizado para essas viagens.
                        </p>
                      </div>
                    </div>
                  )}

                  {stats.unknownDrivers > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-bold text-amber-800">{stats.unknownDrivers} matrículas não encontradas na base</p>
                        <p className="text-xs text-amber-700 mt-1">As viagens foram importadas normalmente. O nome do motorista aparecerá pela matrícula até que o cadastro seja atualizado.</p>
                      </div>
                    </div>
                  )}

                  {stats.unknownLines > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                      <Info className="text-blue-500 shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-bold text-blue-800">{Object.values(unmatchedLines).reduce((a, b) => a + b, 0)} viagens com linha não cadastrada</p>
                        <p className="text-xs text-blue-700 mt-1">Estas viagens foram importadas usando o código da linha como nome. Os seguintes códigos não constam na base de linhas:</p>
                        <ul className="list-disc list-inside mt-2 space-y-0.5 font-mono text-[11px] bg-blue-100 p-2 rounded-md">
                          {Object.entries(unmatchedLines).map(([code, count]) => (
                            <li key={code}>Linha <strong>{code}</strong>: {count} viagem(ns)</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {uploadStatus === 'error' && (
            <div onClick={e => e.stopPropagation()}>
              <div className="p-4 bg-red-100 text-red-600 rounded-full mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="font-semibold text-red-600">Erro na leitura do arquivo</p>
              <p className="text-sm text-red-500 mt-1">Verifique se o formato das colunas está correto (CSV com ponto-e-vírgula).</p>
            </div>
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
