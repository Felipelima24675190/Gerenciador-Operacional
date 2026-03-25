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
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

  // Normalize header names to identify columns
  const normalizeHeader = (h: string): string => {
    const s = h.trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^A-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return s;
  };

  // Map normalized header to field name
  const identifyColumn = (header: string): string | null => {
    const h = normalizeHeader(header);
    if (h === 'PLACA' || h.includes('PLACA')) return 'placa';
    if (h === 'ORDEM' || h.includes('ORDEM')) return 'ordem';
    if (h === 'EMPRESA' || h.includes('EMPRESA')) return 'empresa';
    if (h === 'LINHA' || h.includes('LINHA')) return 'linha';
    if (h.includes('MATRICULA') || h.includes('MOTORISTA')) return 'matricula';
    if (h === 'MES' || h === 'MESANO' || h === 'MES ANO' || h.includes('MES REF')) return 'mes'; // skip
    if (h === 'DATA' || h.includes('DATA')) return 'data';
    if (h === 'LOCAL' || h.includes('LOCAL') || h.includes('FILIAL') || h.includes('TERMINAL')) return 'local';
    if (h === 'HORA' || h.includes('HORA') || h.includes('HORARIO')) return 'hora';
    if (h.includes('CODIGO') || h.includes('COD') && h.includes('INFR')) return 'codigo';
    if (h.includes('DESCRICAO') || h.includes('DESC')) return 'descricao';
    if (h.includes('AUTO') || h.includes('N DO AUTO') || h.includes('NUMERO AUTO')) return 'auto';
    if (h.includes('SETOR') || h.includes('RESPONSAVEL')) return 'setor';
    if (h.includes('VALOR')) return 'valor';
    return null;
  };

  // Normalize setor to standard categories
  const normalizeSetor = (raw: string): string => {
    const s = raw.trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s.includes('OPERA')) return 'OPERAÇÃO';
    if (s.includes('MANUT')) return 'MANUTENÇÃO';
    if (s.includes('COMER')) return 'COMERCIAL';
    if (s.includes('ATRASO')) return 'ATRASO';
    if (s === 'RH') return 'RH';
    return raw.trim().toUpperCase() || 'SEM SETOR';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processMultasFile(file);
  };

  const processMultasFile = (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setErrorMsg('Formato de arquivo não suportado. Use .csv ou .txt');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Normalize line endings and remove BOM
      const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = cleaned.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        setUploadStatus('error');
        setErrorMsg('Arquivo vazio ou sem dados.');
        setTimeout(() => setUploadStatus('idle'), 5000);
        return;
      }

      // Detect separator from header line
      const headerLine = lines[0];
      const sep = headerLine.includes('\t') ? '\t' : ';';

      // Parse header using quoted-field-aware parser
      const headers = parseCsvLine(headerLine, sep);
      const colMap: Record<string, number> = {};
      headers.forEach((h, i) => {
        const field = identifyColumn(h);
        if (field && !(field in colMap)) {
          colMap[field] = i;
        }
      });

      // Extra pass: catch "CÓDIGO" header without "INFRAÇÃO"
      if (!('codigo' in colMap)) {
        headers.forEach((h, i) => {
          const norm = normalizeHeader(h);
          if (norm === 'CODIGO' || norm === 'COD') {
            colMap['codigo'] = i;
          }
        });
      }

      // Validate minimum required columns
      const requiredFields = ['data', 'codigo'];
      const missing = requiredFields.filter(f => !(f in colMap));
      if (missing.length > 0) {
        // Fallback positional mapping (sem PLACA): ORDEM, EMPRESA, LINHA, MATRÍCULA, DATA, LOCAL, HORA, CÓDIGO, DESCRIÇÃO, AUTO, SETOR
        if (headers.length >= 11) {
          colMap['ordem']     = 0;
          colMap['empresa']   = 1;
          colMap['linha']     = 2;
          colMap['matricula'] = 3;
          colMap['data']      = 4;
          colMap['local']     = 5;
          colMap['hora']      = 6;
          colMap['codigo']    = 7;
          colMap['descricao'] = 8;
          colMap['auto']      = 9;
          colMap['setor']     = 10;
        } else {
          setUploadStatus('error');
          setErrorMsg(`Colunas obrigatórias não encontradas: ${missing.join(', ')}. Verifique o cabeçalho do arquivo.`);
          setTimeout(() => setUploadStatus('idle'), 8000);
          return;
        }
      }

      const get = (parts: string[], field: string): string => {
        const idx = colMap[field];
        if (idx === undefined || idx >= parts.length) return '';
        return (parts[idx] || '').trim();
      };

      const novasMultas: MultaANTT[] = [];
      const codeDescMap = new Map(anttCodeDescriptions.map(c => [c.codigo, c]));

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Use quoted-field-aware parser so descriptions with `;` don't shift columns
        const parts = parseCsvLine(line, sep);

        // Skip repeated header rows
        const firstColNorm = normalizeHeader(parts[0] || '');
        if (firstColNorm === 'PLACA' || firstColNorm === 'CODIGO' || firstColNorm === 'DATA') continue;

        const empresa        = get(parts, 'empresa').toUpperCase();
        const matricula      = get(parts, 'matricula');
        const data           = get(parts, 'data');
        const local          = get(parts, 'local');
        const hora           = get(parts, 'hora');
        const codigoInfracao = get(parts, 'codigo');
        const descricaoInfracao = get(parts, 'descricao');
        const autoInfracao   = get(parts, 'auto');
        const setorRaw       = get(parts, 'setor');
        const setor          = normalizeSetor(setorRaw);

        const dataHora = hora ? `${data} ${hora}` : data;

        // Skip rows with no useful data at all
        if (!codigoInfracao && !data) continue;

        // Lookup value from code descriptions base
        const codeDesc = codeDescMap.get(codigoInfracao);
        const valorMulta = codeDesc?.valor ?? 0;

        novasMultas.push({
          id: crypto.randomUUID(),
          placaVeiculo: '',          // placa removed from import; looked up from vehicle base
          empresa,
          matriculaMotorista: matricula,
          dataHora,
          terminal: local,
          codigoInfracao,
          descricaoInfracao,
          autoInfracao,
          setor,
          valor: valorMulta,
          status: 'Aguardando',
        });
      }

      if (novasMultas.length > 0) {
        setMultas(novasMultas);
        setStats({
          total: novasMultas.length,
          valor: novasMultas.reduce((acc, m) => acc + m.valor, 0),
        });
        setUploadStatus('success');
      } else {
        setUploadStatus('error');
        setErrorMsg('Nenhum registro válido encontrado no arquivo.');
      }
      setTimeout(() => setUploadStatus('idle'), 10000);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Parse a CSV/TXT line respecting quoted fields
  const parseCsvLine = (line: string, sep: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === sep && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Parse Brazilian currency "R$ 2.046,16" -> 2046.16
  const parseBRCurrency = (str: string): number => {
    const cleaned = str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const handleDropCodeFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCodeDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processCodeFile(file);
  };

  const processCodeFile = (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      setCodeUploadStatus('error');
      setTimeout(() => setCodeUploadStatus('idle'), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newCodeDescriptions: AnttCodeDescription[] = [];

      // Detect separator - prefer ; then tab then ,
      const headerLine = lines.find(l => l.trim()) || '';
      const sep = headerLine.includes(';') ? ';' : (headerLine.includes('\t') ? '\t' : ',');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = parseCsvLine(line, sep);

        // Skip header
        if (parts[0].toLowerCase() === 'cod' || parts[0].toLowerCase().includes('código') || parts[0].toLowerCase() === 'codigo') continue;

        if (parts.length >= 2) {
          const valor = parts.length >= 3 ? parseBRCurrency(parts[2]) : 0;
          newCodeDescriptions.push({
            codigo: parts[0].trim(),
            descricao: parts[1].trim(),
            valor,
          });
        }
      }

      if (newCodeDescriptions.length > 0) {
        setAnttCodeDescriptions(newCodeDescriptions);
        setCodeStats({ total: newCodeDescriptions.length });
        setCodeUploadStatus('success');
      } else {
        setCodeUploadStatus('error');
      }
      setTimeout(() => setCodeUploadStatus('idle'), 10000);
    };
    reader.readAsText(file);
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
            Selecione o arquivo CSV/TXT com os autos de infração. O sistema detecta as colunas automaticamente pelo cabeçalho.
            Colunas esperadas: <span className="font-semibold text-slate-600">ORDEM · EMPRESA · LINHA · MATRÍCULA · DATA · LOCAL · HORA · CÓDIGO · DESCRIÇÃO · AUTO · SETOR</span>.
            Campos AUTO e MATRÍCULA são opcionais. A placa é consultada na base de veículos.
          </p>
        </div>

        <label
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-brand-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input type="file" accept=".csv,.txt" className="hidden" onChange={ev => { const f = ev.target.files?.[0]; if (f) processMultasFile(f); }} />

          {uploadStatus === 'idle' && (
            <>
              <div className="p-4 bg-white shadow-sm border border-gray-200 rounded-full mb-4 text-slate-700">
                <UploadCloud size={32} />
              </div>
              <p className="font-semibold text-slate-700">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-gray-400 mt-1">.CSV ou .TXT separado por TAB ou ;</p>
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
              <p className="text-sm text-red-500 mt-1">{errorMsg || 'Verifique o formato das colunas do CSV.'}</p>
            </>
          )}
        </label>
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

      {/* Importar Código de Multas ANTT */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-800">Importar Códigos de Multas ANTT</h3>
          <p className="text-sm text-gray-500 mt-2">
            Selecione o arquivo CSV/TXT com os códigos de infração e suas descrições. Colunas: CÓDIGO; DESCRIÇÃO; VALOR.
          </p>
        </div>

        <label
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isCodeDragging ? 'border-brand-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={(e) => { e.preventDefault(); setIsCodeDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsCodeDragging(false); }}
          onDrop={handleDropCodeFile}
        >
          <input type="file" accept=".csv,.txt" className="hidden" onChange={ev => { const f = ev.target.files?.[0]; if (f) processCodeFile(f); }} />

          {codeUploadStatus === 'idle' && (
            <>
              <div className="p-4 bg-white shadow-sm border border-gray-200 rounded-full mb-4 text-slate-700">
                <UploadCloud size={32} />
              </div>
              <p className="font-semibold text-slate-700">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-gray-400 mt-1">.CSV ou .TXT separado por ;</p>
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
              <p className="text-sm text-red-500 mt-1">Verifique o formato das colunas do CSV (CÓDIGO; DESCRIÇÃO; VALOR).</p>
            </>
          )}
        </label>
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
