import { useState, useMemo, Dispatch, SetStateAction } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { ManutencaoVeiculo, HistoricoManutencao, UserRole, Veiculo } from '../../types';

interface ImportMaintenanceScreenProps {
  manutencoes: ManutencaoVeiculo[];
  setManutencoes: Dispatch<SetStateAction<ManutencaoVeiculo[]>>;
  historicoManutencao: HistoricoManutencao[];
  setHistoricoManutencao: Dispatch<SetStateAction<HistoricoManutencao[]>>;
  veiculos: Veiculo[];
  userRole: UserRole;
}

export default function ImportMaintenanceScreen({ manutencoes, setManutencoes, setHistoricoManutencao, veiculos, userRole }: ImportMaintenanceScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ total: number; novos: number; liberados: number } | null>(null);

  const veiculoMap = useMemo(() => new Map(veiculos.map(v => [v.prefixo, v])), [veiculos]);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar status de manutencao.</p>
      </div>
    );
  }

  const parseDate = (str: string) => {
    const [d, m, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d);
  };

  const diffHours = (start: string, end: string) => {
    try {
      const s = parseDate(start);
      const e = parseDate(end);
      return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60));
    } catch { return 0; }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const novosVeiculos: ManutencaoVeiculo[] = [];

      const headerLine = lines.find(l => l.trim()) || '';
      const sep = headerLine.includes('\t') ? '\t' : ';';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(sep).map(p => p.trim());

        // Skip header
        if (parts[0].toLowerCase() === 'veiculo' || parts[0].toLowerCase() === 'prefixo') continue;

        // Expected: VEICULO, RETIDO DESDE, KM ATUAL, DESCRIÇÃO DE SERVIÇOS, STATUS, LOCAL, PREV. LIB.
        if (parts.length >= 7) {
          novosVeiculos.push({
            id: crypto.randomUUID(),
            prefixo: parts[0],
            retidoDesde: parts[1],
            kmAtual: parseFloat(parts[2].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            descricaoServico: parts[3],
            statusManutencao: parts[4],
            local: parts[5],
            previsaoLiberacao: parts[6],
          });
        }
      }

      if (novosVeiculos.length > 0) {
        // Compare with previous manutencoes to detect vehicles that left
        const novoPrefixos = new Set(novosVeiculos.map(v => v.prefixo));
        const hoje = new Date().toLocaleDateString('pt-BR');
        let liberados = 0;

        const novoHistorico: HistoricoManutencao[] = [];
        for (const prev of manutencoes) {
          if (!novoPrefixos.has(prev.prefixo)) {
            // Vehicle was released
            liberados++;
            novoHistorico.push({
              id: crypto.randomUUID(),
              prefixo: prev.prefixo,
              descricaoServico: prev.descricaoServico,
              dataEntrada: prev.retidoDesde,
              dataSaida: hoje,
              tempoOficinaHoras: diffHours(prev.retidoDesde, hoje),
              previsaoLiberacao: prev.previsaoLiberacao,
              local: prev.local,
              kmAtual: prev.kmAtual,
            });
          }
        }

        if (novoHistorico.length > 0) {
          setHistoricoManutencao(prev => [...novoHistorico, ...prev]);
        }

        setManutencoes(novosVeiculos);
        setStats({ total: novosVeiculos.length, novos: novosVeiculos.length, liberados });
        setUploadStatus('success');
      } else {
        setUploadStatus('error');
      }
      setTimeout(() => setUploadStatus('idle'), 10000);
    };
    reader.readAsText(file);
  };

  const handleLimpar = () => {
    if (confirm('Tem certeza que deseja limpar todos os registros de manutencao?')) {
      setManutencoes([]);
      setStats(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-800">Importar Status de Manutencao Atual</h3>
          <p className="text-sm text-gray-500 mt-2">
            Selecione o arquivo CSV/TXT com os veiculos atualmente em manutencao. Colunas esperadas: <strong>VEICULO, RETIDO DESDE, KM ATUAL, DESCRIÇÃO DE SERVIÇOS, STATUS, LOCAL, PREV. LIB.</strong>
          </p>
          <p className="text-xs text-slate-400 mt-1">A placa do veiculo sera obtida automaticamente a partir da Base de Veiculos.</p>
          <p className="text-xs text-amber-600 mt-2 font-semibold">
            Ao importar uma nova planilha, veiculos que estavam na lista anterior e nao aparecem mais serao automaticamente registrados como liberados no historico.
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
        >
          {uploadStatus === 'idle' && (
            <>
              <div className="p-4 bg-white shadow-sm border border-gray-200 rounded-full mb-4 text-slate-700">
                <UploadCloud size={32} />
              </div>
              <p className="font-semibold text-slate-700">Clique ou arraste o arquivo aqui</p>
            </>
          )}

          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4 mx-auto w-16">
                <CheckCircle size={32} />
              </div>
              <p className="font-bold text-emerald-700 text-lg">Importacao concluida!</p>
              <div className="mt-4 grid grid-cols-3 gap-4 text-left max-w-lg mx-auto">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-bold uppercase">Na Oficina</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.total}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-600 font-bold uppercase">Novos</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.novos}</p>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <p className="text-xs text-amber-600 font-bold uppercase">Liberados</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.liberados}</p>
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
              <p className="text-sm text-red-500 mt-1">Verifique o formato das colunas (VEICULO, RETIDO DESDE, KM ATUAL, DESCRIÇÃO, STATUS, LOCAL, PREV. LIB.).</p>
            </>
          )}
        </div>
      </div>

      {manutencoes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-800">Veiculos na Oficina ({manutencoes.length})</h4>
              <p className="text-xs text-slate-400 mt-0.5">{veiculos.length > 0 ? `${veiculoMap.size} veiculos na base para cruzamento de placa` : 'Nenhuma base de veiculos importada'}</p>
            </div>
            <button
              onClick={handleLimpar}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-500 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
