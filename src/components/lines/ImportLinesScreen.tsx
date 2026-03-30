import { useRef, useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Trash2 } from 'lucide-react';
import { Viagem, UserRole } from '../../types';
import * as XLSX from 'xlsx';

interface ImportLinesScreenProps {
  viagens: Viagem[];
  setViagens: React.Dispatch<React.SetStateAction<Viagem[]>>;
  userRole?: UserRole;
}

const DIA_MAP: Record<string, number> = {
  'DOMINGO': 0,
  'SEGUNDA-FEIRA': 1, 'SEGUNDA': 1,
  'TERCA-FEIRA': 2, 'TERÇA-FEIRA': 2, 'TERCA': 2,
  'QUARTA-FEIRA': 3, 'QUARTA': 3,
  'QUINTA-FEIRA': 4, 'QUINTA': 4,
  'SEXTA-FEIRA': 5, 'SEXTA': 5,
  'SABADO': 6, 'SÁBADO': 6,
};

function parseDia(raw: string): number | null {
  const upper = raw.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Also check un-normalized
  return DIA_MAP[raw.trim().toUpperCase()] ?? DIA_MAP[upper] ?? null;
}

function formatTime(v: unknown): string {
  if (v == null) return '';
  // SheetJS may return a number (fraction of day) for time cells
  if (typeof v === 'number') {
    const totalMinutes = Math.round(v * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  // Handle "HH:MM:SS" or "HH:MM"
  const match = s.match(/(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : s;
}

export default function ImportLinesScreen({ viagens, setViagens, userRole }: ImportLinesScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState<{ linhas: number; servicos: number; viagens: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar a base de linhas.</p>
      </div>
    );
  }

  const processFile = (file: File) => {
    setErrorMessage('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rows.length === 0) {
          setErrorMessage('Planilha vazia ou formato não reconhecido.');
          setUploadStatus('error');
          setTimeout(() => setUploadStatus('idle'), 5000);
          return;
        }

        // Detect column names (handle variations)
        const firstRow = rows[0];
        const keys = Object.keys(firstRow);
        const findCol = (candidates: string[]) =>
          keys.find(k => candidates.some(c => k.toLowerCase().trim().includes(c.toLowerCase()))) || '';

        const colEmpresa = findCol(['empresa']);
        const colLinha = findCol(['linha']);
        const colOrigem = findCol(['origem']);
        const colDestino = findCol(['destino']);
        const colServico = findCol(['servico', 'serviço']);
        const colHorario = findCol(['horario', 'horário', 'saida', 'saída']);
        const colSentido = findCol(['sentido']);
        const colDia = findCol(['dia']);
        const colRegiao = findCol(['regiao', 'região']);

        if (!colLinha || !colServico) {
          setErrorMessage('Colunas obrigatórias não encontradas: Linha, Servico.');
          setUploadStatus('error');
          setTimeout(() => setUploadStatus('idle'), 5000);
          return;
        }

        // Group by unique service identity: (Linha, Servico, Sentido, HorarioSaida) → collect operating days
        type ServiceKey = string;
        interface ServiceData {
          empresa: string;
          nomeLinha: string;
          origem: string;
          destino: string;
          servico: string;
          horarioSaida: string;
          sentido: string;
          regiao: string;
          dias: Set<number>;
        }

        const serviceMap = new Map<ServiceKey, ServiceData>();

        for (const row of rows) {
          const empresa = String(row[colEmpresa] || '').trim();
          const nomeLinha = String(row[colLinha] || '').trim();
          const origem = String(row[colOrigem] || '').trim();
          const destino = String(row[colDestino] || '').trim();
          const servico = String(row[colServico] || '').trim();
          const horarioSaida = formatTime(row[colHorario]);
          const sentido = String(row[colSentido] || '').trim().toUpperCase();
          const regiao = String(row[colRegiao] || '').trim();
          const diaRaw = String(row[colDia] || '').trim();

          if (!nomeLinha || !servico) continue;

          const key = `${nomeLinha}|${servico}|${sentido}|${horarioSaida}`;
          const dia = parseDia(diaRaw);

          if (serviceMap.has(key)) {
            if (dia !== null) serviceMap.get(key)!.dias.add(dia);
          } else {
            const dias = new Set<number>();
            if (dia !== null) dias.add(dia);
            serviceMap.set(key, {
              empresa,
              nomeLinha,
              origem,
              destino,
              servico,
              horarioSaida,
              sentido,
              regiao,
              dias,
            });
          }
        }

        // ── Pass 2: merge trips that share (nomeLinha, origem, destino, sentido, horarioSaida, diasOperantes) ──
        // These are different service codes for the same physical trip — combine service codes with "/"
        interface MergedTrip {
          empresa: string;
          nomeLinha: string;
          origem: string;
          destino: string;
          servicos: string[];   // multiple service codes
          horarioSaida: string;
          sentido: string;
          regiao: string;
          diasOperantes: number[];
        }

        const mergeMap = new Map<string, MergedTrip>();
        const sortedEntries = [...serviceMap.values()].sort((a, b) =>
          a.nomeLinha.localeCompare(b.nomeLinha) || a.horarioSaida.localeCompare(b.horarioSaida)
        );

        for (const svc of sortedEntries) {
          const diasArr = [...svc.dias].sort();
          const diasKey = (diasArr.length > 0 ? diasArr : [0,1,2,3,4,5,6]).join(',');
          const mergeKey = `${svc.nomeLinha}|${svc.origem}|${svc.destino}|${svc.sentido}|${svc.horarioSaida}|${diasKey}`;

          if (mergeMap.has(mergeKey)) {
            const existing = mergeMap.get(mergeKey)!;
            if (!existing.servicos.includes(svc.servico)) {
              existing.servicos.push(svc.servico);
            }
          } else {
            mergeMap.set(mergeKey, {
              empresa: svc.empresa,
              nomeLinha: svc.nomeLinha,
              origem: svc.origem,
              destino: svc.destino,
              servicos: [svc.servico],
              horarioSaida: svc.horarioSaida,
              sentido: svc.sentido,
              regiao: svc.regiao,
              diasOperantes: diasArr.length > 0 ? diasArr : [0, 1, 2, 3, 4, 5, 6],
            });
          }
        }

        // Convert to Viagem[]
        const novasViagens: Viagem[] = [];
        let ordem = 1;

        for (const trip of mergeMap.values()) {
          const atendimento = trip.origem && trip.destino
            ? `${trip.origem} X ${trip.destino}`
            : trip.nomeLinha;

          novasViagens.push({
            id: crypto.randomUUID(),
            numeroLinha: trip.nomeLinha,
            nomeLinha: trip.nomeLinha,
            atendimento,
            sentido: trip.sentido === 'IDA' ? 'Ida' : trip.sentido === 'VOLTA' ? 'Volta' : trip.sentido,
            pontoInicio: trip.origem,
            pontoFim: trip.destino,
            prevInicio: trip.horarioSaida,
            prevFim: '',
            ordem: ordem++,
            diasOperantes: trip.diasOperantes,
            servico: trip.servicos.join('/'),
            empresa: trip.empresa,
            regiao: trip.regiao,
            origem: trip.origem,
            destino: trip.destino,
            horarioSaida: trip.horarioSaida,
          });
        }

        if (novasViagens.length > 0) {
          setViagens(novasViagens);
          const linhasUnicas = new Set(novasViagens.map(v => v.nomeLinha)).size;
          const servicosUnicos = new Set(novasViagens.map(v => v.servico)).size;
          setStats({ linhas: linhasUnicas, servicos: servicosUnicos, viagens: novasViagens.length });
          setUploadStatus('success');
        } else {
          setErrorMessage('Nenhuma viagem válida encontrada na planilha.');
          setUploadStatus('error');
        }
      } catch (err) {
        console.error(err);
        setErrorMessage('Erro ao processar o arquivo. Verifique se é um .xlsx válido.');
        setUploadStatus('error');
      }
      setTimeout(() => setUploadStatus('idle'), 15000);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleLimpar = () => {
    if (confirm('Tem certeza que deseja apagar toda a base de linhas?')) {
      setViagens([]);
      setStats(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-800">Importar Base de Linhas</h3>
          <p className="text-sm text-gray-500 mt-2">
            Selecione o arquivo XLSX com o relatório de linhas e serviços.
          </p>
        </div>

        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />

        <div
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-brand-red bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
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
                Empresa · Linha · Origem · Destino · Serviço · Horário · Sentido · Dia Operante · Região
              </p>
            </>
          )}

          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4 mx-auto w-16">
                <CheckCircle size={32} />
              </div>
              <p className="font-bold text-emerald-700 text-lg">Base de linhas importada!</p>
              <div className="mt-4 grid grid-cols-3 gap-4 text-left max-w-md mx-auto">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-bold uppercase">Linhas</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.linhas}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-bold uppercase">Serviços</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.servicos}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-bold uppercase">Viagens</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.viagens}</p>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div onClick={e => e.stopPropagation()}>
              <div className="p-4 bg-red-100 text-red-600 rounded-full mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="font-semibold text-red-600">Erro na importação</p>
              {errorMessage && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
            </div>
          )}
        </div>
      </div>

      {viagens.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-slate-800">Base Atual</h4>
            <button onClick={handleLimpar} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-500 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 size={16} /> Limpar Base
            </button>
          </div>
          <div className="flex gap-6">
            <div className="flex-1 p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-bold text-slate-500 uppercase">Total de Linhas</p>
              <p className="text-3xl font-black text-slate-800">{new Set(viagens.map(v => v.nomeLinha)).size}</p>
            </div>
            <div className="flex-1 p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-bold text-slate-500 uppercase">Total de Serviços</p>
              <p className="text-3xl font-black text-slate-800">{new Set(viagens.map(v => v.servico)).size}</p>
            </div>
            <div className="flex-1 p-4 bg-slate-50 rounded-lg">
              <p className="text-xs font-bold text-slate-500 uppercase">Total de Viagens</p>
              <p className="text-3xl font-black text-slate-800">{viagens.length}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl flex items-start gap-4">
        <FileText className="text-blue-600 h-8 w-8 mt-1 shrink-0" />
        <div>
          <h4 className="font-bold text-blue-800">Formato Esperado — Arquivo .xlsx</h4>
          <p className="text-xs text-blue-700 mt-2">
            Planilha com 9 colunas: <strong>Empresa, Linha, Origem, Destino, Serviço, Horário de Saída, Sentido, Dia Operante, Região</strong>
          </p>
          <p className="text-[10px] text-blue-500 mt-2">
            Cada linha da planilha representa um serviço em um dia específico. O sistema agrupa automaticamente os dias em que cada serviço opera.
          </p>
        </div>
      </div>
    </div>
  );
}
