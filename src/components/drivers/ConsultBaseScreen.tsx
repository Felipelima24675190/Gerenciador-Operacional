import { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { Motorista, StatusMotorista } from '../../types';
import { BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar } from 'recharts';

const FILIAL_SIGLAS: Record<string, string> = {
  'ARCOVERDE': 'ACV',
  'PETROLINA': 'PNZ',
  'CARUARU': 'CAUA',
  'JOÃO PESSOA': 'JPA',
  'NATAL': 'NAT',
  'SÃO LUÍS': 'SLZ',
  'IMPERATRIZ': 'ITZ',
  'BALSAS': 'BLA',
  'MACEIÓ': 'MCZ',
  'CAMPINA GRANDE': 'CGE',
};

interface ConsultBaseScreenProps {
  motoristas: Motorista[];
}

export default function ConsultBaseScreen({ motoristas }: ConsultBaseScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusMotorista | 'Todos'>('Todos');
  const [filialFilter, setFilialFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filiais = useMemo(() => ['Todos', ...Array.from(new Set(motoristas.map(m => m.filial)))], [motoristas]);

  const filteredMotoristas = useMemo(() => {
    return motoristas.filter(m => {
      const matchSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        m.matricula.includes(searchTerm);
      const matchStatus = statusFilter === 'Todos' || m.status === statusFilter;
      const matchFilial = filialFilter === 'Todos' || m.filial === filialFilter;
      
      return matchSearch && matchStatus && matchFilial;
    });
  }, [motoristas, searchTerm, statusFilter, filialFilter]);

  const dashboardData = useMemo(() => {
    const totalAtivos = motoristas.filter(m => m.status === 'ATIVO - EM OPERAÇÃO').length;
    const motoristasPorFilial = motoristas.reduce((acc, m) => {
      if (m.status === 'ATIVO - EM OPERAÇÃO') {
        acc[m.filial] = (acc[m.filial] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      total: motoristas.length,
      totalAtivos,
      motoristasPorFilial: Object.entries(motoristasPorFilial).map(([name, count]) => ({ name: FILIAL_SIGLAS[name.toUpperCase()] || name, fullName: name, count })).sort((a,b) => b.count - a.count),
    };
  }, [motoristas]);

  const paginatedMotoristas = useMemo(() => {
    return filteredMotoristas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredMotoristas, currentPage]);

  const totalPages = Math.ceil(filteredMotoristas.length / itemsPerPage);

  const getStatusColor = (status: StatusMotorista) => {
    switch(status) {
      case 'ATIVO - EM OPERAÇÃO': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'DESLIGADO': return 'bg-red-100 text-red-700 border border-red-200';
      case 'INSS': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'INSTRUTOR': return 'bg-purple-100 text-purple-700 border border-purple-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-500">Total Motoristas</p>
          <p className="text-3xl font-bold">{dashboardData.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-500">Motoristas Ativos</p>
          <p className="text-3xl font-bold text-green-600">{dashboardData.totalAtivos}</p>
        </div>
        <div className="md:col-span-2 bg-white p-4 rounded-xl border shadow-sm">
          <h4 className="text-sm text-gray-500 mb-2">Ativos por Filial</h4>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.motoristasPorFilial}>
                <XAxis dataKey="name" fontSize={10} />
                <YAxis width={30}/>
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="Motoristas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl border shadow-sm relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50"
              />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filialFilter}
              onChange={(e) => setFilialFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white w-full"
            >
              {filiais.map(f => <option key={f} value={f}>{f === 'Todos' ? 'Todas as Filiais' : f}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusMotorista | 'Todos')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white w-full"
            >
              <option value="Todos">Todos os Status</option>
              <option value="ATIVO - EM OPERAÇÃO">ATIVO - EM OPERAÇÃO</option>
              <option value="DESLIGADO">DESLIGADO</option>
              <option value="INSS">INSS</option>
              <option value="INSTRUTOR">INSTRUTOR</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                <th className="py-3 px-6 font-semibold w-24">Matrícula</th>
                <th className="py-3 px-6 font-semibold">Nome</th>
                <th className="py-3 px-6 font-semibold w-32">Filial</th>
                <th className="py-3 px-6 font-semibold w-32">Área</th>
                <th className="py-3 px-6 font-semibold w-48">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMotoristas.map((motorista, index) => (
                <tr key={`${motorista.matricula}-${index}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-6 font-medium text-slate-800">{motorista.matricula}</td>
                  <td className="py-3 px-6 text-slate-600">{motorista.nome}</td>
                  <td className="py-3 px-6 text-slate-600">{motorista.filial}</td>
                  <td className="py-3 px-6 text-slate-600">{motorista.area}</td>
                  <td className="py-3 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${getStatusColor(motorista.status)}`}>
                      {motorista.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredMotoristas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">Nenhum motorista encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="pt-4 flex justify-between items-center">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
              Anterior
            </button>
            <span className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </span>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
              Próxima
            </button>
        </div>
      </div>
    </div>
  );
}

