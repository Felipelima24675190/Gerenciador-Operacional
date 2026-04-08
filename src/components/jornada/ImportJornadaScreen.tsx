import { useState, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { JornadaMotorista, Motorista, CodigoJornadaDescription, UserRole } from '../../types';
import { UploadCloud, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface Props {
  jornadas: JornadaMotorista[];
  setJornadas: Dispatch<SetStateAction<JornadaMotorista[]>>;
  motoristas: Motorista[];
  codigosJornada: CodigoJornadaDescription[];
  userRole?: UserRole;
}

function parseDate(raw: string): string {
  // DDMMYYYY → DD/MM/YYYY
  if (raw.length !== 8) return raw;
  return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
}

function isAllZero(t?: string): boolean {
  return !t || t === '00:00';
}

function parseJornadaLine(line: string): JornadaMotorista | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 3) return null;

  const rawMatricula = parts[0];
  const matricula = rawMatricula.slice(-5);
  const data = parseDate(parts[1]);
  const codigoAtividade = parts[2];

  // Validate basic fields
  if (!/^\d+$/.test(rawMatricula) || !/^\d{8}$/.test(parts[1]) || !/^\d{1,3}$/.test(codigoAtividade)) {
    return null;
  }

  let horaEntrada: string | undefined;
  let horaEntradaIntervalo: string | undefined;
  let horaSaidaIntervalo: string | undefined;
  let horaSaida: string | undefined;

  if (parts.length >= 7) {
    horaEntrada = parts[3];
    horaEntradaIntervalo = parts[4];
    horaSaidaIntervalo = parts[5];
    horaSaida = parts[6];
  }

  const semJornada = parts.length < 7 || (isAllZero(horaEntrada) && isAllZero(horaEntradaIntervalo) && isAllZero(horaSaidaIntervalo) && isAllZero(horaSaida));
  const semIntervalo = isAllZero(horaEntradaIntervalo) && isAllZero(horaSaidaIntervalo);

  // Detect midnight crossing: entrada > saida (e.g., 19:34 > 02:30)
  let jornadaCruzaMeiaNoite = false;
  if (horaEntrada && horaSaida && !isAllZero(horaEntrada) && !isAllZero(horaSaida)) {
    const [hE] = horaEntrada.split(':').map(Number);
    const [hS] = horaSaida.split(':').map(Number);
    if (hE > hS) jornadaCruzaMeiaNoite = true;
  }

  const id = `${matricula}_${parts[1]}_${codigoAtividade}`;

  return {
    id,
    matricula,
    data,
    codigoAtividade: codigoAtividade.padStart(3, '0'),
    horaEntrada: semJornada ? undefined : horaEntrada,
    horaEntradaIntervalo: semJornada || semIntervalo ? undefined : horaEntradaIntervalo,
    horaSaidaIntervalo: semJornada || semIntervalo ? undefined : horaSaidaIntervalo,
    horaSaida: semJornada ? undefined : horaSaida,
    jornadaCruzaMeiaNoite,
    semIntervalo: semJornada ? true : semIntervalo,
    semJornada,
  };
}

export default function ImportJornadaScreen({ jornadas, setJornadas, motoristas, codigosJornada, userRole }: Props) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [stats, setStats] = useState({ total: 0, matched: 0, unknownCodes: 0, skipped: 0 });

  const matriculaSet = useMemo(() => new Set(motoristas.map(m => m.matricula)), [motoristas]);
  const codeSet = useMemo(() => new Set(codigosJornada.map(c => c.codigo)), [codigosJornada]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string)
          .replace(/^\uFEFF/, '')
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n');
        const lines = text.trim().split('\n').filter(l => l.trim());

        const parsed: JornadaMotorista[] = [];
        const seenIds = new Set<string>();
        let matched = 0;
        let unknownCodes = 0;
        let skipped = 0;

        for (const line of lines) {
          const record = parseJornadaLine(line);
          if (!record) { skipped++; continue; }
          if (seenIds.has(record.id)) continue;
          seenIds.add(record.id);
          parsed.push(record);
          if (matriculaSet.has(record.matricula)) matched++;
          if (!codeSet.has(record.codigoAtividade)) unknownCodes++;
        }

        // Merge: keep existing + add new (dedup by id)
        setJornadas(prev => {
          const existingIds = new Set(prev.map(j => j.id));
          const newRecords = parsed.filter(j => !existingIds.has(j.id));
          return [...prev, ...newRecords];
        });

        setStats({ total: parsed.length, matched, unknownCodes, skipped });
        setStatus('success');
        setMsg(`${parsed.length} registros importados com sucesso.`);
      } catch (err) {
        setStatus('error');
        setMsg('Erro ao processar arquivo. Verifique o formato.');
      }
    };
    reader.readAsText(file, 'utf-8');
  }, [setJornadas, matriculaSet, codeSet]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const handleLimpar = () => {
    if (confirm('Tem certeza que deseja limpar todas as jornadas importadas?')) {
      setJornadas([]);
      setStatus('idle');
    }
  };

  return (
    <div className="space-y-5">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-card p-4 flex items-start gap-3">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
        <div className="text-xs text-blue-800 space-y-1">
          <p className="font-bold">Importacao de Jornada de Motoristas</p>
          <p>Arquivo TXT com separador espaco. Formatos aceitos:</p>
          <p className="font-mono text-2xs bg-blue-100 px-2 py-1 rounded">MATRICULA DDMMAAAA CODIGO</p>
          <p className="font-mono text-2xs bg-blue-100 px-2 py-1 rounded">MATRICULA DDMMAAAA CODIGO HH:MM HH:MM HH:MM HH:MM</p>
          <p>Os 5 ultimos digitos da matricula sao usados. Horarios opcionais: Entrada, Inicio Intervalo, Fim Intervalo, Saida.</p>
          <p>A importacao <strong>acumula</strong> registros (dados duplicados sao ignorados).</p>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-card border border-gray-200 p-6 shadow-card">
        <h3 className="text-lg font-black text-slate-800 text-center mb-4">Importar Jornada de Motoristas</h3>
        <p className="text-xs text-slate-500 text-center mb-6">Arraste o arquivo ou clique para selecionar</p>

        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-brand-400 hover:bg-brand-50/30 transition-all cursor-pointer"
        >
          <input
            type="file"
            accept=".txt,.csv"
            onChange={handleInputChange}
            className="hidden"
            id="jornada-upload"
          />
          <label htmlFor="jornada-upload" className="cursor-pointer flex flex-col items-center gap-3">
            {status === 'idle' && <UploadCloud size={40} className="text-slate-300" />}
            {status === 'success' && <CheckCircle size={40} className="text-emerald-500" />}
            {status === 'error' && <AlertTriangle size={40} className="text-red-500" />}
            <p className={`text-sm font-bold ${status === 'success' ? 'text-emerald-600' : status === 'error' ? 'text-red-600' : 'text-slate-400'}`}>
              {status === 'idle' ? 'Clique ou arraste um arquivo .txt' : msg}
            </p>
          </label>
        </div>

        {status === 'success' && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-2xs font-bold text-slate-400 uppercase">Total Importados</p>
              <p className="text-lg font-black text-slate-800">{stats.total}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-2xs font-bold text-emerald-500 uppercase">Motoristas Encontrados</p>
              <p className="text-lg font-black text-emerald-700">{stats.matched}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${stats.unknownCodes > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
              <p className={`text-2xs font-bold uppercase ${stats.unknownCodes > 0 ? 'text-amber-500' : 'text-slate-400'}`}>Codigos Desconhecidos</p>
              <p className={`text-lg font-black ${stats.unknownCodes > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{stats.unknownCodes}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-2xs font-bold text-slate-400 uppercase">Linhas Ignoradas</p>
              <p className="text-lg font-black text-slate-400">{stats.skipped}</p>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">{jornadas.length} registro(s) no total</p>
          {jornadas.length > 0 && userRole === 'admin' && (
            <button onClick={handleLimpar} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">
              Limpar Todos os Registros
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
