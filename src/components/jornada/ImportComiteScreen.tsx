import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { ComiteDisciplinar, Motorista, UserRole } from '../../types';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';

interface Props {
  comite: ComiteDisciplinar[];
  setComite: Dispatch<SetStateAction<ComiteDisciplinar[]>>;
  motoristas: Motorista[];
  userRole: UserRole;
}

export default function ImportComiteScreen({ comite, setComite, motoristas, userRole }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ total: number; imported: number; errors: string[] } | null>(null);

  const motoristaMap = new Map(motoristas.map(m => [m.matricula, m]));

  const processFile = useCallback((text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const errors: string[] = [];
    const records: ComiteDisciplinar[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Format: MATRICULA<tab or spaces>DDMMAAAA<tab or spaces>MOTIVO<tab or spaces>PUNICAO
      const parts = line.split(/\t+/).length >= 4 ? line.split(/\t+/) : line.split(/\s{2,}/);

      if (parts.length < 4) {
        errors.push(`Linha ${i + 1}: formato invalido (esperado: MATRICULA DATA MOTIVO PUNICAO)`);
        continue;
      }

      const [matriculaRaw, dataRaw, motivo, punicao] = parts.map(p => p.trim());
      const matricula = matriculaRaw.slice(-5).padStart(5, '0');

      // Parse date DDMMAAAA
      let dataFormatted: string;
      if (dataRaw.includes('/')) {
        dataFormatted = dataRaw;
      } else if (dataRaw.length === 8) {
        dataFormatted = `${dataRaw.slice(0, 2)}/${dataRaw.slice(2, 4)}/${dataRaw.slice(4)}`;
      } else {
        errors.push(`Linha ${i + 1}: data invalida "${dataRaw}"`);
        continue;
      }

      const id = `${matricula}_${dataFormatted.replace(/\//g, '')}_comite`;

      if (!motoristaMap.has(matricula)) {
        errors.push(`Linha ${i + 1}: matricula ${matricula} nao encontrada na base`);
      }

      records.push({ id, matricula, data: dataFormatted, motivo, punicao });
    }

    // Merge: replace existing by id, add new
    setComite(prev => {
      const existing = new Map(prev.map(r => [r.id, r]));
      for (const r of records) existing.set(r.id, r);
      return Array.from(existing.values());
    });

    setResult({ total: lines.length, imported: records.length, errors });
  }, [setComite, motoristaMap]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) file.text().then(processFile);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) file.text().then(processFile);
    e.target.value = '';
  }, [processFile]);

  if (userRole !== 'admin') {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="mx-auto text-amber-400 mb-3" size={40} />
        <p className="font-bold text-slate-600">Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-card border border-gray-200 shadow-card p-6">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4">Importar Comite Disciplinar</h3>
        <p className="text-xs text-slate-500 mb-4">
          Formato TXT (separado por TAB):<br />
          <strong>MATRICULA{'\t'}DDMMAAAA{'\t'}MOTIVO{'\t'}PUNICAO</strong>
        </p>

        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${dragOver ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('comite-file-input')?.click()}
        >
          <UploadCloud size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-600">Arraste o arquivo TXT aqui ou clique para selecionar</p>
          <p className="text-2xs text-slate-400 mt-1">Arquivo .txt com dados do comite disciplinar</p>
          <input id="comite-file-input" type="file" accept=".txt" className="hidden" onChange={handleFileInput} />
        </div>

        {result && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-emerald-500" />
              <span className="text-sm font-bold text-slate-700">{result.imported} de {result.total} registros importados</span>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-2xs text-red-500 flex items-center gap-1"><AlertTriangle size={10} /> {err}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {comite.length > 0 && (
        <div className="bg-white rounded-card border border-gray-200 shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
              <FileText size={14} className="inline mr-1" /> {comite.length} registro(s) no comite
            </h4>
            <button onClick={() => { if (confirm('Limpar todos os registros do comite?')) setComite([]); }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-button">
              <Trash2 size={12} /> Limpar
            </button>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-800 text-white sticky top-0 z-10">
                <tr className="text-2xs uppercase tracking-wide">
                  <th className="px-3 py-2.5 font-bold text-left">Matricula</th>
                  <th className="px-3 py-2.5 font-bold text-left">Motorista</th>
                  <th className="px-3 py-2.5 font-bold text-left">Data</th>
                  <th className="px-3 py-2.5 font-bold text-left">Motivo</th>
                  <th className="px-3 py-2.5 font-bold text-left">Punicao</th>
                </tr>
              </thead>
              <tbody>
                {comite.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-slate-700">{c.matricula}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{motoristaMap.get(c.matricula)?.nome || c.matricula}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{c.data}</td>
                    <td className="px-3 py-2 text-slate-600">{c.motivo}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-2xs font-bold">{c.punicao}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
