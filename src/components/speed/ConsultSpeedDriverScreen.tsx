import { useMemo, useState } from 'react';
import { Motorista, ExcessoVelocidade } from '../../types';
import { Search, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ConsultSpeedDriverScreenProps {
  motoristas: Motorista[];
  excessos: ExcessoVelocidade[];
}

export default function ConsultSpeedDriverScreen({ motoristas, excessos }: ConsultSpeedDriverScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const filteredMotoristas = useMemo(() => {
    return motoristas.filter(m => 
      m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.matricula.includes(searchTerm)
    ).slice(0, 10);
  }, [motoristas, searchTerm]);

  const driverStats = useMemo(() => {
    if (!selectedMotorista) return null;
    
    const motoristaExcessos = excessos.filter(e => e.matricula === selectedMotorista.matricula);
    
    const totalMinutos = motoristaExcessos.reduce((acc, curr) => acc + curr.tempoExcedidoMinutos, 0);
    const velocidadeMediaGeral = motoristaExcessos.length > 0 
      ? Math.round(motoristaExcessos.reduce((acc, curr) => acc + curr.velocidadeMediaKmh, 0) / motoristaExcessos.length)
      : 0;

    return {
      ocorrencias: motoristaExcessos,
      totalOcorrencias: motoristaExcessos.length,
      totalMinutos,
      velocidadeMediaGeral
    };
  }, [selectedMotorista, excessos]);

  const exportPDF = () => {
    if (!selectedMotorista || !driverStats) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Relatório de Velocidade - ${selectedMotorista.nome}`, 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Matrícula: ${selectedMotorista.matricula}`, 14, 30);
    doc.text(`Filial: ${selectedMotorista.filial}`, 14, 36);
    doc.text(`Área: ${selectedMotorista.area}`, 14, 42);
    
    doc.text(`Total Ocorrências: ${driverStats.totalOcorrencias}`, 120, 30);
    doc.text(`Tempo Total Excedido: ${Math.floor(driverStats.totalMinutos/60)}h ${driverStats.totalMinutos%60}m`, 120, 36);
    doc.text(`Velocidade Média das Infrações: ${driverStats.velocidadeMediaGeral} km/h`, 120, 42);

    const tableData = driverStats.ocorrencias.map(e => [
      e.dataOcorrencia,
      e.nomeLinha,
      e.veiculo,
      `${e.tempoExcedidoMinutos} min`,
      `${e.velocidadeMediaKmh} km/h`,
      e.endereco
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Data', 'Linha', 'Veículo', 'Tempo Exc.', 'Vel. Média', 'Local']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [14, 79, 143] }
    });

    doc.save(`velocidade_${selectedMotorista.matricula}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Buscar Motorista</h3>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Digite nome ou matrícula..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        {searchTerm && (
          <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
            {filteredMotoristas.map(m => (
              <button
                key={m.matricula}
                onClick={() => { setSelectedMotorista(m); setSearchTerm(''); }}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-slate-700">{m.nome}</p>
                  <p className="text-xs text-slate-500 font-mono">Matrícula: {m.matricula}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded">{m.filial}</span>
                </div>
              </button>
            ))}
            {filteredMotoristas.length === 0 && (
              <p className="p-4 text-sm text-slate-500 text-center">Nenhum motorista encontrado.</p>
            )}
          </div>
        )}
      </div>

      {selectedMotorista && driverStats && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-[#0e4f8f] p-6 rounded-xl text-white shadow-lg flex justify-between items-center">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">Dossiê de Velocidade</p>
              <h2 className="text-2xl font-black">{selectedMotorista.nome}</h2>
              <p className="text-blue-100 font-mono mt-1">{selectedMotorista.matricula} • {selectedMotorista.filial} • {selectedMotorista.area}</p>
            </div>
            <button 
              onClick={exportPDF}
              className="px-4 py-2 bg-white text-[#0e4f8f] font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
            >
              Exportar PDF
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Total de Infrações</p>
                <p className="text-2xl font-black text-slate-800">{driverStats.totalOcorrencias}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Tempo em Excesso</p>
                <p className="text-xl font-black text-slate-800">{Math.floor(driverStats.totalMinutos/60)}h {driverStats.totalMinutos%60}m</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Média das Infrações</p>
                <p className="text-xl font-black text-slate-800">{driverStats.velocidadeMediaGeral} km/h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-slate-800">Histórico Detalhado</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="p-4">Data Ocorrência</th>
                    <th className="p-4">Linha</th>
                    <th className="p-4">Veículo</th>
                    <th className="p-4">Tempo Excedido</th>
                    <th className="p-4">Vel. Média</th>
                    <th className="p-4">Local</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {driverStats.ocorrencias.length > 0 ? (
                    driverStats.ocorrencias.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(occ => (
                      <tr key={occ.id} className="border-b border-gray-50 hover:bg-slate-50">
                        <td className="p-4 font-mono text-xs">{occ.dataOcorrencia}</td>
                        <td className="p-4 font-medium text-slate-700">{occ.nomeLinha}</td>
                        <td className="p-4">{occ.veiculo}</td>
                        <td className="p-4 font-bold text-red-600">{occ.tempoExcedidoMinutos} min</td>
                        <td className="p-4 font-bold text-orange-600">{occ.velocidadeMediaKmh} km/h</td>
                        <td className="p-4 text-xs text-slate-500 truncate max-w-[200px]">{occ.endereco}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">Nenhum registro de excesso de velocidade para este motorista.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {driverStats.ocorrencias.length > itemsPerPage && (
              <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-slate-50">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-white border border-gray-200 rounded text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-xs text-gray-500">
                  Página {currentPage} de {Math.ceil(driverStats.ocorrencias.length / itemsPerPage)}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(driverStats.ocorrencias.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(driverStats.ocorrencias.length / itemsPerPage)}
                  className="px-3 py-1 bg-white border border-gray-200 rounded text-sm disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
