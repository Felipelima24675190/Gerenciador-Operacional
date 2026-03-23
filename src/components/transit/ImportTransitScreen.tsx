import { useState, Dispatch, SetStateAction } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { MultaTransito, UserRole, Motorista } from '../../types';

interface ImportTransitScreenProps {
  multas: MultaTransito[];
  setMultas: Dispatch<SetStateAction<MultaTransito[]>>;
  motoristas: Motorista[];
  userRole?: UserRole;
}

// Converte "R$ 195,23" → 195.23
function parseBRL(raw: string): number {
  const cleaned = raw.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export default function ImportTransitScreen({ multas, setMultas, motoristas, userRole }: ImportTransitScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<{ total: number; notFound: number; valorTotal: number } | null>(null);

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-md mt-2">Apenas Administradores podem importar Multas de Trânsito.</p>
      </div>
    );
  }

  const motoristasSet = new Set(motoristas.map(m => m.matricula));

  const processFile = (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trimEnd());
      const novasMultas: MultaTransito[] = [];
      let notFound = 0;

      // Detectar separador (sempre ; no modelo)
      const headerLine = lines.find(l => l.trim()) || '';
      const sep = headerLine.includes('\t') ? '\t' : ';';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(sep).map(p => p.trim());

        // Pular cabeçalho
        const first = parts[0].toUpperCase();
        if (first === 'DATA DA INFRAÇÃO' || first === 'DATA DA INFRAÇAO' || first === 'DATA') continue;
        if (parts.length < 5) continue;

        // Colunas (baseado no modelo):
        // 0  DATA DA INFRAÇÃO
        // 1  VEÍCULO
        // 2  ORGÃO ATUADOR
        // 3  DESCRIÇÃO DA MULTA
        // 4  NÚMERO DO AUTO DE INFRAÇÃO
        // 5  VALOR COBRADO
        // 6  VALOR RECUPERADO
        // 7  MOTORISTA INDENTIFICADO?
        // 8  MATRÍCULA DO MOTORISTA
        // 9  NOME DO MOTORISTA
        // 10 GESTOR
        // 11 FILIAL
        // 12 ENVIADO PARA O GERENTE?
        // 13 GERENTE DEVOLVEU O VALE?
        // 14 LANÇADO NO GLOBUS?
        // 15 OBSERVAÇÃO

        const get = (idx: number) => parts[idx]?.trim() || '';

        const dataInfracao = get(0);
        const veiculo = get(1);
        const orgaoAtuador = get(2);
        const descricaoMulta = get(3);
        const numeroAuto = get(4);
        const valorCobrado = parseBRL(get(5));
        const valorRecuperado = parseBRL(get(6));
        const motoristaIdentificado = get(7).toUpperCase() === 'SIM';
        const matriculaMotorista = get(8);
        const nomeMotorista = get(9);
        const gestor = get(10);
        const filial = get(11);
        const enviadoGerente = get(12);
        const gerenteDevolveu = get(13);
        const lancadoGlobus = get(14);
        const observacao = get(15);

        if (!dataInfracao && !veiculo) continue;

        if (matriculaMotorista && !motoristasSet.has(matriculaMotorista)) notFound++;

        novasMultas.push({
          id: crypto.randomUUID(),
          dataInfracao,
          veiculo,
          orgaoAtuador,
          descricaoMulta,
          numeroAuto,
          valorCobrado,
          valorRecuperado,
          motoristaIdentificado,
          matriculaMotorista,
          nomeMotorista,
          gestor,
          filial,
          enviadoGerente,
          gerenteDevolveu,
          lancadoGlobus,
          observacao,
          status: 'Aguardando',
        });
      }

      if (novasMultas.length > 0) {
        setMultas(novasMultas);
        const valorTotal = novasMultas.reduce((s, m) => s + m.valorCobrado, 0);
        setStats({ total: novasMultas.length, notFound, valorTotal });
        setUploadStatus('success');
      } else {
        setUploadStatus('error');
      }
      setTimeout(() => setUploadStatus('idle'), 12000);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { processFile(file); e.target.value = ''; }
  };

  const handleLimpar = () => {
    if (confirm('Tem certeza que deseja apagar todas as multas de trânsito importadas?')) {
      setMultas([]);
      setStats(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-6 text-center">
          <h3 className="text-xl font-bold text-slate-800">Importar Multas de Trânsito</h3>
          <p className="text-sm text-gray-500 mt-1">
            Arquivo CSV com separador <strong>ponto-e-vírgula (;)</strong>
          </p>
        </div>

        {/* Colunas esperadas */}
        <div className="mb-6 bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Colunas esperadas (na ordem)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            {[
              'DATA DA INFRAÇÃO', 'VEÍCULO', 'ORGÃO ATUADOR', 'DESCRIÇÃO DA MULTA',
              'NÚMERO DO AUTO', 'VALOR COBRADO', 'VALOR RECUPERADO', 'MOTORISTA IDENTIFICADO?',
              'MATRÍCULA', 'NOME DO MOTORISTA', 'GESTOR', 'FILIAL',
              'ENVIADO AO GERENTE?', 'GERENTE DEVOLVEU?', 'LANÇADO NO GLOBUS?', 'OBSERVAÇÃO',
            ].map((col, i) => (
              <span key={i} className="text-[10px] bg-white border border-slate-200 rounded px-2 py-1 text-slate-600 font-mono truncate" title={col}>
                {i + 1}. {col}
              </span>
            ))}
          </div>
        </div>

        <label
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
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
              <p className="font-semibold text-slate-700">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-gray-400 mt-1">.CSV ou .TXT</p>
            </>
          )}

          {uploadStatus === 'success' && stats && (
            <div className="animate-in fade-in zoom-in duration-300 text-center">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4 mx-auto w-16">
                <CheckCircle size={32} />
              </div>
              <p className="font-bold text-emerald-700 text-lg">Importação concluída!</p>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-left max-w-lg mx-auto">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total Multas</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.total}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Valor Total</p>
                  <p className="text-xl font-bold text-slate-700">
                    {stats.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                {stats.notFound > 0 && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Não na Base</p>
                    <p className="text-2xl font-bold text-amber-700">{stats.notFound}</p>
                    <p className="text-[10px] text-amber-500">motoristas desligados</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <>
              <div className="p-4 bg-red-100 text-red-600 rounded-full mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="font-semibold text-red-600">Nenhum registro válido encontrado</p>
              <p className="text-sm text-red-500 mt-1">Verifique se o arquivo segue o modelo esperado.</p>
            </>
          )}
        </label>
      </div>

      {multas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-800">Base Ativa</h4>
              <p className="text-sm text-slate-500">
                {multas.length} multas · Total:{' '}
                {multas.reduce((s, m) => s + m.valorCobrado, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <button
              onClick={handleLimpar}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-500 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              Limpar Multas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
