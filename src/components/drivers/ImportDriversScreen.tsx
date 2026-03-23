import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Motorista } from '../../types';

interface ImportDriversScreenProps {
  onImport: (data: Motorista[]) => void;
}

export default function ImportDriversScreen({ onImport }: ImportDriversScreenProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          const motoristas = parseTxt(text);
          onImport(motoristas);
          setError(null);
        } catch (err) {
          setError("Erro ao processar o arquivo. Verifique o formato.");
          console.error(err);
        }
      };
      reader.readAsText(file);
    }
  };

  const parseTxt = (text: string): Motorista[] => {
    const lines = text.trim().split('\n');
    const motoristas: Motorista[] = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].trim().split('\t');
      if (columns.length >= 5) {
        const [matricula, nome, filial, area, status] = columns;
        motoristas.push({
          matricula,
          nome,
          filial,
          area,
          status: status as Motorista['status'],
        });
      }
    }
    return motoristas;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h2 className="text-xl font-semibold mb-4">Importar Base de Motoristas</h2>
      <div className="flex items-center justify-center w-full">
        <label htmlFor="dropzone-file-drivers" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Clique para fazer upload</span> ou arraste e solte</p>
            <p className="text-xs text-gray-500">Arquivo de texto (.txt) separado por tabulação</p>
          </div>
          <input id="dropzone-file-drivers" type="file" className="hidden" onChange={handleFileChange} accept=".txt" />
        </label>
      </div>
      {error && (
        <p className="mt-4 text-center text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}
    </div>
  );
}
