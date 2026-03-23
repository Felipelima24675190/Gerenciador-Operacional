import { useState, useEffect } from 'react';
import Layout from './components/layout/Layout';
import DashboardScreen from './components/dashboard/DashboardScreen';
import ImportDriversScreen from './components/drivers/ImportDriversScreen';
import ConsultBaseScreen from './components/drivers/ConsultBaseScreen';
import ConsultDriverScreen from './components/drivers/ConsultDriverScreen';
import ImportLinesScreen from './components/lines/ImportLinesScreen';
import ConsultLinesScreen from './components/lines/ConsultLinesScreen';
import ImportOccurrencesScreen from './components/dashboard/ImportOccurrencesScreen';
import ReportsScreen from './components/reports/ReportsScreen';
import { mockMotoristas, mockViagens, mockOcorrencias, mockMultas } from './mockData';
import { Motorista, Viagem, Ocorrencia, User, MultaANTT, AnttCodeDescription, ExcessoVelocidade, ParadaIndevida, Veiculo, Avaria, ResumoAvaria, MultaTransito, RegistroOciosidade, RegistroLinha } from './types';
import ImportTransitScreen from './components/transit/ImportTransitScreen';
import ViewTransitScreen from './components/transit/ViewTransitScreen';
import ImportOciosoScreen from './components/idle/ImportOciosoScreen';
import ViewOciosoScreen from './components/idle/ViewOciosoScreen';
import ManualDriverScreen from './components/drivers/ManualDriverScreen';
import UserManagementScreen from './components/admin/UserManagementScreen';
import LoginScreen from './components/auth/LoginScreen';
import ImportAnttScreen from './components/antt/ImportAnttScreen';
import ViewAnttScreen from './components/antt/ViewAnttScreen';
import ImportVehiclesScreen from './components/vehicles/ImportVehiclesScreen';
import ConsultVehiclesScreen from './components/vehicles/ConsultVehiclesScreen';
import ImportStopsScreen from './components/stops/ImportStopsScreen';
import ViewStopsScreen from './components/stops/ViewStopsScreen';
import ImportSpeedScreen from './components/speed/ImportSpeedScreen';
import ViewSpeedScreen from './components/speed/ViewSpeedScreen';
import ConsultSpeedDriverScreen from './components/speed/ConsultSpeedDriverScreen';
import ImportAvariasScreen from './components/avarias/ImportAvariasScreen';
import ConsultAvariasScreen from './components/avarias/ConsultAvariasScreen';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('usersData');
    if (saved) return JSON.parse(saved);
    return [{ id: '1', username: 'admin', password: '123', nome: 'Admin Master', role: 'admin' }];
  });

  useEffect(() => {
    localStorage.setItem('usersData', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Initialize state from localStorage or fallback to mockData
  const [motoristas, setMotoristas] = useState<Motorista[]>(() => {
    const saved = localStorage.getItem('motoristasData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing motoristas from localStorage', e);
        return mockMotoristas;
      }
    }
    return mockMotoristas;
  });

  // Save to localStorage whenever motoristas changes
  useEffect(() => {
    localStorage.setItem('motoristasData', JSON.stringify(motoristas));
  }, [motoristas]);

  // Initialize state for viagens
  const [viagens, setViagens] = useState<Viagem[]>(() => {
    const saved = localStorage.getItem('viagensData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return mockViagens;
      }
    }
    return mockViagens;
  });

  // Save to localStorage whenever viagens changes
  useEffect(() => {
    localStorage.setItem('viagensData', JSON.stringify(viagens));
  }, [viagens]);

  // Initialize state for ocorrencias
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>(() => {
    const saved = localStorage.getItem('ocorrenciasData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return mockOcorrencias;
      }
    }
    return mockOcorrencias;
  });

  // Save to localStorage whenever ocorrencias changes
  useEffect(() => {
    localStorage.setItem('ocorrenciasData', JSON.stringify(ocorrencias));
  }, [ocorrencias]);

  // Initialize state for veiculos
  const [veiculos, setVeiculos] = useState<Veiculo[]>(() => {
    const saved = localStorage.getItem('veiculosData');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever veiculos changes
  useEffect(() => {
    localStorage.setItem('veiculosData', JSON.stringify(veiculos));
  }, [veiculos]);

  // Initialize state for paradas indevidas
  const [paradasIndevidas, setParadasIndevidas] = useState<ParadaIndevida[]>(() => {
    const saved = localStorage.getItem('paradasIndevidasData');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever paradas indevidas changes
  useEffect(() => {
    localStorage.setItem('paradasIndevidasData', JSON.stringify(paradasIndevidas));
  }, [paradasIndevidas]);

  // Initialize state for excessos de velocidade
  const [excessosVelocidade, setExcessosVelocidade] = useState<ExcessoVelocidade[]>(() => {
    const saved = localStorage.getItem('excessosVelocidadeData');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever excessos de velocidade changes
  useEffect(() => {
    localStorage.setItem('excessosVelocidadeData', JSON.stringify(excessosVelocidade));
  }, [excessosVelocidade]);

  // Initialize state for avarias
  const [avarias, setAvarias] = useState<Avaria[]>(() => {
    const saved = localStorage.getItem('avariasData');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('avariasData', JSON.stringify(avarias));
  }, [avarias]);

  // Initialize state for resumos de avaria
  const [resumosAvaria, setResumosAvaria] = useState<ResumoAvaria[]>(() => {
    const saved = localStorage.getItem('resumosAvariaData');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('resumosAvariaData', JSON.stringify(resumosAvaria));
  }, [resumosAvaria]);

  // Initialize state for multas ANTT
  const [multasAntt, setMultasAntt] = useState<MultaANTT[]>(() => {
    const saved = localStorage.getItem('multasAnttData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return mockMultas;
      }
    }
    return mockMultas;
  });

  // Save to localStorage whenever multasAntt changes
  useEffect(() => {
    localStorage.setItem('multasAnttData', JSON.stringify(multasAntt));
  }, [multasAntt]);

  // NEW: Initialize state for ANTT Code Descriptions
  const [anttCodeDescriptions, setAnttCodeDescriptions] = useState<AnttCodeDescription[]>(() => {
    const saved = localStorage.getItem('anttCodeDescriptionsData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing anttCodeDescriptions from localStorage', e);
        return []; // Default to empty array on error
      }
    }
    return []; // Default to empty array if no data in localStorage
  });

  // NEW: Save to localStorage whenever anttCodeDescriptions changes
  useEffect(() => {
    localStorage.setItem('anttCodeDescriptionsData', JSON.stringify(anttCodeDescriptions));
  }, [anttCodeDescriptions]);

  // Initialize state for multas de trânsito
  const [multasTransito, setMultasTransito] = useState<MultaTransito[]>(() => {
    const saved = localStorage.getItem('multasTransitoData');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('multasTransitoData', JSON.stringify(multasTransito));
  }, [multasTransito]);

  // Initialize state for tempo ocioso
  const [registrosOciosidade, setRegistrosOciosidade] = useState<RegistroOciosidade[]>(() => {
    const saved = localStorage.getItem('registrosOciosidadeData');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('registrosOciosidadeData', JSON.stringify(registrosOciosidade));
  }, [registrosOciosidade]);

  const [registrosLinhas, setRegistrosLinhas] = useState<RegistroLinha[]>(() => {
    const saved = localStorage.getItem('registrosLinhasData');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('registrosLinhasData', JSON.stringify(registrosLinhas));
  }, [registrosLinhas]);

  const renderContent = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen motoristas={motoristas} ocorrencias={ocorrencias} viagens={viagens} setOcorrencias={setOcorrencias} userRole={currentUser.role} />;
      case 'import-occurrences':
        return <ImportOccurrencesScreen ocorrencias={ocorrencias} setOcorrencias={setOcorrencias} motoristas={motoristas} viagens={viagens} userRole={currentUser.role} />;
      case 'import-drivers':
        return <ImportDriversScreen motoristas={motoristas} setMotoristas={setMotoristas} userRole={currentUser.role} onNavigate={setActiveTab} />;
      case 'consult-base':
        return <ConsultBaseScreen motoristas={motoristas} setMotoristas={setMotoristas} userRole={currentUser.role} />;
      case 'consult-driver':
        return <ConsultDriverScreen motoristas={motoristas} ocorrencias={ocorrencias} />;
      case 'import-lines':
        return <ImportLinesScreen viagens={viagens} setViagens={setViagens} userRole={currentUser.role} />;
      case 'consult-lines':
        return <ConsultLinesScreen viagens={viagens} setViagens={setViagens} userRole={currentUser.role} />;
      case 'import-vehicles':
        return <ImportVehiclesScreen setVeiculos={setVeiculos} userRole={currentUser.role} />;
      case 'consult-vehicles':
        return <ConsultVehiclesScreen veiculos={veiculos} multasAntt={multasAntt} avarias={avarias} multasTransito={multasTransito} />;
      case 'import-stops':
        return <ImportStopsScreen setParadas={setParadasIndevidas} motoristas={motoristas} viagens={viagens} userRole={currentUser.role} />;
      case 'view-stops':
        return <ViewStopsScreen paradas={paradasIndevidas} userRole={currentUser.role} />;
      case 'create-avaria':
        return <ImportAvariasScreen setAvarias={setAvarias} motoristas={motoristas} userRole={currentUser.role} />;
      case 'view-avaria':
        return <ConsultAvariasScreen avarias={avarias} setAvarias={setAvarias} motoristas={motoristas} resumos={resumosAvaria} setResumos={setResumosAvaria} />;
      case 'import-speed':
        return <ImportSpeedScreen setExcessos={setExcessosVelocidade} userRole={currentUser.role} />;
      case 'view-speed':
        return <ViewSpeedScreen excessos={excessosVelocidade} motoristas={motoristas} userRole={currentUser.role} />;      case 'consult-speed-driver':
        return <ConsultSpeedDriverScreen motoristas={motoristas} excessos={excessosVelocidade} />;      case 'reports':
        return <ReportsScreen motoristas={motoristas} ocorrencias={ocorrencias} excessos={excessosVelocidade} multasAntt={multasAntt} avarias={avarias} paradas={paradasIndevidas} multasTransito={multasTransito} registrosOciosidade={registrosOciosidade} registrosLinhas={registrosLinhas} viagens={viagens} />;
      case 'manual-driver':
        return <ManualDriverScreen setMotoristas={setMotoristas} />;
      case 'users':
        return <UserManagementScreen users={users} setUsers={setUsers} />;
      case 'import-antt':
        return <ImportAnttScreen multas={multasAntt} setMultas={setMultasAntt} userRole={currentUser.role} anttCodeDescriptions={anttCodeDescriptions} setAnttCodeDescriptions={setAnttCodeDescriptions} />;
      case 'view-antt':
        return <ViewAnttScreen multas={multasAntt} anttCodeDescriptions={anttCodeDescriptions} motoristas={motoristas} />;      case 'import-transit':
        return <ImportTransitScreen multas={multasTransito} setMultas={setMultasTransito} motoristas={motoristas} userRole={currentUser.role} />;
      case 'view-transit':
        return <ViewTransitScreen multas={multasTransito} motoristas={motoristas} />;
      case 'import-ocioso':
        return <ImportOciosoScreen registros={registrosOciosidade} setRegistros={setRegistrosOciosidade} linhas={registrosLinhas} setLinhas={setRegistrosLinhas} viagens={viagens} userRole={currentUser.role} />;
      case 'view-ocioso':
        return <ViewOciosoScreen registros={registrosOciosidade} linhas={registrosLinhas} viagens={viagens} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <h2 className="text-2xl font-semibold text-gray-500">Tela em Construção ({activeTab})</h2>
          </div>
        );
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard: Pontualidade';
      case 'import-occurrences': return 'Importar Ocorrências Diárias';
      case 'consult-driver': return 'Consultar Motorista';
      case 'reports': return 'Relatórios e Métricas';
      case 'import-drivers': return 'Importar Base de Motoristas';
      case 'consult-base': return 'Consultar Base de Motoristas';
      case 'manual-driver': return 'Cadastro Manual de Motoristas';
      case 'import-lines': return 'Importar Base de Linhas';
      case 'consult-lines': return 'Consultar Base de Linhas';
      case 'import-vehicles': return 'Importar Base de Veículos';
      case 'consult-vehicles': return 'Consultar Base de Veículos';
      case 'import-stops': return 'Importar Paradas Indevidas';
      case 'view-stops': return 'Consultar Paradas Indevidas';
      case 'create-avaria': return 'Importar Relatório de Avarias';
      case 'view-avaria': return 'Consultar Avarias do Período';
      case 'users': return 'Gerenciamento de Usuários';
      case 'import-speed': return 'Importar Excessos de Velocidade';
      case 'view-speed': return 'Consultar Excessos de Velocidade';
      case 'consult-speed-driver': return 'Histórico de Velocidade por Motorista';
      case 'import-antt': return 'Importar Multas ANTT';
      case 'view-antt': return 'Consultar Multas ANTT';
      case 'import-transit': return 'Importar Multas de Trânsito';
      case 'view-transit': return 'Consultar Multas de Trânsito';
      case 'import-ocioso': return 'Importar Quilometragem Operacional';
      case 'view-ocioso': return 'Consultar Quilometragem Operacional';
      default: return 'Pontualidade Viação';
    }
  };

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} users={users} />;
  }

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      title={getPageTitle()}
      user={currentUser}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
