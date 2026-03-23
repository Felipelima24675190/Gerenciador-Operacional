import { useState } from 'react';
import { Viagem } from '../../types';
import { Upload } from 'lucide-react';

interface ImportLinesScreenProps {
  onImport: (data: Viagem[]) => void;
}

export default function ImportLinesScreen({ onImport }: ImportLinesScreenProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          const parsedData = parseCsv(text);
          onImport(parsedData);
          setError(null);
        } catch (err) {
          setError('Erro ao processar o arquivo. Verifique se o formato é CSV e possui as colunas esperadas.');
          console.error(err);
        }
      };
      reader.readAsText(file, 'ISO-8859-1');
    }
  };

  const parseCsv = (text: string): Viagem[] => {
    const lines = text.trim().split('\n');
    const data: Viagem[] = [];
    const header = lines[0].split(';').map(h => h.trim().toLowerCase());
    
    // Map expected columns to their index
    const colIndices: { [key: string]: number } = {
        numeroLinha: header.indexOf('codigolinha'),
        atendimento: header.indexOf('atendimento'),
        nomeLinha: header.indexOf('nomelinha'),
        sentido: header.indexOf('sentido'),
        pontoInicio: header.indexOf('pontoinicio'),
        pontoFim: header.indexOf('pontofim'),
        prevInicio: header.indexOf('horainicio'),
        prevFim: header.indexOf('horafim'),
    };
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';');
        if (values.length < Object.keys(colIndices).length) continue;

        const viagem: Viagem = {
            id: crypto.randomUUID(),
            numeroLinha: values[colIndices.numeroLinha]?.trim(),
            atendimento: values[colIndices.atendimento]?.trim(),
            nomeLinha: values[colIndices.nomeLinha]?.trim(),
            sentido: values[colIndices.sentido]?.trim(),
            pontoInicio: values[colIndices.pontoInicio]?.trim(),
            pontoFim: values[colIndices.pontoFim]?.trim(),
            prevInicio: `18/03/2026 ${values[colIndices.prevInicio]?.trim()}`,
            prevFim: `18/03/2026 ${values[colIndices.prevFim]?.trim()}`,
            ordem: i,
            diasOperantes: [0, 1, 2, 3, 4, 5, 6],
        };
        data.push(viagem);
    }
    return data;
  };

  return (
    <div className="bg-white p-8 rounded-xl border shadow-sm">
      <h2 className="text-xl font-bold mb-4">Importar Base de Linhas</h2>
      <div className="flex items-center justify-center w-full">
        <label htmlFor="dropzone-file-lines" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                <p className="text-xs text-gray-500">Arquivo CSV separado por ponto e vírgula (;)</p>
            </div>
            <input id="dropzone-file-lines" type="file" className="hidden" onChange={handleFileChange} accept=".csv" />
        </label>
      </div> 
      {error && <p className="mt-4 text-center text-red-500 text-sm font-semibold">{error}</p>}
    </div>
  );
}
